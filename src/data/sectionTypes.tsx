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
  FileText,
  Box,
  LayoutGrid
} from "lucide-react";
import { SectionDefinition } from "@/types/section";

// Default heading styles for each heading level
export const headingDefaultStyles: Record<string, { fontSize: string; color: string; fontFamily: string; fontWeight: string; lineHeight: string }> = {
  heading1: { fontSize: '34px', color: '#3B3331', fontFamily: 'WellsfargoSerif-Regular, serif', fontWeight: '400', lineHeight: '44px' },
  heading2: { fontSize: '24px', color: '#3B3331', fontFamily: 'WellsfargoSerif-Regular, serif', fontWeight: '600', lineHeight: '30px' },
  heading3: { fontSize: '20px', color: '#3B3331', fontFamily: 'WellsfargoSerif-Regular, serif', fontWeight: '400', lineHeight: '25px' },
  heading4: { fontSize: '16px', color: '#3B3331', fontFamily: 'WellsfargoSerif-Regular, serif', fontWeight: '400', lineHeight: '20px' },
  heading5: { fontSize: '15px', color: '#3B3331', fontFamily: 'WellsfargoSerif-Semibold, serif', fontWeight: '600', lineHeight: '19px' },
  heading6: { fontSize: '14px', color: '#3B3331', fontFamily: 'WellsfargoSerif-Semibold, serif', fontWeight: '600', lineHeight: '18px' },
};

export const sectionTypes: SectionDefinition[] = [
  {
    type: 'heading1',
    label: 'Heading 1',
    icon: Heading1,
    description: 'Large heading - use {{variable}} for dynamic values',
    defaultContent: '<h1 style="font-size: 34px; color: #3B3331; font-family: WellsfargoSerif-Regular, serif; font-weight: 400; line-height: 44px;">Main Title</h1>',
    category: 'text',
    variables: []
  },
  {
    type: 'heading2',
    label: 'Heading 2',
    icon: Heading2,
    description: 'Section heading - use {{variable}} for dynamic values',
    defaultContent: '<h2 style="font-size: 24px; color: #3B3331; font-family: WellsfargoSerif-Regular, serif; font-weight: 600; line-height: 30px;">Section Title</h2>',
    category: 'text',
    variables: []
  },
  {
    type: 'heading3',
    label: 'Heading 3',
    icon: Heading3,
    description: 'Subsection heading - use {{variable}} for dynamic values',
    defaultContent: '<h3 style="font-size: 20px; color: #3B3331; font-family: WellsfargoSerif-Regular, serif; font-weight: 400; line-height: 25px;">Subsection Title</h3>',
    category: 'text',
    variables: []
  },
  {
    type: 'heading4',
    label: 'Heading 4',
    icon: Heading4,
    description: 'Minor heading - use {{variable}} for dynamic values',
    defaultContent: '<h4 style="font-size: 16px; color: #3B3331; font-family: WellsfargoSerif-Regular, serif; font-weight: 400; line-height: 20px;">Minor Title</h4>',
    category: 'text',
    variables: []
  },
  {
    type: 'heading5',
    label: 'Heading 5',
    icon: Heading5,
    description: 'Small heading - use {{variable}} for dynamic values',
    defaultContent: '<h5 style="font-size: 15px; color: #3B3331; font-family: WellsfargoSerif-Semibold, serif; font-weight: 600; line-height: 19px;">Small Title</h5>',
    category: 'text',
    variables: []
  },
  {
    type: 'heading6',
    label: 'Heading 6',
    icon: Heading6,
    description: 'Smallest heading - use {{variable}} for dynamic values',
    defaultContent: '<h6 style="font-size: 14px; color: #3B3331; font-family: WellsfargoSerif-Semibold, serif; font-weight: 600; line-height: 18px;">Tiny Title</h6>',
    category: 'text',
    variables: []
  },
  {
    type: 'text',
    label: 'Text',
    icon: Type,
    description: 'Simple text - use {{variable}} for dynamic values',
    defaultContent: '<span>Your text here</span>',
    category: 'text',
    variables: []
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    icon: AlignLeft,
    description: 'Text paragraph - use {{variable}} for dynamic values',
    defaultContent: '<p>This is a paragraph. You can add {{dynamic}} values like this.</p>',
    category: 'text',
    variables: []
  },
  {
    type: 'table',
    label: 'Table',
    icon: Table,
    description: 'Data table',
    defaultContent: '<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Data 1</td><td>Data 2</td></tr></table>',
    category: 'layout',
    variables: [
      { 
        name: 'tableData', 
        label: 'Table Data', 
        type: 'table' as any, 
        defaultValue: {
          rows: [['Header 1', 'Header 2'], ['Data 1', 'Data 2']],
          showBorder: true,
          mergedCells: {}
        } as any
      }
    ]
  },
  {
    type: 'bullet-list-circle',
    label: 'Bullet List (Circle)',
    icon: List,
    description: 'List with circle bullets',
    defaultContent: '<ul style="list-style-type: circle;"><span th:utext="${items}"/></ul>',
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
    defaultContent: '<ul style="list-style-type: disc;"><span th:utext="${items}"/></ul>',
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
    defaultContent: '<ul style="list-style-type: square;"><span th:utext="${items}"/></ul>',
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
    defaultContent: '<ol style="list-style-type: decimal;"><span th:utext="${items}"/></ol>',
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
    defaultContent: '<ol style="list-style-type: lower-roman;"><span th:utext="${items}"/></ol>',
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
    defaultContent: '<ol style="list-style-type: lower-alpha;"><span th:utext="${items}"/></ol>',
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
    defaultContent: '<img src="<span th:utext="${src}"/>" alt="<span th:utext="${alt}"/>" />',
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
    defaultContent: '<a href="<span th:utext="${href}"/>"><span th:utext="${text}"/></a>',
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
    defaultContent: '<button><span th:utext="${text}"/></button>',
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
    defaultContent: '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;"><div>Column 1</div><div>Column 2</div><div>Column 3</div></div>',
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
        defaultValue: '<div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px;"><h3>Sample HTML Content</h3><p>This section can display any HTML content from your API response.</p></div>' 
      }
    ]
  },
  {
    type: 'line-break',
    label: 'Line Break',
    icon: Minus,
    description: 'Add vertical spacing between sections',
    defaultContent: '<br/>',
    category: 'text',
  },
  {
    type: 'static-text',
    label: 'Static Text',
    icon: FileText,
    description: 'Enter text directly without placeholders',
    defaultContent: 'Enter your static text here...',
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
    defaultContent: '<span th:utext="${content}"/>',
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
    defaultContent: '<div><strong><span th:utext="${label}"/></strong><div><span th:utext="${content}"/></div></div>',
    category: 'text',
    variables: [
      {
        name: 'label',
        label: 'Label/Heading (can include variables)',
        type: 'text',
        defaultValue: 'Incident Report'
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
        defaultValue: 'Messages journaled in exchange online:\n- Invalid Characters\n- Header too Large'
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
    defaultContent: '<div>Container for nested sections</div>',
    category: 'layout',
    variables: []
  },
  {
    type: 'layout-table',
    label: 'Layout Table',
    icon: LayoutGrid,
    description: 'Table layout with cells that can contain sections - drag and drop content into cells',
    defaultContent: '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>',
    category: 'layout',
    variables: []
  }
];
