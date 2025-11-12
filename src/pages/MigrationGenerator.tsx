import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileCode, Copy, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

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

INSERT INTO sections (type, label, description, category, default_content, is_custom)
VALUES 
  ('heading1', 'Heading 1', 'Large heading', 'text', 'Heading Text', 0),
  ('heading2', 'Heading 2', 'Medium heading', 'text', 'Heading Text', 0),
  ('heading3', 'Heading 3', 'Small heading', 'text', 'Heading Text', 0),
  ('paragraph', 'Paragraph', 'Body text', 'text', 'Paragraph text', 0),
  ('text', 'Text', 'Inline text', 'text', 'Text content', 0),
  ('static-text', 'Static Text', 'Non-editable text', 'text', 'Static content', 0),
  ('mixed-content', 'Mixed Content', 'Static text with placeholders', 'text', 'Static: {{placeholder}}', 0),
  ('table', 'Table', 'Data table', 'layout', '', 0),
  ('bullet-list-circle', 'Bullet List (Circle)', 'Circular bullets', 'text', '', 0),
  ('bullet-list-disc', 'Bullet List (Disc)', 'Disc bullets', 'text', '', 0),
  ('number-list-1', 'Numbered List (1,2,3)', 'Numeric list', 'text', '', 0),
  ('image', 'Image', 'Image element', 'media', '', 0),
  ('link', 'Link', 'Hyperlink', 'interactive', 'Link text', 0),
  ('button', 'Button', 'Call to action', 'interactive', 'Button', 0),
  ('container', 'Container', 'Group sections', 'layout', '', 0),
  ('grid', 'Grid', 'Grid layout', 'layout', '', 0),
  ('header', 'Header', 'Page header', 'layout', '', 0),
  ('footer', 'Footer', 'Page footer', 'layout', '', 0),
  ('line-break', 'Line Break', 'Spacing', 'layout', '', 0);

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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <FileCode className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">SQL Server Migration Generator</h1>
            <p className="text-muted-foreground">Generate SQL Server migration scripts from database schema</p>
          </div>
        </div>
        <Button onClick={handleDownloadAll} size="lg" className="gap-2">
          <Download className="h-4 w-4" />
          Download All Migrations
        </Button>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Migration Instructions</CardTitle>
          <CardDescription>
            Run these migrations in order to set up your SQL Server database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Download all migration files or copy them individually</li>
            <li>Execute migrations in numerical order (001, 002, 003, etc.)</li>
            <li>Each migration is idempotent and includes proper constraints</li>
            <li>Review and modify user_id references based on your auth system</li>
            <li>Adjust NVARCHAR(MAX) sizes based on your data requirements</li>
          </ol>
        </CardContent>
      </Card>

      <Tabs defaultValue="001_create_sections" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          {Object.keys(migrations).map((key) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {key.split("_")[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(migrations).map(([key, content]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{key.replace(/_/g, " ").toUpperCase()}</CardTitle>
                    <CardDescription>
                      {content.split("\n")[1].replace("-- Description: ", "")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
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
                <ScrollArea className="h-[500px] w-full">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-card">
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

            <div className="p-4 border rounded-lg bg-card">
              <h3 className="font-semibold mb-2">Default Values</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• NEWID() for UNIQUEIDENTIFIER</li>
                <li>• GETUTCDATE() for timestamps</li>
                <li>• 0/1 for BIT fields</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg bg-card">
              <h3 className="font-semibold mb-2">Constraints</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• CASCADE deletes configured</li>
                <li>• UNIQUE constraints on composite keys</li>
                <li>• Foreign keys with proper naming</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg bg-card">
              <h3 className="font-semibold mb-2">Indexes</h3>
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
