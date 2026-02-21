import { 
  Heading1, 
  Heading2, 
  Heading3, 
  Heading4, 
  Heading5, 
  Heading6,
  Type,
  AlignLeft,
  Table,
  List,
  ListOrdered,
  Image,
  Link,
  MousePointerClick,
  Grid3x3,
  Code,
  Minus,
  SeparatorHorizontal,
  FileText,
  Box,
  Flag,
  Calendar
} from "lucide-react";
import { SectionDefinition } from "@/types/section";

// Default font family for Outlook email compatibility (use single quotes for font names in inline styles)
export const OUTLOOK_FONT_FAMILY = "'Wells Fargo Sans', Arial, Helvetica, sans-serif";

// Default heading styles for each heading level
export const headingDefaultStyles: Record<string, { fontSize: string; color: string; fontFamily: string; fontWeight: string; lineHeight: string }> = {
  heading1: { fontSize: '34px', color: '#3B3331', fontFamily: OUTLOOK_FONT_FAMILY, fontWeight: '400', lineHeight: '44px' },
  heading2: { fontSize: '24px', color: '#3B3331', fontFamily: OUTLOOK_FONT_FAMILY, fontWeight: '600', lineHeight: '30px' },
  heading3: { fontSize: '20px', color: '#3B3331', fontFamily: OUTLOOK_FONT_FAMILY, fontWeight: '400', lineHeight: '25px' },
  heading4: { fontSize: '16px', color: '#3B3331', fontFamily: OUTLOOK_FONT_FAMILY, fontWeight: '400', lineHeight: '20px' },
  heading5: { fontSize: '15px', color: '#3B3331', fontFamily: OUTLOOK_FONT_FAMILY, fontWeight: '600', lineHeight: '19px' },
  heading6: { fontSize: '14px', color: '#3B3331', fontFamily: OUTLOOK_FONT_FAMILY, fontWeight: '600', lineHeight: '18px' },
};

export const sectionTypes: SectionDefinition[] = [
  {
    type: 'heading1',
    label: 'Heading 1',
    icon: Heading1,
    description: 'Large heading - use {{variable}} for dynamic values',
    defaultContent: `<h1 style="font-size: 34px; color: #3B3331; font-family: ${OUTLOOK_FONT_FAMILY}; font-weight: 400; line-height: 44px; margin: 0; mso-line-height-rule: exactly;"><span th:utext="\${heading1Text}"/></h1>`,
    category: 'text',
    variables: [
      { name: 'heading1Text', label: 'Heading 1 Text', type: 'text', defaultValue: 'Main Title' }
    ]
  },
  {
    type: 'heading2',
    label: 'Heading 2',
    icon: Heading2,
    description: 'Section heading - use {{variable}} for dynamic values',
    defaultContent: `<h2 style="font-size: 24px; color: #3B3331; font-family: ${OUTLOOK_FONT_FAMILY}; font-weight: 600; line-height: 30px; margin: 0; mso-line-height-rule: exactly;"><span th:utext="\${heading2Text}"/></h2>`,
    category: 'text',
    variables: [
      { name: 'heading2Text', label: 'Heading 2 Text', type: 'text', defaultValue: 'Section Title' }
    ]
  },
  {
    type: 'heading3',
    label: 'Heading 3',
    icon: Heading3,
    description: 'Subsection heading - use {{variable}} for dynamic values',
    defaultContent: `<h3 style="font-size: 20px; color: #3B3331; font-family: ${OUTLOOK_FONT_FAMILY}; font-weight: 400; line-height: 25px; margin: 0; mso-line-height-rule: exactly;"><span th:utext="\${heading3Text}"/></h3>`,
    category: 'text',
    variables: [
      { name: 'heading3Text', label: 'Heading 3 Text', type: 'text', defaultValue: 'Subsection Title' }
    ]
  },
  {
    type: 'heading4',
    label: 'Heading 4',
    icon: Heading4,
    description: 'Minor heading - use {{variable}} for dynamic values',
    defaultContent: `<h4 style="font-size: 16px; color: #3B3331; font-family: ${OUTLOOK_FONT_FAMILY}; font-weight: 400; line-height: 20px; margin: 0; mso-line-height-rule: exactly;"><span th:utext="\${heading4Text}"/></h4>`,
    category: 'text',
    variables: [
      { name: 'heading4Text', label: 'Heading 4 Text', type: 'text', defaultValue: 'Minor Title' }
    ]
  },
  {
    type: 'heading5',
    label: 'Heading 5',
    icon: Heading5,
    description: 'Small heading - use {{variable}} for dynamic values',
    defaultContent: `<h5 style="font-size: 15px; color: #3B3331; font-family: ${OUTLOOK_FONT_FAMILY}; font-weight: 600; line-height: 19px; margin: 0; mso-line-height-rule: exactly;"><span th:utext="\${heading5Text}"/></h5>`,
    category: 'text',
    variables: [
      { name: 'heading5Text', label: 'Heading 5 Text', type: 'text', defaultValue: 'Small Title' }
    ]
  },
  {
    type: 'heading6',
    label: 'Heading 6',
    icon: Heading6,
    description: 'Smallest heading - use {{variable}} for dynamic values',
    defaultContent: `<h6 style="font-size: 14px; color: #3B3331; font-family: ${OUTLOOK_FONT_FAMILY}; font-weight: 600; line-height: 18px; margin: 0; mso-line-height-rule: exactly;"><span th:utext="\${heading6Text}"/></h6>`,
    category: 'text',
    variables: [
      { name: 'heading6Text', label: 'Heading 6 Text', type: 'text', defaultValue: 'Tiny Title' }
    ]
  },
  {
    type: 'text',
    label: 'Text',
    icon: Type,
    description: 'Simple text - use {{variable}} for dynamic values',
    defaultContent: `<span style="font-family: ${OUTLOOK_FONT_FAMILY}; font-size: 14px; color: #333333;"><span th:utext="\${textContent}"/></span>`,
    category: 'text',
    variables: [
      { name: 'textContent', label: 'Text Content', type: 'text', defaultValue: 'Your text here' }
    ]
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    icon: AlignLeft,
    description: 'Text paragraph - use {{variable}} for dynamic values',
    defaultContent: `<p style="font-family: ${OUTLOOK_FONT_FAMILY}; font-size: 14px; color: #333333; line-height: 1.5; margin: 0; mso-line-height-rule: exactly;"><span th:utext="\${paragraphContent}"/></p>`,
    category: 'text',
    variables: [
      { name: 'paragraphContent', label: 'Paragraph Content', type: 'text', defaultValue: 'This is a paragraph. You can add more text here.' }
    ]
  },
  {
    type: 'table',
    label: 'Table',
    icon: Table,
    description: 'Data table',
    defaultContent: '', // Will be generated dynamically with Thymeleaf tags in TemplateEditor
    category: 'layout',
    variables: [
      { 
        name: 'tableData', 
        label: 'Table Data', 
        type: 'table' as any, 
        defaultValue: {
          rows: [['Data 1', 'Data 2']],
          showBorder: true,
          mergedCells: {},
          isStatic: false,
          headerPosition: 'first-row',
          headerStyle: { backgroundColor: '#FFC000', textColor: '#000000', bold: true },
          jsonMapping: {
            enabled: true,
            columnMappings: [
              { header: 'Header 1', jsonPath: 'col1' },
              { header: 'Header 2', jsonPath: 'col2' }
            ]
          }
        } as any
      }
    ]
  },
  {
    type: 'bullet-list-circle',
    label: 'Bullet List (Circle)',
    icon: List,
    description: 'List with circle bullets',
    defaultContent: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${OUTLOOK_FONT_FAMILY};"><tr><td style="vertical-align: top; padding-right: 8px;">○</td><td style="vertical-align: top;">Item 1</td></tr></table>`,
    category: 'text',
    variables: [
      { name: 'items', label: 'List Items', type: 'list', defaultValue: ['Item 1', 'Item 2', 'Item 3'] }
    ]
  },
  {
    type: 'bullet-list-disc',
    label: 'Bullet List (Disc)',
    icon: List,
    description: 'List with disc bullets',
    defaultContent: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${OUTLOOK_FONT_FAMILY};"><tr><td style="vertical-align: top; padding-right: 8px;">•</td><td style="vertical-align: top;">Item 1</td></tr></table>`,
    category: 'text',
    variables: [
      { name: 'items', label: 'List Items', type: 'list', defaultValue: ['Item 1', 'Item 2', 'Item 3'] }
    ]
  },
  {
    type: 'bullet-list-square',
    label: 'Bullet List (Square)',
    icon: List,
    description: 'List with square bullets',
    defaultContent: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${OUTLOOK_FONT_FAMILY};"><tr><td style="vertical-align: top; padding-right: 8px;">■</td><td style="vertical-align: top;">Item 1</td></tr></table>`,
    category: 'text',
    variables: [
      { name: 'items', label: 'List Items', type: 'list', defaultValue: ['Item 1', 'Item 2', 'Item 3'] }
    ]
  },
  {
    type: 'number-list-1',
    label: 'Numbered List (1,2,3)',
    icon: ListOrdered,
    description: 'List with numbers',
    defaultContent: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${OUTLOOK_FONT_FAMILY};"><tr><td style="vertical-align: top; padding-right: 8px;">1.</td><td style="vertical-align: top;">First item</td></tr></table>`,
    category: 'text',
    variables: [
      { name: 'items', label: 'List Items', type: 'list', defaultValue: ['First item', 'Second item', 'Third item'] }
    ]
  },
  {
    type: 'number-list-i',
    label: 'Numbered List (i,ii,iii)',
    icon: ListOrdered,
    description: 'List with roman numerals',
    defaultContent: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${OUTLOOK_FONT_FAMILY};"><tr><td style="vertical-align: top; padding-right: 8px;">i.</td><td style="vertical-align: top;">First item</td></tr></table>`,
    category: 'text',
    variables: [
      { name: 'items', label: 'List Items', type: 'list', defaultValue: ['First item', 'Second item', 'Third item'] }
    ]
  },
  {
    type: 'number-list-a',
    label: 'Numbered List (a,b,c)',
    icon: ListOrdered,
    description: 'List with letters',
    defaultContent: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${OUTLOOK_FONT_FAMILY};"><tr><td style="vertical-align: top; padding-right: 8px;">a.</td><td style="vertical-align: top;">First item</td></tr></table>`,
    category: 'text',
    variables: [
      { name: 'items', label: 'List Items', type: 'list', defaultValue: ['First item', 'Second item', 'Third item'] }
    ]
  },
  {
    type: 'image',
    label: 'Image',
    icon: Image,
    description: 'Image element',
    defaultContent: '<img src="<span th:utext="${src}"/>" alt="<span th:utext="${alt}"/>" style="display: block; max-width: 100%; height: auto;" />',
    category: 'media',
    variables: [
      { name: 'src', label: 'Image URL', type: 'url', defaultValue: 'https://placehold.co/600x400' },
      { name: 'alt', label: 'Alt Text', type: 'text', defaultValue: 'Placeholder' }
    ]
  },
  {
    type: 'link',
    label: 'Link',
    icon: Link,
    description: 'Hyperlink element',
    defaultContent: `<a href="<span th:utext="\${href}"/>" style="font-family: ${OUTLOOK_FONT_FAMILY}; color: #0066cc; text-decoration: underline;"><span th:utext="\${text}"/></a>`,
    category: 'interactive',
    variables: [
      { name: 'href', label: 'Link URL', type: 'url', defaultValue: '#' },
      { name: 'text', label: 'Link Text', type: 'text', defaultValue: 'Click here' }
    ]
  },
  {
    type: 'button',
    label: 'Button',
    icon: MousePointerClick,
    description: 'Button element',
    defaultContent: `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:40px;v-text-anchor:middle;width:150px;" arcsize="10%" strokecolor="#0066cc" fillcolor="#0066cc"><w:anchorlock/><center style="color:#ffffff;font-family:${OUTLOOK_FONT_FAMILY};font-size:14px;font-weight:bold;"><![endif]--><a href="#" style="background-color:#0066cc;border:1px solid #0066cc;border-radius:4px;color:#ffffff;display:inline-block;font-family:${OUTLOOK_FONT_FAMILY};font-size:14px;font-weight:bold;line-height:40px;text-align:center;text-decoration:none;width:150px;-webkit-text-size-adjust:none;mso-hide:all;"><span th:utext="\${text}"/></a><!--[if mso]></center></v:roundrect><![endif]-->`,
    category: 'interactive',
    variables: [
      { name: 'text', label: 'Button Text', type: 'text', defaultValue: 'Click me' }
    ]
  },
  {
    type: 'grid',
    label: 'Grid',
    icon: Grid3x3,
    description: 'Grid layout container',
    defaultContent: `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${OUTLOOK_FONT_FAMILY};"><tr><td style="width: 33%; padding: 8px;">Column 1</td><td style="width: 33%; padding: 8px;">Column 2</td><td style="width: 33%; padding: 8px;">Column 3</td></tr></table>`,
    category: 'layout'
  },
  {
    type: 'html-content',
    label: 'HTML Content',
    icon: Code,
    description: 'Display raw HTML content from API or custom input',
    defaultContent: '<span th:utext="${htmlContent}"/>',
    category: 'layout',
    variables: [
      { 
        name: 'htmlContent', 
        label: 'HTML Content', 
        type: 'text', 
        defaultValue: `<table cellpadding="0" cellspacing="0" border="0" style="font-family: ${OUTLOOK_FONT_FAMILY}; padding: 20px; border: 1px solid #ddd;"><tr><td><h3 style="margin: 0 0 10px 0;">Sample HTML Content</h3><p style="margin: 0;">This section can display any HTML content from your API response.</p></td></tr></table>` 
      }
    ]
  },
  {
    type: 'line-break',
    label: 'Line Break',
    icon: Minus,
    description: 'Add an empty line (vertical gap) between sections',
    defaultContent: '<!--[if mso]><br/><![endif]--><br style="mso-line-height-rule: exactly; line-height: 20px;"/>',
    category: 'layout',
  },
  {
    type: 'separator-line',
    label: 'Separator Line',
    icon: SeparatorHorizontal,
    description: 'Add a horizontal divider line between sections',
    defaultContent: `<!--[if mso]><table cellpadding="0" cellspacing="0" border="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr><td style="padding:16px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="background-color:#e0e0e0;font-size:1px;line-height:1px;height:1px;">&nbsp;</td></tr></table></td></tr></table><![endif]--><!--[if !mso]><!--><table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${OUTLOOK_FONT_FAMILY}; border-collapse: collapse;"><tr><td style="padding: 16px 0;"><table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;"><tr><td style="background-color: #e0e0e0; font-size: 1px; line-height: 1px; height: 1px; mso-line-height-rule: exactly;">&nbsp;</td></tr></table></td></tr></table><!--<![endif]-->`,
    category: 'layout',
  },
  {
    type: 'static-text',
    label: 'Static Text',
    icon: FileText,
    description: 'Enter text directly without placeholders',
    defaultContent: `<span style="font-family: ${OUTLOOK_FONT_FAMILY}; font-size: 14px; color: #333333;">Enter your static text here...</span>`,
    category: 'text',
    variables: [
      {
        name: 'content',
        label: 'Text Content',
        type: 'text',
        defaultValue: 'Enter your static text here. This is just plain text with no variables or placeholders.'
      }
    ]
  },
  {
    type: 'mixed-content',
    label: 'Mixed Content',
    icon: Type,
    description: 'Combine static text with dynamic variables and links (e.g., "P3 Incident: {{label}} <a href="{{linkUrl}}">{{linkText}}</a>")',
    defaultContent: `<span style="font-family: ${OUTLOOK_FONT_FAMILY}; font-size: 14px;"><span th:utext="\${content}"/></span>`,
    category: 'text',
    variables: [
      {
        name: 'content',
        label: 'Content (mix static text with variables)',
        type: 'text',
        defaultValue: 'P3 Incident: {{label}} <a href="{{linkUrl}}">{{linkText}}</a>'
      }
    ]
  },
  {
    type: 'labeled-content',
    label: 'Labeled Content',
    icon: FileText,
    description: 'Section with dynamic label (e.g., "Incident {{number}}") and customizable content type',
    defaultContent: `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${OUTLOOK_FONT_FAMILY};"><tr><td style="padding: 0;"><div style="font-weight: bold; margin-bottom: 8px; font-size: 1.1em;"><span th:utext="\${label}"/></div><div><span th:utext="\${content}"/></div></td></tr></table>`,
    category: 'text',
    variables: [
      {
        name: 'label',
        label: 'Label/Heading (can include variables)',
        type: 'text',
        defaultValue: 'Title'
      },
      {
        name: 'contentType',
        label: 'Content Type',
        type: 'text',
        defaultValue: 'text'
      },
      {
        name: 'content',
        label: 'Text Content',
        type: 'text',
        defaultValue: 'text content goes here'
      },
      {
        name: 'items',
        label: 'List Items (if content type is list)',
        type: 'list',
        defaultValue: [
          { text: 'Item 1', children: [] },
          { text: 'Item 2', children: [] }
        ]
      },
      {
        name: 'listStyle',
        label: 'List Style',
        type: 'text',
        defaultValue: 'circle'
      },
      {
        name: 'tableData',
        label: 'Table Data (if content type is table)',
        type: 'table',
        defaultValue: { headers: ['Column 1', 'Column 2'], rows: [['Cell 1', 'Cell 2']] }
      }
    ]
  },
  {
    type: 'container',
    label: 'Container',
    icon: Box,
    description: 'Container to group nested sections together',
    defaultContent: `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: ${OUTLOOK_FONT_FAMILY};"><tr><td style="padding: 10px;">Container for nested sections</td></tr></table>`,
    category: 'layout',
    variables: []
  },
  {
    type: 'banner',
    label: 'Banner',
    icon: Flag,
    description: 'Highlight text with colored background (1x1 table)',
    defaultContent: `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-family: ${OUTLOOK_FONT_FAMILY};"><tr><td style="background-color: #FFFF00; padding: 6pt; font-size: 18px; font-weight: bold; line-height: normal; mso-line-height-rule: exactly;">EFT</td></tr></table>`,
    category: 'text',
    variables: [
      { 
        name: 'tableData', 
        label: 'Banner Data', 
        type: 'table' as any, 
        defaultValue: {
          rows: [['EFT']],
          showBorder: false,
          mergedCells: {},
          cellStyles: { '0-0': { backgroundColor: '#FFFF00', padding: '6pt', fontSize: '18px', fontWeight: 'bold', lineHeight: 'normal' } },
          cellPadding: 'medium'
        } as any
      }
    ]
  },
  {
    type: 'program-name',
    label: 'Program Name',
    icon: Type,
    description: 'Program name with bold styling',
    defaultContent: `<font style="font-size: 14px; line-height: 21px; color: #141414; font-weight: bold; font-family: ${OUTLOOK_FONT_FAMILY};"><span th:utext="\${programNameText}"/></font>`,
    category: 'text',
    variables: [
      { name: 'programNameText', label: 'Program Name', type: 'text', defaultValue: 'Program Name' }
    ]
  },
  {
    type: 'cta-text',
    label: 'CTA Text',
    icon: Link,
    description: 'Call to action text link with arrow',
    defaultContent: `<p style="margin: 0; margin-bottom: 0px;"><a th:href="\${ctaUrl}" href="#" style="font-size: 14px; color: #5A469B; font-family: ${OUTLOOK_FONT_FAMILY}; line-height: 24px; font-weight: bold; text-decoration: underline;"><span th:utext="\${ctaText}"/></a></p>`,
    category: 'interactive',
    variables: [
      { name: 'ctaText', label: 'CTA Text', type: 'text', defaultValue: 'Call to action&nbsp;>' },
      { name: 'ctaUrl', label: 'CTA URL', type: 'url', defaultValue: '#' }
    ]
  },
  {
    type: 'date',
    label: 'Date',
    icon: Calendar,
    description: 'Right-aligned date display (e.g., February 05, 2026)',
    defaultContent: `<div style="text-align: right; font-family: ${OUTLOOK_FONT_FAMILY}; font-size: 14px; color: #333333; line-height: 21px; mso-line-height-rule: exactly;"><span th:utext="\${dateValue}"/></div>`,
    category: 'text',
    variables: [
      { name: 'dateValue', label: 'Date Value', type: 'text', defaultValue: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' }) }
    ]
  }
];
