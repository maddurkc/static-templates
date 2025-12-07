# Template Builder API Documentation

## Overview

RESTful API for managing templates, sections, and runs with support for nested multi-level lists and rich text formatting. **Backend uses MS SQL Server database.**

Base URL: `http://localhost:8080/api/v1`

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Sections API

### Get All Section Types

Retrieves all available section types from the master catalog.

**Endpoint:** `GET /sections`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "type": "heading1",
    "label": "Heading 1",
    "description": "Large heading - supports {{variable}} placeholders",
    "category": "text",
    "icon": "Heading1",
    "defaultContent": "Main Title",
    "createdAt": "2025-12-02T10:30:00",
    "updatedAt": "2025-12-02T10:30:00"
  }
]
```

### Get Section Variables

Retrieves variable definitions for a specific section type.

**Endpoint:** `GET /sections/{type}/variables`

**Parameters:**
- `type` (path, required): Section type (e.g., 'labeled-content')

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "sectionType": "labeled-content",
    "variableName": "items",
    "variableLabel": "List Items",
    "variableType": "list",
    "defaultValue": "[{\"text\":\"Item 1\",\"children\":[]}]"
  }
]
```

---

## Templates API

### Get All Templates

Retrieves all templates for the authenticated user.

**Endpoint:** `GET /templates`

**Query Parameters:**
- `page` (optional): Page number (default: 0)
- `size` (optional): Page size (default: 20)
- `sort` (optional): Sort field (default: createdAt,desc)

**Response:** `200 OK`
```json
{
  "content": [
    {
      "id": "uuid",
      "name": "Incident Report",
      "html": "<h1>...</h1>",
      "userId": "uuid",
      "createdAt": "2025-12-02T10:30:00",
      "updatedAt": "2025-12-02T10:30:00"
    }
  ],
  "totalElements": 15,
  "totalPages": 1,
  "number": 0
}
```

### Get Template by ID

**Endpoint:** `GET /templates/{templateId}`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Incident Report",
  "subject": "Incident <th:utext=\"${incidentNumber}\"> - <th:utext=\"${severity}\"> Alert",
  "html": "<h1><th:utext=\"${title}\"></th:utext></h1>...",
  "userId": "uuid",
  "createdAt": "2025-12-02T10:30:00",
  "updatedAt": "2025-12-02T10:30:00",
  "sections": [...],
  "variables": [...]
}
```

**Note:** The `subject` field is stored in Thymeleaf format (`<th:utext="${varName}">`). The frontend converts between user-friendly `{{placeholder}}` format and Thymeleaf format automatically.

### Create Template

**Endpoint:** `POST /templates`

**Request Body:**
```json
{
  "name": "Incident Report",
  "subject": "Incident <th:utext=\"${incidentNumber}\"> - <th:utext=\"${severity}\"> Alert",
  "html": "<h1><th:utext=\"${title}\"></th:utext></h1>...",
  "sections": [
    {
      "sectionType": "heading1",
      "content": "<h1><th:utext=\"${title}\"></th:utext></h1>",
      "variables": {"title": "Main Title"},
      "styles": {"fontSize": "24px"},
      "isLabelEditable": true,
      "orderIndex": 0
    }
  ],
  "variables": [
    {
      "variableName": "incidentNumber",
      "variableLabel": "Incident Number",
      "variableType": "text",
      "isRequired": true,
      "source": "subject"
    },
    {
      "variableName": "severity",
      "variableLabel": "Severity",
      "variableType": "text",
      "isRequired": true,
      "source": "subject"
    },
    {
      "variableName": "title",
      "variableLabel": "Title",
      "variableType": "text",
      "isRequired": false,
      "defaultValue": "Main Title",
      "source": "section"
    }
  ]
}
```

**Subject Field Format:**
- The `subject` field supports placeholders for dynamic email subject lines
- **Storage format:** Thymeleaf syntax: `<th:utext="${variableName}">`
- **Display format (frontend):** User-friendly syntax: `{{variableName}}`
- Subject variables are automatically extracted and included in the `variables` array with `source: "subject"` and `isRequired: true`

**Response:** `201 Created`

### Update Template

**Endpoint:** `PUT /templates/{templateId}`

**Request Body:** Same as Create Template

**Response:** `200 OK`

### Delete Template

**Endpoint:** `DELETE /templates/{templateId}`

**Response:** `204 No Content`

---

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
- `isLabelEditable`: Optional, defaults to true
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

---

## Template Variables API

### Get Variables for Template

Retrieves all variables defined for a template (centralized registry).

**Endpoint:** `GET /template-variables/template/{templateId}`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "templateId": "uuid",
    "variableName": "customerName",
    "variableLabel": "Customer Name",
    "variableType": "text",
    "defaultValue": "John Doe",
    "isRequired": true,
    "placeholder": "Enter customer name",
    "sectionId": "uuid",
    "source": "section"
  }
]
```

### Get Required Variables

Retrieves only required variables for validation.

**Endpoint:** `GET /template-variables/template/{templateId}/required`

**Response:** `200 OK` - Same structure as above, filtered to required only.

### Update Template Variable

Updates variable metadata (required flag, default value, label).

**Endpoint:** `PUT /template-variables/{variableId}`

**Request Body:**
```json
{
  "variableLabel": "Updated Label",
  "isRequired": true,
  "defaultValue": "New default",
  "placeholder": "Enter value..."
}
```

**Response:** `200 OK`

### Validate Variables

Validates that all required variables have values before template execution.

**Endpoint:** `POST /template-variables/template/{templateId}/validate`

**Request Body:**
```json
{
  "customerName": "John Doe",
  "incidentNumber": "INC-123"
}
```

**Response:** `200 OK`
```json
{
  "valid": true,
  "missingVariables": []
}
```

---

## Template Runs API

### Get Runs for Template

Retrieves execution history for a template.

**Endpoint:** `GET /template-runs/template/{templateId}`

**Query Parameters:**
- `page` (optional): Page number
- `size` (optional): Page size
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response:** `200 OK`
```json
{
  "content": [
    {
      "id": "uuid",
      "templateId": "uuid",
      "toEmails": "user@example.com,user2@example.com",
      "ccEmails": "cc@example.com",
      "bccEmails": null,
      "variables": {
        "customerName": "John Doe",
        "incidentNumber": "INC-123"
      },
      "htmlOutput": "<h1>Incident Report</h1>...",
      "runAt": "2025-12-02T10:30:00",
      "status": "sent",
      "userId": "uuid"
    }
  ],
  "totalElements": 50,
  "totalPages": 3
}
```

### Create Template Run

Executes a template with provided variables.

**Endpoint:** `POST /template-runs`

**Request Body:**
```json
{
  "templateId": "uuid",
  "toEmails": "recipient@example.com",
  "ccEmails": "cc@example.com",
  "bccEmails": "bcc@example.com",
  "variables": {
    "customerName": "John Doe",
    "incidentNumber": "INC-456",
    "priority": "High"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "templateId": "uuid",
  "htmlOutput": "<h1>Incident Report INC-456</h1>...",
  "runAt": "2025-12-02T10:30:00",
  "status": "sent"
}
```

---

## API Templates API

### Get All API Templates

Retrieves all available API templates.

**Endpoint:** `GET /api-templates`

**Query Parameters:**
- `category` (optional): Filter by category ('jira', 'github', 'servicenow', etc.)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Jira - Get Issue",
    "description": "Fetch issue details from Jira",
    "category": "jira",
    "urlTemplate": "https://{domain}.atlassian.net/rest/api/{version}/issue/{issueKey}",
    "method": "GET",
    "headers": "{\"Authorization\": \"Bearer {apiToken}\"}",
    "isCustom": false,
    "params": [...]
  }
]
```

### Get API Template Parameters

**Endpoint:** `GET /api-templates/{apiTemplateId}/params`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "apiTemplateId": "uuid",
    "paramName": "domain",
    "paramLabel": "JIRA Domain",
    "paramType": "text",
    "paramLocation": "path",
    "placeholder": "e.g., mycompany",
    "required": true,
    "description": "Your Jira subdomain"
  }
]
```

---

## Template API Configs API

### Get API Config for Template

**Endpoint:** `GET /template-api-configs/template/{templateId}`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "templateId": "uuid",
  "apiTemplateId": "uuid",
  "paramValues": {
    "domain": "mycompany",
    "version": "3",
    "apiToken": "abc123"
  },
  "isEnabled": true,
  "mappings": [...]
}
```

### Create/Update API Config

**Endpoint:** `PUT /template-api-configs/template/{templateId}`

**Request Body:**
```json
{
  "apiTemplateId": "uuid",
  "paramValues": {
    "domain": "mycompany",
    "version": "3",
    "apiToken": "abc123"
  },
  "isEnabled": true
}
```

**Response:** `200 OK`

---

## API Mappings API

### Get Mappings for Config

**Endpoint:** `GET /api-mappings/config/{apiConfigId}`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "apiConfigId": "uuid",
    "sourcePath": "$.issue.summary",
    "targetSectionId": "uuid",
    "targetVariable": "content",
    "transformation": "none",
    "defaultValue": "No summary available"
  }
]
```

### Create API Mapping

**Endpoint:** `POST /api-mappings`

**Request Body:**
```json
{
  "apiConfigId": "uuid",
  "sourcePath": "$.issue.priority.name",
  "targetSectionId": "uuid",
  "targetVariable": "priority",
  "transformation": "uppercase",
  "defaultValue": "NORMAL"
}
```

**Response:** `201 Created`

---

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

---

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

---

## Error Response Format

All error responses follow this structure:

```json
{
  "timestamp": "2025-12-02T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed: List nesting cannot exceed 3 levels",
  "path": "/api/v1/template-sections",
  "errors": [
    {
      "field": "variables.items[0].children[0].children[0].children",
      "message": "Maximum nesting level (3) exceeded"
    }
  ]
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Invalid request data or validation failed |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource or constraint violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Rate Limiting

- Rate limit: 100 requests per minute per user
- Header: `X-RateLimit-Remaining`
- Header: `X-RateLimit-Reset` (timestamp)
- When exceeded: `429 Too Many Requests`

---

## Swagger UI

Interactive API documentation available at:
`http://localhost:8080/swagger-ui.html`

OpenAPI spec available at:
`http://localhost:8080/v3/api-docs`

---

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
      "variables": {},
      "styles": {},
      "isLabelEditable": true,
      "orderIndex": 0
    },
    {
      "sectionType": "labeled-content",
      "content": "...",
      "variables": {...},
      "styles": {},
      "isLabelEditable": true,
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

---

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

---

## Export and Import

### Export Template with Sections

**Endpoint:** `GET /templates/{templateId}/export`

**Response:** `200 OK`
```json
{
  "template": {
    "name": "Incident Report",
    "html": "..."
  },
  "sections": [...],
  "variables": [...],
  "apiConfig": {...},
  "format": "json",
  "version": "1.0",
  "exportedAt": "2025-12-02T10:30:00"
}
```

### Import Template

**Endpoint:** `POST /templates/import`

**Request Body:** Same as export response

**Response:** `201 Created`
```json
{
  "templateId": "new-uuid",
  "sectionsImported": 5,
  "variablesImported": 3
}
```

---

## Validation Endpoint

### Validate Section Structure

**Endpoint:** `POST /template-sections/validate`

**Request Body:**
```json
{
  "sectionType": "labeled-content",
  "content": "...",
  "variables": {...}
}
```

**Response:** `200 OK`
```json
{
  "valid": true,
  "warnings": [],
  "errors": []
}
```

Or if invalid:
```json
{
  "valid": false,
  "warnings": ["Color #GGGGGG may not render correctly"],
  "errors": ["List nesting exceeds maximum of 3 levels"]
}
```

---

## WebSocket Support (Future)

Real-time updates for collaborative editing:

**Endpoint:** `ws://localhost:8080/ws/templates/{templateId}`

**Messages:**
- `section.created`: New section added
- `section.updated`: Section modified
- `section.deleted`: Section removed
- `section.reordered`: Section order changed

---

## Performance Tips

1. **Pagination**: Always use pagination for list endpoints
2. **Field Selection**: Use `fields` query param when available
3. **Caching**: Respect cache headers for static data (sections catalog)
4. **Batch Operations**: Use bulk endpoints for multiple operations
5. **Compression**: Enable gzip for large responses

---

## Security Best Practices

1. **Authentication**: Always include valid JWT token
2. **HTTPS**: Use HTTPS in production
3. **Input Validation**: All inputs are validated server-side
4. **Rate Limiting**: Respect rate limits to avoid blocking
5. **Sensitive Data**: Never include API tokens in URLs
