# Database Schema for Page Builder Application

## Overview

This database schema supports a flexible page builder system where users can create templates using reusable sections, integrate with external APIs, and execute templates with dynamic variables.

## Table Purpose Summary

| Table | Purpose | Use Case |
|-------|---------|----------|
| `sections` | Master list of available section types | Defines what building blocks users can add to templates (headings, paragraphs, tables, etc.) |
| `templates` | User-created templates | Stores complete templates built by users, containing the final HTML output |
| `template_sections` | Sections within templates | Links sections to templates with specific content, styles, and variables for each instance |
| `template_runs` | Execution history | Records every time a template is run/sent, with the variables used and recipients |
| `section_variables` | Variable definitions | Defines what variables are available for each section type (name, type, default value) |
| `api_templates` | Reusable API configs | Pre-configured API endpoints (Jira, GitHub, etc.) that templates can use |
| `api_template_params` | API parameters | Defines required parameters for each API template (domain, API key, etc.) |
| `template_api_configs` | Template API settings | Links templates to API templates with user-provided parameter values |
| `api_mappings` | API data mappings | Maps API response data to specific sections in templates |

## Complete Database Model with Relationships

```sql
-- ================================================================
-- SECTIONS TABLE
-- Purpose: Master list of all available section types that users can add to templates
-- Why: Provides a catalog of reusable building blocks (like Lego pieces) for templates
-- ================================================================
CREATE TABLE sections (
  -- Unique identifier for this section type
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Section type identifier (e.g., 'heading1', 'paragraph', 'table')
  -- Why: Determines how the section renders and what features it has
  -- Stores: heading1-6, text, paragraph, table, bullet-list-circle/disc/square, 
  --         number-list-1/i/a, image, link, button, grid, html-content, header, 
  --         footer, line-break, static-text, mixed-content, labeled-content, container
  type VARCHAR(50) NOT NULL UNIQUE,
  
  -- Human-readable name shown in UI (e.g., "Heading 1", "Bullet List")
  -- Why: Users see this when selecting sections to add
  label VARCHAR(100) NOT NULL,
  
  -- Explanation of what this section does
  -- Why: Helps users understand when to use this section type
  description TEXT,
  
  -- Grouping for organization in UI ('text', 'media', 'layout', 'interactive')
  -- Why: Sections are grouped by category in the section library
  category VARCHAR(50) NOT NULL,
  
  -- Default placeholder content when section is added
  -- Why: Provides example text so users aren't starting with blank sections
  default_content TEXT,
  
  -- Flag: true if user created this custom section, false for built-in sections
  -- Why: Lets users create and save their own reusable section types
  is_custom BOOLEAN DEFAULT false,
  
  -- User ID who created this custom section (null for built-in sections)
  -- Why: Track ownership of custom sections for permissions
  created_by UUID,
  
  -- Timestamps for auditing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_sections_category ON sections(category);
CREATE INDEX idx_sections_custom ON sections(is_custom, created_by);

-- ================================================================
-- TEMPLATES TABLE
-- Purpose: Stores complete templates built by users
-- Why: Each template is a reusable document that can be executed multiple times
-- ================================================================
CREATE TABLE templates (
  -- Unique identifier for this template
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template name shown in lists (e.g., "Welcome Email", "Incident Report")
  -- Why: Users need to identify and find their templates
  name VARCHAR(255) NOT NULL,
  
  -- Complete generated HTML output with Thymeleaf variables
  -- Why: Stores the final HTML that will be rendered when template runs
  -- Stores: Full HTML with <th:utext="${variableName}"> placeholders
  html TEXT NOT NULL,
  
  -- User who created this template (for multi-user systems)
  -- Why: Track ownership for permissions and filtering
  user_id UUID,
  
  -- Timestamps for auditing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_created_at ON templates(created_at DESC);

-- ================================================================
-- TEMPLATE_SECTIONS TABLE
-- Purpose: Stores each section instance within a template with its specific content
-- Why: Templates are made up of multiple sections; this links sections to templates
-- Relationship: Many sections belong to one template
-- ================================================================
CREATE TABLE template_sections (
  -- Unique identifier for this section instance
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which template this section belongs to
  -- Why: Links section to its parent template
  -- Relationship: Foreign key to templates.id (CASCADE delete when template deleted)
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Type of section (references sections.type)
  -- Why: Determines how this section renders (heading, paragraph, table, etc.)
  -- Stores: 'heading1', 'mixed-content', 'labeled-content', 'table', etc.
  section_type VARCHAR(50) NOT NULL,
  
  -- The actual content for this section instance
  -- Why: Each section needs its own text/data (not just the default)
  -- Stores: User-entered text, can include {{variable}} placeholders
  content TEXT NOT NULL,
  
  -- Section-specific variables and their values (JSON format)
  -- Why: Each section can have different variables (lists, tables, etc.)
  -- Stores: {"items": [{"text": "Item 1", "color": "#000", "bold": true}], 
  --          "tableData": [[{"text": "Cell 1"}]], "label": "Field Name"}
  variables JSONB DEFAULT '{}',
  
  -- Custom styling for this section (JSON format)
  -- Why: Users can customize appearance per section
  -- Stores: {"fontSize": "16px", "color": "#000", "backgroundColor": "#fff", 
  --          "textAlign": "center", "fontWeight": "bold"}
  styles JSONB DEFAULT '{}',
  
  -- For labeled-content sections: controls if label can be edited at runtime
  -- Why: Template designers may want to lock labels but allow content editing
  -- Stores: true = users can edit label when running template, false = label locked
  is_label_editable BOOLEAN DEFAULT true,
  
  -- Position in the template or within parent container (0, 1, 2, ...)
  -- Why: Sections must render in the correct order
  -- Stores: Integer starting at 0, determines display order
  order_index INTEGER NOT NULL,
  
  -- Parent section ID for nested sections (null for top-level sections)
  -- Why: Container sections can hold child sections (nested structure)
  -- Relationship: Self-referencing foreign key (CASCADE delete with parent)
  -- Stores: UUID of parent section, or NULL for root-level sections
  parent_section_id UUID REFERENCES template_sections(id) ON DELETE CASCADE,
  
  -- Timestamp for auditing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_template_sections_template_id ON template_sections(template_id);
CREATE INDEX idx_template_sections_order ON template_sections(template_id, order_index);
CREATE INDEX idx_template_sections_parent ON template_sections(parent_section_id);

-- ================================================================
-- TEMPLATE_RUNS TABLE
-- Purpose: Audit log of every time a template is executed/sent
-- Why: Track template usage, debug issues, and maintain history
-- Relationship: Many runs can exist for one template
-- ================================================================
CREATE TABLE template_runs (
  -- Unique identifier for this execution
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which template was executed
  -- Why: Links this run to its template
  -- Relationship: Foreign key to templates.id (CASCADE delete with template)
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Primary recipient email addresses
  -- Why: Record who received this template
  -- Stores: Array of email strings: ['user1@example.com', 'user2@example.com']
  to_emails TEXT[] NOT NULL,
  
  -- CC (carbon copy) recipient email addresses
  -- Why: Track who was copied on this send
  -- Stores: Array of email strings (can be empty)
  cc_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- BCC (blind carbon copy) recipient email addresses
  -- Why: Track hidden recipients
  -- Stores: Array of email strings (can be empty)
  bcc_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Variable values used in this specific run (JSON format)
  -- Why: Must record what data was used to generate the output
  -- Stores: {"name": "John Doe", "incidentNumber": "INC-123", "priority": "High"}
  variables JSONB DEFAULT '{}',
  
  -- Final rendered HTML with all variables replaced
  -- Why: Exact copy of what was sent, for auditing and debugging
  -- Stores: Complete HTML with {{variables}} replaced with actual values
  html_output TEXT NOT NULL,
  
  -- When this template was executed
  -- Why: Timestamp for audit trail and sorting
  run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Execution status
  -- Why: Track if send succeeded or failed
  -- Stores: 'sent', 'failed', 'pending'
  status VARCHAR(50) DEFAULT 'sent',
  
  -- User who executed this template
  -- Why: Track who ran the template for accountability
  user_id UUID
);

CREATE INDEX idx_template_runs_template_id ON template_runs(template_id);
CREATE INDEX idx_template_runs_run_at ON template_runs(run_at DESC);
CREATE INDEX idx_template_runs_user_id ON template_runs(user_id);

-- ================================================================
-- SECTION_VARIABLES TABLE
-- Purpose: Defines what variables are available for each section type
-- Why: Different sections need different types of variables (text vs list vs table)
-- Relationship: Many variables can be defined for one section type
-- ================================================================
CREATE TABLE section_variables (
  -- Unique identifier for this variable definition
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which section type this variable belongs to
  -- Why: Links variable to its section type
  -- Stores: References sections.type (e.g., 'labeled-content', 'mixed-content')
  section_type VARCHAR(50) NOT NULL,
  
  -- Internal variable name (used in code)
  -- Why: How the system refers to this variable
  -- Stores: Camel case identifier like 'items', 'tableData', 'label'
  variable_name VARCHAR(100) NOT NULL,
  
  -- Display name shown to users in UI
  -- Why: User-friendly label for editing
  -- Stores: "List Items", "Table Data", "Field Label"
  variable_label VARCHAR(100) NOT NULL,
  
  -- Data type of this variable
  -- Why: Determines what editor UI to show (text input vs list editor vs table editor)
  -- Stores: 'text', 'url', 'list', 'table'
  variable_type VARCHAR(50) NOT NULL,
  
  -- Default value when section is first added (JSON format)
  -- Why: Provides starter data so sections aren't empty
  -- Stores: String, array, or object depending on type
  --         Text: "Default text"
  --         List: ["Item 1", "Item 2"]
  --         Table: [["Cell 1", "Cell 2"], ["Cell 3", "Cell 4"]]
  default_value JSONB,
  
  -- Timestamp for auditing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure no duplicate variable names per section type
  UNIQUE(section_type, variable_name)
);

CREATE INDEX idx_section_variables_type ON section_variables(section_type);

-- ================================================================
-- API_TEMPLATES TABLE
-- Purpose: Pre-configured API endpoint templates (Jira, GitHub, ServiceNow, etc.)
-- Why: Reusable API configurations that templates can use to fetch external data
-- ================================================================
CREATE TABLE api_templates (
  -- Unique identifier for this API template
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Display name for this API template
  -- Why: Users select APIs by name
  -- Stores: "Jira - Get Issue", "GitHub - Repository Info", "ServiceNow - Incident"
  name VARCHAR(255) NOT NULL,
  
  -- Explanation of what this API does
  -- Why: Helps users understand the API's purpose
  description TEXT,
  
  -- API service category
  -- Why: Group related APIs together in UI
  -- Stores: 'jira', 'github', 'servicenow', 'rest', 'custom'
  category VARCHAR(100),
  
  -- API URL with parameter placeholders
  -- Why: Flexible URL that can be customized per template
  -- Stores: 'https://{domain}.atlassian.net/rest/api/{version}/issue/{issueKey}'
  --         Placeholders in {braces} will be replaced with user values
  url_template TEXT NOT NULL,
  
  -- HTTP method for this API call
  -- Why: Different APIs use different methods
  -- Stores: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
  method VARCHAR(10) NOT NULL,
  
  -- HTTP headers with placeholders (JSON format)
  -- Why: APIs often need authentication headers or content-type
  -- Stores: {"Authorization": "Bearer {apiToken}", "Content-Type": "application/json"}
  headers JSONB DEFAULT '{}',
  
  -- Request body template for POST/PUT requests
  -- Why: Some APIs require a request body with data
  -- Stores: JSON string with placeholders: '{"priority": "{priority}", "status": "{status}"}'
  body_template TEXT,
  
  -- Flag: true if user created this custom API, false for built-in
  -- Why: Allow users to add their own APIs
  is_custom BOOLEAN DEFAULT false,
  
  -- User who created this custom API
  -- Why: Track ownership for custom APIs
  created_by UUID,
  
  -- Timestamp for auditing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_templates_category ON api_templates(category);

-- ================================================================
-- API_TEMPLATE_PARAMS TABLE
-- Purpose: Defines what parameters each API template requires
-- Why: Each API needs different parameters (domain, API key, issue number, etc.)
-- Relationship: Many parameters belong to one API template
-- ================================================================
CREATE TABLE api_template_params (
  -- Unique identifier for this parameter definition
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which API template this parameter belongs to
  -- Why: Links parameter to its API template
  -- Relationship: Foreign key to api_templates.id (CASCADE delete with template)
  api_template_id UUID NOT NULL REFERENCES api_templates(id) ON DELETE CASCADE,
  
  -- Internal parameter name (matches placeholder in URL/headers/body)
  -- Why: Must match {placeholders} in url_template
  -- Stores: 'domain', 'version', 'issueKey', 'apiToken'
  param_name VARCHAR(100) NOT NULL,
  
  -- Display label shown to users
  -- Why: User-friendly name for input field
  -- Stores: "JIRA Domain", "API Version", "Issue Key", "API Token"
  param_label VARCHAR(100) NOT NULL,
  
  -- Input type for UI
  -- Why: Determines what input control to show
  -- Stores: 'text' (text input), 'number' (numeric), 'select' (dropdown)
  param_type VARCHAR(50) NOT NULL,
  
  -- Where this parameter goes in the request
  -- Why: System needs to know how to use this parameter
  -- Stores: 'path' (in URL), 'query' (URL ?param=value), 'header', 'body'
  param_location VARCHAR(50) NOT NULL,
  
  -- Placeholder text shown in input field
  -- Why: Provides example to help users
  -- Stores: "e.g., mycompany", "e.g., INC-12345"
  placeholder TEXT,
  
  -- Whether this parameter is mandatory
  -- Why: Validation to ensure API calls have required data
  -- Stores: true = must provide value, false = optional
  required BOOLEAN DEFAULT true,
  
  -- Explanation of what this parameter does
  -- Why: Help text for users
  description TEXT,
  
  -- Available options for 'select' type parameters (JSON array)
  -- Why: Dropdown needs list of choices
  -- Stores: ["v1", "v2", "v3"] or ["High", "Medium", "Low"]
  options JSONB,
  
  -- Timestamp for auditing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure no duplicate parameter names per API template
  UNIQUE(api_template_id, param_name)
);

CREATE INDEX idx_api_template_params_template ON api_template_params(api_template_id);

-- ================================================================
-- TEMPLATE_API_CONFIGS TABLE
-- Purpose: Links templates to APIs with user-provided parameter values
-- Why: Each template can integrate with one API to fetch dynamic data
-- Relationship: One template has one API config (1:1)
-- ================================================================
CREATE TABLE template_api_configs (
  -- Unique identifier for this API configuration
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which template this API config belongs to
  -- Why: Links API settings to its template
  -- Relationship: Foreign key to templates.id (CASCADE delete with template)
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Which API template to use
  -- Why: References the pre-configured API
  -- Relationship: Foreign key to api_templates.id
  api_template_id UUID NOT NULL REFERENCES api_templates(id),
  
  -- Whether API integration is active for this template
  -- Why: Users can toggle API on/off without losing configuration
  -- Stores: true = API calls enabled, false = disabled
  enabled BOOLEAN DEFAULT false,
  
  -- User-provided values for API parameters (JSON format)
  -- Why: Each template needs its own API parameter values
  -- Stores: {"domain": "mycompany", "version": "v2", "issueKey": "PROJ-123", "apiToken": "xyz"}
  --         Keys match param_name from api_template_params
  param_values JSONB DEFAULT '{}',
  
  -- Timestamps for auditing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Each template can have only one API configuration
  UNIQUE(template_id)
);

CREATE INDEX idx_template_api_configs_template ON template_api_configs(template_id);

-- ================================================================
-- API_MAPPINGS TABLE
-- Purpose: Maps data from API responses to specific sections in templates
-- Why: API returns JSON; we need to extract specific fields and put them in sections
-- Relationship: Many mappings belong to one API config; each mapping targets one section
-- ================================================================
CREATE TABLE api_mappings (
  -- Unique identifier for this mapping
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Which API config this mapping belongs to
  -- Why: Links mapping to template's API configuration
  -- Relationship: Foreign key to template_api_configs.id (CASCADE delete with config)
  template_api_config_id UUID NOT NULL REFERENCES template_api_configs(id) ON DELETE CASCADE,
  
  -- Which section will receive the API data
  -- Why: Specifies destination for extracted data
  -- Relationship: Foreign key to template_sections.id (CASCADE delete with section)
  section_id UUID NOT NULL REFERENCES template_sections(id) ON DELETE CASCADE,
  
  -- JSONPath expression to extract data from API response
  -- Why: API returns nested JSON; we need to navigate to the right field
  -- Stores: 'fields.summary', 'data.items[0].title', 'response.user.email'
  --         JSONPath syntax to traverse JSON structure
  api_path TEXT NOT NULL,
  
  -- Type of data being mapped
  -- Why: Determines how to process and display the data
  -- Stores: 'text' (plain text), 'list' (array), 'html' (formatted HTML)
  data_type VARCHAR(50) NOT NULL,
  
  -- Which variable in the section to populate (optional)
  -- Why: Section may have multiple variables; specify which one gets API data
  -- Stores: 'title', 'description', 'items', 'label'
  --         If null, data replaces entire section content
  variable_name VARCHAR(100),
  
  -- Timestamp for auditing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_mappings_config ON api_mappings(template_api_config_id);
CREATE INDEX idx_api_mappings_section ON api_mappings(section_id);

-- ================================================================
-- RELATIONSHIPS SUMMARY WITH EXPLANATIONS
-- ================================================================
/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         DATABASE RELATIONSHIPS                                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝

1. sections → section_variables (One-to-Many)
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ Purpose: Each section type can have multiple variable definitions       │
   │ Example: 'labeled-content' section has variables: 'label', 'content'   │
   │ Why: Different section types need different customization options       │
   │ Cascade: Deleting a section type removes its variable definitions      │
   └─────────────────────────────────────────────────────────────────────────┘

2. templates → template_sections (One-to-Many)
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ Purpose: One template contains many section instances                   │
   │ Example: "Welcome Email" template has 5 sections (heading, paragraph...)│
   │ Why: Templates are built by combining multiple sections                 │
   │ Cascade: Deleting a template removes all its sections                  │
   └─────────────────────────────────────────────────────────────────────────┘

3. template_sections → template_sections (Self-Reference, One-to-Many)
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ Purpose: Container sections can hold child sections (nesting)           │
   │ Example: Container section contains 3 child sections inside it         │
   │ Why: Enables drag-and-drop sections into containers for grouping       │
   │ Field: parent_section_id (NULL for root sections, UUID for children)   │
   │ Cascade: Deleting a container removes all child sections inside it     │
   └─────────────────────────────────────────────────────────────────────────┘

4. templates → template_runs (One-to-Many)
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ Purpose: Track every time a template is executed                        │
   │ Example: "Incident Report" template run 25 times → 25 run records      │
   │ Why: Audit trail of all template executions with variables used        │
   │ Cascade: Deleting a template removes its execution history             │
   └─────────────────────────────────────────────────────────────────────────┘

5. api_templates → api_template_params (One-to-Many)
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ Purpose: Each API template defines its required parameters              │
   │ Example: "Jira API" needs parameters: domain, version, issueKey        │
   │ Why: Different APIs require different configuration values             │
   │ Cascade: Deleting an API template removes its parameter definitions    │
   └─────────────────────────────────────────────────────────────────────────┘

6. templates → template_api_configs (One-to-One)
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ Purpose: Each template can have ONE API configuration                   │
   │ Example: "Incident Report" uses "Jira API" with specific parameters    │
   │ Why: Links template to external data source with user's values         │
   │ Constraint: UNIQUE(template_id) ensures one API per template           │
   │ Cascade: Deleting a template removes its API configuration             │
   └─────────────────────────────────────────────────────────────────────────┘

7. api_templates → template_api_configs (One-to-Many)
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ Purpose: One API template can be used by many different templates       │
   │ Example: "Jira API" template used by 10 different user templates       │
   │ Why: Reusability - same API config reused across templates             │
   │ No Cascade: Deleting API template keeps configs (set to ON UPDATE)     │
   └─────────────────────────────────────────────────────────────────────────┘

8. template_api_configs → api_mappings (One-to-Many)
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ Purpose: One API config can map multiple response fields to sections    │
   │ Example: Jira response maps 'summary' to heading, 'description' to body│
   │ Why: Extract different fields from API response to different sections  │
   │ Cascade: Deleting API config removes all its data mappings             │
   └─────────────────────────────────────────────────────────────────────────┘

9. template_sections → api_mappings (One-to-Many)
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ Purpose: One section can receive data from multiple API paths           │
   │ Example: One section gets 'title' from one API field, 'date' from other│
   │ Why: Sections can be populated with multiple pieces of API data        │
   │ Cascade: Deleting a section removes mappings that target it            │
   └─────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║                          CASCADE DELETE BEHAVIOR                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

When you DELETE a template:
  ├─> All template_sections are deleted (CASCADE)
  ├─> All template_runs are deleted (CASCADE)
  ├─> The template_api_configs is deleted (CASCADE)
  └─> All api_mappings are deleted (CASCADE via template_api_configs)

When you DELETE a section type:
  └─> All section_variables are deleted (CASCADE)

When you DELETE a container section:
  └─> All child sections inside it are deleted (CASCADE)

When you DELETE an API template:
  └─> All api_template_params are deleted (CASCADE)

*/

-- ================================================================
-- EXAMPLE QUERIES
-- ================================================================

-- Get a template with all its sections and API config
SELECT 
  t.id,
  t.name,
  t.html,
  json_agg(
    json_build_object(
      'id', ts.id,
      'section_type', ts.section_type,
      'content', ts.content,
      'variables', ts.variables,
      'styles', ts.styles,
      'order_index', ts.order_index,
      'parent_section_id', ts.parent_section_id
    ) ORDER BY ts.order_index
  ) as sections,
  json_build_object(
    'enabled', tac.enabled,
    'template_id', tac.api_template_id,
    'param_values', tac.param_values
  ) as api_config
FROM templates t
LEFT JOIN template_sections ts ON t.id = ts.template_id
LEFT JOIN template_api_configs tac ON t.id = tac.template_id
WHERE t.id = 'YOUR_TEMPLATE_ID'
GROUP BY t.id, t.name, t.html, tac.enabled, tac.api_template_id, tac.param_values;

-- Get template run history with details
SELECT 
  tr.id,
  t.name as template_name,
  tr.to_emails,
  tr.cc_emails,
  tr.bcc_emails,
  tr.variables,
  tr.run_at,
  tr.status
FROM template_runs tr
JOIN templates t ON tr.template_id = t.id
WHERE tr.template_id = 'YOUR_TEMPLATE_ID'
ORDER BY tr.run_at DESC;

-- Get all templates with section counts
SELECT 
  t.id,
  t.name,
  t.created_at,
  COUNT(ts.id) as section_count
FROM templates t
LEFT JOIN template_sections ts ON t.id = ts.template_id
GROUP BY t.id, t.name, t.created_at
ORDER BY t.created_at DESC;

-- Get API mappings for a template
SELECT 
  am.id,
  am.api_path,
  am.data_type,
  am.variable_name,
  ts.section_type,
  ts.content
FROM api_mappings am
JOIN template_api_configs tac ON am.template_api_config_id = tac.id
JOIN template_sections ts ON am.section_id = ts.id
WHERE tac.template_id = 'YOUR_TEMPLATE_ID';

-- Get nested sections hierarchy
WITH RECURSIVE section_tree AS (
  -- Root sections (no parent)
  SELECT 
    id, template_id, section_type, content, variables, 
    parent_section_id, order_index, 0 as depth
  FROM template_sections
  WHERE template_id = 'YOUR_TEMPLATE_ID' AND parent_section_id IS NULL
  
  UNION ALL
  
  -- Child sections
  SELECT 
    ts.id, ts.template_id, ts.section_type, ts.content, ts.variables,
    ts.parent_section_id, ts.order_index, st.depth + 1
  FROM template_sections ts
  INNER JOIN section_tree st ON ts.parent_section_id = st.id
)
SELECT * FROM section_tree ORDER BY depth, order_index;
```

## Data Flow Example

### 1. Creating a Template with Nested Sections
```sql
-- Insert template
INSERT INTO templates (name, html)
VALUES ('Welcome Email', '<h1>Welcome {{name}}!</h1><p>{{message}}</p>')
RETURNING id;

-- Insert container section
INSERT INTO template_sections (template_id, section_type, content, styles, order_index)
VALUES ('template-id', 'container', '', '{}', 0)
RETURNING id;

-- Insert nested sections inside container
INSERT INTO template_sections (template_id, section_type, content, variables, styles, order_index, parent_section_id)
VALUES 
  ('template-id', 'mixed-content', 'What''s New: {{update}}', 
   '{"content": "What''s New: {{update}}"}', '{"fontSize": "18px"}', 0, 'container-section-id'),
  ('template-id', 'heading1', 'Welcome {{name}}!', 
   '{"text": "{{name}}"}', '{"fontSize": "48px"}', 1, 'container-section-id');
```

### 2. Setting Up API Integration
```sql
-- Create API template
INSERT INTO api_templates (name, description, category, url_template, method)
VALUES (
  'JIRA Get Issue',
  'Fetch JIRA issue details',
  'jira',
  'https://{domain}.atlassian.net/rest/api/{version}/issue/{issueKey}',
  'GET'
)
RETURNING id;

-- Define API parameters
INSERT INTO api_template_params (api_template_id, param_name, param_label, param_type, param_location, required)
VALUES 
  ('api-template-id', 'domain', 'JIRA Domain', 'text', 'path', true),
  ('api-template-id', 'version', 'API Version', 'select', 'path', true),
  ('api-template-id', 'issueKey', 'Issue Key', 'text', 'path', true);

-- Link API to template
INSERT INTO template_api_configs (template_id, api_template_id, enabled, param_values)
VALUES (
  'template-id',
  'api-template-id',
  true,
  '{"domain": "mycompany", "version": "2", "issueKey": "PROJ-123"}'
);

-- Create data mappings
INSERT INTO api_mappings (template_api_config_id, section_id, api_path, data_type, variable_name)
VALUES 
  ('config-id', 'section-id', 'fields.summary', 'text', 'title'),
  ('config-id', 'section-id-2', 'fields.description', 'html', 'description');
```

### 3. Running a Template
```sql
INSERT INTO template_runs (
  template_id, 
  to_emails, 
  cc_emails, 
  bcc_emails, 
  variables, 
  html_output
)
VALUES (
  'template-id',
  ARRAY['user@example.com'],
  ARRAY['manager@example.com'],
  ARRAY[],
  '{"name": "John Doe", "message": "Welcome to our platform!", "update": "New features added"}',
  '<h1>Welcome John Doe!</h1><p>Welcome to our platform!</p>'
);
```

## Key Features of This Schema

1. **Nested Section Support**: Container sections can hold child sections via `parent_section_id`
2. **Drag-and-Drop Ready**: Sections can be dragged into containers with proper parent-child relationships
3. **Flexible Variables**: Each section stores its own variables as JSONB for complete flexibility
4. **Text Styling Per Item**: Variables support per-item styling with properties like `color`, `bold`, `italic`, `underline`, `backgroundColor`, `fontSize`
5. **Label Editability Control**: `is_label_editable` flag controls whether labeled-content labels can be edited at runtime
6. **API Integration**: Templates can fetch dynamic data from APIs with configurable mappings
7. **Custom Sections**: Users can create and save custom section types with `is_custom` flag
8. **Mixed Content**: Support for sections combining static text with dynamic placeholders using `{{variable}}` syntax
9. **Thymeleaf Integration**: Placeholders automatically convert to Thymeleaf syntax (`<th:utext="${variable}">`) in generated HTML
10. **Complete Audit Trail**: `template_runs` stores every execution with all variable values
11. **JSON Flexibility**: Styles, variables, and API configs stored as JSONB for dynamic customization
12. **Scalable**: Uses UUID for all IDs, proper indexing, and foreign keys with CASCADE
13. **Email Support**: Separate arrays for TO, CC, and BCC recipients

## Migrations

When implementing, create migrations in this order:
1. `sections` table first (no dependencies)
2. `section_variables` table (depends on sections)
3. `templates` table
4. `template_sections` table (depends on templates, self-referencing for nesting)
5. `template_runs` table (depends on templates)
6. `api_templates` table (no dependencies)
7. `api_template_params` table (depends on api_templates)
8. `template_api_configs` table (depends on templates and api_templates)
9. `api_mappings` table (depends on template_api_configs and template_sections)

## Schema Diagram

```
┌─────────────┐         ┌──────────────────┐
│  sections   │────────<│section_variables │
└─────────────┘         └──────────────────┘
      │
      │
      ▼
┌─────────────────┐     ┌──────────────────┐
│     templates   │────<│  template_runs   │
└─────────────────┘     └──────────────────┘
      │
      │
      ├────────────────────────────────────────┐
      │                                        │
      ▼                                        ▼
┌─────────────────────┐         ┌──────────────────────────┐
│ template_sections   │◄────┐   │ template_api_configs     │
└─────────────────────┘     │   └──────────────────────────┘
      │                     │              │
      │ (parent_section_id) │              │
      └─────────────────────┘              ▼
                                  ┌──────────────────┐
                                  │  api_mappings    │
                                  └──────────────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │  api_templates   │
                                  └──────────────────┘
                                           │
                                           ▼
                                  ┌──────────────────────┐
                                  │ api_template_params  │
                                  └──────────────────────┘
```
