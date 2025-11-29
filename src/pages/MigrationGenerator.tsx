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
    "001_create_sections": `-- Migration: 001_create_sections.sql
-- Description: Create sections and section_variables tables

CREATE TABLE sections (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  type NVARCHAR(50) NOT NULL UNIQUE,
  label NVARCHAR(100) NOT NULL,
  description NVARCHAR(MAX),
  category NVARCHAR(50) NOT NULL,
  icon NVARCHAR(50), -- Lucide icon name (e.g., 'Heading1', 'Type', 'Table')
  default_content NVARCHAR(MAX),
  is_custom BIT DEFAULT 0,
  created_by UNIQUEIDENTIFIER,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_sections_category ON sections(category);
CREATE INDEX idx_sections_custom ON sections(is_custom, created_by);

-- Section Variables Table
CREATE TABLE section_variables (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  section_type NVARCHAR(50) NOT NULL,
  variable_name NVARCHAR(100) NOT NULL,
  variable_label NVARCHAR(100) NOT NULL,
  variable_type NVARCHAR(50) NOT NULL,
  default_value NVARCHAR(MAX), -- JSON string
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT uk_section_variables UNIQUE(section_type, variable_name),
  CONSTRAINT fk_section_variables_type FOREIGN KEY (section_type) REFERENCES sections(type)
);

CREATE INDEX idx_section_variables_type ON section_variables(section_type);

GO`,

    "002_create_templates": `-- Migration: 002_create_templates.sql
-- Description: Create templates and template_runs tables

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

-- Template Runs Table
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
  CONSTRAINT fk_template_runs_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_template_runs_template_id ON template_runs(template_id);
CREATE INDEX idx_template_runs_run_at ON template_runs(run_at DESC);
CREATE INDEX idx_template_runs_user_id ON template_runs(user_id);

GO`,

    "003_create_template_sections": `-- Migration: 003_create_template_sections.sql
-- Description: Create template_sections table with self-referencing for nested sections

CREATE TABLE template_sections (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_id UNIQUEIDENTIFIER NOT NULL,
  section_type NVARCHAR(50) NOT NULL,
  content NVARCHAR(MAX) NOT NULL,
  variables NVARCHAR(MAX), -- JSON object
  styles NVARCHAR(MAX), -- JSON object
  order_index INT NOT NULL,
  parent_section_id UNIQUEIDENTIFIER,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT fk_template_sections_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_sections_parent FOREIGN KEY (parent_section_id) REFERENCES template_sections(id)
);

CREATE INDEX idx_template_sections_template_id ON template_sections(template_id);
CREATE INDEX idx_template_sections_order ON template_sections(template_id, order_index);
CREATE INDEX idx_template_sections_parent ON template_sections(parent_section_id);

GO`,

    "004_create_api_templates": `-- Migration: 004_create_api_templates.sql
-- Description: Create API templates and parameters tables

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

-- API Template Parameters Table
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
  CONSTRAINT fk_api_template_params_template FOREIGN KEY (api_template_id) REFERENCES api_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_template_params_template ON api_template_params(api_template_id);

GO`,

    "005_create_api_configs": `-- Migration: 005_create_api_configs.sql
-- Description: Create API configurations and mappings tables

CREATE TABLE template_api_configs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_id UNIQUEIDENTIFIER NOT NULL,
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  enabled BIT DEFAULT 0,
  param_values NVARCHAR(MAX), -- JSON object
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT uk_template_api_configs UNIQUE(template_id),
  CONSTRAINT fk_template_api_configs_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_template_api_configs_api_template FOREIGN KEY (api_template_id) REFERENCES api_templates(id)
);

CREATE INDEX idx_template_api_configs_template ON template_api_configs(template_id);

-- API Mappings Table
CREATE TABLE api_mappings (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_api_config_id UNIQUEIDENTIFIER NOT NULL,
  section_id UNIQUEIDENTIFIER NOT NULL,
  api_path NVARCHAR(MAX) NOT NULL,
  data_type NVARCHAR(50) NOT NULL,
  variable_name NVARCHAR(100),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT fk_api_mappings_config FOREIGN KEY (template_api_config_id) REFERENCES template_api_configs(id) ON DELETE CASCADE,
  CONSTRAINT fk_api_mappings_section FOREIGN KEY (section_id) REFERENCES template_sections(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_mappings_config ON api_mappings(template_api_config_id);
CREATE INDEX idx_api_mappings_section ON api_mappings(section_id);

GO`,

    "006_seed_data": `-- Migration: 006_seed_data.sql
-- Description: Seed initial section types

INSERT INTO sections (type, label, description, category, icon, default_content, is_custom)
VALUES 
  -- Headings
  ('heading1', 'Heading 1', 'Large heading - supports {{variable}} placeholders', 'text', 'Heading1', 'Main Title', 0),
  ('heading2', 'Heading 2', 'Section heading - supports {{variable}} placeholders', 'text', 'Heading2', 'Section Title', 0),
  ('heading3', 'Heading 3', 'Subsection heading - supports {{variable}} placeholders', 'text', 'Heading3', 'Subsection Title', 0),
  ('heading4', 'Heading 4', 'Minor heading - supports {{variable}} placeholders', 'text', 'Heading4', 'Minor Title', 0),
  ('heading5', 'Heading 5', 'Small heading - supports {{variable}} placeholders', 'text', 'Heading5', 'Small Title', 0),
  ('heading6', 'Heading 6', 'Smallest heading - supports {{variable}} placeholders', 'text', 'Heading6', 'Tiny Title', 0),
  
  -- Text Elements
  ('text', 'Text', 'Simple text - supports {{variable}} placeholders', 'text', 'Type', 'Your text here', 0),
  ('paragraph', 'Paragraph', 'Text paragraph - supports {{variable}} placeholders', 'text', 'AlignLeft', 'This is a paragraph', 0),
  ('static-text', 'Static Text', 'Enter text directly without placeholders', 'text', 'FileText', 'Enter your static text here', 0),
  ('mixed-content', 'Mixed Content', 'Combine static text with dynamic variables', 'text', 'Type', 'Thymeleaf variable content', 0),
  ('labeled-content', 'Labeled Content', 'Section with dynamic label and content', 'text', 'FileText', 'Label with content', 0),
  
  -- Lists
  ('bullet-list-circle', 'Bullet List (Circle)', 'List with circle bullets', 'text', 'List', 'Circle bullet list', 0),
  ('bullet-list-disc', 'Bullet List (Disc)', 'List with disc bullets', 'text', 'List', 'Disc bullet list', 0),
  ('bullet-list-square', 'Bullet List (Square)', 'List with square bullets', 'text', 'List', 'Square bullet list', 0),
  ('number-list-1', 'Numbered List (1,2,3)', 'List with numbers', 'text', 'ListOrdered', 'Numbered list', 0),
  ('number-list-i', 'Numbered List (i,ii,iii)', 'List with roman numerals', 'text', 'ListOrdered', 'Roman numeral list', 0),
  ('number-list-a', 'Numbered List (a,b,c)', 'List with letters', 'text', 'ListOrdered', 'Letter list', 0),
  
  -- Layout Elements
  ('table', 'Table', 'Data table', 'layout', 'Table', 'Data table', 0),
  ('grid', 'Grid', 'Grid layout container', 'layout', 'Grid3x3', 'Grid layout', 0),
  ('container', 'Container', 'Container to group nested sections', 'layout', 'Box', 'Container', 0),
  ('html-content', 'HTML Content', 'Display raw HTML content', 'layout', 'Code', 'HTML content', 0),
  ('line-break', 'Line Break', 'Add vertical spacing', 'text', 'Minus', 'Line break', 0),
  
  -- Media
  ('image', 'Image', 'Image element', 'media', 'Image', 'Image', 0),
  
  -- Interactive Elements
  ('link', 'Link', 'Hyperlink element', 'interactive', 'Link', 'Hyperlink', 0),
  ('button', 'Button', 'Button element', 'interactive', 'MousePointerClick', 'Button', 0);

-- Insert Section Variables
INSERT INTO section_variables (section_type, variable_name, variable_label, variable_type, default_value)
VALUES
  -- Table variables
  ('table', 'tableData', 'Table Data', 'table', '{"rows":[["Header 1","Header 2"],["Data 1","Data 2"]],"showBorder":true,"mergedCells":{}}'),
  
  -- Bullet list variables
  ('bullet-list-circle', 'items', 'List Items', 'list', '["Item 1","Item 2","Item 3"]'),
  ('bullet-list-disc', 'items', 'List Items', 'list', '["Item 1","Item 2","Item 3"]'),
  ('bullet-list-square', 'items', 'List Items', 'list', '["Item 1","Item 2","Item 3"]'),
  
  -- Number list variables
  ('number-list-1', 'items', 'List Items', 'list', '["First item","Second item","Third item"]'),
  ('number-list-i', 'items', 'List Items', 'list', '["First item","Second item","Third item"]'),
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
  ('html-content', 'htmlContent', 'HTML Content', 'text', '<div style="padding: 20px;"><h3>Sample HTML</h3></div>'),
  
  -- Static Text variables
  ('static-text', 'content', 'Text Content', 'text', 'Enter your static text here.'),
  
  -- Mixed Content variables
  ('mixed-content', 'content', 'Content (mix static with variables)', 'text', 'Status: Dynamic value'),
  
  -- Labeled Content variables
  ('labeled-content', 'label', 'Label/Heading', 'text', 'Incident Report'),
  ('labeled-content', 'contentType', 'Content Type', 'text', 'text'),
  ('labeled-content', 'content', 'Text Content', 'text', 'Messages journaled'),
  ('labeled-content', 'items', 'List Items', 'list', '["Item 1","Item 2"]');

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
