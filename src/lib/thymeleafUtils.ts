// Utility functions for Thymeleaf tag conversion

/**
 * Convert Thymeleaf tags to user-friendly placeholders for display
 * Supports both old format <th:utext="${var}"> and new format <span th:utext="${var}"/>
 */
export const thymeleafToPlaceholder = (content: string): string => {
  return content
    // New self-closing span format: <span th:utext="${var}"/>
    .replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, '{{$1}}')
    // Old format for backward compatibility: <th:utext="${var}">
    .replace(/<th:utext="\$\{(\w+)\}">/g, '{{$1}}')
    // Conditional blocks
    .replace(/<th:if="\$\{(\w+)\}">/g, '{{if $1}}')
    .replace(/<\/th:if>/g, '{{/if}}')
    // Loop blocks
    .replace(/<th:each="(\w+)\s*:\s*\$\{(\w+)\}">/g, '{{each $1 in $2}}')
    .replace(/<\/th:each>/g, '{{/each}}');
};

/**
 * Convert user-friendly placeholders to Thymeleaf tags
 * Uses <span th:utext="${variableName}"/> format for body content
 */
export const placeholderToThymeleaf = (content: string): string => {
  let result = content;
  
  // First handle structured tags
  result = result
    .replace(/\{\{if\s+(\w+)\}\}/g, '<th:if="${$1}">')
    .replace(/\{\{\/if\}\}/g, '</th:if>')
    .replace(/\{\{each\s+(\w+)\s+in\s+(\w+)\}\}/g, '<th:each="$1 : ${$2}">')
    .replace(/\{\{\/each\}\}/g, '</th:each>');
  
  // Convert simple placeholders to self-closing span Thymeleaf format
  result = result.replace(/\{\{(\w+)\}\}/g, '<span th:utext="${$1}"/>');
  
  return result;
};

/**
 * Convert subject placeholders to Thymeleaf format for storage
 * Uses <th:block th:utext="${variableName}"/> format for subjects
 */
export const subjectPlaceholderToThymeleaf = (subject: string): string => {
  return subject.replace(/\{\{(\w+)\}\}/g, '<th:block th:utext="${$1}"/>');
};

/**
 * Convert subject Thymeleaf tags back to placeholders for display
 * Supports both new th:block format and old format for backward compatibility
 */
export const subjectThymeleafToPlaceholder = (subject: string): string => {
  return subject
    // New th:block format: <th:block th:utext="${var}"/> (with optional space before />)
    .replace(/<th:block\s+th:utext="\$\{(\w+)\}"\s*\/>/g, '{{$1}}')
    // th:block format without self-closing: <th:block th:utext="${var}">
    .replace(/<th:block\s+th:utext="\$\{(\w+)\}">/g, '{{$1}}')
    // Old format for backward compatibility
    .replace(/<th:utext="\$\{(\w+)\}">/g, '{{$1}}');
};

/**
 * Extract variable name from Thymeleaf tag or placeholder
 */
export const extractVariableName = (tag: string): string | null => {
  // Match {{variableName}}
  const placeholderMatch = tag.match(/\{\{(\w+)\}\}/);
  if (placeholderMatch) return placeholderMatch[1];
  
  // Match <span th:utext="${variableName}"/>
  const spanMatch = tag.match(/<span\s+th:utext="\$\{(\w+)\}"\/>/);
  if (spanMatch) return spanMatch[1];
  
  // Match <th:block th:utext="${variableName}"/>
  const blockMatch = tag.match(/<th:block\s+th:utext="\$\{(\w+)\}"\/>/);
  if (blockMatch) return blockMatch[1];
  
  // Match old format <th:utext="${variableName}">
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
      // New span format
      const spanPattern = new RegExp(`<span\\s+th:utext="\\$\\{${key}\\}"/>`, 'g');
      // Old format
      const thymeleafPattern = new RegExp(`<th:utext="\\$\\{${key}\\}">`, 'g');
      const placeholderPattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      
      const displayValue = Array.isArray(value) 
        ? value.join(', ') 
        : String(value);
      
      displayContent = displayContent
        .replace(spanPattern, displayValue)
        .replace(thymeleafPattern, displayValue)
        .replace(placeholderPattern, displayValue);
    });
  }
  
  // Convert remaining Thymeleaf tags to friendly placeholders
  displayContent = thymeleafToPlaceholder(displayContent);
  
  return displayContent;
};

/**
 * Check if a value is empty (null, undefined, empty string, or only whitespace)
 */
const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

/**
 * Replaces Thymeleaf placeholders with actual default values from section variables
 * If no value is provided, shows {{placeholderName}} instead
 */
export const replaceWithDefaults = (content: string, variables?: Array<{ name: string; defaultValue: any }> | Record<string, any>): string => {
  if (!variables) {
    // No variables provided, convert Thymeleaf to {{placeholder}} format
    return thymeleafToPlaceholder(content);
  }

  let result = content;

  // Helper to escape regex special characters
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Handle both array format and object format for variables
  if (Array.isArray(variables)) {
    variables.forEach(variable => {
      // New span format
      const spanPlaceholder = `<span th:utext="\${${variable.name}}"/>`;
      // Old format
      const oldPlaceholder = `<th:utext="\${${variable.name}}">`;
      
      // If value is empty, show {{placeholderName}}
      if (isEmptyValue(variable.defaultValue)) {
        const placeholder = `{{${variable.name}}}`;
        result = result.replace(new RegExp(escapeRegex(spanPlaceholder), 'g'), placeholder);
        result = result.replace(new RegExp(escapeRegex(oldPlaceholder), 'g'), placeholder);
      } else if (Array.isArray(variable.defaultValue)) {
        // For list variables, create actual <li> elements
        const listItems = variable.defaultValue.map(item => `<li>${item}</li>`).join('');
        result = result.replace(spanPlaceholder, listItems);
        result = result.replace(oldPlaceholder, listItems);
      } else {
        // For text variables, just replace with the default value
        result = result.replace(new RegExp(escapeRegex(spanPlaceholder), 'g'), String(variable.defaultValue));
        result = result.replace(new RegExp(escapeRegex(oldPlaceholder), 'g'), String(variable.defaultValue));
      }
    });
  } else {
    // Handle object format (Record<string, any>)
    Object.entries(variables).forEach(([key, value]) => {
      const spanPlaceholder = `<span th:utext="\${${key}}"/>`;
      const oldPlaceholder = `<th:utext="\${${key}}">`;
      
      // If value is empty, show {{placeholderName}}
      if (isEmptyValue(value)) {
        const placeholder = `{{${key}}}`;
        result = result.replace(new RegExp(escapeRegex(spanPlaceholder), 'g'), placeholder);
        result = result.replace(new RegExp(escapeRegex(oldPlaceholder), 'g'), placeholder);
      } else if (Array.isArray(value)) {
        const listItems = value.map(item => `<li>${item}</li>`).join('');
        result = result.replace(spanPlaceholder, listItems);
        result = result.replace(oldPlaceholder, listItems);
      } else {
        result = result.replace(new RegExp(escapeRegex(spanPlaceholder), 'g'), String(value));
        result = result.replace(new RegExp(escapeRegex(oldPlaceholder), 'g'), String(value));
      }
    });
  }

  // Convert any remaining Thymeleaf tags to {{placeholder}} format
  result = thymeleafToPlaceholder(result);

  return result;
};

/**
 * Process subject for display - replaces Thymeleaf tags with provided values
 */
export const processSubjectWithValues = (subject: string, values: Record<string, string>): string => {
  let result = subject;
  
  Object.entries(values).forEach(([key, value]) => {
    // New th:block format for subjects
    const blockPattern = new RegExp(`<th:block\\s+th:utext="\\$\\{${key}\\}"/>`, 'g');
    // Old format
    const thymeleafPattern = new RegExp(`<th:utext="\\$\\{${key}\\}">`, 'g');
    const placeholderPattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    
    result = result.replace(blockPattern, value);
    result = result.replace(thymeleafPattern, value);
    result = result.replace(placeholderPattern, value);
  });
  
  return result;
};
