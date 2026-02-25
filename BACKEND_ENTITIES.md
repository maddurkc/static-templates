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
   - [TemplateGlobalApiIntegration Entity](#templateglobalapiintegration-entity)
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
                                                      │
                                                      │ FK: section_id
                                                      ▼
                                            ┌─────────────────────────────┐
                                            │template_config_section_vars │
                                            │  (Section Variable Rows)    │
                                            └─────────────────────────────┘

┌─────────────────┐      FK: template_id    ┌─────────────────────────────────┐
│   templates     │◄────────────────────────│ template_global_api_integrations│
└────────┬────────┘     (1:Many)            │  (Global API Integrations)      │
         │                                  └─────────┬───────────────────────┘
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
| sections | Master catalog of section types (building blocks) | Parent to section_variables (catalog) |
| section_variables | Variable definitions & instance values (dual-purpose) | FK to sections.type (catalog) OR FK to template_sections.id (instance) |
| templates | User-created templates (main documents) | Parent to template_sections, template_runs, template_variables, template_global_api_integrations |
| template_sections | Section instances within templates | FK to templates, self-reference for nesting, parent to section_variables (instance) |
| template_runs | Audit log of template executions | FK to templates |
| template_variables | Available variables per template | FK to templates |
| api_templates | Pre-configured API endpoint templates | Parent to api_template_params |
| api_template_params | Parameters for each API template | FK to api_templates |
| template_global_api_integrations | Links templates to multiple API integrations with global variable storage | FK to templates, api_templates |

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
 * Entity representing a variable definition (dual-purpose).
 * 
 * TABLE: section_variables
 * PURPOSE: Serves two roles:
 * 1. MASTER CATALOG: Defines available variables per section type
 *    (sectionType populated, templateSection = null)
 * 2. INSTANCE VALUES: Stores actual variable key-value pairs for template section instances
 *    (templateSection populated, sectionType = null)
 * 
 * RELATIONSHIPS:
 * - FOREIGN KEY: section_type → sections.type (CASCADE DELETE) - for catalog
 * - FOREIGN KEY: template_section_id → template_sections.id (CASCADE DELETE) - for instances
 * - UNIQUE CONSTRAINT: (section_type, variable_name) prevents duplicates in catalog
 * - UNIQUE CONSTRAINT: (template_section_id, variable_name) prevents duplicates per instance
 * - CHECK CONSTRAINT: Must belong to either catalog or instance, not both
 * 
 * VARIABLE TYPES & THEIR EDITORS:
 * - 'text'     → Simple text input field
 * - 'url'      → URL input with validation
 * - 'list'     → List editor (add/remove items, supports nesting)
 * - 'table'    → Table/grid editor (rows and columns)
 * - 'metadata' → System metadata (contentType, listStyle, etc.)
 */
@Entity
@Table(name = "section_variables", indexes = {
    @Index(name = "idx_section_variables_type", columnList = "section_type"),
    @Index(name = "idx_section_variables_template_section", columnList = "template_section_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_section_variables", columnNames = {"section_type", "variable_name"}),
    @UniqueConstraint(name = "uk_section_variables_instance", columnNames = {"template_section_id", "variable_name"})
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
     * Foreign key reference to sections.type (for CATALOG rows)
     * NULL when this row is a template section instance variable
     */
    @Column(name = "section_type", length = 50)
    private String sectionType;

    /**
     * Foreign key reference to template_sections.id (for INSTANCE rows)
     * NULL when this row is a master catalog variable definition
     */
    @Column(name = "template_section_id", columnDefinition = "UNIQUEIDENTIFIER")
    private UUID templateSectionId;

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
     * Values: 'text' | 'url' | 'list' | 'table' | 'metadata'
     */
    @Column(name = "variable_type", nullable = false, length = 50)
    private String variableType;

    /**
     * Default value for catalog rows / Actual value for instance rows
     * Stored as JSON string for complex types
     * Examples:
     * - text: "Default text"
     * - list: '["Item 1", "Item 2"]'
     * - list (nested): '[{"text":"Item 1","children":[]}]'
     * - table: '{"rows":[["H1","H2"],["D1","D2"]]}'
     * - metadata: "disc" (for listStyle), "list" (for contentType)
     */
    @Column(name = "default_value", columnDefinition = "NVARCHAR(MAX)")
    private String defaultValue;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * Relationship to Section (catalog) - nullable
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_type", referencedColumnName = "type", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_section_variables_type"))
    @JsonBackReference("section-variables")
    private Section section;

    /**
     * Relationship to TemplateSection (instance) - nullable
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_section_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_section_variables_template_section"))
    @JsonBackReference("template-section-variables")
    private TemplateSection templateSection;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Check if this is a catalog variable (belongs to section type)
     */
    public boolean isCatalogVariable() {
        return sectionType != null && templateSectionId == null;
    }

    /**
     * Check if this is an instance variable (belongs to template section)
     */
    public boolean isInstanceVariable() {
        return templateSectionId != null && sectionType == null;
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
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;

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
 * - REFERENCED BY: template_global_api_integrations.template_id (1:Many)
 * - REFERENCED BY: template_variables.template_id (1:Many)
 * 
 * CASCADE BEHAVIOR (when template deleted):
 * → All template_sections are deleted
 * → All template_runs are deleted
 * → All template_global_api_integrations are deleted
 * → All template_variables are deleted
 */
@Entity
@Audited
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
     * Email subject line with Thymeleaf placeholders
     * 
     * STORAGE FORMAT: Subject is stored with Thymeleaf syntax (not user-friendly placeholders)
     * - User enters: "Report for {{clientName}} - {{reportDate}}"
     * - Stored as: "Report for <th:utext="${clientName}"> - <th:utext="${reportDate}">"
     * 
     * This conversion is done by the frontend before saving to ensure consistent
     * format across the application. The backend stores the Thymeleaf format.
     * 
     * Examples:
     * - "Incident <th:utext="${incidentNumber}"> - <th:utext="${severity}"> Alert"
     * - "Welcome to <th:utext="${companyName}">, <th:utext="${userName}">!"
     * 
     * The frontend converts back to {{placeholder}} format for display in the editor.
     */
    @Column(name = "subject", length = 500)
    private String subject;

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
     * NOT AUDITED: Run history is not versioned (it IS the history)
     */
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @NotAudited
    @Builder.Default
    private List<TemplateRun> runs = new ArrayList<>();

    /**
     * One template can have many variables
     * CASCADE ALL: Variables are deleted when template is deleted
     * NOT AUDITED: Variables are tracked via section versioning
     */
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @NotAudited
    @Builder.Default
    private List<TemplateVariable> variables = new ArrayList<>();

    /**
     * One template can have MANY global API integrations (1:Many)
     * CASCADE ALL: API integrations are deleted when template is deleted
     * NOT AUDITED: API config changes are not versioned
     */
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @NotAudited
    @Builder.Default
    private List<TemplateGlobalApiIntegration> globalApiIntegrations = new ArrayList<>();

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
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;

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
@Audited
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
     * Section-level variables stored as individual rows in section_variables table
     * These are INSTANCE variables (template_section_id populated, section_type = null)
     * CASCADE ALL: Variables are deleted when section is deleted
     * NOT AUDITED: Variable snapshots are captured in the section's variables JSON column
     */
    @OneToMany(mappedBy = "templateSection", cascade = CascadeType.ALL, orphanRemoval = true)
    @NotAudited
    @Builder.Default
    private List<SectionVariable> sectionVariables = new ArrayList<>();

    /**
     * NOTE: API mappings are now managed at template level via TemplateGlobalApiIntegration.
     * Sections reference global API variables using {{variableName.field}} syntax in content.
     */

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

    /**
     * Add an instance variable to this section.
     * Automatically sets the templateSectionId relationship.
     */
    public void addSectionVariable(SectionVariable variable) {
        sectionVariables.add(variable);
        variable.setTemplateSection(this);
        variable.setTemplateSectionId(this.getId());
    }

    public void removeSectionVariable(SectionVariable variable) {
        sectionVariables.remove(variable);
        variable.setTemplateSection(null);
        variable.setTemplateSectionId(null);
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

### TemplateGlobalApiIntegration Entity

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
 * Entity representing a global API integration for a template.
 * 
 * TABLE: template_global_api_integrations
 * PURPOSE: Stores per-template API integrations. Each template can have MULTIPLE
 * API integrations (1:Many). Each integration fetches data from an external API
 * and stores the response in a named global variable accessible from any section
 * via {{variableName.field.path}} syntax.
 * 
 * RELATIONSHIPS:
 * - FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
 * - FOREIGN KEY: api_template_id → api_templates.id
 * 
 * FRONTEND TYPE MAPPING:
 * Maps to GlobalApiIntegration from src/types/global-api-config.ts:
 * {
 *   id: string;
 *   name: string;           → integration_name
 *   templateId: string;     → api_template_id (references api_templates)
 *   paramValues: Record;    → param_values (JSON)
 *   variableName: string;   → variable_name (global variable to store response)
 *   enabled: boolean;       → enabled
 *   transformation?: {...}  → transformation (JSON)
 * }
 * 
 * DATA FLOW:
 * 1. User configures integration in GlobalApiPanel (editor mode)
 * 2. Template is saved → integrations stored in this table
 * 3. In RunTemplates, user clicks "Fetch" on an integration
 * 4. API response is stored in globalVariables[variableName]
 * 5. Sections referencing {{variableName.field}} auto-resolve
 * 
 * TRANSFORMATION JSON STRUCTURE:
 * {
 *   "filters": [{"id":"f1","field":"status","operator":"equals","value":"active"}],
 *   "filterLogic": "and",
 *   "fieldMappings": [{"id":"m1","sourceField":"name","targetField":"fullName","enabled":true}],
 *   "selectFields": ["name","status"],
 *   "limit": 10,
 *   "sortField": "name",
 *   "sortOrder": "asc"
 * }
 */
@Entity
@Table(name = "template_global_api_integrations", indexes = {
    @Index(name = "idx_tgai_template_id", columnList = "template_id"),
    @Index(name = "idx_tgai_api_template_id", columnList = "api_template_id")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_tgai_template_variable", columnNames = {"template_id", "variable_name"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateGlobalApiIntegration {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    /**
     * Foreign key to templates.id
     * CASCADE DELETE: Remove integration when template is deleted
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_tgai_template"))
    @JsonBackReference
    private Template template;

    /**
     * Foreign key to api_templates.id (which API endpoint to use)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "api_template_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_tgai_api_template"))
    private ApiTemplate apiTemplate;

    /**
     * User-friendly name for this integration
     * Examples: "ServiceNow Change Details", "Jira Issue Data"
     */
    @Column(name = "integration_name", nullable = false, length = 255)
    private String integrationName;

    /**
     * Global variable name to store the API response
     * MUST be unique per template (enforced by UK constraint)
     * Examples: "snowDetails", "jiraIssue", "githubRepo"
     * Used in sections as {{snowDetails.changeNo}}, {{jiraIssue.fields.summary}}
     */
    @Column(name = "variable_name", nullable = false, length = 100)
    private String variableName;

    /**
     * Toggle: 1 = integration active, 0 = disabled
     * Allows disabling without losing configuration
     */
    @Column(name = "enabled", columnDefinition = "BIT")
    @Builder.Default
    private Boolean enabled = true;

    /**
     * User-provided values for API parameters (JSON object)
     * Keys MUST match param_name from api_template_params
     * Example: {"changeNo": "CHG1234567", "domain": "mycompany"}
     * 
     * These values are editable in RunTemplates mode, allowing users
     * to input real values (e.g., a real change number) before fetching.
     */
    @Type(JsonType.class)
    @Column(name = "param_values", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode paramValues;

    /**
     * Optional data transformation configuration (JSON object)
     * Applied to API response data AFTER fetching, BEFORE storing in globalVariables.
     * Supports: filters, field mappings, sorting, limiting, field selection.
     * 
     * See DataTransformation type in src/types/global-api-config.ts
     * NULL = no transformation (raw data stored as-is)
     */
    @Type(JsonType.class)
    @Column(name = "transformation", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode transformation;

    /**
     * Cached API response data (JSON object)
     * Stores the last-fetched API response so templates can render without re-fetching.
     * Contains: { data, rawData, dataType, schema }
     * NULL = API has not been fetched yet
     */
    @Type(JsonType.class)
    @Column(name = "cached_response", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode cachedResponse;

    /**
     * Timestamp of the last successful API fetch.
     * NULL = never fetched
     */
    @Column(name = "cached_response_at")
    private LocalDateTime cachedResponseAt;

    /**
     * Display order within the template's integration list (0, 1, 2, ...)
     */
    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
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

    @Schema(description = "Global API integrations")
    private List<GlobalApiIntegrationRequestDTO> globalApiIntegrations;
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

    @Schema(description = "Section variables (JSON) - kept for backward compatibility")
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

    @Schema(description = "Section variables as individual key-value pairs (uses SectionVariableRequestDTO)")
    private List<SectionVariableRequestDTO> sectionVariables;
}

// === SectionVariableInstanceRequestDTO ===
/**
 * Note: Reuses the existing SectionVariableRequestDTO for section instance variables.
 * When used for instance variables:
 * - variableName = the variable key (e.g., 'label', 'content', 'items')
 * - variableLabel = display label (e.g., "Field Label")
 * - defaultValue = the actual variable value (text or JSON string)
 * - variableType = type hint ('text', 'list', 'table', 'metadata')
 * - sectionType is NOT set (null) since this is an instance variable
 */

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

// === GlobalApiIntegrationRequestDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for a global API integration")
public class GlobalApiIntegrationRequestDTO {

    @Schema(description = "Integration ID (for updates, null for creates)")
    private String integrationId;

    @NotBlank(message = "Integration name is required")
    @Size(max = 255, message = "Integration name must not exceed 255 characters")
    @Schema(description = "User-friendly name", example = "ServiceNow Change Details")
    private String name;

    @NotBlank(message = "API template ID is required")
    @Schema(description = "API template ID from api_templates catalog", example = "mock-servicenow-change")
    private String apiTemplateId;

    @NotBlank(message = "Variable name is required")
    @Size(max = 100, message = "Variable name must not exceed 100 characters")
    @Pattern(regexp = "^[a-zA-Z_][a-zA-Z0-9_]*$", message = "Variable name must be a valid identifier")
    @Schema(description = "Global variable name to store API response", example = "snowDetails")
    private String variableName;

    @Schema(description = "Is enabled", example = "true")
    private Boolean enabled = true;

    @Schema(description = "User-provided parameter values (JSON object)", 
            example = "{\"changeNo\": \"CHG1234567\"}")
    private JsonNode paramValues;

    @Schema(description = "Data transformation configuration (JSON object with filters, sort, limit, fieldMappings)")
    private JsonNode transformation;

    @Schema(description = "Cached API response data (JSON with data, rawData, dataType, schema)")
    private JsonNode cachedResponse;

    @Schema(description = "Display order in integration list", example = "0")
    private Integer orderIndex = 0;
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
    private List<GlobalApiIntegrationResponseDTO> globalApiIntegrations;
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
    private List<SectionVariableResponseDTO> sectionVariables;
    private LocalDateTime createdAt;
}

// Note: TemplateSectionResponseDTO.sectionVariables reuses SectionVariableResponseDTO
// For instance variables, the sectionType will be null and templateSectionId will be populated
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

// === GlobalApiIntegrationResponseDTO ===
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Global API integration details")
public class GlobalApiIntegrationResponseDTO {
    @Schema(description = "Integration ID")
    private UUID id;
    @Schema(description = "Template ID this integration belongs to")
    private UUID templateId;
    @Schema(description = "API template ID from api_templates catalog")
    private String apiTemplateId;
    @Schema(description = "API template display name")
    private String apiTemplateName;
    @Schema(description = "User-friendly integration name")
    private String integrationName;
    @Schema(description = "Global variable name for storing API response")
    private String variableName;
    @Schema(description = "Whether integration is active")
    private Boolean enabled;
    @Schema(description = "User-provided parameter values (JSON)")
    private JsonNode paramValues;
    @Schema(description = "Data transformation config (JSON)")
    private JsonNode transformation;
    @Schema(description = "Cached API response data (JSON with data, rawData, dataType, schema)")
    private JsonNode cachedResponse;
    @Schema(description = "Timestamp of last successful API fetch")
    private LocalDateTime cachedResponseAt;
    @Schema(description = "Display order")
    private Integer orderIndex;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

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
    
    // --- Catalog queries (section_type based) ---
    List<SectionVariable> findBySectionType(String sectionType);
    
    Optional<SectionVariable> findBySectionTypeAndVariableName(String sectionType, String variableName);
    
    void deleteBySectionType(String sectionType);
    
    // --- Instance queries (template_section_id based) ---
    List<SectionVariable> findByTemplateSectionIdOrderByVariableName(UUID templateSectionId);
    
    Optional<SectionVariable> findByTemplateSectionIdAndVariableName(UUID templateSectionId, String variableName);
    
    @Modifying
    @Query("DELETE FROM SectionVariable v WHERE v.templateSectionId = :templateSectionId")
    void deleteByTemplateSectionId(@Param("templateSectionId") UUID templateSectionId);
    
    long countByTemplateSectionId(UUID templateSectionId);
}

// === TemplateRepository ===
@Repository
public interface TemplateRepository extends JpaRepository<Template, UUID> {
    
    List<Template> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    @Query("SELECT t FROM Template t LEFT JOIN FETCH t.sections WHERE t.id = :id")
    Optional<Template> findByIdWithSections(@Param("id") UUID id);
    
    @Query("SELECT t FROM Template t LEFT JOIN FETCH t.globalApiIntegrations WHERE t.id = :id")
    Optional<Template> findByIdWithApiIntegrations(@Param("id") UUID id);
    
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
    
    @Query("SELECT DISTINCT a FROM ApiTemplate a LEFT JOIN FETCH a.params ORDER BY a.category, a.name")
    List<ApiTemplate> findAllWithParams();
    
    @Query("SELECT DISTINCT a.category FROM ApiTemplate a WHERE a.category IS NOT NULL ORDER BY a.category")
    List<String> findAllCategories();
    
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

// === TemplateGlobalApiIntegrationRepository ===
@Repository
public interface TemplateGlobalApiIntegrationRepository extends JpaRepository<TemplateGlobalApiIntegration, UUID> {
    
    /**
     * Find all integrations for a template, ordered by display position.
     */
    List<TemplateGlobalApiIntegration> findByTemplateIdOrderByOrderIndex(UUID templateId);
    
    /**
     * Find integration by template and variable name (unique constraint).
     */
    Optional<TemplateGlobalApiIntegration> findByTemplateIdAndVariableName(UUID templateId, String variableName);
    
    /**
     * Find all integrations using a specific API template.
     */
    List<TemplateGlobalApiIntegration> findByApiTemplateId(UUID apiTemplateId);
    
    /**
     * Find enabled integrations for a template.
     */
    List<TemplateGlobalApiIntegration> findByTemplateIdAndEnabled(UUID templateId, Boolean enabled);
    
    /**
     * Delete all integrations for a template (used during template update).
     */
    @Modifying
    @Query("DELETE FROM TemplateGlobalApiIntegration i WHERE i.template.id = :templateId")
    void deleteByTemplateId(@Param("templateId") UUID templateId);
    
    /**
     * Count integrations for a template.
     */
    long countByTemplateId(UUID templateId);
}

// Note: TemplateSectionVariableRepository is no longer needed.
// SectionVariableRepository (above) handles both catalog and instance variables
// using the templateSectionId field for instance-level queries.
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
    private final TemplateGlobalApiIntegrationRepository apiIntegrationRepository;
    private final ApiTemplateRepository apiTemplateRepository;
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
                
                // Persist section variables as individual rows
                addSectionVariables(section, sectionDto);
                
                // Handle nested children
                if (sectionDto.getChildSections() != null) {
                    addChildSections(section, sectionDto.getChildSections());
                }
            }
        }
        
        // Handle global API integrations
        addGlobalApiIntegrations(template, request.getGlobalApiIntegrations());
        
        Template saved = templateRepository.save(template);
        log.info("Created template '{}' with {} sections and {} API integrations", saved.getName(), 
                saved.getSections() != null ? saved.getSections().size() : 0,
                saved.getGlobalApiIntegrations() != null ? saved.getGlobalApiIntegrations().size() : 0);
        return templateMapper.toResponseDTO(saved);
    }

    /**
     * Extract variables from section DTO and persist as individual rows
     * in section_variables table (with template_section_id populated).
     */
    private void addSectionVariables(TemplateSection section, TemplateSectionRequestDTO sectionDto) {
        if (sectionDto.getSectionVariables() != null && !sectionDto.getSectionVariables().isEmpty()) {
            for (SectionVariableRequestDTO varDto : sectionDto.getSectionVariables()) {
                SectionVariable variable = SectionVariable.builder()
                        .variableName(varDto.getVariableName())
                        .variableLabel(varDto.getVariableLabel())
                        .defaultValue(varDto.getDefaultValue())
                        .variableType(varDto.getVariableType() != null ? varDto.getVariableType() : "text")
                        .build();
                section.addSectionVariable(variable);
            }
        } else if (sectionDto.getVariables() != null && !sectionDto.getVariables().isNull()) {
            extractVariablesFromJson(section, sectionDto.getVariables());
        }
    }

    /**
     * Extract individual key-value pairs from the variables JSON blob
     * and create SectionVariable entities (instance type) for each.
     */
    private void extractVariablesFromJson(TemplateSection section, JsonNode variablesJson) {
        if (variablesJson == null || variablesJson.isNull()) return;
        
        variablesJson.fields().forEachRemaining(entry -> {
            String key = entry.getKey();
            JsonNode value = entry.getValue();
            
            SectionVariable variable = SectionVariable.builder()
                    .variableName(key)
                    .variableLabel(createLabel(key))
                    .defaultValue(value.isTextual() ? value.asText() : value.toString())
                    .variableType(inferVariableType(key, value))
                    .build();
            section.addSectionVariable(variable);
        });
    }

    /**
     * Infer variable type from key name and JSON value structure.
     */
    private String inferVariableType(String key, JsonNode value) {
        if ("items".equals(key) && value.isArray()) return "list";
        if ("tableData".equals(key) && value.isObject()) return "table";
        if ("contentType".equals(key) || "listStyle".equals(key) || "textVariableName".equals(key) 
                || "labelVariableName".equals(key)) return "metadata";
        return "text";
    }

    /**
     * Create a human-readable label from variable key.
     */
    private String createLabel(String key) {
        return key.replaceAll("([A-Z])", " $1")
                   .replaceAll("[-_]", " ")
                   .trim()
                   .substring(0, 1).toUpperCase() + 
               key.replaceAll("([A-Z])", " $1")
                   .replaceAll("[-_]", " ")
                   .trim()
                   .substring(1);
    }

    private void addChildSections(TemplateSection parent, List<TemplateSectionRequestDTO> children) {
        for (int i = 0; i < children.size(); i++) {
            TemplateSectionRequestDTO childDto = children.get(i);
            childDto.setOrderIndex(i);
            TemplateSection child = sectionMapper.toEntity(childDto);
            parent.addChildSection(child);
            child.setTemplate(parent.getTemplate());
            
            // Persist section variables for child sections
            addSectionVariables(child, childDto);
            
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
        
        // Update subject if provided
        if (request.getSubject() != null) {
            existing.setSubject(request.getSubject());
        }
        
        // Update sections (clears old sections + their variables via CASCADE)
        if (request.getSections() != null) {
            existing.getSections().clear();
            for (int i = 0; i < request.getSections().size(); i++) {
                TemplateSectionRequestDTO sectionDto = request.getSections().get(i);
                sectionDto.setOrderIndex(i);
                TemplateSection section = sectionMapper.toEntity(sectionDto);
                existing.addSection(section);
                
                // Persist section variables as individual rows
                addSectionVariables(section, sectionDto);
                
                if (sectionDto.getChildSections() != null) {
                    addChildSections(section, sectionDto.getChildSections());
                }
            }
        }
        
        // Update global API integrations using UPSERT logic
        // Instead of clear() + insert (which causes duplicate key errors),
        // match existing integrations by variableName and update in-place
        updateGlobalApiIntegrations(existing, request.getGlobalApiIntegrations());
        
        Template updated = templateRepository.save(existing);
        log.info("Updated template '{}' (id: {}) with {} sections and {} API integrations", 
                updated.getName(), id,
                updated.getSections() != null ? updated.getSections().size() : 0,
                updated.getGlobalApiIntegrations() != null ? updated.getGlobalApiIntegrations().size() : 0);
        return templateMapper.toResponseDTO(updated);
    }

    /**
     * Update global API integrations using upsert logic:
     * - Existing integrations (matched by variableName) are updated in-place
     * - New integrations are created with new IDs
     * - Removed integrations (not in request) are deleted via orphanRemoval
     * 
     * This avoids the "duplicate key" error caused by clear() + insert
     * where JPA doesn't flush the delete before the insert.
     */
    private void updateGlobalApiIntegrations(Template template, List<GlobalApiIntegrationRequestDTO> integrations) {
        if (integrations == null || integrations.isEmpty()) {
            // Remove all existing integrations
            template.getGlobalApiIntegrations().clear();
            return;
        }
        
        // Build lookup map of existing integrations by variableName
        Map<String, TemplateGlobalApiIntegration> existingMap = template.getGlobalApiIntegrations()
                .stream()
                .collect(Collectors.toMap(
                        TemplateGlobalApiIntegration::getVariableName, 
                        Function.identity(),
                        (a, b) -> a // handle duplicates by keeping first
                ));
        
        List<TemplateGlobalApiIntegration> updatedIntegrations = new ArrayList<>();
        
        for (int i = 0; i < integrations.size(); i++) {
            GlobalApiIntegrationRequestDTO dto = integrations.get(i);
            
            // Try to find existing integration by variableName (upsert key)
            TemplateGlobalApiIntegration entity = existingMap.get(dto.getVariableName());
            
            if (entity == null) {
                // New integration - create fresh entity
                entity = new TemplateGlobalApiIntegration();
                entity.setTemplate(template);
            }
            
            // Resolve the API template reference
            ApiTemplate apiTemplate = apiTemplateRepository.findById(UUID.fromString(dto.getApiTemplateId()))
                    .orElse(null);
            
            // Update all fields (works for both new and existing entities)
            entity.setIntegrationName(dto.getName());
            entity.setVariableName(dto.getVariableName());
            entity.setEnabled(dto.getEnabled() != null ? dto.getEnabled() : true);
            entity.setParamValues(dto.getParamValues());
            entity.setTransformation(dto.getTransformation());
            entity.setCachedResponse(dto.getCachedResponse());
            entity.setCachedResponseAt(dto.getCachedResponse() != null ? LocalDateTime.now() : null);
            entity.setOrderIndex(dto.getOrderIndex() != null ? dto.getOrderIndex() : i);
            
            if (apiTemplate != null) {
                entity.setApiTemplate(apiTemplate);
            }
            
            updatedIntegrations.add(entity);
        }
        
        // Replace collection contents - orphanRemoval handles deletions
        template.getGlobalApiIntegrations().clear();
        template.getGlobalApiIntegrations().addAll(updatedIntegrations);
        
        log.debug("Upserted {} global API integrations for template '{}'", 
                integrations.size(), template.getName());
    }

    /**
     * Add global API integrations to a template from the request DTOs.
     * Each integration links to an api_template and stores:
     * - variableName: global variable to store API response (e.g., "snowDetails")
     * - paramValues: user-provided API parameter values (e.g., {"changeNo": "CHG123"})
     * - transformation: optional data transformation config (filters, sort, limit)
     * 
     * These integrations are persisted in template_global_api_integrations table
     * and loaded back when the template is retrieved.
     */
    private void addGlobalApiIntegrations(Template template, List<GlobalApiIntegrationRequestDTO> integrations) {
        if (integrations == null || integrations.isEmpty()) return;
        
        for (int i = 0; i < integrations.size(); i++) {
            GlobalApiIntegrationRequestDTO dto = integrations.get(i);
            
            // Resolve the API template reference
            ApiTemplate apiTemplate = apiTemplateRepository.findById(UUID.fromString(dto.getApiTemplateId()))
                    .orElse(null); // Allow null for mock/demo templates with string IDs
            
            TemplateGlobalApiIntegration integration = TemplateGlobalApiIntegration.builder()
                    .integrationName(dto.getName())
                    .variableName(dto.getVariableName())
                    .enabled(dto.getEnabled() != null ? dto.getEnabled() : true)
                    .paramValues(dto.getParamValues())
                    .transformation(dto.getTransformation())
                    .cachedResponse(dto.getCachedResponse())
                    .cachedResponseAt(dto.getCachedResponse() != null ? LocalDateTime.now() : null)
                    .orderIndex(dto.getOrderIndex() != null ? dto.getOrderIndex() : i)
                    .build();
            
            if (apiTemplate != null) {
                integration.setApiTemplate(apiTemplate);
            }
            
            integration.setTemplate(template);
            template.getGlobalApiIntegrations().add(integration);
        }
        
        log.debug("Added {} global API integrations to template '{}'", 
                integrations.size(), template.getName());
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
        
        // Persist section variables as individual rows
        addSectionVariables(section, request);
        
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
        
        // Clear and re-add section variables
        existing.getSectionVariables().clear();
        addSectionVariables(existing, request);
        
        TemplateSection updated = sectionRepository.save(existing);
        return sectionMapper.toResponseDTO(updated);
    }

    /**
     * Extract variables from section DTO and persist as individual rows.
     * Uses sectionVariables list if provided, otherwise extracts from variables JSON.
     */
    private void addSectionVariables(TemplateSection section, TemplateSectionRequestDTO sectionDto) {
        if (sectionDto.getSectionVariables() != null && !sectionDto.getSectionVariables().isEmpty()) {
            for (SectionVariableRequestDTO varDto : sectionDto.getSectionVariables()) {
                SectionVariable variable = SectionVariable.builder()
                        .variableName(varDto.getVariableName())
                        .variableLabel(varDto.getVariableLabel())
                        .defaultValue(varDto.getDefaultValue())
                        .variableType(varDto.getVariableType() != null ? varDto.getVariableType() : "text")
                        .build();
                section.addSectionVariable(variable);
            }
        } else if (sectionDto.getVariables() != null && !sectionDto.getVariables().isNull()) {
            sectionDto.getVariables().fields().forEachRemaining(entry -> {
                String key = entry.getKey();
                JsonNode value = entry.getValue();
                SectionVariable variable = SectionVariable.builder()
                        .variableName(key)
                        .variableLabel(key.replaceAll("([A-Z])", " $1").trim())
                        .defaultValue(value.isTextual() ? value.asText() : value.toString())
                        .variableType(inferVariableType(key, value))
                        .build();
                section.addSectionVariable(variable);
            });
        }
    }

    private String inferVariableType(String key, JsonNode value) {
        if ("items".equals(key) && value.isArray()) return "list";
        if ("tableData".equals(key) && value.isObject()) return "table";
        if ("contentType".equals(key) || "listStyle".equals(key) || "textVariableName".equals(key) 
                || "labelVariableName".equals(key)) return "metadata";
        return "text";
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

### ApiTemplateService

```java
// === ApiTemplateService ===
/**
 * Service for managing API templates and their parameters.
 * 
 * PURPOSE: Provides full CRUD operations for the api_templates and api_template_params tables.
 * API templates are pre-configured endpoint definitions (Jira, GitHub, ServiceNow, etc.)
 * that templates can reference via template_global_api_integrations.
 * 
 * KEY FEATURES:
 * - CRUD for api_templates with cascading params management
 * - Get all templates with params (for frontend dropdown/selection)
 * - Filter by category (Jira, GitHub, ServiceNow, Demo)
 * - Support for custom user-created API templates
 * - Returns response structure matching frontend ApiTemplate type from apiTemplates.ts
 * 
 * RESPONSE FORMAT:
 * The getAllApiTemplates() endpoint returns an array matching the frontend structure:
 * [
 *   {
 *     id: UUID,
 *     name: "Jira Fix Version Details",
 *     description: "Get details of a specific fix version from Jira",
 *     category: "Jira",
 *     urlTemplate: "https://{domain}.atlassian.net/rest/api/3/version/{versionId}",
 *     method: "GET",
 *     headers: {"Authorization": "Basic {authToken}", "Content-Type": "application/json"},
 *     params: [
 *       {paramName: "domain", paramLabel: "Jira Domain", paramType: "text", paramLocation: "path", ...},
 *       ...
 *     ]
 *   },
 *   ...
 * ]
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class ApiTemplateService {

    private final ApiTemplateRepository apiTemplateRepository;
    private final ApiTemplateParamRepository apiTemplateParamRepository;
    private final ApiTemplateMapper apiTemplateMapper;

    /**
     * Get all API templates with their parameters.
     * Returns the complete catalog for frontend dropdown selection.
     * Equivalent to the API_TEMPLATES array in apiTemplates.ts.
     */
    @Transactional(readOnly = true)
    public List<ApiTemplateResponseDTO> getAllApiTemplates() {
        List<ApiTemplate> templates = apiTemplateRepository.findAll();
        return apiTemplateMapper.toResponseDTOList(templates);
    }

    /**
     * Get a single API template by ID with all parameters.
     */
    @Transactional(readOnly = true)
    public ApiTemplateResponseDTO getApiTemplateById(UUID id) {
        ApiTemplate template = apiTemplateRepository.findByIdWithParams(id)
                .orElseThrow(() -> new ResourceNotFoundException("API template not found with id: " + id));
        return apiTemplateMapper.toResponseDTO(template);
    }

    /**
     * Get API templates filtered by category.
     * Categories: 'Jira', 'GitHub', 'ServiceNow', 'Demo', etc.
     */
    @Transactional(readOnly = true)
    public List<ApiTemplateResponseDTO> getApiTemplatesByCategory(String category) {
        List<ApiTemplate> templates = apiTemplateRepository.findByCategory(category);
        return apiTemplateMapper.toResponseDTOList(templates);
    }

    /**
     * Get all distinct categories.
     * Returns: ["Jira", "ServiceNow", "GitHub", "Demo"]
     */
    @Transactional(readOnly = true)
    public List<String> getAllCategories() {
        return apiTemplateRepository.findAllCategories();
    }

    /**
     * Get only custom (user-created) API templates.
     */
    @Transactional(readOnly = true)
    public List<ApiTemplateResponseDTO> getCustomApiTemplates() {
        return apiTemplateMapper.toResponseDTOList(apiTemplateRepository.findByIsCustom(true));
    }

    /**
     * Get API templates created by a specific user.
     */
    @Transactional(readOnly = true)
    public List<ApiTemplateResponseDTO> getApiTemplatesByUser(UUID userId) {
        return apiTemplateMapper.toResponseDTOList(apiTemplateRepository.findByCreatedBy(userId));
    }

    /**
     * Search API templates by name.
     */
    @Transactional(readOnly = true)
    public List<ApiTemplateResponseDTO> searchApiTemplates(String searchTerm) {
        return apiTemplateMapper.toResponseDTOList(apiTemplateRepository.findByNameContainingIgnoreCase(searchTerm));
    }

    /**
     * Create a new API template with parameters.
     * Handles cascading creation of api_template_params.
     */
    public ApiTemplateResponseDTO createApiTemplate(ApiTemplateRequestDTO request) {
        ApiTemplate template = apiTemplateMapper.toEntity(request);
        
        // Add parameters
        if (request.getParams() != null) {
            for (ApiTemplateParamRequestDTO paramDto : request.getParams()) {
                ApiTemplateParam param = ApiTemplateParam.builder()
                        .paramName(paramDto.getParamName())
                        .paramLabel(paramDto.getParamLabel())
                        .paramType(paramDto.getParamType())
                        .paramLocation(paramDto.getParamLocation())
                        .placeholder(paramDto.getPlaceholder())
                        .required(paramDto.getRequired() != null ? paramDto.getRequired() : true)
                        .description(paramDto.getDescription())
                        .options(paramDto.getOptions())
                        .build();
                template.addParam(param);
            }
        }
        
        ApiTemplate saved = apiTemplateRepository.save(template);
        log.info("Created API template '{}' with {} params", saved.getName(), 
                saved.getParams() != null ? saved.getParams().size() : 0);
        return apiTemplateMapper.toResponseDTO(saved);
    }

    /**
     * Update an existing API template and its parameters.
     * Replaces all parameters (delete old + insert new).
     */
    public ApiTemplateResponseDTO updateApiTemplate(UUID id, ApiTemplateRequestDTO request) {
        ApiTemplate existing = apiTemplateRepository.findByIdWithParams(id)
                .orElseThrow(() -> new ResourceNotFoundException("API template not found with id: " + id));
        
        // Update basic fields
        existing.setName(request.getName());
        existing.setDescription(request.getDescription());
        existing.setCategory(request.getCategory());
        existing.setUrlTemplate(request.getUrlTemplate());
        existing.setMethod(request.getMethod());
        existing.setHeaders(request.getHeaders());
        existing.setBodyTemplate(request.getBodyTemplate());
        if (request.getIsCustom() != null) {
            existing.setIsCustom(request.getIsCustom());
        }
        
        // Replace parameters: clear old, add new
        existing.getParams().clear();
        if (request.getParams() != null) {
            for (ApiTemplateParamRequestDTO paramDto : request.getParams()) {
                ApiTemplateParam param = ApiTemplateParam.builder()
                        .paramName(paramDto.getParamName())
                        .paramLabel(paramDto.getParamLabel())
                        .paramType(paramDto.getParamType())
                        .paramLocation(paramDto.getParamLocation())
                        .placeholder(paramDto.getPlaceholder())
                        .required(paramDto.getRequired() != null ? paramDto.getRequired() : true)
                        .description(paramDto.getDescription())
                        .options(paramDto.getOptions())
                        .build();
                existing.addParam(param);
            }
        }
        
        ApiTemplate updated = apiTemplateRepository.save(existing);
        log.info("Updated API template '{}' with {} params", updated.getName(), 
                updated.getParams() != null ? updated.getParams().size() : 0);
        return apiTemplateMapper.toResponseDTO(updated);
    }

    /**
     * Delete an API template and all its parameters (CASCADE).
     * Also checks if any template_global_api_integrations reference this template.
     */
    public void deleteApiTemplate(UUID id) {
        if (!apiTemplateRepository.existsById(id)) {
            throw new ResourceNotFoundException("API template not found with id: " + id);
        }
        apiTemplateRepository.deleteById(id);
        log.info("Deleted API template with id: {}", id);
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
/**
 * REST Controller for API template CRUD operations.
 * 
 * PURPOSE: Manages the api_templates and api_template_params catalog.
 * These are the pre-configured API endpoint definitions (Jira, GitHub, etc.)
 * that users can select when creating global API integrations on templates.
 * 
 * ENDPOINTS:
 * - GET    /api/v1/api-templates                    → Get all API templates with params
 * - GET    /api/v1/api-templates/{id}               → Get single API template by ID
 * - GET    /api/v1/api-templates/category/{category} → Filter by category
 * - GET    /api/v1/api-templates/categories          → Get all distinct categories
 * - GET    /api/v1/api-templates/custom              → Get custom (user-created) templates
 * - GET    /api/v1/api-templates/search?q={term}     → Search by name
 * - POST   /api/v1/api-templates                    → Create new API template with params
 * - PUT    /api/v1/api-templates/{id}               → Update API template and params
 * - DELETE /api/v1/api-templates/{id}               → Delete API template (cascades params)
 * 
 * RESPONSE FORMAT:
 * GET /api/v1/api-templates returns array matching frontend ApiTemplate[] structure:
 * [
 *   {
 *     "id": "a0000001-...",
 *     "name": "Jira Fix Version Details",
 *     "description": "Get details of a specific fix version from Jira",
 *     "category": "Jira",
 *     "urlTemplate": "https://{domain}.atlassian.net/rest/api/3/version/{versionId}",
 *     "method": "GET",
 *     "headers": {"Authorization": "Basic {authToken}", "Content-Type": "application/json"},
 *     "bodyTemplate": null,
 *     "isCustom": false,
 *     "createdBy": null,
 *     "createdAt": "2024-01-01T00:00:00",
 *     "params": [
 *       {"id": "...", "apiTemplateId": "a0000001-...", "paramName": "domain", "paramLabel": "Jira Domain", 
 *        "paramType": "text", "paramLocation": "path", "placeholder": "your-company", 
 *        "required": true, "description": "Your Jira subdomain", "options": null, "createdAt": "..."},
 *       ...
 *     ]
 *   },
 *   ...
 * ]
 */
@RestController
@RequestMapping("/api/v1/api-templates")
@RequiredArgsConstructor
@Tag(name = "API Templates", description = "Manage pre-configured API endpoint templates (Jira, GitHub, ServiceNow, etc.)")
public class ApiTemplateController {

    private final ApiTemplateService apiTemplateService;

    @GetMapping
    @Operation(
        summary = "Get all API templates",
        description = "Returns the complete catalog of API templates with their parameters. " +
                      "This is the primary endpoint used by the frontend to populate the API template " +
                      "selection dropdown in GlobalApiPanel. Returns structure matching apiTemplates.ts."
    )
    @ApiResponse(responseCode = "200", description = "List of all API templates with params")
    public ResponseEntity<List<ApiTemplateResponseDTO>> getAllApiTemplates() {
        return ResponseEntity.ok(apiTemplateService.getAllApiTemplates());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get API template by ID", description = "Returns a single API template with all its parameters")
    @ApiResponse(responseCode = "200", description = "API template found")
    @ApiResponse(responseCode = "404", description = "API template not found")
    public ResponseEntity<ApiTemplateResponseDTO> getApiTemplateById(
            @Parameter(description = "API template UUID") @PathVariable UUID id) {
        return ResponseEntity.ok(apiTemplateService.getApiTemplateById(id));
    }

    @GetMapping("/category/{category}")
    @Operation(summary = "Get API templates by category", description = "Filter templates by category (Jira, GitHub, ServiceNow, Demo)")
    @ApiResponse(responseCode = "200", description = "Filtered list of API templates")
    public ResponseEntity<List<ApiTemplateResponseDTO>> getApiTemplatesByCategory(
            @Parameter(description = "Category name", example = "Jira") @PathVariable String category) {
        return ResponseEntity.ok(apiTemplateService.getApiTemplatesByCategory(category));
    }

    @GetMapping("/categories")
    @Operation(summary = "Get all categories", description = "Returns distinct category names for filtering UI")
    @ApiResponse(responseCode = "200", description = "List of category names")
    public ResponseEntity<List<String>> getAllCategories() {
        return ResponseEntity.ok(apiTemplateService.getAllCategories());
    }

    @GetMapping("/custom")
    @Operation(summary = "Get custom API templates", description = "Returns only user-created custom API templates")
    @ApiResponse(responseCode = "200", description = "List of custom API templates")
    public ResponseEntity<List<ApiTemplateResponseDTO>> getCustomApiTemplates() {
        return ResponseEntity.ok(apiTemplateService.getCustomApiTemplates());
    }

    @GetMapping("/search")
    @Operation(summary = "Search API templates by name", description = "Case-insensitive name search")
    @ApiResponse(responseCode = "200", description = "Matching API templates")
    public ResponseEntity<List<ApiTemplateResponseDTO>> searchApiTemplates(
            @Parameter(description = "Search term") @RequestParam("q") String searchTerm) {
        return ResponseEntity.ok(apiTemplateService.searchApiTemplates(searchTerm));
    }

    @PostMapping
    @Operation(summary = "Create API template", description = "Creates a new API template with parameters. Use for custom user-created API integrations.")
    @ApiResponse(responseCode = "201", description = "API template created")
    @ApiResponse(responseCode = "400", description = "Validation error")
    public ResponseEntity<ApiTemplateResponseDTO> createApiTemplate(
            @Valid @RequestBody ApiTemplateRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(apiTemplateService.createApiTemplate(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update API template", description = "Updates an existing API template and replaces all its parameters")
    @ApiResponse(responseCode = "200", description = "API template updated")
    @ApiResponse(responseCode = "404", description = "API template not found")
    public ResponseEntity<ApiTemplateResponseDTO> updateApiTemplate(
            @Parameter(description = "API template UUID") @PathVariable UUID id, 
            @Valid @RequestBody ApiTemplateRequestDTO request) {
        return ResponseEntity.ok(apiTemplateService.updateApiTemplate(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete API template", description = "Deletes an API template and all its parameters (CASCADE)")
    @ApiResponse(responseCode = "204", description = "API template deleted")
    @ApiResponse(responseCode = "404", description = "API template not found")
    public ResponseEntity<Void> deleteApiTemplate(
            @Parameter(description = "API template UUID") @PathVariable UUID id) {
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
    @Mapping(source = "sectionVariables", target = "sectionVariables")
    TemplateSectionResponseDTO toResponseDTO(TemplateSection entity);
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "template", ignore = true)
    @Mapping(target = "parentSection", ignore = true)
    @Mapping(target = "childSections", ignore = true)
    @Mapping(target = "sectionVariables", ignore = true)
    @Mapping(target = "apiMappings", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    TemplateSection toEntity(TemplateSectionRequestDTO dto);
    
    List<TemplateSectionResponseDTO> toResponseDTOList(List<TemplateSection> entities);
}

// Note: SectionVariableMapper (from SectionMapper) handles mapping for both
// catalog and instance variables since they use the same SectionVariable entity.

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
    
    void updateEntity(ApiTemplateRequestDTO dto, @MappingTarget ApiTemplate entity);
    
    List<ApiTemplateResponseDTO> toResponseDTOList(List<ApiTemplate> entities);
}

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ApiTemplateParamMapper {
    
    @Mapping(source = "apiTemplate.id", target = "apiTemplateId")
    ApiTemplateParamResponseDTO toResponseDTO(ApiTemplateParam entity);
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "apiTemplate", ignore = true)
    ApiTemplateParam toEntity(ApiTemplateParamRequestDTO dto);
    
    List<ApiTemplateParamResponseDTO> toResponseDTOList(List<ApiTemplateParam> entities);
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

---

## Hibernate Envers - Template & Section Versioning

### Overview

Both `templates` and `template_sections` tables are audited using **Hibernate Envers**. Every update to a template or its sections creates a new revision, enabling full version history retrieval. When fetching a template at a specific version, the corresponding `template_sections` snapshot at that same revision is also returned.

### Audit Tables (Auto-Generated by Envers)

Envers automatically creates the following audit tables in MS SQL Server:

```sql
-- Revision info table (shared across all audited entities)
CREATE TABLE REVINFO (
    REV INT IDENTITY(1,1) PRIMARY KEY,
    REVTSTMP BIGINT NOT NULL  -- Timestamp in milliseconds
);

-- Audit table for templates
CREATE TABLE templates_AUD (
    id UNIQUEIDENTIFIER NOT NULL,
    REV INT NOT NULL,
    REVTYPE TINYINT NOT NULL,  -- 0=ADD, 1=MOD, 2=DEL
    name NVARCHAR(255),
    subject NVARCHAR(500),
    html NVARCHAR(MAX),
    user_id UNIQUEIDENTIFIER,
    created_at DATETIME2,
    updated_at DATETIME2,
    PRIMARY KEY (id, REV),
    FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);

-- Audit table for template_sections
CREATE TABLE template_sections_AUD (
    id UNIQUEIDENTIFIER NOT NULL,
    REV INT NOT NULL,
    REVTYPE TINYINT NOT NULL,  -- 0=ADD, 1=MOD, 2=DEL
    template_id UNIQUEIDENTIFIER,
    section_type NVARCHAR(50),
    content NVARCHAR(MAX),
    variables NVARCHAR(MAX),
    styles NVARCHAR(MAX),
    is_label_editable BIT,
    order_index INT,
    parent_section_id UNIQUEIDENTIFIER,
    created_at DATETIME2,
    PRIMARY KEY (id, REV),
    FOREIGN KEY (REV) REFERENCES REVINFO(REV)
);
```

### Audited vs Not-Audited Fields

| Entity | Audited Fields | Not-Audited Collections |
|--------|---------------|------------------------|
| **Template** | id, name, subject, html, userId, createdAt, updatedAt, sections (relationship) | runs, variables, apiConfig |
| **TemplateSection** | id, templateId, sectionType, content, variables (JSON), styles (JSON), isLabelEditable, orderIndex, parentSectionId, childSections (relationship) | sectionVariables, apiMappings |

### Custom RevisionEntity (Optional Enhancement)

```java
package com.example.pagebuilder.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.envers.DefaultRevisionEntity;
import org.hibernate.envers.RevisionEntity;

/**
 * Custom revision entity to capture WHO made the change.
 * Extends DefaultRevisionEntity which provides REV (id) and REVTSTMP (timestamp).
 */
@Entity
@Table(name = "REVINFO")
@RevisionEntity(AuditRevisionListener.class)
@Data
@EqualsAndHashCode(callSuper = true)
public class AuditRevisionEntity extends DefaultRevisionEntity {

    @Column(name = "changed_by", length = 100)
    private String changedBy;

    @Column(name = "change_reason", length = 500)
    private String changeReason;
}
```

```java
package com.example.pagebuilder.config;

import com.example.pagebuilder.entity.AuditRevisionEntity;
import org.hibernate.envers.RevisionListener;

/**
 * Listener that populates revision metadata (who made the change).
 */
public class AuditRevisionListener implements RevisionListener {

    @Override
    public void newRevision(Object revisionEntity) {
        AuditRevisionEntity rev = (AuditRevisionEntity) revisionEntity;
        // Retrieve current user from SecurityContext or thread-local
        // rev.setChangedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        rev.setChangedBy("system"); // Replace with actual user resolution
    }
}
```

### Repository - Querying Versioned Data

```java
package com.example.pagebuilder.repository;

import com.example.pagebuilder.entity.Template;
import com.example.pagebuilder.entity.TemplateSection;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.hibernate.envers.AuditReader;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.query.AuditEntity;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for querying versioned/audited template and section data.
 * Uses Hibernate Envers AuditReader to retrieve historical snapshots.
 */
@Repository
@RequiredArgsConstructor
public class TemplateAuditRepository {

    private final EntityManager entityManager;

    private AuditReader getAuditReader() {
        return AuditReaderFactory.get(entityManager);
    }

    /**
     * Get all revision numbers for a given template.
     * 
     * @param templateId The template UUID
     * @return List of revision numbers (ascending order)
     */
    public List<Number> getTemplateRevisions(UUID templateId) {
        return getAuditReader().getRevisions(Template.class, templateId);
    }

    /**
     * Get a template snapshot at a specific revision.
     * Since template_sections is also @Audited, Envers will automatically
     * return the sections as they existed at that revision.
     * 
     * @param templateId The template UUID
     * @param revision   The revision number
     * @return Template entity as it existed at the given revision
     */
    public Template getTemplateAtRevision(UUID templateId, Number revision) {
        return getAuditReader().find(Template.class, templateId, revision);
    }

    /**
     * Get all template_sections for a given template at a specific revision.
     * This queries the template_sections_AUD table directly.
     * 
     * @param templateId The template UUID
     * @param revision   The revision number
     * @return List of TemplateSection entities at that revision
     */
    @SuppressWarnings("unchecked")
    public List<TemplateSection> getSectionsAtRevision(UUID templateId, Number revision) {
        return getAuditReader().createQuery()
                .forEntitiesAtRevision(TemplateSection.class, revision)
                .add(AuditEntity.relatedId("template").eq(templateId))
                .addOrder(AuditEntity.property("orderIndex").asc())
                .getResultList();
    }

    /**
     * Get a specific section at a specific revision.
     * 
     * @param sectionId The section UUID
     * @param revision  The revision number
     * @return TemplateSection entity at that revision
     */
    public TemplateSection getSectionAtRevision(UUID sectionId, Number revision) {
        return getAuditReader().find(TemplateSection.class, sectionId, revision);
    }

    /**
     * Get all revision numbers for a specific section.
     * 
     * @param sectionId The section UUID
     * @return List of revision numbers where this section was modified
     */
    public List<Number> getSectionRevisions(UUID sectionId) {
        return getAuditReader().getRevisions(TemplateSection.class, sectionId);
    }

    /**
     * Get the total number of revisions for a template.
     * 
     * @param templateId The template UUID
     * @return Count of revisions
     */
    public int getTemplateRevisionCount(UUID templateId) {
        return getTemplateRevisions(templateId).size();
    }

    /**
     * Get the latest revision number for a template.
     * 
     * @param templateId The template UUID
     * @return Latest revision number, or null if no revisions exist
     */
    public Number getLatestRevision(UUID templateId) {
        List<Number> revisions = getTemplateRevisions(templateId);
        return revisions.isEmpty() ? null : revisions.get(revisions.size() - 1);
    }
}
```

### Service - Version History Operations

```java
package com.example.pagebuilder.service;

import com.example.pagebuilder.dto.TemplateVersionDTO;
import com.example.pagebuilder.dto.TemplateVersionDetailDTO;
import com.example.pagebuilder.dto.TemplateSectionResponseDTO;
import com.example.pagebuilder.entity.Template;
import com.example.pagebuilder.entity.TemplateSection;
import com.example.pagebuilder.mapper.TemplateMapper;
import com.example.pagebuilder.mapper.TemplateSectionMapper;
import com.example.pagebuilder.repository.TemplateAuditRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.envers.AuditReaderFactory;
import org.hibernate.envers.DefaultRevisionEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for template version history operations.
 * Provides methods to list versions, retrieve historical snapshots,
 * and compare template states across revisions.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TemplateVersionService {

    private final TemplateAuditRepository auditRepository;
    private final TemplateMapper templateMapper;
    private final TemplateSectionMapper sectionMapper;
    private final jakarta.persistence.EntityManager entityManager;

    /**
     * List all versions (revisions) of a template.
     * Returns revision number, timestamp, and changed-by info.
     * 
     * @param templateId The template UUID
     * @return List of version summaries
     */
    public List<TemplateVersionDTO> getTemplateVersionHistory(UUID templateId) {
        List<Number> revisions = auditRepository.getTemplateRevisions(templateId);
        var auditReader = AuditReaderFactory.get(entityManager);

        return revisions.stream().map(rev -> {
            DefaultRevisionEntity revEntity = auditReader.findRevision(
                DefaultRevisionEntity.class, rev);
            
            return TemplateVersionDTO.builder()
                    .revisionNumber(rev.intValue())
                    .revisionDate(LocalDateTime.ofInstant(
                        Instant.ofEpochMilli(revEntity.getTimestamp()),
                        ZoneId.systemDefault()))
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * Get a complete template snapshot at a specific version,
     * INCLUDING all its sections as they existed at that revision.
     * 
     * This is the KEY method - it returns both the template AND
     * the template_sections at the requested version.
     * 
     * @param templateId The template UUID
     * @param revision   The version/revision number
     * @return Full template detail with sections at that version
     */
    public TemplateVersionDetailDTO getTemplateAtVersion(UUID templateId, int revision) {
        // 1. Get template at this revision
        Template template = auditRepository.getTemplateAtRevision(templateId, revision);
        if (template == null) {
            throw new ResourceNotFoundException(
                "Template " + templateId + " not found at revision " + revision);
        }

        // 2. Get all sections at this same revision
        List<TemplateSection> sections = auditRepository
                .getSectionsAtRevision(templateId, revision);

        // 3. Map to DTOs
        List<TemplateSectionResponseDTO> sectionDTOs = sections.stream()
                .map(sectionMapper::toResponseDTO)
                .collect(Collectors.toList());

        return TemplateVersionDetailDTO.builder()
                .revisionNumber(revision)
                .templateId(templateId)
                .name(template.getName())
                .subject(template.getSubject())
                .html(template.getHtml())
                .sections(sectionDTOs)
                .build();
    }
}
```

### DTOs for Version History

```java
package com.example.pagebuilder.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Summary DTO for a template version (used in version list).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Summary of a template version/revision")
public class TemplateVersionDTO {

    @Schema(description = "Revision number", example = "5")
    private int revisionNumber;

    @Schema(description = "When this revision was created")
    private LocalDateTime revisionDate;

    @Schema(description = "Who made this change", example = "K006084")
    private String changedBy;
}

/**
 * Full template snapshot at a specific version, including sections.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Complete template snapshot at a specific version with all sections")
public class TemplateVersionDetailDTO {

    @Schema(description = "Revision number", example = "5")
    private int revisionNumber;

    @Schema(description = "Template ID")
    private UUID templateId;

    @Schema(description = "Template name at this version")
    private String name;

    @Schema(description = "Subject line at this version")
    private String subject;

    @Schema(description = "Full HTML at this version")
    private String html;

    @Schema(description = "All sections as they existed at this version")
    private List<TemplateSectionResponseDTO> sections;

    @Schema(description = "When this version was created")
    private LocalDateTime revisionDate;

    @Schema(description = "Who created this version")
    private String changedBy;
}
```

### Controller - Version History Endpoints

```java
package com.example.pagebuilder.controller;

import com.example.pagebuilder.dto.TemplateVersionDTO;
import com.example.pagebuilder.dto.TemplateVersionDetailDTO;
import com.example.pagebuilder.service.TemplateVersionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST endpoints for template version history.
 * 
 * API Endpoints:
 *   GET /api/v1/templates/{id}/versions          → List all versions
 *   GET /api/v1/templates/{id}/versions/{rev}     → Get template + sections at version
 *   GET /api/v1/templates/{id}/versions/latest    → Get latest version number
 */
@RestController
@RequestMapping("/api/v1/templates/{templateId}/versions")
@RequiredArgsConstructor
@Tag(name = "Template Versions", description = "Template version history using Hibernate Envers")
public class TemplateVersionController {

    private final TemplateVersionService versionService;

    @GetMapping
    @Operation(summary = "List all versions of a template",
            description = "Returns revision numbers and timestamps for all versions")
    public ResponseEntity<List<TemplateVersionDTO>> getVersionHistory(
            @Parameter(description = "Template ID") @PathVariable UUID templateId) {
        return ResponseEntity.ok(versionService.getTemplateVersionHistory(templateId));
    }

    @GetMapping("/{revision}")
    @Operation(summary = "Get template at a specific version",
            description = "Returns the complete template snapshot including all sections " +
                    "as they existed at the specified revision number")
    public ResponseEntity<TemplateVersionDetailDTO> getTemplateAtVersion(
            @Parameter(description = "Template ID") @PathVariable UUID templateId,
            @Parameter(description = "Revision number") @PathVariable int revision) {
        return ResponseEntity.ok(versionService.getTemplateAtVersion(templateId, revision));
    }
}
```

### Envers Configuration (application.yml)

Add these properties to your existing Spring Boot configuration:

```yaml
spring:
  jpa:
    properties:
      org.hibernate.envers:
        # Store audit data in same schema
        default_schema: dbo
        # Audit table suffix
        audit_table_suffix: _AUD
        # Revision field name in audit tables
        revision_field_name: REV
        # Revision type field name (ADD/MOD/DEL)
        revision_type_field_name: REVTYPE
        # Store data at delete revision (keeps snapshot of deleted data)
        store_data_at_delete: true
        # Track which properties changed (creates modified flags columns)
        global_with_modified_flag: false
        # Audit strategy - validity stores end revision for range queries
        audit_strategy: org.hibernate.envers.strategy.ValidityAuditStrategy
        audit_strategy_validity_store_revend_timestamp: true
        audit_strategy_validity_revend_timestamp_field_name: REVEND_TSTMP
```

### How Versioning Works - Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│  User updates a template (PUT /api/v1/templates/{id})        │
│                                                              │
│  1. Template entity is updated → templates table             │
│  2. Sections are updated → template_sections table           │
│  3. Envers intercepts the flush:                             │
│     → Creates new row in REVINFO (REV=5, timestamp=now)      │
│     → Copies template state to templates_AUD (REV=5)         │
│     → Copies ALL section states to template_sections_AUD     │
│       (REV=5, one row per section)                           │
│                                                              │
│  Result: Complete snapshot of template + sections at REV=5   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  User requests version 5 (GET /templates/{id}/versions/5)    │
│                                                              │
│  1. AuditReader.find(Template.class, id, 5)                  │
│     → Returns template row from templates_AUD where REV=5    │
│                                                              │
│  2. AuditReader.createQuery()                                │
│       .forEntitiesAtRevision(TemplateSection.class, 5)       │
│       .add(AuditEntity.relatedId("template").eq(id))         │
│     → Returns ALL section rows from template_sections_AUD    │
│       where REV<=5 (latest state at or before revision 5)    │
│                                                              │
│  Result: Template + sections exactly as they were at REV=5   │
└──────────────────────────────────────────────────────────────┘
```

### Migration Script for Audit Tables

```sql
-- Migration: 010_create_envers_audit_tables.sql
-- Description: Create Hibernate Envers audit infrastructure tables
-- NOTE: These tables are auto-created by Envers if hibernate.hbm2ddl.auto is set,
--       but for production, create them explicitly via migration.

-- Revision info table
CREATE TABLE REVINFO (
    REV INT IDENTITY(1,1) NOT NULL,
    REVTSTMP BIGINT NOT NULL,
    changed_by NVARCHAR(100),
    change_reason NVARCHAR(500),
    CONSTRAINT pk_revinfo PRIMARY KEY (REV)
);

-- Templates audit table
CREATE TABLE templates_AUD (
    id UNIQUEIDENTIFIER NOT NULL,
    REV INT NOT NULL,
    REVTYPE TINYINT NOT NULL,
    REVEND INT,
    REVEND_TSTMP BIGINT,
    name NVARCHAR(255),
    subject NVARCHAR(500),
    html NVARCHAR(MAX),
    user_id UNIQUEIDENTIFIER,
    created_at DATETIME2,
    updated_at DATETIME2,
    CONSTRAINT pk_templates_aud PRIMARY KEY (id, REV),
    CONSTRAINT fk_templates_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV),
    CONSTRAINT fk_templates_aud_revend FOREIGN KEY (REVEND) REFERENCES REVINFO(REV)
);

-- Template sections audit table
CREATE TABLE template_sections_AUD (
    id UNIQUEIDENTIFIER NOT NULL,
    REV INT NOT NULL,
    REVTYPE TINYINT NOT NULL,
    REVEND INT,
    REVEND_TSTMP BIGINT,
    template_id UNIQUEIDENTIFIER,
    section_type NVARCHAR(50),
    content NVARCHAR(MAX),
    variables NVARCHAR(MAX),
    styles NVARCHAR(MAX),
    is_label_editable BIT,
    order_index INT,
    parent_section_id UNIQUEIDENTIFIER,
    created_at DATETIME2,
    CONSTRAINT pk_template_sections_aud PRIMARY KEY (id, REV),
    CONSTRAINT fk_template_sections_aud_rev FOREIGN KEY (REV) REFERENCES REVINFO(REV),
    CONSTRAINT fk_template_sections_aud_revend FOREIGN KEY (REVEND) REFERENCES REVINFO(REV)
);

-- Indexes for audit table performance
CREATE INDEX idx_templates_aud_rev ON templates_AUD(REV);
CREATE INDEX idx_templates_aud_id ON templates_AUD(id);
CREATE INDEX idx_template_sections_aud_rev ON template_sections_AUD(REV);
CREATE INDEX idx_template_sections_aud_template_id ON template_sections_AUD(template_id);
CREATE INDEX idx_template_sections_aud_id ON template_sections_AUD(id);

GO
```
