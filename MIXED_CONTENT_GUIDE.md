# Mixed Static and Dynamic Content Guide

This guide explains how to create sections with both static and dynamic text in your templates.

## Overview

There are two main ways to mix static and dynamic content:

1. **Mixed Content Sections** - For free-form text with embedded variables
2. **Labeled Content Sections** - For sections with dynamic labels and customizable content

## 1. Mixed Content Sections

Use this when you want to write text that includes both static words and dynamic placeholders.

### How to Use

1. Drag "Mixed Content" from the Section Library
2. In the Content field, write your text and add Thymeleaf variables where needed

### Example

```
Status: <th:utext="${status}">

Processing completed at <th:utext="${timestamp}"> by <th:utext="${userName}">.

<th:if="${hasErrors}">
⚠️ Found <th:utext="${errorCount}"> errors that need attention.
</th:if>

Items processed:
<th:each="item : ${items}">
• <th:utext="${item}">
</th:each>
```

### Thymeleaf Syntax Reference

- **Variables**: `<th:utext="${variableName}">`
- **Conditionals**: `<th:if="${condition}">...content...</th:if>`
- **Loops**: `<th:each="item : ${items}">...<th:utext="${item}">...</th:each>`

### When Running the Template

When you run a template with mixed content:
- You'll see a text editor for the "content" field
- You can edit both the static text AND define values for the dynamic variables
- Each dynamic variable (like `${status}`, `${timestamp}`) needs a value in the Template Variables section

## 2. Labeled Content Sections

Use this when you want a section with a dynamic label (heading) followed by content.

### How to Use

1. Drag "Labeled Content" from the Section Library
2. Edit the Label field to include both static text and variables
3. Choose the content type (text, list, or table)

### Example - Dynamic Label

**Label Field:**
```
Incident Report #<th:utext="${incidentNumber}"> - <th:utext="${priority}"> Priority
```

This creates a heading like: **"Incident Report #12345 - High Priority"**

**Content Field:**
- Choose type: text, list, or table
- Add your content

### When Running the Template

When you run a template with labeled content:

**For variables in the label** (like `incidentNumber`, `priority`):
- You'll see them listed in Template Variables
- The context will show: "Used in label: Incident Report #{{incidentNumber}}..."
- Fill in the values for these variables

**For the content itself**:
- The main content field will be shown with the label name as the variable name
- You can edit the content (text, list items, or table data)
- The context will show: "Content for: [your label text]"

### Label Editability

You can control whether users can edit the label content at runtime:
- Set `isLabelEditable: true` (default) - users can change the content
- Set `isLabelEditable: false` - content is locked, only variables in label can be changed

## 3. Understanding Variables in Run Templates

When you run a template, the "Template Variables" section shows ALL dynamic fields with helpful context:

### Variable Display

Each variable shows:
- **Badge**: `{{variableName}}` - the variable identifier
- **Name**: Human-readable variable name
- **Type**: Section type (Labeled Content, Mixed Content, Dynamic Label, etc.)
- **Context**: Where the variable is used

### Context Examples

- `Used in label: Incident Report #{{incidentNumber}}`
  - This variable is part of a dynamic label

- `Content for: Incident Report #{{incidentNumber}}`
  - This is the content field for that labeled section

- `Appears after: "Status:"`
  - This variable comes after the text "Status:" in mixed content

- `Used in Heading 1`
  - This is a simple heading variable

## Best Practices

### For Template Designers

1. **Use descriptive variable names**
   - Good: `incidentNumber`, `userName`, `errorCount`
   - Bad: `var1`, `x`, `temp`

2. **Add context in labels**
   - Include static text that explains what the variable represents
   - Example: `"Assigned to: <th:utext="${assignedUser}">` is clearer than just `<th:utext="${assignedUser}">`

3. **Provide good default values**
   - Set meaningful defaults so users understand what's expected
   - Example: `"2024-01-15"` instead of `"date"`

4. **Use labeled-content for structured data**
   - When you have a clear heading/label, use Labeled Content sections
   - Reserve Mixed Content for more free-form text

5. **Combine static context with dynamic data**
   - `"Last updated: <th:utext="${updateTime}">` 
   - `"Total items: <th:utext="${itemCount}">"`
   - `"Status: <th:utext="${currentStatus}"> as of <th:utext="${checkTime}">"`

### For Template Users

1. **Read the context descriptions**
   - The italic text below each variable shows where it's used
   - This helps you understand what to enter

2. **Check variable badges**
   - "Dynamic Label" means it's part of a heading
   - "Labeled Content" means it's the main content
   - "Mixed Content" means it's embedded in text

3. **Use the preview pane**
   - The right side shows real-time preview
   - See how your values appear in context
   - Verify formatting and layout

4. **Locked labels**
   - If you see "Label locked", you can only fill in the variables
   - You cannot change the static text structure

## Examples

### Example 1: Incident Report

**Template Structure:**

1. Labeled Content Section
   - Label: `Incident #<th:utext="${incidentId}"> - <th:utext="${severity}">`
   - Content Type: text
   - Content: Description of the incident

2. Mixed Content Section
   - Content: `Reported by <th:utext="${reporterName}"> on <th:utext="${reportDate}"> at <th:utext="${reportTime}">`

**When Running:**
- Variable: `incidentId` - Context: "Used in label: Incident #{{incidentId}}..."
- Variable: `severity` - Context: "Used in label: Incident #{{incidentId}}..."
- Variable: `incidentId` (content) - Context: "Content for: Incident #{{incidentId}}..."
- Variable: `reporterName` - Context: "Appears after: Reported by"
- Variable: `reportDate` - Context: "Used in mixed content section"
- Variable: `reportTime` - Context: "Used in mixed content section"

### Example 2: Status Report with Conditions

**Mixed Content Section:**
```
System Status: <th:utext="${systemStatus}">

<th:if="${criticalIssues > 0}">
🚨 Critical: <th:utext="${criticalIssues}"> issues require immediate attention
</th:if>

<th:if="${warnings > 0}">
⚠️ Warnings: <th:utext="${warnings}"> items need review
</th:if>

Last checked: <th:utext="${lastCheckTime}">
```

**When Running:**
- Define values for: `systemStatus`, `criticalIssues`, `warnings`, `lastCheckTime`
- The conditional sections will only appear if the values meet the conditions

## Troubleshooting

**Q: I don't see my variable in the Template Variables section**
- Check that you're using the correct Thymeleaf syntax: `<th:utext="${varName}">`
- Ensure the variable is within the Content field of the section

**Q: The context description doesn't show for my variable**
- This is normal for simple variables in regular sections (headings, paragraphs)
- Context is most helpful for labeled-content and mixed-content sections

**Q: How do I know which field to edit?**
- Look at the context description below each variable
- Check the section type badge
- Use the preview pane to see where changes appear

**Q: Can I have multiple variables in one label?**
- Yes! Example: `Report #<th:utext="${id}"> for <th:utext="${clientName}">`
- Both variables will appear in Template Variables with appropriate context
