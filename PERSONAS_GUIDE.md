# Template Platform - Demo & Personas Guide

## Overview

This guide helps you demo the platform by walking through two personas: **Runner** (who sends templates) and **Designer** (who builds them). Start with the Runner to show the end-user experience, then reveal the power behind it with the Designer.

---

## Persona 1: Template Runner / Sender 📤

**Who they are:** Operations teams, customer service reps, marketing ops, or automated systems that need to send personalized communications using pre-built templates.

**Their goal:** Pick a template, customize content, fill variables, and send — no design or coding skills needed.

### Demo Flow for Runner

#### Step 1: Select a Template
> "Meet Mike, our Customer Service Rep. He needs to send an order confirmation. He opens **Run Templates** and picks a pre-designed template."

- Navigate to `/run-templates`
- Browse available templates
- Select one (e.g., "Order Confirmation")

#### Step 2: Explain the Three Types of Content

This is the core concept to demo. Every template has three content types:

| Content Type | What It Is | Runner Can Edit? | Example |
|---|---|---|---|
| **Static Content** | Fixed text/images baked into the template | ✅ Yes, in Compose tab | Company logo, footer text, greeting copy |
| **Placeholders / Variables** | Dynamic `{{placeholders}}` that get filled at send time | ✅ Yes, in Variables tab | `{{customerName}}`, `{{orderId}}`, `{{totalAmount}}` |
| **API Data** | Live data fetched from REST APIs at send time | ✅ Yes, configure in API tab | Order line items, user profile, account details |

#### Step 3: Demo the Compose Tab (Static Content Editing)
> "In the Compose tab, Mike sees all the template sections. He can directly edit any static text — change a greeting, update a paragraph, tweak a disclaimer — without touching the design."

**Key points to highlight:**
- Sections are pre-arranged by the Designer
- Runner can edit text content inline
- Runner **cannot** add/remove sections or change layout
- Changes are per-send, they don't modify the original template

#### Step 4: Demo the Variables Tab (Placeholders)
> "Now Mike switches to the Variables tab. He sees all the `{{placeholders}}` the Designer defined. He fills in: customerName = 'John Doe', orderId = '#12345', totalAmount = '$99.99'."

**Key points to highlight:**
- Each placeholder has a label and input field
- Default values may be pre-filled by the Designer
- Variables appear as `{{customerName}}` in the template and get replaced with real values
- Supports text, URLs, lists, and table data types

#### Step 5: Demo the API Data Tab
> "Some data comes from live APIs. Mike configures the Orders API to fetch line items dynamically. The API response auto-populates into the template sections."

**Key points to highlight:**
- API templates are pre-configured by the Designer
- Runner just provides parameter values (e.g., order ID, customer ID)
- Data is fetched and mapped to template sections automatically
- If an API fails, Runner sees an error and can fill data manually

#### Step 6: Live Preview & Send
> "Mike clicks Preview. He sees exactly what the recipient will get — all static content, variables, and API data merged together. One click to send."

**Key talking point:**
> "Mike didn't write any HTML, didn't design anything. He just filled in the blanks and hit send. The template handles everything — 10 seconds to send what took 30 minutes to design."

---

## Persona 2: Template Designer 🔨

**Who they are:** Content creators, marketing managers, developers, or designers who build reusable templates for the organization.

**Their goal:** Create powerful, reusable templates with sections, styles, variables, and API integrations that Runners can use repeatedly.

### Demo Flow for Designer

#### Step 1: Start in the Template Editor
> "Meet Sarah, our Marketing Manager. She's building an order confirmation email template that her team will send hundreds of times."

- Navigate to `/templates`
- Create a new template or open an existing one

#### Step 2: Build Layout with Section Library
> "Sarah opens the Section Library panel. She drags sections into her template to build the layout."

**Available section types to demo:**
- **Text sections:** Headings (H1-H6), Paragraphs, Static Text, Mixed Content
- **Media sections:** Images, Banners, Buttons, Links
- **Layout sections:** Containers, Grid, Line Breaks, Separators
- **Interactive sections:** Tables, Bullet Lists, Number Lists, CTA Text

**Key points:**
- 19+ section types organized by category
- Drag-and-drop from library into the editor
- Reorder sections by dragging within the editor
- Some sections (Banner, Program Name) are single-use per template
- Containers can hold nested child sections

#### Step 3: Add Placeholders / Variables
> "Now Sarah adds dynamic placeholders. She types `{{customerName}}` directly in the content. The system detects it automatically."

**How variables work:**
- Type `{{variableName}}` anywhere in section content
- Variable Editor panel shows all detected variables
- Set default values, labels, and data types for each variable
- Variables can be text, URL, list, or table type
- Intellisense dropdown suggests existing variables as you type

**Demo the Variable Editor:**
- Open the Variables Panel
- Show auto-detected variables from content
- Set a default value (e.g., `{{customerName}}` → default: "Valued Customer")
- Show how the preview updates with default values

#### Step 4: Style the Template
> "Sarah customizes the look and feel. Each section has its own style controls."

**Style options per section:**
- Font family, size, weight, style
- Text color, background color
- Padding, margin, line height
- Text alignment (left, center, right)
- Text decoration (bold, italic, underline)

**Key points:**
- Styles are set per section for granular control
- Customization Toolbar appears when a section is selected
- Style Editor panel provides detailed controls
- Styles persist in the saved template

#### Step 5: Configure API Data Integration
> "Sarah connects a REST API so order details populate automatically when the Runner sends."

**API configuration flow:**
- Open the API panel
- Select from pre-built API templates (or create custom)
- Define parameters the Runner will need to provide
- Set up data mappings: which API response field → which template section
- Add data transformations if needed
- Test with mock data

**Key points:**
- API templates are reusable across multiple templates
- Supports GET, POST, PUT, DELETE methods
- JSONPath for extracting nested API response data
- Global API configs can be shared across sections
- Mock data available for testing without live API calls

#### Step 6: Thymeleaf Expressions (Advanced)
> "For advanced logic, Sarah adds Thymeleaf expressions — conditional content and loops."

**Examples:**
- `{{if isVIP}}` ... `{{/if}}` — Show content only for VIP customers
- `{{each item in orderItems}}` ... `{{/each}}` — Loop through items
- Behind the scenes, these become proper Thymeleaf syntax (`th:if`, `th:each`)

#### Step 7: Save & Handoff
> "Sarah saves the template. Now every Runner on her team can use it instantly — they just fill in the data and send."

---

## Demo Script: Putting It Together

### Opening (30 seconds)
> "Our platform separates **sending** from **designing**. Let me show you how easy it is to send a template first, then we'll peek behind the curtain at how templates are built."

### Part 1: Runner Demo (3 minutes)
1. Open `/run-templates` → Select a template
2. **Compose tab** → Edit static text ("I can change this greeting...")
3. **Variables tab** → Fill in `{{customerName}}`, `{{orderId}}`
4. **API tab** → Configure an API call
5. **Preview** → "This is exactly what the recipient sees"
6. **Send** → Done in 10 seconds

### Part 2: Designer Demo (3-4 minutes)
1. Open `/templates` → Create new template
2. **Section Library** → Drag in Header, Paragraph, Table, Footer
3. **Add variables** → Type `{{customerName}}` in content
4. **Variable Editor** → Set defaults and labels
5. **Style sections** → Customize fonts, colors, spacing
6. **API config** → Connect an API with mappings
7. **Save** → "Now any Runner can use this"

### Closing (30 seconds)
> "Designers invest 30 minutes once. Runners send in 10 seconds, every time. Static content is editable per-send, placeholders ensure personalization, and API data brings in live information — all without coding."

---

## Content Types Deep Dive

### Static Content
- Text, images, and layout that the Designer places in the template
- Runner can edit the text but cannot change the structure
- Examples: headings, paragraphs, footer disclaimers, logos
- Stored as HTML content in each section

### Placeholders / Variables (`{{variableName}}`)
- Dynamic tokens the Runner fills in before sending
- Designer defines them by typing `{{}}` syntax in content
- Support types: text, URL, list, table data
- Can have default values as fallbacks
- Converted to Thymeleaf syntax (`<span th:utext="${var}"/>`) for server-side rendering

### API Data
- Live data fetched from REST APIs at send time
- Designer configures: endpoint, method, headers, parameters
- Runner provides: parameter values (e.g., customer ID)
- Data is mapped to template sections via JSONPath
- Supports data transformations before insertion

---

## Key Screens Reference

| Screen | URL | Used By | Purpose |
|--------|-----|---------|---------|
| Run Templates | `/run-templates` | Runner | Select, fill, preview, send |
| Template Editor | `/templates` | Designer | Build and edit templates |
| Sections Library | `/sections` | Designer | Preview all section types |
| Database Schema | `/database-schema` | Designer | View data structure |
| ER Diagram | `/er-diagram` | Designer | Entity relationships |

---

## FAQs for Demo

**Q: Can the Runner break the template design?**
A: No. Runners can edit static text content but cannot add/remove sections, change layout, or modify styles.

**Q: What happens if a variable isn't filled in?**
A: The placeholder `{{variableName}}` remains visible in the preview, alerting the Runner to fill it.

**Q: Can one person be both Designer and Runner?**
A: Yes. Small teams often have people who both design and send. The personas represent activities, not roles.

**Q: What if the API is down when sending?**
A: The Runner sees an error in preview and can manually fill the data as a fallback.

**Q: Do Runner edits affect the original template?**
A: No. All Runner edits are per-send. The original template remains unchanged for future use.
