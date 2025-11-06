# Database Schema for Page Builder Application

## Complete Database Model with Relationships

```sql
-- ================================================================
-- SECTIONS TABLE
-- Stores all available section types (heading, paragraph, etc.)
-- ================================================================
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL UNIQUE, -- 'heading1', 'heading2', 'paragraph', etc.
  label VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'text', 'media', 'layout', 'interactive'
  default_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_sections_category ON sections(category);

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
  content TEXT NOT NULL, -- Actual content (can include variables like {{name}})
  styles JSONB DEFAULT '{}', -- Custom styles as JSON
  order_index INTEGER NOT NULL, -- Position in template
  parent_section_id UUID REFERENCES template_sections(id) ON DELETE CASCADE, -- For nested sections
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
-- TEMPLATE_VARIABLES TABLE (Optional)
-- Tracks available variables per template for validation
-- ================================================================
CREATE TABLE template_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  variable_name VARCHAR(100) NOT NULL,
  variable_type VARCHAR(50) DEFAULT 'text', -- 'text', 'number', 'date', 'email'
  required BOOLEAN DEFAULT false,
  default_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, variable_name)
);

CREATE INDEX idx_template_variables_template_id ON template_variables(template_id);

-- ================================================================
-- RELATIONSHIPS SUMMARY
-- ================================================================
/*
1. sections (1) ----< (many) template_sections
   - A section type can be used in many templates
   
2. templates (1) ----< (many) template_sections
   - A template contains many sections
   - CASCADE delete: deleting template removes all its sections
   
3. template_sections (1) ----< (many) template_sections (self-reference)
   - Supports nested sections
   - parent_section_id allows hierarchy
   
4. templates (1) ----< (many) template_runs
   - A template can be run multiple times
   - Each run stores the execution details
   
5. templates (1) ----< (many) template_variables
   - Each template tracks its available variables
   - Used for validation and UI generation
*/

-- ================================================================
-- EXAMPLE QUERIES
-- ================================================================

-- Get a template with all its sections (ordered)
SELECT 
  t.id,
  t.name,
  t.html,
  json_agg(
    json_build_object(
      'id', ts.id,
      'section_type', ts.section_type,
      'content', ts.content,
      'styles', ts.styles,
      'order_index', ts.order_index,
      'parent_section_id', ts.parent_section_id
    ) ORDER BY ts.order_index
  ) as sections
FROM templates t
LEFT JOIN template_sections ts ON t.id = ts.template_id
WHERE t.id = 'YOUR_TEMPLATE_ID'
GROUP BY t.id, t.name, t.html;

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

-- Extract variables from a template (if using JSONB)
SELECT DISTINCT
  jsonb_object_keys(variables) as variable_name,
  template_id
FROM template_runs
WHERE template_id = 'YOUR_TEMPLATE_ID';
```

## Data Flow Example

### 1. Creating a Template
```sql
-- Insert template
INSERT INTO templates (name, html)
VALUES ('Welcome Email', '<h1>Welcome {{name}}!</h1><p>{{message}}</p>')
RETURNING id;

-- Insert template sections
INSERT INTO template_sections (template_id, section_type, content, styles, order_index)
VALUES 
  ('template-id', 'heading1', 'Welcome {{name}}!', '{"fontSize": "48px"}', 0),
  ('template-id', 'paragraph', '{{message}}', '{"fontSize": "16px"}', 1);

-- Track variables
INSERT INTO template_variables (template_id, variable_name, required)
VALUES 
  ('template-id', 'name', true),
  ('template-id', 'message', true);
```

### 2. Running a Template
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
  '{"name": "John Doe", "message": "Welcome to our platform!"}',
  '<h1>Welcome John Doe!</h1><p>Welcome to our platform!</p>'
);
```

## Key Features of This Schema

1. **Flexible Section Storage**: Sections can be nested using `parent_section_id`
2. **Complete Audit Trail**: `template_runs` stores every execution with all details
3. **Variable Tracking**: Templates can have validated variables
4. **JSON Flexibility**: Styles stored as JSONB for dynamic customization
5. **Scalable**: Uses UUID for all IDs, proper indexing, and foreign keys with CASCADE
6. **Email Support**: Separate arrays for TO, CC, and BCC recipients

## Migrations

When implementing, create migrations in this order:
1. `sections` table first (no dependencies)
2. `templates` table
3. `template_sections` table (depends on templates)
4. `template_runs` table (depends on templates)
5. `template_variables` table (depends on templates)
