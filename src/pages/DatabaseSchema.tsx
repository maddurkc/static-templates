import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Table, Link2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import styles from "./DatabaseSchema.module.scss";

const DatabaseSchema = () => {
  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* Header */}
        <div className={styles.header}>
          <h1>Database Schema</h1>
          <p>Complete database model with relationships for the Page Builder application</p>
        </div>

        {/* Overview Cards */}
        <div className={styles.overviewGrid}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={styles.iconBox}>
                  <Table className={styles.iconPrimary} />
                </div>
                <CardTitle className="text-lg">Sections</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={styles.cardValue}>24</p>
              <CardDescription>Available section types</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={styles.iconBox}>
                  <FileText className={styles.iconAccent} />
                </div>
                <CardTitle className="text-lg">Templates</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={styles.cardValue}>1</p>
              <CardDescription>User-created templates</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`${styles.iconBox} ${styles.iconPurple}`}>
                  <Link2 />
                </div>
                <CardTitle className="text-lg">Relations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={styles.cardValue}>8</p>
              <CardDescription>Table relationships</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`${styles.iconBox} ${styles.iconOrange}`}>
                  <Database />
                </div>
                <CardTitle className="text-lg">Total Tables</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={styles.cardValue}>10</p>
              <CardDescription>Core database tables</CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Tables Overview */}
        <div className={styles.tablesGrid}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className={styles.iconTitle} />
                Core Tables
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.tablesList}>
              <div className={styles.tableItem}>
                <span>sections</span>
                <Badge variant="secondary">Master data</Badge>
              </div>
              <div className={styles.tableItem}>
                <span>section_variables</span>
                <Badge variant="outline">Section Metadata</Badge>
              </div>
              <div className={styles.tableItem}>
                <span>templates</span>
                <Badge variant="secondary">Templates</Badge>
              </div>
              <div className={styles.tableItem}>
                <span>template_sections</span>
                <Badge variant="outline">Junction</Badge>
              </div>
              <div className={styles.tableItem}>
                <span>template_runs</span>
                <Badge variant="secondary">History</Badge>
              </div>
              <div className={styles.tableItem}>
                <span>template_variables</span>
                <Badge variant="outline">Metadata</Badge>
              </div>
              <div className={styles.tableItem}>
                <span>api_templates</span>
                <Badge variant="secondary">API Integration</Badge>
              </div>
              <div className={styles.tableItem}>
                <span>api_template_params</span>
                <Badge variant="outline">API Parameters</Badge>
              </div>
              <div className={styles.tableItem}>
                <span>template_api_configs</span>
                <Badge variant="outline">API Configuration</Badge>
              </div>
              <div className={styles.tableItem}>
                <span>api_mappings</span>
                <Badge variant="outline">API Mappings</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className={styles.iconTitle} />
                Key Relationships
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.tablesList}>
              <div className={styles.relationItem}>
                <p>sections → section_variables</p>
                <p>One section type can have many variables</p>
              </div>
              <div className={styles.relationItem}>
                <p>sections → template_sections</p>
                <p>One section type can be used in many templates</p>
              </div>
              <div className={styles.relationItem}>
                <p>templates → template_sections</p>
                <p>One template contains many sections</p>
              </div>
              <div className={styles.relationItem}>
                <p>template_sections → template_sections</p>
                <p>Self-reference for nested sections</p>
              </div>
              <div className={styles.relationItem}>
                <p>templates → template_runs</p>
                <p>One template can have many run executions</p>
              </div>
              <div className={styles.relationItem}>
                <p>api_templates → api_template_params</p>
                <p>One API template has many parameters</p>
              </div>
              <div className={styles.relationItem}>
                <p>templates → template_api_configs</p>
                <p>One template can have one API configuration</p>
              </div>
              <div className={styles.relationItem}>
                <p>template_api_configs → api_mappings</p>
                <p>One API config has many field mappings</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full Schema */}
        <Card className={styles.schemaCard}>
          <CardHeader>
            <CardTitle className={styles.schemaTitle}>Complete SQL Schema</CardTitle>
            <CardDescription>
              MS SQL Server database schema with all tables, indexes, and relationships
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className={styles.schemaCode}>
              <pre className="p-6 text-sm font-mono">
                <code>{`-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                        PAGE BUILDER DATABASE SCHEMA                            ║
-- ║                            MS SQL Server Edition                               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DATABASE OVERVIEW:
-- This schema supports a flexible page builder system where users create templates
-- using reusable sections, integrate with external APIs, and execute templates
-- with dynamic variables.
--
-- TABLE COUNT: 10 tables
-- RELATIONSHIP COUNT: 8 foreign key relationships
--
-- ============================================================================
-- TABLE RELATIONSHIP MAP (Foreign Keys):
-- ============================================================================
--
--   ┌─────────────────┐                    ┌────────────────────┐
--   │    sections     │◄───────────────────│  section_variables │
--   │  (Master Data)  │   FK: section_type │    (Metadata)      │
--   └─────────────────┘                    └────────────────────┘
--           │
--           │ (logical reference via section_type, NOT FK)
--           ▼
--   ┌─────────────────┐      FK: template_id    ┌────────────────────┐
--   │   templates     │◄────────────────────────│  template_sections │
--   │ (User Docs)     │                         │  (Section Instances)│
--   └────────┬────────┘                         └─────────┬──────────┘
--            │                                            │
--            │ FK: template_id                            │ FK: parent_section_id
--            ▼                                            │ (SELF-REFERENCE)
--   ┌─────────────────┐                                   ▼
--   │  template_runs  │                         ┌────────────────────┐
--   │ (Execution Log) │                         │  (Nested Sections) │
--   └─────────────────┘                         └────────────────────┘
--
--   ┌─────────────────┐      FK: template_id    ┌────────────────────┐
--   │   templates     │◄────────────────────────│template_api_configs│
--   └────────┬────────┘     (1:1 - UNIQUE)      └─────────┬──────────┘
--            │                                            │
--            │                                            │ FK: api_template_id
--            │                                            ▼
--            │                                  ┌────────────────────┐
--            │                                  │   api_templates    │
--            │                                  │  (API Definitions) │
--            │                                  └─────────┬──────────┘
--            │                                            │
--            │                                            │ FK: api_template_id
--            │                                            ▼
--            │                                  ┌────────────────────┐
--            │                                  │ api_template_params│
--            │                                  │  (API Parameters)  │
--            │                                  └────────────────────┘
--
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 1: sections                                                             ║
-- ║ PURPOSE: Master catalog of all available section types (building blocks)      ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   This is the MASTER DATA table containing all available section types that
--   users can add to their templates. Think of it as a "menu" of building blocks.
--
-- RELATIONSHIPS:
--   • NO FOREIGN KEYS (This is a parent/reference table)
--   • REFERENCED BY: section_variables.section_type → sections.type
--   • REFERENCED BY: template_sections.section_type (logical, not FK)
--
-- EXAMPLES OF SECTION TYPES:
--   heading1, heading2, paragraph, labeled-content, table, bullet-list, container
--
-- ============================================================================
CREATE TABLE sections (
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ PRIMARY KEY: Unique identifier for each section type                    │
  -- │ Type: UNIQUEIDENTIFIER (MS SQL Server's UUID equivalent)                │
  -- │ Generated automatically using NEWID() function                          │
  -- └─────────────────────────────────────────────────────────────────────────┘
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ UNIQUE KEY: Section type identifier                                     │
  -- │ Examples: 'heading1', 'paragraph', 'labeled-content', 'table'           │
  -- │ UNIQUE constraint ensures no duplicate section types                    │
  -- │ Referenced by: section_variables.section_type, template_sections        │
  -- └─────────────────────────────────────────────────────────────────────────┘
  type NVARCHAR(50) NOT NULL UNIQUE,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Human-readable name displayed in UI                                     │
  -- │ Examples: "Heading 1", "Bullet List (Circle)", "Labeled Content"        │
  -- │ Users see this label when selecting sections to add to templates        │
  -- └─────────────────────────────────────────────────────────────────────────┘
  label NVARCHAR(100) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Explanation of what this section does                                   │
  -- │ Shown as tooltip/help text in the section library                       │
  -- │ Example: "Large heading - supports {{variable}} placeholders"           │
  -- └─────────────────────────────────────────────────────────────────────────┘
  description NVARCHAR(MAX),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Category for grouping sections in UI                                    │
  -- │ Values: 'text', 'media', 'layout', 'interactive'                        │
  -- │ Sections are organized by category in the section library sidebar       │
  -- └─────────────────────────────────────────────────────────────────────────┘
  category NVARCHAR(50) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Lucide icon name for visual identification in UI                        │
  -- │ Examples: 'Heading1', 'Type', 'Table', 'List', 'Image', 'Box'           │
  -- │ Used to render the icon next to section name in library                 │
  -- └─────────────────────────────────────────────────────────────────────────┘
  icon NVARCHAR(50),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Default placeholder content when section is first added                 │
  -- │ Provides example text so users don't start with empty sections          │
  -- │ Example: "Main Title" for heading1, "Your text here" for paragraph      │
  -- └─────────────────────────────────────────────────────────────────────────┘
  default_content NVARCHAR(MAX),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ AUDIT TIMESTAMPS                                                        │
  -- │ created_at: When this section type was created                          │
  -- │ updated_at: When this section type was last modified                    │
  -- └─────────────────────────────────────────────────────────────────────────┘
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- INDEX: Fast lookup by type (frequently queried when loading sections)
CREATE INDEX idx_sections_type ON sections(type);
-- INDEX: Filter sections by category (for section library grouping)
CREATE INDEX idx_sections_category ON sections(category);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 2: section_variables                                                    ║
-- ║ PURPOSE: Defines what variables are available for each section type           ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   This table defines the configurable properties for each section type.
--   Determines what editor UI to show (text input, list editor, table editor).
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: section_type → sections.type (CASCADE DELETE)
--     "Each variable definition belongs to exactly one section type"
--   • UNIQUE CONSTRAINT: (section_type, variable_name) prevents duplicates
--
-- VARIABLE TYPES & THEIR EDITORS:
--   'text'  → Simple text input field
--   'url'   → URL input with validation
--   'list'  → List editor (add/remove items, supports nesting)
--   'table' → Table/grid editor (rows and columns)
--
-- ============================================================================
CREATE TABLE section_variables (
  -- PRIMARY KEY
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ FOREIGN KEY: References sections.type                                   │
  -- │ Determines which section type this variable belongs to                  │
  -- │ CASCADE DELETE: When section type deleted, variables are removed        │
  -- └─────────────────────────────────────────────────────────────────────────┘
  section_type NVARCHAR(50) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Internal variable name used in code                                     │
  -- │ Examples: 'items', 'tableData', 'label', 'content', 'listStyle'         │
  -- │ This name is used in Thymeleaf: <th:utext="\${variable_name}">          │
  -- └─────────────────────────────────────────────────────────────────────────┘
  variable_name NVARCHAR(100) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Display label shown in editor UI                                        │
  -- │ Examples: "List Items", "Table Data", "Field Label", "Content Type"     │
  -- │ Users see this when editing section properties                          │
  -- └─────────────────────────────────────────────────────────────────────────┘
  variable_label NVARCHAR(100) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Data type determines which editor component to render                   │
  -- │ Values: 'text' | 'url' | 'list' | 'table'                               │
  -- │ 'text' → TextInput, 'list' → ListEditor, 'table' → TableEditor          │
  -- └─────────────────────────────────────────────────────────────────────────┘
  variable_type NVARCHAR(50) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Default value when section is first added (stored as JSON string)       │
  -- │ Examples:                                                               │
  -- │   text: "Default text"                                                  │
  -- │   list: '["Item 1", "Item 2"]'                                          │
  -- │   list (nested): '[{"text":"Item 1","children":[]}]'                    │
  -- │   table: '{"rows":[["H1","H2"],["D1","D2"]]}'                            │
  -- └─────────────────────────────────────────────────────────────────────────┘
  default_value NVARCHAR(MAX),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- UNIQUE CONSTRAINT: No duplicate variable names per section type
  CONSTRAINT uk_section_variables UNIQUE(section_type, variable_name),
  
  -- FOREIGN KEY: Links to sections.type
  -- ON DELETE CASCADE: Remove variables when section type is deleted
  CONSTRAINT fk_section_variables_type FOREIGN KEY (section_type) 
    REFERENCES sections(type)
);

-- INDEX: Fast lookup of variables by section type
CREATE INDEX idx_section_variables_type ON section_variables(section_type);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 3: templates                                                            ║
-- ║ PURPOSE: Stores user-created templates (the main documents users build)       ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   This is the main table for user-created templates. Each template contains
--   the final HTML output with Thymeleaf variables for dynamic content.
--
-- RELATIONSHIPS:
--   • NO FOREIGN KEYS (This is a parent table)
--   • REFERENCED BY: template_sections.template_id (1:Many)
--   • REFERENCED BY: template_runs.template_id (1:Many)
--   • REFERENCED BY: template_api_configs.template_id (1:1)
--   • REFERENCED BY: template_variables.template_id (1:Many)
--
-- CASCADE BEHAVIOR (when template deleted):
--   → All template_sections are deleted
--   → All template_runs are deleted
--   → The template_api_configs is deleted
--   → All template_variables are deleted
--
-- ============================================================================
CREATE TABLE templates (
  -- PRIMARY KEY
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Template name displayed in lists and headers                            │
  -- │ Examples: "Welcome Email", "Incident Report", "Weekly Newsletter"       │
  -- │ Users identify and search templates by this name                        │
  -- └─────────────────────────────────────────────────────────────────────────┘
  name NVARCHAR(255) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Complete generated HTML output with Thymeleaf variables                 │
  -- │ Contains: <th:utext="\${variableName}"> placeholders for dynamic content│
  -- │ This is the FINAL HTML that gets rendered when template is executed     │
  -- │ Example: "<h1><th:utext='\${title}'></th:utext></h1><p>...</p>"          │
  -- └─────────────────────────────────────────────────────────────────────────┘
  html NVARCHAR(MAX) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Owner user ID (for multi-user systems)                                  │
  -- │ Used for filtering: show users only their own templates                 │
  -- │ Can reference your authentication system's user table                   │
  -- └─────────────────────────────────────────────────────────────────────────┘
  user_id UNIQUEIDENTIFIER,
  
  -- AUDIT TIMESTAMPS
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- INDEX: Filter templates by user (for multi-user systems)
CREATE INDEX idx_templates_user_id ON templates(user_id);
-- INDEX: Sort templates by creation date (newest first)
CREATE INDEX idx_templates_created_at ON templates(created_at DESC);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 4: template_sections                                                    ║
-- ║ PURPOSE: Stores section instances within templates (content & styling)        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   This is the JUNCTION TABLE linking sections to templates. Each row represents
--   one section placed in a template with its specific content, variables, and styling.
--   Supports NESTED sections via self-referencing parent_section_id.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
--     "Each section instance belongs to exactly one template"
--   
--   • FOREIGN KEY: parent_section_id → template_sections.id (SELF-REFERENCE)
--     "Container sections can hold child sections (nested structure)"
--     NULL = root-level section, UUID = child of that parent section
--
-- JSON COLUMNS:
--   • variables: Section-specific data (list items, table data, labels)
--   • styles: Section-specific styling (fontSize, color, backgroundColor)
--
-- NESTED LIST STRUCTURE (in variables JSON):
--   {
--     "items": [
--       {"text": "Item 1", "bold": true, "color": "#FF0000", "children": [
--         {"text": "Sub-item 1.1", "italic": true, "children": []}
--       ]}
--     ]
--   }
--
-- ============================================================================
CREATE TABLE template_sections (
  -- PRIMARY KEY
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ FOREIGN KEY: Links to templates.id                                      │
  -- │ Each section must belong to exactly one template                        │
  -- │ CASCADE DELETE: Remove all sections when template is deleted            │
  -- └─────────────────────────────────────────────────────────────────────────┘
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Section type (logical reference to sections.type, NOT a FK)             │
  -- │ Determines how this section renders and what features it has            │
  -- │ Examples: 'heading1', 'paragraph', 'labeled-content', 'table'           │
  -- └─────────────────────────────────────────────────────────────────────────┘
  section_type NVARCHAR(50) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ The actual content for this section instance                            │
  -- │ Can include {{variable}} placeholders that convert to Thymeleaf         │
  -- │ Example: "Welcome {{customerName}} to our service"                      │
  -- └─────────────────────────────────────────────────────────────────────────┘
  content NVARCHAR(MAX) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Section-specific variables and data (stored as JSON object)             │
  -- │ Structure varies by section_type:                                       │
  -- │                                                                         │
  -- │ labeled-content:                                                        │
  -- │   {"label": "Field Name", "contentType": "list", "items": [...],        │
  -- │    "listStyle": "disc"}                                                 │
  -- │                                                                         │
  -- │ table:                                                                  │
  -- │   {"rows": [[{text, style}]], "showBorder": true, "mergedCells": {}}    │
  -- │                                                                         │
  -- │ list types:                                                             │
  -- │   {"items": ["Item 1", "Item 2"]} or                                    │
  -- │   {"items": [{"text": "Item", "bold": true, "children": [...]}]}        │
  -- │                                                                         │
  -- │ NESTED LIST with rich formatting (ListItemStyle):                       │
  -- │   {                                                                     │
  -- │     "items": [                                                          │
  -- │       {                                                                 │
  -- │         "text": "Main item",           // Display text                  │
  -- │         "bold": true,                  // Bold formatting               │
  -- │         "italic": false,               // Italic formatting             │
  -- │         "underline": false,            // Underline formatting          │
  -- │         "color": "#000000",            // Text color (hex)              │
  -- │         "backgroundColor": "#FFFFFF",  // Background color (hex)        │
  -- │         "fontSize": "14px",            // Font size                     │
  -- │         "children": [                  // Nested sub-items (max 3 lvls) │
  -- │           {"text": "Sub-item", "children": []}                          │
  -- │         ]                                                               │
  -- │       }                                                                 │
  -- │     ]                                                                   │
  -- │   }                                                                     │
  -- └─────────────────────────────────────────────────────────────────────────┘
  variables NVARCHAR(MAX),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Custom styling for this specific section instance (JSON object)         │
  -- │ Example: {"fontSize": "18px", "color": "#333",                          │
  -- │           "backgroundColor": "#f5f5f5", "textAlign": "center",          │
  -- │           "fontWeight": "bold", "padding": "10px"}                      │
  -- └─────────────────────────────────────────────────────────────────────────┘
  styles NVARCHAR(MAX),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ For labeled-content: controls if label can be edited at runtime         │
  -- │ 1 = Users CAN edit the label when running template                      │
  -- │ 0 = Label is LOCKED and read-only at runtime                            │
  -- │ Allows template designers to control which fields end-users can edit    │
  -- └─────────────────────────────────────────────────────────────────────────┘
  is_label_editable BIT DEFAULT 1,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Position/order within the template or parent container (0, 1, 2, ...)   │
  -- │ Sections render in ascending order_index order                          │
  -- │ Used for drag-and-drop reordering of sections                           │
  -- └─────────────────────────────────────────────────────────────────────────┘
  order_index INT NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ SELF-REFERENCING FOREIGN KEY for nested sections                        │
  -- │ NULL = This is a ROOT-LEVEL section (top level of template)             │
  -- │ UUID = This section is INSIDE another section (the parent container)    │
  -- │ Used for: Container sections that hold child sections                   │
  -- │ CASCADE: Deleting a container should delete all children inside it      │
  -- └─────────────────────────────────────────────────────────────────────────┘
  parent_section_id UNIQUEIDENTIFIER,
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- FOREIGN KEY: Links to templates.id (CASCADE DELETE)
  CONSTRAINT fk_template_sections_template FOREIGN KEY (template_id) 
    REFERENCES templates(id) ON DELETE CASCADE,
    
  -- SELF-REFERENCING FOREIGN KEY for nested structure
  CONSTRAINT fk_template_sections_parent FOREIGN KEY (parent_section_id) 
    REFERENCES template_sections(id)
);

-- INDEX: Find all sections of a specific template
CREATE INDEX idx_template_sections_template_id ON template_sections(template_id);
-- INDEX: Order sections within a template
CREATE INDEX idx_template_sections_order ON template_sections(template_id, order_index);
-- INDEX: Find child sections of a parent container
CREATE INDEX idx_template_sections_parent ON template_sections(parent_section_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 5: template_runs                                                        ║
-- ║ PURPOSE: Audit log of every template execution                                ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   This table records every time a template is executed/sent. It stores the
--   recipients, variable values used, and the final rendered HTML output.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
--     "Each run record belongs to exactly one template"
--
-- USE CASES:
--   • Audit trail: "When was this email sent? To whom? With what data?"
--   • Debugging: Compare expected vs actual output
--   • Analytics: Track template usage frequency
--
-- ============================================================================
CREATE TABLE template_runs (
  -- PRIMARY KEY
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ FOREIGN KEY: Links to templates.id                                      │
  -- │ CASCADE DELETE: Remove run history when template is deleted             │
  -- └─────────────────────────────────────────────────────────────────────────┘
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Primary recipient email addresses (stored as JSON array)                │
  -- │ Example: '["user1@example.com", "user2@example.com"]'                   │
  -- └─────────────────────────────────────────────────────────────────────────┘
  to_emails NVARCHAR(MAX),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ CC (carbon copy) recipients (stored as JSON array)                      │
  -- │ Example: '["manager@example.com"]' or '[]' if none                      │
  -- └─────────────────────────────────────────────────────────────────────────┘
  cc_emails NVARCHAR(MAX),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ BCC (blind carbon copy) recipients (stored as JSON array)               │
  -- │ Hidden recipients - Example: '["audit@company.com"]'                    │
  -- └─────────────────────────────────────────────────────────────────────────┘
  bcc_emails NVARCHAR(MAX),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Variable values used in this specific run (stored as JSON object)       │
  -- │ Records the EXACT data that was substituted into the template           │
  -- │ Example: {"name": "John Doe", "incidentNumber": "INC-123"}              │
  -- └─────────────────────────────────────────────────────────────────────────┘
  variables NVARCHAR(MAX),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Final rendered HTML with all variables replaced                         │
  -- │ This is the EXACT output that was sent (for auditing/debugging)         │
  -- └─────────────────────────────────────────────────────────────────────────┘
  html_output NVARCHAR(MAX) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Timestamp when this template was executed                               │
  -- └─────────────────────────────────────────────────────────────────────────┘
  run_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Execution status: 'sent', 'failed', 'pending'                           │
  -- │ Track if the send succeeded or failed                                   │
  -- └─────────────────────────────────────────────────────────────────────────┘
  status NVARCHAR(50) DEFAULT 'sent',
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ User who executed this template (for accountability)                    │
  -- └─────────────────────────────────────────────────────────────────────────┘
  user_id UNIQUEIDENTIFIER,
  
  -- FOREIGN KEY: Links to templates.id (CASCADE DELETE)
  CONSTRAINT fk_template_runs_template FOREIGN KEY (template_id) 
    REFERENCES templates(id) ON DELETE CASCADE
);

-- INDEX: Find all runs of a specific template
CREATE INDEX idx_template_runs_template_id ON template_runs(template_id);
-- INDEX: Sort runs by date (newest first)
CREATE INDEX idx_template_runs_run_at ON template_runs(run_at DESC);
-- INDEX: Find all runs by a specific user
CREATE INDEX idx_template_runs_user_id ON template_runs(user_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 6: template_variables                                                   ║
-- ║ PURPOSE: Tracks available variables per template for validation               ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Tracks all variables used in a template for validation during template runs.
--   Helps ensure users provide all required variable values.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: template_id → templates.id (CASCADE DELETE)
--
-- ============================================================================
CREATE TABLE template_variables (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- FOREIGN KEY: Links to templates.id
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Variable name used in template (e.g., 'customerName', 'incidentNumber')
  variable_name NVARCHAR(100) NOT NULL,
  
  -- Data type: 'text', 'number', 'date', etc.
  variable_type NVARCHAR(50) DEFAULT 'text',
  
  -- Whether this variable must be provided (1 = required, 0 = optional)
  required BIT DEFAULT 0,
  
  -- Default value if user doesn't provide one
  default_value NVARCHAR(MAX),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- UNIQUE: No duplicate variable names per template
  CONSTRAINT uk_template_variables UNIQUE(template_id, variable_name),
  
  -- FOREIGN KEY: CASCADE DELETE when template is deleted
  CONSTRAINT fk_template_variables_template FOREIGN KEY (template_id) 
    REFERENCES templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_template_variables_template_id ON template_variables(template_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 7: api_templates                                                        ║
-- ║ PURPOSE: Pre-configured API endpoint templates (Jira, GitHub, etc.)           ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Stores reusable API endpoint configurations that templates can use to fetch
--   external data. These are "blueprints" for API calls.
--
-- RELATIONSHIPS:
--   • NO FOREIGN KEYS (This is a parent table for API configs)
--   • REFERENCED BY: api_template_params.api_template_id (1:Many)
--   • REFERENCED BY: template_api_configs.api_template_id (Many:1)
--
-- URL TEMPLATE PLACEHOLDERS:
--   url_template contains {placeholder} values that get replaced with user values:
--   'https://{domain}.atlassian.net/rest/api/{version}/issue/{issueKey}'
--
-- ============================================================================
CREATE TABLE api_templates (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Display name for this API template (shown in dropdown)                  │
  -- │ Examples: "Jira - Get Issue", "GitHub - Repository Info"                │
  -- └─────────────────────────────────────────────────────────────────────────┘
  name NVARCHAR(255) NOT NULL,
  
  -- Description of what this API does
  description NVARCHAR(MAX),
  
  -- Category for grouping: 'jira', 'github', 'servicenow', 'rest', 'custom'
  category NVARCHAR(100),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ API URL with {parameter} placeholders                                   │
  -- │ Example: 'https://{domain}.atlassian.net/rest/api/{version}/issue/{key}'│
  -- │ Placeholders in {braces} are replaced with user-provided values         │
  -- └─────────────────────────────────────────────────────────────────────────┘
  url_template NVARCHAR(MAX) NOT NULL,
  
  -- HTTP method: 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
  method NVARCHAR(10) NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ HTTP headers with {parameter} placeholders (JSON object)                │
  -- │ Example: {"Authorization": "Bearer {apiToken}"}                         │
  -- └─────────────────────────────────────────────────────────────────────────┘
  headers NVARCHAR(MAX),
  
  -- Request body template for POST/PUT requests (JSON with placeholders)
  body_template NVARCHAR(MAX),
  
  -- Flag: 1 = user-created custom API, 0 = built-in system API
  is_custom BIT DEFAULT 0,
  
  -- User who created this custom API template
  created_by UNIQUEIDENTIFIER,
  
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_api_templates_category ON api_templates(category);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 8: api_template_params                                                  ║
-- ║ PURPOSE: Defines parameters required for each API template                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Defines what parameters each API template requires. Parameters are substituted
--   into url_template, headers, and body_template.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: api_template_id → api_templates.id (CASCADE DELETE)
--     "Each parameter belongs to exactly one API template"
--
-- PARAM_LOCATION VALUES:
--   'path'   → Parameter replaces {placeholder} in URL path
--   'query'  → Parameter added as ?param=value in URL
--   'header' → Parameter goes into HTTP headers
--   'body'   → Parameter inserted into request body
--
-- ============================================================================
CREATE TABLE api_template_params (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- FOREIGN KEY: Links to api_templates.id (CASCADE DELETE)
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ Parameter name (MUST match {placeholder} in url_template/headers/body)  │
  -- │ Examples: 'domain', 'version', 'issueKey', 'apiToken'                   │
  -- └─────────────────────────────────────────────────────────────────────────┘
  param_name NVARCHAR(100) NOT NULL,
  
  -- Display label shown in configuration UI
  param_label NVARCHAR(100) NOT NULL,
  
  -- Input type: 'text', 'number', 'select' (determines form control)
  param_type NVARCHAR(50) NOT NULL,
  
  -- Where parameter goes: 'path', 'query', 'header', 'body'
  param_location NVARCHAR(50) NOT NULL,
  
  -- Placeholder text for input field (e.g., "e.g., mycompany")
  placeholder NVARCHAR(MAX),
  
  -- Whether required: 1 = mandatory, 0 = optional
  required BIT DEFAULT 1,
  
  -- Help text for users
  description NVARCHAR(MAX),
  
  -- Options for 'select' type: '["v1", "v2", "v3"]' (JSON array)
  options NVARCHAR(MAX),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- UNIQUE: No duplicate param names per API template
  CONSTRAINT uk_api_template_params UNIQUE(api_template_id, param_name),
  
  -- FOREIGN KEY: CASCADE DELETE when API template is deleted
  CONSTRAINT fk_api_template_params_template FOREIGN KEY (api_template_id) 
    REFERENCES api_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_template_params_template ON api_template_params(api_template_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 9: template_api_configs                                                 ║
-- ║ PURPOSE: Links templates to API templates with user-provided parameter values ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Links a template to an API template with user-provided parameter values.
--   Each template can have ONE API configuration (1:1 relationship enforced by UNIQUE).
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: template_id → templates.id (CASCADE DELETE) [UNIQUE - 1:1]
--   • FOREIGN KEY: api_template_id → api_templates.id
--   • REFERENCED BY: api_mappings.template_api_config_id (1:Many)
--
-- ============================================================================
CREATE TABLE template_api_configs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ FOREIGN KEY: Links to templates.id                                      │
  -- │ UNIQUE constraint creates 1:1 relationship (one API per template)       │
  -- │ CASCADE DELETE: Remove API config when template is deleted              │
  -- └─────────────────────────────────────────────────────────────────────────┘
  template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- FOREIGN KEY: Links to api_templates.id (which API to use)
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  
  -- Toggle: 1 = API active, 0 = API disabled (can toggle without losing config)
  enabled BIT DEFAULT 0,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ User-provided values for API parameters (JSON object)                   │
  -- │ Keys MUST match param_name from api_template_params                     │
  -- │ Example: {"domain": "mycompany", "issueKey": "PROJ-123"}               │
  -- └─────────────────────────────────────────────────────────────────────────┘
  param_values NVARCHAR(MAX),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- UNIQUE: Each template can have only ONE API configuration (1:1)
  CONSTRAINT uk_template_api_configs UNIQUE(template_id),
  
  -- FOREIGN KEY: CASCADE DELETE when template is deleted
  CONSTRAINT fk_template_api_configs_template FOREIGN KEY (template_id) 
    REFERENCES templates(id) ON DELETE CASCADE,
    
  -- FOREIGN KEY: Links to api_templates.id (NO CASCADE - keep config if API deleted)
  CONSTRAINT fk_template_api_configs_api_template FOREIGN KEY (api_template_id) 
    REFERENCES api_templates(id)
);

CREATE INDEX idx_template_api_configs_template ON template_api_configs(template_id);


-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║ TABLE 10: api_mappings                                                        ║
-- ║ PURPOSE: Maps API response data to specific sections within templates         ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- DESCRIPTION:
--   Maps data from API responses to specific sections in templates. Extracts
--   fields from API JSON response and populates section variables.
--
-- RELATIONSHIPS:
--   • FOREIGN KEY: template_api_config_id → template_api_configs.id (CASCADE)
--   • FOREIGN KEY: section_id → template_sections.id (CASCADE)
--
-- DATA FLOW:
--   1. API returns JSON response
--   2. api_path extracts specific field (e.g., "fields.summary")
--   3. Extracted data populates variable_name in the target section
--
-- ============================================================================
CREATE TABLE api_mappings (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  
  -- FOREIGN KEY: Links to template_api_configs.id (CASCADE DELETE)
  template_api_config_id UNIQUEIDENTIFIER NOT NULL,
  
  -- FOREIGN KEY: Links to template_sections.id (CASCADE DELETE)
  section_id UNIQUEIDENTIFIER NOT NULL,
  
  -- ┌─────────────────────────────────────────────────────────────────────────┐
  -- │ JSONPath expression to extract data from API response                   │
  -- │ Examples: 'fields.summary', 'data.items[0].title'                       │
  -- └─────────────────────────────────────────────────────────────────────────┘
  api_path NVARCHAR(MAX) NOT NULL,
  
  -- Data type: 'text', 'list', 'html' (determines processing)
  data_type NVARCHAR(50) NOT NULL,
  
  -- Which variable in section to populate (NULL = replace entire content)
  variable_name NVARCHAR(100),
  
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  
  -- FOREIGN KEY: CASCADE DELETE when API config is deleted
  CONSTRAINT fk_api_mappings_config FOREIGN KEY (template_api_config_id) 
    REFERENCES template_api_configs(id) ON DELETE CASCADE,
    
  -- FOREIGN KEY: CASCADE DELETE when section is deleted
  CONSTRAINT fk_api_mappings_section FOREIGN KEY (section_id) 
    REFERENCES template_sections(id) ON DELETE CASCADE
);

-- INDEX: Find all mappings for an API config
CREATE INDEX idx_api_mappings_config ON api_mappings(template_api_config_id);
-- INDEX: Find all mappings targeting a specific section
CREATE INDEX idx_api_mappings_section ON api_mappings(section_id);

-- ================================================================
-- EXAMPLE QUERIES
-- ================================================================

-- Get all sections with their variables
SELECT 
  s.id,
  s.type,
  s.label,
  s.description,
  s.category,
  s.icon,
  s.default_content,
  (
    SELECT sv.id, sv.variable_name, sv.variable_label, 
           sv.variable_type, sv.default_value
    FROM section_variables sv
    WHERE sv.section_type = s.type
    FOR JSON PATH
  ) as variables
FROM sections s
ORDER BY s.category, s.label;

-- Get a specific section with its variables
SELECT 
  s.*,
  sv.variable_name,
  sv.variable_label,
  sv.variable_type,
  sv.default_value
FROM sections s
LEFT JOIN section_variables sv ON s.type = sv.section_type
WHERE s.type = 'table'
ORDER BY sv.variable_name;

-- Get a template with all its sections (ordered)
SELECT 
  t.id,
  t.name,
  t.html,
  (
    SELECT ts.id, ts.section_type, ts.content, ts.styles, 
           ts.order_index, ts.parent_section_id
    FROM template_sections ts
    WHERE ts.template_id = t.id
    ORDER BY ts.order_index
    FOR JSON PATH
  ) as sections
FROM templates t
WHERE t.id = 'YOUR_TEMPLATE_ID';

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

-- ================================================================
-- SPRING BOOT IMPLEMENTATION
-- ================================================================

/**
 * RELATIONSHIP: sections (1) → (N) section_variables
 * - One section can have multiple variables
 * - Foreign key: section_variables.section_type → sections.type
 * - Used to define configurable properties for each section type
 */

-- Entity Classes:

@Entity
@Table(name = "sections")
public class Section {
    @Id
    @GeneratedValue
    private UUID id;
    
    @Column(nullable = false, unique = true, length = 50)
    private String type;
    
    @Column(nullable = false, length = 100)
    private String label;
    
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;
    
    @Column(nullable = false, length = 50)
    private String category;
    
    @Column(length = 50)
    private String icon;
    
    @Column(name = "default_content", columnDefinition = "NVARCHAR(MAX)")
    private String defaultContent;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SectionVariable> variables;
    
    // Getters, setters, constructors
}

@Entity
@Table(name = "section_variables")
public class SectionVariable {
    @Id
    @GeneratedValue
    private UUID id;
    
    @Column(name = "section_type", nullable = false, length = 50)
    private String sectionType;
    
    @Column(name = "variable_name", nullable = false, length = 100)
    private String variableName;
    
    @Column(name = "variable_label", nullable = false, length = 100)
    private String variableLabel;
    
    @Column(name = "variable_type", nullable = false, length = 50)
    private String variableType;
    
    @Column(name = "default_value", columnDefinition = "NVARCHAR(MAX)")
    private String defaultValue;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_type", referencedColumnName = "type", insertable = false, updatable = false)
    private Section section;
    
    // Getters, setters, constructors
}

-- Repositories:

@Repository
public interface SectionRepository extends JpaRepository<Section, UUID> {
    Optional<Section> findByType(String type);
    List<Section> findByCategory(String category);
    
    @Query("SELECT s FROM Section s LEFT JOIN FETCH s.variables WHERE s.type = :type")
    Optional<Section> findByTypeWithVariables(@Param("type") String type);
    
    @Query("SELECT DISTINCT s FROM Section s LEFT JOIN FETCH s.variables ORDER BY s.category, s.label")
    List<Section> findAllWithVariables();
}

@Repository
public interface SectionVariableRepository extends JpaRepository<SectionVariable, UUID> {
    List<SectionVariable> findBySectionType(String sectionType);
    Optional<SectionVariable> findBySectionTypeAndVariableName(String sectionType, String variableName);
}

-- Services:

@Service
@Transactional
public class SectionService {
    @Autowired
    private SectionRepository sectionRepository;
    
    @Autowired
    private SectionVariableRepository sectionVariableRepository;
    
    public List<Section> getAllSections() {
        return sectionRepository.findAll();
    }
    
    public List<Section> getAllSectionsWithVariables() {
        return sectionRepository.findAllWithVariables();
    }
    
    public Optional<Section> getSectionByType(String type) {
        return sectionRepository.findByType(type);
    }
    
    public Optional<Section> getSectionByTypeWithVariables(String type) {
        return sectionRepository.findByTypeWithVariables(type);
    }
    
    public List<Section> getSectionsByCategory(String category) {
        return sectionRepository.findByCategory(category);
    }
    
    public Section createSection(Section section) {
        section.setCreatedAt(LocalDateTime.now());
        section.setUpdatedAt(LocalDateTime.now());
        return sectionRepository.save(section);
    }
    
    public Section updateSection(UUID id, Section section) {
        Section existing = sectionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Section not found"));
        existing.setLabel(section.getLabel());
        existing.setDescription(section.getDescription());
        existing.setCategory(section.getCategory());
        existing.setIcon(section.getIcon());
        existing.setDefaultContent(section.getDefaultContent());
        existing.setUpdatedAt(LocalDateTime.now());
        return sectionRepository.save(existing);
    }
    
    public void deleteSection(UUID id) {
        sectionRepository.deleteById(id);
    }
}

@Service
@Transactional
public class SectionVariableService {
    @Autowired
    private SectionVariableRepository sectionVariableRepository;
    
    public List<SectionVariable> getVariablesBySectionType(String sectionType) {
        return sectionVariableRepository.findBySectionType(sectionType);
    }
    
    public Optional<SectionVariable> getVariable(String sectionType, String variableName) {
        return sectionVariableRepository.findBySectionTypeAndVariableName(sectionType, variableName);
    }
    
    public SectionVariable createVariable(SectionVariable variable) {
        variable.setCreatedAt(LocalDateTime.now());
        return sectionVariableRepository.save(variable);
    }
    
    public SectionVariable updateVariable(UUID id, SectionVariable variable) {
        SectionVariable existing = sectionVariableRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Variable not found"));
        existing.setVariableLabel(variable.getVariableLabel());
        existing.setVariableType(variable.getVariableType());
        existing.setDefaultValue(variable.getDefaultValue());
        return sectionVariableRepository.save(existing);
    }
    
    public void deleteVariable(UUID id) {
        sectionVariableRepository.deleteById(id);
    }
}

-- Controllers:

@RestController
@RequestMapping("/api/sections")
@CrossOrigin(origins = "*")
public class SectionController {
    @Autowired
    private SectionService sectionService;
    
    @GetMapping
    public ResponseEntity<List<Section>> getAllSections(
        @RequestParam(required = false) String withVariables) {
        if ("true".equals(withVariables)) {
            return ResponseEntity.ok(sectionService.getAllSectionsWithVariables());
        }
        return ResponseEntity.ok(sectionService.getAllSections());
    }
    
    @GetMapping("/{type}")
    public ResponseEntity<Section> getSectionByType(
        @PathVariable String type,
        @RequestParam(required = false) String withVariables) {
        if ("true".equals(withVariables)) {
            return sectionService.getSectionByTypeWithVariables(type)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
        }
        return sectionService.getSectionByType(type)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/category/{category}")
    public ResponseEntity<List<Section>> getSectionsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(sectionService.getSectionsByCategory(category));
    }
    
    @PostMapping
    public ResponseEntity<Section> createSection(@RequestBody Section section) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(sectionService.createSection(section));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Section> updateSection(
        @PathVariable UUID id, @RequestBody Section section) {
        return ResponseEntity.ok(sectionService.updateSection(id, section));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSection(@PathVariable UUID id) {
        sectionService.deleteSection(id);
        return ResponseEntity.noContent().build();
    }
}

@RestController
@RequestMapping("/api/section-variables")
@CrossOrigin(origins = "*")
public class SectionVariableController {
    @Autowired
    private SectionVariableService sectionVariableService;
    
    @GetMapping("/section/{sectionType}")
    public ResponseEntity<List<SectionVariable>> getVariablesBySectionType(
        @PathVariable String sectionType) {
        return ResponseEntity.ok(sectionVariableService.getVariablesBySectionType(sectionType));
    }
    
    @GetMapping("/section/{sectionType}/variable/{variableName}")
    public ResponseEntity<SectionVariable> getVariable(
        @PathVariable String sectionType, @PathVariable String variableName) {
        return sectionVariableService.getVariable(sectionType, variableName)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<SectionVariable> createVariable(@RequestBody SectionVariable variable) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(sectionVariableService.createVariable(variable));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<SectionVariable> updateVariable(
        @PathVariable UUID id, @RequestBody SectionVariable variable) {
        return ResponseEntity.ok(sectionVariableService.updateVariable(id, variable));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVariable(@PathVariable UUID id) {
        sectionVariableService.deleteVariable(id);
        return ResponseEntity.noContent().build();
    }
}

-- ================================================================
-- SPRING BOOT IMPLEMENTATION - TEMPLATES MODULE
-- ================================================================

/**
 * RELATIONSHIPS:
 * - templates (1) → (N) template_sections
 * - templates (1) → (N) template_runs
 * - templates (1) → (N) template_variables
 * - template_sections (self-reference) for nested sections
 * - Foreign keys cascade on delete for child records
 */

-- Entity Classes:

@Entity
@Table(name = "templates")
public class Template {
    @Id
    @GeneratedValue
    private UUID id;
    
    @Column(nullable = false, length = 255)
    private String name;
    
    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String html;
    
    @Column(name = "user_id")
    private UUID userId;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    private List<TemplateSection> sections = new ArrayList<>();
    
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<TemplateRun> runs = new ArrayList<>();
    
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<TemplateVariable> variables = new ArrayList<>();
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Getters, setters, constructors
}

@Entity
@Table(name = "template_sections")
public class TemplateSection {
    @Id
    @GeneratedValue
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private Template template;
    
    @Column(name = "section_type", nullable = false, length = 50)
    private String sectionType;
    
    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String content;
    
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String variables;
    
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String styles;
    
    @Column(name = "is_label_editable")
    private Boolean isLabelEditable = true;
    
    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_section_id")
    private TemplateSection parentSection;
    
    @OneToMany(mappedBy = "parentSection", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TemplateSection> childSections = new ArrayList<>();
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    // Getters, setters, constructors
}

@Entity
@Table(name = "template_runs")
public class TemplateRun {
    @Id
    @GeneratedValue
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private Template template;
    
    @Column(name = "to_emails", columnDefinition = "NVARCHAR(MAX)")
    private String toEmails;
    
    @Column(name = "cc_emails", columnDefinition = "NVARCHAR(MAX)")
    private String ccEmails;
    
    @Column(name = "bcc_emails", columnDefinition = "NVARCHAR(MAX)")
    private String bccEmails;
    
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String variables;
    
    @Column(name = "html_output", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String htmlOutput;
    
    @Column(name = "run_at")
    private LocalDateTime runAt;
    
    @Column(length = 50)
    private String status = "sent";
    
    @Column(name = "user_id")
    private UUID userId;
    
    @PrePersist
    protected void onCreate() {
        runAt = LocalDateTime.now();
    }
    
    // Getters, setters, constructors
}

@Entity
@Table(name = "template_variables")
public class TemplateVariable {
    @Id
    @GeneratedValue
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private Template template;
    
    @Column(name = "variable_name", nullable = false, length = 100)
    private String variableName;
    
    @Column(name = "variable_type", length = 50)
    private String variableType = "text";
    
    @Column(nullable = false)
    private Boolean required = false;
    
    @Column(name = "default_value", columnDefinition = "NVARCHAR(MAX)")
    private String defaultValue;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    // Getters, setters, constructors
}

-- Repositories:

@Repository
public interface TemplateRepository extends JpaRepository<Template, UUID> {
    List<Template> findByUserId(UUID userId);
    List<Template> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    @Query("SELECT t FROM Template t LEFT JOIN FETCH t.sections WHERE t.id = :id")
    Optional<Template> findByIdWithSections(@Param("id") UUID id);
    
    @Query("SELECT t FROM Template t " +
           "LEFT JOIN FETCH t.sections s " +
           "LEFT JOIN FETCH t.variables v " +
           "WHERE t.id = :id")
    Optional<Template> findByIdWithSectionsAndVariables(@Param("id") UUID id);
    
    @Query("SELECT DISTINCT t FROM Template t " +
           "LEFT JOIN FETCH t.sections " +
           "WHERE t.userId = :userId " +
           "ORDER BY t.createdAt DESC")
    List<Template> findByUserIdWithSections(@Param("userId") UUID userId);
}

@Repository
public interface TemplateSectionRepository extends JpaRepository<TemplateSection, UUID> {
    List<TemplateSection> findByTemplateIdOrderByOrderIndex(UUID templateId);
    List<TemplateSection> findByParentSectionId(UUID parentSectionId);
    List<TemplateSection> findByTemplateIdAndParentSectionIdIsNull(UUID templateId);
    
    @Query("SELECT ts FROM TemplateSection ts " +
           "LEFT JOIN FETCH ts.childSections " +
           "WHERE ts.template.id = :templateId " +
           "ORDER BY ts.orderIndex")
    List<TemplateSection> findByTemplateIdWithChildren(@Param("templateId") UUID templateId);
}

@Repository
public interface TemplateRunRepository extends JpaRepository<TemplateRun, UUID> {
    List<TemplateRun> findByTemplateIdOrderByRunAtDesc(UUID templateId);
    List<TemplateRun> findByUserIdOrderByRunAtDesc(UUID userId);
    List<TemplateRun> findByTemplateIdAndUserIdOrderByRunAtDesc(UUID templateId, UUID userId);
    
    @Query("SELECT tr FROM TemplateRun tr " +
           "JOIN FETCH tr.template " +
           "WHERE tr.userId = :userId " +
           "ORDER BY tr.runAt DESC")
    List<TemplateRun> findByUserIdWithTemplate(@Param("userId") UUID userId);
}

@Repository
public interface TemplateVariableRepository extends JpaRepository<TemplateVariable, UUID> {
    List<TemplateVariable> findByTemplateId(UUID templateId);
    Optional<TemplateVariable> findByTemplateIdAndVariableName(UUID templateId, String variableName);
    List<TemplateVariable> findByTemplateIdAndRequired(UUID templateId, Boolean required);
}

-- Services:

@Service
@Transactional
public class TemplateService {
    @Autowired
    private TemplateRepository templateRepository;
    
    @Autowired
    private TemplateSectionRepository templateSectionRepository;
    
    public List<Template> getAllTemplates() {
        return templateRepository.findAll();
    }
    
    public List<Template> getTemplatesByUserId(UUID userId) {
        return templateRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    public Optional<Template> getTemplateById(UUID id) {
        return templateRepository.findById(id);
    }
    
    public Optional<Template> getTemplateWithSections(UUID id) {
        return templateRepository.findByIdWithSections(id);
    }
    
    public Optional<Template> getTemplateWithSectionsAndVariables(UUID id) {
        return templateRepository.findByIdWithSectionsAndVariables(id);
    }
    
    public Template createTemplate(Template template) {
        return templateRepository.save(template);
    }
    
    public Template updateTemplate(UUID id, Template template) {
        Template existing = templateRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        existing.setName(template.getName());
        existing.setHtml(template.getHtml());
        return templateRepository.save(existing);
    }
    
    public void deleteTemplate(UUID id) {
        templateRepository.deleteById(id);
    }
    
    public List<TemplateSection> getTemplateSections(UUID templateId) {
        return templateSectionRepository.findByTemplateIdOrderByOrderIndex(templateId);
    }
    
    public List<TemplateSection> getTemplateSectionsWithChildren(UUID templateId) {
        return templateSectionRepository.findByTemplateIdWithChildren(templateId);
    }
}

@Service
@Transactional
public class TemplateSectionService {
    @Autowired
    private TemplateSectionRepository templateSectionRepository;
    
    public List<TemplateSection> getSectionsByTemplateId(UUID templateId) {
        return templateSectionRepository.findByTemplateIdOrderByOrderIndex(templateId);
    }
    
    public Optional<TemplateSection> getSectionById(UUID id) {
        return templateSectionRepository.findById(id);
    }
    
    public List<TemplateSection> getChildSections(UUID parentSectionId) {
        return templateSectionRepository.findByParentSectionId(parentSectionId);
    }
    
    public TemplateSection createSection(TemplateSection section) {
        return templateSectionRepository.save(section);
    }
    
    public TemplateSection updateSection(UUID id, TemplateSection section) {
        TemplateSection existing = templateSectionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Section not found"));
        existing.setSectionType(section.getSectionType());
        existing.setContent(section.getContent());
        existing.setVariables(section.getVariables());
        existing.setStyles(section.getStyles());
        existing.setIsLabelEditable(section.getIsLabelEditable());
        existing.setOrderIndex(section.getOrderIndex());
        return templateSectionRepository.save(existing);
    }
    
    public void deleteSection(UUID id) {
        templateSectionRepository.deleteById(id);
    }
    
    public void reorderSections(UUID templateId, List<UUID> sectionIds) {
        for (int i = 0; i < sectionIds.size(); i++) {
            TemplateSection section = templateSectionRepository.findById(sectionIds.get(i))
                .orElseThrow(() -> new ResourceNotFoundException("Section not found"));
            section.setOrderIndex(i);
            templateSectionRepository.save(section);
        }
    }
}

@Service
@Transactional
public class TemplateRunService {
    @Autowired
    private TemplateRunRepository templateRunRepository;
    
    public List<TemplateRun> getRunsByTemplateId(UUID templateId) {
        return templateRunRepository.findByTemplateIdOrderByRunAtDesc(templateId);
    }
    
    public List<TemplateRun> getRunsByUserId(UUID userId) {
        return templateRunRepository.findByUserIdWithTemplate(userId);
    }
    
    public Optional<TemplateRun> getRunById(UUID id) {
        return templateRunRepository.findById(id);
    }
    
    public TemplateRun createRun(TemplateRun run) {
        return templateRunRepository.save(run);
    }
    
    public TemplateRun updateRunStatus(UUID id, String status) {
        TemplateRun run = templateRunRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Template run not found"));
        run.setStatus(status);
        return templateRunRepository.save(run);
    }
    
    public void deleteRun(UUID id) {
        templateRunRepository.deleteById(id);
    }
}

@Service
@Transactional
public class TemplateVariableService {
    @Autowired
    private TemplateVariableRepository templateVariableRepository;
    
    public List<TemplateVariable> getVariablesByTemplateId(UUID templateId) {
        return templateVariableRepository.findByTemplateId(templateId);
    }
    
    public List<TemplateVariable> getRequiredVariables(UUID templateId) {
        return templateVariableRepository.findByTemplateIdAndRequired(templateId, true);
    }
    
    public Optional<TemplateVariable> getVariable(UUID templateId, String variableName) {
        return templateVariableRepository.findByTemplateIdAndVariableName(templateId, variableName);
    }
    
    public TemplateVariable createVariable(TemplateVariable variable) {
        return templateVariableRepository.save(variable);
    }
    
    public TemplateVariable updateVariable(UUID id, TemplateVariable variable) {
        TemplateVariable existing = templateVariableRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Variable not found"));
        existing.setVariableType(variable.getVariableType());
        existing.setRequired(variable.getRequired());
        existing.setDefaultValue(variable.getDefaultValue());
        return templateVariableRepository.save(existing);
    }
    
    public void deleteVariable(UUID id) {
        templateVariableRepository.deleteById(id);
    }
}

-- Controllers:

@RestController
@RequestMapping("/api/templates")
@CrossOrigin(origins = "*")
public class TemplateController {
    @Autowired
    private TemplateService templateService;
    
    @GetMapping
    public ResponseEntity<List<Template>> getAllTemplates(
        @RequestParam(required = false) UUID userId,
        @RequestParam(required = false) String include) {
        if (userId != null) {
            return ResponseEntity.ok(templateService.getTemplatesByUserId(userId));
        }
        return ResponseEntity.ok(templateService.getAllTemplates());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Template> getTemplateById(
        @PathVariable UUID id,
        @RequestParam(required = false) String include) {
        if ("sections".equals(include)) {
            return templateService.getTemplateWithSections(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
        }
        if ("sections,variables".equals(include)) {
            return templateService.getTemplateWithSectionsAndVariables(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
        }
        return templateService.getTemplateById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/{id}/sections")
    public ResponseEntity<List<TemplateSection>> getTemplateSections(
        @PathVariable UUID id,
        @RequestParam(required = false) String include) {
        if ("children".equals(include)) {
            return ResponseEntity.ok(templateService.getTemplateSectionsWithChildren(id));
        }
        return ResponseEntity.ok(templateService.getTemplateSections(id));
    }
    
    @PostMapping
    public ResponseEntity<Template> createTemplate(@RequestBody Template template) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(templateService.createTemplate(template));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Template> updateTemplate(
        @PathVariable UUID id, @RequestBody Template template) {
        return ResponseEntity.ok(templateService.updateTemplate(id, template));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        templateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}

@RestController
@RequestMapping("/api/template-sections")
@CrossOrigin(origins = "*")
public class TemplateSectionController {
    @Autowired
    private TemplateSectionService templateSectionService;
    
    @GetMapping("/template/{templateId}")
    public ResponseEntity<List<TemplateSection>> getSectionsByTemplateId(
        @PathVariable UUID templateId) {
        return ResponseEntity.ok(templateSectionService.getSectionsByTemplateId(templateId));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<TemplateSection> getSectionById(@PathVariable UUID id) {
        return templateSectionService.getSectionById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/{id}/children")
    public ResponseEntity<List<TemplateSection>> getChildSections(@PathVariable UUID id) {
        return ResponseEntity.ok(templateSectionService.getChildSections(id));
    }
    
    @PostMapping
    public ResponseEntity<TemplateSection> createSection(@RequestBody TemplateSection section) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(templateSectionService.createSection(section));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<TemplateSection> updateSection(
        @PathVariable UUID id, @RequestBody TemplateSection section) {
        return ResponseEntity.ok(templateSectionService.updateSection(id, section));
    }
    
    @PostMapping("/reorder")
    public ResponseEntity<Void> reorderSections(
        @RequestParam UUID templateId,
        @RequestBody List<UUID> sectionIds) {
        templateSectionService.reorderSections(templateId, sectionIds);
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSection(@PathVariable UUID id) {
        templateSectionService.deleteSection(id);
        return ResponseEntity.noContent().build();
    }
}

@RestController
@RequestMapping("/api/template-runs")
@CrossOrigin(origins = "*")
public class TemplateRunController {
    @Autowired
    private TemplateRunService templateRunService;
    
    @GetMapping
    public ResponseEntity<List<TemplateRun>> getRuns(
        @RequestParam(required = false) UUID templateId,
        @RequestParam(required = false) UUID userId) {
        if (templateId != null) {
            return ResponseEntity.ok(templateRunService.getRunsByTemplateId(templateId));
        }
        if (userId != null) {
            return ResponseEntity.ok(templateRunService.getRunsByUserId(userId));
        }
        return ResponseEntity.badRequest().build();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<TemplateRun> getRunById(@PathVariable UUID id) {
        return templateRunService.getRunById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<TemplateRun> createRun(@RequestBody TemplateRun run) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(templateRunService.createRun(run));
    }
    
    @PatchMapping("/{id}/status")
    public ResponseEntity<TemplateRun> updateRunStatus(
        @PathVariable UUID id, @RequestParam String status) {
        return ResponseEntity.ok(templateRunService.updateRunStatus(id, status));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRun(@PathVariable UUID id) {
        templateRunService.deleteRun(id);
        return ResponseEntity.noContent().build();
    }
}

@RestController
@RequestMapping("/api/template-variables")
@CrossOrigin(origins = "*")
public class TemplateVariableController {
    @Autowired
    private TemplateVariableService templateVariableService;
    
    @GetMapping("/template/{templateId}")
    public ResponseEntity<List<TemplateVariable>> getVariablesByTemplateId(
        @PathVariable UUID templateId,
        @RequestParam(required = false) Boolean required) {
        if (required != null && required) {
            return ResponseEntity.ok(templateVariableService.getRequiredVariables(templateId));
        }
        return ResponseEntity.ok(templateVariableService.getVariablesByTemplateId(templateId));
    }
    
    @GetMapping("/template/{templateId}/variable/{variableName}")
    public ResponseEntity<TemplateVariable> getVariable(
        @PathVariable UUID templateId, @PathVariable String variableName) {
        return templateVariableService.getVariable(templateId, variableName)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<TemplateVariable> createVariable(@RequestBody TemplateVariable variable) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(templateVariableService.createVariable(variable));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<TemplateVariable> updateVariable(
        @PathVariable UUID id, @RequestBody TemplateVariable variable) {
        return ResponseEntity.ok(templateVariableService.updateVariable(id, variable));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVariable(@PathVariable UUID id) {
        templateVariableService.deleteVariable(id);
        return ResponseEntity.noContent().build();
    }
}

// ================================================================
// DTOs (DATA TRANSFER OBJECTS) AND MAPSTRUCT MAPPERS
// ================================================================

/**
 * DTOs separate API concerns from entity structure, providing:
 * - Clean API contracts independent of database schema
 * - Prevention of over/under-fetching
 * - Security by excluding sensitive fields
 * - Validation at the API boundary
 * 
 * MapStruct provides compile-time type-safe mapping between entities and DTOs.
 */

// ================================================================
// SWAGGER/OPENAPI CONFIGURATION
// ================================================================

/**
 * Maven Dependencies (add to pom.xml):
 * 
 * <dependency>
 *     <groupId>org.springdoc</groupId>
 *     <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
 *     <version>2.3.0</version>
 * </dependency>
 * 
 * <dependency>
 *     <groupId>org.springframework.boot</groupId>
 *     <artifactId>spring-boot-starter-validation</artifactId>
 * </dependency>
 * 
 * <dependency>
 *     <groupId>org.mapstruct</groupId>
 *     <artifactId>mapstruct</artifactId>
 *     <version>1.5.5.Final</version>
 * </dependency>
 */

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Page Builder Template API")
                .version("1.0.0")
                .description("REST API for template management system with dynamic sections and variables")
                .contact(new Contact()
                    .name("API Support")
                    .email("support@example.com"))
                .license(new License()
                    .name("Apache 2.0")
                    .url("http://www.apache.org/licenses/LICENSE-2.0.html")))
            .externalDocs(new ExternalDocumentation()
                .description("Full Documentation")
                .url("https://docs.example.com"))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth", 
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
    
    @Bean
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder()
            .group("public")
            .pathsToMatch("/api/**")
            .build();
    }
}

/**
 * Access Swagger UI at: http://localhost:8080/swagger-ui.html
 * Access OpenAPI JSON at: http://localhost:8080/v3/api-docs
 */

// ================================================================
// VALIDATION ANNOTATIONS GUIDE
// ================================================================

/**
 * Comprehensive validation annotations for input security:
 * 
 * 1. STRING VALIDATION:
 *    @NotBlank - Not null, not empty, not whitespace only
 *    @NotNull - Not null (use for objects, booleans, numbers)
 *    @Size(min=X, max=Y) - String length constraints
 *    @Pattern(regexp="...") - Regex validation for format
 *    @Email - Valid email format
 * 
 * 2. NUMERIC VALIDATION:
 *    @Min(value) - Minimum value (inclusive)
 *    @Max(value) - Maximum value (inclusive)
 *    @Positive - Must be positive
 *    @PositiveOrZero - Must be positive or zero
 *    @Negative - Must be negative
 *    @DecimalMin / @DecimalMax - For BigDecimal
 * 
 * 3. COLLECTION VALIDATION:
 *    @NotEmpty - Collection/Map not null and not empty
 *    @Size(min=X, max=Y) - Collection size constraints
 * 
 * 4. DATE/TIME VALIDATION:
 *    @Past - Must be in the past
 *    @PastOrPresent - Must be in past or present
 *    @Future - Must be in the future
 *    @FutureOrPresent - Must be in future or present
 * 
 * 5. NESTED VALIDATION:
 *    @Valid - Cascade validation to nested objects
 * 
 * 6. CUSTOM CONSTRAINTS:
 *    Create custom annotations extending ConstraintValidator
 */

// ================================================================
// SECURITY BEST PRACTICES FOR INPUT VALIDATION
// ================================================================

/**
 * CRITICAL SECURITY CONSIDERATIONS:
 * 
 * 1. XSS PREVENTION:
 *    - Never trust user input
 *    - Sanitize HTML content before storage
 *    - Use Content Security Policy headers
 *    - Validate and escape output when rendering
 * 
 * 2. SQL INJECTION PREVENTION:
 *    - Always use parameterized queries
 *    - Never concatenate user input into SQL
 *    - Use JPA/Hibernate properly
 * 
 * 3. PATH TRAVERSAL PREVENTION:
 *    - Validate file paths strictly
 *    - Use whitelist approach for file operations
 *    - Never allow "../" in user input
 * 
 * 4. EMAIL INJECTION PREVENTION:
 *    - Validate email formats strictly
 *    - Sanitize email content
 *    - Prevent header injection in email fields
 * 
 * 5. JSON INJECTION PREVENTION:
 *    - Validate JSON structure
 *    - Use Jackson's security features
 *    - Set size limits on JSON input
 * 
 * 6. REGEX DOS PREVENTION:
 *    - Use simple, efficient regex patterns
 *    - Set timeouts for regex evaluation
 *    - Avoid catastrophic backtracking patterns
 * 
 * Example Security Configuration:
 */

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    // Configure Content Security Policy
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
                )
                .frameOptions(frame -> frame.deny())
                .xssProtection(xss -> xss.enable())
            )
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            );
        return http.build();
    }
    
    // Input sanitization bean
    @Bean
    public HTMLInputSanitizer htmlSanitizer() {
        return new HTMLInputSanitizer();
    }
}

/**
 * HTML Sanitizer to prevent XSS attacks
 */
@Component
public class HTMLInputSanitizer {
    private final Policy policy;
    
    public HTMLInputSanitizer() {
        // Configure OWASP AntiSamy policy
        this.policy = Policy.getInstance(
            getClass().getResourceAsStream("/antisamy-policy.xml")
        );
    }
    
    public String sanitize(String input) {
        if (input == null) return null;
        try {
            AntiSamy antiSamy = new AntiSamy();
            CleanResults results = antiSamy.scan(input, policy);
            return results.getCleanHTML();
        } catch (Exception e) {
            // Log error and return empty string or throw exception
            return "";
        }
    }
}

// ================================================================
// SECTION DTOs WITH SWAGGER ANNOTATIONS
// ================================================================

// Section Response DTO
@Schema(description = "Section type definition with metadata")
public class SectionResponse {
    @Schema(description = "Section type identifier", example = "heading1", required = true)
    private String type;
    
    @Schema(description = "Human-readable label", example = "Heading 1", required = true)
    private String label;
    
    @Schema(description = "Section description", example = "Large heading for major sections")
    private String description;
    
    @Schema(description = "Section category", example = "text", allowableValues = {"text", "media", "layout", "interactive"})
    private String category;
    
    @Schema(description = "Icon name from icon library", example = "Type")
    private String icon;
    
    @Schema(description = "Default content for new section", example = "Enter heading text")
    private String defaultContent;
    
    // Getters and setters
}

// Section Variable Response DTO
@Schema(description = "Variable definition for a section type")
public class SectionVariableResponse {
    @Schema(description = "Variable unique identifier")
    private UUID id;
    
    @Schema(description = "Associated section type", example = "table")
    private String sectionType;
    
    @Schema(description = "Variable name (used in code)", example = "tableData")
    private String variableName;
    
    @Schema(description = "Variable label (shown to users)", example = "Table Data")
    private String variableLabel;
    
    @Schema(description = "Data type", example = "table", allowableValues = {"text", "url", "list", "table"})
    private String variableType;
    
    @Schema(description = "Default value as JSON string", example = "{\"rows\":[[\"Header 1\",\"Header 2\"]]}")
    private String defaultValue;
    
    // Getters and setters
}

// Section with Variables Response DTO
@Schema(description = "Section definition with all associated variables")
public class SectionWithVariablesResponse {
    @Schema(description = "Section type identifier", example = "table")
    private String type;
    
    @Schema(description = "Human-readable label", example = "Table")
    private String label;
    
    @Schema(description = "Section description")
    private String description;
    
    @Schema(description = "Section category", allowableValues = {"text", "media", "layout", "interactive"})
    private String category;
    
    @Schema(description = "Icon name")
    private String icon;
    
    @Schema(description = "Default content")
    private String defaultContent;
    
    @Schema(description = "List of variables for this section type")
    private List<SectionVariableResponse> variables;
    
    // Getters and setters
}

// ================================================================
// TEMPLATE DTOs WITH VALIDATION AND SWAGGER ANNOTATIONS
// ================================================================

// Template Request DTO
@Schema(description = "Request to create or update a template")
public class TemplateRequest {
    @Schema(description = "Template name (required, max 255 chars)", example = "Incident Report Template", required = true)
    @NotBlank(message = "Template name is required")
    @Size(min = 1, max = 255, message = "Template name must be between 1 and 255 characters")
    @Pattern(regexp = "^[a-zA-Z0-9\\s\\-_.()]+$", message = "Template name contains invalid characters")
    private String name;
    
    @Schema(description = "Template description (max 1000 chars)", example = "Template for incident reporting")
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;
    
    @Schema(description = "Template category for organization", example = "Reports")
    @Size(max = 100, message = "Category must not exceed 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9\\s\\-_]+$", message = "Category contains invalid characters")
    private String category;
    
    @Schema(description = "Whether template is publicly accessible", example = "false", defaultValue = "false")
    private Boolean isPublic = false;
    
    @Schema(description = "List of sections in the template")
    @Valid
    private List<TemplateSectionRequest> sections;
    
    // Getters and setters
}

// Template Response DTO
@Schema(description = "Template summary information")
public class TemplateResponse {
    @Schema(description = "Template unique identifier")
    private UUID id;
    
    @Schema(description = "Template name", example = "Incident Report Template")
    private String name;
    
    @Schema(description = "Template description")
    private String description;
    
    @Schema(description = "Template category", example = "Reports")
    private String category;
    
    @Schema(description = "Public accessibility flag")
    private Boolean isPublic;
    
    @Schema(description = "User who created the template")
    private UUID userId;
    
    @Schema(description = "Template creation timestamp")
    private LocalDateTime createdAt;
    
    @Schema(description = "Last update timestamp")
    private LocalDateTime updatedAt;
    
    // Getters and setters
}

// Template Detail Response (includes sections)
@Schema(description = "Complete template with all sections and variables")
public class TemplateDetailResponse {
    @Schema(description = "Template unique identifier")
    private UUID id;
    
    @Schema(description = "Template name")
    private String name;
    
    @Schema(description = "Template description")
    private String description;
    
    @Schema(description = "Template category")
    private String category;
    
    @Schema(description = "Public accessibility flag")
    private Boolean isPublic;
    
    @Schema(description = "User who created the template")
    private UUID userId;
    
    @Schema(description = "Template creation timestamp")
    private LocalDateTime createdAt;
    
    @Schema(description = "Last update timestamp")
    private LocalDateTime updatedAt;
    
    @Schema(description = "All sections in the template")
    private List<TemplateSectionResponse> sections;
    
    @Schema(description = "All variables used in the template")
    private List<TemplateVariableResponse> variables;
    
    // Getters and setters
}

// Template Summary Response (for lists)
@Schema(description = "Template summary with counts")
public class TemplateSummaryResponse {
    @Schema(description = "Template unique identifier")
    private UUID id;
    
    @Schema(description = "Template name")
    private String name;
    
    @Schema(description = "Template description")
    private String description;
    
    @Schema(description = "Template category")
    private String category;
    
    @Schema(description = "Public accessibility flag")
    private Boolean isPublic;
    
    @Schema(description = "Template creation timestamp")
    private LocalDateTime createdAt;
    
    @Schema(description = "Last update timestamp")
    private LocalDateTime updatedAt;
    
    @Schema(description = "Number of sections in template", example = "5")
    private Integer sectionCount;
    
    @Schema(description = "Number of variables in template", example = "3")
    private Integer variableCount;
    
    // Getters and setters
}

// ================================================================
// TEMPLATE SECTION DTOs WITH VALIDATION AND SWAGGER
// ================================================================

// Template Section Request DTO
@Schema(description = "Request to create or update a template section")
public class TemplateSectionRequest {
    @Schema(description = "Section type (required, max 50 chars)", example = "heading1", required = true)
    @NotBlank(message = "Section type is required")
    @Size(min = 1, max = 50, message = "Section type must be between 1 and 50 characters")
    @Pattern(regexp = "^[a-z0-9\\-]+$", message = "Section type must be lowercase alphanumeric with hyphens only")
    private String sectionType;
    
    @Schema(description = "Section content (required)", example = "Incident Report", required = true)
    @NotBlank(message = "Content is required")
    @Size(min = 1, max = 10000, message = "Content must be between 1 and 10000 characters")
    private String content;
    
    @Schema(description = "Section variables as JSON string", example = "{\"items\": [\"Item 1\", \"Item 2\"]}")
    @Size(max = 50000, message = "Variables JSON must not exceed 50000 characters")
    private String variables;  // JSON string
    
    @Schema(description = "Section styles as JSON string", example = "{\"fontSize\": \"16px\", \"color\": \"#333\"}")
    @Size(max = 10000, message = "Styles JSON must not exceed 10000 characters")
    private String styles;     // JSON string
    
    @Schema(description = "Whether label can be edited at runtime", example = "true", defaultValue = "true")
    private Boolean isLabelEditable = true;
    
    @Schema(description = "Display order index (required)", example = "0", required = true)
    @NotNull(message = "Order index is required")
    @Min(value = 0, message = "Order index must be non-negative")
    @Max(value = 9999, message = "Order index must not exceed 9999")
    private Integer orderIndex;
    
    @Schema(description = "Parent section ID for nested sections")
    private UUID parentSectionId;
    
    @Schema(description = "Child sections (nested)")
    @Valid
    private List<TemplateSectionRequest> childSections;
    
    // Getters and setters
}

// Template Section Response DTO
@Schema(description = "Template section information")
public class TemplateSectionResponse {
    @Schema(description = "Section unique identifier")
    private UUID id;
    
    @Schema(description = "Template ID this section belongs to")
    private UUID templateId;
    
    @Schema(description = "Section type", example = "heading1")
    private String sectionType;
    
    @Schema(description = "Section content", example = "Incident Report")
    private String content;
    
    @Schema(description = "Variables as JSON string")
    private String variables;
    
    @Schema(description = "Styles as JSON string")
    private String styles;
    
    @Schema(description = "Whether label is editable")
    private Boolean isLabelEditable;
    
    @Schema(description = "Display order index")
    private Integer orderIndex;
    
    @Schema(description = "Parent section ID if nested")
    private UUID parentSectionId;
    
    @Schema(description = "Section creation timestamp")
    private LocalDateTime createdAt;
    
    // Getters and setters
}

// Template Section with Children Response
@Schema(description = "Template section with nested child sections")
public class TemplateSectionWithChildrenResponse {
    @Schema(description = "Section unique identifier")
    private UUID id;
    
    @Schema(description = "Template ID this section belongs to")
    private UUID templateId;
    
    @Schema(description = "Section type")
    private String sectionType;
    
    @Schema(description = "Section content")
    private String content;
    
    @Schema(description = "Variables as JSON string")
    private String variables;
    
    @Schema(description = "Styles as JSON string")
    private String styles;
    
    @Schema(description = "Whether label is editable")
    private Boolean isLabelEditable;
    
    @Schema(description = "Display order index")
    private Integer orderIndex;
    
    @Schema(description = "Parent section ID if nested")
    private UUID parentSectionId;
    
    @Schema(description = "Section creation timestamp")
    private LocalDateTime createdAt;
    
    @Schema(description = "Child sections nested under this section")
    private List<TemplateSectionWithChildrenResponse> childSections;
    
    // Getters and setters
}

// ================================================================
// TEMPLATE RUN DTOs WITH VALIDATION AND SWAGGER
// ================================================================

// Template Run Request DTO
@Schema(description = "Request to execute a template and optionally send via email")
public class TemplateRunRequest {
    @Schema(description = "Template ID to execute (required)", example = "550e8400-e29b-41d4-a716-446655440000", required = true)
    @NotNull(message = "Template ID is required")
    private UUID templateId;
    
    @Schema(description = "Recipient email addresses (comma-separated)", example = "user1@example.com,user2@example.com")
    @Pattern(regexp = "^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})(,\\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})*$", 
             message = "Invalid email format. Use comma-separated emails.")
    @Size(max = 1000, message = "Email list must not exceed 1000 characters")
    private String toEmails;
    
    @Schema(description = "CC email addresses (comma-separated)", example = "cc@example.com")
    @Pattern(regexp = "^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})(,\\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})*$", 
             message = "Invalid email format. Use comma-separated emails.")
    @Size(max = 1000, message = "CC email list must not exceed 1000 characters")
    private String ccEmails;
    
    @Schema(description = "BCC email addresses (comma-separated)", example = "bcc@example.com")
    @Pattern(regexp = "^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})(,\\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})*$", 
             message = "Invalid email format. Use comma-separated emails.")
    @Size(max = 1000, message = "BCC email list must not exceed 1000 characters")
    private String bccEmails;
    
    @Schema(description = "Variable values as JSON string (required)", example = "{\"incidentNumber\": \"INC-001\", \"description\": \"Server down\"}", required = true)
    @NotBlank(message = "Variables are required")
    @Size(min = 2, max = 100000, message = "Variables JSON must be between 2 and 100000 characters")
    private String variables;  // JSON string with variable values
    
    @Schema(description = "Execution status", example = "sent", defaultValue = "sent", allowableValues = {"sent", "draft", "failed", "pending"})
    @Pattern(regexp = "^(sent|draft|failed|pending)$", message = "Status must be one of: sent, draft, failed, pending")
    private String status = "sent";
    
    // Getters and setters
}

// Template Run Response DTO
@Schema(description = "Template execution result summary")
public class TemplateRunResponse {
    @Schema(description = "Run unique identifier")
    private UUID id;
    
    @Schema(description = "Template ID that was executed")
    private UUID templateId;
    
    @Schema(description = "Template name")
    private String templateName;
    
    @Schema(description = "Recipient email addresses")
    private String toEmails;
    
    @Schema(description = "CC email addresses")
    private String ccEmails;
    
    @Schema(description = "BCC email addresses")
    private String bccEmails;
    
    @Schema(description = "Variable values as JSON string")
    private String variables;
    
    @Schema(description = "Execution status", allowableValues = {"sent", "draft", "failed", "pending"})
    private String status;
    
    @Schema(description = "Execution timestamp")
    private LocalDateTime runAt;
    
    @Schema(description = "User who executed the template")
    private UUID userId;
    
    // Getters and setters
}

// Template Run Detail Response (includes HTML output)
@Schema(description = "Complete template execution details including HTML output")
public class TemplateRunDetailResponse {
    @Schema(description = "Run unique identifier")
    private UUID id;
    
    @Schema(description = "Template ID that was executed")
    private UUID templateId;
    
    @Schema(description = "Template name")
    private String templateName;
    
    @Schema(description = "Recipient email addresses")
    private String toEmails;
    
    @Schema(description = "CC email addresses")
    private String ccEmails;
    
    @Schema(description = "BCC email addresses")
    private String bccEmails;
    
    @Schema(description = "Variable values as JSON string")
    private String variables;
    
    @Schema(description = "Generated HTML output")
    private String htmlOutput;
    
    @Schema(description = "Execution status")
    private String status;
    
    @Schema(description = "Execution timestamp")
    private LocalDateTime runAt;
    
    @Schema(description = "User who executed the template")
    private UUID userId;
    
    // Getters and setters
}

// ================================================================
// TEMPLATE VARIABLE DTOs WITH VALIDATION AND SWAGGER
// ================================================================

// Template Variable Request DTO
@Schema(description = "Request to create or update a template variable")
public class TemplateVariableRequest {
    @Schema(description = "Template ID (required)", example = "550e8400-e29b-41d4-a716-446655440000", required = true)
    @NotNull(message = "Template ID is required")
    private UUID templateId;
    
    @Schema(description = "Variable name (required, max 255 chars, camelCase)", example = "incidentNumber", required = true)
    @NotBlank(message = "Variable name is required")
    @Size(min = 1, max = 255, message = "Variable name must be between 1 and 255 characters")
    @Pattern(regexp = "^[a-zA-Z][a-zA-Z0-9]*$", message = "Variable name must start with a letter and contain only letters and numbers (camelCase)")
    private String variableName;
    
    @Schema(description = "Variable label for UI display (required, max 255 chars)", example = "Incident Number", required = true)
    @NotBlank(message = "Variable label is required")
    @Size(min = 1, max = 255, message = "Variable label must be between 1 and 255 characters")
    private String variableLabel;
    
    @Schema(description = "Variable data type (required, max 50 chars)", example = "text", required = true, allowableValues = {"text", "url", "list", "table"})
    @NotBlank(message = "Variable type is required")
    @Size(min = 1, max = 50, message = "Variable type must be between 1 and 50 characters")
    @Pattern(regexp = "^(text|url|list|table)$", message = "Variable type must be one of: text, url, list, table")
    private String variableType;
    
    @Schema(description = "Default value for the variable", example = "INC-001")
    @Size(max = 10000, message = "Default value must not exceed 10000 characters")
    private String defaultValue;
    
    @Schema(description = "Whether variable is required", example = "false", defaultValue = "false")
    private Boolean required = false;
    
    // Getters and setters
}

// Template Variable Response DTO
@Schema(description = "Template variable information")
public class TemplateVariableResponse {
    @Schema(description = "Variable unique identifier")
    private UUID id;
    
    @Schema(description = "Template ID this variable belongs to")
    private UUID templateId;
    
    @Schema(description = "Variable name (camelCase)", example = "incidentNumber")
    private String variableName;
    
    @Schema(description = "Variable label", example = "Incident Number")
    private String variableLabel;
    
    @Schema(description = "Variable data type", example = "text", allowableValues = {"text", "url", "list", "table"})
    private String variableType;
    
    @Schema(description = "Default value", example = "INC-001")
    private String defaultValue;
    
    @Schema(description = "Whether variable is required")
    private Boolean required;
    
    @Schema(description = "Variable creation timestamp")
    private LocalDateTime createdAt;
    
    // Getters and setters
}

// ================================================================
// MAPSTRUCT MAPPERS
// ================================================================

/**
 * MapStruct generates implementation at compile-time.
 * Add dependency in pom.xml:
 * <dependency>
 *     <groupId>org.mapstruct</groupId>
 *     <artifactId>mapstruct</artifactId>
 *     <version>1.5.5.Final</version>
 * </dependency>
 */

// Section Mapper
@Mapper(componentModel = "spring")
public interface SectionMapper {
    SectionResponse toResponse(Section section);
    
    List<SectionResponse> toResponseList(List<Section> sections);
    
    SectionVariableResponse toVariableResponse(SectionVariable variable);
    
    List<SectionVariableResponse> toVariableResponseList(List<SectionVariable> variables);
    
    @Mapping(target = "variables", source = "variables")
    SectionWithVariablesResponse toWithVariablesResponse(Section section, List<SectionVariable> variables);
}

// Template Mapper
@Mapper(componentModel = "spring", uses = {TemplateSectionMapper.class, TemplateVariableMapper.class})
public interface TemplateMapper {
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "sections", ignore = true)
    @Mapping(target = "variables", ignore = true)
    @Mapping(target = "runs", ignore = true)
    Template toEntity(TemplateRequest request);
    
    TemplateResponse toResponse(Template template);
    
    @Mapping(target = "sectionCount", expression = "java(template.getSections() != null ? template.getSections().size() : 0)")
    @Mapping(target = "variableCount", expression = "java(template.getVariables() != null ? template.getVariables().size() : 0)")
    TemplateSummaryResponse toSummaryResponse(Template template);
    
    @Mapping(target = "sections", source = "sections")
    @Mapping(target = "variables", source = "variables")
    TemplateDetailResponse toDetailResponse(Template template);
    
    List<TemplateResponse> toResponseList(List<Template> templates);
    
    List<TemplateSummaryResponse> toSummaryResponseList(List<Template> templates);
}

// Template Section Mapper
@Mapper(componentModel = "spring")
public interface TemplateSectionMapper {
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "template", ignore = true)
    @Mapping(target = "parentSection", ignore = true)
    @Mapping(target = "childSections", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    TemplateSection toEntity(TemplateSectionRequest request);
    
    @Mapping(target = "templateId", source = "template.id")
    @Mapping(target = "parentSectionId", source = "parentSection.id")
    TemplateSectionResponse toResponse(TemplateSection section);
    
    @Mapping(target = "templateId", source = "template.id")
    @Mapping(target = "parentSectionId", source = "parentSection.id")
    @Mapping(target = "childSections", source = "childSections")
    TemplateSectionWithChildrenResponse toWithChildrenResponse(TemplateSection section);
    
    List<TemplateSectionResponse> toResponseList(List<TemplateSection> sections);
    
    List<TemplateSectionWithChildrenResponse> toWithChildrenResponseList(List<TemplateSection> sections);
}

// Template Run Mapper
@Mapper(componentModel = "spring")
public interface TemplateRunMapper {
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "template", ignore = true)
    @Mapping(target = "htmlOutput", ignore = true)
    @Mapping(target = "runAt", ignore = true)
    @Mapping(target = "userId", ignore = true)
    TemplateRun toEntity(TemplateRunRequest request);
    
    @Mapping(target = "templateId", source = "template.id")
    @Mapping(target = "templateName", source = "template.name")
    TemplateRunResponse toResponse(TemplateRun run);
    
    @Mapping(target = "templateId", source = "template.id")
    @Mapping(target = "templateName", source = "template.name")
    @Mapping(target = "htmlOutput", source = "htmlOutput")
    TemplateRunDetailResponse toDetailResponse(TemplateRun run);
    
    List<TemplateRunResponse> toResponseList(List<TemplateRun> runs);
}

// Template Variable Mapper
@Mapper(componentModel = "spring")
public interface TemplateVariableMapper {
    
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "template", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    TemplateVariable toEntity(TemplateVariableRequest request);
    
    @Mapping(target = "templateId", source = "template.id")
    TemplateVariableResponse toResponse(TemplateVariable variable);
    
    List<TemplateVariableResponse> toResponseList(List<TemplateVariable> variables);
}

// ================================================================
// USAGE EXAMPLE: CONTROLLERS WITH OPENAPI ANNOTATIONS
// ================================================================

/**
 * Example: Using DTOs, Mappers, and OpenAPI annotations in controllers
 * This provides complete API documentation automatically in Swagger UI
 */

@RestController
@RequestMapping("/api/templates-with-dtos")
@CrossOrigin(origins = "*")
@Tag(name = "Templates", description = "Template management API - Create, read, update, and delete templates with sections and variables")
@SecurityRequirement(name = "bearerAuth")
public class TemplateDTOController {
    @Autowired
    private TemplateService templateService;
    
    @Autowired
    private TemplateMapper templateMapper;
    
    // GET all templates as summaries
    @Operation(
        summary = "Get all templates",
        description = "Retrieve a list of all templates with summary information including section and variable counts"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Successfully retrieved templates",
            content = @Content(
                mediaType = "application/json",
                array = @ArraySchema(schema = @Schema(implementation = TemplateSummaryResponse.class))
            )
        ),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping
    public ResponseEntity<List<TemplateSummaryResponse>> getAllTemplates() {
        List<Template> templates = templateService.getAllTemplates();
        return ResponseEntity.ok(templateMapper.toSummaryResponseList(templates));
    }
    
    // GET template detail with sections and variables
    @Operation(
        summary = "Get template by ID",
        description = "Retrieve complete template details including all sections, variables, and configuration"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Template found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = TemplateDetailResponse.class)
            )
        ),
        @ApiResponse(responseCode = "404", description = "Template not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/{id}")
    public ResponseEntity<TemplateDetailResponse> getTemplateDetail(
        @Parameter(description = "Template ID", required = true, example = "550e8400-e29b-41d4-a716-446655440000")
        @PathVariable UUID id) {
        return templateService.getTemplateWithSectionsAndVariables(id)
            .map(templateMapper::toDetailResponse)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    // POST create new template
    @Operation(
        summary = "Create a new template",
        description = "Create a new template with sections and variables. All validations will be applied to the request body."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "201",
            description = "Template created successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = TemplateResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid request body - validation failed",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        ),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping
    public ResponseEntity<TemplateResponse> createTemplate(
        @Parameter(description = "Template data to create", required = true)
        @Valid @RequestBody TemplateRequest request) {
        Template template = templateMapper.toEntity(request);
        Template saved = templateService.createTemplate(template);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(templateMapper.toResponse(saved));
    }
    
    // PUT update template
    @Operation(
        summary = "Update an existing template",
        description = "Update template details. All sections and variables can be modified."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Template updated successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = TemplateResponse.class)
            )
        ),
        @ApiResponse(responseCode = "400", description = "Invalid request body - validation failed"),
        @ApiResponse(responseCode = "404", description = "Template not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PutMapping("/{id}")
    public ResponseEntity<TemplateResponse> updateTemplate(
        @Parameter(description = "Template ID to update", required = true, example = "550e8400-e29b-41d4-a716-446655440000")
        @PathVariable UUID id,
        @Parameter(description = "Updated template data", required = true)
        @Valid @RequestBody TemplateRequest request) {
        Template template = templateMapper.toEntity(request);
        Template updated = templateService.updateTemplate(id, template);
        return ResponseEntity.ok(templateMapper.toResponse(updated));
    }
    
    // DELETE template
    @Operation(
        summary = "Delete a template",
        description = "Permanently delete a template and all its associated sections and variables"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Template deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Template not found"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(
        @Parameter(description = "Template ID to delete", required = true, example = "550e8400-e29b-41d4-a716-446655440000")
        @PathVariable UUID id) {
        templateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}

// ================================================================
// ERROR RESPONSE DTO FOR API DOCUMENTATION
// ================================================================

@Schema(description = "Standard error response for validation failures and exceptions")
public class ErrorResponse {
    @Schema(description = "Error timestamp")
    private LocalDateTime timestamp;
    
    @Schema(description = "HTTP status code", example = "400")
    private int status;
    
    @Schema(description = "Error type", example = "Bad Request")
    private String error;
    
    @Schema(description = "Error message", example = "Template name is required")
    private String message;
    
    @Schema(description = "Request path that caused the error", example = "/api/templates-with-dtos")
    private String path;
    
    @Schema(description = "Field validation errors")
    private Map<String, String> fieldErrors;
    
    // Constructors, getters, and setters
}

// ================================================================
// GLOBAL EXCEPTION HANDLER WITH API DOCUMENTATION
// ================================================================

@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidationExceptions(
        MethodArgumentNotValidException ex,
        HttpServletRequest request) {
        
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(LocalDateTime.now());
        errorResponse.setStatus(HttpStatus.BAD_REQUEST.value());
        errorResponse.setError("Validation Failed");
        errorResponse.setMessage("Request validation failed");
        errorResponse.setPath(request.getRequestURI());
        
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> 
            fieldErrors.put(error.getField(), error.getDefaultMessage())
        );
        errorResponse.setFieldErrors(fieldErrors);
        
        return errorResponse;
    }
    
    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleResourceNotFound(
        ResourceNotFoundException ex,
        HttpServletRequest request) {
        
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(LocalDateTime.now());
        errorResponse.setStatus(HttpStatus.NOT_FOUND.value());
        errorResponse.setError("Not Found");
        errorResponse.setMessage(ex.getMessage());
        errorResponse.setPath(request.getRequestURI());
        
        return errorResponse;
    }
    
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGenericException(
        Exception ex,
        HttpServletRequest request) {
        
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(LocalDateTime.now());
        errorResponse.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
        errorResponse.setError("Internal Server Error");
        errorResponse.setMessage("An unexpected error occurred");
        errorResponse.setPath(request.getRequestURI());
        
        return errorResponse;
    }
}

// ================================================================

-- ================================================================
-- SEED DATA - INSERT ALL SECTIONS
-- ================================================================

INSERT INTO sections (type, label, description, category, icon, default_content)
VALUES 
  -- Headings
  ('heading1', 'Heading 1', 'Large heading - supports {{variable}} placeholders', 'text', 'Heading1', 'Main Title'),
  ('heading2', 'Heading 2', 'Section heading - supports {{variable}} placeholders', 'text', 'Heading2', 'Section Title'),
  ('heading3', 'Heading 3', 'Subsection heading - supports {{variable}} placeholders', 'text', 'Heading3', 'Subsection Title'),
  ('heading4', 'Heading 4', 'Minor heading - supports {{variable}} placeholders', 'text', 'Heading4', 'Minor Title'),
  ('heading5', 'Heading 5', 'Small heading - supports {{variable}} placeholders', 'text', 'Heading5', 'Small Title'),
  ('heading6', 'Heading 6', 'Smallest heading - supports {{variable}} placeholders', 'text', 'Heading6', 'Tiny Title'),
  
  -- Text Elements
  ('text', 'Text', 'Simple text - supports {{variable}} placeholders', 'text', 'Type', 'Your text here'),
  ('paragraph', 'Paragraph', 'Text paragraph - supports {{variable}} placeholders', 'text', 'AlignLeft', 'This is a paragraph with multiple lines of text. You can add more content here.'),
  ('static-text', 'Static Text', 'Enter text directly without placeholders', 'text', 'FileText', 'Enter your static text here...'),
  ('mixed-content', 'Mixed Content', 'Combine static text with dynamic variables', 'text', 'Type', 'Thymeleaf variable content'),
  ('labeled-content', 'Labeled Content', 'Section with dynamic label and content', 'text', 'FileText', 'Label with content'),
  
  -- Lists
  ('bullet-list-circle', 'Bullet List (Circle)', 'List with circle bullets', 'text', 'List', 'Circle bullet list'),
  ('bullet-list-disc', 'Bullet List (Disc)', 'List with disc bullets', 'text', 'List', 'Disc bullet list'),
  ('bullet-list-square', 'Bullet List (Square)', 'List with square bullets', 'text', 'List', 'Square bullet list'),
  ('number-list-1', 'Numbered List (1,2,3)', 'List with numbers', 'text', 'ListOrdered', 'Numbered list'),
  ('number-list-i', 'Numbered List (i,ii,iii)', 'List with roman numerals', 'text', 'ListOrdered', 'Roman numeral list'),
  ('number-list-a', 'Numbered List (a,b,c)', 'List with letters', 'text', 'ListOrdered', 'Letter list'),
  
  -- Layout Elements
  ('table', 'Table', 'Data table', 'layout', 'Table', 'Data table'),
  ('grid', 'Grid', 'Grid layout container', 'layout', 'Grid3x3', 'Grid layout'),
  ('container', 'Container', 'Container to group nested sections', 'layout', 'Box', 'Container'),
  ('html-content', 'HTML Content', 'Display raw HTML content', 'layout', 'Code', 'HTML content'),
  ('line-break', 'Line Break', 'Add vertical spacing', 'text', 'Minus', 'Line break'),
  
  -- Media
  ('image', 'Image', 'Image element', 'media', 'Image', 'Image'),
  
  -- Interactive Elements
  ('link', 'Link', 'Hyperlink element', 'interactive', 'Link', 'Hyperlink'),
  ('button', 'Button', 'Button element', 'interactive', 'MousePointerClick', 'Button');

-- ================================================================
-- SEED DATA - INSERT SECTION VARIABLES
-- ================================================================

INSERT INTO section_variables (section_type, variable_name, variable_label, variable_type, default_value)
VALUES
  -- Table variables
  ('table', 'tableData', 'Table Data', 'table', '{"rows":[["Header 1","Header 2"],["Data 1","Data 2"]],"showBorder":true,"mergedCells":{}}'),
  
  -- Bullet list variables (Circle)
  ('bullet-list-circle', 'items', 'List Items', 'list', '["Item 1","Item 2","Item 3"]'),
  
  -- Bullet list variables (Disc)
  ('bullet-list-disc', 'items', 'List Items', 'list', '["Item 1","Item 2","Item 3"]'),
  
  -- Bullet list variables (Square)
  ('bullet-list-square', 'items', 'List Items', 'list', '["Item 1","Item 2","Item 3"]'),
  
  -- Number list variables (1,2,3)
  ('number-list-1', 'items', 'List Items', 'list', '["First item","Second item","Third item"]'),
  
  -- Number list variables (i,ii,iii)
  ('number-list-i', 'items', 'List Items', 'list', '["First item","Second item","Third item"]'),
  
  -- Number list variables (a,b,c)
  ('number-list-a', 'items', 'List Items', 'list', '["First item","Second item","Third item"]'),
  
  -- Image variables
  ('image', 'src', 'Image URL', 'url', 'https://placehold.co/600x400'),
  ('image', 'alt', 'Alt Text', 'text', 'Placeholder'),
  
  -- Link variables
  ('link', 'href', 'Link URL', 'url', '#'),
  ('link', 'text', 'Link Text', 'text', 'Click here'),
  
  -- Button variables
  ('button', 'text', 'Button Text', 'text', 'Click me'),
  
  -- HTML Content variables
  ('html-content', 'htmlContent', 'HTML Content', 'text', '<div style="padding: 20px; border: 1px solid #ddd;"><h3>Sample HTML</h3><p>Content here</p></div>'),
  
  -- Static Text variables
  ('static-text', 'content', 'Text Content', 'text', 'Enter your static text here.'),
  
  -- Mixed Content variables
  ('mixed-content', 'content', 'Content (mix static text with variables)', 'text', 'Status: Dynamic value here'),
  
  -- Labeled Content variables
  ('labeled-content', 'label', 'Label/Heading (can include variables)', 'text', 'Incident Report'),
  ('labeled-content', 'contentType', 'Content Type', 'text', 'text'),
  ('labeled-content', 'content', 'Text Content', 'text', 'Messages journaled in exchange online'),
  ('labeled-content', 'items', 'List Items (if content type is list)', 'list', '["Item 1","Item 2"]');

GO`}</code>
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DatabaseSchema;
