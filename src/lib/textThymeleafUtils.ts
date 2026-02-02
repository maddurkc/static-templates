/**
 * Utility functions for generating dynamic Thymeleaf variable names for text-based sections
 * (headings, text, paragraphs) - similar to how lists generate unique variable names
 */

/**
 * Generate a unique variable name for heading sections based on section ID
 * Creates a valid Thymeleaf variable name (only letters, numbers, underscores)
 * @param headingLevel - The heading level (1-6)
 * @param sectionId - The unique section ID
 */
export const generateHeadingVariableName = (headingLevel: number, sectionId: string): string => {
  // Remove all invalid characters (only keep letters, numbers, and underscores)
  const cleanId = sectionId.replace(/[^a-zA-Z0-9]/g, '_');
  return `heading${headingLevel}Text_${cleanId}`;
};

/**
 * Generate a unique variable name for text sections based on section ID
 * @param sectionId - The unique section ID
 */
export const generateTextVariableName = (sectionId: string): string => {
  const cleanId = sectionId.replace(/[^a-zA-Z0-9]/g, '_');
  return `textContent_${cleanId}`;
};

/**
 * Generate a unique variable name for paragraph sections based on section ID
 * @param sectionId - The unique section ID
 */
export const generateParagraphVariableName = (sectionId: string): string => {
  const cleanId = sectionId.replace(/[^a-zA-Z0-9]/g, '_');
  return `paragraphContent_${cleanId}`;
};

/**
 * Get the appropriate variable name generator for a section type
 * @param sectionType - The type of section (heading1, text, paragraph, etc.)
 * @param sectionId - The unique section ID
 */
export const generateTextSectionVariableName = (sectionType: string, sectionId: string): string => {
  const cleanId = sectionId.replace(/[^a-zA-Z0-9]/g, '_');
  
  // Handle heading types
  if (sectionType.startsWith('heading')) {
    const level = sectionType.replace('heading', '');
    return `heading${level}Text_${cleanId}`;
  }
  
  // Handle text type
  if (sectionType === 'text') {
    return `textContent_${cleanId}`;
  }
  
  // Handle paragraph type
  if (sectionType === 'paragraph') {
    return `paragraphContent_${cleanId}`;
  }
  
  // Handle static-text type
  if (sectionType === 'static-text') {
    return `staticContent_${cleanId}`;
  }
  
  // Fallback for other types
  return `content_${cleanId}`;
};

/**
 * Check if a section type is a text-based section that should use dynamic variable names
 * Note: 'program-name' is excluded because it's a single-use section with static variable name
 */
export const isTextBasedSection = (sectionType: string): boolean => {
  return [
    'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
    'text', 'paragraph', 'static-text'
  ].includes(sectionType);
};

/**
 * Check if a section uses a static (non-dynamic) variable name
 * These are single-use sections that don't need unique variable suffixes
 */
export const isStaticVariableSection = (sectionType: string): boolean => {
  return ['program-name'].includes(sectionType);
};

/**
 * Parse text variable name from Thymeleaf content
 * @param html - The Thymeleaf HTML containing th:utext
 * @returns The variable name or null if not found
 */
export const parseTextVariableName = (html: string): string | null => {
  // Match patterns like <span th:utext="${variableName}"/>
  const match = html.match(/<span\s+th:utext=\"\$\\{([^}]+)\\}\"(?:\s*\/>|>)/);
  if (match) {
    return match[1];
  }
  
  // Match older format <th:utext="${variableName}">
  const legacyMatch = html.match(/<th:utext=\"\$\\{([^}]+)\\}\">/);
  if (legacyMatch) {
    return legacyMatch[1];
  }
  
  return null;
};

/**
 * Generate Thymeleaf HTML for a text-based section
 * @param variableName - The variable name (e.g., "heading1Text_abc123")
 * @returns Thymeleaf HTML template
 */
export const generateThymeleafTextHtml = (variableName: string): string => {
  return `<span th:utext=\"\$\{${variableName}}\"/>`;
};

/**
 * Get the default variable name pattern for a section type (used for fallback matching)
 */
export const getDefaultVariableNamePattern = (sectionType: string): string => {
  if (sectionType.startsWith('heading')) {
    const level = sectionType.replace('heading', '');
    return `heading${level}Text`;
  }
  if (sectionType === 'text') return 'textContent';
  if (sectionType === 'paragraph') return 'paragraphContent';
  if (sectionType === 'static-text') return 'content';
  return 'content';
};
