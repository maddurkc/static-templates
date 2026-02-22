import { GlobalApiConfig } from "@/types/global-api-config";

/**
 * Get a nested value from an object using dot notation.
 * e.g., getNestedValue({a: {b: 1}}, "a.b") => 1
 */
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
};

/**
 * Resolves all {{variableName}} and {{variableName.field.path}} placeholders
 * in a content string using global API variables.
 * 
 * - If the variable is an object and a field path is provided, returns the field value.
 * - If the variable is an object with no field path, returns JSON stringified.
 * - If the variable is a primitive, returns its string value.
 * - If the variable is not found, returns the original placeholder unchanged.
 */
export const resolveGlobalApiVariables = (
  content: string,
  globalApiConfig: GlobalApiConfig
): string => {
  if (!content || !globalApiConfig?.globalVariables) return content;

  // Match {{varName}} and {{varName.field.path}} patterns
  return content.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, fullPath: string) => {
    const parts = fullPath.split('.');
    const varName = parts[0];
    const fieldPath = parts.slice(1).join('.');

    const globalVar = globalApiConfig.globalVariables[varName];
    if (!globalVar) return match; // Not a global API variable, leave unchanged

    const data = globalVar.data;
    if (data === null || data === undefined) return match;

    if (fieldPath) {
      // Dot-notation access: snowDetails.changeNo
      const value = getNestedValue(data, fieldPath);
      if (value === null || value === undefined) return match;
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    }

    // No field path - return stringified object or primitive
    if (typeof data === 'object') return JSON.stringify(data);
    return String(data);
  });
};

/**
 * Same as resolveGlobalApiVariables but also resolves Thymeleaf-style
 * <span th:utext="${varName.field}"/> tags.
 */
export const resolveGlobalApiThymeleaf = (
  content: string,
  globalApiConfig: GlobalApiConfig
): string => {
  if (!content || !globalApiConfig?.globalVariables) return content;

  // First resolve Thymeleaf tags: <span th:utext="${snowDetails.changeNo}"/>
  let resolved = content.replace(
    /<span\s+th:utext="\$\{(\w+(?:\.\w+)*)\}"\/>/g,
    (match, fullPath: string) => {
      const parts = fullPath.split('.');
      const varName = parts[0];
      const fieldPath = parts.slice(1).join('.');

      const globalVar = globalApiConfig.globalVariables[varName];
      if (!globalVar) return match;

      const data = globalVar.data;
      if (data === null || data === undefined) return match;

      if (fieldPath) {
        const value = getNestedValue(data, fieldPath);
        if (value === null || value === undefined) return match;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }

      if (typeof data === 'object') return JSON.stringify(data);
      return String(data);
    }
  );

  // Then resolve {{placeholder}} patterns
  resolved = resolveGlobalApiVariables(resolved, globalApiConfig);

  return resolved;
};
