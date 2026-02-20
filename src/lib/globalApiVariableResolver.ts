import { GlobalApiConfig, GlobalApiVariable } from "@/types/global-api-config";

/**
 * Get a nested value from an object using dot notation.
 * e.g., getNestedValue({a: {b: 1}}, "a.b") => 1
 */
const getNestedValue = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[part];
  }, obj);
};

/**
 * Resolves {{variableName.fieldPath}} placeholders in content using global API variables.
 * 
 * Supports:
 * - {{snowDetails.changeNo}} -> looks up globalVariables["snowDetails"].data.changeNo
 * - {{snowDetails}} -> returns the entire data object (as JSON string for display)
 * - {{varName.nested.field}} -> deep nested access
 * 
 * Only resolves variables that exist in the globalVariables map.
 * Unresolved placeholders are left as-is.
 */
export const resolveGlobalApiVariables = (
  content: string, 
  globalVariables: Record<string, GlobalApiVariable>
): string => {
  if (!content || !globalVariables || Object.keys(globalVariables).length === 0) {
    return content;
  }

  // Match {{word.word...}} patterns (dot-notation access to global vars)
  // Also match {{word}} for top-level global variable references
  return content.replace(/\{\{([\w]+(?:\.[\w]+)*)\}\}/g, (match, fullPath: string) => {
    const parts = fullPath.split('.');
    const varName = parts[0];
    
    // Check if the variable exists in globalVariables
    const globalVar = globalVariables[varName];
    if (!globalVar) return match; // Not a global API variable, leave as-is
    
    // If just the variable name (no field path), return stringified data
    if (parts.length === 1) {
      if (globalVar.data === null || globalVar.data === undefined) return '';
      if (typeof globalVar.data === 'object') {
        return JSON.stringify(globalVar.data);
      }
      return String(globalVar.data);
    }
    
    // Access nested field from the data
    const fieldPath = parts.slice(1).join('.');
    const value = getNestedValue(globalVar.data, fieldPath);
    
    if (value === null || value === undefined) return match; // Field not found, keep placeholder
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
};

/**
 * Resolves global API variables in HTML content, including within Thymeleaf-style tags.
 * This is a higher-level function that handles both {{placeholder}} and raw text resolution.
 */
export const resolveGlobalApiInHtml = (
  html: string,
  globalVariables: Record<string, GlobalApiVariable>
): string => {
  if (!html || !globalVariables || Object.keys(globalVariables).length === 0) {
    return html;
  }
  return resolveGlobalApiVariables(html, globalVariables);
};

/**
 * Get all available global variable field paths for autocomplete/display.
 * Returns paths like ["snowDetails.changeNo", "snowDetails.changeStDt", ...]
 */
export const getGlobalVariableFieldPaths = (
  globalVariables: Record<string, GlobalApiVariable>
): { path: string; value: any; type: string }[] => {
  const paths: { path: string; value: any; type: string }[] = [];
  
  for (const [varName, variable] of Object.entries(globalVariables)) {
    if (!variable.data) continue;
    
    if (typeof variable.data === 'object' && !Array.isArray(variable.data)) {
      // Single object - extract all field paths
      const extractPaths = (obj: any, prefix: string) => {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = `${prefix}.${key}`;
          if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            extractPaths(value, fullPath);
          } else {
            paths.push({ 
              path: fullPath, 
              value, 
              type: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value 
            });
          }
        }
      };
      extractPaths(variable.data, varName);
    } else {
      // Array or primitive - just add the top-level
      paths.push({ 
        path: varName, 
        value: variable.data, 
        type: Array.isArray(variable.data) ? 'array' : typeof variable.data 
      });
    }
  }
  
  return paths;
};
