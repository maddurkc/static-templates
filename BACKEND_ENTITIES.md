# Spring Boot Backend Implementation for MS SQL Server

## Overview

This document provides Spring Boot entity classes, DTOs, repositories, services, and controllers for the page builder application with nested multi-level list support and rich text formatting.

## Entity Classes

### TemplateSection Entity

```java
package com.example.pagebuilder.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.JsonNode;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity representing a section within a template.
 * Supports nested sections, dynamic variables (including multi-level lists with formatting),
 * and custom styling.
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
public class TemplateSection {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "UNIQUEIDENTIFIER")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false, foreignKey = @ForeignKey(name = "fk_template_sections_template"))
    @JsonBackReference
    private Template template;

    @Column(name = "section_type", nullable = false, length = 50)
    private String sectionType;

    @Column(name = "content", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String content;

    /**
     * JSON structure for variables. Supports nested lists with rich text formatting.
     * Example:
     * {
     *   "label": "Incident Report",
     *   "contentType": "list",
     *   "listStyle": "disc",
     *   "items": [
     *     {
     *       "text": "Main Item 1",
     *       "bold": true,
     *       "color": "#FF0000",
     *       "fontSize": "16px",
     *       "children": [
     *         {
     *           "text": "Sub-item 1.1",
     *           "italic": true,
     *           "backgroundColor": "#FFFF00",
     *           "children": [
     *             {
     *               "text": "Sub-sub-item 1.1.1",
     *               "underline": true,
     *               "children": []
     *             }
     *           ]
     *         }
     *       ]
     *     }
     *   ]
     * }
     */
    @Type(JsonType.class)
    @Column(name = "variables", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode variables;

    /**
     * JSON structure for custom styles.
     * Example:
     * {
     *   "fontSize": "16px",
     *   "color": "#000000",
     *   "backgroundColor": "#FFFFFF",
     *   "textAlign": "left",
     *   "fontWeight": "normal"
     * }
     */
    @Type(JsonType.class)
    @Column(name = "styles", columnDefinition = "NVARCHAR(MAX)")
    private JsonNode styles;

    @Column(name = "is_label_editable", nullable = false, columnDefinition = "BIT")
    private Boolean isLabelEditable = true;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_section_id", foreignKey = @ForeignKey(name = "fk_template_sections_parent"))
    @JsonBackReference
    private TemplateSection parentSection;

    @OneToMany(mappedBy = "parentSection", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<TemplateSection> childSections = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Adds a child section to this section.
     */
    public void addChildSection(TemplateSection child) {
        childSections.add(child);
        child.setParentSection(this);
    }

    /**
     * Removes a child section from this section.
     */
    public void removeChildSection(TemplateSection child) {
        childSections.remove(child);
        child.setParentSection(null);
    }
}
```

### ListItemStyle Model (for JSON deserialization)

```java
package com.example.pagebuilder.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Model representing a list item with rich text formatting and nested children.
 * Used for deserializing the "items" array in template section variables.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ListItemStyle {

    /**
     * The text content of the list item
     */
    private String text;

    /**
     * Bold formatting
     */
    private Boolean bold;

    /**
     * Italic formatting
     */
    private Boolean italic;

    /**
     * Underline formatting
     */
    private Boolean underline;

    /**
     * Text color (hex format: #FF0000)
     */
    private String color;

    /**
     * Background color (hex format: #FFFF00)
     */
    private String backgroundColor;

    /**
     * Font size (CSS format: 16px, 1.2em, etc.)
     */
    private String fontSize;

    /**
     * Nested child items (supports up to 3 levels)
     */
    private List<ListItemStyle> children = new ArrayList<>();

    /**
     * Checks if this item has any formatting applied
     */
    public boolean hasFormatting() {
        return bold != null && bold ||
               italic != null && italic ||
               underline != null && underline ||
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
}
```

## DTOs (Data Transfer Objects)

### TemplateSectionRequestDTO

```java
package com.example.pagebuilder.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request DTO for creating or updating a template section
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request payload for template section creation/update")
public class TemplateSectionRequestDTO {

    @NotNull(message = "Template ID is required")
    @Schema(description = "ID of the parent template", example = "123e4567-e89b-12d3-a456-426614174000")
    private UUID templateId;

    @NotBlank(message = "Section type is required")
    @Size(max = 50, message = "Section type must not exceed 50 characters")
    @Schema(description = "Type of section", example = "labeled-content")
    private String sectionType;

    @NotBlank(message = "Content is required")
    @Schema(description = "Content with Thymeleaf variables", 
            example = "<h2><th:utext=\"${title}\"></h2>")
    private String content;

    @Schema(description = "Section variables including nested lists with formatting",
            example = "{\"label\":\"Incident Report\",\"contentType\":\"list\",\"listStyle\":\"disc\",\"items\":[{\"text\":\"Item 1\",\"bold\":true,\"children\":[]}]}")
    private JsonNode variables;

    @Schema(description = "Custom styles for the section",
            example = "{\"fontSize\":\"16px\",\"color\":\"#000000\"}")
    private JsonNode styles;

    @Schema(description = "Whether label is editable at runtime", example = "true")
    private Boolean isLabelEditable = true;

    @NotNull(message = "Order index is required")
    @Min(value = 0, message = "Order index must be non-negative")
    @Schema(description = "Position in template", example = "0")
    private Integer orderIndex;

    @Schema(description = "Parent section ID for nested sections", example = "123e4567-e89b-12d3-a456-426614174001")
    private UUID parentSectionId;
}
```

### TemplateSectionResponseDTO

```java
package com.example.pagebuilder.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Response DTO for template section
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Template section details")
public class TemplateSectionResponseDTO {

    @Schema(description = "Section ID")
    private UUID id;

    @Schema(description = "Parent template ID")
    private UUID templateId;

    @Schema(description = "Section type")
    private String sectionType;

    @Schema(description = "Content with Thymeleaf variables")
    private String content;

    @Schema(description = "Section variables (nested lists, table data, etc.)")
    private JsonNode variables;

    @Schema(description = "Custom styles")
    private JsonNode styles;

    @Schema(description = "Whether label is editable at runtime")
    private Boolean isLabelEditable;

    @Schema(description = "Position in template")
    private Integer orderIndex;

    @Schema(description = "Parent section ID (for nested sections)")
    private UUID parentSectionId;

    @Schema(description = "Child sections")
    private List<TemplateSectionResponseDTO> childSections = new ArrayList<>();

    @Schema(description = "Creation timestamp")
    private LocalDateTime createdAt;
}
```

## Repository

```java
package com.example.pagebuilder.repository;

import com.example.pagebuilder.entity.TemplateSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for TemplateSection entity
 */
@Repository
public interface TemplateSectionRepository extends JpaRepository<TemplateSection, UUID> {

    /**
     * Find all sections for a specific template
     */
    List<TemplateSection> findByTemplateIdOrderByOrderIndex(UUID templateId);

    /**
     * Find all top-level sections (no parent) for a template
     */
    @Query("SELECT ts FROM TemplateSection ts WHERE ts.template.id = :templateId AND ts.parentSection IS NULL ORDER BY ts.orderIndex")
    List<TemplateSection> findTopLevelSectionsByTemplateId(@Param("templateId") UUID templateId);

    /**
     * Find all child sections of a parent section
     */
    List<TemplateSection> findByParentSectionIdOrderByOrderIndex(UUID parentSectionId);

    /**
     * Find sections by type within a template
     */
    List<TemplateSection> findByTemplateIdAndSectionType(UUID templateId, String sectionType);

    /**
     * Delete all sections for a template (cascade handled by FK)
     */
    void deleteByTemplateId(UUID templateId);

    /**
     * Count sections in a template
     */
    long countByTemplateId(UUID templateId);

    /**
     * Find sections with specific variable keys (using JSON query)
     * Note: Syntax may vary based on SQL Server version and JSON support
     */
    @Query(value = "SELECT * FROM template_sections WHERE template_id = :templateId AND JSON_VALUE(variables, '$.label') LIKE %:searchTerm%", nativeQuery = true)
    List<TemplateSection> findByTemplateIdAndVariableContaining(@Param("templateId") UUID templateId, @Param("searchTerm") String searchTerm);
}
```

## Service

```java
package com.example.pagebuilder.service;

import com.example.pagebuilder.dto.request.TemplateSectionRequestDTO;
import com.example.pagebuilder.dto.response.TemplateSectionResponseDTO;
import com.example.pagebuilder.entity.Template;
import com.example.pagebuilder.entity.TemplateSection;
import com.example.pagebuilder.exception.ResourceNotFoundException;
import com.example.pagebuilder.mapper.TemplateSectionMapper;
import com.example.pagebuilder.repository.TemplateSectionRepository;
import com.example.pagebuilder.repository.TemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing template sections with nested lists and rich formatting
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TemplateSectionService {

    private final TemplateSectionRepository sectionRepository;
    private final TemplateRepository templateRepository;
    private final TemplateSectionMapper sectionMapper;

    /**
     * Get all top-level sections for a template
     */
    @Transactional(readOnly = true)
    public List<TemplateSectionResponseDTO> getTemplateSections(UUID templateId) {
        log.info("Fetching sections for template: {}", templateId);
        
        List<TemplateSection> sections = sectionRepository.findTopLevelSectionsByTemplateId(templateId);
        
        return sections.stream()
                .map(sectionMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific section by ID
     */
    @Transactional(readOnly = true)
    public TemplateSectionResponseDTO getSectionById(UUID sectionId) {
        log.info("Fetching section: {}", sectionId);
        
        TemplateSection section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + sectionId));
        
        return sectionMapper.toResponseDTO(section);
    }

    /**
     * Create a new template section
     */
    @Transactional
    public TemplateSectionResponseDTO createSection(TemplateSectionRequestDTO requestDTO) {
        log.info("Creating section for template: {}", requestDTO.getTemplateId());
        
        // Validate template exists
        Template template = templateRepository.findById(requestDTO.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template not found with id: " + requestDTO.getTemplateId()));
        
        TemplateSection section = sectionMapper.toEntity(requestDTO);
        section.setTemplate(template);
        
        // Handle parent section if specified
        if (requestDTO.getParentSectionId() != null) {
            TemplateSection parentSection = sectionRepository.findById(requestDTO.getParentSectionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent section not found with id: " + requestDTO.getParentSectionId()));
            section.setParentSection(parentSection);
        }
        
        TemplateSection savedSection = sectionRepository.save(section);
        log.info("Created section: {}", savedSection.getId());
        
        return sectionMapper.toResponseDTO(savedSection);
    }

    /**
     * Update an existing section
     */
    @Transactional
    public TemplateSectionResponseDTO updateSection(UUID sectionId, TemplateSectionRequestDTO requestDTO) {
        log.info("Updating section: {}", sectionId);
        
        TemplateSection existingSection = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + sectionId));
        
        // Update fields
        existingSection.setSectionType(requestDTO.getSectionType());
        existingSection.setContent(requestDTO.getContent());
        existingSection.setVariables(requestDTO.getVariables());
        existingSection.setStyles(requestDTO.getStyles());
        existingSection.setIsLabelEditable(requestDTO.getIsLabelEditable());
        existingSection.setOrderIndex(requestDTO.getOrderIndex());
        
        TemplateSection updatedSection = sectionRepository.save(existingSection);
        log.info("Updated section: {}", updatedSection.getId());
        
        return sectionMapper.toResponseDTO(updatedSection);
    }

    /**
     * Delete a section (cascades to children)
     */
    @Transactional
    public void deleteSection(UUID sectionId) {
        log.info("Deleting section: {}", sectionId);
        
        if (!sectionRepository.existsById(sectionId)) {
            throw new ResourceNotFoundException("Section not found with id: " + sectionId);
        }
        
        sectionRepository.deleteById(sectionId);
        log.info("Deleted section: {}", sectionId);
    }

    /**
     * Reorder sections within a template
     */
    @Transactional
    public void reorderSections(UUID templateId, List<UUID> sectionIds) {
        log.info("Reordering sections for template: {}", templateId);
        
        for (int i = 0; i < sectionIds.size(); i++) {
            UUID sectionId = sectionIds.get(i);
            TemplateSection section = sectionRepository.findById(sectionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + sectionId));
            
            section.setOrderIndex(i);
            sectionRepository.save(section);
        }
        
        log.info("Reordered {} sections", sectionIds.size());
    }
}
```

## Controller

```java
package com.example.pagebuilder.controller;

import com.example.pagebuilder.dto.request.TemplateSectionRequestDTO;
import com.example.pagebuilder.dto.response.TemplateSectionResponseDTO;
import com.example.pagebuilder.service.TemplateSectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for managing template sections with nested lists and rich formatting
 */
@RestController
@RequestMapping("/api/v1/template-sections")
@RequiredArgsConstructor
@Tag(name = "Template Sections", description = "Manage template sections with nested lists and rich text formatting")
public class TemplateSectionController {

    private final TemplateSectionService sectionService;

    @GetMapping("/template/{templateId}")
    @Operation(summary = "Get all sections for a template", description = "Retrieves all top-level sections for the specified template")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Sections retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Template not found")
    })
    public ResponseEntity<List<TemplateSectionResponseDTO>> getTemplateSections(
            @Parameter(description = "Template ID") @PathVariable UUID templateId) {
        return ResponseEntity.ok(sectionService.getTemplateSections(templateId));
    }

    @GetMapping("/{sectionId}")
    @Operation(summary = "Get section by ID", description = "Retrieves a specific section with all nested children")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Section retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Section not found")
    })
    public ResponseEntity<TemplateSectionResponseDTO> getSectionById(
            @Parameter(description = "Section ID") @PathVariable UUID sectionId) {
        return ResponseEntity.ok(sectionService.getSectionById(sectionId));
    }

    @PostMapping
    @Operation(summary = "Create a new section", description = "Creates a new template section with variables and styling")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Section created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "404", description = "Template or parent section not found")
    })
    public ResponseEntity<TemplateSectionResponseDTO> createSection(
            @Valid @RequestBody TemplateSectionRequestDTO requestDTO) {
        TemplateSectionResponseDTO response = sectionService.createSection(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{sectionId}")
    @Operation(summary = "Update a section", description = "Updates an existing template section")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Section updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "404", description = "Section not found")
    })
    public ResponseEntity<TemplateSectionResponseDTO> updateSection(
            @Parameter(description = "Section ID") @PathVariable UUID sectionId,
            @Valid @RequestBody TemplateSectionRequestDTO requestDTO) {
        return ResponseEntity.ok(sectionService.updateSection(sectionId, requestDTO));
    }

    @DeleteMapping("/{sectionId}")
    @Operation(summary = "Delete a section", description = "Deletes a section and all its children")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Section deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Section not found")
    })
    public ResponseEntity<Void> deleteSection(
            @Parameter(description = "Section ID") @PathVariable UUID sectionId) {
        sectionService.deleteSection(sectionId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/template/{templateId}/reorder")
    @Operation(summary = "Reorder sections", description = "Updates the order of sections within a template")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Sections reordered successfully"),
        @ApiResponse(responseCode = "404", description = "Template or section not found")
    })
    public ResponseEntity<Void> reorderSections(
            @Parameter(description = "Template ID") @PathVariable UUID templateId,
            @RequestBody List<UUID> sectionIds) {
        sectionService.reorderSections(templateId, sectionIds);
        return ResponseEntity.ok().build();
    }
}
```

## MapStruct Mapper

```java
package com.example.pagebuilder.mapper;

import com.example.pagebuilder.dto.request.TemplateSectionRequestDTO;
import com.example.pagebuilder.dto.response.TemplateSectionResponseDTO;
import com.example.pagebuilder.entity.TemplateSection;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for TemplateSection entity and DTOs
 */
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
    @Mapping(target = "createdAt", ignore = true)
    TemplateSection toEntity(TemplateSectionRequestDTO dto);

    List<TemplateSectionResponseDTO> toResponseDTOList(List<TemplateSection> entities);
}
```

## Configuration Dependencies (pom.xml)

```xml
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
```

## application.yml Configuration

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
```
