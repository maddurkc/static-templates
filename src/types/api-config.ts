export interface ApiTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string; // Can contain placeholders like {version}, {projectKey}
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>; // Can contain placeholders
  bodyTemplate?: string; // Template for POST body with placeholders
  requiredParams: ApiParam[]; // Parameters user needs to provide
  sampleMappings?: ApiMapping[]; // Suggested mappings for this template
  mockData?: any; // Mock response data for testing
}

export interface ApiParam {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  required: boolean;
  description?: string;
  options?: string[]; // For select type
  location: 'query' | 'path' | 'body' | 'header'; // Where this param goes
}

export interface ApiConfig {
  enabled: boolean;
  templateId: string; // ID of selected API template
  paramValues: Record<string, string>; // User-provided values for template params
  mappings: ApiMapping[];
}

export interface ApiMapping {
  id: string;
  sectionId: string;
  apiPath: string; // JSONPath to extract data from API response
  dataType: 'text' | 'list' | 'html';
  variableName?: string; // Which variable in the section to update
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  enabled: false,
  templateId: '',
  paramValues: {},
  mappings: []
};
