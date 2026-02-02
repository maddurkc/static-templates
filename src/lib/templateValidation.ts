import { Section } from "@/types/section";
import { isValidListVariableName } from "@/lib/listThymeleafUtils";

// Section types that can only appear once per template
export const SINGLE_USE_SECTION_TYPES = ['program-name', 'banner'] as const;

export interface ValidationError {
  field: string;
  message: string;
  sectionId?: string;
  sectionType?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Extract all {{placeholder}} patterns from a string
export const extractPlaceholders = (text: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    placeholders.push(match[1]);
  }
  return [...new Set(placeholders)]; // Remove duplicates
};

// Validate template name
export const validateTemplateName = (name: string): ValidationError | null => {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return {
      field: 'templateName',
      message: 'Template name is required'
    };
  }
  
  if (trimmedName.length < 3) {
    return {
      field: 'templateName',
      message: 'Template name must be at least 3 characters'
    };
  }
  
  if (trimmedName.length > 100) {
    return {
      field: 'templateName',
      message: 'Template name must be less than 100 characters'
    };
  }
  
  // Check for valid characters (alphanumeric, spaces, hyphens, underscores)
  const validNameRegex = /^[\w\s\-_.()]+$/;
  if (!validNameRegex.test(trimmedName)) {
    return {
      field: 'templateName',
      message: 'Template name contains invalid characters'
    };
  }
  
  return null;
};

// Validate subject line
export const validateSubject = (subject: string): ValidationError | null => {
  if (!subject.trim()) {
    return {
      field: 'templateSubject',
      message: 'Email subject is required'
    };
  }
  
  if (subject.length > 200) {
    return {
      field: 'templateSubject',
      message: 'Subject must be less than 200 characters'
    };
  }
  
  // Check for unclosed placeholders
  const openCount = (subject.match(/\{\{/g) || []).length;
  const closeCount = (subject.match(/\}\}/g) || []).length;
  
  if (openCount !== closeCount) {
    return {
      field: 'templateSubject',
      message: 'Subject has unclosed placeholder brackets'
    };
  }
  
  // Check for empty placeholders {{}}
  if (/\{\{\s*\}\}/.test(subject)) {
    return {
      field: 'templateSubject',
      message: 'Subject has empty placeholder brackets'
    };
  }
  
  return null;
};

// Get human-readable section name
const getSectionDisplayName = (section: Section): string => {
  const typeNames: Record<string, string> = {
    'heading1': 'Heading 1',
    'heading2': 'Heading 2',
    'heading3': 'Heading 3',
    'heading4': 'Heading 4',
    'heading5': 'Heading 5',
    'heading6': 'Heading 6',
    'text': 'Text',
    'paragraph': 'Paragraph',
    'table': 'Table',
    'bullet-list-circle': 'Bullet List (Circle)',
    'bullet-list-disc': 'Bullet List (Disc)',
    'bullet-list-square': 'Bullet List (Square)',
    'number-list-1': 'Numbered List',
    'number-list-i': 'Roman Numeral List',
    'number-list-a': 'Alphabetic List',
    'image': 'Image',
    'link': 'Link',
    'button': 'Button',
    'container': 'Container',
    'labeled-content': 'Labeled Content',
    'mixed-content': 'Mixed Content',
  };
  
  const typeName = typeNames[section.type] || section.type;
  
  // Try to get a preview of the content for identification
  let contentPreview = '';
  if (section.content) {
    // Remove HTML tags and get first 30 chars
    const textContent = section.content.replace(/<[^>]*>/g, '').replace(/\{\{[^}]+\}\}/g, '...').trim();
    if (textContent && textContent.length > 0) {
      contentPreview = textContent.substring(0, 25);
      if (textContent.length > 25) contentPreview += '...';
    }
  }
  
  // Try to get label from variables
  if (section.variables?.label) {
    contentPreview = String(section.variables.label).substring(0, 25);
  }
  
  return contentPreview ? `${typeName}: "${contentPreview}"` : typeName;
};

// Validate section placeholders against defined variables
export const validateSectionPlaceholders = (section: Section): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Skip static sections
  if (section.type === 'header' || section.type === 'footer') {
    return errors;
  }
  
  const sectionName = getSectionDisplayName(section);
  
  // Get defined variables
  const definedVars = Object.keys(section.variables || {});
  
  // Extract placeholders from content
  const contentPlaceholders = extractPlaceholders(section.content || '');
  
  // Check for undefined placeholders in content
  for (const placeholder of contentPlaceholders) {
    if (!definedVars.includes(placeholder)) {
      errors.push({
        field: 'sectionContent',
        message: `In "${sectionName}": Placeholder "{{${placeholder}}}" is used but not defined as a variable`,
        sectionId: section.id,
        sectionType: section.type
      });
    }
  }
  
  // Check variables for proper values
  if (section.variables) {
    for (const [varName, varValue] of Object.entries(section.variables)) {
      // Skip non-essential variables
      if (['label', 'contentType', 'listStyle'].includes(varName)) continue;
      
      // Check for empty required values
      if (varValue === '' || varValue === undefined || varValue === null) {
        errors.push({
          field: 'sectionVariable',
          message: `In "${sectionName}": Variable "${varName}" has no default value`,
          sectionId: section.id,
          sectionType: section.type
        });
      }
      
      // For arrays, check if they're empty
      if (Array.isArray(varValue) && varValue.length === 0) {
        errors.push({
          field: 'sectionVariable',
          message: `In "${sectionName}": Variable "${varName}" list is empty`,
          sectionId: section.id,
          sectionType: section.type
        });
      }
    }
  }
  
  // Validate nested children
  if (section.children) {
    for (const child of section.children) {
      errors.push(...validateSectionPlaceholders(child));
    }
  }
  
  return errors;
};

// Validate all sections
export const validateSections = (sections: Section[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Check if there are any user sections (excluding header/footer)
  const userSections = sections.filter(s => s.type !== 'header' && s.type !== 'footer');
  
  if (userSections.length === 0) {
    errors.push({
      field: 'sections',
      message: 'Template must have at least one content section'
    });
  }
  
  // Validate single-use sections (program-name, banner) - only one of each allowed
  const countSectionTypes = (sectionList: Section[], counts: Record<string, number> = {}): Record<string, number> => {
    for (const section of sectionList) {
      counts[section.type] = (counts[section.type] || 0) + 1;
      if (section.children) {
        countSectionTypes(section.children, counts);
      }
    }
    return counts;
  };
  
  const sectionCounts = countSectionTypes(sections);
  
  for (const sectionType of SINGLE_USE_SECTION_TYPES) {
    const count = sectionCounts[sectionType] || 0;
    if (count > 1) {
      const typeLabel = sectionType === 'program-name' ? 'Program Name' : 'Banner';
      errors.push({
        field: 'sections',
        message: `Only one ${typeLabel} section is allowed per template (found ${count})`
      });
    }
  }
  
  // Validate each section
  for (const section of sections) {
    const sectionName = getSectionDisplayName(section);
    
    // Check for empty content in content-bearing sections
    const contentTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
    if (contentTypes.includes(section.type)) {
      if (!section.content || section.content.trim() === '') {
        errors.push({
          field: 'sectionContent',
          message: `"${sectionName}" section has no content`,
          sectionId: section.id,
          sectionType: section.type
        });
      }
    }
    
    // Validate placeholders
    errors.push(...validateSectionPlaceholders(section));
    
    // Validate table sections
    if (section.type === 'table' && section.variables?.tableData) {
      const tableData = section.variables.tableData;
      if (Array.isArray(tableData) && tableData.length === 0) {
        errors.push({
          field: 'sectionContent',
          message: `"${sectionName}" has no data rows`,
          sectionId: section.id,
          sectionType: section.type
        });
      }
    }
    
    // Validate list sections
    const listTypes = ['bullet-list-circle', 'bullet-list-disc', 'bullet-list-square', 'number-list-1', 'number-list-i', 'number-list-a'];
    if (listTypes.includes(section.type) && section.variables?.items) {
      const items = section.variables.items;
      if (Array.isArray(items) && items.length === 0) {
        errors.push({
          field: 'sectionContent',
          message: `"${sectionName}" has no items`,
          sectionId: section.id,
          sectionType: section.type
        });
      }
    }
    
    // Validate labeled-content sections have valid variable names
    if (section.type === 'labeled-content') {
      // Validate listVariableName for list content type
      if (section.variables?.contentType === 'list') {
        const listVariableName = section.variables?.listVariableName as string;
        
        if (!listVariableName) {
          errors.push({
            field: 'sectionVariable',
            message: `"${sectionName}" list section is missing a variable name`,
            sectionId: section.id,
            sectionType: section.type
          });
        } else if (!isValidListVariableName(listVariableName)) {
          errors.push({
            field: 'sectionVariable',
            message: `"${sectionName}" has invalid list variable name "${listVariableName}". Must contain only letters, numbers, and underscores.`,
            sectionId: section.id,
            sectionType: section.type
          });
        }
      }
    }
  }
  
  return errors;
};

// Main validation function
export const validateTemplate = (
  templateName: string,
  templateSubject: string,
  sections: Section[]
): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Validate name
  const nameError = validateTemplateName(templateName);
  if (nameError) errors.push(nameError);
  
  // Validate subject
  const subjectError = validateSubject(templateSubject);
  if (subjectError) errors.push(subjectError);
  
  // Validate sections
  errors.push(...validateSections(sections));
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Format errors for display
export const formatValidationErrors = (errors: ValidationError[]): string => {
  if (errors.length === 0) return '';
  
  const grouped: Record<string, ValidationError[]> = {};
  
  for (const error of errors) {
    const key = error.sectionId ? `Section: ${error.sectionType}` : 'General';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(error);
  }
  
  const parts: string[] = [];
  for (const [group, groupErrors] of Object.entries(grouped)) {
    if (group === 'General') {
      parts.push(...groupErrors.map(e => `• ${e.message}`));
    } else {
      parts.push(`${group}:`);
      parts.push(...groupErrors.map(e => `  • ${e.message}`));
    }
  }
  
  return parts.join('\n');
};
