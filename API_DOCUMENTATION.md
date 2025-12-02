# Template Builder API Documentation

## Overview

RESTful API for managing templates, sections, and runs with support for nested multi-level lists and rich text formatting.

Base URL: `http://localhost:8080/api/v1`

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Template Sections API

### Get All Sections for Template

Retrieves all top-level sections for a template, including nested children.

**Endpoint:** `GET /template-sections/template/{templateId}`

**Parameters:**
- `templateId` (path, required): UUID of the template

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "templateId": "uuid",
    "sectionType": "labeled-content",
    "content": "<div><strong><th:utext=\"${label}\"></strong></div>",
    "variables": {
      "label": "Incident Report",
      "contentType": "list",
      "listStyle": "disc",
      "items": [
        {
          "text": "Main Item 1",
          "bold": true,
          "color": "#FF0000",
          "fontSize": "16px",
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
    "styles": {
      "fontSize": "14px",
      "color": "#000000"
    },
    "isLabelEditable": true,
    "orderIndex": 0,
    "parentSectionId": null,
    "childSections": [],
    "createdAt": "2025-12-02T10:30:00"
  }
]
```

### Get Section by ID

Retrieves a specific section with all its nested children.

**Endpoint:** `GET /template-sections/{sectionId}`

**Parameters:**
- `sectionId` (path, required): UUID of the section

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "templateId": "uuid",
  "sectionType": "labeled-content",
  "content": "...",
  "variables": {...},
  "styles": {...},
  "isLabelEditable": true,
  "orderIndex": 0,
  "parentSectionId": null,
  "childSections": [...],
  "createdAt": "2025-12-02T10:30:00"
}
```

**Error Responses:**
- `404 Not Found`: Section not found

### Create Section

Creates a new template section with variables and styling.

**Endpoint:** `POST /template-sections`

**Request Body:**
```json
{
  "templateId": "uuid",
  "sectionType": "labeled-content",
  "content": "<div><strong><th:utext=\"${label}\"></strong><ul><li th:each=\"item : ${items}\"><th:utext=\"${item.text}\"></li></ul></div>",
  "variables": {
    "label": "Key Findings",
    "contentType": "list",
    "listStyle": "decimal",
    "items": [
      {
        "text": "Finding 1",
        "bold": true,
        "color": "#FF0000",
        "children": [
          {
            "text": "Detail 1.1",
            "italic": true,
            "fontSize": "14px",
            "children": []
          }
        ]
      },
      {
        "text": "Finding 2",
        "underline": true,
        "backgroundColor": "#FFFF00",
        "children": []
      }
    ]
  },
  "styles": {
    "fontSize": "16px",
    "textAlign": "left"
  },
  "isLabelEditable": true,
  "orderIndex": 0,
  "parentSectionId": null
}
```

**Response:** `201 Created`
```json
{
  "id": "generated-uuid",
  "templateId": "uuid",
  ...
}
```

**Validation Rules:**
- `templateId`: Required, must exist
- `sectionType`: Required, max 50 characters
- `content`: Required, must contain valid Thymeleaf syntax
- `orderIndex`: Required, non-negative integer
- List nesting: Maximum 3 levels
- Color format: Must be valid hex color (#RRGGBB)

**Error Responses:**
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Template or parent section not found

### Update Section

Updates an existing template section.

**Endpoint:** `PUT /template-sections/{sectionId}`

**Parameters:**
- `sectionId` (path, required): UUID of the section to update

**Request Body:** Same as Create Section

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "templateId": "uuid",
  ...
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Section not found

### Delete Section

Deletes a section and all its nested children (cascade delete).

**Endpoint:** `DELETE /template-sections/{sectionId}`

**Parameters:**
- `sectionId` (path, required): UUID of the section to delete

**Response:** `204 No Content`

**Error Responses:**
- `404 Not Found`: Section not found

### Reorder Sections

Updates the order of sections within a template.

**Endpoint:** `PUT /template-sections/template/{templateId}/reorder`

**Parameters:**
- `templateId` (path, required): UUID of the template

**Request Body:**
```json
[
  "section-uuid-1",
  "section-uuid-2",
  "section-uuid-3"
]
```

**Response:** `200 OK`

**Error Responses:**
- `404 Not Found`: Template or section not found

## Nested List Examples

### Simple Bullet List

```json
{
  "contentType": "list",
  "listStyle": "disc",
  "items": [
    {"text": "Item 1", "children": []},
    {"text": "Item 2", "children": []},
    {"text": "Item 3", "children": []}
  ]
}
```

### Numbered List with Formatting

```json
{
  "contentType": "list",
  "listStyle": "decimal",
  "items": [
    {
      "text": "First main point",
      "bold": true,
      "color": "#FF0000",
      "fontSize": "18px",
      "children": []
    },
    {
      "text": "Second main point",
      "italic": true,
      "underline": true,
      "children": []
    }
  ]
}
```

### Three-Level Nested List

```json
{
  "contentType": "list",
  "listStyle": "circle",
  "items": [
    {
      "text": "Level 1 - Item 1",
      "bold": true,
      "children": [
        {
          "text": "Level 2 - Sub-item 1.1",
          "italic": true,
          "children": [
            {
              "text": "Level 3 - Sub-sub-item 1.1.1",
              "underline": true,
              "color": "#0000FF",
              "children": []
            },
            {
              "text": "Level 3 - Sub-sub-item 1.1.2",
              "fontSize": "12px",
              "children": []
            }
          ]
        },
        {
          "text": "Level 2 - Sub-item 1.2",
          "backgroundColor": "#FFFF00",
          "children": []
        }
      ]
    },
    {
      "text": "Level 1 - Item 2",
      "color": "#00FF00",
      "children": []
    }
  ]
}
```

### Mixed Formatting in List

```json
{
  "contentType": "list",
  "listStyle": "lower-alpha",
  "items": [
    {
      "text": "Important point",
      "bold": true,
      "color": "#FF0000",
      "backgroundColor": "#FFFF00",
      "fontSize": "20px",
      "children": [
        {
          "text": "Supporting detail",
          "italic": true,
          "underline": true,
          "color": "#0000FF",
          "fontSize": "16px",
          "children": []
        }
      ]
    }
  ]
}
```

## List Style Reference

### Bullet Styles

| Style | CSS Value | Visual |
|-------|-----------|--------|
| `circle` | `list-style-type: circle` | ○ |
| `disc` | `list-style-type: disc` | • |
| `square` | `list-style-type: square` | ■ |

### Numbered Styles

| Style | CSS Value | Visual |
|-------|-----------|--------|
| `decimal` | `list-style-type: decimal` | 1, 2, 3 |
| `lower-roman` | `list-style-type: lower-roman` | i, ii, iii |
| `upper-roman` | `list-style-type: upper-roman` | I, II, III |
| `lower-alpha` | `list-style-type: lower-alpha` | a, b, c |
| `upper-alpha` | `list-style-type: upper-alpha` | A, B, C |

## Error Response Format

All error responses follow this structure:

```json
{
  "timestamp": "2025-12-02T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed: List nesting cannot exceed 3 levels",
  "path": "/api/v1/template-sections"
}
```

## Rate Limiting

- Rate limit: 100 requests per minute per user
- Header: `X-RateLimit-Remaining`
- When exceeded: `429 Too Many Requests`

## Swagger UI

Interactive API documentation available at:
`http://localhost:8080/swagger-ui.html`

## WebSocket Support (Future)

Real-time updates for collaborative editing:

**Endpoint:** `ws://localhost:8080/ws/templates/{templateId}`

**Messages:**
- `section.created`: New section added
- `section.updated`: Section modified
- `section.deleted`: Section removed
- `section.reordered`: Section order changed

## Bulk Operations

### Bulk Create Sections

**Endpoint:** `POST /template-sections/bulk`

**Request Body:**
```json
{
  "templateId": "uuid",
  "sections": [
    {
      "sectionType": "heading1",
      "content": "<h1>Title</h1>",
      "orderIndex": 0
    },
    {
      "sectionType": "labeled-content",
      "content": "...",
      "variables": {...},
      "orderIndex": 1
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "created": 2,
  "sections": [...]
}
```

### Bulk Delete Sections

**Endpoint:** `DELETE /template-sections/bulk`

**Request Body:**
```json
{
  "sectionIds": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
}
```

**Response:** `200 OK`
```json
{
  "deleted": 3
}
```

## Filtering and Search

### Search Sections

**Endpoint:** `GET /template-sections/search`

**Query Parameters:**
- `templateId` (required): UUID of the template
- `sectionType` (optional): Filter by section type
- `searchTerm` (optional): Search in content and variables
- `hasNesting` (optional): Filter sections with/without nested children

**Example:**
```
GET /template-sections/search?templateId=uuid&sectionType=labeled-content&hasNesting=true
```

**Response:** `200 OK`
```json
{
  "total": 15,
  "results": [...]
}
```

## Export and Import

### Export Template with Sections

**Endpoint:** `GET /templates/{templateId}/export`

**Response:** `200 OK`
```json
{
  "template": {...},
  "sections": [...],
  "format": "json",
  "version": "1.0"
}
```

### Import Template

**Endpoint:** `POST /templates/import`

**Request Body:** Same as export response

**Response:** `201 Created`
```json
{
  "templateId": "new-uuid",
  "sectionsCreated": 10
}
```

## Validation Endpoints

### Validate Section Structure

**Endpoint:** `POST /template-sections/validate`

**Request Body:**
```json
{
  "sectionType": "labeled-content",
  "variables": {...}
}
```

**Response:** `200 OK`
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    "List nesting depth is 3, which is the maximum allowed"
  ]
}
```

## Testing with cURL

### Create a section with nested list

```bash
curl -X POST http://localhost:8080/api/v1/template-sections \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "your-template-id",
    "sectionType": "labeled-content",
    "content": "<div>...</div>",
    "variables": {
      "label": "Test List",
      "contentType": "list",
      "listStyle": "disc",
      "items": [
        {
          "text": "Item 1",
          "bold": true,
          "children": []
        }
      ]
    },
    "orderIndex": 0
  }'
```

### Get all sections

```bash
curl -X GET http://localhost:8080/api/v1/template-sections/template/{templateId} \
  -H "Authorization: Bearer your-token"
```

### Update a section

```bash
curl -X PUT http://localhost:8080/api/v1/template-sections/{sectionId} \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "your-template-id",
    "sectionType": "labeled-content",
    "content": "<div>Updated...</div>",
    "variables": {...},
    "orderIndex": 0
  }'
```

### Delete a section

```bash
curl -X DELETE http://localhost:8080/api/v1/template-sections/{sectionId} \
  -H "Authorization: Bearer your-token"
```

## Performance Tips

1. **Use pagination** for large result sets
2. **Cache frequently accessed sections** on the client side
3. **Batch operations** when creating multiple sections
4. **Use WebSocket** for real-time collaborative editing
5. **Minimize JSON payload** by excluding empty children arrays
6. **Index JSON columns** for better query performance
7. **Use database connection pooling** (HikariCP recommended)

## Security Best Practices

1. **Always validate** user input on the server side
2. **Sanitize HTML** content before storing
3. **Use parameterized queries** to prevent SQL injection
4. **Implement rate limiting** to prevent abuse
5. **Validate color codes** to prevent XSS attacks
6. **Limit nesting depth** to prevent DoS attacks
7. **Use HTTPS** in production
8. **Implement CORS** properly
9. **Log all modifications** for audit trail
10. **Validate JWT tokens** on every request
