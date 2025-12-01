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
  icon NVARCHAR(50), -- Lucide icon name (e.g., 'Heading1', 'Type', 'Table')
  default_content NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_sections_category ON sections(category);

-- ================================================================
-- SECTION_VARIABLES TABLE
-- Defines available variables for each section type
-- ================================================================
CREATE TABLE section_variables (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  section_type NVARCHAR(50) NOT NULL,
  variable_name NVARCHAR(100) NOT NULL,
  variable_label NVARCHAR(100) NOT NULL,
  variable_type NVARCHAR(50) NOT NULL,
  default_value NVARCHAR(MAX), -- JSON string for complex defaults
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT uk_section_variables UNIQUE(section_type, variable_name),
  CONSTRAINT fk_section_variables_type FOREIGN KEY (section_type) 
    REFERENCES sections(type)
);

CREATE INDEX idx_section_variables_type ON section_variables(section_type);

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
// SECTION DTOs
// ================================================================

// Section Response DTO
public class SectionResponse {
    private String type;
    private String label;
    private String description;
    private String category;
    private String icon;
    private String defaultContent;
    
    // Getters and setters
}

// Section Variable Response DTO
public class SectionVariableResponse {
    private UUID id;
    private String sectionType;
    private String variableName;
    private String variableLabel;
    private String variableType;
    private String defaultValue;
    
    // Getters and setters
}

// Section with Variables Response DTO
public class SectionWithVariablesResponse {
    private String type;
    private String label;
    private String description;
    private String category;
    private String icon;
    private String defaultContent;
    private List<SectionVariableResponse> variables;
    
    // Getters and setters
}

// ================================================================
// TEMPLATE DTOs
// ================================================================

// Template Request DTO
public class TemplateRequest {
    @NotBlank(message = "Template name is required")
    @Size(max = 255)
    private String name;
    
    @Size(max = 1000)
    private String description;
    
    private String category;
    
    private Boolean isPublic = false;
    
    @Valid
    private List<TemplateSectionRequest> sections;
    
    // Getters and setters
}

// Template Response DTO
public class TemplateResponse {
    private UUID id;
    private String name;
    private String description;
    private String category;
    private Boolean isPublic;
    private UUID userId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Getters and setters
}

// Template Detail Response (includes sections)
public class TemplateDetailResponse {
    private UUID id;
    private String name;
    private String description;
    private String category;
    private Boolean isPublic;
    private UUID userId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TemplateSectionResponse> sections;
    private List<TemplateVariableResponse> variables;
    
    // Getters and setters
}

// Template Summary Response (for lists)
public class TemplateSummaryResponse {
    private UUID id;
    private String name;
    private String description;
    private String category;
    private Boolean isPublic;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer sectionCount;
    private Integer variableCount;
    
    // Getters and setters
}

// ================================================================
// TEMPLATE SECTION DTOs
// ================================================================

// Template Section Request DTO
public class TemplateSectionRequest {
    @NotBlank(message = "Section type is required")
    @Size(max = 50)
    private String sectionType;
    
    @NotBlank(message = "Content is required")
    private String content;
    
    private String variables;  // JSON string
    private String styles;     // JSON string
    private Boolean isLabelEditable = true;
    
    @NotNull(message = "Order index is required")
    private Integer orderIndex;
    
    private UUID parentSectionId;
    
    @Valid
    private List<TemplateSectionRequest> childSections;
    
    // Getters and setters
}

// Template Section Response DTO
public class TemplateSectionResponse {
    private UUID id;
    private UUID templateId;
    private String sectionType;
    private String content;
    private String variables;
    private String styles;
    private Boolean isLabelEditable;
    private Integer orderIndex;
    private UUID parentSectionId;
    private LocalDateTime createdAt;
    
    // Getters and setters
}

// Template Section with Children Response
public class TemplateSectionWithChildrenResponse {
    private UUID id;
    private UUID templateId;
    private String sectionType;
    private String content;
    private String variables;
    private String styles;
    private Boolean isLabelEditable;
    private Integer orderIndex;
    private UUID parentSectionId;
    private LocalDateTime createdAt;
    private List<TemplateSectionWithChildrenResponse> childSections;
    
    // Getters and setters
}

// ================================================================
// TEMPLATE RUN DTOs
// ================================================================

// Template Run Request DTO
public class TemplateRunRequest {
    @NotNull(message = "Template ID is required")
    private UUID templateId;
    
    @Email(message = "Invalid email format")
    private String toEmails;
    
    private String ccEmails;
    private String bccEmails;
    
    @NotBlank(message = "Variables are required")
    private String variables;  // JSON string with variable values
    
    private String status = "sent";
    
    // Getters and setters
}

// Template Run Response DTO
public class TemplateRunResponse {
    private UUID id;
    private UUID templateId;
    private String templateName;
    private String toEmails;
    private String ccEmails;
    private String bccEmails;
    private String variables;
    private String status;
    private LocalDateTime runAt;
    private UUID userId;
    
    // Getters and setters
}

// Template Run Detail Response (includes HTML output)
public class TemplateRunDetailResponse {
    private UUID id;
    private UUID templateId;
    private String templateName;
    private String toEmails;
    private String ccEmails;
    private String bccEmails;
    private String variables;
    private String htmlOutput;
    private String status;
    private LocalDateTime runAt;
    private UUID userId;
    
    // Getters and setters
}

// ================================================================
// TEMPLATE VARIABLE DTOs
// ================================================================

// Template Variable Request DTO
public class TemplateVariableRequest {
    @NotNull(message = "Template ID is required")
    private UUID templateId;
    
    @NotBlank(message = "Variable name is required")
    @Size(max = 255)
    private String variableName;
    
    @NotBlank(message = "Variable label is required")
    @Size(max = 255)
    private String variableLabel;
    
    @NotBlank(message = "Variable type is required")
    @Size(max = 50)
    private String variableType;
    
    private String defaultValue;
    private Boolean required = false;
    
    // Getters and setters
}

// Template Variable Response DTO
public class TemplateVariableResponse {
    private UUID id;
    private UUID templateId;
    private String variableName;
    private String variableLabel;
    private String variableType;
    private String defaultValue;
    private Boolean required;
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
// USAGE EXAMPLE IN CONTROLLERS
// ================================================================

/**
 * Example: Using DTOs and Mappers in a controller
 */

@RestController
@RequestMapping("/api/templates-with-dtos")
@CrossOrigin(origins = "*")
public class TemplateDTOController {
    @Autowired
    private TemplateService templateService;
    
    @Autowired
    private TemplateMapper templateMapper;
    
    // GET all templates as summaries
    @GetMapping
    public ResponseEntity<List<TemplateSummaryResponse>> getAllTemplates() {
        List<Template> templates = templateService.getAllTemplates();
        return ResponseEntity.ok(templateMapper.toSummaryResponseList(templates));
    }
    
    // GET template detail with sections and variables
    @GetMapping("/{id}")
    public ResponseEntity<TemplateDetailResponse> getTemplateDetail(@PathVariable UUID id) {
        return templateService.getTemplateWithSectionsAndVariables(id)
            .map(templateMapper::toDetailResponse)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    // POST create new template
    @PostMapping
    public ResponseEntity<TemplateResponse> createTemplate(
        @Valid @RequestBody TemplateRequest request) {
        Template template = templateMapper.toEntity(request);
        Template saved = templateService.createTemplate(template);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(templateMapper.toResponse(saved));
    }
    
    // PUT update template
    @PutMapping("/{id}")
    public ResponseEntity<TemplateResponse> updateTemplate(
        @PathVariable UUID id,
        @Valid @RequestBody TemplateRequest request) {
        Template template = templateMapper.toEntity(request);
        Template updated = templateService.updateTemplate(id, template);
        return ResponseEntity.ok(templateMapper.toResponse(updated));
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
