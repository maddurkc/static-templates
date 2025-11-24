import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Network } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import styles from "./ERDiagram.module.scss";

const ERDiagram = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <Network />
        </div>
        <div>
          <h1>Entity Relationship Diagram</h1>
          <p>Interactive database schema visualization</p>
        </div>
      </div>

      <Tabs defaultValue="full" className="w-full">
        <TabsList>
          <TabsTrigger value="full">Full Schema</TabsTrigger>
          <TabsTrigger value="core">Core Tables</TabsTrigger>
          <TabsTrigger value="api">API Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="full" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complete Database Schema</CardTitle>
              <CardDescription>
                All tables and their relationships in the PageBuilder database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles.diagramBox}>
                <pre className="text-sm">
{`erDiagram
    sections ||--o{ template_sections : "used in"
    sections ||--o{ section_variables : "defines"
    
    templates ||--o{ template_sections : "contains"
    templates ||--o{ template_runs : "executed as"
    templates ||--|| template_api_configs : "has"
    
    template_sections ||--o{ template_sections : "parent-child"
    template_sections ||--o{ api_mappings : "mapped to"
    
    template_api_configs ||--o{ api_mappings : "contains"
    template_api_configs }o--|| api_templates : "uses"
    
    api_templates ||--o{ api_template_params : "requires"
    
    sections {
        uuid id PK
        varchar type UK
        varchar label
        text description
        varchar category
        text default_content
        boolean is_custom
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }
    
    section_variables {
        uuid id PK
        varchar section_type FK
        varchar variable_name
        varchar variable_label
        varchar variable_type
        jsonb default_value
        timestamp created_at
    }
    
    templates {
        uuid id PK
        varchar name
        text html
        uuid user_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    template_sections {
        uuid id PK
        uuid template_id FK
        varchar section_type FK
        text content
        jsonb variables
        jsonb styles
        int order_index
        uuid parent_section_id FK
        timestamp created_at
    }
    
    template_runs {
        uuid id PK
        uuid template_id FK
        text_array to_emails
        text_array cc_emails
        text_array bcc_emails
        jsonb variables
        text html_output
        timestamp run_at
        varchar status
        uuid user_id FK
    }
    
    api_templates {
        uuid id PK
        varchar name
        text description
        varchar category
        text url_template
        varchar method
        jsonb headers
        text body_template
        boolean is_custom
        uuid created_by FK
        timestamp created_at
    }
    
    api_template_params {
        uuid id PK
        uuid api_template_id FK
        varchar param_name
        varchar param_label
        varchar param_type
        varchar param_location
        text placeholder
        boolean required
        text description
        jsonb options
        timestamp created_at
    }
    
    template_api_configs {
        uuid id PK
        uuid template_id FK
        uuid api_template_id FK
        boolean enabled
        jsonb param_values
        timestamp created_at
        timestamp updated_at
    }
    
    api_mappings {
        uuid id PK
        uuid template_api_config_id FK
        uuid section_id FK
        text api_path
        varchar data_type
        varchar variable_name
        timestamp created_at
    }`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="core" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Tables Schema</CardTitle>
              <CardDescription>
                Main entities: sections, templates, and template sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles.diagramBox}>
                <pre className="text-sm">
{`erDiagram
    sections ||--o{ template_sections : "used in"
    sections ||--o{ section_variables : "defines"
    templates ||--o{ template_sections : "contains"
    template_sections ||--o{ template_sections : "parent-child"
    
    sections {
        uuid id PK
        varchar type UK "heading1, paragraph, container, etc"
        varchar label "Display name"
        varchar category "text, media, layout, interactive"
        text default_content
        boolean is_custom "User-created section"
        timestamp created_at
    }
    
    section_variables {
        uuid id PK
        varchar section_type FK
        varchar variable_name "e.g., content, items"
        varchar variable_type "text, url, list, table"
        jsonb default_value
    }
    
    templates {
        uuid id PK
        varchar name "Template title"
        text html "Generated HTML output"
        uuid user_id FK
        timestamp created_at
    }
    
    template_sections {
        uuid id PK
        uuid template_id FK
        varchar section_type FK
        text content "Raw content with placeholders"
        jsonb variables "Section-specific variable values"
        jsonb styles "fontSize, color, padding, etc"
        int order_index "Display order"
        uuid parent_section_id FK "For nested sections"
    }`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Integration Schema</CardTitle>
              <CardDescription>
                API templates, configurations, and data mappings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles.diagramBox}>
                <pre className="text-sm">
{`erDiagram
    templates ||--|| template_api_configs : "configured with"
    template_api_configs }o--|| api_templates : "uses"
    template_api_configs ||--o{ api_mappings : "contains"
    api_templates ||--o{ api_template_params : "requires"
    api_mappings }o--|| template_sections : "updates"
    
    api_templates {
        uuid id PK
        varchar name "JIRA Get Issue, GitHub PR"
        varchar category "jira, github, rest"
        text url_template "With placeholders"
        varchar method "GET, POST, PUT, DELETE"
        jsonb headers "Authorization, etc"
        text body_template "For POST/PUT"
    }
    
    api_template_params {
        uuid id PK
        uuid api_template_id FK
        varchar param_name "domain, version, issueKey"
        varchar param_location "path, query, header, body"
        varchar param_type "text, number, select"
        boolean required
    }
    
    template_api_configs {
        uuid id PK
        uuid template_id FK
        uuid api_template_id FK
        boolean enabled
        jsonb param_values "User-provided values"
    }
    
    api_mappings {
        uuid id PK
        uuid template_api_config_id FK
        uuid section_id FK
        text api_path "JSONPath: data.fields.summary"
        varchar data_type "text, list, html"
        varchar variable_name "Which variable to update"
    }`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className={styles.keyCard}>
        <CardHeader>
          <CardTitle className={styles.keyTitle}>
            <Database />
            Key Relationships
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.keyGrid}>
            <div className={styles.keyItem}>
              <h3 className="font-semibold mb-2">1:Many Relationships</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Templates → Template Sections</li>
                <li>• Templates → Template Runs</li>
                <li>• Sections → Template Sections</li>
                <li>• API Templates → Params</li>
                <li>• API Configs → Mappings</li>
              </ul>
            </div>

            <div className={styles.keyItem}>
              <h3>1:1 Relationships</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Templates ↔ API Configs</li>
              </ul>
            </div>

            <div className={styles.keyItem}>
              <h3>Self-Referencing</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Template Sections (parent-child)</li>
                <li>• Enables nested container sections</li>
              </ul>
            </div>

            <div className={styles.keyItem}>
              <h3>CASCADE Deletes</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Delete template → removes sections</li>
                <li>• Delete section → removes children</li>
                <li>• Delete API config → removes mappings</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ERDiagram;
