// Global API Configuration - Template-level API integrations
// API responses are stored as global variables that can be referenced from any section

// Data transformation types
export interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string;
}

export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string; // Renamed field in output
  enabled: boolean;
}

export interface DataTransformation {
  filters: FilterCondition[];
  filterLogic: 'and' | 'or'; // How to combine multiple filters
  fieldMappings: FieldMapping[];
  selectFields: string[]; // Fields to include (empty = all)
  limit?: number; // Max items to return
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const DEFAULT_TRANSFORMATION: DataTransformation = {
  filters: [],
  filterLogic: 'and',
  fieldMappings: [],
  selectFields: [],
  limit: undefined,
  sortField: undefined,
  sortOrder: 'asc'
};

export interface GlobalApiIntegration {
  id: string;
  name: string; // User-friendly name for this integration
  templateId: string; // ID of selected API template from apiTemplates
  paramValues: Record<string, string>; // User-provided values for template params
  variableName: string; // Global variable name to store the API response (e.g., "jiraIssues")
  enabled: boolean;
  transformation?: DataTransformation; // Optional data transformation config
}

export interface GlobalApiConfig {
  integrations: GlobalApiIntegration[];
  // Stored API responses as global variables - key is variableName, value is the response data
  globalVariables: Record<string, GlobalApiVariable>;
}

export interface GlobalApiVariable {
  name: string;
  data: any; // The actual API response data (object or array)
  dataType: 'object' | 'list' | 'stringList'; // Whether the response is a single object, list of objects, or list of strings
  lastFetched?: string; // ISO timestamp of last fetch
  schema?: Record<string, string>; // Detected schema: field name -> type (for dropdown hints)
  rawData?: any; // Original data before transformation
}

export const DEFAULT_GLOBAL_API_CONFIG: GlobalApiConfig = {
  integrations: [],
  globalVariables: {}
};

// Helper to generate a unique integration ID
export const generateIntegrationId = (): string => {
  return `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to generate unique IDs for filters/mappings
export const generateFilterId = (): string => {
  return `filter-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
};

export const generateMappingId = (): string => {
  return `map-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
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

// Get nested value from object using dot notation
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
};

// Apply filter condition to a single item
const matchesFilter = (item: any, filter: FilterCondition): boolean => {
  const value = getNestedValue(item, filter.field);
  const filterValue = filter.value;
  
  switch (filter.operator) {
    case 'equals':
      return String(value).toLowerCase() === filterValue.toLowerCase();
    case 'not_equals':
      return String(value).toLowerCase() !== filterValue.toLowerCase();
    case 'contains':
      return String(value).toLowerCase().includes(filterValue.toLowerCase());
    case 'not_contains':
      return !String(value).toLowerCase().includes(filterValue.toLowerCase());
    case 'greater_than':
      return Number(value) > Number(filterValue);
    case 'less_than':
      return Number(value) < Number(filterValue);
    case 'is_empty':
      return value === null || value === undefined || value === '';
    case 'is_not_empty':
      return value !== null && value !== undefined && value !== '';
    default:
      return true;
  }
};

// Apply transformations to data
export const applyTransformations = (data: any, transformation?: DataTransformation): any => {
  if (!transformation) return data;
  if (!Array.isArray(data)) return data; // Only transform arrays
  
  let result = [...data];
  
  // Apply filters
  if (transformation.filters.length > 0) {
    result = result.filter(item => {
      const matches = transformation.filters.map(f => matchesFilter(item, f));
      return transformation.filterLogic === 'and' 
        ? matches.every(Boolean) 
        : matches.some(Boolean);
    });
  }
  
  // Apply sorting
  if (transformation.sortField) {
    result.sort((a, b) => {
      const aVal = getNestedValue(a, transformation.sortField!);
      const bVal = getNestedValue(b, transformation.sortField!);
      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return transformation.sortOrder === 'desc' ? -comparison : comparison;
    });
  }
  
  // Apply limit
  if (transformation.limit && transformation.limit > 0) {
    result = result.slice(0, transformation.limit);
  }
  
  // Apply field selection and mapping
  if (transformation.selectFields.length > 0 || transformation.fieldMappings.length > 0) {
    result = result.map(item => {
      const newItem: Record<string, any> = {};
      
      // Get fields to include
      const fieldsToInclude = transformation.selectFields.length > 0 
        ? transformation.selectFields 
        : Object.keys(item);
      
      // Apply field mappings
      const mappingMap = new Map(
        transformation.fieldMappings
          .filter(m => m.enabled)
          .map(m => [m.sourceField, m.targetField])
      );
      
      for (const field of fieldsToInclude) {
        const targetField = mappingMap.get(field) || field;
        newItem[targetField] = getNestedValue(item, field);
      }
      
      return newItem;
    });
  }
  
  return result;
};
