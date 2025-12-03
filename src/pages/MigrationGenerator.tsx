import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileCode, Copy, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import styles from "./MigrationGenerator.module.scss";

const MigrationGenerator = () => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const migrations = {
    "001_create_sections": `-- ============================================================================
-- Migration: 001_create_sections.sql
-- Description: Create sections and section_variables tables
-- Database: MS SQL Server
-- ============================================================================

-- ============================================================================
-- TABLE: sections
-- ============================================================================
-- PURPOSE: Master catalog of all available section types (building blocks)
--          Users select from this catalog when adding sections to templates
-- 
-- RELATIONSHIPS:
--   - NO foreign keys (this is a parent/reference table)
--   - Referenced BY: section_variables.section_type (via type column)
--   - Referenced BY: template_sections.section_type (logical reference, not FK)
-- 
-- EXAMPLES OF SECTION TYPES:
--   heading1-6, paragraph, text, labeled-content, table, bullet-list, etc.
-- ============================================================================
CREATE TABLE sections (
  -- Primary Key: Unique identifier for each section type
  -- Type: UNIQUEIDENTIFIER (MS SQL Server equivalent of UUID)
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Section type identifier (e.g., 'heading1', 'paragraph', 'table')
  -- UNIQUE constraint ensures no duplicate section types
  -- Referenced by: section_variables.section_type, template_sections.section_type
  type NVARCHAR(50) NOT NULL UNIQUE,
  
  -- Human-readable name displayed in UI (e.g., "Heading 1", "Bullet List")
  -- Users see this label when selecting sections to add to templates
  label NVARCHAR(100) NOT NULL,
  
  -- Explanation of what this section does
  -- Shown as tooltip/help text in the section library
  description NVARCHAR(MAX),
  
  -- Category for grouping in UI: 'text', 'media', 'layout', 'interactive'
  -- Sections are organized by category in the section library sidebar
  category NVARCHAR(50) NOT NULL,
  
  -- Lucide icon name for visual identification in UI
  -- Examples: 'Heading1', 'Type', 'Table', 'List', 'Image'
  icon NVARCHAR(50),
  
  -- Default placeholder content when section is first added
  -- Provides example text so users don't start with empty sections
  default_content NVARCHAR(MAX),
  
  -- Flag: 1 = user-created custom section, 0 = built-in system section
  -- Custom sections allow users to create reusable section templates
  is_custom BIT DEFAULT 0,
  
  -- User ID who created this custom section (NULL for built-in sections)
  -- Used for filtering: show users only their own custom sections
  created_by UNIQUEIDENTIFIER,
  
  -- Audit timestamps
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Index on type for fast lookup (frequently queried)
CREATE INDEX idx_sections_type ON sections(type);
-- Index on category for filtering sections by category
CREATE INDEX idx_sections_category ON sections(category);
-- Composite index for filtering custom sections by creator
CREATE INDEX idx_sections_custom ON sections(is_custom, created_by);

-- ============================================================================
-- TABLE: section_variables
-- ============================================================================
-- PURPOSE: Defines what variables are available for each section type
--          Determines what editor UI to show (text input, list editor, table editor)
-- 
-- RELATIONSHIPS:
--   - FOREIGN KEY: section_type → sections.type (CASCADE on delete)
--     "Each variable definition belongs to a section type"
--   - Constraint: UNIQUE(section_type, variable_name) prevents duplicate vars per section
-- 
-- DATA TYPES:
--   variable_type can be: 'text', 'url', 'list', 'table'
--   Each type shows different editor UI:
--     - text: simple text input
--     - url: URL input with validation
--     - list: list editor with add/remove items
--     - table: grid editor with rows/columns
-- ============================================================================
CREATE TABLE section_variables (
  -- Primary Key
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- References sections.type - determines which section type this variable belongs to
  -- CASCADE: When a section type is deleted, its variables are also deleted
  section_type NVARCHAR(50) NOT NULL,
  
  -- Internal variable name used in code (e.g., 'items', 'tableData', 'label')
  -- This name is used in Thymeleaf expressions: <th:utext="\${variable_name}">
  variable_name NVARCHAR(100) NOT NULL,
  
  -- Display label shown in UI (e.g., "List Items", "Table Data", "Field Label")
  -- Users see this label when editing section variables
  variable_label NVARCHAR(100) NOT NULL,
  
  -- Data type determines which editor component to render
  -- Values: 'text' | 'url' | 'list' | 'table'
  variable_type NVARCHAR(50) NOT NULL,
  
  -- Default value when section is first added (stored as JSON string)
  -- Examples:
  --   text: "Default text"
  --   list: '["Item 1", "Item 2"]' or '[{"text":"Item 1","children":[]}]'
  --   table: '{"rows":[["H1","H2"],["D1","D2"]]}'
  default_value NVARCHAR(MAX),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Ensure no duplicate variable names per section type
  CONSTRAINT uk_section_variables UNIQUE(section_type, variable_name),
  
  -- FOREIGN KEY: Links to sections.type
  -- ON DELETE CASCADE: Remove variables when section type is deleted
  CONSTRAINT fk_section_variables_type FOREIGN KEY (section_type) REFERENCES sections(type)
);

-- Index for fast lookup of variables by section type
CREATE INDEX idx_section_variables_type ON section_variables(section_type);

GO`,

    "002_create_templates": `-- ============================================================================
-- Migration: 002_create_templates.sql
-- Description: Create templates and template_runs tables
-- Database: MS SQL Server
-- ============================================================================

-- ============================================================================
-- TABLE: templates
-- ============================================================================
-- PURPOSE: Stores user-created templates (the main documents users build)
--          Each template contains HTML with Thymeleaf variables
-- 
-- RELATIONSHIPS:
--   - NO foreign keys (this is a parent table)
--   - Referenced BY: template_sections.template_id (1:Many)
--   - Referenced BY: template_runs.template_id (1:Many)
--   - Referenced BY: template_api_configs.template_id (1:1)
-- 
-- CASCADE BEHAVIOR:
--   When a template is deleted:
--   → All template_sections are deleted
--   → All template_runs are deleted
--   → The template_api_configs is deleted
-- ============================================================================
CREATE TABLE templates (
  -- Primary Key: Unique template identifier
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Template name displayed in lists (e.g., "Welcome Email", "Incident Report")
  -- Users identify and search templates by this name
  name NVARCHAR(255) NOT NULL,
  
  -- Complete generated HTML output with Thymeleaf variables
  -- Contains: <th:utext="\${variableName}"> placeholders for dynamic content
  -- This is the final HTML that gets rendered when template is executed
  html NVARCHAR(MAX) NOT NULL,
  
  -- Owner user ID (for multi-user systems)
  -- Used for filtering: show users only their own templates
  -- Can reference your authentication system's user table
  user_id UNIQUEIDENTIFIER,
  
  -- Audit timestamps
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Index for filtering templates by user
CREATE INDEX idx_templates_user_id ON templates(user_id);
-- Index for sorting templates by creation date (newest first)
CREATE INDEX idx_templates_created_at ON templates(created_at DESC);

-- ============================================================================
-- TABLE: template_runs
-- ============================================================================
-- PURPOSE: Audit log of every template execution
--          Records who received the template, what variables were used, final output
-- 
-- RELATIONSHIPS:
--   - FOREIGN KEY: template_id → templates.id (CASCADE on delete)
--     "Each run belongs to exactly one template"
-- 
-- USE CASES:
--   - Audit trail: "When was this email sent? To whom? With what data?"
--   - Debugging: Compare expected vs actual output
--   - Analytics: Track template usage frequency
-- ============================================================================
CREATE TABLE template_runs (
  -- Primary Key
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- FOREIGN KEY: Links to templates.id
  -- CASCADE: Delete run records when template is deleted
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Primary recipient email addresses (stored as JSON array)
  -- Example: '["user1@example.com", "user2@example.com"]'
  to_emails NVARCHAR(MAX),
  
  -- CC (carbon copy) recipients (stored as JSON array)
  -- Example: '["manager@example.com"]' or '[]' if none
  cc_emails NVARCHAR(MAX),
  
  -- BCC (blind carbon copy) recipients (stored as JSON array)
  -- Hidden recipients - Example: '["audit@company.com"]'
  bcc_emails NVARCHAR(MAX),
  
  -- Variable values used in this specific run (stored as JSON object)
  -- Records exact data that was substituted into template
  -- Example: '{"name": "John Doe", "incidentNumber": "INC-123", "priority": "High"}'
  variables NVARCHAR(MAX),
  
  -- Final rendered HTML with all variables replaced
  -- This is the EXACT output that was sent (for auditing/debugging)
  html_output NVARCHAR(MAX) NOT NULL,
  
  -- Timestamp when this template was executed
  run_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Execution status: 'sent', 'failed', 'pending'
  -- Track if the send succeeded or failed
  status NVARCHAR(50) DEFAULT 'sent',
  
  -- User who executed this template (for accountability)
  user_id UNIQUEIDENTIFIER,
  
  -- FOREIGN KEY: Links to templates.id
  -- ON DELETE CASCADE: Remove run history when template is deleted
  CONSTRAINT fk_template_runs_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- Index for finding all runs of a specific template
CREATE INDEX idx_template_runs_template_id ON template_runs(template_id);
-- Index for sorting runs by date (newest first)
CREATE INDEX idx_template_runs_run_at ON template_runs(run_at DESC);
-- Index for finding all runs by a specific user
CREATE INDEX idx_template_runs_user_id ON template_runs(user_id);

GO`,

    "003_create_template_sections": `-- ============================================================================
-- Migration: 003_create_template_sections.sql
-- Description: Create template_sections table with self-referencing for nested sections
-- Database: MS SQL Server
-- ============================================================================

-- ============================================================================
-- TABLE: template_sections
-- ============================================================================
-- PURPOSE: Stores actual section instances within templates
--          Each row = one section placed in a template with its content & styling
-- 
-- RELATIONSHIPS:
--   - FOREIGN KEY: template_id → templates.id (CASCADE)
--     "Each section belongs to exactly one template"
--   
--   - FOREIGN KEY: parent_section_id → template_sections.id (SELF-REFERENCE)
--     "Container sections can hold child sections (nested structure)"
--     NULL = root-level section, UUID = child of that section
-- 
-- JSON COLUMNS:
--   - variables: Stores section-specific data (list items, table data, labels)
--   - styles: Stores section-specific styling (fontSize, color, backgroundColor)
-- 
-- NESTED LISTS SUPPORT:
--   The variables column can store nested list structures:
--   {
--     "items": [
--       {"text": "Item 1", "bold": true, "color": "#FF0000", "children": [
--         {"text": "Sub-item 1.1", "italic": true, "children": []}
--       ]}
--     ]
--   }
-- ============================================================================
CREATE TABLE template_sections (
  -- Primary Key
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- FOREIGN KEY: Links to templates.id
  -- Each section must belong to a template
  -- CASCADE: Delete sections when template is deleted
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Section type (references sections.type conceptually, not FK)
  -- Determines how this section renders and what features it has
  -- Examples: 'heading1', 'paragraph', 'labeled-content', 'table', 'container'
  section_type NVARCHAR(50) NOT NULL,
  
  -- The actual content for this section instance
  -- Can include {{variable}} placeholders that get converted to Thymeleaf
  -- Example: "Welcome {{customerName}} to our service"
  content NVARCHAR(MAX) NOT NULL,
  
  -- Section-specific variables and data (stored as JSON object)
  -- Structure varies by section_type:
  --   labeled-content: {"label": "...", "contentType": "list", "items": [...], "listStyle": "disc"}
  --   table: {"rows": [[{text, style}]], "showBorder": true, "mergedCells": {}}
  --   list types: {"items": ["Item 1", "Item 2"]}
  -- 
  -- NESTED LIST STRUCTURE (for labeled-content with contentType='list'):
  --   {
  --     "items": [
  --       {
  --         "text": "Main item",           -- Display text
  --         "bold": true,                  -- Bold formatting
  --         "italic": false,               -- Italic formatting
  --         "underline": false,            -- Underline formatting
  --         "color": "#000000",            -- Text color (hex)
  --         "backgroundColor": "#FFFFFF",  -- Background color (hex)
  --         "fontSize": "14px",            -- Font size
  --         "children": [                  -- Nested sub-items (max 3 levels)
  --           {"text": "Sub-item", "children": []}
  --         ]
  --       }
  --     ]
  --   }
  variables NVARCHAR(MAX),
  
  -- Custom styling for this specific section instance (stored as JSON object)
  -- Example: {"fontSize": "18px", "color": "#333", "backgroundColor": "#f5f5f5",
  --           "textAlign": "center", "fontWeight": "bold", "padding": "10px"}
  styles NVARCHAR(MAX),
  
  -- For labeled-content sections: controls if label can be edited at runtime
  -- 1 = users CAN edit the label when running template
  -- 0 = label is LOCKED and cannot be modified at runtime
  -- Allows template designers to control which fields end-users can customize
  is_label_editable BIT DEFAULT 1,
  
  -- Position/order within the template or parent container (0, 1, 2, ...)
  -- Sections render in order_index order
  order_index INT NOT NULL,
  
  -- SELF-REFERENCING FOREIGN KEY for nested sections
  -- NULL = this is a root-level section (top level of template)
  -- UUID = this section is INSIDE another section (the parent)
  -- Used for: Container sections that hold child sections
  -- CASCADE: Deleting a container deletes all children inside it
  parent_section_id UNIQUEIDENTIFIER,
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- FOREIGN KEY: Links to templates.id
  -- ON DELETE CASCADE: Remove all sections when template is deleted
  CONSTRAINT fk_template_sections_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  
  -- SELF-REFERENCING FOREIGN KEY for nested structure
  -- ON DELETE CASCADE would cause issues with self-reference, handled by app logic
  CONSTRAINT fk_template_sections_parent FOREIGN KEY (parent_section_id) REFERENCES template_sections(id)
);

-- Index for finding all sections of a template
CREATE INDEX idx_template_sections_template_id ON template_sections(template_id);
-- Composite index for ordering sections within a template
CREATE INDEX idx_template_sections_order ON template_sections(template_id, order_index);
-- Index for finding child sections of a parent
CREATE INDEX idx_template_sections_parent ON template_sections(parent_section_id);

GO`,

    "004_create_api_templates": `-- ============================================================================
-- Migration: 004_create_api_templates.sql
-- Description: Create API templates and parameters tables
-- Database: MS SQL Server
-- ============================================================================

-- ============================================================================
-- TABLE: api_templates
-- ============================================================================
-- PURPOSE: Pre-configured API endpoint templates (Jira, GitHub, ServiceNow, etc.)
--          Reusable API configurations that multiple templates can use
-- 
-- RELATIONSHIPS:
--   - NO foreign keys (this is a parent table for API configs)
--   - Referenced BY: api_template_params.api_template_id (1:Many)
--   - Referenced BY: template_api_configs.api_template_id (1:Many)
-- 
-- URL TEMPLATE PLACEHOLDERS:
--   url_template contains {placeholder} values that get replaced:
--   'https://{domain}.atlassian.net/rest/api/{version}/issue/{issueKey}'
--   → placeholders match param_name in api_template_params
-- ============================================================================
CREATE TABLE api_templates (
  -- Primary Key
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- Display name for this API template (shown in dropdown)
  -- Examples: "Jira - Get Issue", "GitHub - Repository Info", "ServiceNow - Incident"
  name NVARCHAR(255) NOT NULL,
  
  -- Explanation of what this API does
  -- Shown as help text when selecting APIs
  description NVARCHAR(MAX),
  
  -- API service category for grouping in UI
  -- Examples: 'jira', 'github', 'servicenow', 'rest', 'custom'
  category NVARCHAR(100),
  
  -- API URL with {parameter} placeholders
  -- Placeholders in {braces} will be replaced with user-provided values
  -- Example: 'https://{domain}.atlassian.net/rest/api/{version}/issue/{issueKey}'
  url_template NVARCHAR(MAX) NOT NULL,
  
  -- HTTP method for this API call
  -- Values: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
  method NVARCHAR(10) NOT NULL,
  
  -- HTTP headers with {parameter} placeholders (stored as JSON object)
  -- Example: {"Authorization": "Bearer {apiToken}", "Content-Type": "application/json"}
  -- Placeholders get replaced with values from template_api_configs.param_values
  headers NVARCHAR(MAX),
  
  -- Request body template for POST/PUT requests (JSON string with placeholders)
  -- Example: '{"priority": "{priority}", "status": "{status}"}'
  -- Only used for methods that have request bodies
  body_template NVARCHAR(MAX),
  
  -- Flag: 1 = user-created custom API, 0 = built-in system API
  is_custom BIT DEFAULT 0,
  
  -- User who created this custom API template
  created_by UNIQUEIDENTIFIER,
  
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Index for filtering APIs by category
CREATE INDEX idx_api_templates_category ON api_templates(category);

-- ============================================================================
-- TABLE: api_template_params
-- ============================================================================
-- PURPOSE: Defines required parameters for each API template
--          Parameters get substituted into url_template, headers, body_template
-- 
-- RELATIONSHIPS:
--   - FOREIGN KEY: api_template_id → api_templates.id (CASCADE)
--     "Each parameter belongs to exactly one API template"
--   - Constraint: UNIQUE(api_template_id, param_name) prevents duplicate params
-- 
-- PARAM_LOCATION VALUES:
--   - 'path': Parameter goes into URL path (replaces {placeholder})
--   - 'query': Parameter added as ?param=value in URL
--   - 'header': Parameter goes into HTTP headers
--   - 'body': Parameter inserted into request body
-- ============================================================================
CREATE TABLE api_template_params (
  -- Primary Key
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- FOREIGN KEY: Links to api_templates.id
  -- CASCADE: Delete parameters when API template is deleted
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Internal parameter name (MUST match {placeholder} in url_template/headers/body)
  -- Examples: 'domain', 'version', 'issueKey', 'apiToken'
  param_name NVARCHAR(100) NOT NULL,
  
  -- Display label shown to users in configuration UI
  -- Examples: "JIRA Domain", "API Version", "Issue Key", "API Token"
  param_label NVARCHAR(100) NOT NULL,
  
  -- Input type determines what form control to render
  -- Values: 'text' (text input), 'number' (numeric input), 'select' (dropdown)
  param_type NVARCHAR(50) NOT NULL,
  
  -- Where this parameter goes in the HTTP request
  -- Values: 'path' (URL), 'query' (?param=val), 'header', 'body'
  param_location NVARCHAR(50) NOT NULL,
  
  -- Placeholder text shown in input field
  -- Examples: "e.g., mycompany", "e.g., INC-12345"
  placeholder NVARCHAR(MAX),
  
  -- Whether this parameter is mandatory
  -- 1 = required (validation error if empty), 0 = optional
  required BIT DEFAULT 1,
  
  -- Help text explaining what this parameter is for
  description NVARCHAR(MAX),
  
  -- Available options for 'select' type parameters (stored as JSON array)
  -- Example: '["v1", "v2", "v3"]' or '["High", "Medium", "Low"]'
  -- Only used when param_type = 'select'
  options NVARCHAR(MAX),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- Ensure no duplicate parameter names per API template
  CONSTRAINT uk_api_template_params UNIQUE(api_template_id, param_name),
  
  -- FOREIGN KEY: Links to api_templates.id
  -- ON DELETE CASCADE: Remove parameters when API template is deleted
  CONSTRAINT fk_api_template_params_template FOREIGN KEY (api_template_id) REFERENCES api_templates(id) ON DELETE CASCADE
);

-- Index for finding all parameters of an API template
CREATE INDEX idx_api_template_params_template ON api_template_params(api_template_id);

GO`,

    "005_create_api_configs": `-- ============================================================================
-- Migration: 005_create_api_configs.sql
-- Description: Create API configurations and mappings tables
-- Database: MS SQL Server
-- ============================================================================

-- ============================================================================
-- TABLE: template_api_configs
-- ============================================================================
-- PURPOSE: Links templates to API templates with user-provided parameter values
--          Each template can have ONE API configuration (1:1 relationship)
-- 
-- RELATIONSHIPS:
--   - FOREIGN KEY: template_id → templates.id (CASCADE) [UNIQUE - enforces 1:1]
--     "This API config belongs to THIS template"
--   
--   - FOREIGN KEY: api_template_id → api_templates.id
--     "Use THIS API template configuration"
--   
--   - Referenced BY: api_mappings.template_api_config_id (1:Many)
-- 
-- CONSTRAINT: UNIQUE(template_id) ensures each template has only ONE API config
-- ============================================================================
CREATE TABLE template_api_configs (
  -- Primary Key
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- FOREIGN KEY: Links to templates.id
  -- UNIQUE constraint creates 1:1 relationship (one API per template)
  -- CASCADE: Delete API config when template is deleted
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- FOREIGN KEY: Links to api_templates.id
  -- References which pre-configured API template to use
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Toggle: 1 = API integration active, 0 = API disabled
  -- Users can turn API on/off without losing their configuration
  enabled BIT DEFAULT 0,
  
  -- User-provided values for API parameters (stored as JSON object)
  -- Keys MUST match param_name from api_template_params
  -- Example: {"domain": "mycompany", "version": "v2", "issueKey": "PROJ-123", "apiToken": "secret"}
  param_values NVARCHAR(MAX),
  
  -- Audit timestamps
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- UNIQUE constraint: Each template can have only ONE API configuration
  -- This creates a 1:1 relationship between templates and api_configs
  CONSTRAINT uk_template_api_configs UNIQUE(template_id),
  
  -- FOREIGN KEY: Links to templates.id
  -- ON DELETE CASCADE: Remove API config when template is deleted
  CONSTRAINT fk_template_api_configs_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  
  -- FOREIGN KEY: Links to api_templates.id
  -- NO CASCADE: Keep config even if API template is deleted (preserve user's param values)
  CONSTRAINT fk_template_api_configs_api_template FOREIGN KEY (api_template_id) REFERENCES api_templates(id)
);

-- Index for finding API config for a specific template
CREATE INDEX idx_template_api_configs_template ON template_api_configs(template_id);

-- ============================================================================
-- TABLE: api_mappings
-- ============================================================================
-- PURPOSE: Maps data from API responses to specific sections in templates
--          Extracts fields from API JSON response and populates section variables
-- 
-- RELATIONSHIPS:
--   - FOREIGN KEY: template_api_config_id → template_api_configs.id (CASCADE)
--     "This mapping belongs to THIS template's API configuration"
--   
--   - FOREIGN KEY: section_id → template_sections.id (CASCADE)
--     "This mapping populates THIS section"
-- 
-- DATA FLOW:
--   1. API returns JSON response
--   2. api_path extracts specific field (e.g., "fields.summary")
--   3. Extracted data populates variable_name in the target section
-- ============================================================================
CREATE TABLE api_mappings (
  -- Primary Key
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- FOREIGN KEY: Links to template_api_configs.id
  -- Which template's API configuration this mapping belongs to
  -- CASCADE: Delete mappings when API config is deleted
  template_api_config_id UNIQUEIDENTIFIER NOT NULL,
  
  -- FOREIGN KEY: Links to template_sections.id
  -- Which section will receive the API data
  -- CASCADE: Delete mapping when target section is deleted
  section_id UNIQUEIDENTIFIER NOT NULL,
  
  -- JSONPath expression to extract data from API response
  -- Navigate nested JSON structure to find the desired field
  -- Examples:
  --   'fields.summary'           → response.fields.summary
  --   'data.items[0].title'      → response.data.items[0].title
  --   'response.user.email'      → response.response.user.email
  api_path NVARCHAR(MAX) NOT NULL,
  
  -- Type of data being mapped (determines processing)
  -- Values: 'text' (plain text), 'list' (array → list items), 'html' (formatted HTML)
  data_type NVARCHAR(50) NOT NULL,
  
  -- Which variable in the section to populate (optional)
  -- If provided: populates that specific variable (e.g., 'title', 'description', 'items')
  -- If NULL: data replaces entire section content
  variable_name NVARCHAR(100),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- FOREIGN KEY: Links to template_api_configs.id
  -- ON DELETE CASCADE: Remove mappings when API config is deleted
  CONSTRAINT fk_api_mappings_config FOREIGN KEY (template_api_config_id) REFERENCES template_api_configs(id) ON DELETE CASCADE,
  
  -- FOREIGN KEY: Links to template_sections.id
  -- ON DELETE CASCADE: Remove mapping when target section is deleted
  CONSTRAINT fk_api_mappings_section FOREIGN KEY (section_id) REFERENCES template_sections(id) ON DELETE CASCADE
);

-- Index for finding all mappings for an API config
CREATE INDEX idx_api_mappings_config ON api_mappings(template_api_config_id);
-- Index for finding all mappings targeting a specific section
CREATE INDEX idx_api_mappings_section ON api_mappings(section_id);

GO`,

    "006_seed_data": `-- ============================================================================
-- Migration: 006_seed_data.sql
-- Description: Seed initial section types and their variables
-- Database: MS SQL Server
-- ============================================================================
-- 
-- This migration populates the sections and section_variables tables with
-- built-in section types that users can add to their templates.
-- 
-- SECTION CATEGORIES:
--   - text: Headings, paragraphs, static text, mixed content, lists
--   - layout: Tables, grids, containers, HTML content
--   - media: Images
--   - interactive: Links, buttons
-- ============================================================================

-- ============================================================================
-- INSERT: sections (Master catalog of available section types)
-- ============================================================================
INSERT INTO sections (type, label, description, category, icon, default_content, is_custom)
VALUES 
  -- =========================================================================
  -- HEADINGS (category: 'text')
  -- Heading sections for document structure, all support {{variable}} placeholders
  -- =========================================================================
  ('heading1', 'Heading 1', 'Large heading - supports {{variable}} placeholders', 'text', 'Heading1', 'Main Title', 0),
  ('heading2', 'Heading 2', 'Section heading - supports {{variable}} placeholders', 'text', 'Heading2', 'Section Title', 0),
  ('heading3', 'Heading 3', 'Subsection heading - supports {{variable}} placeholders', 'text', 'Heading3', 'Subsection Title', 0),
  ('heading4', 'Heading 4', 'Minor heading - supports {{variable}} placeholders', 'text', 'Heading4', 'Minor Title', 0),
  ('heading5', 'Heading 5', 'Small heading - supports {{variable}} placeholders', 'text', 'Heading5', 'Small Title', 0),
  ('heading6', 'Heading 6', 'Smallest heading - supports {{variable}} placeholders', 'text', 'Heading6', 'Tiny Title', 0),
  
  -- =========================================================================
  -- TEXT ELEMENTS (category: 'text')
  -- Various text content types with different features
  -- =========================================================================
  -- Simple text: Basic text with variable support
  ('text', 'Text', 'Simple text - supports {{variable}} placeholders', 'text', 'Type', 'Your text here', 0),
  -- Paragraph: Multi-line text block
  ('paragraph', 'Paragraph', 'Text paragraph - supports {{variable}} placeholders', 'text', 'AlignLeft', 'This is a paragraph', 0),
  -- Static text: Plain text WITHOUT variables (what you type is what you get)
  ('static-text', 'Static Text', 'Enter text directly without placeholders', 'text', 'FileText', 'Enter your static text here', 0),
  -- Mixed content: Combine static text with {{variable}} placeholders
  ('mixed-content', 'Mixed Content', 'Combine static text with dynamic variables', 'text', 'Type', 'Thymeleaf variable content', 0),
  -- Labeled content: Two-part section with label + content (text, list, or table)
  -- Supports dynamic labels with {{variable}} and nested lists with rich formatting
  ('labeled-content', 'Labeled Content', 'Section with dynamic label and content', 'text', 'FileText', 'Label with content', 0),
  
  -- =========================================================================
  -- LISTS (category: 'text')
  -- Different bullet/number styles for list sections
  -- =========================================================================
  -- Bullet lists (unordered)
  ('bullet-list-circle', 'Bullet List (Circle)', 'List with circle bullets', 'text', 'List', 'Circle bullet list', 0),
  ('bullet-list-disc', 'Bullet List (Disc)', 'List with disc bullets', 'text', 'List', 'Disc bullet list', 0),
  ('bullet-list-square', 'Bullet List (Square)', 'List with square bullets', 'text', 'List', 'Square bullet list', 0),
  -- Numbered lists (ordered)
  ('number-list-1', 'Numbered List (1,2,3)', 'List with numbers', 'text', 'ListOrdered', 'Numbered list', 0),
  ('number-list-i', 'Numbered List (i,ii,iii)', 'List with roman numerals', 'text', 'ListOrdered', 'Roman numeral list', 0),
  ('number-list-a', 'Numbered List (a,b,c)', 'List with letters', 'text', 'ListOrdered', 'Letter list', 0),
  
  -- =========================================================================
  -- LAYOUT ELEMENTS (category: 'layout')
  -- Structural elements for organizing content
  -- =========================================================================
  -- Table: Data grid with rows and columns
  ('table', 'Table', 'Data table', 'layout', 'Table', 'Data table', 0),
  -- Grid: CSS grid layout container
  ('grid', 'Grid', 'Grid layout container', 'layout', 'Grid3x3', 'Grid layout', 0),
  -- Container: Wrapper that can hold nested child sections
  ('container', 'Container', 'Container to group nested sections', 'layout', 'Box', 'Container', 0),
  -- HTML Content: Raw HTML (advanced users)
  ('html-content', 'HTML Content', 'Display raw HTML content', 'layout', 'Code', 'HTML content', 0),
  -- Line break: Vertical spacing element
  ('line-break', 'Line Break', 'Add vertical spacing', 'text', 'Minus', 'Line break', 0),
  
  -- =========================================================================
  -- MEDIA (category: 'media')
  -- =========================================================================
  ('image', 'Image', 'Image element', 'media', 'Image', 'Image', 0),
  
  -- =========================================================================
  -- INTERACTIVE (category: 'interactive')
  -- Clickable elements
  -- =========================================================================
  ('link', 'Link', 'Hyperlink element', 'interactive', 'Link', 'Hyperlink', 0),
  ('button', 'Button', 'Button element', 'interactive', 'MousePointerClick', 'Button', 0);

-- ============================================================================
-- INSERT: section_variables (Variable definitions for each section type)
-- ============================================================================
-- Each section type can have multiple variables with different types:
--   'text' → text input
--   'url' → URL input
--   'list' → list editor (array of items)
--   'table' → table editor (2D grid)
-- ============================================================================
INSERT INTO section_variables (section_type, variable_name, variable_label, variable_type, default_value)
VALUES
  -- =========================================================================
  -- TABLE VARIABLES
  -- Table data stored as JSON with rows array and formatting options
  -- =========================================================================
  ('table', 'tableData', 'Table Data', 'table', '{"rows":[["Header 1","Header 2"],["Data 1","Data 2"]],"showBorder":true,"mergedCells":{}}'),
  
  -- =========================================================================
  -- BULLET LIST VARIABLES
  -- Simple string arrays for list items
  -- =========================================================================
  ('bullet-list-circle', 'items', 'List Items', 'list', '["Item 1","Item 2","Item 3"]'),
  ('bullet-list-disc', 'items', 'List Items', 'list', '["Item 1","Item 2","Item 3"]'),
  ('bullet-list-square', 'items', 'List Items', 'list', '["Item 1","Item 2","Item 3"]'),
  
  -- =========================================================================
  -- NUMBER LIST VARIABLES
  -- Simple string arrays (list style determined by section_type)
  -- =========================================================================
  ('number-list-1', 'items', 'List Items', 'list', '["First item","Second item","Third item"]'),
  ('number-list-i', 'items', 'List Items', 'list', '["First item","Second item","Third item"]'),
  ('number-list-a', 'items', 'List Items', 'list', '["First item","Second item","Third item"]'),
  
  -- =========================================================================
  -- IMAGE VARIABLES
  -- URL and alt text for accessibility
  -- =========================================================================
  ('image', 'src', 'Image URL', 'url', 'https://placehold.co/600x400'),
  ('image', 'alt', 'Alt Text', 'text', 'Placeholder'),
  
  -- =========================================================================
  -- LINK VARIABLES
  -- Hyperlink URL and display text
  -- =========================================================================
  ('link', 'href', 'Link URL', 'url', '#'),
  ('link', 'text', 'Link Text', 'text', 'Click here'),
  
  -- =========================================================================
  -- BUTTON VARIABLES
  -- =========================================================================
  ('button', 'text', 'Button Text', 'text', 'Click me'),
  
  -- =========================================================================
  -- HTML CONTENT VARIABLES
  -- Raw HTML (use with caution - sanitize before rendering)
  -- =========================================================================
  ('html-content', 'htmlContent', 'HTML Content', 'text', '<div style="padding: 20px;"><h3>Sample HTML</h3></div>'),
  
  -- =========================================================================
  -- STATIC TEXT VARIABLES
  -- Plain text without variable substitution
  -- =========================================================================
  ('static-text', 'content', 'Text Content', 'text', 'Enter your static text here.'),
  
  -- =========================================================================
  -- MIXED CONTENT VARIABLES
  -- Text that mixes static content with {{variable}} placeholders
  -- =========================================================================
  ('mixed-content', 'content', 'Content (mix static with variables)', 'text', 'Status: Dynamic value'),
  
  -- =========================================================================
  -- LABELED CONTENT VARIABLES
  -- Complex section with label, content type selection, and nested list support
  -- 
  -- LABEL: Can contain {{variable}} placeholders for dynamic labels
  -- CONTENT TYPE: 'text', 'list', or 'table'
  -- ITEMS: Array of ListItemStyle objects supporting:
  --   - Nested children (up to 3 levels deep)
  --   - Rich formatting (bold, italic, underline, color, backgroundColor, fontSize)
  -- =========================================================================
  ('labeled-content', 'label', 'Label/Heading', 'text', 'Incident Report'),
  ('labeled-content', 'contentType', 'Content Type', 'text', 'text'),
  ('labeled-content', 'content', 'Text Content', 'text', 'Messages journaled'),
  ('labeled-content', 'listStyle', 'List Style', 'text', 'disc'),
  -- List items with ListItemStyle structure: {text, bold, italic, underline, color, backgroundColor, fontSize, children[]}
  ('labeled-content', 'items', 'List Items', 'list', '[{"text":"Item 1","children":[]},{"text":"Item 2","children":[]}]');

GO`,

    "007_add_label_editable": `-- ============================================================================
-- Migration: 007_add_label_editable.sql
-- Description: Add is_label_editable column to template_sections for runtime edit control
-- Database: MS SQL Server
-- ============================================================================
-- 
-- PURPOSE: Allow template designers to control which fields end-users can edit
--          when running a template. This is especially useful for labeled-content
--          sections where the label might need to be locked.
-- 
-- USAGE:
--   is_label_editable = 1 → Users CAN modify this section's content at runtime
--   is_label_editable = 0 → Content is LOCKED and read-only at runtime
-- ============================================================================

-- Add the new column with default value
ALTER TABLE template_sections 
ADD is_label_editable BIT DEFAULT 1;

-- Update any existing rows to have the default value (editable by default)
UPDATE template_sections 
SET is_label_editable = 1 
WHERE is_label_editable IS NULL;

-- Add documentation using SQL Server extended properties
-- This adds metadata that shows up in database documentation tools
EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Controls whether the label/content can be edited at runtime. 1 = editable (users can modify), 0 = locked (read-only). Used primarily for labeled-content sections.', 
  @level0type = N'SCHEMA', @level0name = N'dbo',
  @level1type = N'TABLE',  @level1name = N'template_sections',
  @level2type = N'COLUMN', @level2name = N'is_label_editable';

GO`
  };

  const handleCopy = (tabKey: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedTab(tabKey);
    toast.success("Migration copied to clipboard!");
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}.sql`);
  };

  const handleDownloadAll = () => {
    Object.entries(migrations).forEach(([key, content]) => {
      setTimeout(() => handleDownload(key, content), 100);
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.iconWrapper}>
            <FileCode />
          </div>
          <div>
            <h1>SQL Server Migration Generator</h1>
            <p>Generate SQL Server migration scripts from database schema</p>
          </div>
        </div>
        <Button onClick={handleDownloadAll} size="lg" className="gap-2">
          <Download className="h-4 w-4" />
          Download All Migrations
        </Button>
      </div>

      <Card className={styles.instructionsCard}>
        <CardHeader>
          <CardTitle>Migration Instructions</CardTitle>
          <CardDescription>
            Run these migrations in order to set up your SQL Server database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className={styles.instructionsList}>
            <li>Download all migration files or copy them individually</li>
            <li>Execute migrations in numerical order (001, 002, 003, etc.)</li>
            <li>Each migration is idempotent and includes proper constraints</li>
            <li>Review and modify user_id references based on your auth system</li>
            <li>Adjust NVARCHAR(MAX) sizes based on your data requirements</li>
          </ol>
        </CardContent>
      </Card>

      <Tabs defaultValue="001_create_sections" className="w-full">
        <TabsList className={styles.tabsList}>
          {Object.keys(migrations).map((key) => (
            <TabsTrigger key={key} value={key} className={styles.tabTrigger}>
              {key.split("_")[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(migrations).map(([key, content]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <div className={styles.migrationHeader}>
                  <div>
                    <CardTitle className="text-lg">{key.replace(/_/g, " ").toUpperCase()}</CardTitle>
                    <CardDescription>
                      {content.split("\n")[1].replace("-- Description: ", "")}
                    </CardDescription>
                  </div>
                  <div className={styles.buttonGroup}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(key, content)}
                      className="gap-2"
                    >
                      {copiedTab === key ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleDownload(key, content)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className={styles.codeArea}>
                  <pre className="bg-muted/50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                    {content}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>SQL Server Specific Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={styles.notesGrid}>
            <div className={styles.noteItem}>
              <h3 className="font-semibold mb-2">Data Types</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• UUID → UNIQUEIDENTIFIER</li>
                <li>• VARCHAR → NVARCHAR (Unicode)</li>
                <li>• TEXT → NVARCHAR(MAX)</li>
                <li>• TIMESTAMP → DATETIME2</li>
                <li>• BOOLEAN → BIT</li>
                <li>• JSONB → NVARCHAR(MAX) with JSON validation</li>
              </ul>
            </div>

            <div className={styles.noteItem}>
              <h3>Default Values</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• NEWID() for UNIQUEIDENTIFIER</li>
                <li>• GETUTCDATE() for timestamps</li>
                <li>• 0/1 for BIT fields</li>
              </ul>
            </div>

            <div className={styles.noteItem}>
              <h3>Constraints</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• CASCADE deletes configured</li>
                <li>• UNIQUE constraints on composite keys</li>
                <li>• Foreign keys with proper naming</li>
              </ul>
            </div>

            <div className={styles.noteItem}>
              <h3>Indexes</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Primary keys auto-indexed</li>
                <li>• Foreign keys indexed</li>
                <li>• Composite indexes for queries</li>
                <li>• Descending indexes for timestamps</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrationGenerator;
