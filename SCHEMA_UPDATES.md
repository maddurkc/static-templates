# Database Schema Updates for Nested Lists with Rich Formatting

## Overview

This document describes the database schema updates to support nested/multi-level lists (up to 3 levels) with rich text formatting in labeled-content sections.

## Schema Changes

### Updated template_sections Table

The `template_sections` table now includes the `is_label_editable` column and enhanced JSON structure in the `variables` column:

```sql
CREATE TABLE template_sections (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_id UNIQUEIDENTIFIER NOT NULL,
  section_type NVARCHAR(50) NOT NULL,
  content NVARCHAR(MAX) NOT NULL,
  
  -- Enhanced JSON structure for nested lists with formatting
  variables NVARCHAR(MAX), -- JSON object
  
  -- Section-level custom styles
  styles NVARCHAR(MAX), -- JSON object
  
  -- NEW: Controls whether label can be edited at runtime
  is_label_editable BIT DEFAULT 1,
  
  order_index INT NOT NULL,
  parent_section_id UNIQUEIDENTIFIER,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  CONSTRAINT fk_template_sections_template 
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_sections_parent 
    FOREIGN KEY (parent_section_id) REFERENCES template_sections(id)
);
```

## Enhanced Variables JSON Structure

### Labeled-Content with Nested Lists

The `variables` column now supports rich, nested list structures:

```json
{
  "label": "Incident Report <th:utext=\"${incidentNumber}\">",
  "contentType": "list",
  "listStyle": "disc",
  "items": [
    {
      "text": "Main Item 1",
      "bold": true,
      "color": "#FF0000",
      "fontSize": "16px",
      "backgroundColor": "#FFFF00",
      "children": [
        {
          "text": "Sub-item 1.1",
          "italic": true,
          "underline": false,
          "children": [
            {
              "text": "Sub-sub-item 1.1.1",
              "underline": true,
              "color": "#0000FF",
              "children": []
            }
          ]
        },
        {
          "text": "Sub-item 1.2",
          "bold": true,
          "children": []
        }
      ]
    },
    {
      "text": "Main Item 2",
      "fontSize": "18px",
      "children": []
    }
  ]
}
```

### ListItemStyle Properties

Each item in the `items` array can have the following properties:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `text` | string | The text content of the list item | "Main Item 1" |
| `bold` | boolean | Bold formatting | true |
| `italic` | boolean | Italic formatting | true |
| `underline` | boolean | Underline formatting | true |
| `color` | string | Text color (hex format) | "#FF0000" |
| `backgroundColor` | string | Background color (hex format) | "#FFFF00" |
| `fontSize` | string | Font size (CSS format) | "16px" |
| `children` | array | Nested child items (max 3 levels) | [...] |

### List Style Options

The `listStyle` property supports the following values:

**Bullet Lists:**
- `circle` - Circle bullets (○)
- `disc` - Disc bullets (•)
- `square` - Square bullets (■)

**Numbered Lists:**
- `decimal` - Numbers (1, 2, 3)
- `lower-roman` - Roman numerals (i, ii, iii)
- `upper-roman` - Roman numerals (I, II, III)
- `lower-alpha` - Letters (a, b, c)
- `upper-alpha` - Letters (A, B, C)

## Migration Script

Add this migration after the existing migrations:

```sql
-- Migration: 007_add_label_editable.sql
-- Description: Add is_label_editable column to template_sections

-- Add new column
ALTER TABLE template_sections 
ADD is_label_editable BIT DEFAULT 1;

-- Update existing rows to have the default value
UPDATE template_sections 
SET is_label_editable = 1 
WHERE is_label_editable IS NULL;

GO
```

## Section Variables Seed Data Update

Updated seed data for labeled-content section:

```sql
-- Update labeled-content variables to support nested lists
DELETE FROM section_variables WHERE section_type = 'labeled-content';

INSERT INTO section_variables (section_type, variable_name, variable_label, variable_type, default_value)
VALUES
  ('labeled-content', 'label', 'Label/Heading', 'text', 'Incident Report'),
  ('labeled-content', 'contentType', 'Content Type', 'text', 'text'),
  ('labeled-content', 'content', 'Text Content', 'text', 'Messages journaled'),
  ('labeled-content', 'listStyle', 'List Style', 'text', 'disc'),
  ('labeled-content', 'items', 'List Items', 'list', 
   '[{"text":"Item 1","children":[]},{"text":"Item 2","children":[]}]');
```

## Example Queries

### Insert a Section with Nested List

```sql
INSERT INTO template_sections (
  template_id,
  section_type,
  content,
  variables,
  is_label_editable,
  order_index
)
VALUES (
  '12345678-1234-1234-1234-123456789012',
  'labeled-content',
  '<div><strong><th:utext="${label}"></strong><ul class="list-disc"><li><th:each="item : ${items}"><th:utext="${item.text}"></li></ul></div>',
  '{
    "label": "Key Findings",
    "contentType": "list",
    "listStyle": "disc",
    "items": [
      {
        "text": "Finding 1",
        "bold": true,
        "color": "#FF0000",
        "children": [
          {
            "text": "Detail 1.1",
            "italic": true,
            "children": []
          }
        ]
      }
    ]
  }',
  1,
  0
);
```

### Query Sections with Specific List Styles

```sql
-- Find all sections with bullet lists
SELECT * 
FROM template_sections 
WHERE JSON_VALUE(variables, '$.listStyle') IN ('circle', 'disc', 'square');

-- Find sections with nested items (items that have children)
SELECT * 
FROM template_sections 
WHERE JSON_VALUE(variables, '$.items[0].children') IS NOT NULL;
```

## Frontend-Backend Data Flow

### 1. Creating a Template Section (Frontend → Backend)

**Frontend Request:**
```typescript
POST /api/v1/template-sections
{
  "templateId": "uuid",
  "sectionType": "labeled-content",
  "content": "<div>...</div>",
  "variables": {
    "label": "Incident Details",
    "contentType": "list",
    "listStyle": "disc",
    "items": [
      {
        "text": "Item 1",
        "bold": true,
        "children": [...]
      }
    ]
  },
  "isLabelEditable": true,
  "orderIndex": 0
}
```

**Backend Processing:**
```java
@PostMapping
public ResponseEntity<TemplateSectionResponseDTO> createSection(
    @Valid @RequestBody TemplateSectionRequestDTO requestDTO) {
    
    // The variables JsonNode automatically handles nested structure
    TemplateSection section = new TemplateSection();
    section.setVariables(requestDTO.getVariables());
    
    // Save to database - JSON serialization is automatic
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(sectionService.createSection(requestDTO));
}
```

### 2. Retrieving Section Data (Backend → Frontend)

**Backend Response:**
```json
{
  "id": "uuid",
  "templateId": "uuid",
  "sectionType": "labeled-content",
  "content": "<div>...</div>",
  "variables": {
    "items": [
      {
        "text": "Item 1",
        "bold": true,
        "color": "#FF0000",
        "children": [
          {
            "text": "Sub-item 1.1",
            "italic": true,
            "children": []
          }
        ]
      }
    ]
  },
  "isLabelEditable": true
}
```

**Frontend Processing:**
```typescript
// TypeScript interface
interface ListItemStyle {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: string;
  children: ListItemStyle[];
}

// Recursive rendering
const renderListItem = (item: ListItemStyle, level: number) => {
  const style = {
    fontWeight: item.bold ? 'bold' : 'normal',
    fontStyle: item.italic ? 'italic' : 'normal',
    textDecoration: item.underline ? 'underline' : 'none',
    color: item.color || 'inherit',
    backgroundColor: item.backgroundColor || 'transparent',
    fontSize: item.fontSize || 'inherit'
  };
  
  return (
    <li style={style}>
      {item.text}
      {item.children?.length > 0 && (
        <ul>
          {item.children.map((child, i) => 
            renderListItem(child, level + 1)
          )}
        </ul>
      )}
    </li>
  );
};
```

## Performance Considerations

### Indexing JSON Columns

For better query performance on JSON columns in SQL Server:

```sql
-- Create computed columns for frequently queried JSON properties
ALTER TABLE template_sections 
ADD label_text AS JSON_VALUE(variables, '$.label');

ALTER TABLE template_sections 
ADD content_type AS JSON_VALUE(variables, '$.contentType');

-- Create indexes on computed columns
CREATE INDEX idx_template_sections_label 
ON template_sections(label_text);

CREATE INDEX idx_template_sections_content_type 
ON template_sections(content_type);
```

### Query Optimization

```sql
-- Efficient query using computed columns
SELECT * 
FROM template_sections 
WHERE content_type = 'list'
  AND template_id = @templateId;

-- Use WITH (NOLOCK) for read-heavy scenarios
SELECT * 
FROM template_sections WITH (NOLOCK)
WHERE template_id = @templateId
ORDER BY order_index;
```

## Validation Rules

### Backend Validation

Implement these validation rules in your Spring Boot service:

```java
public void validateListItems(JsonNode items, int currentLevel) {
    if (currentLevel > 3) {
        throw new ValidationException("List nesting cannot exceed 3 levels");
    }
    
    if (items != null && items.isArray()) {
        for (JsonNode item : items) {
            // Validate text is not empty
            if (item.has("text") && item.get("text").asText().trim().isEmpty()) {
                throw new ValidationException("List item text cannot be empty");
            }
            
            // Validate color format
            if (item.has("color")) {
                String color = item.get("color").asText();
                if (!color.matches("^#[0-9A-Fa-f]{6}$")) {
                    throw new ValidationException("Invalid color format: " + color);
                }
            }
            
            // Recursively validate children
            if (item.has("children")) {
                validateListItems(item.get("children"), currentLevel + 1);
            }
        }
    }
}
```

## Security Considerations

### SQL Injection Prevention

Always use parameterized queries when working with JSON data:

```java
// CORRECT: Using parameterized queries
String sql = "SELECT * FROM template_sections WHERE id = ?";
jdbcTemplate.queryForObject(sql, new Object[]{sectionId}, ...);

// WRONG: String concatenation (SQL injection risk)
String sql = "SELECT * FROM template_sections WHERE id = '" + sectionId + "'";
```

### XSS Prevention

Sanitize user input before storing:

```java
public String sanitizeHtml(String content) {
    return Jsoup.clean(content, Safelist.relaxed()
        .addTags("th:utext", "th:if", "th:each")
        .addAttributes(":all", "th:utext", "th:if", "th:each"));
}
```

## Testing Recommendations

### Unit Tests

```java
@Test
public void testCreateSectionWithNestedLists() {
    // Given
    TemplateSectionRequestDTO request = new TemplateSectionRequestDTO();
    request.setTemplateId(templateId);
    request.setSectionType("labeled-content");
    
    ObjectMapper mapper = new ObjectMapper();
    ObjectNode variables = mapper.createObjectNode();
    ArrayNode items = mapper.createArrayNode();
    
    ObjectNode item1 = mapper.createObjectNode();
    item1.put("text", "Item 1");
    item1.put("bold", true);
    item1.set("children", mapper.createArrayNode());
    items.add(item1);
    
    variables.set("items", items);
    request.setVariables(variables);
    
    // When
    TemplateSectionResponseDTO response = sectionService.createSection(request);
    
    // Then
    assertNotNull(response.getId());
    assertEquals("labeled-content", response.getSectionType());
    assertTrue(response.getVariables().has("items"));
}
```

### Integration Tests

```java
@Test
@Transactional
public void testNestedListPersistence() {
    // Create section with 3-level nested list
    TemplateSection section = createSectionWithNestedLists(3);
    
    // Save to database
    TemplateSection saved = sectionRepository.save(section);
    entityManager.flush();
    entityManager.clear();
    
    // Retrieve from database
    TemplateSection retrieved = sectionRepository.findById(saved.getId()).orElseThrow();
    
    // Verify nested structure is preserved
    JsonNode items = retrieved.getVariables().get("items");
    assertTrue(items.get(0).has("children"));
    assertTrue(items.get(0).get("children").get(0).has("children"));
}
```
