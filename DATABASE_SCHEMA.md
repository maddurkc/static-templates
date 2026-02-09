# Database Schema for Page Builder Application

## Overview

This database schema supports a flexible page builder system where users can create templates using reusable sections, integrate with external APIs, and execute templates with dynamic variables. **Uses MS SQL Server syntax.**

## Table Purpose Summary

| Table | Purpose | Use Case |
|-------|---------|----------|
| `sections` | Master list of available section types | Defines what building blocks users can add to templates (headings, paragraphs, tables, etc.) |
| `section_variables` | Variable definitions | Defines what variables are available for each section type (name, type, default value) |
| `templates` | User-created templates | Stores complete templates built by users, containing the final HTML output |
| `template_sections` | Sections within templates | Links sections to templates with specific content, styles, and ordering for each instance |
| `template_config_section_variables` | Section instance variables | Stores individual variable key-value pairs for each section instance (normalized from JSON) |
| `template_runs` | Execution history | Records every time a template is run/sent, with the variables used and recipients |
| `template_variables` | Template-level variables | Stores variables that can be used across the entire template |
| `api_templates` | Reusable API configs | Pre-configured API endpoints (Jira, GitHub, etc.) that templates can use |
| `api_template_params` | API parameters | Defines required parameters for each API template (domain, API key, etc.) |
| `template_api_configs` | Template API settings | Links templates to API templates with user-provided parameter values |
| `api_mappings` | API data mappings | Maps API response data to specific sections in templates |

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
                                                      │ FK: section_id
                                                      ▼
                                            ┌─────────────────────────────┐
                                            │template_config_section_vars │
                                            │  (Section Variable Rows)    │
                                            └─────────────────────────────┘

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
-- ║ PURPOSE: Defines what variables are available for each section type           ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Defines configurable properties for each section type.
--   Determines what editor UI to show (text input, list editor, table editor).
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: section_type → sections.type (CASCADE DELETE)
--   • UNIQUE CONSTRAINT: (section_type, variable_name) prevents duplicates
--
-- VARIABLE TYPES & THEIR EDITORS:
--   'text'  → Simple text input field
--   'url'   → URL input with validation
--   'list'  → List editor (add/remove items, supports nesting)
--   'table' → Table/grid editor (rows and columns)
-- ============================================================================
CREATE TABLE section_variables (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- References sections.type (CASCADE DELETE when section type deleted)
  section_type NVARCHAR(50) NOT NULL,
  
  -- Internal variable name used in code
  -- Examples: 'items', 'tableData', 'label', 'content', 'listStyle'
  variable_name NVARCHAR(100) NOT NULL,
  
  -- Display label shown in editor UI
  -- Examples: "List Items", "Table Data", "Field Label"
  variable_label NVARCHAR(100) NOT NULL,
  
  -- Data type: 'text', 'url', 'list', 'table'
  variable_type NVARCHAR(50) NOT NULL,
  
  -- Default value (JSON string)
  -- text: "Default text"
  -- list: '[{"text":"Item 1","children":[]}]'
  -- table: '{"rows":[["H1","H2"],["D1","D2"]]}'
  default_value NVARCHAR(MAX),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Unique constraint: No duplicate variable names per section type
  CONSTRAINT uk_section_variables UNIQUE(section_type, variable_name),
  
  -- Foreign key to sections.type
  CONSTRAINT fk_section_variables_type FOREIGN KEY (section_type) 
    REFERENCES sections(type) ON DELETE CASCADE
);

CREATE INDEX idx_section_variables_type ON section_variables(section_type);


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
--   • REFERENCED BY: template_api_configs.template_id (1:1)
--
-- CASCADE BEHAVIOR (when template deleted):
--   → All template_sections are deleted
--   → All template_runs are deleted
--   → All template_variables are deleted
--   → The template_api_configs is deleted
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
-- ║ TABLE 4B: template_config_section_variables                                   ║
-- ║ PURPOSE: Stores individual variable key-value pairs for each section instance ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Normalizes the variables JSON from template_sections into individual rows.
--   Each row represents a single variable (key-value pair) belonging to a section.
--   This enables querying, indexing, and managing section variables individually
--   rather than parsing a JSON blob.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: section_id → template_sections.id (CASCADE DELETE)
--   • UNIQUE CONSTRAINT: (section_id, variable_key) prevents duplicate keys per section
--
-- VARIABLE VALUE STORAGE:
--   variable_value stores the value as a string. For complex types:
--   - text: "Plain text value"
--   - list: '[{"text":"Item 1","bold":true,"children":[]}]' (JSON string)
--   - table: '{"rows":[["H1","H2"],["D1","D2"]]}' (JSON string)
--   - metadata: "disc" (for listStyle), "list" (for contentType)
-- ============================================================================
CREATE TABLE template_config_section_variables (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Foreign key to template_sections.id (CASCADE DELETE)
  section_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Variable key name
  -- Examples: 'label', 'content', 'contentType', 'items', 'listStyle', 
  --           'tableData', 'textVariableName', 'labelVariableName'
  variable_key NVARCHAR(255) NOT NULL,
  
  -- Display label for this variable (human-readable)
  -- Examples: "Field Label", "Content", "List Items", "Content Type"
  variable_label NVARCHAR(255),
  
  -- Variable value stored as string (JSON for complex types)
  variable_value NVARCHAR(MAX),
  
  -- Data type hint: 'text', 'list', 'table', 'metadata'
  -- Helps the frontend determine which editor to render
  variable_type NVARCHAR(50) NOT NULL DEFAULT 'text',
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Unique constraint: No duplicate variable keys per section
  CONSTRAINT uk_config_section_variables_key UNIQUE(section_id, variable_key),
  
  CONSTRAINT fk_config_section_variables_section 
    FOREIGN KEY (section_id) REFERENCES template_sections(id) ON DELETE CASCADE
);

CREATE INDEX idx_config_section_variables_section_id ON template_config_section_variables(section_id);
CREATE INDEX idx_config_section_variables_key ON template_config_section_variables(variable_key);



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
--   • REFERENCED BY: template_api_configs.api_template_id (Many:1)
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
-- ║ TABLE 9: template_api_configs                                                 ║
-- ║ PURPOSE: Links templates to API templates with user-provided parameter values ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Each template can integrate with one API to fetch dynamic data.
--   Stores the parameter values provided by the user for that API.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: template_id → templates.id (CASCADE DELETE, UNIQUE - 1:1)
--   • FOREIGN KEY: api_template_id → api_templates.id
--   • REFERENCED BY: api_mappings.api_config_id (1:Many)
-- ============================================================================
CREATE TABLE template_api_configs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Foreign key to templates.id (CASCADE DELETE)
  -- UNIQUE constraint creates 1:1 relationship
  template_id UNIQUEIDENTIFIER NOT NULL UNIQUE,
  
  -- Foreign key to api_templates.id
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- User-provided parameter values (JSON)
  -- {"domain": "mycompany", "version": "3", "apiToken": "abc123"}
  param_values NVARCHAR(MAX),
  
  -- Whether this API integration is currently active
  is_enabled BIT DEFAULT 1,
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  CONSTRAINT fk_template_api_configs_template 
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_api_configs_api_template 
    FOREIGN KEY (api_template_id) REFERENCES api_templates(id)
);

CREATE INDEX idx_template_api_configs_template ON template_api_configs(template_id);
CREATE INDEX idx_template_api_configs_api_template ON template_api_configs(api_template_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 10: api_mappings                                                        ║
-- ║ PURPOSE: Maps API response data to specific sections in templates             ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Defines how API response fields map to template sections/variables.
--   Allows data from API calls to automatically populate template content.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: api_config_id → template_api_configs.id (CASCADE DELETE)
--   • FOREIGN KEY: target_section_id → template_sections.id (optional)
-- ============================================================================
CREATE TABLE api_mappings (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Foreign key to template_api_configs.id (CASCADE DELETE)
  api_config_id UNIQUEIDENTIFIER NOT NULL,
  
  -- JSONPath expression to extract data from API response
  -- Examples: '$.issue.summary', '$.data[0].title', '$.results.items'
  source_path NVARCHAR(500) NOT NULL,
  
  -- Target section to receive the data (optional)
  target_section_id UNIQUEIDENTIFIER,
  
  -- Target variable name within the section
  -- Examples: 'content', 'items', 'label'
  target_variable NVARCHAR(100) NOT NULL,
  
  -- Optional transformation to apply: 'none', 'uppercase', 'lowercase', 'date', 'number'
  transformation NVARCHAR(50) DEFAULT 'none',
  
  -- Default value if API field is empty
  default_value NVARCHAR(MAX),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  CONSTRAINT fk_api_mappings_config 
    FOREIGN KEY (api_config_id) REFERENCES template_api_configs(id) ON DELETE CASCADE,
  CONSTRAINT fk_api_mappings_section 
    FOREIGN KEY (target_section_id) REFERENCES template_sections(id)
);

CREATE INDEX idx_api_mappings_config ON api_mappings(api_config_id);
CREATE INDEX idx_api_mappings_section ON api_mappings(target_section_id);
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
9. `009_create_template_api_configs.sql`
10. `010_create_api_mappings.sql`
11. `011_seed_sections.sql`
12. `012_seed_section_variables.sql`

## Key Relationships Summary

| Relationship | Type | On Delete |
|-------------|------|-----------|
| sections → section_variables | 1:N | CASCADE |
| templates → template_sections | 1:N | CASCADE |
| templates → template_runs | 1:N | CASCADE |
| templates → template_variables | 1:N | CASCADE |
| templates → template_api_configs | 1:1 | CASCADE |
| template_sections → template_sections | Self-ref | CASCADE |
| api_templates → api_template_params | 1:N | CASCADE |
| template_api_configs → api_mappings | 1:N | CASCADE |
