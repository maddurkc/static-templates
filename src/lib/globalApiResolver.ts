import { GlobalApiConfig } from "@/types/global-api-config";
import { sanitizeHTML } from "@/lib/sanitize";

/**
 * Get a nested value from an object using dot notation.
 * e.g., getNestedValue({a: {b: 1}}, "a.b") => 1
 */
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
};

/**
 * Safely convert an arbitrary external API value into an HTML-safe string.
 * - Objects are JSON-stringified
 * - All output is run through DOMPurify (sanitizeHTML) to strip <script>,
 *   event handlers, and other XSS vectors before being injected into HTML
 *   templates via dangerouslySetInnerHTML downstream.
 */
const toSafeString = (value: any): string => {
  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return sanitizeHTML(raw);
};

/**
 * Resolves all {{variableName}} and {{variableName.field.path}} placeholders
 * in a content string using global API variables.
 *
 * All resolved external API values are sanitized to prevent stored XSS
 * (e.g., a Jira/ServiceNow description containing <script> or onerror attrs).
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
      const value = getNestedValue(data, fieldPath);
      if (value === null || value === undefined) return match;
      return toSafeString(value);
    }

    return toSafeString(data);
  });
};

/**
 * Same as resolveGlobalApiVariables but also resolves Thymeleaf-style
 * <span th:utext="${varName.field}"/> tags. All resolved values are sanitized.
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
        return toSafeString(value);
      }

      return toSafeString(data);
    }
  );

  // Then resolve {{placeholder}} patterns
  resolved = resolveGlobalApiVariables(resolved, globalApiConfig);

  return resolved;
};
