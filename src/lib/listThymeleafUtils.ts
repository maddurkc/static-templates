/**
 * Utility functions for generating Thymeleaf list syntax
 * Handles unique variable names and proper th:each generation
 */

// List styles that use <ul> tag
const BULLET_STYLES = ['circle', 'disc', 'square'];

// List styles that use <ol> tag  
const ORDERED_STYLES = ['decimal', 'lower-roman', 'upper-roman', 'lower-alpha', 'upper-alpha'];

/**
 * Generate a unique list variable name based on section ID
 * Creates a valid Thymeleaf variable name (only letters, numbers, underscores)
 */
export const generateListVariableName = (sectionId: string): string => {
  // Remove all invalid characters (only keep letters, numbers, and underscores)
  // Thymeleaf variable names cannot contain hyphens or other special characters
  const cleanId = sectionId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const shortId = cleanId.slice(-8); // Take last 8 chars for uniqueness
  return `items_${shortId}`;
};

/**
 * Generate a unique label variable name based on section ID
 * Creates a valid Thymeleaf variable name (only letters, numbers, underscores)
 */
export const generateLabelVariableName = (sectionId: string): string => {
  // Remove all invalid characters (only keep letters, numbers)
  // Then replace with underscores as separator
  const cleanId = sectionId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const shortId = cleanId.slice(-12); // Take last 12 chars for uniqueness
  return `label_${shortId}`;
};

/**
 * Validate a list variable name for Thymeleaf compatibility
 * Must start with a letter or underscore, contain only letters, numbers, underscores
 */
export const isValidListVariableName = (name: string): boolean => {
  if (!name || name.trim().length === 0) return false;
  // Must start with letter or underscore, only contain alphanumeric and underscores
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
};

/**
 * Sanitize a custom variable name to be Thymeleaf-compatible
 */
export const sanitizeVariableName = (name: string): string => {
  // Replace hyphens with underscores, remove other invalid characters
  let sanitized = name.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  // Ensure it starts with a letter or underscore
  if (sanitized.length > 0 && /^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  return sanitized.toLowerCase();
};

/**
 * Get the appropriate list tag (ul or ol) based on list style
 */
export const getListTag = (listStyle: string): 'ul' | 'ol' => {
  if (ORDERED_STYLES.includes(listStyle)) {
    return 'ol';
  }
  return 'ul';
};

/**
 * Get CSS list-style-type value from list style
 */
export const getListStyleType = (listStyle: string): string => {
  // Map common style names to CSS values
  const styleMap: Record<string, string> = {
    'circle': 'circle',
    'disc': 'disc',
    'square': 'square',
    'decimal': 'decimal',
    'lower-roman': 'lower-roman',
    'upper-roman': 'upper-roman',
    'lower-alpha': 'lower-alpha',
    'upper-alpha': 'upper-alpha',
    '1': 'decimal',
    'i': 'lower-roman',
    'I': 'upper-roman',
    'a': 'lower-alpha',
    'A': 'upper-alpha',
  };
  
  return styleMap[listStyle] || 'disc';
};

/**
 * Generate Thymeleaf list HTML with th:each syntax
 * 
 * @param variableName - The variable name for the items (e.g., "items_abc123")
 * @param listStyle - The list style (circle, disc, decimal, etc.)
 * @returns Thymeleaf HTML template for the list
 * 
 * Example output:
 * <ul style="list-style-type: circle;">
 *   <li th:each="item : ${items_abc123}"><span th:utext="${item}"/></li>
 * </ul>
 */
export const generateThymeleafListHtml = (
  variableName: string,
  listStyle: string = 'circle'
): string => {
  const tag = getListTag(listStyle);
  const styleType = getListStyleType(listStyle);
  
  return `<${tag} style="list-style-type: ${styleType};">` +
    `<li th:each="item : \${${variableName}}"><span th:utext="\${item}"/></li>` +
    `</${tag}>`;
};

/**
 * Generate Thymeleaf list HTML for nested lists with styling support
 * This version supports ListItemStyle objects with styling properties
 * 
 * @param variableName - The variable name for the items
 * @param listStyle - The list style
 * @returns Thymeleaf HTML template with styling support
 */
export const generateThymeleafNestedListHtml = (
  variableName: string,
  listStyle: string = 'circle'
): string => {
  const tag = getListTag(listStyle);
  const styleType = getListStyleType(listStyle);
  
  // For nested lists, we generate a simpler structure that the backend can expand
  // The backend will handle the full nested rendering with styles
  return `<${tag} style="list-style-type: ${styleType};" th:with="listItems=\${${variableName}}">` +
    `<li th:each="item : \${listItems}" th:styleappend="\${item.styles}"><span th:utext="\${item.text}"/>` +
    `<${tag} th:if="\${item.children != null and !item.children.isEmpty()}" style="list-style-type: ${styleType}; margin-left: 20px;">` +
    `<li th:each="child : \${item.children}" th:styleappend="\${child.styles}"><span th:utext="\${child.text}"/></li>` +
    `</${tag}>` +
    `</li>` +
    `</${tag}>`;
};

/**
 * Parse list variable name from Thymeleaf list HTML
 * @param html - The Thymeleaf HTML containing th:each
 * @returns The variable name or null if not found
 */
export const parseListVariableName = (html: string): string | null => {
  // Match patterns like th:each="item : ${variableName}" or th:with="listItems=${variableName}"
  const eachMatch = html.match(/th:each="[^"]*\s*:\s*\$\{([^}]+)\}"/);
  if (eachMatch) {
    return eachMatch[1];
  }
  
  const withMatch = html.match(/th:with="[^"]*=\$\{([^}]+)\}"/);
  if (withMatch) {
    return withMatch[1];
  }
  
  return null;
};

/**
 * Check if the content contains Thymeleaf list syntax
 */
export const isThymeleafList = (content: string): boolean => {
  return content.includes('th:each=') || 
         (content.includes('th:with=') && content.includes('listItems'));
};
