# Brown Bag Session: Dynamic Template Platform

## 1. Problem Statement

### The Pain Points

| Problem | Impact |
|---------|--------|
| Manual email creation | Teams spend 30+ minutes crafting each personalized email manually |
| Inconsistent branding | Emails vary in style, tone, and layout across senders |
| No reusability | Every communication starts from scratch |
| Error-prone personalization | Manually inserting customer data leads to mistakes |
| Developer bottleneck | Business teams depend on developers for template changes |
| No live data integration | Pulling data from APIs requires manual lookup |

### Who Feels This Pain?

- **Operations teams** sending hundreds of transactional emails daily
- **Marketing teams** needing branded, dynamic communications
- **Customer service reps** responding with templated but personalized messages
- **Developers** constantly asked to "just change one thing" in email templates

---

## 2. Solution: Separate Design from Execution

We built a **Template Platform** that cleanly separates two concerns:

**DESIGN TIME (Build once)** → **RUN TIME (Send many times)**

| Design Time | Run Time |
|-------------|----------|
| Layout & sections | Fill variables |
| Styles & branding | Edit static content |
| Variable definitions | Configure API calls |
| API integrations | Preview & send |
| Designer Persona | Runner Persona |

> **Core Principle:** Designers invest 30 minutes once → Runners send in 10 seconds, every time.

### Three Content Types

| Type | Description | Example |
|------|-------------|---------|
| **Static Content** | Fixed text/images editable per-send | Greeting copy, footer disclaimers |
| **Placeholders / Variables** | `{{tokens}}` filled at send time | `{{customerName}}`, `{{orderId}}` |
| **API Data** | Live data fetched from REST APIs | Order line items, account details |

---

## 3. What Is This Tool?

A **full-stack template builder and sender platform** for creating dynamic, data-driven email templates with:

- Visual drag-and-drop editor — No HTML/CSS knowledge needed
- 19+ section types — Text, images, tables, containers, buttons, and more
- Live variable system — Type `{{variableName}}` and it's auto-detected
- REST API integration — Pull live data into templates at send time
- Real-time preview — See exactly what recipients will get
- Template cloning — Duplicate existing templates instantly
- Role-based workflows — Designers build, Runners send

---

## 4. Features

| Feature | Description |
|---------|-------------|
| Section Library | 19+ section types: Headings, Paragraphs, Images, Tables, Containers, Buttons, Lists, Banners, Separators |
| Drag & Drop Editor | Reorder sections visually — drag from library or rearrange in editor |
| Rich Text Editing | Inline content editing with formatting toolbar (bold, italic, links, colors) |
| Variable System | Auto-detection of `{{placeholder}}` tokens with intellisense autocomplete |
| Variable Editor | Set default values, labels, and data types (text, URL, list, table) for each variable |
| Style Customization | Per-section styling: fonts, colors, padding, margins, alignment, backgrounds |
| API Integration | Connect REST APIs with JSONPath mapping to auto-populate template sections |
| Global API Panel | Share API configurations across multiple sections |
| Real-time Preview | Live preview with variable substitution and API data |
| Template Cloning | Deep-clone templates including all sections, styles, variables, and API configs |
| Thymeleaf Support | Conditional and loop blocks for advanced logic |
| Container Sections | Nested section support for complex layouts |
| Data Transformations | Transform API response data before inserting into templates |
| Template Validation | Validate templates for missing variables, broken references, and errors |
| Delegation System | Share template access with team members |

### Key Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Home / Dashboard | `/` | Platform overview and quick actions |
| Template Editor | `/templates` → Edit | Full designer experience |
| Run Templates | `/run-templates` | Runner experience — fill & send |
| Section Library | `/sections` | Browse all available section types |
| Database Schema | `/database-schema` | View backend data structure |
| ER Diagram | `/er-diagram` | Entity relationship visualization |

---

## 5. Two Personas

### Persona 1: Template Designer 🎨

**Who:** Content creators, marketing managers, developers who build reusable templates.

**Workflow:** Open Editor → Add Sections → Insert `{{Variables}}` → Style → Configure APIs → Save

**What they do:**

1. **Build layout** — Drag sections from the Section Library (text blocks, images, tables, containers)
2. **Add placeholders** — Type `{{customerName}}` anywhere; the system auto-detects it
3. **Configure variables** — Set defaults, labels, and types in the Variable Editor panel
4. **Style sections** — Customize fonts, colors, spacing, alignment per section
5. **Connect APIs** — Map REST API responses to template sections using JSONPath
6. **Add logic** — Use `{{if isVIP}}...{{/if}}` and `{{each item in items}}...{{/each}}`
7. **Save & publish** — Template is now available for all Runners

---

### Persona 2: Template Runner / Sender 📤

**Who:** Operations teams, customer service reps, marketing ops who send communications.

**Workflow:** Select Template → Edit Content → Fill Variables → Configure API → Preview → Send

**What they do:**

1. **Select template** — Browse and pick a pre-designed template
2. **Compose tab** — Edit static text content (greetings, paragraphs, disclaimers)
3. **Variables tab** — Fill `{{placeholders}}` with real values (names, IDs, amounts)
4. **API tab** — Provide API parameters to fetch live data (order details, user info)
5. **Preview** — See the final merged output with all data populated
6. **Send** — Deliver the communication

**Key constraints:**
- Cannot add/remove sections or change layout
- Cannot modify template styles or structure
- Edits are per-send — original template stays untouched
- Sees only what the Designer exposed

---

### Persona Comparison

| Capability | Designer | Runner |
|-----------|----------|--------|
| Add/remove sections | ✅ | ❌ |
| Edit static text | ✅ | ✅ |
| Define variables | ✅ | ❌ |
| Fill variable values | ✅ | ✅ |
| Change styles | ✅ | ❌ |
| Configure API mappings | ✅ | ❌ |
| Provide API parameters | ✅ | ✅ |
| Preview | ✅ | ✅ |
| Save template | ✅ | ❌ |
| Clone template | ✅ | ❌ |

---

## 6. How I Built This — Code & Technologies

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | React 18 + TypeScript 5 | Type safety, component architecture, hooks |
| Build Tool | Vite 5 | Blazing fast HMR, optimized builds |
| Styling | Tailwind CSS 3 + CSS Modules (SCSS) | Utility-first + scoped component styles |
| UI Components | shadcn/ui + Radix UI | Accessible, composable primitives |
| Drag & Drop | @dnd-kit | Performant, accessible DnD with sortable lists |
| State Management | React hooks + Context API | Lightweight, no external state library needed |
| Data Fetching | TanStack React Query | Caching, refetching, loading states |
| Routing | React Router v6 | Declarative, nested routes |
| Icons | Lucide React | Consistent, tree-shakeable icon set |
| Rich Text | Custom contentEditable | Full control over editing behavior |
| Notifications | Sonner + Radix Toast | Stacked, dismissible toast system |
| Guided Tours | Intro.js | Step-by-step onboarding walkthrough |
| Spreadsheet Export | xlsx (SheetJS) | Export table data to Excel |
| Sanitization | DOMPurify | XSS protection for user-generated HTML |

### Key Architecture Decisions

**1. Thymeleaf Conversion Engine**

The platform uses a bidirectional conversion system:

- User types: `{{customerName}}`
- Stored as: `<span th:utext="${customerName}"/>`
- Displayed as: `{{customerName}}` (in editor)
- Rendered as: John Doe (in preview with values)

Users never see raw Thymeleaf — they work with simple curly braces. The conversion happens transparently.

**2. Section-Based Architecture**

Templates are composed of independent sections, each with:
- **type** — what kind of section (heading, paragraph, table, etc.)
- **content** — the HTML content with embedded placeholders
- **styles** — per-section styling (fonts, colors, spacing)
- **variables** — extracted placeholder definitions
- **apiConfig** — optional API data binding

This makes templates modular — sections can be reordered, added, or removed without affecting others.

**3. Variable Auto-Detection**

When a user types `{{anyVariable}}` in content, the system:
1. Scans all section content with regex
2. Extracts unique variable names
3. Creates variable definitions with defaults
4. Provides intellisense suggestions as you type

**4. Global API Resolution**

API data flows through a resolver that:
1. Fetches data from configured REST endpoints
2. Extracts values using JSONPath expressions
3. Stores results in a global variable namespace
4. Replaces `{{apiData.field.path}}` with actual values using dot-notation traversal

**5. CSS Modules for Scoping**

Every component has a co-located `.module.scss` file preventing style leakage between components. Each component's styles are scoped and won't conflict.

**6. Storage Abstraction**

Templates are stored via an abstraction layer that currently uses localStorage for the demo but is designed to swap to a REST API backend for production.

### File Structure Overview

- **src/components/templates/** — 20+ template-specific components (EditorView, PreviewView, SectionLibrary, VariableEditor, StyleEditor, RichTextEditor, GlobalApiPanel)
- **src/components/ui/** — 40+ shadcn/ui components
- **src/lib/** — Core utilities (thymeleafUtils, globalApiResolver, variableExtractor, templateStorage, templateValidation, sanitize)
- **src/types/** — Type definitions (section, api-config, template-variable, global-api-config)
- **src/pages/** — Route pages (Templates, TemplateEditor, RunTemplates, Sections, Index)
- **src/hooks/** — Custom hooks (useVariableIntellisense, useTemplateWalkthrough)

---

## 7. Demo Flow (5-7 minutes)

### Part 1: Runner Demo (2-3 min)

1. Open `/run-templates` → Select a template
2. **Compose tab** → Edit a greeting line
3. **Variables tab** → Fill `{{customerName}}` = "John", `{{orderId}}` = "#12345"
4. **Preview** → Show merged output
5. **Key message:** "10 seconds to send what took 30 minutes to design"

### Part 2: Designer Demo (3-4 min)

1. Open `/templates` → Create new template
2. Drag sections from Section Library
3. Type `{{customerName}}` in content → Show auto-detection
4. Open Variable Editor → Set defaults
5. Style a section (font, color, spacing)
6. Clone the template → Show deep copy
7. **Key message:** "Design once, send hundreds of times"

---

## 8. Q&A Talking Points

**Q: Can Runners break the template?**
A: No. They can only edit text and fill variables — not change layout or styles.

**Q: What about production use?**
A: The storage layer is abstracted. Swap localStorage → REST API for production. Backend entity schemas are already documented.

**Q: How does API data work?**
A: Designers configure endpoints + JSONPath mappings. At send time, the Runner provides parameters, data is fetched and auto-populated.

**Q: Why Thymeleaf?**
A: Server-side rendering. Templates are processed by a Java/Spring backend where Thymeleaf is the standard template engine. Our frontend converts friendly syntax to Thymeleaf transparently.

**Q: How long did this take?**
A: Built iteratively using Lovable AI — rapid prototyping with React + TypeScript + shadcn/ui.

---

## 9. System Architecture

### High-Level Architecture

| Layer | Responsibility | Technology |
|-------|---------------|------------|
| Frontend (SPA) | Template builder UI, preview, variable editing | React 18 + TypeScript + Vite |
| Backend API | REST endpoints, template CRUD, execution | Spring Boot + Java |
| Template Engine | Server-side rendering of final output | Thymeleaf |
| Database | Persistent storage of all entities | MS SQL Server |
| External APIs | Live data for template population | REST (Jira, GitHub, ServiceNow, etc.) |

### Request Flow

```
User Browser (React SPA)
    │
    ├── GET /api/templates ──────────► Spring Boot Controller
    │                                      │
    │                                      ▼
    │                                 Service Layer
    │                                      │
    │                                      ▼
    │                                 JPA Repository
    │                                      │
    │                                      ▼
    │                                 MS SQL Server
    │
    ├── POST /api/templates/{id}/run ──► Controller → Service → Thymeleaf Engine
    │                                                     │
    │                                                     ▼
    │                                              Rendered HTML Output
    │
    └── External API calls ──────────► REST Client → JSONPath Extraction → Global Variables
```

### Backend Layered Architecture

The backend follows a strict **layered architecture** pattern:

| Layer | Pattern | Example |
|-------|---------|---------|
| Entity | JPA `@Entity` classes mapped to DB tables | `Template.java`, `TemplateSection.java` |
| Repository | Spring Data JPA interfaces | `TemplateRepository.java` |
| Service | Business logic, validation, orchestration | `TemplateService.java` |
| Controller | REST endpoints with Swagger docs | `TemplateController.java` |
| DTO | Request/Response objects with validation | `TemplateRequest.java`, `TemplateResponse.java` |
| Mapper | Bidirectional entity ↔ DTO conversion | MapStruct `TemplateMapper.java` |

---

## 10. Data Model & Entity Relationships

### Entity Relationship Diagram

```
┌─────────────────┐                    ┌────────────────────┐
│    sections     │◄───────────────────│  section_variables │
│  (Master Data)  │   FK: section_type │    (Metadata)      │
└─────────────────┘                    └────────────────────┘
        │
        │ (logical reference via section_type)
        ▼
┌─────────────────┐      FK: template_id    ┌────────────────────┐
│   templates     │◄────────────────────────│  template_sections │
│ (User Docs)     │                         │  (Section Instances)│
└────────┬────────┘                         └─────────┬──────────┘
         │                                            │
         │ FK: template_id                            │ FK: parent_section_id
         ▼                                            │ (SELF-REFERENCE)
┌─────────────────┐                                   ▼
│  template_runs  │                         ┌────────────────────┐
│ (Execution Log) │                         │  (Nested Sections) │
└─────────────────┘                         └────────────────────┘

┌─────────────────┐      FK: template_id    ┌─────────────────────────────────┐
│   templates     │◄────────────────────────│ template_global_api_integrations│
└─────────────────┘     (1:Many)            │  (Global API Integrations)      │
                                            └─────────┬───────────────────────┘
                                                      │ FK: api_template_id
                                                      ▼
                                            ┌────────────────────┐
                                            │   api_templates    │
                                            │  (API Definitions) │
                                            └─────────┬──────────┘
                                                      │ FK: api_template_id
                                                      ▼
                                            ┌────────────────────┐
                                            │ api_template_params│
                                            │  (API Parameters)  │
                                            └────────────────────┘
```

### Table Summary

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `sections` | Master catalog of section types (building blocks) | `type`, `label`, `category`, `icon`, `default_content` |
| `section_variables` | Dual-purpose: variable definitions (catalog) + instance values | `section_type`, `template_section_id`, `variable_name`, `variable_type`, `default_value` |
| `templates` | User-created templates with generated HTML | `name`, `subject`, `html`, `user_id` |
| `template_sections` | Section instances within a template | `template_id`, `section_type`, `content`, `variables` (JSON), `styles` (JSON), `order_index` |
| `template_runs` | Audit log of every template execution | `template_id`, `to_emails`, `variables` (JSON), `html_output`, `status` |
| `template_variables` | Template-level placeholder definitions | `template_id`, `variable_name`, `variable_type`, `default_value` |
| `api_templates` | Pre-configured API endpoint catalog | `name`, `url`, `method`, `category`, `mock_data` |
| `api_template_params` | Parameters for each API template | `api_template_id`, `param_name`, `param_type`, `location` |
| `template_global_api_integrations` | Links templates to API integrations | `template_id`, `api_template_id`, `variable_name`, `param_values` (JSON), `transformation` (JSON) |

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Dual-purpose `section_variables`** | One table serves both the master catalog (what variables exist per section type) and instance values (actual data per template section). Differentiated by `CHECK` constraint. |
| **Self-referencing `template_sections`** | `parent_section_id` enables container/nested sections without a separate junction table. |
| **JSON columns for `variables` and `styles`** | Flexible schema for section-specific data (lists, tables, styling) without rigid column definitions. |
| **Cascade deletes** | Deleting a template automatically removes all sections, runs, variables, and API integrations. |
| **Logical references (not FK) for `section_type`** | `template_sections.section_type` references `sections.type` logically to allow frontend-only section types. |

---

## 11. Database Schema Setup

### Prerequisites

- MS SQL Server 2019+
- Database created with appropriate collation

### Table Creation Order (respecting FK dependencies)

1. `sections` — No dependencies
2. `templates` — No dependencies
3. `api_templates` — No dependencies
4. `template_sections` — Depends on `templates`
5. `section_variables` — Depends on `sections`, `template_sections`
6. `template_runs` — Depends on `templates`
7. `template_variables` — Depends on `templates`
8. `api_template_params` — Depends on `api_templates`
9. `template_global_api_integrations` — Depends on `templates`, `api_templates`

### Core Tables SQL

```sql
-- 1. Sections (master catalog)
CREATE TABLE sections (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  type NVARCHAR(50) NOT NULL UNIQUE,
  label NVARCHAR(100) NOT NULL,
  description NVARCHAR(MAX),
  category NVARCHAR(50) NOT NULL,
  icon NVARCHAR(50),
  default_content NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- 2. Templates
CREATE TABLE templates (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(255) NOT NULL,
  subject NVARCHAR(500),
  html NVARCHAR(MAX) NOT NULL,
  user_id UNIQUEIDENTIFIER,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- 3. Template Sections (with nesting support)
CREATE TABLE template_sections (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_id UNIQUEIDENTIFIER NOT NULL,
  section_type NVARCHAR(50) NOT NULL,
  content NVARCHAR(MAX) NOT NULL,
  variables NVARCHAR(MAX),       -- JSON
  styles NVARCHAR(MAX),          -- JSON
  is_label_editable BIT DEFAULT 1,
  order_index INT NOT NULL,
  parent_section_id UNIQUEIDENTIFIER,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT fk_ts_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_ts_parent FOREIGN KEY (parent_section_id) REFERENCES template_sections(id)
);

-- 4. API Templates (endpoint catalog)
CREATE TABLE api_templates (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  category NVARCHAR(100),
  url NVARCHAR(2000) NOT NULL,
  method NVARCHAR(10) NOT NULL,
  headers NVARCHAR(MAX),         -- JSON
  body_template NVARCHAR(MAX),
  mock_data NVARCHAR(MAX),       -- JSON
  created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- 5. Template Global API Integrations
CREATE TABLE template_global_api_integrations (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_id UNIQUEIDENTIFIER NOT NULL,
  api_template_id UNIQUEIDENTIFIER NOT NULL,
  integration_name NVARCHAR(255) NOT NULL,
  variable_name NVARCHAR(100) NOT NULL,
  param_values NVARCHAR(MAX),    -- JSON
  transformation NVARCHAR(MAX),  -- JSON
  enabled BIT DEFAULT 1,
  created_at DATETIME2 DEFAULT GETUTCDATE(),
  CONSTRAINT fk_tgai_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  CONSTRAINT fk_tgai_api FOREIGN KEY (api_template_id) REFERENCES api_templates(id)
);

-- 6. Template Runs (execution audit log)
CREATE TABLE template_runs (
  id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
  template_id UNIQUEIDENTIFIER NOT NULL,
  to_emails NVARCHAR(MAX) NOT NULL,
  cc_emails NVARCHAR(MAX),
  bcc_emails NVARCHAR(MAX),
  variables NVARCHAR(MAX),       -- JSON
  html_output NVARCHAR(MAX) NOT NULL,
  run_at DATETIME2 DEFAULT GETUTCDATE(),
  status NVARCHAR(50) DEFAULT 'sent',
  user_id UNIQUEIDENTIFIER,
  CONSTRAINT fk_tr_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);
```

### Indexes

```sql
CREATE INDEX idx_sections_type ON sections(type);
CREATE INDEX idx_templates_user ON templates(user_id);
CREATE INDEX idx_ts_template ON template_sections(template_id);
CREATE INDEX idx_ts_order ON template_sections(template_id, order_index);
CREATE INDEX idx_ts_parent ON template_sections(parent_section_id);
CREATE INDEX idx_tr_template ON template_runs(template_id);
CREATE INDEX idx_tr_run_at ON template_runs(run_at DESC);
CREATE INDEX idx_tgai_template ON template_global_api_integrations(template_id);
```

---

## 12. Spring Boot Entity Model (Backend)

### Key Entities

| Entity | Table | Key Relationships |
|--------|-------|-------------------|
| `Template` | `templates` | `@OneToMany` → `TemplateSection`, `TemplateRun`, `TemplateGlobalApiIntegration` |
| `TemplateSection` | `template_sections` | `@ManyToOne` → `Template`, self-reference for nesting |
| `Section` | `sections` | `@OneToMany` → `SectionVariable` (catalog) |
| `SectionVariable` | `section_variables` | `@ManyToOne` → `Section` or `TemplateSection` |
| `ApiTemplate` | `api_templates` | `@OneToMany` → `ApiTemplateParam` |
| `TemplateGlobalApiIntegration` | `template_global_api_integrations` | `@ManyToOne` → `Template`, `ApiTemplate` |
| `TemplateRun` | `template_runs` | `@ManyToOne` → `Template` |

### DTO Pattern

Every entity uses a **Request/Response DTO** pattern:

```
TemplateRequest  ──► MapStruct Mapper ──► Template Entity ──► DB
DB ──► Template Entity ──► MapStruct Mapper ──► TemplateResponse
```

| DTO | Purpose |
|-----|---------|
| `TemplateRequest` | Incoming data with `@NotBlank`, `@Size` validation |
| `TemplateResponse` | Outgoing data with nested sections, variables, integrations |
| `TemplateSectionRequest` | Section creation with content, styles, order |
| `TemplateSectionResponse` | Section data including resolved children |

### Optimized Query for Full Template Load

```java
@Query("SELECT t FROM Template t " +
       "LEFT JOIN FETCH t.sections s " +
       "LEFT JOIN FETCH t.integrations i " +
       "LEFT JOIN FETCH i.apiTemplate at " +
       "LEFT JOIN FETCH at.params " +
       "WHERE t.id = :id " +
       "ORDER BY s.orderIndex ASC")
Optional<Template> findByIdWithFullDetails(@Param("id") UUID id);
```

This single query loads the entire template graph (sections + API integrations + params) in one database round trip.

---

## 13. Frontend ↔ Backend Data Flow

### Template Save Flow

```
React Editor State
    │
    ├── sections[] with content, styles, variables
    ├── globalApiConfig with integrations[]
    └── template metadata (name, subject)
         │
         ▼
    templateApi.saveTemplate()
         │
         ▼
    POST /api/templates
         │
         ▼
    TemplateController → TemplateService → TemplateRepository
         │
         ▼
    DB: templates + template_sections + template_global_api_integrations
```

### Template Run Flow

```
Runner fills variables + provides API params
    │
    ▼
POST /api/templates/{id}/run
    │
    ├── Fetch template with sections
    ├── Resolve API integrations (call external APIs)
    ├── Apply data transformations (filter, sort, map)
    ├── Merge variables into Thymeleaf placeholders
    ├── Render final HTML via Thymeleaf engine
    └── Save to template_runs (audit log)
         │
         ▼
    Return rendered HTML → Display in preview / Send as email
```

### Storage Abstraction

The frontend uses a storage abstraction layer (`templateStorage.ts`) that:

| Method | Current (Demo) | Production |
|--------|---------------|------------|
| `saveTemplate()` | localStorage | `POST /api/templates` |
| `loadTemplate()` | localStorage | `GET /api/templates/{id}/full` |
| `listTemplates()` | localStorage | `GET /api/templates` |
| `deleteTemplate()` | localStorage | `DELETE /api/templates/{id}` |
| `cloneTemplate()` | localStorage | `POST /api/templates/{id}/clone` |

Fallback: If the backend API call fails, the system automatically falls back to localStorage for offline capability.
