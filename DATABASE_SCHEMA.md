# Database Schema for Page Builder Application

## Overview

This database schema supports a flexible page builder system where users can create templates using reusable sections, integrate with external APIs, and execute templates with dynamic variables. **Uses MS SQL Server syntax.**

## Table Purpose Summary

| Table | Purpose | Use Case |
|-------|---------|----------|
| `sections` | Master list of available section types | Defines what building blocks users can add to templates (headings, paragraphs, tables, etc.) |
| `section_variables` | Variable definitions & instance values | Defines variables for section types (master catalog) AND stores instance-level variable values for template sections |
| `templates` | User-created templates | Stores complete templates built by users, containing the final HTML output |
| `template_sections` | Sections within templates | Links sections to templates with specific content, styles, and ordering for each instance |
| `template_runs` | Execution history | Records every time a template is run/sent, with the variables used and recipients |
| `template_variables` | Template-level variables | Stores variables that can be used across the entire template |
| `api_templates` | Reusable API configs | Pre-configured API endpoints (Jira, GitHub, etc.) that templates can use |
| `api_template_params` | API parameters | Defines required parameters for each API template (domain, API key, etc.) |
| `template_global_api_integrations` | Global API integrations | Links templates to multiple API integrations with global variable storage and data transformations |

## Table Relationship Map

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
                                                      │ FK: template_section_id
                                                      ▼
                                            ┌────────────────────┐
                                            │  section_variables │
                                            │  (Dual-purpose:    │
                                            │   Master + Instance)│
                                            └────────────────────┘

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

## Complete Database Model with Relationships (MS SQL Server)

```sql
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 1: sections                                                             ║
-- ║ PURPOSE: Master catalog of all available section types (building blocks)      ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Master data table containing all available section types that users can add
--   to their templates. Think of it as a "menu" of building blocks.
--
-- RELATIONSHIPS:
--   • NO FOREIGN KEYS (This is a parent/reference table)
--   • REFERENCED BY: section_variables.section_type → sections.type
--   • REFERENCED BY: template_sections.section_type (logical, not FK)
--
-- EXAMPLES OF SECTION TYPES:
--   heading1-6, paragraph, labeled-content, table, bullet-list, container
-- ============================================================================
CREATE TABLE sections (
  -- Primary key: Unique identifier (MS SQL Server UNIQUEIDENTIFIER)
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Section type identifier (UNIQUE) - referenced by section_variables and template_sections
  -- Examples: 'heading1', 'paragraph', 'labeled-content', 'table'
  type NVARCHAR(50) NOT NULL UNIQUE,
  
  -- Human-readable name displayed in UI
  -- Examples: "Heading 1", "Bullet List (Circle)", "Labeled Content"
  label NVARCHAR(100) NOT NULL,
  
  -- Explanation of what this section does (tooltip/help text)
  description NVARCHAR(MAX),
  
  -- Category for grouping in UI: 'text', 'media', 'layout', 'interactive'
  category NVARCHAR(50) NOT NULL,
  
  -- Lucide icon name for visual identification
  -- Examples: 'Heading1', 'Type', 'Table', 'List', 'Image', 'Box'
  icon NVARCHAR(50),
  
  -- Default placeholder content when section is first added
  default_content NVARCHAR(MAX),
  
  -- Audit timestamps
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_sections_category ON sections(category);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 2: section_variables                                                    ║
-- ║ PURPOSE: Variable definitions (master catalog) AND instance values            ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Dual-purpose table that serves two roles:
--   1. MASTER CATALOG: Defines what variables are available for each section type
--      (rows with section_type populated, template_section_id = NULL)
--   2. INSTANCE VALUES: Stores actual variable key-value pairs for template section
--      instances (rows with template_section_id populated, section_type = NULL)
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: section_type → sections.type (CASCADE DELETE) - for master catalog
--   • FOREIGN KEY: template_section_id → template_sections.id (CASCADE DELETE) - for instances
--   • UNIQUE CONSTRAINT: (section_type, variable_name) prevents duplicates in catalog
--   • UNIQUE CONSTRAINT: (template_section_id, variable_name) prevents duplicates per instance
--
-- ROW TYPE DETERMINATION:
--   section_type IS NOT NULL → Master catalog variable definition
--   template_section_id IS NOT NULL → Template section instance variable
--   (These are mutually exclusive - a row belongs to one or the other)
--
-- VARIABLE TYPES & THEIR EDITORS:
--   'text'     → Simple text input field
--   'url'      → URL input with validation
--   'list'     → List editor (add/remove items, supports nesting)
--   'table'    → Table/grid editor (rows and columns)
--   'metadata' → System metadata (contentType, listStyle, etc.)
-- ============================================================================
CREATE TABLE section_variables (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- References sections.type (CASCADE DELETE when section type deleted)
  -- NULL when this row is a template section instance variable
  section_type NVARCHAR(50),
  
  -- References template_sections.id (CASCADE DELETE when section is deleted)
  -- NULL when this row is a master catalog variable definition
  template_section_id UNIQUEIDENTIFIER,
  
  -- Internal variable name used in code
  -- Examples: 'items', 'tableData', 'label', 'content', 'listStyle'
  variable_name NVARCHAR(100) NOT NULL,
  
  -- Display label shown in editor UI
  -- Examples: "List Items", "Table Data", "Field Label"
  variable_label NVARCHAR(100) NOT NULL,
  
  -- Data type: 'text', 'url', 'list', 'table', 'metadata'
  variable_type NVARCHAR(50) NOT NULL,
  
  -- Default value for catalog rows / Actual value for instance rows (JSON string)
  -- text: "Default text"
  -- list: '[{"text":"Item 1","children":[]}]'
  -- table: '{"rows":[["H1","H2"],["D1","D2"]]}'
  -- metadata: "disc" (for listStyle), "list" (for contentType)
  default_value NVARCHAR(MAX),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Unique constraint for master catalog: No duplicate variable names per section type
  CONSTRAINT uk_section_variables UNIQUE(section_type, variable_name),
  
  -- Unique constraint for instances: No duplicate variable names per template section
  CONSTRAINT uk_section_variables_instance UNIQUE(template_section_id, variable_name),
  
  -- Foreign key to sections.type (master catalog)
  CONSTRAINT fk_section_variables_type FOREIGN KEY (section_type) 
    REFERENCES sections(type) ON DELETE CASCADE,
  
  -- Foreign key to template_sections.id (instance values)
  CONSTRAINT fk_section_variables_template_section FOREIGN KEY (template_section_id) 
    REFERENCES template_sections(id) ON DELETE CASCADE,
  
  -- Check constraint: Must belong to either catalog or instance, not both
  CONSTRAINT chk_section_variables_scope CHECK (
    (section_type IS NOT NULL AND template_section_id IS NULL) OR
    (section_type IS NULL AND template_section_id IS NOT NULL)
  )
);

CREATE INDEX idx_section_variables_type ON section_variables(section_type);
CREATE INDEX idx_section_variables_template_section ON section_variables(template_section_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 3: templates                                                            ║
-- ║ PURPOSE: Stores user-created templates (the main documents users build)       ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Main table for user-created templates containing the final HTML output
--   with Thymeleaf variables for dynamic content.
--
-- RELATIONSHIPS:
--   • NO FOREIGN KEYS (This is a parent table)
--   • REFERENCED BY: template_sections.template_id (1:Many)
--   • REFERENCED BY: template_runs.template_id (1:Many)
--   • REFERENCED BY: template_variables.template_id (1:Many)
--   • REFERENCED BY: template_global_api_integrations.template_id (1:Many)
--
-- CASCADE BEHAVIOR (when template deleted):
--   → All template_sections are deleted
--   → All template_runs are deleted
--   → All template_variables are deleted
--   → All template_global_api_integrations are deleted
-- ============================================================================
CREATE TABLE templates (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Template name displayed in lists
  -- Examples: "Welcome Email", "Incident Report", "Weekly Newsletter"
  name NVARCHAR(255) NOT NULL,
  
  -- Email subject line with optional {{placeholders}} for dynamic content
  -- Examples: "Order Confirmation - {{orderNumber}}", "Welcome to {{companyName}}!"
  subject NVARCHAR(500),
  
  -- Complete generated HTML with Thymeleaf variables
  -- Contains: <th:utext="${variableName}"> placeholders
  html NVARCHAR(MAX) NOT NULL,
  
  -- Owner user ID (for multi-user systems)
  user_id UNIQUEIDENTIFIER,
  
  -- Audit timestamps
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_created_at ON templates(created_at DESC);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 4: template_sections                                                    ║
-- ║ PURPOSE: Stores section instances within templates (content & styling)        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Junction table linking sections to templates. Each row represents one section
--   placed in a template with specific content, variables, and styling.
--   Supports NESTED sections via self-referencing parent_section_id.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
--   • FOREIGN KEY: parent_section_id → template_sections.id (SELF-REFERENCE)
--     NULL = root-level section, UUID = child of that parent section
--
-- JSON COLUMNS:
--   • variables: Section-specific data (list items, table data, labels)
--   • styles: Section-specific styling (fontSize, color, backgroundColor)
--
-- NESTED LIST STRUCTURE (in variables JSON):
--   {
--     "label": "Field Name",
--     "contentType": "list",
--     "listStyle": "disc",
--     "items": [
--       {"text": "Item 1", "bold": true, "color": "#FF0000", "children": [
--         {"text": "Sub-item 1.1", "italic": true, "children": []}
--       ]}
--     ]
--   }
-- ============================================================================
CREATE TABLE template_sections (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Foreign key to templates.id (CASCADE DELETE)
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Section type (logical reference to sections.type, NOT a FK)
  -- Examples: 'heading1', 'paragraph', 'labeled-content', 'table'
  section_type NVARCHAR(50) NOT NULL,
  
  -- The actual content for this section instance
  -- Can include {{variable}} placeholders that convert to Thymeleaf
  content NVARCHAR(MAX) NOT NULL,
  
  -- Section-specific variables and data (JSON)
  -- Structure varies by section_type:
  --   labeled-content: {"label": "...", "contentType": "list/text/table", "items": [...]}
  --   table: {"rows": [[{text, style}]], "showBorder": true, "mergedCells": {}}
  --   list: {"items": [{"text": "...", "bold": true, "children": [...]}]}
  variables NVARCHAR(MAX),
  
  -- Section-level custom styles (JSON)
  -- {"fontSize": "16px", "color": "#000", "backgroundColor": "#fff", 
  --  "textAlign": "center", "fontWeight": "bold"}
  styles NVARCHAR(MAX),
  
  -- Controls if label can be edited at runtime (for labeled-content sections)
  -- true = users can edit label when running template
  -- false = label is locked
  is_label_editable BIT DEFAULT 1,
  
  -- Position in template or within parent container (0, 1, 2, ...)
  -- Determines display order
  order_index INT NOT NULL,
  
  -- Parent section ID for nested sections (NULL for top-level)
  -- Self-referencing FK for container/nested structure
  parent_section_id UNIQUEIDENTIFIER,
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Foreign keys
  CONSTRAINT fk_template_sections_template 
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_sections_parent 
    FOREIGN KEY (parent_section_id) REFERENCES template_sections(id)
);

CREATE INDEX idx_template_sections_template_id ON template_sections(template_id);
CREATE INDEX idx_template_sections_order ON template_sections(template_id, order_index);
CREATE INDEX idx_template_sections_parent ON template_sections(parent_section_id);



-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 5: template_runs                                                        ║
-- ║ PURPOSE: Audit log of every time a template is executed/sent                  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Tracks template usage, debug issues, and maintains execution history.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
-- ============================================================================
CREATE TABLE template_runs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Foreign key to templates.id (CASCADE DELETE)
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Primary recipient email addresses (comma-separated or JSON array)
  to_emails NVARCHAR(MAX) NOT NULL,
  
  -- CC (carbon copy) recipients
  cc_emails NVARCHAR(MAX),
  
  -- BCC (blind carbon copy) recipients
  bcc_emails NVARCHAR(MAX),
  
  -- Variable values used in this run (JSON)
  -- {"name": "John Doe", "incidentNumber": "INC-123", "priority": "High"}
  variables NVARCHAR(MAX),
  
  -- Final rendered HTML with all variables replaced
  html_output NVARCHAR(MAX) NOT NULL,
  
  -- When this template was executed
  run_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Execution status: 'sent', 'failed', 'pending'
  status NVARCHAR(50) DEFAULT 'sent',
  
  -- User who executed this template
  user_id UNIQUEIDENTIFIER,
  
  CONSTRAINT fk_template_runs_template 
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_template_runs_template_id ON template_runs(template_id);
CREATE INDEX idx_template_runs_run_at ON template_runs(run_at DESC);
CREATE INDEX idx_template_runs_user_id ON template_runs(user_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 6: template_variables                                                   ║
-- ║ PURPOSE: Stores template-level variables available across the entire template ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Defines variables that can be used across the entire template.
--   Users can reference these in any section within the template.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
-- ============================================================================
CREATE TABLE template_variables (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Foreign key to templates.id (CASCADE DELETE)
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Variable name used in template
  -- Examples: 'customerName', 'incidentNumber', 'reportDate'
  variable_name NVARCHAR(100) NOT NULL,
  
  -- Display label shown in UI
  variable_label NVARCHAR(100) NOT NULL,
  
  -- Data type: 'text', 'number', 'date', 'email', 'url'
  variable_type NVARCHAR(50) NOT NULL DEFAULT 'text',
  
  -- Default value for this variable
  default_value NVARCHAR(MAX),
  
  -- Whether this variable is required when running the template
  is_required BIT DEFAULT 0,
  
  -- Placeholder text shown in input field
  placeholder NVARCHAR(255),
  
  -- Which section this variable belongs to (optional context)
  section_id UNIQUEIDENTIFIER,
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Unique constraint: No duplicate variable names per template
  CONSTRAINT uk_template_variables UNIQUE(template_id, variable_name),
  
  CONSTRAINT fk_template_variables_template 
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_variables_section 
    FOREIGN KEY (section_id) REFERENCES template_sections(id)
);

CREATE INDEX idx_template_variables_template_id ON template_variables(template_id);
CREATE INDEX idx_template_variables_section_id ON template_variables(section_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 7: api_templates                                                        ║
-- ║ PURPOSE: Pre-configured API endpoint templates (Jira, GitHub, ServiceNow)     ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Reusable API configurations that templates can use to fetch external data.
--
-- RELATIONSHIPS:
--   • NO FOREIGN KEYS (Parent table)
--   • REFERENCED BY: api_template_params.api_template_id (1:Many)
--   • REFERENCED BY: template_global_api_integrations.api_template_id (Many:1)
-- ============================================================================
CREATE TABLE api_templates (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Display name for this API template
  -- Examples: "Jira - Get Issue", "GitHub - Repository Info"
  name NVARCHAR(255) NOT NULL,
  
  -- Explanation of what this API does
  description NVARCHAR(MAX),
  
  -- API service category: 'jira', 'github', 'servicenow', 'rest', 'custom'
  category NVARCHAR(100),
  
  -- API URL with parameter placeholders
  -- 'https://{domain}.atlassian.net/rest/api/{version}/issue/{issueKey}'
  url_template NVARCHAR(MAX) NOT NULL,
  
  -- HTTP method: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
  method NVARCHAR(10) NOT NULL,
  
  -- HTTP headers with placeholders (JSON)
  -- {"Authorization": "Bearer {apiToken}", "Content-Type": "application/json"}
  headers NVARCHAR(MAX),
  
  -- Request body template for POST/PUT requests
  body_template NVARCHAR(MAX),
  
  -- Flag: true if user created this custom API
  is_custom BIT DEFAULT 0,
  
  -- User who created this custom API
  created_by UNIQUEIDENTIFIER,
  
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_api_templates_category ON api_templates(category);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 8: api_template_params                                                  ║
-- ║ PURPOSE: Defines parameters required by each API template                     ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Defines what parameters each API template requires (domain, API key, etc.)
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: api_template_id → api_templates.id (CASCADE DELETE)
-- ============================================================================
CREATE TABLE api_template_params (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Foreign key to api_templates.id (CASCADE DELETE)
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Internal parameter name (matches placeholder in URL/headers/body)
  -- Examples: 'domain', 'version', 'issueKey', 'apiToken'
  param_name NVARCHAR(100) NOT NULL,
  
  -- Display label shown to users
  -- Examples: "JIRA Domain", "API Version", "Issue Key"
  param_label NVARCHAR(100) NOT NULL,
  
  -- Input type: 'text', 'number', 'select'
  param_type NVARCHAR(50) NOT NULL,
  
  -- Where this parameter goes: 'path', 'query', 'header', 'body'
  param_location NVARCHAR(50) NOT NULL,
  
  -- Placeholder text shown in input field
  placeholder NVARCHAR(MAX),
  
  -- Whether this parameter is mandatory
  required BIT DEFAULT 1,
  
  -- Help text for users
  description NVARCHAR(MAX),
  
  -- Available options for 'select' type (JSON array)
  -- ["v1", "v2", "v3"] or ["High", "Medium", "Low"]
  options NVARCHAR(MAX),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Unique constraint: No duplicate parameter names per API template
  CONSTRAINT uk_api_template_params UNIQUE(api_template_id, param_name),
  
  CONSTRAINT fk_api_template_params_template 
    FOREIGN KEY (api_template_id) REFERENCES api_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_template_params_template ON api_template_params(api_template_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 9: template_global_api_integrations                                     ║
-- ║ PURPOSE: Links templates to multiple API integrations with global variables   ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Each template can have MULTIPLE API integrations (1:Many). Each integration
--   fetches data from an external API and stores the response in a named global
--   variable accessible from any section via {{variableName.field.path}} syntax.
--   Also supports referencing global variables in the email subject field.
--
--   The transformation column stores an optional data processing pipeline
--   applied to the raw API response BEFORE storing in globalVariables.
--   Supports: filtering, field mapping/renaming, sorting, limiting, field selection.
--   Handles diverse response types: single objects, flat lists, nested objects.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
--   • FOREIGN KEY: api_template_id → api_templates.id
--   • UNIQUE CONSTRAINT: (template_id, variable_name) - no duplicate variable names per template
--
-- DATA FLOW:
--   1. User configures integration in GlobalApiPanel (editor mode)
--   2. Template is saved → integrations stored in this table
--   3. In RunTemplates, user clicks "Fetch" on an integration
--   4. API response is transformed (if configured) and stored in globalVariables[variableName]
--   5. Sections and subject field referencing {{variableName.field}} auto-resolve
--
-- TRANSFORMATION JSON STRUCTURE:
--   {
--     "filters": [{"id":"f1","field":"status","operator":"equals","value":"active"}],
--     "filterLogic": "and",
--     "fieldMappings": [{"id":"m1","sourceField":"name","targetField":"fullName","enabled":true}],
--     "selectFields": ["name","status"],
--     "limit": 10,
--     "sortField": "name",
--     "sortOrder": "asc"
--   }
-- ============================================================================
CREATE TABLE template_global_api_integrations (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Foreign key to templates.id (CASCADE DELETE)
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Foreign key to api_templates.id (which API endpoint to use)
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- User-friendly name for this integration
  -- Examples: "ServiceNow Change Details", "Jira Issue Data"
  integration_name NVARCHAR(255) NOT NULL,
  
  -- Global variable name to store the API response
  -- MUST be unique per template (enforced by UK constraint)
  -- Examples: "snowDetails", "jiraIssue", "githubRepo"
  -- Used in sections as {{snowDetails.changeNo}}, {{jiraIssue.fields.summary}}
  -- Also usable in subject field: "Change {{snowDetails.changeNo}} - Report"
  variable_name NVARCHAR(100) NOT NULL,
  
  -- Whether this API integration is currently active
  -- Allows disabling without losing configuration
  enabled BIT DEFAULT 1,
  
  -- User-provided parameter values (JSON object)
  -- Keys MUST match param_name from api_template_params
  -- Example: {"changeNo": "CHG1234567", "domain": "mycompany"}
  -- These values are editable in RunTemplates mode before fetching
  param_values NVARCHAR(MAX),
  
  -- Optional data transformation configuration (JSON object)
  -- Applied to API response data AFTER fetching, BEFORE storing in globalVariables
  -- Supports: filters, field mappings, sorting, limiting, field selection
  -- Handles: single objects, flat lists, lists of nested objects
  -- NULL = no transformation (raw data stored as-is)
  transformation NVARCHAR(MAX),
  
  -- Cached API response data (JSON)
  -- Stores the last-fetched API response so templates can render without re-fetching.
  -- Contains both raw and transformed data, schema info, and data type.
  -- Structure: {
  --   "data": <transformed response>,
  --   "rawData": <original response before transformation>,
  --   "dataType": "object" | "list" | "stringList",
  --   "schema": {"field": "type", ...}
  -- }
  -- NULL = no cached data (API has not been fetched yet)
  cached_response NVARCHAR(MAX),
  
  -- Timestamp of the last successful API fetch
  -- NULL = never fetched
  cached_response_at DATETIME2,
  
  -- Display order within the template's integration list (0, 1, 2, ...)
  order_index INT NOT NULL DEFAULT 0,
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Unique constraint: No duplicate variable names per template
  CONSTRAINT uk_tgai_template_variable UNIQUE(template_id, variable_name),
  
  CONSTRAINT fk_tgai_template 
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_tgai_api_template 
    FOREIGN KEY (api_template_id) REFERENCES api_templates(id)
);

CREATE INDEX idx_tgai_template_id ON template_global_api_integrations(template_id);
CREATE INDEX idx_tgai_api_template_id ON template_global_api_integrations(api_template_id);
```

## JSON Column Structures

### template_sections.variables

Different structures based on section_type:

**labeled-content:**
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
          "children": []
        }
      ]
    }
  ]
}
```

**table:**
```json
{
  "rows": [
    [
      {"text": "Header 1", "bold": true},
      {"text": "Header 2", "bold": true}
    ],
    [
      {"text": "Data 1"},
      {"text": "Data 2", "color": "#0000FF"}
    ]
  ],
  "showBorder": true,
  "mergedCells": {}
}
```

**list types:**
```json
{
  "items": [
    {"text": "Item 1", "bold": true, "children": []},
    {"text": "Item 2", "italic": true, "children": [
      {"text": "Sub-item 2.1", "children": []}
    ]}
  ]
}
```

### template_sections.styles

```json
{
  "fontSize": "16px",
  "color": "#000000",
  "backgroundColor": "#FFFFFF",
  "textAlign": "center",
  "fontWeight": "bold",
  "fontStyle": "italic",
  "textDecoration": "underline"
}
```

### ListItemStyle Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `text` | string | The text content | "Main Item 1" |
| `bold` | boolean | Bold formatting | true |
| `italic` | boolean | Italic formatting | true |
| `underline` | boolean | Underline formatting | true |
| `color` | string | Text color (hex) | "#FF0000" |
| `backgroundColor` | string | Background color (hex) | "#FFFF00" |
| `fontSize` | string | Font size (CSS) | "16px" |
| `children` | array | Nested items (max 3 levels) | [...] |

### List Style Options

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

## Example Queries

### Insert a Template with Sections

```sql
-- Step 1: Create template
INSERT INTO templates (name, html, user_id)
VALUES (
  'Incident Report',
  '<h1><th:utext="${title}"></th:utext></h1><div>...</div>',
  '12345678-1234-1234-1234-123456789012'
);

-- Get the template ID
DECLARE @templateId UNIQUEIDENTIFIER = (SELECT id FROM templates WHERE name = 'Incident Report');

-- Step 2: Add sections
INSERT INTO template_sections (template_id, section_type, content, variables, styles, is_label_editable, order_index)
VALUES (
  @templateId,
  'heading1',
  '<h1><th:utext="${title}"></th:utext></h1>',
  '{"title": "Incident Report"}',
  '{"fontSize": "24px", "fontWeight": "bold"}',
  1,
  0
);

INSERT INTO template_sections (template_id, section_type, content, variables, styles, is_label_editable, order_index)
VALUES (
  @templateId,
  'labeled-content',
  '<div>...</div>',
  '{
    "label": "Key Findings",
    "contentType": "list",
    "listStyle": "disc",
    "items": [
      {"text": "Finding 1", "bold": true, "children": []},
      {"text": "Finding 2", "children": []}
    ]
  }',
  '{"fontSize": "14px"}',
  1,
  1
);
```

### Query Template with All Sections

```sql
SELECT 
  t.id AS template_id,
  t.name AS template_name,
  ts.id AS section_id,
  ts.section_type,
  ts.content,
  ts.variables,
  ts.styles,
  ts.is_label_editable,
  ts.order_index,
  ts.parent_section_id
FROM templates t
LEFT JOIN template_sections ts ON t.id = ts.template_id
WHERE t.id = @templateId
ORDER BY ts.order_index;
```

### Query Sections with Specific List Styles

```sql
-- Find all sections with bullet lists
SELECT * 
FROM template_sections 
WHERE JSON_VALUE(variables, '$.listStyle') IN ('circle', 'disc', 'square');

-- Find sections with nested items
SELECT * 
FROM template_sections 
WHERE JSON_VALUE(variables, '$.items[0].children') IS NOT NULL;
```

### Query with JSON Path for MS SQL Server

```sql
-- Extract specific JSON values
SELECT 
  id,
  section_type,
  JSON_VALUE(variables, '$.label') AS label,
  JSON_VALUE(variables, '$.contentType') AS content_type,
  JSON_VALUE(variables, '$.listStyle') AS list_style
FROM template_sections
WHERE template_id = @templateId;
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

## Seed Data: API Templates & Parameters

The following INSERT scripts populate the `api_templates` and `api_template_params` tables with the pre-configured API endpoint templates from the frontend `apiTemplates.ts` file.

### Seed API Templates

```sql
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEED DATA: api_templates                                                      ║
-- ║ SOURCE: src/data/apiTemplates.ts                                              ║
-- ║ PURPOSE: Pre-configured API endpoint templates (Jira, GitHub, ServiceNow, etc)║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- 1. Jira Fix Version Details
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000001',
  'Jira Fix Version Details',
  'Get details of a specific fix version from Jira',
  'Jira',
  'https://{domain}.atlassian.net/rest/api/3/version/{versionId}',
  'GET',
  '{"Authorization": "Basic {authToken}", "Content-Type": "application/json"}',
  NULL,
  0,
  GETUTCDATE()
);

-- 2. Jira Version Issues
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000002',
  'Jira Version Issues',
  'Get all issues associated with a fix version',
  'Jira',
  'https://{domain}.atlassian.net/rest/api/3/search?jql=fixVersion={versionName}',
  'GET',
  '{"Authorization": "Basic {authToken}", "Content-Type": "application/json"}',
  NULL,
  0,
  GETUTCDATE()
);

-- 3. ServiceNow Incident Details
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000003',
  'ServiceNow Incident Details',
  'Get details of a specific incident from ServiceNow',
  'ServiceNow',
  'https://{instance}.service-now.com/api/now/table/incident/{incidentNumber}',
  'GET',
  '{"Authorization": "Basic {authToken}", "Content-Type": "application/json"}',
  NULL,
  0,
  GETUTCDATE()
);

-- 4. ServiceNow Change Details
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000004',
  'ServiceNow Change Details',
  'Get details of a specific change request from ServiceNow',
  'ServiceNow',
  'https://{instance}.service-now.com/api/now/table/change_request/{changeNumber}',
  'GET',
  '{"Authorization": "Basic {authToken}", "Content-Type": "application/json"}',
  NULL,
  0,
  GETUTCDATE()
);

-- 5. GitHub Repository Info
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000005',
  'GitHub Repository Info',
  'Get information about a GitHub repository',
  'GitHub',
  'https://api.github.com/repos/{owner}/{repo}',
  'GET',
  '{"Authorization": "Bearer {token}", "Accept": "application/vnd.github.v3+json"}',
  NULL,
  0,
  GETUTCDATE()
);

-- 6. JSONPlaceholder User (Demo)
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000006',
  'JSONPlaceholder User (Demo)',
  'Get user information from JSONPlaceholder - Free fake API for testing',
  'Demo',
  'https://jsonplaceholder.typicode.com/users/{userId}',
  'GET',
  '{"Content-Type": "application/json"}',
  NULL,
  0,
  GETUTCDATE()
);

-- 7. Mock Tags List (Demo)
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000007',
  'Mock Tags List (Demo)',
  'Returns a list of string tags - Maps to bullet list',
  'Demo',
  'mock://string-list',
  'GET',
  '{}',
  NULL,
  0,
  GETUTCDATE()
);

-- 8. Mock Issues List (Demo)
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000008',
  'Mock Issues List (Demo)',
  'Returns a list of objects - Maps to table',
  'Demo',
  'mock://object-list',
  'GET',
  '{}',
  NULL,
  0,
  GETUTCDATE()
);

-- 9. Mock Release Info (Demo)
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000009',
  'Mock Release Info (Demo)',
  'Returns a single object - Maps to table or labeled list',
  'Demo',
  'mock://single-object',
  'GET',
  '{}',
  NULL,
  0,
  GETUTCDATE()
);

-- 10. Mock ServiceNow Change (Demo)
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000010',
  'Mock ServiceNow Change (Demo)',
  'Returns a ServiceNow change request object - Use with dot notation like {{snowDetails.changeNo}}',
  'Demo',
  'mock://servicenow-change',
  'GET',
  '{}',
  NULL,
  0,
  GETUTCDATE()
);

-- 11. Mock ServiceNow Incident (Demo)
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000011',
  'Mock ServiceNow Incident (Demo)',
  'Returns a ServiceNow incident object',
  'Demo',
  'mock://servicenow-incident',
  'GET',
  '{}',
  NULL,
  0,
  GETUTCDATE()
);

-- 12. Mock Team Members (Demo)
INSERT INTO api_templates (id, name, description, category, url_template, method, headers, body_template, is_custom, created_at)
VALUES (
  'A0000001-0001-0001-0001-000000000012',
  'Mock Team Members (Demo)',
  'Returns nested objects with arrays - Complex data structure',
  'Demo',
  'mock://nested-list',
  'GET',
  '{}',
  NULL,
  0,
  GETUTCDATE()
);
```

### Seed API Template Parameters

```sql
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ SEED DATA: api_template_params                                                ║
-- ║ SOURCE: src/data/apiTemplates.ts → requiredParams                             ║
-- ║ PURPOSE: Parameters for each API template                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- === Jira Fix Version Details (A0000001-0001-0001-0001-000000000001) ===
INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000001', 'domain', 'Jira Domain', 'text', 'path', 'your-company', 1, 'Your Jira subdomain (e.g., ''your-company'' for your-company.atlassian.net)', GETUTCDATE());

INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000001', 'versionId', 'Version ID', 'text', 'path', '10000', 1, 'The ID of the fix version', GETUTCDATE());

INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000001', 'authToken', 'Auth Token', 'text', 'header', 'Base64 encoded email:api_token', 1, 'Base64 encoded ''email:api_token''', GETUTCDATE());

-- === Jira Version Issues (A0000001-0001-0001-0001-000000000002) ===
INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000002', 'domain', 'Jira Domain', 'text', 'path', 'your-company', 1, 'Your Jira subdomain', GETUTCDATE());

INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000002', 'versionName', 'Version Name', 'text', 'query', 'v1.0.0', 1, 'Name of the fix version', GETUTCDATE());

INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000002', 'authToken', 'Auth Token', 'text', 'header', 'Base64 encoded email:api_token', 1, 'Base64 encoded ''email:api_token''', GETUTCDATE());

-- === ServiceNow Incident Details (A0000001-0001-0001-0001-000000000003) ===
INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000003', 'instance', 'ServiceNow Instance', 'text', 'path', 'dev12345', 1, 'Your ServiceNow instance name', GETUTCDATE());

INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000003', 'incidentNumber', 'Incident Number', 'text', 'path', 'INC0010001', 1, 'The incident number', GETUTCDATE());

INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000003', 'authToken', 'Auth Token', 'text', 'header', 'Base64 encoded username:password', 1, 'Base64 encoded ''username:password''', GETUTCDATE());

-- === ServiceNow Change Details (A0000001-0001-0001-0001-000000000004) ===
INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000004', 'instance', 'ServiceNow Instance', 'text', 'path', 'dev12345', 1, 'Your ServiceNow instance name', GETUTCDATE());

INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000004', 'changeNumber', 'Change Number', 'text', 'path', 'CHG0030001', 1, 'The change request number', GETUTCDATE());

INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000004', 'authToken', 'Auth Token', 'text', 'header', 'Base64 encoded username:password', 1, 'Base64 encoded ''username:password''', GETUTCDATE());

-- === GitHub Repository Info (A0000001-0001-0001-0001-000000000005) ===
INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000005', 'owner', 'Repository Owner', 'text', 'path', 'octocat', 1, 'GitHub username or organization', GETUTCDATE());

INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000005', 'repo', 'Repository Name', 'text', 'path', 'hello-world', 1, 'Repository name', GETUTCDATE());

INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000005', 'token', 'GitHub Token', 'text', 'header', 'ghp_xxxxxxxxxxxxx', 1, 'GitHub personal access token', GETUTCDATE());

-- === JSONPlaceholder User (A0000001-0001-0001-0001-000000000006) ===
INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000006', 'userId', 'User ID', 'text', 'path', '1', 1, 'User ID (1-10 available in demo API)', GETUTCDATE());

-- === Mock Tags List (A0000001-0001-0001-0001-000000000007) ===
-- No parameters required

-- === Mock Issues List (A0000001-0001-0001-0001-000000000008) ===
-- No parameters required

-- === Mock Release Info (A0000001-0001-0001-0001-000000000009) ===
-- No parameters required

-- === Mock ServiceNow Change (A0000001-0001-0001-0001-000000000010) ===
INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000010', 'changeNo', 'Change Number', 'text', 'query', 'CHG1234567', 0, 'Enter a change number to override mock data', GETUTCDATE());

-- === Mock ServiceNow Incident (A0000001-0001-0001-0001-000000000011) ===
INSERT INTO api_template_params (id, api_template_id, param_name, param_label, param_type, param_location, placeholder, required, description, created_at)
VALUES (NEWID(), 'A0000001-0001-0001-0001-000000000011', 'incidentNo', 'Incident Number', 'text', 'query', 'INC0012345', 0, 'Enter an incident number to override mock data', GETUTCDATE());

-- === Mock Team Members (A0000001-0001-0001-0001-000000000012) ===
-- No parameters required
```

### Verify Seed Data

```sql
-- Verify api_templates seed data
SELECT id, name, category, method, url_template FROM api_templates ORDER BY category, name;

-- Verify api_template_params seed data  
SELECT 
  at.name AS template_name,
  atp.param_name,
  atp.param_label,
  atp.param_type,
  atp.param_location,
  atp.required
FROM api_template_params atp
JOIN api_templates at ON atp.api_template_id = at.id
ORDER BY at.name, atp.param_name;

-- Count templates and params
SELECT 
  (SELECT COUNT(*) FROM api_templates) AS total_templates,
  (SELECT COUNT(*) FROM api_template_params) AS total_params;
-- Expected: 12 templates, 16 params
```

## Migration Order

When creating the database, execute migrations in this order:

1. `001_create_sections.sql`
2. `002_create_section_variables.sql`
3. `003_create_templates.sql`
4. `004_create_template_sections.sql`
5. `005_create_template_runs.sql`
6. `006_create_template_variables.sql`
7. `007_create_api_templates.sql`
8. `008_create_api_template_params.sql`
9. `009_create_template_global_api_integrations.sql`
10. `010_seed_sections.sql`

### Alter Scripts (run after initial setup)

14. `014_add_cached_response_to_integrations.sql`

```sql
-- 014_add_cached_response_to_integrations.sql
-- Adds cached API response storage to template_global_api_integrations
ALTER TABLE template_global_api_integrations
  ADD cached_response NVARCHAR(MAX) NULL;

ALTER TABLE template_global_api_integrations
  ADD cached_response_at DATETIME2 NULL;
```
11. `011_seed_section_variables.sql`
12. `012_seed_api_templates.sql`
13. `013_seed_api_template_params.sql`

## Key Relationships Summary

| Relationship | Type | On Delete |
|-------------|------|-----------|
| sections → section_variables | 1:N | CASCADE |
| templates → template_sections | 1:N | CASCADE |
| templates → template_runs | 1:N | CASCADE |
| templates → template_variables | 1:N | CASCADE |
| templates → template_global_api_integrations | 1:N | CASCADE |
| template_sections → template_sections | Self-ref | CASCADE |
| api_templates → api_template_params | 1:N | CASCADE |
| template_global_api_integrations → api_templates | N:1 | - |
