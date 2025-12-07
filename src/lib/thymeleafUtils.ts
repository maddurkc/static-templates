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
  // Process inline placeholders within HTML tags (e.g., <h1>Title {{name}}</h1>)
  let result = content;
  
  // First handle structured tags
  result = result
    .replace(/\{\{if\s+(\w+)\}\}/g, '<th:if="${$1}">')
    .replace(/\{\{\/if\}\}/g, '</th:if>')
    .replace(/\{\{each\s+(\w+)\s+in\s+(\w+)\}\}/g, '<th:each="$1 : ${$2}">')
    .replace(/\{\{\/each\}\}/g, '</th:each>');
  
  // Then convert simple placeholders to Thymeleaf
  result = result.replace(/\{\{(\w+)\}\}/g, '<th:utext="${$1}">');
  
  return result;
};

/**
 * Convert subject placeholders to Thymeleaf format for storage
 * This is specifically for email subjects which don't need HTML wrapper tags
 * Example: "Report for {{clientName}}" -> "Report for <th:utext="${clientName}">"
 */
export const subjectPlaceholderToThymeleaf = (subject: string): string => {
  return subject.replace(/\{\{(\w+)\}\}/g, '<th:utext="${$1}">');
};

/**
 * Convert subject Thymeleaf tags back to placeholders for display
 * Example: "Report for <th:utext="${clientName}">" -> "Report for {{clientName}}"
 */
export const subjectThymeleafToPlaceholder = (subject: string): string => {
  return subject.replace(/<th:utext="\$\{(\w+)\}">/g, '{{$1}}');
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

/**
 * Replaces Thymeleaf placeholders with actual default values from section variables
 */
export const replaceWithDefaults = (content: string, variables?: Array<{ name: string; defaultValue: any }> | Record<string, any>): string => {
  if (!variables) {
    return content;
  }

  let result = content;

  // Helper to escape regex special characters
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Handle both array format and object format for variables
  if (Array.isArray(variables)) {
    variables.forEach(variable => {
      const placeholder = `<th:utext="\${${variable.name}}">`;
      
      if (Array.isArray(variable.defaultValue)) {
        // For list variables, create actual <li> elements
        const listItems = variable.defaultValue.map(item => `<li>${item}</li>`).join('');
        result = result.replace(placeholder, listItems);
      } else {
        // For text variables, just replace with the default value
        result = result.replace(new RegExp(escapeRegex(placeholder), 'g'), String(variable.defaultValue));
      }
    });
  } else {
    // Handle object format (Record<string, any>)
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `<th:utext="\${${key}}">`;
      
      if (Array.isArray(value)) {
        const listItems = value.map(item => `<li>${item}</li>`).join('');
        result = result.replace(placeholder, listItems);
      } else {
        result = result.replace(new RegExp(escapeRegex(placeholder), 'g'), String(value));
      }
    });
  }

  return result;
};

/**
 * Process subject for display - replaces Thymeleaf tags with provided values
 */
export const processSubjectWithValues = (subject: string, values: Record<string, string>): string => {
  let result = subject;
  
  Object.entries(values).forEach(([key, value]) => {
    // Replace both Thymeleaf and placeholder formats
    const thymeleafPattern = new RegExp(`<th:utext="\\$\\{${key}\\}">`, 'g');
    const placeholderPattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    
    result = result.replace(thymeleafPattern, value);
    result = result.replace(placeholderPattern, value);
  });
  
  return result;
};
