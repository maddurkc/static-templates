/**
 * Template Variable Types
 * Represents variables stored in the template_variables table
 */

export interface TemplateVariable {
  id?: string;
  templateId?: string;
  variableName: string;
  variableLabel: string;
  variableType: 'text' | 'number' | 'date' | 'email' | 'url' | 'list' | 'table';
  defaultValue: string | null;
  isRequired: boolean;
  placeholder?: string;
  sectionId?: string; // Optional link to the section that uses this variable
  source: 'subject' | 'section' | 'header' | 'footer'; // Where the variable was found
}

export interface TemplateVariableRequest {
  variableName: string;
  variableLabel: string;
  variableType: string;
  defaultValue?: string;
  isRequired: boolean;
  placeholder?: string;
  sectionId?: string;
}

export interface TemplateVariableResponse {
  id: string;
  templateId: string;
  variableName: string;
  variableLabel: string;
  variableType: string;
  defaultValue?: string;
  isRequired: boolean;
  placeholder?: string;
  sectionId?: string;
  createdAt: string;
}
