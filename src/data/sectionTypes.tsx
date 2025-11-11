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
  FileText
} from "lucide-react";
import { SectionDefinition } from "@/types/section";

export const sectionTypes: SectionDefinition[] = [
  {
    type: 'heading1',
    label: 'Heading 1',
    icon: Heading1,
    description: 'Large heading for main titles',
    defaultContent: '<h1>{{title}}</h1>',
    category: 'text',
    variables: [
      { name: 'title', label: 'Title', type: 'text', defaultValue: 'Main Title' }
    ]
  },
  {
    type: 'heading2',
    label: 'Heading 2',
    icon: Heading2,
    description: 'Section heading',
    defaultContent: '<h2>{{title}}</h2>',
    category: 'text',
    variables: [
      { name: 'title', label: 'Title', type: 'text', defaultValue: 'Section Title' }
    ]
  },
  {
    type: 'heading3',
    label: 'Heading 3',
    icon: Heading3,
    description: 'Subsection heading',
    defaultContent: '<h3>{{title}}</h3>',
    category: 'text',
    variables: [
      { name: 'title', label: 'Title', type: 'text', defaultValue: 'Subsection Title' }
    ]
  },
  {
    type: 'heading4',
    label: 'Heading 4',
    icon: Heading4,
    description: 'Minor heading',
    defaultContent: '<h4>{{title}}</h4>',
    category: 'text',
    variables: [
      { name: 'title', label: 'Title', type: 'text', defaultValue: 'Minor Title' }
    ]
  },
  {
    type: 'heading5',
    label: 'Heading 5',
    icon: Heading5,
    description: 'Small heading',
    defaultContent: '<h5>{{title}}</h5>',
    category: 'text',
    variables: [
      { name: 'title', label: 'Title', type: 'text', defaultValue: 'Small Title' }
    ]
  },
  {
    type: 'heading6',
    label: 'Heading 6',
    icon: Heading6,
    description: 'Smallest heading',
    defaultContent: '<h6>{{title}}</h6>',
    category: 'text',
    variables: [
      { name: 'title', label: 'Title', type: 'text', defaultValue: 'Tiny Title' }
    ]
  },
  {
    type: 'text',
    label: 'Text',
    icon: Type,
    description: 'Simple text element',
    defaultContent: '<span>{{text}}</span>',
    category: 'text',
    variables: [
      { name: 'text', label: 'Text', type: 'text', defaultValue: 'Your text here' }
    ]
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    icon: AlignLeft,
    description: 'Text paragraph with spacing',
    defaultContent: '<p>{{text}}</p>',
    category: 'text',
    variables: [
      { name: 'text', label: 'Text', type: 'text', defaultValue: 'This is a paragraph with multiple lines of text. You can add more content here.' }
    ]
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
    defaultContent: '<ul style="list-style-type: circle;">{{items}}</ul>',
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
    defaultContent: '<ul style="list-style-type: disc;">{{items}}</ul>',
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
    defaultContent: '<ul style="list-style-type: square;">{{items}}</ul>',
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
    defaultContent: '<ol style="list-style-type: decimal;">{{items}}</ol>',
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
    defaultContent: '<ol style="list-style-type: lower-roman;">{{items}}</ol>',
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
    defaultContent: '<ol style="list-style-type: lower-alpha;">{{items}}</ol>',
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
    defaultContent: '<img src="{{src}}" alt="{{alt}}" />',
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
    defaultContent: '<a href="{{href}}">{{text}}</a>',
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
    defaultContent: '<button>{{text}}</button>',
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
    defaultContent: '{{htmlContent}}',
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
  }
];
