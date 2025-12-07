# Database Schema Updates for Nested Lists with Rich Formatting

## Overview

This document describes the database schema updates to support nested/multi-level lists (up to 3 levels) with rich text formatting in labeled-content sections. **Uses MS SQL Server syntax.**

## Schema Changes

### Updated template_sections Table

The `template_sections` table includes the following key columns for nested lists and rich formatting:

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
  
  -- Controls whether label can be edited at runtime
  is_label_editable BIT DEFAULT 1,
  
  -- Position in template (0, 1, 2, ...)
  order_index INT NOT NULL,
  
  -- Parent section ID for nested sections (NULL for top-level)
  parent_section_id UNIQUEIDENTIFIER,
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  CONSTRAINT fk_template_sections_template 
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_sections_parent 
    FOREIGN KEY (parent_section_id) REFERENCES template_sections(id)
);

-- Indexes for performance
CREATE INDEX idx_template_sections_template_id ON template_sections(template_id);
CREATE INDEX idx_template_sections_order ON template_sections(template_id, order_index);
CREATE INDEX idx_template_sections_parent ON template_sections(parent_section_id);
```

## Enhanced Variables JSON Structure

### Labeled-Content with Nested Lists

The `variables` column supports rich, nested list structures:

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

## Migration Scripts

### Migration: Add subject Column to Templates

```sql
-- Migration: 009_add_template_subject.sql
-- Description: Add subject column to templates for email subject line with Thymeleaf placeholders
-- 
-- IMPORTANT: Subject is stored in Thymeleaf format, NOT placeholder format
-- - User enters: "Report for {{clientName}}"
-- - Stored as: "Report for <th:utext="${clientName}">"
--
-- This ensures consistent Thymeleaf syntax across the template (body and subject)
-- The frontend handles conversion between formats for user display

-- Add subject column
ALTER TABLE templates 
ADD subject NVARCHAR(500);

GO
```

### Subject Field Details

The `subject` column stores email subject lines with dynamic placeholders using Thymeleaf syntax:

| Aspect | Details |
|--------|---------|
| **Storage Format** | `<th:utext="${variableName}">` |
| **Display Format** | `{{variableName}}` (frontend converts for UI) |
| **Max Length** | 500 characters |
| **Nullable** | Yes (subject is optional) |
| **Variables Source** | Extracted and stored in `template_variables` table with `source='subject'` |
| **Required Flag** | Subject variables are always marked as `is_required=1` |

**Example Storage:**
```
-- User enters in UI:
"Incident {{incidentNumber}} - {{severity}} Alert for {{clientName}}"

-- Stored in database:
"Incident <th:utext="${incidentNumber}"> - <th:utext="${severity}"> Alert for <th:utext="${clientName}">"
```

### Migration: Add is_label_editable Column

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

### Migration: Add order_index and parent_section_id

```sql
-- Migration: 008_add_section_ordering.sql
-- Description: Add order_index and parent_section_id for nested sections

-- Add order_index column (required)
ALTER TABLE template_sections 
ADD order_index INT NOT NULL DEFAULT 0;

-- Add parent_section_id for self-referencing (nested sections)
ALTER TABLE template_sections 
ADD parent_section_id UNIQUEIDENTIFIER;

-- Add foreign key constraint
ALTER TABLE template_sections 
ADD CONSTRAINT fk_template_sections_parent 
  FOREIGN KEY (parent_section_id) REFERENCES template_sections(id);

-- Create indexes
CREATE INDEX idx_template_sections_order 
ON template_sections(template_id, order_index);

CREATE INDEX idx_template_sections_parent 
ON template_sections(parent_section_id);

GO
```

## Section Variables Seed Data Update

Updated seed data for labeled-content section:

```sql
-- Update labeled-content variables to support nested lists
DELETE FROM section_variables WHERE section_type = 'labeled-content';

INSERT INTO section_variables (section_type, variable_name, variable_label, variable_type, default_value)
VALUES
  ('labeled-content', 'label', 'Label/Heading', 'text', '"Incident Report"'),
  ('labeled-content', 'contentType', 'Content Type', 'text', '"text"'),
  ('labeled-content', 'content', 'Text Content', 'text', '"Messages journaled"'),
  ('labeled-content', 'listStyle', 'List Style', 'text', '"disc"'),
  ('labeled-content', 'items', 'List Items', 'list', 
   '[{"text":"Item 1","children":[]},{"text":"Item 2","children":[]}]');
```

## Example Queries

### Insert a Section with Nested List

```sql
DECLARE @templateId UNIQUEIDENTIFIER = '12345678-1234-1234-1234-123456789012';

INSERT INTO template_sections (
  template_id,
  section_type,
  content,
  variables,
  styles,
  is_label_editable,
  order_index,
  parent_section_id
)
VALUES (
  @templateId,
  'labeled-content',
  '<div><strong><th:utext="${label}"></strong><ul class="list-disc"><li th:each="item : ${items}"><th:utext="${item.text}"></li></ul></div>',
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
  '{"fontSize": "14px"}',
  1,
  0,
  NULL
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
WHERE JSON_VALUE(variables, '$.items[0].children') IS NOT NULL
  AND LEN(JSON_VALUE(variables, '$.items[0].children')) > 2;

-- Get all sections ordered by template and position
SELECT * 
FROM template_sections 
WHERE template_id = @templateId
ORDER BY order_index;
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
  "styles": {},
  "isLabelEditable": true,
  "orderIndex": 0,
  "parentSectionId": null
}
```

**Backend Processing (Spring Boot):**
```java
@PostMapping
public ResponseEntity<TemplateSectionResponseDTO> createSection(
    @Valid @RequestBody TemplateSectionRequestDTO requestDTO) {
    
    // The variables JsonNode automatically handles nested structure
    TemplateSection section = new TemplateSection();
    section.setTemplateId(requestDTO.getTemplateId());
    section.setSectionType(requestDTO.getSectionType());
    section.setContent(requestDTO.getContent());
    section.setVariables(requestDTO.getVariables());
    section.setStyles(requestDTO.getStyles());
    section.setIsLabelEditable(requestDTO.getIsLabelEditable());
    section.setOrderIndex(requestDTO.getOrderIndex());
    section.setParentSectionId(requestDTO.getParentSectionId());
    
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
    "label": "Incident Details",
    "contentType": "list",
    "listStyle": "disc",
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
  "styles": {},
  "isLabelEditable": true,
  "orderIndex": 0,
  "parentSectionId": null,
  "createdAt": "2025-12-02T10:30:00"
}
```

**Frontend Processing (TypeScript/React):**
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

interface SectionVariables {
  label?: string;
  contentType?: 'text' | 'list' | 'table';
  listStyle?: string;
  items?: ListItemStyle[];
  content?: string;
}

// Recursive rendering component
const renderListItem = (item: ListItemStyle, level: number): JSX.Element => {
  const style: React.CSSProperties = {
    fontWeight: item.bold ? 'bold' : 'normal',
    fontStyle: item.italic ? 'italic' : 'normal',
    textDecoration: item.underline ? 'underline' : 'none',
    color: item.color || 'inherit',
    backgroundColor: item.backgroundColor || 'transparent',
    fontSize: item.fontSize || 'inherit'
  };
  
  return (
    <li key={item.text} style={style}>
      {item.text}
      {item.children?.length > 0 && (
        <ul style={{ marginLeft: '20px' }}>
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

For better query performance on JSON columns in MS SQL Server:

```sql
-- Create computed columns for frequently queried JSON properties
ALTER TABLE template_sections 
ADD label_text AS JSON_VALUE(variables, '$.label');

ALTER TABLE template_sections 
ADD content_type AS JSON_VALUE(variables, '$.contentType');

ALTER TABLE template_sections 
ADD list_style AS JSON_VALUE(variables, '$.listStyle');

-- Create indexes on computed columns
CREATE INDEX idx_template_sections_label 
ON template_sections(label_text);

CREATE INDEX idx_template_sections_content_type 
ON template_sections(content_type);

CREATE INDEX idx_template_sections_list_style 
ON template_sections(list_style);
```

### Query Optimization

```sql
-- Efficient query using computed columns
SELECT * 
FROM template_sections 
WHERE content_type = 'list'
  AND list_style = 'disc'
  AND template_id = @templateId
ORDER BY order_index;

-- Use WITH (NOLOCK) for read-heavy scenarios
SELECT * 
FROM template_sections WITH (NOLOCK)
WHERE template_id = @templateId
ORDER BY order_index;

-- Query with parent hierarchy (recursive CTE)
WITH SectionHierarchy AS (
  -- Anchor: top-level sections
  SELECT id, template_id, section_type, content, variables, 
         order_index, parent_section_id, 0 AS level
  FROM template_sections
  WHERE template_id = @templateId AND parent_section_id IS NULL
  
  UNION ALL
  
  -- Recursive: child sections
  SELECT ts.id, ts.template_id, ts.section_type, ts.content, ts.variables,
         ts.order_index, ts.parent_section_id, sh.level + 1
  FROM template_sections ts
  INNER JOIN SectionHierarchy sh ON ts.parent_section_id = sh.id
)
SELECT * FROM SectionHierarchy
ORDER BY level, order_index;
```

## Validation Rules

### Backend Validation (Spring Boot)

Implement these validation rules in your Spring Boot service:

```java
@Service
public class TemplateSectionValidator {

    private static final int MAX_NESTING_LEVEL = 3;
    private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    public void validateListItems(JsonNode items, int currentLevel) {
        if (currentLevel > MAX_NESTING_LEVEL) {
            throw new ValidationException("List nesting cannot exceed " + MAX_NESTING_LEVEL + " levels");
        }
        
        if (items != null && items.isArray()) {
            for (JsonNode item : items) {
                // Validate text is not empty
                if (item.has("text")) {
                    String text = item.get("text").asText();
                    if (text == null || text.trim().isEmpty()) {
                        throw new ValidationException("List item text cannot be empty");
                    }
                }
                
                // Validate color format
                validateColorField(item, "color");
                validateColorField(item, "backgroundColor");
                
                // Recursively validate children
                if (item.has("children") && !item.get("children").isNull()) {
                    validateListItems(item.get("children"), currentLevel + 1);
                }
            }
        }
    }
    
    private void validateColorField(JsonNode item, String fieldName) {
        if (item.has(fieldName) && !item.get(fieldName).isNull()) {
            String color = item.get(fieldName).asText();
            if (!HEX_COLOR_PATTERN.matcher(color).matches()) {
                throw new ValidationException("Invalid " + fieldName + " format: " + color + 
                    ". Expected hex format: #RRGGBB");
            }
        }
    }
    
    public void validateOrderIndex(Integer orderIndex) {
        if (orderIndex == null || orderIndex < 0) {
            throw new ValidationException("Order index must be a non-negative integer");
        }
    }
    
    public void validateSectionType(String sectionType) {
        if (sectionType == null || sectionType.trim().isEmpty()) {
            throw new ValidationException("Section type is required");
        }
        if (sectionType.length() > 50) {
            throw new ValidationException("Section type must not exceed 50 characters");
        }
    }
}
```

## Security Considerations

### SQL Injection Prevention

Always use parameterized queries when working with JSON data:

```java
// CORRECT: Using JPA/Hibernate with named parameters
@Query("SELECT ts FROM TemplateSection ts WHERE ts.templateId = :templateId ORDER BY ts.orderIndex")
List<TemplateSection> findByTemplateIdOrdered(@Param("templateId") UUID templateId);

// CORRECT: Using JdbcTemplate with parameterized queries
String sql = "SELECT * FROM template_sections WHERE id = ?";
jdbcTemplate.queryForObject(sql, new Object[]{sectionId}, rowMapper);

// WRONG: String concatenation (SQL injection risk)
String sql = "SELECT * FROM template_sections WHERE id = '" + sectionId + "'";
```

### XSS Prevention

Sanitize user input before storing:

```java
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

@Service
public class ContentSanitizer {

    private static final Safelist ALLOWED_TAGS = Safelist.relaxed()
        .addTags("th:utext", "th:if", "th:each", "th:block")
        .addAttributes(":all", "th:utext", "th:if", "th:each", "style", "class");

    public String sanitizeHtml(String content) {
        if (content == null) {
            return null;
        }
        return Jsoup.clean(content, ALLOWED_TAGS);
    }
    
    public String sanitizeText(String text) {
        if (text == null) {
            return null;
        }
        // Escape HTML entities
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;");
    }
}
```

## Testing Recommendations

### Unit Tests

```java
@ExtendWith(MockitoExtension.class)
class TemplateSectionServiceTest {

    @Mock
    private TemplateSectionRepository repository;
    
    @InjectMocks
    private TemplateSectionService service;

    @Test
    void testCreateSectionWithNestedLists() {
        // Given
        TemplateSectionRequestDTO request = new TemplateSectionRequestDTO();
        request.setTemplateId(UUID.randomUUID());
        request.setSectionType("labeled-content");
        request.setOrderIndex(0);
        request.setIsLabelEditable(true);
        
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode variables = mapper.createObjectNode();
        variables.put("label", "Test Label");
        variables.put("contentType", "list");
        variables.put("listStyle", "disc");
        
        ArrayNode items = mapper.createArrayNode();
        ObjectNode item1 = mapper.createObjectNode();
        item1.put("text", "Item 1");
        item1.put("bold", true);
        item1.set("children", mapper.createArrayNode());
        items.add(item1);
        
        variables.set("items", items);
        request.setVariables(variables);
        
        // When
        when(repository.save(any())).thenAnswer(i -> {
            TemplateSection saved = i.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });
        
        TemplateSectionResponseDTO response = service.createSection(request);
        
        // Then
        assertNotNull(response.getId());
        assertEquals("labeled-content", response.getSectionType());
        assertEquals(0, response.getOrderIndex());
        assertTrue(response.getIsLabelEditable());
        assertTrue(response.getVariables().has("items"));
    }
    
    @Test
    void testValidateNestingLevelExceeded() {
        // Given - 4 levels of nesting (exceeds max of 3)
        ObjectMapper mapper = new ObjectMapper();
        ArrayNode level4 = mapper.createArrayNode();
        level4.add(mapper.createObjectNode().put("text", "Level 4"));
        
        ObjectNode level3Item = mapper.createObjectNode();
        level3Item.put("text", "Level 3");
        level3Item.set("children", level4);
        
        ArrayNode level3 = mapper.createArrayNode();
        level3.add(level3Item);
        
        // Continue building nested structure...
        
        // When/Then
        assertThrows(ValidationException.class, () -> 
            validator.validateListItems(level3, 3)
        );
    }
}
```

### Integration Tests

```java
@SpringBootTest
@Transactional
class TemplateSectionIntegrationTest {

    @Autowired
    private TemplateSectionRepository sectionRepository;
    
    @Autowired
    private TemplateRepository templateRepository;
    
    @Autowired
    private EntityManager entityManager;

    @Test
    void testNestedListPersistence() {
        // Create template
        Template template = new Template();
        template.setName("Test Template");
        template.setHtml("<div>Test</div>");
        template = templateRepository.save(template);
        
        // Create section with 3-level nested list
        TemplateSection section = createSectionWithNestedLists(template.getId(), 3);
        
        // Save to database
        TemplateSection saved = sectionRepository.save(section);
        entityManager.flush();
        entityManager.clear();
        
        // Retrieve from database
        TemplateSection retrieved = sectionRepository.findById(saved.getId()).orElseThrow();
        
        // Verify nested structure is preserved
        JsonNode items = retrieved.getVariables().get("items");
        assertNotNull(items);
        assertTrue(items.isArray());
        assertTrue(items.get(0).has("children"));
        assertTrue(items.get(0).get("children").get(0).has("children"));
        
        // Verify other fields
        assertEquals(0, retrieved.getOrderIndex());
        assertTrue(retrieved.getIsLabelEditable());
        assertNull(retrieved.getParentSectionId());
    }
    
    @Test
    void testSectionOrdering() {
        // Create template with multiple sections
        Template template = templateRepository.save(
            Template.builder().name("Test").html("<div>Test</div>").build()
        );
        
        // Add sections with different order indexes
        sectionRepository.save(createSection(template.getId(), "heading1", 2));
        sectionRepository.save(createSection(template.getId(), "paragraph", 0));
        sectionRepository.save(createSection(template.getId(), "labeled-content", 1));
        
        entityManager.flush();
        entityManager.clear();
        
        // Query ordered sections
        List<TemplateSection> sections = sectionRepository
            .findByTemplateIdOrderByOrderIndex(template.getId());
        
        assertEquals(3, sections.size());
        assertEquals("paragraph", sections.get(0).getSectionType());
        assertEquals("labeled-content", sections.get(1).getSectionType());
        assertEquals("heading1", sections.get(2).getSectionType());
    }
}
```
