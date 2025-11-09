export interface ApiConfig {
  enabled: boolean;
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
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
  url: '',
  method: 'GET',
  headers: {},
  mappings: []
};
