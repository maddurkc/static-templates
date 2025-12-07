# Spring Boot Backend Implementation for MS SQL Server

## Overview

This document provides comprehensive Spring Boot entity classes, DTOs, repositories, services, and controllers for the page builder application. The implementation covers all 10 database tables with their relationships, supporting nested multi-level lists with rich text formatting.

## Table of Contents

1. [Database Overview](#database-overview)
2. [Entity Classes](#entity-classes)
   - [Section Entity](#section-entity)
   - [SectionVariable Entity](#sectionvariable-entity)
   - [Template Entity](#template-entity)
   - [TemplateSection Entity](#templatesection-entity)
   - [TemplateRun Entity](#templaterun-entity)
   - [TemplateVariable Entity](#templatevariable-entity)
   - [ApiTemplate Entity](#apitemplate-entity)
   - [ApiTemplateParam Entity](#apitemplateparam-entity)
   - [TemplateApiConfig Entity](#templateapiconfig-entity)
   - [ApiMapping Entity](#apimapping-entity)
3. [Models](#models)
4. [DTOs](#dtos)
5. [Repositories](#repositories)
6. [Services](#services)
7. [Controllers](#controllers)
8. [MapStruct Mappers](#mapstruct-mappers)
9. [Configuration](#configuration)

---

## Database Overview

### Table Relationship Map

```
┌─────────────────┐                    ┌────────────────────┐
│    sections     │◄───────────────────│  section_variables │
│  (Master Data)  │   FK: section_type │    (Metadata)      │
└─────────────────┘                    └────────────────────┘
        │
        │ (logical reference via section_type, NOT FK)
        ▼
┌─────────────────┐      FK: template_id    ┌────────────────────┐
│   templates     │◄────────────────────────│  template_sections │
│ (User Docs)     │                         │  (Section Instances)│
└────────┬────────┘                         └─────────┬──────────┘
         │                                            │
         │ FK: template_id                            │ FK: parent_section_id
         ▼                                            │ (SELF-REFERENCE)
┌─────────────────┐                                   ▼
│  template_runs  │                         ┌────────────────────┐
│ (Execution Log) │                         │  (Nested Sections) │
└─────────────────┘                         └────────────────────┘

┌─────────────────┐      FK: template_id    ┌────────────────────┐
│   templates     │◄────────────────────────│template_api_configs│
└────────┬────────┘     (1:1 - UNIQUE)      └─────────┬──────────┘
         │                                            │
         │                                            │ FK: api_template_id
         │                                            ▼
         │                                  ┌────────────────────┐
         │                                  │   api_templates    │
         │                                  │  (API Definitions) │
         │                                  └─────────┬──────────┘
         │                                            │
         │                                            │ FK: api_template_id
         │                                            ▼
         │                                  ┌────────────────────┐
         │                                  │ api_template_params│
         │                                  │  (API Parameters)  │
         │                                  └────────────────────┘
```

### Table Summary

| Table | Purpose | Relationships |
|-------|---------|---------------|
| sections | Master catalog of section types (building blocks) | Parent to section_variables |
| section_variables | Configurable properties for each section type | FK to sections.type |
| templates | User-created templates (main documents) | Parent to template_sections, template_runs, template_variables, template_api_configs |
| template_sections | Section instances within templates | FK to templates, self-reference for nesting |
| template_runs | Audit log of template executions | FK to templates |
| template_variables | Available variables per template | FK to templates |
| api_templates | Pre-configured API endpoint templates | Parent to api_template_params |
| api_template_params | Parameters for each API template | FK to api_templates |
| template_api_configs | Links templates to API templates | FK to templates, api_templates |
| api_mappings | Maps API response data to sections | FK to template_api_configs, template_sections |

---

## Entity Classes

### Section Entity

```java
package com.example.pagebuilder.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity representing a section type in the master catalog.
 * 
 * TABLE: sections
 * PURPOSE: Master catalog of all available section types (building blocks)
 * 
 * RELATIONSHIPS:
 * - NO FOREIGN KEYS (This is a parent/reference table)
 * - REFERENCED BY: section_variables.section_type → sections.type
 * - REFERENCED BY: template_sections.section_type (logical, not FK)
 * 
 * EXAMPLES OF SECTION TYPES:
 * heading1, heading2, paragraph, labeled-content, table, bullet-list, container
 */
@Entity
@Table(name = "sections", indexes = {
    @Index(name = "idx_sections_type", columnList = "type"),
    @Index(name = "idx_sections_category", columnList = "category")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Section {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Section type identifier - UNIQUE KEY
     * Examples: 'heading1', 'paragraph', 'labeled-content', 'table'
     * Referenced by: section_variables.section_type, template_sections.section_type
     */
    @Column(name = "type", nullable = false, unique = true, length = 50)
    private String type;

    /**
     * Human-readable name displayed in UI
     * Examples: "Heading 1", "Bullet List (Circle)", "Labeled Content"
     */
    @Column(name = "label", nullable = false, length = 100)
    private String label;

    /**
     * Explanation of what this section does
     * Shown as tooltip/help text in the section library
     */
    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    /**
     * Category for grouping sections in UI
     * Values: 'text', 'media', 'layout', 'interactive'
     */
    @Column(name = "category", nullable = false, length = 50)
    private String category;

    /**
     * Lucide icon name for visual identification in UI
     * Examples: 'Heading1', 'Type', 'Table', 'List', 'Image', 'Box'
     */
    @Column(name = "icon", length = 50)
    private String icon;

    /**
     * Default placeholder content when section is first added
     * Example: "Main Title" for heading1, "Your text here" for paragraph
     */
    @Column(name = "default_content", columnDefinition = "NVARCHAR(MAX)")
    private String defaultContent;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * One section type can have many variables
     * CASCADE ALL: Variables are managed through the section
     */
    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SectionVariable> variables = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addVariable(SectionVariable variable) {
        variables.add(variable);
        variable.setSection(this);
        variable.setSectionType(this.type);
    }

    public void removeVariable(SectionVariable variable) {
        variables.remove(variable);
        variable.setSection(null);
    }
}
```

### SectionVariable Entity

```java
package com.example.pagebuilder.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing a variable definition for a section type.
 * 
 * TABLE: section_variables
 * PURPOSE: Defines what variables are available for each section type
 * 
 * RELATIONSHIPS:
 * - FOREIGN KEY: section_type → sections.type (CASCADE DELETE)
 * - UNIQUE CONSTRAINT: (section_type, variable_name) prevents duplicates
 * 
 * VARIABLE TYPES & THEIR EDITORS:
 * - 'text'  → Simple text input field
 * - 'url'   → URL input with validation
 * - 'list'  → List editor (add/remove items, supports nesting)
 * - 'table' → Table/grid editor (rows and columns)
 */
@Entity
@Table(name = "section_variables", indexes = {
    @Index(name = "idx_section_variables_type", columnList = "section_type")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_section_variables", columnNames = {"section_type", "variable_name"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionVariable {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Foreign key reference to sections.type
     * Determines which section type this variable belongs to
     */
    @Column(name = "section_type", nullable = false, length = 50)
    private String sectionType;

    /**
     * Internal variable name used in code
     * Examples: 'items', 'tableData', 'label', 'content', 'listStyle'
     * Used in Thymeleaf: <th:utext="${variable_name}">
     */
    @Column(name = "variable_name", nullable = false, length = 100)
    private String variableName;

    /**
     * Display label shown in editor UI
     * Examples: "List Items", "Table Data", "Field Label"
     */
    @Column(name = "variable_label", nullable = false, length = 100)
    private String variableLabel;

    /**
     * Data type determines which editor component to render
     * Values: 'text' | 'url' | 'list' | 'table'
     */
    @Column(name = "variable_type", nullable = false, length = 50)
    private String variableType;

    /**
     * Default value when section is first added (stored as JSON string)
     * Examples:
     * - text: "Default text"
     * - list: '["Item 1", "Item 2"]'
     * - list (nested): '[{"text":"Item 1","children":[]}]'
     * - table: '{"rows":[["H1","H2"],["D1","D2"]]}'
     */
    @Column(name = "default_value", columnDefinition = "NVARCHAR(MAX)")
    private String defaultValue;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_type", referencedColumnName = "type", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_section_variables_type"))
    @JsonBackReference
    private Section section;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

### Template Entity

```java
package com.example.pagebuilder.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity representing a user-created template.
 * 
 * TABLE: templates
 * PURPOSE: Stores user-created templates (the main documents users build)
 * 
 * RELATIONSHIPS:
 * - NO FOREIGN KEYS (This is a parent table)
 * - REFERENCED BY: template_sections.template_id (1:Many)
 * - REFERENCED BY: template_runs.template_id (1:Many)
 * - REFERENCED BY: template_api_configs.template_id (1:1)
 * - REFERENCED BY: template_variables.template_id (1:Many)
 * 
 * CASCADE BEHAVIOR (when template deleted):
 * → All template_sections are deleted
 * → All template_runs are deleted
 * → The template_api_configs is deleted
 * → All template_variables are deleted
 */
@Entity
@Table(name = "templates", indexes = {
    @Index(name = "idx_templates_user_id", columnList = "user_id"),
    @Index(name = "idx_templates_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Template {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Template name displayed in lists and headers
     * Examples: "Welcome Email", "Incident Report", "Weekly Newsletter"
     */
    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /**
     * Complete generated HTML output with Thymeleaf variables
     * Contains: <th:utext="${variableName}"> placeholders for dynamic content
     * This is the FINAL HTML that gets rendered when template is executed
     */
    @Column(name = "html", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String html;

    /**
     * Owner user ID (for multi-user systems)
     * Used for filtering: show users only their own templates
     */
    @Column(name = "user_id", columnDefinition = "UNIQUEIDENTIFIER")
    private UUID userId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * One template contains many sections
     * CASCADE ALL: Sections are deleted when template is deleted
     */
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    @Builder.Default
    private List<TemplateSection> sections = new ArrayList<>();

    /**
     * One template can have many run executions
     * CASCADE ALL: Runs are deleted when template is deleted
     */
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TemplateRun> runs = new ArrayList<>();

    /**
     * One template can have many variables
     * CASCADE ALL: Variables are deleted when template is deleted
     */
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<TemplateVariable> variables = new ArrayList<>();

    /**
     * One template can have one API configuration (1:1)
     * CASCADE ALL: API config is deleted when template is deleted
     */
    @OneToOne(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private TemplateApiConfig apiConfig;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addSection(TemplateSection section) {
        sections.add(section);
        section.setTemplate(this);
    }

    public void removeSection(TemplateSection section) {
        sections.remove(section);
        section.setTemplate(null);
    }
}
```

### TemplateSection Entity

```java
package com.example.pagebuilder.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity representing a section instance within a template.
 * 
 * TABLE: template_sections
 * PURPOSE: Stores section instances within templates (content & styling)
 * Supports nested sections, dynamic variables (including multi-level lists with formatting),
 * and custom styling.
 * 
 * RELATIONSHIPS:
 * - FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
 * - FOREIGN KEY: parent_section_id → template_sections.id (SELF-REFERENCE)
 * 
 * JSON COLUMNS:
 * - variables: Section-specific data (list items, table data, labels)
 * - styles: Section-specific styling (fontSize, color, backgroundColor)
 * 
 * NESTED LIST STRUCTURE (in variables JSON):
 * {
 *   "items": [
 *     {"text": "Item 1", "bold": true, "color": "#FF0000", "children": [
 *       {"text": "Sub-item 1.1", "italic": true, "children": []}
 *     ]}
 *   ]
 * }
 */
@Entity
@Table(name = "template_sections", indexes = {
    @Index(name = "idx_template_sections_template_id", columnList = "template_id"),
    @Index(name = "idx_template_sections_order", columnList = "template_id, order_index"),
    @Index(name = "idx_template_sections_parent", columnList = "parent_section_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateSection {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Foreign key to templates.id
     * Each section must belong to exactly one template
     * CASCADE DELETE: Remove all sections when template is deleted
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false, 
            foreignKey = @ForeignKey(name = "fk_template_sections_template"))
    @JsonBackReference
    private Template template;

    /**
     * Section type (logical reference to sections.type, NOT a FK)
     * Determines how this section renders and what features it has
     * Examples: 'heading1', 'paragraph', 'labeled-content', 'table'
     */
    @Column(name = "section_type", nullable = false, length = 50)
    private String sectionType;

    /**
     * The actual content for this section instance
     * Can include {{variable}} placeholders that convert to Thymeleaf
     * Example: "Welcome {{customerName}} to our service"
     */
    @Column(name = "content", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String content;

    /**
     * Section-specific variables and data (stored as JSON object)
     * Structure varies by section_type:
     * 
     * labeled-content:
     *   {"label": "Field Name", "contentType": "list", "items": [...], "listStyle": "disc"}
     * 
     * table:
     *   {"rows": [[{text, style}]], "showBorder": true, "mergedCells": {}}
     * 
     * NESTED LIST with rich formatting (ListItemStyle):
     *   {
     *     "items": [
     *       {
     *         "text": "Main item",           // Display text
     *         "bold": true,                  // Bold formatting
     *         "italic": false,               // Italic formatting
     *         "underline": false,            // Underline formatting
     *         "color": "#000000",            // Text color (hex)
     *         "backgroundColor": "#FFFFFF",  // Background color (hex)
     *         "fontSize": "14px",            // Font size
     *         "children": [...]              // Nested sub-items (max 3 lvls)
     *       }
     *     ]
     *   }
     */
    @Type(JsonType.class)
    @Column(name = "variables", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode variables;

    /**
     * Custom styling for this specific section instance (JSON object)
     * Example: {"fontSize": "18px", "color": "#333", "backgroundColor": "#f5f5f5", 
     *           "textAlign": "center", "fontWeight": "bold", "padding": "10px"}
     */
    @Type(JsonType.class)
    @Column(name = "styles", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode styles;

    /**
     * For labeled-content: controls if label can be edited at runtime
     * 1 = Users CAN edit the label when running template
     * 0 = Label is LOCKED and read-only at runtime
     */
    @Column(name = "is_label_editable", nullable = false, columnDefinition = "BIT")
    @Builder.Default
    private Boolean isLabelEditable = true;

    /**
     * Position/order within the template or parent container (0, 1, 2, ...)
     * Sections render in ascending order_index order
     * Used for drag-and-drop reordering of sections
     */
    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    /**
     * Self-referencing foreign key for nested sections
     * NULL = This is a ROOT-LEVEL section (top level of template)
     * UUID = This section is INSIDE another section (the parent container)
     * CASCADE: Deleting a container should delete all children inside it
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_section_id", 
            foreignKey = @ForeignKey(name = "fk_template_sections_parent"))
    @JsonBackReference
    private TemplateSection parentSection;

    /**
     * Child sections (for container sections)
     * CASCADE ALL: Children are deleted when parent is deleted
     */
    @OneToMany(mappedBy = "parentSection", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<TemplateSection> childSections = new ArrayList<>();

    /**
     * API mappings for this section (data from external APIs)
     */
    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ApiMapping> apiMappings = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public void addChildSection(TemplateSection child) {
        childSections.add(child);
        child.setParentSection(this);
    }

    public void removeChildSection(TemplateSection child) {
        childSections.remove(child);
        child.setParentSection(null);
    }
}
```

### TemplateRun Entity

```java
package com.example.pagebuilder.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing an audit log entry for template execution.
 * 
 * TABLE: template_runs
 * PURPOSE: Audit log of every template execution
 * Records every time a template is executed/sent with recipients, 
 * variable values, and final rendered HTML output.
 * 
 * RELATIONSHIPS:
 * - FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
 * 
 * USE CASES:
 * - Audit trail: "When was this email sent? To whom? With what data?"
 * - Debugging: Compare expected vs actual output
 * - Analytics: Track template usage frequency
 */
@Entity
@Table(name = "template_runs", indexes = {
    @Index(name = "idx_template_runs_template_id", columnList = "template_id"),
    @Index(name = "idx_template_runs_run_at", columnList = "run_at"),
    @Index(name = "idx_template_runs_user_id", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateRun {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Foreign key to templates.id
     * CASCADE DELETE: Remove run history when template is deleted
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_template_runs_template"))
    @JsonBackReference
    private Template template;

    /**
     * Primary recipient email addresses (stored as JSON array)
     * Example: '["user1@example.com", "user2@example.com"]'
     */
    @Type(JsonType.class)
    @Column(name = "to_emails", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode toEmails;

    /**
     * CC (carbon copy) recipients (stored as JSON array)
     * Example: '["manager@example.com"]' or '[]' if none
     */
    @Type(JsonType.class)
    @Column(name = "cc_emails", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode ccEmails;

    /**
     * BCC (blind carbon copy) recipients (stored as JSON array)
     * Hidden recipients - Example: '["audit@company.com"]'
     */
    @Type(JsonType.class)
    @Column(name = "bcc_emails", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode bccEmails;

    /**
     * Variable values used in this specific run (stored as JSON object)
     * Records the EXACT data that was substituted into the template
     * Example: {"name": "John Doe", "incidentNumber": "INC-123"}
     */
    @Type(JsonType.class)
    @Column(name = "variables", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode variables;

    /**
     * Final rendered HTML with all variables replaced
     * This is the EXACT output that was sent (for auditing/debugging)
     */
    @Column(name = "html_output", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String htmlOutput;

    /**
     * Timestamp when this template was executed
     */
    @Column(name = "run_at")
    private LocalDateTime runAt;

    /**
     * Execution status: 'sent', 'failed', 'pending'
     */
    @Column(name = "status", length = 50)
    @Builder.Default
    private String status = "sent";

    /**
     * User who executed this template (for accountability)
     */
    @Column(name = "user_id", columnDefinition = "UNIQUEIDENTIFIER")
    private UUID userId;

    @PrePersist
    protected void onCreate() {
        runAt = LocalDateTime.now();
    }
}
```

### TemplateVariable Entity

```java
package com.example.pagebuilder.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing a variable definition for a template.
 * 
 * TABLE: template_variables
 * PURPOSE: Tracks available variables per template for validation
 * Helps ensure users provide all required variable values during template runs.
 * 
 * RELATIONSHIPS:
 * - FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
 * - UNIQUE CONSTRAINT: (template_id, variable_name) prevents duplicates
 */
@Entity
@Table(name = "template_variables", indexes = {
    @Index(name = "idx_template_variables_template_id", columnList = "template_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_template_variables", columnNames = {"template_id", "variable_name"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateVariable {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Foreign key to templates.id
     * CASCADE DELETE: Remove variables when template is deleted
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_template_variables_template"))
    @JsonBackReference
    private Template template;

    /**
     * Variable name used in template (e.g., 'customerName', 'incidentNumber')
     */
    @Column(name = "variable_name", nullable = false, length = 100)
    private String variableName;

    /**
     * Data type: 'text', 'number', 'date', etc.
     */
    @Column(name = "variable_type", length = 50)
    @Builder.Default
    private String variableType = "text";

    /**
     * Whether this variable must be provided (1 = required, 0 = optional)
     */
    @Column(name = "required", columnDefinition = "BIT")
    @Builder.Default
    private Boolean required = false;

    /**
     * Default value if user doesn't provide one
     */
    @Column(name = "default_value", columnDefinition = "NVARCHAR(MAX)")
    private String defaultValue;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

### ApiTemplate Entity

```java
package com.example.pagebuilder.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity representing a pre-configured API endpoint template.
 * 
 * TABLE: api_templates
 * PURPOSE: Pre-configured API endpoint templates (Jira, GitHub, etc.)
 * Stores reusable API endpoint configurations that templates can use to fetch external data.
 * 
 * RELATIONSHIPS:
 * - NO FOREIGN KEYS (This is a parent table for API configs)
 * - REFERENCED BY: api_template_params.api_template_id (1:Many)
 * - REFERENCED BY: template_api_configs.api_template_id (Many:1)
 * 
 * URL TEMPLATE PLACEHOLDERS:
 * url_template contains {placeholder} values that get replaced with user values:
 * 'https://{domain}.atlassian.net/rest/api/{version}/issue/{issueKey}'
 */
@Entity
@Table(name = "api_templates", indexes = {
    @Index(name = "idx_api_templates_category", columnList = "category")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiTemplate {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Display name for this API template (shown in dropdown)
     * Examples: "Jira - Get Issue", "GitHub - Repository Info"
     */
    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /**
     * Description of what this API does
     */
    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    /**
     * Category for grouping: 'jira', 'github', 'servicenow', 'rest', 'custom'
     */
    @Column(name = "category", length = 100)
    private String category;

    /**
     * API URL with {parameter} placeholders
     * Example: 'https://{domain}.atlassian.net/rest/api/{version}/issue/{key}'
     * Placeholders in {braces} are replaced with user-provided values
     */
    @Column(name = "url_template", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String urlTemplate;

    /**
     * HTTP method: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
     */
    @Column(name = "method", nullable = false, length = 10)
    private String method;

    /**
     * HTTP headers with {parameter} placeholders (JSON object)
     * Example: {"Authorization": "Bearer {apiToken}"}
     */
    @Type(JsonType.class)
    @Column(name = "headers", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode headers;

    /**
     * Request body template for POST/PUT requests (JSON with placeholders)
     */
    @Column(name = "body_template", columnDefinition = "NVARCHAR(MAX)")
    private String bodyTemplate;

    /**
     * Flag: 1 = user-created custom API, 0 = built-in system API
     */
    @Column(name = "is_custom", columnDefinition = "BIT")
    @Builder.Default
    private Boolean isCustom = false;

    /**
     * User who created this custom API template
     */
    @Column(name = "created_by", columnDefinition = "UNIQUEIDENTIFIER")
    private UUID createdBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * One API template has many parameters
     * CASCADE ALL: Parameters are deleted when API template is deleted
     */
    @OneToMany(mappedBy = "apiTemplate", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    @Builder.Default
    private List<ApiTemplateParam> params = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public void addParam(ApiTemplateParam param) {
        params.add(param);
        param.setApiTemplate(this);
    }

    public void removeParam(ApiTemplateParam param) {
        params.remove(param);
        param.setApiTemplate(null);
    }
}
```

### ApiTemplateParam Entity

```java
package com.example.pagebuilder.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing a parameter definition for an API template.
 * 
 * TABLE: api_template_params
 * PURPOSE: Defines parameters required for each API template
 * Parameters are substituted into url_template, headers, and body_template.
 * 
 * RELATIONSHIPS:
 * - FOREIGN KEY: api_template_id → api_templates.id (CASCADE DELETE)
 * - UNIQUE CONSTRAINT: (api_template_id, param_name) prevents duplicates
 * 
 * PARAM_LOCATION VALUES:
 * - 'path'   → Parameter replaces {placeholder} in URL path
 * - 'query'  → Parameter added as ?param=value in URL
 * - 'header' → Parameter goes into HTTP headers
 * - 'body'   → Parameter inserted into request body
 */
@Entity
@Table(name = "api_template_params", indexes = {
    @Index(name = "idx_api_template_params_template", columnList = "api_template_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_api_template_params", columnNames = {"api_template_id", "param_name"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiTemplateParam {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Foreign key to api_templates.id
     * CASCADE DELETE: Remove parameters when API template is deleted
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "api_template_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_api_template_params_template"))
    @JsonBackReference
    private ApiTemplate apiTemplate;

    /**
     * Parameter name (MUST match {placeholder} in url_template/headers/body)
     * Examples: 'domain', 'version', 'issueKey', 'apiToken'
     */
    @Column(name = "param_name", nullable = false, length = 100)
    private String paramName;

    /**
     * Display label shown in configuration UI
     */
    @Column(name = "param_label", nullable = false, length = 100)
    private String paramLabel;

    /**
     * Input type: 'text', 'number', 'select' (determines form control)
     */
    @Column(name = "param_type", nullable = false, length = 50)
    private String paramType;

    /**
     * Where parameter goes: 'path', 'query', 'header', 'body'
     */
    @Column(name = "param_location", nullable = false, length = 50)
    private String paramLocation;

    /**
     * Placeholder text for input field (e.g., "e.g., mycompany")
     */
    @Column(name = "placeholder", columnDefinition = "NVARCHAR(MAX)")
    private String placeholder;

    /**
     * Whether required: 1 = mandatory, 0 = optional
     */
    @Column(name = "required", columnDefinition = "BIT")
    @Builder.Default
    private Boolean required = true;

    /**
     * Help text for users
     */
    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    /**
     * Options for 'select' type: '["v1", "v2", "v3"]' (JSON array)
     */
    @Type(JsonType.class)
    @Column(name = "options", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode options;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

### TemplateApiConfig Entity

```java
package com.example.pagebuilder.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity representing a template's API configuration.
 * 
 * TABLE: template_api_configs
 * PURPOSE: Links templates to API templates with user-provided parameter values
 * Each template can have ONE API configuration (1:1 relationship enforced by UNIQUE).
 * 
 * RELATIONSHIPS:
 * - FOREIGN KEY: template_id → templates.id (CASCADE DELETE) [UNIQUE - 1:1]
 * - FOREIGN KEY: api_template_id → api_templates.id
 * - REFERENCED BY: api_mappings.template_api_config_id (1:Many)
 */
@Entity
@Table(name = "template_api_configs", indexes = {
    @Index(name = "idx_template_api_configs_template", columnList = "template_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_template_api_configs", columnNames = {"template_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateApiConfig {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Foreign key to templates.id (UNIQUE creates 1:1 relationship)
     * CASCADE DELETE: Remove API config when template is deleted
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false, unique = true,
            foreignKey = @ForeignKey(name = "fk_template_api_configs_template"))
    @JsonBackReference
    private Template template;

    /**
     * Foreign key to api_templates.id (which API to use)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "api_template_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_template_api_configs_api_template"))
    private ApiTemplate apiTemplate;

    /**
     * Toggle: 1 = API active, 0 = API disabled (can toggle without losing config)
     */
    @Column(name = "enabled", columnDefinition = "BIT")
    @Builder.Default
    private Boolean enabled = false;

    /**
     * User-provided values for API parameters (JSON object)
     * Keys MUST match param_name from api_template_params
     * Example: {"domain": "mycompany", "issueKey": "PROJ-123"}
     */
    @Type(JsonType.class)
    @Column(name = "param_values", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode paramValues;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * One API config has many field mappings
     * CASCADE ALL: Mappings are deleted when config is deleted
     */
    @OneToMany(mappedBy = "templateApiConfig", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<ApiMapping> mappings = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addMapping(ApiMapping mapping) {
        mappings.add(mapping);
        mapping.setTemplateApiConfig(this);
    }

    public void removeMapping(ApiMapping mapping) {
        mappings.remove(mapping);
        mapping.setTemplateApiConfig(null);
    }
}
```

### ApiMapping Entity

```java
package com.example.pagebuilder.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity representing a mapping from API response data to a template section.
 * 
 * TABLE: api_mappings
 * PURPOSE: Maps API response data to specific sections within templates
 * Extracts fields from API JSON response and populates section variables.
 * 
 * RELATIONSHIPS:
 * - FOREIGN KEY: template_api_config_id → template_api_configs.id (CASCADE)
 * - FOREIGN KEY: section_id → template_sections.id (CASCADE)
 * 
 * DATA FLOW:
 * 1. API returns JSON response
 * 2. api_path extracts specific field (e.g., "fields.summary")
 * 3. Extracted data populates variable_name in the target section
 */
@Entity
@Table(name = "api_mappings", indexes = {
    @Index(name = "idx_api_mappings_config", columnList = "template_api_config_id"),
    @Index(name = "idx_api_mappings_section", columnList = "section_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiMapping {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Foreign key to template_api_configs.id
     * CASCADE DELETE: Remove mapping when API config is deleted
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_api_config_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_api_mappings_config"))
    @JsonBackReference
    private TemplateApiConfig templateApiConfig;

    /**
     * Foreign key to template_sections.id
     * CASCADE DELETE: Remove mapping when section is deleted
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_api_mappings_section"))
    @JsonBackReference
    private TemplateSection section;

    /**
     * JSONPath expression to extract data from API response
     * Examples: 'fields.summary', 'data.items[0].title'
     */
    @Column(name = "api_path", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String apiPath;

    /**
     * Data type: 'text', 'list', 'html' (determines processing)
     */
    @Column(name = "data_type", nullable = false, length = 50)
    private String dataType;

    /**
     * Which variable in section to populate (NULL = replace entire content)
     */
    @Column(name = "variable_name", length = 100)
    private String variableName;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

---

## Models

### ListItemStyle Model

```java
package com.example.pagebuilder.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Model representing a list item with rich text formatting and nested children.
 * Used for deserializing the "items" array in template section variables.
 * 
 * Supports up to 3 levels of nesting with independent formatting per item.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ListItemStyle {

    /** The text content of the list item */
    private String text;

    /** Bold formatting */
    private Boolean bold;

    /** Italic formatting */
    private Boolean italic;

    /** Underline formatting */
    private Boolean underline;

    /** Text color (hex format: #FF0000) */
    private String color;

    /** Background color (hex format: #FFFF00) */
    private String backgroundColor;

    /** Font size (CSS format: 16px, 1.2em, etc.) */
    private String fontSize;

    /** Nested child items (supports up to 3 levels) */
    @Builder.Default
    private List<ListItemStyle> children = new ArrayList<>();

    /**
     * Checks if this item has any formatting applied
     */
    public boolean hasFormatting() {
        return (bold != null && bold) ||
               (italic != null && italic) ||
               (underline != null && underline) ||
               color != null ||
               backgroundColor != null ||
               fontSize != null;
    }

    /**
     * Generates inline CSS styles for this list item
     */
    public String getInlineStyles() {
        StringBuilder styles = new StringBuilder();
        
        if (bold != null && bold) {
            styles.append("font-weight: bold; ");
        }
        if (italic != null && italic) {
            styles.append("font-style: italic; ");
        }
        if (underline != null && underline) {
            styles.append("text-decoration: underline; ");
        }
        if (color != null) {
            styles.append("color: ").append(color).append("; ");
        }
        if (backgroundColor != null) {
            styles.append("background-color: ").append(backgroundColor).append("; ");
        }
        if (fontSize != null) {
            styles.append("font-size: ").append(fontSize).append("; ");
        }
        
        return styles.toString().trim();
    }

    /**
     * Generates HTML list item with nested children
     */
    public String toHtml(String listTag) {
        StringBuilder html = new StringBuilder();
        String styleAttr = hasFormatting() ? " style=\"" + getInlineStyles() + "\"" : "";
        
        html.append("<li").append(styleAttr).append(">");
        html.append(text != null ? text : "");
        
        if (children != null && !children.isEmpty()) {
            html.append("<").append(listTag).append(">");
            for (ListItemStyle child : children) {
                html.append(child.toHtml(listTag));
            }
            html.append("</").append(listTag).append(">");
        }
        
        html.append("</li>");
        return html.toString();
    }
}
```

---

## DTOs

### Request DTOs

```java
package com.example.pagebuilder.dto.request;

// === SectionRequestDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for section creation/update")
public class SectionRequestDTO {

    @NotBlank(message = "Type is required")
    @Size(max = 50, message = "Type must not exceed 50 characters")
    @Schema(description = "Section type identifier", example = "labeled-content")
    private String type;

    @NotBlank(message = "Label is required")
    @Size(max = 100, message = "Label must not exceed 100 characters")
    @Schema(description = "Display name", example = "Labeled Content")
    private String label;

    @Schema(description = "Section description")
    private String description;

    @NotBlank(message = "Category is required")
    @Size(max = 50, message = "Category must not exceed 50 characters")
    @Schema(description = "Category for grouping", example = "text")
    private String category;

    @Size(max = 50, message = "Icon must not exceed 50 characters")
    @Schema(description = "Lucide icon name", example = "Type")
    private String icon;

    @Schema(description = "Default content")
    private String defaultContent;

    @Schema(description = "Variable definitions")
    private List<SectionVariableRequestDTO> variables;
}

// === SectionVariableRequestDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for section variable")
public class SectionVariableRequestDTO {

    @NotBlank(message = "Variable name is required")
    @Size(max = 100, message = "Variable name must not exceed 100 characters")
    @Schema(description = "Variable name used in code", example = "items")
    private String variableName;

    @NotBlank(message = "Variable label is required")
    @Size(max = 100, message = "Variable label must not exceed 100 characters")
    @Schema(description = "Display label", example = "List Items")
    private String variableLabel;

    @NotBlank(message = "Variable type is required")
    @Size(max = 50, message = "Variable type must not exceed 50 characters")
    @Schema(description = "Data type", example = "list")
    private String variableType;

    @Schema(description = "Default value (JSON string)")
    private String defaultValue;
}

// === TemplateRequestDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for template creation/update")
public class TemplateRequestDTO {

    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    @Schema(description = "Template name", example = "Welcome Email")
    private String name;

    @NotBlank(message = "HTML is required")
    @Schema(description = "Generated HTML with Thymeleaf variables")
    private String html;

    @Schema(description = "Owner user ID")
    private UUID userId;

    @Schema(description = "Template sections")
    private List<TemplateSectionRequestDTO> sections;

    @Schema(description = "API configuration")
    private TemplateApiConfigRequestDTO apiConfig;
}

// === TemplateSectionRequestDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for template section creation/update")
public class TemplateSectionRequestDTO {

    @Schema(description = "Template ID (required for create)")
    private UUID templateId;

    @NotBlank(message = "Section type is required")
    @Size(max = 50, message = "Section type must not exceed 50 characters")
    @Schema(description = "Section type", example = "labeled-content")
    private String sectionType;

    @NotBlank(message = "Content is required")
    @Schema(description = "Content with Thymeleaf variables")
    private String content;

    @Schema(description = "Section variables (JSON)")
    private JsonNode variables;

    @Schema(description = "Custom styles (JSON)")
    private JsonNode styles;

    @Schema(description = "Whether label is editable at runtime", example = "true")
    private Boolean isLabelEditable = true;

    @NotNull(message = "Order index is required")
    @Min(value = 0, message = "Order index must be non-negative")
    @Schema(description = "Position in template", example = "0")
    private Integer orderIndex;

    @Schema(description = "Parent section ID for nested sections")
    private UUID parentSectionId;

    @Schema(description = "Child sections")
    private List<TemplateSectionRequestDTO> childSections;
}

// === TemplateRunRequestDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for template run")
public class TemplateRunRequestDTO {

    @NotNull(message = "Template ID is required")
    @Schema(description = "Template ID")
    private UUID templateId;

    @Schema(description = "Primary recipients (JSON array)")
    private JsonNode toEmails;

    @Schema(description = "CC recipients (JSON array)")
    private JsonNode ccEmails;

    @Schema(description = "BCC recipients (JSON array)")
    private JsonNode bccEmails;

    @Schema(description = "Variable values (JSON object)")
    private JsonNode variables;

    @Schema(description = "User ID")
    private UUID userId;
}

// === ApiTemplateRequestDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for API template")
public class ApiTemplateRequestDTO {

    @NotBlank(message = "Name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    @Schema(description = "API template name", example = "Jira - Get Issue")
    private String name;

    @Schema(description = "Description")
    private String description;

    @Size(max = 100, message = "Category must not exceed 100 characters")
    @Schema(description = "Category", example = "jira")
    private String category;

    @NotBlank(message = "URL template is required")
    @Schema(description = "URL with {placeholders}")
    private String urlTemplate;

    @NotBlank(message = "Method is required")
    @Size(max = 10, message = "Method must not exceed 10 characters")
    @Schema(description = "HTTP method", example = "GET")
    private String method;

    @Schema(description = "HTTP headers (JSON)")
    private JsonNode headers;

    @Schema(description = "Request body template")
    private String bodyTemplate;

    @Schema(description = "Is custom API", example = "false")
    private Boolean isCustom = false;

    @Schema(description = "API parameters")
    private List<ApiTemplateParamRequestDTO> params;
}

// === ApiTemplateParamRequestDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for API template parameter")
public class ApiTemplateParamRequestDTO {

    @NotBlank(message = "Param name is required")
    @Size(max = 100, message = "Param name must not exceed 100 characters")
    @Schema(description = "Parameter name", example = "domain")
    private String paramName;

    @NotBlank(message = "Param label is required")
    @Size(max = 100, message = "Param label must not exceed 100 characters")
    @Schema(description = "Display label", example = "Domain")
    private String paramLabel;

    @NotBlank(message = "Param type is required")
    @Size(max = 50, message = "Param type must not exceed 50 characters")
    @Schema(description = "Input type", example = "text")
    private String paramType;

    @NotBlank(message = "Param location is required")
    @Size(max = 50, message = "Param location must not exceed 50 characters")
    @Schema(description = "Where param goes", example = "path")
    private String paramLocation;

    @Schema(description = "Placeholder text")
    private String placeholder;

    @Schema(description = "Is required", example = "true")
    private Boolean required = true;

    @Schema(description = "Help text")
    private String description;

    @Schema(description = "Options for select type (JSON array)")
    private JsonNode options;
}

// === TemplateApiConfigRequestDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for template API config")
public class TemplateApiConfigRequestDTO {

    @NotNull(message = "API template ID is required")
    @Schema(description = "API template ID")
    private UUID apiTemplateId;

    @Schema(description = "Is enabled", example = "true")
    private Boolean enabled = false;

    @Schema(description = "Parameter values (JSON object)")
    private JsonNode paramValues;

    @Schema(description = "Field mappings")
    private List<ApiMappingRequestDTO> mappings;
}

// === ApiMappingRequestDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for API mapping")
public class ApiMappingRequestDTO {

    @NotNull(message = "Section ID is required")
    @Schema(description = "Target section ID")
    private UUID sectionId;

    @NotBlank(message = "API path is required")
    @Schema(description = "JSONPath expression", example = "fields.summary")
    private String apiPath;

    @NotBlank(message = "Data type is required")
    @Size(max = 50, message = "Data type must not exceed 50 characters")
    @Schema(description = "Data type", example = "text")
    private String dataType;

    @Size(max = 100, message = "Variable name must not exceed 100 characters")
    @Schema(description = "Variable name to populate")
    private String variableName;
}
```

### Response DTOs

```java
package com.example.pagebuilder.dto.response;

// === SectionResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Section details")
public class SectionResponseDTO {
    private UUID id;
    private String type;
    private String label;
    private String description;
    private String category;
    private String icon;
    private String defaultContent;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<SectionVariableResponseDTO> variables;
}

// === SectionVariableResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Section variable details")
public class SectionVariableResponseDTO {
    private UUID id;
    private String sectionType;
    private String variableName;
    private String variableLabel;
    private String variableType;
    private String defaultValue;
    private LocalDateTime createdAt;
}

// === TemplateResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Template details")
public class TemplateResponseDTO {
    private UUID id;
    private String name;
    private String html;
    private UUID userId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TemplateSectionResponseDTO> sections;
    private List<TemplateVariableResponseDTO> variables;
    private TemplateApiConfigResponseDTO apiConfig;
    private Integer runCount;
}

// === TemplateSectionResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Template section details")
public class TemplateSectionResponseDTO {
    private UUID id;
    private UUID templateId;
    private String sectionType;
    private String content;
    private JsonNode variables;
    private JsonNode styles;
    private Boolean isLabelEditable;
    private Integer orderIndex;
    private UUID parentSectionId;
    private List<TemplateSectionResponseDTO> childSections;
    private LocalDateTime createdAt;
}

// === TemplateRunResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Template run details")
public class TemplateRunResponseDTO {
    private UUID id;
    private UUID templateId;
    private String templateName;
    private JsonNode toEmails;
    private JsonNode ccEmails;
    private JsonNode bccEmails;
    private JsonNode variables;
    private String htmlOutput;
    private LocalDateTime runAt;
    private String status;
    private UUID userId;
}

// === TemplateVariableResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Template variable details")
public class TemplateVariableResponseDTO {
    private UUID id;
    private UUID templateId;
    private String variableName;
    private String variableType;
    private Boolean required;
    private String defaultValue;
    private LocalDateTime createdAt;
}

// === ApiTemplateResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "API template details")
public class ApiTemplateResponseDTO {
    private UUID id;
    private String name;
    private String description;
    private String category;
    private String urlTemplate;
    private String method;
    private JsonNode headers;
    private String bodyTemplate;
    private Boolean isCustom;
    private UUID createdBy;
    private LocalDateTime createdAt;
    private List<ApiTemplateParamResponseDTO> params;
}

// === ApiTemplateParamResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "API template parameter details")
public class ApiTemplateParamResponseDTO {
    private UUID id;
    private UUID apiTemplateId;
    private String paramName;
    private String paramLabel;
    private String paramType;
    private String paramLocation;
    private String placeholder;
    private Boolean required;
    private String description;
    private JsonNode options;
    private LocalDateTime createdAt;
}

// === TemplateApiConfigResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Template API config details")
public class TemplateApiConfigResponseDTO {
    private UUID id;
    private UUID templateId;
    private UUID apiTemplateId;
    private String apiTemplateName;
    private Boolean enabled;
    private JsonNode paramValues;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ApiMappingResponseDTO> mappings;
}

// === ApiMappingResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "API mapping details")
public class ApiMappingResponseDTO {
    private UUID id;
    private UUID templateApiConfigId;
    private UUID sectionId;
    private String apiPath;
    private String dataType;
    private String variableName;
    private LocalDateTime createdAt;
}
```

---

## Repositories

```java
package com.example.pagebuilder.repository;

// === SectionRepository ===
@Repository
public interface SectionRepository extends JpaRepository<Section, UUID> {
    
    Optional<Section> findByType(String type);
    
    List<Section> findByCategory(String category);
    
    @Query("SELECT s FROM Section s LEFT JOIN FETCH s.variables WHERE s.type = :type")
    Optional<Section> findByTypeWithVariables(@Param("type") String type);
    
    @Query("SELECT DISTINCT s FROM Section s LEFT JOIN FETCH s.variables ORDER BY s.category, s.label")
    List<Section> findAllWithVariables();
    
    boolean existsByType(String type);
}

// === SectionVariableRepository ===
@Repository
public interface SectionVariableRepository extends JpaRepository<SectionVariable, UUID> {
    
    List<SectionVariable> findBySectionType(String sectionType);
    
    Optional<SectionVariable> findBySectionTypeAndVariableName(String sectionType, String variableName);
    
    void deleteBySectionType(String sectionType);
}

// === TemplateRepository ===
@Repository
public interface TemplateRepository extends JpaRepository<Template, UUID> {
    
    List<Template> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    @Query("SELECT t FROM Template t LEFT JOIN FETCH t.sections WHERE t.id = :id")
    Optional<Template> findByIdWithSections(@Param("id") UUID id);
    
    @Query("SELECT t FROM Template t LEFT JOIN FETCH t.apiConfig WHERE t.id = :id")
    Optional<Template> findByIdWithApiConfig(@Param("id") UUID id);
    
    @Query("SELECT t, COUNT(r) FROM Template t LEFT JOIN t.runs r GROUP BY t ORDER BY t.createdAt DESC")
    List<Object[]> findAllWithRunCounts();
    
    List<Template> findByNameContainingIgnoreCase(String name);
}

// === TemplateSectionRepository ===
@Repository
public interface TemplateSectionRepository extends JpaRepository<TemplateSection, UUID> {
    
    List<TemplateSection> findByTemplateIdOrderByOrderIndex(UUID templateId);
    
    @Query("SELECT ts FROM TemplateSection ts WHERE ts.template.id = :templateId AND ts.parentSection IS NULL ORDER BY ts.orderIndex")
    List<TemplateSection> findTopLevelSectionsByTemplateId(@Param("templateId") UUID templateId);
    
    List<TemplateSection> findByParentSectionIdOrderByOrderIndex(UUID parentSectionId);
    
    List<TemplateSection> findByTemplateIdAndSectionType(UUID templateId, String sectionType);
    
    void deleteByTemplateId(UUID templateId);
    
    long countByTemplateId(UUID templateId);
    
    @Query(value = "SELECT * FROM template_sections WHERE template_id = :templateId AND JSON_VALUE(variables, '$.label') LIKE %:searchTerm%", nativeQuery = true)
    List<TemplateSection> findByTemplateIdAndVariableContaining(@Param("templateId") UUID templateId, @Param("searchTerm") String searchTerm);
}

// === TemplateRunRepository ===
@Repository
public interface TemplateRunRepository extends JpaRepository<TemplateRun, UUID> {
    
    List<TemplateRun> findByTemplateIdOrderByRunAtDesc(UUID templateId);
    
    List<TemplateRun> findByUserIdOrderByRunAtDesc(UUID userId);
    
    @Query("SELECT tr FROM TemplateRun tr WHERE tr.template.id = :templateId AND tr.runAt BETWEEN :start AND :end ORDER BY tr.runAt DESC")
    List<TemplateRun> findByTemplateIdAndDateRange(@Param("templateId") UUID templateId, 
                                                    @Param("start") LocalDateTime start, 
                                                    @Param("end") LocalDateTime end);
    
    long countByTemplateId(UUID templateId);
    
    List<TemplateRun> findByStatus(String status);
}

// === TemplateVariableRepository ===
/**
 * Repository for template variables.
 * 
 * PURPOSE: Data access layer for the centralized variable registry.
 * Provides queries to retrieve variables by template, filter by required flag,
 * and manage variable lifecycle during template create/update.
 */
@Repository
public interface TemplateVariableRepository extends JpaRepository<TemplateVariable, UUID> {
    
    /**
     * Find all variables for a template, ordered by name.
     * Used to display the complete variable registry in Variables Panel.
     */
    List<TemplateVariable> findByTemplateIdOrderByVariableName(UUID templateId);
    
    /**
     * Find a specific variable by template and name.
     * Used to check for duplicates during sync.
     */
    Optional<TemplateVariable> findByTemplateIdAndVariableName(UUID templateId, String variableName);
    
    /**
     * Find variables filtered by required flag.
     * findRequiredByTemplateId is a convenience method.
     */
    List<TemplateVariable> findByTemplateIdAndRequired(UUID templateId, Boolean required);
    
    /**
     * Find only required variables for a template.
     * Used for validation before template execution.
     */
    @Query("SELECT v FROM TemplateVariable v WHERE v.template.id = :templateId AND v.required = true ORDER BY v.variableName")
    List<TemplateVariable> findRequiredByTemplateId(@Param("templateId") UUID templateId);
    
    /**
     * Find variables linked to a specific section.
     * Used to show which variables belong to which section.
     */
    @Query("SELECT v FROM TemplateVariable v WHERE v.template.id = :templateId AND v.sectionId = :sectionId")
    List<TemplateVariable> findByTemplateIdAndSectionId(@Param("templateId") UUID templateId, @Param("sectionId") UUID sectionId);
    
    /**
     * Delete all variables for a template.
     * Called during template update to sync the variable registry.
     */
    @Modifying
    @Query("DELETE FROM TemplateVariable v WHERE v.template.id = :templateId")
    void deleteByTemplateId(@Param("templateId") UUID templateId);
    
    /**
     * Count variables by template.
     */
    long countByTemplateId(UUID templateId);
    
    /**
     * Count required variables by template.
     */
    @Query("SELECT COUNT(v) FROM TemplateVariable v WHERE v.template.id = :templateId AND v.required = true")
    long countRequiredByTemplateId(@Param("templateId") UUID templateId);
}

// === ApiTemplateRepository ===
@Repository
public interface ApiTemplateRepository extends JpaRepository<ApiTemplate, UUID> {
    
    List<ApiTemplate> findByCategory(String category);
    
    List<ApiTemplate> findByIsCustom(Boolean isCustom);
    
    List<ApiTemplate> findByCreatedBy(UUID createdBy);
    
    @Query("SELECT a FROM ApiTemplate a LEFT JOIN FETCH a.params WHERE a.id = :id")
    Optional<ApiTemplate> findByIdWithParams(@Param("id") UUID id);
    
    List<ApiTemplate> findByNameContainingIgnoreCase(String name);
}

// === ApiTemplateParamRepository ===
@Repository
public interface ApiTemplateParamRepository extends JpaRepository<ApiTemplateParam, UUID> {
    
    List<ApiTemplateParam> findByApiTemplateId(UUID apiTemplateId);
    
    Optional<ApiTemplateParam> findByApiTemplateIdAndParamName(UUID apiTemplateId, String paramName);
    
    List<ApiTemplateParam> findByApiTemplateIdAndRequired(UUID apiTemplateId, Boolean required);
    
    void deleteByApiTemplateId(UUID apiTemplateId);
}

// === TemplateApiConfigRepository ===
@Repository
public interface TemplateApiConfigRepository extends JpaRepository<TemplateApiConfig, UUID> {
    
    Optional<TemplateApiConfig> findByTemplateId(UUID templateId);
    
    List<TemplateApiConfig> findByApiTemplateId(UUID apiTemplateId);
    
    List<TemplateApiConfig> findByEnabled(Boolean enabled);
    
    @Query("SELECT c FROM TemplateApiConfig c LEFT JOIN FETCH c.mappings WHERE c.id = :id")
    Optional<TemplateApiConfig> findByIdWithMappings(@Param("id") UUID id);
    
    void deleteByTemplateId(UUID templateId);
}

// === ApiMappingRepository ===
@Repository
public interface ApiMappingRepository extends JpaRepository<ApiMapping, UUID> {
    
    List<ApiMapping> findByTemplateApiConfigId(UUID templateApiConfigId);
    
    List<ApiMapping> findBySectionId(UUID sectionId);
    
    void deleteByTemplateApiConfigId(UUID templateApiConfigId);
    
    void deleteBySectionId(UUID sectionId);
}
```

---

## Services

```java
package com.example.pagebuilder.service;

// === SectionService ===
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class SectionService {

    private final SectionRepository sectionRepository;
    private final SectionMapper sectionMapper;

    @Transactional(readOnly = true)
    public List<SectionResponseDTO> getAllSections() {
        return sectionMapper.toResponseDTOList(sectionRepository.findAll());
    }

    @Transactional(readOnly = true)
    public List<SectionResponseDTO> getAllSectionsWithVariables() {
        return sectionMapper.toResponseDTOList(sectionRepository.findAllWithVariables());
    }

    @Transactional(readOnly = true)
    public SectionResponseDTO getSectionByType(String type) {
        Section section = sectionRepository.findByTypeWithVariables(type)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with type: " + type));
        return sectionMapper.toResponseDTO(section);
    }

    @Transactional(readOnly = true)
    public List<SectionResponseDTO> getSectionsByCategory(String category) {
        return sectionMapper.toResponseDTOList(sectionRepository.findByCategory(category));
    }

    public SectionResponseDTO createSection(SectionRequestDTO request) {
        if (sectionRepository.existsByType(request.getType())) {
            throw new DuplicateResourceException("Section already exists with type: " + request.getType());
        }
        Section section = sectionMapper.toEntity(request);
        Section saved = sectionRepository.save(section);
        return sectionMapper.toResponseDTO(saved);
    }

    public SectionResponseDTO updateSection(String type, SectionRequestDTO request) {
        Section existing = sectionRepository.findByType(type)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with type: " + type));
        sectionMapper.updateEntity(request, existing);
        Section updated = sectionRepository.save(existing);
        return sectionMapper.toResponseDTO(updated);
    }

    public void deleteSection(String type) {
        if (!sectionRepository.existsByType(type)) {
            throw new ResourceNotFoundException("Section not found with type: " + type);
        }
        Section section = sectionRepository.findByType(type).get();
        sectionRepository.delete(section);
    }
}

// === TemplateService ===
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class TemplateService {

    private final TemplateRepository templateRepository;
    private final TemplateSectionRepository sectionRepository;
    private final TemplateMapper templateMapper;
    private final TemplateSectionMapper sectionMapper;

    @Transactional(readOnly = true)
    public List<TemplateResponseDTO> getAllTemplates() {
        List<Object[]> results = templateRepository.findAllWithRunCounts();
        return results.stream()
                .map(row -> {
                    TemplateResponseDTO dto = templateMapper.toResponseDTO((Template) row[0]);
                    dto.setRunCount(((Long) row[1]).intValue());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TemplateResponseDTO getTemplateById(UUID id) {
        Template template = templateRepository.findByIdWithSections(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found with id: " + id));
        return templateMapper.toResponseDTO(template);
    }

    public TemplateResponseDTO createTemplate(TemplateRequestDTO request) {
        Template template = templateMapper.toEntity(request);
        
        // Handle sections
        if (request.getSections() != null) {
            for (int i = 0; i < request.getSections().size(); i++) {
                TemplateSectionRequestDTO sectionDto = request.getSections().get(i);
                sectionDto.setOrderIndex(i);
                TemplateSection section = sectionMapper.toEntity(sectionDto);
                template.addSection(section);
                
                // Handle nested children
                if (sectionDto.getChildSections() != null) {
                    addChildSections(section, sectionDto.getChildSections());
                }
            }
        }
        
        Template saved = templateRepository.save(template);
        return templateMapper.toResponseDTO(saved);
    }

    private void addChildSections(TemplateSection parent, List<TemplateSectionRequestDTO> children) {
        for (int i = 0; i < children.size(); i++) {
            TemplateSectionRequestDTO childDto = children.get(i);
            childDto.setOrderIndex(i);
            TemplateSection child = sectionMapper.toEntity(childDto);
            parent.addChildSection(child);
            child.setTemplate(parent.getTemplate());
            
            if (childDto.getChildSections() != null) {
                addChildSections(child, childDto.getChildSections());
            }
        }
    }

    public TemplateResponseDTO updateTemplate(UUID id, TemplateRequestDTO request) {
        Template existing = templateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found with id: " + id));
        
        existing.setName(request.getName());
        existing.setHtml(request.getHtml());
        
        // Update sections
        if (request.getSections() != null) {
            existing.getSections().clear();
            for (int i = 0; i < request.getSections().size(); i++) {
                TemplateSectionRequestDTO sectionDto = request.getSections().get(i);
                sectionDto.setOrderIndex(i);
                TemplateSection section = sectionMapper.toEntity(sectionDto);
                existing.addSection(section);
                
                if (sectionDto.getChildSections() != null) {
                    addChildSections(section, sectionDto.getChildSections());
                }
            }
        }
        
        Template updated = templateRepository.save(existing);
        return templateMapper.toResponseDTO(updated);
    }

    public void deleteTemplate(UUID id) {
        if (!templateRepository.existsById(id)) {
            throw new ResourceNotFoundException("Template not found with id: " + id);
        }
        templateRepository.deleteById(id);
    }
}

// === TemplateSectionService ===
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class TemplateSectionService {

    private final TemplateSectionRepository sectionRepository;
    private final TemplateRepository templateRepository;
    private final TemplateSectionMapper sectionMapper;

    @Transactional(readOnly = true)
    public List<TemplateSectionResponseDTO> getTemplateSections(UUID templateId) {
        List<TemplateSection> sections = sectionRepository.findTopLevelSectionsByTemplateId(templateId);
        return sectionMapper.toResponseDTOList(sections);
    }

    @Transactional(readOnly = true)
    public TemplateSectionResponseDTO getSectionById(UUID sectionId) {
        TemplateSection section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + sectionId));
        return sectionMapper.toResponseDTO(section);
    }

    public TemplateSectionResponseDTO createSection(TemplateSectionRequestDTO request) {
        Template template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template not found with id: " + request.getTemplateId()));
        
        TemplateSection section = sectionMapper.toEntity(request);
        section.setTemplate(template);
        
        if (request.getParentSectionId() != null) {
            TemplateSection parent = sectionRepository.findById(request.getParentSectionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent section not found"));
            section.setParentSection(parent);
        }
        
        TemplateSection saved = sectionRepository.save(section);
        return sectionMapper.toResponseDTO(saved);
    }

    public TemplateSectionResponseDTO updateSection(UUID sectionId, TemplateSectionRequestDTO request) {
        TemplateSection existing = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + sectionId));
        
        existing.setSectionType(request.getSectionType());
        existing.setContent(request.getContent());
        existing.setVariables(request.getVariables());
        existing.setStyles(request.getStyles());
        existing.setIsLabelEditable(request.getIsLabelEditable());
        existing.setOrderIndex(request.getOrderIndex());
        
        TemplateSection updated = sectionRepository.save(existing);
        return sectionMapper.toResponseDTO(updated);
    }

    public void deleteSection(UUID sectionId) {
        if (!sectionRepository.existsById(sectionId)) {
            throw new ResourceNotFoundException("Section not found with id: " + sectionId);
        }
        sectionRepository.deleteById(sectionId);
    }

    public void reorderSections(UUID templateId, List<UUID> sectionIds) {
        for (int i = 0; i < sectionIds.size(); i++) {
            TemplateSection section = sectionRepository.findById(sectionIds.get(i))
                    .orElseThrow(() -> new ResourceNotFoundException("Section not found"));
            section.setOrderIndex(i);
            sectionRepository.save(section);
        }
    }
}

// === TemplateRunService ===
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class TemplateRunService {

    private final TemplateRunRepository runRepository;
    private final TemplateRepository templateRepository;
    private final TemplateRunMapper runMapper;

    @Transactional(readOnly = true)
    public List<TemplateRunResponseDTO> getTemplateRuns(UUID templateId) {
        return runMapper.toResponseDTOList(runRepository.findByTemplateIdOrderByRunAtDesc(templateId));
    }

    public TemplateRunResponseDTO executeTemplate(TemplateRunRequestDTO request, String renderedHtml) {
        Template template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        
        TemplateRun run = TemplateRun.builder()
                .template(template)
                .toEmails(request.getToEmails())
                .ccEmails(request.getCcEmails())
                .bccEmails(request.getBccEmails())
                .variables(request.getVariables())
                .htmlOutput(renderedHtml)
                .userId(request.getUserId())
                .status("sent")
                .build();
        
        TemplateRun saved = runRepository.save(run);
        return runMapper.toResponseDTO(saved);
    }
}

// === TemplateVariableService ===
/**
 * Service for managing template variables.
 * 
 * PURPOSE: Provides CRUD operations for template-level variable registry.
 * Template variables are automatically extracted from sections and subject
 * during template creation/update, creating a centralized registry.
 * 
 * USE CASES:
 * - Get all variables for a template (for RunTemplates validation)
 * - Update variable metadata (isRequired, defaultValue)
 * - Sync variables when template sections change
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class TemplateVariableService {

    private final TemplateVariableRepository variableRepository;
    private final TemplateRepository templateRepository;
    private final TemplateVariableMapper variableMapper;

    /**
     * Get all variables for a template.
     * Used by RunTemplates to display variable inputs with labels and validation.
     */
    @Transactional(readOnly = true)
    public List<TemplateVariableResponseDTO> getTemplateVariables(UUID templateId) {
        List<TemplateVariable> variables = variableRepository.findByTemplateIdOrderByVariableName(templateId);
        return variableMapper.toResponseDTOList(variables);
    }

    /**
     * Get only required variables for a template.
     * Used for validation before template execution.
     */
    @Transactional(readOnly = true)
    public List<TemplateVariableResponseDTO> getRequiredVariables(UUID templateId) {
        List<TemplateVariable> variables = variableRepository.findRequiredByTemplateId(templateId);
        return variableMapper.toResponseDTOList(variables);
    }

    /**
     * Sync variables for a template.
     * Called during template create/update to update the variable registry.
     * Removes old variables and inserts new ones from the request.
     */
    public void syncTemplateVariables(UUID templateId, List<TemplateVariableRequestDTO> variableRequests) {
        Template template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found with id: " + templateId));
        
        // Remove existing variables
        variableRepository.deleteByTemplateId(templateId);
        
        // Insert new variables
        if (variableRequests != null && !variableRequests.isEmpty()) {
            for (TemplateVariableRequestDTO request : variableRequests) {
                TemplateVariable variable = TemplateVariable.builder()
                        .template(template)
                        .variableName(request.getVariableName())
                        .variableLabel(request.getVariableLabel())
                        .variableType(request.getVariableType())
                        .defaultValue(request.getDefaultValue())
                        .required(request.getIsRequired())
                        .placeholder(request.getPlaceholder())
                        .build();
                
                // Link to section if provided
                if (request.getSectionId() != null) {
                    variable.setSectionId(request.getSectionId());
                }
                
                variableRepository.save(variable);
            }
        }
        
        log.info("Synced {} variables for template {}", 
                variableRequests != null ? variableRequests.size() : 0, templateId);
    }

    /**
     * Update a single variable's metadata.
     * Used when users modify required flag or default value in Variables Panel.
     */
    public TemplateVariableResponseDTO updateVariable(UUID variableId, TemplateVariableRequestDTO request) {
        TemplateVariable existing = variableRepository.findById(variableId)
                .orElseThrow(() -> new ResourceNotFoundException("Variable not found with id: " + variableId));
        
        if (request.getVariableLabel() != null) {
            existing.setVariableLabel(request.getVariableLabel());
        }
        if (request.getIsRequired() != null) {
            existing.setRequired(request.getIsRequired());
        }
        if (request.getDefaultValue() != null) {
            existing.setDefaultValue(request.getDefaultValue());
        }
        if (request.getPlaceholder() != null) {
            existing.setPlaceholder(request.getPlaceholder());
        }
        
        TemplateVariable updated = variableRepository.save(existing);
        return variableMapper.toResponseDTO(updated);
    }

    /**
     * Validate that all required variables have values.
     * Called before template execution.
     */
    public List<String> validateRequiredVariables(UUID templateId, Map<String, Object> providedValues) {
        List<TemplateVariable> requiredVars = variableRepository.findRequiredByTemplateId(templateId);
        List<String> missingVariables = new ArrayList<>();
        
        for (TemplateVariable var : requiredVars) {
            Object value = providedValues.get(var.getVariableName());
            if (value == null || (value instanceof String && ((String) value).trim().isEmpty())) {
                missingVariables.add(var.getVariableLabel());
            }
        }
        
        return missingVariables;
    }
}
```

---

## Controllers

```java
package com.example.pagebuilder.controller;

// === SectionController ===
@RestController
@RequestMapping("/api/v1/sections")
@RequiredArgsConstructor
@Tag(name = "Sections", description = "Manage section types")
public class SectionController {

    private final SectionService sectionService;

    @GetMapping
    @Operation(summary = "Get all sections")
    public ResponseEntity<List<SectionResponseDTO>> getAllSections() {
        return ResponseEntity.ok(sectionService.getAllSectionsWithVariables());
    }

    @GetMapping("/{type}")
    @Operation(summary = "Get section by type")
    public ResponseEntity<SectionResponseDTO> getSectionByType(@PathVariable String type) {
        return ResponseEntity.ok(sectionService.getSectionByType(type));
    }

    @GetMapping("/category/{category}")
    @Operation(summary = "Get sections by category")
    public ResponseEntity<List<SectionResponseDTO>> getSectionsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(sectionService.getSectionsByCategory(category));
    }

    @PostMapping
    @Operation(summary = "Create section")
    public ResponseEntity<SectionResponseDTO> createSection(@Valid @RequestBody SectionRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sectionService.createSection(request));
    }

    @PutMapping("/{type}")
    @Operation(summary = "Update section")
    public ResponseEntity<SectionResponseDTO> updateSection(@PathVariable String type, @Valid @RequestBody SectionRequestDTO request) {
        return ResponseEntity.ok(sectionService.updateSection(type, request));
    }

    @DeleteMapping("/{type}")
    @Operation(summary = "Delete section")
    public ResponseEntity<Void> deleteSection(@PathVariable String type) {
        sectionService.deleteSection(type);
        return ResponseEntity.noContent().build();
    }
}

// === TemplateController ===
@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
@Tag(name = "Templates", description = "Manage templates")
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    @Operation(summary = "Get all templates")
    public ResponseEntity<List<TemplateResponseDTO>> getAllTemplates() {
        return ResponseEntity.ok(templateService.getAllTemplates());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get template by ID")
    public ResponseEntity<TemplateResponseDTO> getTemplateById(@PathVariable UUID id) {
        return ResponseEntity.ok(templateService.getTemplateById(id));
    }

    @PostMapping
    @Operation(summary = "Create template")
    public ResponseEntity<TemplateResponseDTO> createTemplate(@Valid @RequestBody TemplateRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(templateService.createTemplate(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update template")
    public ResponseEntity<TemplateResponseDTO> updateTemplate(@PathVariable UUID id, @Valid @RequestBody TemplateRequestDTO request) {
        return ResponseEntity.ok(templateService.updateTemplate(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete template")
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        templateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}

// === TemplateSectionController ===
@RestController
@RequestMapping("/api/v1/template-sections")
@RequiredArgsConstructor
@Tag(name = "Template Sections", description = "Manage template sections")
public class TemplateSectionController {

    private final TemplateSectionService sectionService;

    @GetMapping("/template/{templateId}")
    @Operation(summary = "Get sections for template")
    public ResponseEntity<List<TemplateSectionResponseDTO>> getTemplateSections(@PathVariable UUID templateId) {
        return ResponseEntity.ok(sectionService.getTemplateSections(templateId));
    }

    @GetMapping("/{sectionId}")
    @Operation(summary = "Get section by ID")
    public ResponseEntity<TemplateSectionResponseDTO> getSectionById(@PathVariable UUID sectionId) {
        return ResponseEntity.ok(sectionService.getSectionById(sectionId));
    }

    @PostMapping
    @Operation(summary = "Create section")
    public ResponseEntity<TemplateSectionResponseDTO> createSection(@Valid @RequestBody TemplateSectionRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sectionService.createSection(request));
    }

    @PutMapping("/{sectionId}")
    @Operation(summary = "Update section")
    public ResponseEntity<TemplateSectionResponseDTO> updateSection(@PathVariable UUID sectionId, @Valid @RequestBody TemplateSectionRequestDTO request) {
        return ResponseEntity.ok(sectionService.updateSection(sectionId, request));
    }

    @DeleteMapping("/{sectionId}")
    @Operation(summary = "Delete section")
    public ResponseEntity<Void> deleteSection(@PathVariable UUID sectionId) {
        sectionService.deleteSection(sectionId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/template/{templateId}/reorder")
    @Operation(summary = "Reorder sections")
    public ResponseEntity<Void> reorderSections(@PathVariable UUID templateId, @RequestBody List<UUID> sectionIds) {
        sectionService.reorderSections(templateId, sectionIds);
        return ResponseEntity.ok().build();
    }
}

// === TemplateRunController ===
@RestController
@RequestMapping("/api/v1/template-runs")
@RequiredArgsConstructor
@Tag(name = "Template Runs", description = "Template execution history")
public class TemplateRunController {

    private final TemplateRunService runService;

    @GetMapping("/template/{templateId}")
    @Operation(summary = "Get runs for template")
    public ResponseEntity<List<TemplateRunResponseDTO>> getTemplateRuns(@PathVariable UUID templateId) {
        return ResponseEntity.ok(runService.getTemplateRuns(templateId));
    }
}

// === TemplateVariableController ===
/**
 * REST Controller for template variables.
 * 
 * PURPOSE: Provides endpoints to manage the centralized variable registry
 * for each template. Variables are automatically extracted during template
 * save, but can be individually updated for metadata like isRequired.
 * 
 * ENDPOINTS:
 * - GET /template-variables/template/{templateId} - Get all variables for template
 * - GET /template-variables/template/{templateId}/required - Get only required variables
 * - PUT /template-variables/{variableId} - Update variable metadata
 * - POST /template-variables/template/{templateId}/validate - Validate provided values
 */
@RestController
@RequestMapping("/api/v1/template-variables")
@RequiredArgsConstructor
@Tag(name = "Template Variables", description = "Manage template variable registry")
public class TemplateVariableController {

    private final TemplateVariableService variableService;

    @GetMapping("/template/{templateId}")
    @Operation(
        summary = "Get all variables for template",
        description = "Returns the centralized registry of all placeholders/variables " +
                      "extracted from the template's subject and sections. Includes variable " +
                      "name, label, type, default value, required flag, and source section."
    )
    @ApiResponse(responseCode = "200", description = "Variables retrieved successfully")
    @ApiResponse(responseCode = "404", description = "Template not found")
    public ResponseEntity<List<TemplateVariableResponseDTO>> getTemplateVariables(
            @Parameter(description = "Template ID") @PathVariable UUID templateId) {
        return ResponseEntity.ok(variableService.getTemplateVariables(templateId));
    }

    @GetMapping("/template/{templateId}/required")
    @Operation(
        summary = "Get required variables for template",
        description = "Returns only the variables marked as required. " +
                      "Used for validation before template execution."
    )
    @ApiResponse(responseCode = "200", description = "Required variables retrieved successfully")
    public ResponseEntity<List<TemplateVariableResponseDTO>> getRequiredVariables(
            @Parameter(description = "Template ID") @PathVariable UUID templateId) {
        return ResponseEntity.ok(variableService.getRequiredVariables(templateId));
    }

    @PutMapping("/{variableId}")
    @Operation(
        summary = "Update variable metadata",
        description = "Updates a variable's metadata such as label, required flag, " +
                      "default value, or placeholder text."
    )
    @ApiResponse(responseCode = "200", description = "Variable updated successfully")
    @ApiResponse(responseCode = "404", description = "Variable not found")
    public ResponseEntity<TemplateVariableResponseDTO> updateVariable(
            @Parameter(description = "Variable ID") @PathVariable UUID variableId,
            @Valid @RequestBody TemplateVariableRequestDTO request) {
        return ResponseEntity.ok(variableService.updateVariable(variableId, request));
    }

    @PostMapping("/template/{templateId}/validate")
    @Operation(
        summary = "Validate provided variable values",
        description = "Validates that all required variables have been provided. " +
                      "Returns a list of missing required variable labels."
    )
    @ApiResponse(responseCode = "200", description = "Validation completed")
    public ResponseEntity<Map<String, Object>> validateVariables(
            @Parameter(description = "Template ID") @PathVariable UUID templateId,
            @RequestBody Map<String, Object> providedValues) {
        List<String> missingVariables = variableService.validateRequiredVariables(templateId, providedValues);
        
        Map<String, Object> response = new HashMap<>();
        response.put("valid", missingVariables.isEmpty());
        response.put("missingVariables", missingVariables);
        
        return ResponseEntity.ok(response);
    }
}

// === ApiTemplateController ===
@RestController
@RequestMapping("/api/v1/api-templates")
@RequiredArgsConstructor
@Tag(name = "API Templates", description = "Manage API templates")
public class ApiTemplateController {

    private final ApiTemplateService apiTemplateService;

    @GetMapping
    @Operation(summary = "Get all API templates")
    public ResponseEntity<List<ApiTemplateResponseDTO>> getAllApiTemplates() {
        return ResponseEntity.ok(apiTemplateService.getAllApiTemplates());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get API template by ID")
    public ResponseEntity<ApiTemplateResponseDTO> getApiTemplateById(@PathVariable UUID id) {
        return ResponseEntity.ok(apiTemplateService.getApiTemplateById(id));
    }

    @GetMapping("/category/{category}")
    @Operation(summary = "Get API templates by category")
    public ResponseEntity<List<ApiTemplateResponseDTO>> getApiTemplatesByCategory(@PathVariable String category) {
        return ResponseEntity.ok(apiTemplateService.getApiTemplatesByCategory(category));
    }

    @PostMapping
    @Operation(summary = "Create API template")
    public ResponseEntity<ApiTemplateResponseDTO> createApiTemplate(@Valid @RequestBody ApiTemplateRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(apiTemplateService.createApiTemplate(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update API template")
    public ResponseEntity<ApiTemplateResponseDTO> updateApiTemplate(@PathVariable UUID id, @Valid @RequestBody ApiTemplateRequestDTO request) {
        return ResponseEntity.ok(apiTemplateService.updateApiTemplate(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete API template")
    public ResponseEntity<Void> deleteApiTemplate(@PathVariable UUID id) {
        apiTemplateService.deleteApiTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## MapStruct Mappers

```java
package com.example.pagebuilder.mapper;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SectionMapper {
    
    SectionResponseDTO toResponseDTO(Section entity);
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Section toEntity(SectionRequestDTO dto);
    
    void updateEntity(SectionRequestDTO dto, @MappingTarget Section entity);
    
    List<SectionResponseDTO> toResponseDTOList(List<Section> entities);
}

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TemplateMapper {
    
    @Mapping(source = "sections", target = "sections")
    @Mapping(source = "variables", target = "variables")
    @Mapping(source = "apiConfig", target = "apiConfig")
    TemplateResponseDTO toResponseDTO(Template entity);
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "sections", ignore = true)
    @Mapping(target = "runs", ignore = true)
    @Mapping(target = "variables", ignore = true)
    @Mapping(target = "apiConfig", ignore = true)
    Template toEntity(TemplateRequestDTO dto);
    
    List<TemplateResponseDTO> toResponseDTOList(List<Template> entities);
}

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TemplateSectionMapper {
    
    @Mapping(source = "template.id", target = "templateId")
    @Mapping(source = "parentSection.id", target = "parentSectionId")
    @Mapping(source = "childSections", target = "childSections")
    TemplateSectionResponseDTO toResponseDTO(TemplateSection entity);
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "template", ignore = true)
    @Mapping(target = "parentSection", ignore = true)
    @Mapping(target = "childSections", ignore = true)
    @Mapping(target = "apiMappings", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    TemplateSection toEntity(TemplateSectionRequestDTO dto);
    
    List<TemplateSectionResponseDTO> toResponseDTOList(List<TemplateSection> entities);
}

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TemplateRunMapper {
    
    @Mapping(source = "template.id", target = "templateId")
    @Mapping(source = "template.name", target = "templateName")
    TemplateRunResponseDTO toResponseDTO(TemplateRun entity);
    
    List<TemplateRunResponseDTO> toResponseDTOList(List<TemplateRun> entities);
}

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ApiTemplateMapper {
    
    @Mapping(source = "params", target = "params")
    ApiTemplateResponseDTO toResponseDTO(ApiTemplate entity);
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "params", ignore = true)
    ApiTemplate toEntity(ApiTemplateRequestDTO dto);
    
    List<ApiTemplateResponseDTO> toResponseDTOList(List<ApiTemplate> entities);
}
```

---

## Configuration

### pom.xml Dependencies

```xml
<!-- MS SQL Server Driver -->
<dependency>
    <groupId>com.microsoft.sqlserver</groupId>
    <artifactId>mssql-jdbc</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- Hypersistence Utils for JSON support -->
<dependency>
    <groupId>io.hypersistence</groupId>
    <artifactId>hypersistence-utils-hibernate-60</artifactId>
    <version>3.7.0</version>
</dependency>

<!-- MapStruct for DTO mapping -->
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>1.5.5.Final</version>
</dependency>
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct-processor</artifactId>
    <version>1.5.5.Final</version>
    <scope>provided</scope>
</dependency>

<!-- Lombok -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>

<!-- Swagger/OpenAPI -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>

<!-- Validation -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

### application.yml

```yaml
spring:
  datasource:
    url: jdbc:sqlserver://localhost:1433;databaseName=pagebuilder;encrypt=true;trustServerCertificate=true
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver
  
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.SQLServerDialect
        format_sql: true
        use_sql_comments: true
    show-sql: false

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
    tags-sorter: alpha
    operations-sorter: alpha

logging:
  level:
    com.example.pagebuilder: DEBUG
    org.hibernate.SQL: DEBUG
```

### Exception Handling

```java
package com.example.pagebuilder.exception;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(HttpStatus.NOT_FOUND.value(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResource(DuplicateResourceException ex) {
        ErrorResponse error = new ErrorResponse(HttpStatus.CONFLICT.value(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        ErrorResponse error = new ErrorResponse(HttpStatus.BAD_REQUEST.value(), message);
        return ResponseEntity.badRequest().body(error);
    }
}

@Data
@AllArgsConstructor
public class ErrorResponse {
    private int status;
    private String message;
    private LocalDateTime timestamp = LocalDateTime.now();
    
    public ErrorResponse(int status, String message) {
        this.status = status;
        this.message = message;
    }
}
```
