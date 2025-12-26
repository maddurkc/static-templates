export type SectionType = 
  | 'heading1' 
  | 'heading2' 
  | 'heading3' 
  | 'heading4' 
  | 'heading5' 
  | 'heading6' 
  | 'text' 
  | 'paragraph' 
  | 'table' 
  | 'bullet-list-circle' 
  | 'bullet-list-disc' 
  | 'bullet-list-square' 
  | 'number-list-1' 
  | 'number-list-i' 
  | 'number-list-a' 
  | 'image' 
  | 'link' 
  | 'button' 
  | 'grid'
  | 'html-content'
  | 'header'
  | 'footer'
  | 'line-break'
  | 'static-text'
  | 'mixed-content'
  | 'labeled-content'
  | 'container'
  | 'layout-table';

export interface SectionVariable {
  name: string;
  label: string;
  type: 'text' | 'url' | 'list' | 'table';
  defaultValue: string | string[] | any;
}

export interface ListItemStyle {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;
  fontSize?: string;
  children?: ListItemStyle[];
}

export interface TextStyle {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  backgroundColor?: string;
  fontSize?: string;
}

// Layout table cell structure - each cell can contain nested sections
export interface LayoutTableCell {
  id: string;
  sections: Section[];
  width?: string; // e.g., '50%', '200px'
}

// Layout table row structure
export interface LayoutTableRow {
  id: string;
  cells: LayoutTableCell[];
}

// Layout table data structure
export interface LayoutTableData {
  rows: LayoutTableRow[];
  cellPadding?: string;
  cellSpacing?: string;
  borderColor?: string;
  showBorders?: boolean;
}

export interface Section {
  id: string;
  type: SectionType;
  content: string;
  variables?: Record<string, string | string[] | ListItemStyle[] | any>;
  styles?: {
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
    padding?: string;
    margin?: string;
    textAlign?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    fontFamily?: string;
    lineHeight?: string;
  };
  children?: Section[];
  order?: number;
  isLabelEditable?: boolean; // Whether the label can be edited at runtime
  layoutTableData?: LayoutTableData; // Data for layout-table sections
}

export interface SectionDefinition {
  type: SectionType;
  label: string;
  icon: any;
  description: string;
  defaultContent: string;
  category: 'text' | 'media' | 'layout' | 'interactive';
  variables?: SectionVariable[];
}
