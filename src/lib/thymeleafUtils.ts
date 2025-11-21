// Utility functions for Thymeleaf tag conversion

/**
 * Convert Thymeleaf tags to user-friendly placeholders for display
 * Example: <th:utext="${title}"> -> {{title}}
 */
export const thymeleafToPlaceholder = (content: string): string => {
  return content
    .replace(/<th:utext="\$\{(\w+)\}">/g, '{{$1}}')
    .replace(/<th:if="\$\{(\w+)\}">/g, '{{if $1}}')
    .replace(/<\/th:if>/g, '{{/if}}')
    .replace(/<th:each="(\w+)\s*:\s*\$\{(\w+)\}">/g, '{{each $1 in $2}}')
    .replace(/<\/th:each>/g, '{{/each}}');
};

/**
 * Convert user-friendly placeholders to Thymeleaf tags
 * Example: {{title}} -> <th:utext="${title}">
 */
export const placeholderToThymeleaf = (content: string): string => {
  return content
    .replace(/\{\{if\s+(\w+)\}\}/g, '<th:if="${$1}">')
    .replace(/\{\{\/if\}\}/g, '</th:if>')
    .replace(/\{\{each\s+(\w+)\s+in\s+(\w+)\}\}/g, '<th:each="$1 : ${$2}">')
    .replace(/\{\{\/each\}\}/g, '</th:each>')
    .replace(/\{\{(\w+)\}\}/g, '<th:utext="${$1}">');
};

/**
 * Extract variable name from Thymeleaf tag or placeholder
 */
export const extractVariableName = (tag: string): string | null => {
  // Match {{variableName}}
  const placeholderMatch = tag.match(/\{\{(\w+)\}\}/);
  if (placeholderMatch) return placeholderMatch[1];
  
  // Match <th:utext="${variableName}">
  const thymeleafMatch = tag.match(/<th:utext="\$\{(\w+)\}">/);
  if (thymeleafMatch) return thymeleafMatch[1];
  
  return null;
};

/**
 * Get display-friendly content for preview (shows placeholders instead of raw Thymeleaf)
 */
export const getDisplayContent = (content: string, variables?: Record<string, any>): string => {
  let displayContent = content;
  
  // If variables exist, replace with actual values
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      const thymeleafPattern = new RegExp(`<th:utext="\\$\\{${key}\\}">`, 'g');
      const placeholderPattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      
      const displayValue = Array.isArray(value) 
        ? value.join(', ') 
        : String(value);
      
      displayContent = displayContent
        .replace(thymeleafPattern, displayValue)
        .replace(placeholderPattern, displayValue);
    });
  }
  
  // Convert remaining Thymeleaf tags to friendly placeholders
  displayContent = thymeleafToPlaceholder(displayContent);
  
  return displayContent;
};
