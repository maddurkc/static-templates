# Brown Bag Session: Dynamic Template Platform

---

## 1. Problem Statement

### The Pain Points

| Problem | Impact |
|---------|--------|
| **Manual email creation** | Teams spend 30+ minutes crafting each personalized email manually — copy-pasting data, fixing formatting, and proofreading |
| **Inconsistent branding** | Without a centralized template system, emails vary in style, tone, and layout across senders |
| **No reusability** | Every communication starts from scratch — no way to leverage previous designs |
| **Error-prone personalization** | Manually inserting customer names, order IDs, and dynamic data leads to mistakes (e.g., "Dear {{customerName}}") |
| **Developer bottleneck** | Business teams depend on developers to create/update email templates with HTML/CSS |
| **No live data integration** | Pulling data from APIs (order details, user profiles) requires manual lookup and copy-paste |

### Who Feels This Pain?
- **Operations teams** sending hundreds of transactional emails daily
- **Marketing teams** needing branded, dynamic communications
- **Customer service reps** responding with templated but personalized messages
- **Developers** constantly asked to "just change one thing" in email templates

---

## 2. Solution

### Our Approach: Separate Design from Execution

We built a **Template Platform** that cleanly separates two concerns:

```
┌─────────────────────────┐      ┌─────────────────────────┐
│   DESIGN TIME           │      │   RUN TIME              │
│   (Build once)          │  →   │   (Send many times)     │
│                         │      │                         │
│   • Layout & sections   │      │   • Fill variables      │
│   • Styles & branding   │      │   • Edit static content │
│   • Variable definitions│      │   • Configure API calls │
│   • API integrations    │      │   • Preview & send      │
└─────────────────────────┘      └─────────────────────────┘
     Designer Persona                 Runner Persona
```

**Core Principle:** Designers invest 30 minutes once → Runners send in 10 seconds, every time.

### Three Content Types

Every template handles three types of dynamic content:

| Type | Description | Example |
|------|-------------|---------|
| **Static Content** | Fixed text/images editable per-send | Greeting copy, footer disclaimers |
| **Placeholders / Variables** | `{{tokens}}` filled at send time | `{{customerName}}`, `{{orderId}}` |
| **API Data** | Live data fetched from REST APIs | Order line items, account details |

---

## 3. What Is This Tool?

A **full-stack template builder and sender platform** for creating dynamic, data-driven email templates with:

- **Visual drag-and-drop editor** — No HTML/CSS knowledge needed
- **19+ section types** — Text, images, tables, containers, buttons, and more
- **Live variable system** — Type `{{variableName}}` and it's auto-detected
- **REST API integration** — Pull live data into templates at send time
- **Real-time preview** — See exactly what recipients will get
- **Template cloning** — Duplicate existing templates instantly
- **Role-based workflows** — Designers build, Runners send

### Platform Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Frontend (React SPA)               │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Template    │  │  Run         │  │  Section     │ │
│  │  Editor      │  │  Templates   │  │  Library     │ │
│  │  (Designer)  │  │  (Runner)    │  │  (Catalog)   │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────────┘ │
│         │                │                            │
│  ┌──────┴────────────────┴───────────────────────┐   │
│  │           Template Storage & API Layer          │   │
│  │  • Local Storage (demo) / REST API (prod)      │   │
│  │  • Thymeleaf conversion engine                 │   │
│  │  • Variable extraction & validation            │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## 4. Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Section Library** | 19+ section types: Headings (H1-H6), Paragraphs, Images, Tables, Containers, Buttons, Lists, Banners, Separators |
| **Drag & Drop Editor** | Reorder sections visually with `@dnd-kit` — drag from library or rearrange in editor |
| **Rich Text Editing** | Inline content editing with formatting toolbar (bold, italic, links, colors) |
| **Variable System** | Auto-detection of `{{placeholder}}` tokens with intellisense autocomplete |
| **Variable Editor** | Set default values, labels, and data types (text, URL, list, table) for each variable |
| **Style Customization** | Per-section styling: fonts, colors, padding, margins, alignment, backgrounds |
| **API Integration** | Connect REST APIs with JSONPath mapping to auto-populate template sections |
| **Global API Panel** | Share API configurations across multiple sections |
| **Real-time Preview** | Live preview with variable substitution and API data |
| **Template Cloning** | Deep-clone templates including all sections, styles, variables, and API configs |
| **Thymeleaf Support** | Conditional (`{{if}}`) and loop (`{{each}}`) blocks for advanced logic |
| **Container Sections** | Nested section support for complex layouts |
| **Data Transformations** | Transform API response data before inserting into templates |
| **Template Validation** | Validate templates for missing variables, broken references, and errors |
| **Delegation System** | Share template access with team members |
| **Export / Walkthrough** | Guided tour for new users with `intro.js` |

### Screenshots / Key Screens

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

**Their workflow:**

```
Open Editor → Add Sections → Insert {{Variables}} → Style → Configure APIs → Save
```

**What they do:**

1. **Build layout** — Drag sections from the Section Library (text blocks, images, tables, containers)
2. **Add placeholders** — Type `{{customerName}}` anywhere; the system auto-detects it
3. **Configure variables** — Set defaults, labels, and types in the Variable Editor panel
4. **Style sections** — Customize fonts, colors, spacing, alignment per section
5. **Connect APIs** — Map REST API responses to template sections using JSONPath
6. **Add logic** — Use `{{if isVIP}}...{{/if}}` and `{{each item in items}}...{{/each}}`
7. **Save & publish** — Template is now available for all Runners

**Key capabilities:**
- Full control over layout, styling, and structure
- Define which parts are editable by Runners
- Set up API integrations and data mappings
- Create reusable, branded templates

---

### Persona 2: Template Runner / Sender 📤

**Who:** Operations teams, customer service reps, marketing ops who send communications.

**Their workflow:**

```
Select Template → Edit Content → Fill Variables → Configure API → Preview → Send
```

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
| **Framework** | React 18 + TypeScript 5 | Type safety, component architecture, hooks |
| **Build Tool** | Vite 5 | Blazing fast HMR, optimized builds |
| **Styling** | Tailwind CSS 3 + CSS Modules (SCSS) | Utility-first + scoped component styles |
| **UI Components** | shadcn/ui + Radix UI | Accessible, composable primitives |
| **Drag & Drop** | @dnd-kit | Performant, accessible DnD with sortable lists |
| **State Management** | React hooks + Context API | Lightweight, no external state library needed |
| **Data Fetching** | TanStack React Query | Caching, refetching, loading states |
| **Routing** | React Router v6 | Declarative, nested routes |
| **Icons** | Lucide React | Consistent, tree-shakeable icon set |
| **Rich Text** | Custom contentEditable | Full control over editing behavior |
| **Notifications** | Sonner + Radix Toast | Stacked, dismissible toast system |
| **Guided Tours** | Intro.js | Step-by-step onboarding walkthrough |
| **Spreadsheet Export** | xlsx (SheetJS) | Export table data to Excel |
| **Sanitization** | DOMPurify | XSS protection for user-generated HTML |

### Key Architecture Decisions

#### 1. Thymeleaf Conversion Engine (`src/lib/thymeleafUtils.ts`)

The platform uses a bidirectional conversion system between user-friendly `{{placeholders}}` and server-side Thymeleaf syntax:

```
User types:     {{customerName}}
Stored as:      <span th:utext="${customerName}"/>
Displayed as:   {{customerName}} (in editor)
Rendered as:    John Doe (in preview with values)
```

**Why?** Users never see raw Thymeleaf — they work with simple `{{curly braces}}`. The conversion happens transparently.

#### 2. Section-Based Architecture (`src/types/section.ts`)

Templates are composed of **independent sections**, each with:
- `type` — what kind of section (heading, paragraph, table, etc.)
- `content` — the HTML content with embedded placeholders
- `styles` — per-section styling (fonts, colors, spacing)
- `variables` — extracted placeholder definitions
- `apiConfig` — optional API data binding

This makes templates **modular** — sections can be reordered, added, or removed without affecting others.

#### 3. Variable Auto-Detection (`src/lib/variableExtractor.ts`)

When a user types `{{anyVariable}}` in content, the system:
1. Scans all section content with regex
2. Extracts unique variable names
3. Creates variable definitions with defaults
4. Provides intellisense suggestions as you type

#### 4. Global API Resolution (`src/lib/globalApiResolver.ts`)

API data flows through a resolver that:
1. Fetches data from configured REST endpoints
2. Extracts values using JSONPath expressions
3. Stores results in a global variable namespace
4. Replaces `{{apiData.field.path}}` with actual values using dot-notation traversal

#### 5. CSS Modules for Scoping

Every component has a co-located `.module.scss` file:
```
src/components/templates/
├── EditorView.tsx
├── EditorView.module.scss
├── PreviewView.tsx
├── PreviewView.module.scss
```

**Why?** Prevents style leakage between components. Each component's styles are scoped and won't conflict.

#### 6. Storage Abstraction (`src/lib/templateStorage.ts`)

Templates are stored via an abstraction layer that currently uses `localStorage` for the demo but is designed to swap to a REST API backend:

```typescript
// Demo mode (current)
localStorage → templateStorage.save() → JSON serialization

// Production mode (swap)
REST API → templateApi.save() → Backend persistence
```

### File Structure Overview

```
src/
│
├── 📄 App.tsx                          # Root component — routing, sidebar, global providers
├── 📄 main.tsx                         # Entry point — mounts <App /> into the DOM
├── 📄 index.css                        # Global styles, CSS variables, Tailwind directives
│
├── 📁 pages/                           # Route-level page components (one per route)
│   ├── Index.tsx                       # Landing page / dashboard with quick actions
│   ├── Templates.tsx                   # Template list — browse, create, clone, delete
│   ├── TemplateEditor.tsx              # Full designer experience — layout + sections + styles
│   ├── TemplateSettingsPage.tsx         # Template metadata settings (name, subject, delegates)
│   ├── RunTemplates.tsx                # Runner experience — fill variables, preview, send
│   ├── Sections.tsx                    # Section type catalog — browse all 19+ section types
│   ├── DatabaseSchema.tsx              # Interactive database schema documentation
│   ├── ERDiagram.tsx                   # Entity relationship diagram visualization
│   ├── MigrationGenerator.tsx          # SQL migration script generator
│   ├── SettingsLayoutDemo.tsx          # Settings UI layout reference
│   └── NotFound.tsx                    # 404 fallback page
│
├── 📁 components/
│   ├── 📁 templates/                   # 🔑 Core business components (20+ files)
│   │   │
│   │   │── EditorView.tsx              # Main designer canvas — renders sections in edit mode
│   │   │── PreviewView.tsx             # Live preview — renders final output with merged data
│   │   │
│   │   │── SectionLibrary.tsx          # Drag-and-drop section catalog (19+ types)
│   │   │── SectionContextMenu.tsx      # Right-click menu for section actions (move, delete, duplicate)
│   │   │── InlineSectionControls.tsx    # Hover toolbar on sections (edit, style, delete)
│   │   │── ContainerSection.tsx        # Renders container sections with nested children
│   │   │
│   │   │── RichTextEditor.tsx          # Inline contentEditable editor with formatting
│   │   │── TextSelectionToolbar.tsx     # Floating toolbar on text selection (bold, italic, link)
│   │   │── TextStylePopover.tsx        # Advanced text styling popover (font, size, color)
│   │   │── CustomizationToolbar.tsx     # Section-level customization controls
│   │   │
│   │   │── VariableEditor.tsx          # Variable management — defaults, labels, types
│   │   │── VariablesPanel.tsx          # Side panel listing all detected {{variables}}
│   │   │── VariableIntellisense.tsx     # Autocomplete dropdown when typing {{
│   │   │
│   │   │── StyleEditor.tsx             # Per-section style controls (fonts, colors, spacing)
│   │   │── TableEditor.tsx             # Table section editor — add/remove rows, columns
│   │   │
│   │   │── GlobalApiPanel.tsx          # Global API configuration panel
│   │   │── ApiConfigPopover.tsx        # Per-section API binding popover
│   │   │── ApiVariablePicker.tsx       # Pick API response fields to map to variables
│   │   │── DataTransformationEditor.tsx # Transform API data before inserting
│   │   │
│   │   │── ThymeleafEditor.tsx         # Raw Thymeleaf syntax editor (advanced users)
│   │   │── TemplateSettingsPanel.tsx    # Template metadata panel (name, subject)
│   │   │── DelegatesDialog.tsx         # Share template access with team members
│   │   │── EmailAutocomplete.tsx       # Email input with autocomplete suggestions
│   │   │── UserAutocomplete.tsx        # User search with autocomplete
│   │   └── ValidationErrorsPanel.tsx   # Displays template validation errors
│   │
│   ├── 📁 sections/                    # Section-specific components
│   │   └── SectionPreviewDialog.tsx    # Full-screen section preview modal
│   │
│   ├── 📁 ui/                          # 40+ shadcn/ui primitives (button, dialog, tabs, etc.)
│   │   └── ...                         # Pre-built, accessible, composable UI components
│   │
│   ├── AppSidebar.tsx                  # Main navigation sidebar
│   └── NavLink.tsx                     # Active-aware navigation link component
│
├── 📁 lib/                             # 🔧 Utility functions & business logic
│   │
│   │── thymeleafUtils.ts               # {{placeholder}} ↔ Thymeleaf <span th:utext> conversion
│   │── textThymeleafUtils.ts           # Text-specific Thymeleaf helpers (inline text nodes)
│   │── listThymeleafUtils.ts           # List/loop Thymeleaf helpers (th:each)
│   │
│   │── variableExtractor.ts            # Regex scanner — extracts {{variables}} from content
│   │── globalApiResolver.ts            # Fetches API data, resolves JSONPath, merges into template
│   │── apiTemplateUtils.ts             # API template configuration helpers
│   │
│   │── templateStorage.ts              # Persistence abstraction — localStorage (demo) / REST (prod)
│   │── templateApi.ts                  # REST API client for backend template CRUD
│   │── sectionStorage.ts              # Section-level storage operations
│   │
│   │── templateValidation.ts           # Validates templates — missing vars, broken refs, errors
│   │── templateUtils.ts                # General template helpers (clone, merge, transform)
│   │── tableUtils.ts                   # Table section utilities (add/remove rows/cols)
│   │
│   │── sanitize.ts                     # DOMPurify wrapper — XSS protection for user HTML
│   └── utils.ts                        # Shared utilities (cn, classnames, formatters)
│
├── 📁 types/                           # 📋 TypeScript type definitions
│   ├── section.ts                      # Section interface — type, content, styles, variables
│   ├── api-config.ts                   # ApiConfig, ApiMapping, ApiParam, ApiTemplate
│   ├── template-variable.ts            # TemplateVariable — name, label, type, default, source
│   └── global-api-config.ts            # Global API integration types
│
├── 📁 hooks/                           # ⚡ Custom React hooks
│   ├── useVariableIntellisense.ts      # Powers {{variable}} autocomplete as user types
│   ├── useTemplateWalkthrough.ts       # Intro.js guided tour logic
│   ├── use-mobile.tsx                  # Responsive breakpoint detection
│   └── use-toast.ts                    # Toast notification hook
│
├── 📁 contexts/                        # 🌐 React Context providers
│   └── IntellisenseContext.tsx          # Shares variable intellisense state across components
│
└── 📁 data/                            # 📦 Static data & configuration
    ├── sectionTypes.tsx                # Section type registry — icons, labels, defaults
    └── apiTemplates.ts                 # Pre-built API template configurations
```

#### Folder Responsibilities Summary

| Folder | Purpose | Key Pattern |
|--------|---------|-------------|
| `pages/` | One component per route — orchestrates layout and data loading | Each page maps 1:1 to a route in `App.tsx` |
| `components/templates/` | Core business logic UI — the heart of the editor and runner | Each component has a co-located `.module.scss` file for scoped styles |
| `components/ui/` | Generic, reusable UI primitives from shadcn/ui | Never contains business logic — pure presentation |
| `lib/` | Pure functions with zero UI dependencies | Testable in isolation — no React imports |
| `types/` | Shared TypeScript interfaces and enums | Imported by components, lib, and hooks |
| `hooks/` | Reusable stateful logic extracted from components | Keeps components lean by externalizing complex state |
| `contexts/` | Cross-component state sharing without prop drilling | Used sparingly — only for truly global state |
| `data/` | Static configuration and registry data | Defines "what exists" — section types, API templates |

### Performance Considerations

- **React Query** for API data caching — avoids redundant fetches
- **CSS Modules** for scoped styles — no global CSS conflicts
- **DOMPurify** sanitization — prevents XSS from user content
- **Lazy variable extraction** — only re-scans content on change
- **DnD Kit** with optimized sensors — smooth 60fps drag interactions

---

## 7. Demo Flow (5-7 minutes)

### Part 1: Runner Demo (2-3 min)
1. Open `/run-templates` → Select a template
2. **Compose tab** → Edit a greeting line
3. **Variables tab** → Fill `{{customerName}}` = "John", `{{orderId}}` = "#12345"
4. **Preview** → Show merged output
5. **Key message:** _"10 seconds to send what took 30 minutes to design"_

### Part 2: Designer Demo (3-4 min)
1. Open `/templates` → Create new template
2. Drag sections from Section Library
3. Type `{{customerName}}` in content → Show auto-detection
4. Open Variable Editor → Set defaults
5. Style a section (font, color, spacing)
6. Clone the template → Show deep copy
7. **Key message:** _"Design once, send hundreds of times"_

---

## 8. Q&A Talking Points

**Q: Can Runners break the template?**
A: No. They can only edit text and fill variables — not change layout or styles.

**Q: What about production use?**
A: The storage layer is abstracted. Swap `localStorage` → REST API for production. Backend entity schemas are already documented.

**Q: How does API data work?**
A: Designers configure endpoints + JSONPath mappings. At send time, the Runner provides parameters, data is fetched and auto-populated.

**Q: Why Thymeleaf?**
A: Server-side rendering. Templates are processed by a Java/Spring backend where Thymeleaf is the standard template engine. Our frontend converts `{{friendly}}` syntax to Thymeleaf transparently.

**Q: How long did this take?**
A: Built iteratively using Lovable AI — rapid prototyping with React + TypeScript + shadcn/ui.
