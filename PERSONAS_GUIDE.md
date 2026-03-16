# Template Platform - User Personas Guide

## Overview

This document explains the two primary user personas for the Template & Page Builder Platform. Use this guide to demo and explain the system to users.

---

## Persona 1: Template Designer 🔨

**Who they are:** Content creators, marketing teams, developers, or designers who build reusable email/notification templates.

**Their goal:** Create beautiful, dynamic templates with sections, styles, variables, and API integrations that can be reused multiple times.

### What They Do

| Action | Description |
|--------|-------------|
| **Design Layouts** | Drag-and-drop sections (headers, paragraphs, tables, images, lists, dividers) |
| **Style Content** | Customize fonts, colors, spacing, borders per section |
| **Add Variables** | Define `{{placeholders}}` like `{{userName}}`, `{{orderId}}` |
| **Connect APIs** | Link REST APIs to pull live data (user info, orders, etc.) |
| **Set Thymeleaf** | Add Thymeleaf expressions for loops (`th:each`) and conditionals |
| **Save Templates** | Store templates for reuse across the organization |

### Their Workflow

```
1. Browse Section Library → 2. Add & Arrange Sections → 3. Style & Format
                              ↓
4. Add Variables {{}}    → 5. Connect API Data    → 6. Save Template
```

### Key Screens for Designer

- **Sections Page** (`/sections`) - Preview all 19+ section types
- **Template Editor** (`/templates`) - Build and edit templates
- **Database Schema** (`/database-schema`) - View data structure
- **ER Diagram** (`/er-diagram`) - Understand entity relationships

---

## Persona 2: Template Runner / Sender 📤

**Who they are:** Operations teams, customer service, automated systems, or anyone sending communications using pre-built templates.

**Their goal:** Select a template, fill in variable data, preview the result, and send/deliver the final content.

### What They Do

| Action | Description |
|--------|-------------|
| **Select Template** | Choose from pre-designed templates |
| **Fill Variables** | Input values for `{{placeholders}}` (names, dates, amounts) |
| **Add API Data** | Configure API calls to fetch live data at send time |
| **Preview Result** | See the final rendered output before sending |
| **Send/Deliver** | Send email, generate PDF, or trigger notification |

### Their Workflow

```
1. Pick Template      → 2. Fill Placeholders    → 3. Configure API Data
                              ↓
4. Live Preview       → 5. Send/Deliver
```

### Key Screens for Runner

- **Run Templates** (`/run-templates`) - Execute templates with live data
- **Template Selection** - Browse and pick from saved templates
- **Data Input Forms** - Fill variables and API configs
- **Live Preview** - Real-time preview of final output

---

## Demo Script: Explaining Both Personas

### Opening (30 seconds)

> "Our platform has two powerful modes - **Design** and **Send**. Think of it like creating a letterhead template in Word, then using it to send personalized letters to hundreds of people."

### Demo Part 1: Designer Persona (2-3 minutes)

**Setup:**
> "First, let's see how Sarah, our Marketing Manager, creates a customer order confirmation email."

**Steps:**
1. **Navigate to Templates** → "Sarah starts in the Template Editor"
2. **Show Section Library** → "She drags in a header, order details table, and footer"
3. **Add Variables** → "She adds `{{customerName}}`, `{{orderId}}`, `{{totalAmount}}` as placeholders"
4. **Style Content** → "She customizes colors and fonts to match brand guidelines"
5. **Connect API** → "She links the Orders API so order details auto-populate"
6. **Save Template** → "She saves it as 'Order Confirmation v2' for the team to use"

**Key Talking Point:**
> "Notice how Sarah creates something once, but it can be used thousands of times with different data."

### Demo Part 2: Runner Persona (2-3 minutes)

**Setup:**
> "Now let's switch to Mike, our Customer Service Rep, who needs to send an order confirmation."

**Steps:**
1. **Navigate to Run Templates** → "Mike goes to the Run Templates page"
2. **Select Template** → "He picks 'Order Confirmation v2' that Sarah created"
3. **Fill Data (Compose Tab)** → "The sections appear - he can edit any content directly"
4. **Fill Variables (Variables Tab)** → "He enters: customerName='John Doe', orderId='#12345', totalAmount='$99.99'"
5. **Configure API (API Data Tab)** → "He sets the Order API to fetch line items dynamically"
6. **Live Preview** → "He sees exactly what the customer will receive"
7. **Send** → "He clicks Send - the email goes out with all data merged"

**Key Talking Point:**
> "Mike doesn't need to know HTML or design - he just fills in the data and sends. The template handles everything else."

### Closing Summary (30 seconds)

> "So we have:
> - **Designers** building smart, reusable templates with variables and API connections
> - **Runners** using those templates to quickly send personalized communications
> 
> This separation means experts handle the design, while anyone can send - no coding required."

---

## Visual Comparison

| Aspect | Designer | Runner |
|--------|----------|--------|
| **Focus** | Build & Create | Use & Send |
| **Time Investment** | One-time (per template) | Repeatable (seconds per send) |
| **Technical Skill** | Medium (knows variables, APIs) | Low (just fills forms) |
| **Main Screens** | Templates, Sections, Schema | Run Templates, Preview |
| **Output** | Saved Template | Sent Email/Notification |

---

## Frequently Asked Questions

**Q: Can one user be both personas?**
A: Yes! Small teams often have people who both design and send. The personas represent activities, not necessarily different people.

**Q: Does the Runner need to know about Thymeleaf?**
A: No. Thymeleaf is configured by the Designer. The Runner just sees the final output or simple form fields.

**Q: Can Runners edit the template design?**
A: In the "Compose" tab, Runners can edit section content directly (text, images), but can't add/remove sections or change the overall structure. This protects the design while allowing customization.

**Q: What if the API fails when a Runner is sending?**
A: The system shows an error in the preview, allowing the Runner to retry or fill data manually as a fallback.

---

## Demo Tips

1. **Use Real Data:** Prepare sample customer/order data before the demo
2. **Show the Connection:** After designing, immediately switch to Run mode to show the template in action
3. **Highlight the Time Savings:** "Sarah spent 30 minutes building this - now Mike sends it in 10 seconds"
4. **Show Mobile:** If possible, show that templates look good on mobile devices
5. **Prepare Edge Cases:** Have an example of a template with conditional content (e.g., "if VIP customer, show discount section")

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    TEMPLATE PLATFORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PERSONA 1: DESIGNER                PERSONA 2: RUNNER         │
│  ─────────────────                ─────────────────         │
│  Creates templates                Uses templates            │
│  ↓                                ↓                         │
│  Sections                         Select Template           │
│  Variables {{}}                   Fill Variables            │
│  API Config                       Add API Data              │
│  Styling                          Preview & Send              │
│  Save                             Deliver                   │
│                                                             │
│  URL: /templates                  URL: /run-templates       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
