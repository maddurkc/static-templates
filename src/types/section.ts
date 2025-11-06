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
  | 'grid';

export interface Section {
  id: string;
  type: SectionType;
  content: string;
  styles?: {
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
    padding?: string;
    margin?: string;
    textAlign?: string;
    fontWeight?: string;
  };
  children?: Section[];
  order?: number;
}

export interface SectionDefinition {
  type: SectionType;
  label: string;
  icon: any;
  description: string;
  defaultContent: string;
  category: 'text' | 'media' | 'layout' | 'interactive';
}
