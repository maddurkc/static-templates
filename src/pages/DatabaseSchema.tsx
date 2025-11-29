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
              <p className={styles.cardValue}>1</p>
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
              <p className={styles.cardValue}>9</p>
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
                <code>{`-- ================================================================
-- SECTIONS TABLE
-- Stores all available section types (heading, paragraph, etc.)
-- ================================================================
CREATE TABLE sections (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  type NVARCHAR(50) NOT NULL UNIQUE,
  label NVARCHAR(100) NOT NULL,
  description NVARCHAR(MAX),
  category NVARCHAR(50) NOT NULL,
  default_content NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_sections_category ON sections(category);

-- ================================================================
-- TEMPLATES TABLE
-- Stores user-created templates
-- ================================================================
CREATE TABLE templates (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(255) NOT NULL,
  html NVARCHAR(MAX) NOT NULL,
  user_id UNIQUEIDENTIFIER,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_created_at ON templates(created_at DESC);

-- ================================================================
-- TEMPLATE_SECTIONS TABLE
-- Junction table storing sections within a template
-- Supports nested sections via parent_section_id
-- ================================================================
CREATE TABLE template_sections (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_id UNIQUEIDENTIFIER NOT NULL,
  section_type NVARCHAR(50) NOT NULL,
  content NVARCHAR(MAX) NOT NULL,
  variables NVARCHAR(MAX), -- JSON object
  styles NVARCHAR(MAX), -- JSON object
  is_label_editable BIT DEFAULT 1,
  order_index INT NOT NULL,
  parent_section_id UNIQUEIDENTIFIER,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT fk_template_sections_template FOREIGN KEY (template_id) 
    REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_sections_parent FOREIGN KEY (parent_section_id) 
    REFERENCES template_sections(id)
);

CREATE INDEX idx_template_sections_template_id ON template_sections(template_id);
CREATE INDEX idx_template_sections_order ON template_sections(template_id, order_index);
CREATE INDEX idx_template_sections_parent ON template_sections(parent_section_id);

-- ================================================================
-- TEMPLATE_RUNS TABLE
-- Stores history of template executions/sends
-- ================================================================
CREATE TABLE template_runs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_id UNIQUEIDENTIFIER NOT NULL,
  to_emails NVARCHAR(MAX), -- JSON array
  cc_emails NVARCHAR(MAX), -- JSON array
  bcc_emails NVARCHAR(MAX), -- JSON array
  variables NVARCHAR(MAX), -- JSON object
  html_output NVARCHAR(MAX) NOT NULL,
  run_at DATETIME2 DEFAULT GETUTCDATE(),
  status NVARCHAR(50) DEFAULT 'sent',
  user_id UNIQUEIDENTIFIER,
  CONSTRAINT fk_template_runs_template FOREIGN KEY (template_id) 
    REFERENCES templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_template_runs_template_id ON template_runs(template_id);
CREATE INDEX idx_template_runs_run_at ON template_runs(run_at DESC);
CREATE INDEX idx_template_runs_user_id ON template_runs(user_id);

-- ================================================================
-- TEMPLATE_VARIABLES TABLE
-- Tracks available variables per template for validation
-- ================================================================
CREATE TABLE template_variables (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_id UNIQUEIDENTIFIER NOT NULL,
  variable_name NVARCHAR(100) NOT NULL,
  variable_type NVARCHAR(50) DEFAULT 'text',
  required BIT DEFAULT 0,
  default_value NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT uk_template_variables UNIQUE(template_id, variable_name),
  CONSTRAINT fk_template_variables_template FOREIGN KEY (template_id) 
    REFERENCES templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_template_variables_template_id ON template_variables(template_id);

-- ================================================================
-- API_TEMPLATES TABLE
-- Stores reusable API endpoint configurations
-- ================================================================
CREATE TABLE api_templates (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  category NVARCHAR(100),
  url_template NVARCHAR(MAX) NOT NULL,
  method NVARCHAR(10) NOT NULL,
  headers NVARCHAR(MAX), -- JSON object
  body_template NVARCHAR(MAX),
  is_custom BIT DEFAULT 0,
  created_by UNIQUEIDENTIFIER,
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_api_templates_category ON api_templates(category);

-- ================================================================
-- API_TEMPLATE_PARAMS TABLE
-- Defines parameters required for API templates
-- ================================================================
CREATE TABLE api_template_params (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  param_name NVARCHAR(100) NOT NULL,
  param_label NVARCHAR(100) NOT NULL,
  param_type NVARCHAR(50) NOT NULL,
  param_location NVARCHAR(50) NOT NULL,
  placeholder NVARCHAR(MAX),
  required BIT DEFAULT 1,
  description NVARCHAR(MAX),
  options NVARCHAR(MAX), -- JSON array
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT uk_api_template_params UNIQUE(api_template_id, param_name),
  CONSTRAINT fk_api_template_params_template FOREIGN KEY (api_template_id) 
    REFERENCES api_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_template_params_template ON api_template_params(api_template_id);

-- ================================================================
-- TEMPLATE_API_CONFIGS TABLE
-- Links templates to API templates with user-provided values
-- ================================================================
CREATE TABLE template_api_configs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_id UNIQUEIDENTIFIER NOT NULL,
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  enabled BIT DEFAULT 0,
  param_values NVARCHAR(MAX), -- JSON object
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT uk_template_api_configs UNIQUE(template_id),
  CONSTRAINT fk_template_api_configs_template FOREIGN KEY (template_id) 
    REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_api_configs_api_template FOREIGN KEY (api_template_id) 
    REFERENCES api_templates(id)
);

CREATE INDEX idx_template_api_configs_template ON template_api_configs(template_id);

-- ================================================================
-- API_MAPPINGS TABLE
-- Maps API response data to specific sections within templates
-- ================================================================
CREATE TABLE api_mappings (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_api_config_id UNIQUEIDENTIFIER NOT NULL,
  section_id UNIQUEIDENTIFIER NOT NULL,
  api_path NVARCHAR(MAX) NOT NULL,
  data_type NVARCHAR(50) NOT NULL,
  variable_name NVARCHAR(100),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT fk_api_mappings_config FOREIGN KEY (template_api_config_id) 
    REFERENCES template_api_configs(id) ON DELETE CASCADE,
  CONSTRAINT fk_api_mappings_section FOREIGN KEY (section_id) 
    REFERENCES template_sections(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_mappings_config ON api_mappings(template_api_config_id);
CREATE INDEX idx_api_mappings_section ON api_mappings(section_id);

-- ================================================================
-- EXAMPLE QUERIES
-- ================================================================

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
