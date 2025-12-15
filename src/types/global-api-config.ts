// Global API Configuration - Template-level API integrations
// API responses are stored as global variables that can be referenced from any section

export interface GlobalApiIntegration {
  id: string;
  name: string; // User-friendly name for this integration
  templateId: string; // ID of selected API template from apiTemplates
  paramValues: Record<string, string>; // User-provided values for template params
  variableName: string; // Global variable name to store the API response (e.g., "jiraIssues")
  enabled: boolean;
}

export interface GlobalApiConfig {
  integrations: GlobalApiIntegration[];
  // Stored API responses as global variables - key is variableName, value is the response data
  globalVariables: Record<string, GlobalApiVariable>;
}

export interface GlobalApiVariable {
  name: string;
  data: any; // The actual API response data (object or array)
  dataType: 'object' | 'list'; // Whether the response is a single object or list of objects
  lastFetched?: string; // ISO timestamp of last fetch
  schema?: Record<string, string>; // Detected schema: field name -> type (for dropdown hints)
}

export const DEFAULT_GLOBAL_API_CONFIG: GlobalApiConfig = {
  integrations: [],
  globalVariables: {}
};

// Helper to generate a unique integration ID
export const generateIntegrationId = (): string => {
  return `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to create a valid variable name from user input
export const sanitizeVariableName = (name: string): string => {
  // Remove special characters, replace spaces/hyphens with underscores
  return name
    .replace(/[^a-zA-Z0-9_\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^[0-9]/, '_$&') // Prefix with underscore if starts with number
    .toLowerCase();
};

// Detect schema from API response data
export const detectSchema = (data: any): Record<string, string> => {
  if (!data) return {};
  
  const sample = Array.isArray(data) ? data[0] : data;
  if (!sample || typeof sample !== 'object') return {};
  
  const schema: Record<string, string> = {};
  
  const extractPaths = (obj: any, prefix: string = '') => {
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      
      if (value === null || value === undefined) {
        schema[path] = 'null';
      } else if (Array.isArray(value)) {
        schema[path] = 'array';
        if (value.length > 0 && typeof value[0] === 'object') {
          extractPaths(value[0], `${path}[]`);
        }
      } else if (typeof value === 'object') {
        extractPaths(value, path);
      } else {
        schema[path] = typeof value;
      }
    }
  };
  
  extractPaths(sample);
  return schema;
};
