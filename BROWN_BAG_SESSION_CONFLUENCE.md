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
