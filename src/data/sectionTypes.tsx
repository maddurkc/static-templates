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
  Grid3x3
} from "lucide-react";
import { SectionDefinition } from "@/types/section";

export const sectionTypes: SectionDefinition[] = [
  {
    type: 'heading1',
    label: 'Heading 1',
    icon: Heading1,
    description: 'Large heading for main titles',
    defaultContent: '<h1>Main Title</h1>',
    category: 'text'
  },
  {
    type: 'heading2',
    label: 'Heading 2',
    icon: Heading2,
    description: 'Section heading',
    defaultContent: '<h2>Section Title</h2>',
    category: 'text'
  },
  {
    type: 'heading3',
    label: 'Heading 3',
    icon: Heading3,
    description: 'Subsection heading',
    defaultContent: '<h3>Subsection Title</h3>',
    category: 'text'
  },
  {
    type: 'heading4',
    label: 'Heading 4',
    icon: Heading4,
    description: 'Minor heading',
    defaultContent: '<h4>Minor Title</h4>',
    category: 'text'
  },
  {
    type: 'heading5',
    label: 'Heading 5',
    icon: Heading5,
    description: 'Small heading',
    defaultContent: '<h5>Small Title</h5>',
    category: 'text'
  },
  {
    type: 'heading6',
    label: 'Heading 6',
    icon: Heading6,
    description: 'Smallest heading',
    defaultContent: '<h6>Tiny Title</h6>',
    category: 'text'
  },
  {
    type: 'text',
    label: 'Text',
    icon: Type,
    description: 'Simple text element',
    defaultContent: '<span>Your text here</span>',
    category: 'text'
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    icon: AlignLeft,
    description: 'Text paragraph with spacing',
    defaultContent: '<p>This is a paragraph with multiple lines of text. You can add more content here.</p>',
    category: 'text'
  },
  {
    type: 'table',
    label: 'Table',
    icon: Table,
    description: 'Data table',
    defaultContent: '<table><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Data 1</td><td>Data 2</td></tr></table>',
    category: 'layout'
  },
  {
    type: 'bullet-list-circle',
    label: 'Bullet List (Circle)',
    icon: List,
    description: 'List with circle bullets',
    defaultContent: '<ul style="list-style-type: circle;"><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>',
    category: 'text'
  },
  {
    type: 'bullet-list-disc',
    label: 'Bullet List (Disc)',
    icon: List,
    description: 'List with disc bullets',
    defaultContent: '<ul style="list-style-type: disc;"><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>',
    category: 'text'
  },
  {
    type: 'bullet-list-square',
    label: 'Bullet List (Square)',
    icon: List,
    description: 'List with square bullets',
    defaultContent: '<ul style="list-style-type: square;"><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>',
    category: 'text'
  },
  {
    type: 'number-list-1',
    label: 'Numbered List (1,2,3)',
    icon: ListOrdered,
    description: 'List with numbers',
    defaultContent: '<ol style="list-style-type: decimal;"><li>First item</li><li>Second item</li><li>Third item</li></ol>',
    category: 'text'
  },
  {
    type: 'number-list-i',
    label: 'Numbered List (i,ii,iii)',
    icon: ListOrdered,
    description: 'List with roman numerals',
    defaultContent: '<ol style="list-style-type: lower-roman;"><li>First item</li><li>Second item</li><li>Third item</li></ol>',
    category: 'text'
  },
  {
    type: 'number-list-a',
    label: 'Numbered List (a,b,c)',
    icon: ListOrdered,
    description: 'List with letters',
    defaultContent: '<ol style="list-style-type: lower-alpha;"><li>First item</li><li>Second item</li><li>Third item</li></ol>',
    category: 'text'
  },
  {
    type: 'image',
    label: 'Image',
    icon: Image,
    description: 'Image element',
    defaultContent: '<img src="https://placehold.co/600x400" alt="Placeholder" />',
    category: 'media'
  },
  {
    type: 'link',
    label: 'Link',
    icon: Link,
    description: 'Hyperlink element',
    defaultContent: '<a href="#">Click here</a>',
    category: 'interactive'
  },
  {
    type: 'button',
    label: 'Button',
    icon: MousePointerClick,
    description: 'Button element',
    defaultContent: '<button>Click me</button>',
    category: 'interactive'
  },
  {
    type: 'grid',
    label: 'Grid',
    icon: Grid3x3,
    description: 'Grid layout container',
    defaultContent: '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;"><div>Column 1</div><div>Column 2</div><div>Column 3</div></div>',
    category: 'layout'
  }
];
