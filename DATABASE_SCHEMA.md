# Database Schema for Page Builder Application

## Complete Database Model with Relationships

```sql
-- ================================================================
-- SECTIONS TABLE
-- Stores all available section types (heading, paragraph, table, etc.)
-- ================================================================
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL UNIQUE, -- Section types: heading1-6, text, paragraph, table, 
                                     -- bullet-list-circle/disc/square, number-list-1/i/a,
                                     -- image, link, button, grid, html-content, header, footer,
                                     -- line-break, static-text, mixed-content, labeled-content, container
  label VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'text', 'media', 'layout', 'interactive'
  default_content TEXT,
  is_custom BOOLEAN DEFAULT false, -- true for user-created custom sections
  created_by UUID, -- user_id for custom sections
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_sections_category ON sections(category);
CREATE INDEX idx_sections_custom ON sections(is_custom, created_by);

-- ================================================================
-- TEMPLATES TABLE
-- Stores user-created templates
-- ================================================================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  html TEXT NOT NULL, -- Complete generated HTML
  user_id UUID, -- Reference to user (if using authentication)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_created_at ON templates(created_at DESC);

-- ================================================================
-- TEMPLATE_SECTIONS TABLE
-- Junction table storing sections within a template
-- Supports nested sections via parent_section_id
-- ================================================================
CREATE TABLE template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  section_type VARCHAR(50) NOT NULL, -- References sections.type
  content TEXT NOT NULL, -- Actual content (can include variables like {{placeholder}})
  variables JSONB DEFAULT '{}', -- Section-specific variables: {"name": "value", "items": [{"text": "...", "color": "...", "bold": true}]}
  styles JSONB DEFAULT '{}', -- Custom styles: {"fontSize": "16px", "color": "#000", "backgroundColor": "#fff"}
  is_label_editable BOOLEAN DEFAULT true, -- For labeled-content: whether label can be edited at runtime
  order_index INTEGER NOT NULL, -- Position in template or within parent
  parent_section_id UUID REFERENCES template_sections(id) ON DELETE CASCADE, -- For nested sections (container)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_template_sections_template_id ON template_sections(template_id);
CREATE INDEX idx_template_sections_order ON template_sections(template_id, order_index);
CREATE INDEX idx_template_sections_parent ON template_sections(parent_section_id);

-- ================================================================
-- TEMPLATE_RUNS TABLE
-- Stores history of template executions/sends
-- ================================================================
CREATE TABLE template_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  to_emails TEXT[] NOT NULL, -- Array of recipient emails
  cc_emails TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of CC emails
  bcc_emails TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of BCC emails
  variables JSONB DEFAULT '{}', -- Variables used in this run: {"name": "John", "title": "Welcome"}
  html_output TEXT NOT NULL, -- Final HTML with variables replaced
  run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  user_id UUID -- Reference to user who ran the template
);

CREATE INDEX idx_template_runs_template_id ON template_runs(template_id);
CREATE INDEX idx_template_runs_run_at ON template_runs(run_at DESC);
CREATE INDEX idx_template_runs_user_id ON template_runs(user_id);

-- ================================================================
-- SECTION_VARIABLES TABLE
-- Defines available variables for each section type
-- ================================================================
CREATE TABLE section_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type VARCHAR(50) NOT NULL, -- References sections.type
  variable_name VARCHAR(100) NOT NULL,
  variable_label VARCHAR(100) NOT NULL,
  variable_type VARCHAR(50) NOT NULL, -- 'text', 'url', 'list', 'table'
  default_value JSONB, -- Default value (can be string, array, or object)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(section_type, variable_name)
);

CREATE INDEX idx_section_variables_type ON section_variables(section_type);

-- ================================================================
-- API_TEMPLATES TABLE
-- Stores reusable API configuration templates
-- ================================================================
CREATE TABLE api_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'jira', 'github', 'rest', etc.
  url_template TEXT NOT NULL, -- URL with placeholders: https://api.example.com/{version}/resource
  method VARCHAR(10) NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE'
  headers JSONB DEFAULT '{}', -- Header templates with placeholders
  body_template TEXT, -- Body template for POST/PUT with placeholders
  is_custom BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_templates_category ON api_templates(category);

-- ================================================================
-- API_TEMPLATE_PARAMS TABLE
-- Defines required parameters for each API template
-- ================================================================
CREATE TABLE api_template_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_template_id UUID NOT NULL REFERENCES api_templates(id) ON DELETE CASCADE,
  param_name VARCHAR(100) NOT NULL,
  param_label VARCHAR(100) NOT NULL,
  param_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'select'
  param_location VARCHAR(50) NOT NULL, -- 'query', 'path', 'body', 'header'
  placeholder TEXT,
  required BOOLEAN DEFAULT true,
  description TEXT,
  options JSONB, -- For 'select' type: ["option1", "option2"]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(api_template_id, param_name)
);

CREATE INDEX idx_api_template_params_template ON api_template_params(api_template_id);

-- ================================================================
-- TEMPLATE_API_CONFIGS TABLE
-- Stores API configurations for each template
-- ================================================================
CREATE TABLE template_api_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  api_template_id UUID NOT NULL REFERENCES api_templates(id),
  enabled BOOLEAN DEFAULT false,
  param_values JSONB DEFAULT '{}', -- User-provided values: {"version": "v2", "projectKey": "PROJ"}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id) -- One API config per template
);

CREATE INDEX idx_template_api_configs_template ON template_api_configs(template_id);

-- ================================================================
-- API_MAPPINGS TABLE
-- Maps API response data to template sections
-- ================================================================
CREATE TABLE api_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_api_config_id UUID NOT NULL REFERENCES template_api_configs(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES template_sections(id) ON DELETE CASCADE,
  api_path TEXT NOT NULL, -- JSONPath to extract data: data.items[0].summary
  data_type VARCHAR(50) NOT NULL, -- 'text', 'list', 'html'
  variable_name VARCHAR(100), -- Which variable in the section to update
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_mappings_config ON api_mappings(template_api_config_id);
CREATE INDEX idx_api_mappings_section ON api_mappings(section_id);

-- ================================================================
-- RELATIONSHIPS SUMMARY
-- ================================================================
/*
1. sections (1) ----< (many) template_sections
   - A section type can be used in many templates
   - Custom sections can be created by users (is_custom=true)
   
2. sections (1) ----< (many) section_variables
   - Each section type can have multiple variable definitions
   - Defines what variables are available for that section type
   
3. templates (1) ----< (many) template_sections
   - A template contains many sections
   - CASCADE delete: deleting template removes all its sections
   
4. template_sections (1) ----< (many) template_sections (self-reference)
   - Supports nested sections (container sections)
   - parent_section_id allows hierarchy
   - Enables drag-and-drop sections into containers
   
5. templates (1) ----< (many) template_runs
   - A template can be run multiple times
   - Each run stores the execution details and variable values used
   
6. templates (1) --- (1) template_api_configs
   - Each template can have one API configuration
   - Links to an API template with user-provided parameters
   
7. api_templates (1) ----< (many) api_template_params
   - Each API template defines its required parameters
   - Parameters can be in path, query, header, or body
   
8. template_api_configs (1) ----< (many) api_mappings
   - Each API config can have multiple data mappings
   - Maps API response data to specific sections and variables
   
9. api_mappings (many) ---- (1) template_sections
   - Links API data to specific sections for dynamic content
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
