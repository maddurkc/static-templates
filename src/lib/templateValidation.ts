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
export const validateSubject = (subject: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!subject.trim()) {
    errors.push({
      field: 'templateSubject',
      message: 'Email subject is required'
    });
    return errors;
  }
  
  if (subject.length > 200) {
    errors.push({
      field: 'templateSubject',
      message: 'Subject must be less than 200 characters'
    });
  }
  
  // Check for unclosed placeholders
  const openCount = (subject.match(/\{\{/g) || []).length;
  const closeCount = (subject.match(/\}\}/g) || []).length;
  
  if (openCount !== closeCount) {
    errors.push({
      field: 'templateSubject',
      message: 'Subject has unclosed placeholder brackets'
    });
  }
  
  // Check for empty placeholders {{}}
  if (/\{\{\s*\}\}/.test(subject)) {
    errors.push({
      field: 'templateSubject',
      message: 'Subject has empty placeholder brackets'
    });
  }

  // Check for reserved system variable names in subject placeholders
  const subjectPlaceholders = extractPlaceholders(subject);
  for (const placeholder of subjectPlaceholders) {
    const nameError = validatePlaceholderName(placeholder);
    if (nameError) {
      errors.push({
        field: 'templateSubject',
        message: `Subject placeholder "{{${placeholder}}}" is a reserved system variable. Reserved names: ${SYSTEM_VARIABLE_NAMES.join(', ')}`
      });
    }
  }
  
  return errors;
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

// System-generated variable patterns that should be excluded from "empty value" validation
const SYSTEM_VARIABLE_PATTERNS = [
  /^label_/, /^content_/, /^heading\d?Text_/, /^dateValue_/,
  /^items_/, /^ctaText_/, /^ctaUrl_/, /^programNameText$/,
  /^text_/, /^paragraph_/, /^textContent_/, /^paragraphContent_/,
  /^companyName$/, /^tagline$/, /^year$/, /^contactEmail$/,
  /^labelVariableName$/, /^textVariableName$/, /^listVariableName$/,
  /^contentType$/, /^listStyle$/, /^listHtml$/, /^tableData$/,
  /^isStatic$/, /^apiVariable$/
];

// Human-readable list of reserved system variable prefixes/names for error messages
export const SYSTEM_VARIABLE_NAMES: string[] = [
  'label_*', 'content_*', 'headingText_*', 'dateValue_*',
  'items_*', 'ctaText_*', 'ctaUrl_*', 'programNameText',
  'text_*', 'paragraph_*', 'textContent_*', 'paragraphContent_*',
  'companyName', 'tagline', 'year', 'contactEmail',
  'labelVariableName', 'textVariableName', 'listVariableName',
  'contentType', 'listStyle', 'listHtml', 'tableData',
  'isStatic', 'apiVariable'
];

const isSystemVariable = (varName: string): boolean => {
  return SYSTEM_VARIABLE_PATTERNS.some(pattern => pattern.test(varName));
};

// Validate that a placeholder name is not a reserved system variable
export const validatePlaceholderName = (varName: string): ValidationError | null => {
  if (isSystemVariable(varName)) {
    return {
      field: 'placeholderName',
      message: `"{{${varName}}}" is a reserved system variable and cannot be used as a placeholder. Reserved names: ${SYSTEM_VARIABLE_NAMES.join(', ')}`
    };
  }
  return null;
};

// Validate section placeholders against defined variables
export const validateSectionPlaceholders = (section: Section): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Skip static sections
  if (section.type === 'header' || section.type === 'footer') {
    return errors;
  }
  
  const sectionName = getSectionDisplayName(section);
  
  // Helper: check if placeholder uses a reserved system variable name
  const checkReservedName = (placeholder: string): boolean => {
    if (isSystemVariable(placeholder)) {
      errors.push({
        field: 'sectionVariable',
        message: `In "${sectionName}": "{{${placeholder}}}" is a reserved system variable and cannot be used as a placeholder. Reserved names: ${SYSTEM_VARIABLE_NAMES.join(', ')}`,
        sectionId: section.id,
        sectionType: section.type
      });
      return true;
    }
    return false;
  };
  
  // Get defined variables (excluding system/metadata variables)
  const definedVars = Object.keys(section.variables || {});
  
  // For labeled-content sections, handle specially
  if (section.type === 'labeled-content') {
    const contentType = section.variables?.contentType as string;
    
    // For text content type, extract placeholders from the actual text content
    if (contentType === 'text') {
      const textVariableName = section.variables?.textVariableName as string;
      const textContent = textVariableName 
        ? (section.variables?.[textVariableName] as string) || ''
        : (section.variables?.content as string) || '';
      
      const textPlaceholders = extractPlaceholders(textContent);
      
      // Check if manual placeholders have default values
      for (const placeholder of textPlaceholders) {
        // Skip if it's the textVariableName itself
        if (placeholder === textVariableName) continue;
        
        // Check reserved name first
        if (checkReservedName(placeholder)) continue;
        
        if (!definedVars.includes(placeholder) || 
            (section.variables?.[placeholder] === '' || 
             section.variables?.[placeholder] === undefined || 
             section.variables?.[placeholder] === null)) {
          errors.push({
            field: 'sectionVariable',
            message: `In "${sectionName}": Placeholder "{{${placeholder}}}" has no default value`,
            sectionId: section.id,
            sectionType: section.type
          });
        }
      }
    }
    
    // For list content type, extract placeholders from list items
    if (contentType === 'list') {
      const items = section.variables?.items as any[];
      if (items && Array.isArray(items)) {
        const extractItemPlaceholders = (itemList: any[]): string[] => {
          const placeholders: string[] = [];
          for (const item of itemList) {
            const itemText = typeof item === 'object' ? item.text : item;
            if (typeof itemText === 'string') {
              placeholders.push(...extractPlaceholders(itemText));
            }
            if (item.children && Array.isArray(item.children)) {
              placeholders.push(...extractItemPlaceholders(item.children));
            }
          }
          return placeholders;
        };
        
        const listPlaceholders = extractItemPlaceholders(items);
        for (const placeholder of listPlaceholders) {
          // Check reserved name first
          if (checkReservedName(placeholder)) continue;
          
          if (!definedVars.includes(placeholder) ||
              (section.variables?.[placeholder] === '' ||
               section.variables?.[placeholder] === undefined ||
               section.variables?.[placeholder] === null)) {
            errors.push({
              field: 'sectionVariable',
              message: `In "${sectionName}": List placeholder "{{${placeholder}}}" has no default value`,
              sectionId: section.id,
              sectionType: section.type
            });
          }
        }
      }
    }
    
    // Check label placeholders
    const labelVariableName = section.variables?.labelVariableName as string;
    const labelContent = labelVariableName
      ? (section.variables?.[labelVariableName] as string) || ''
      : (section.variables?.label as string) || '';
    
    const labelPlaceholders = extractPlaceholders(labelContent);
    for (const placeholder of labelPlaceholders) {
      // Skip the labelVariableName itself
      if (placeholder === labelVariableName) continue;
      
      // Check reserved name first
      if (checkReservedName(placeholder)) continue;
      
      if (!definedVars.includes(placeholder) ||
          (section.variables?.[placeholder] === '' ||
           section.variables?.[placeholder] === undefined ||
           section.variables?.[placeholder] === null)) {
        errors.push({
          field: 'sectionVariable',
          message: `In "${sectionName}": Label placeholder "{{${placeholder}}}" has no default value`,
          sectionId: section.id,
          sectionType: section.type
        });
      }
    }
    
    // Skip regular content placeholder check for labeled-content
    // (we already handled it above)
  } else {
    // For non-labeled-content sections, check regular content placeholders
    const contentPlaceholders = extractPlaceholders(section.content || '');
    
    // Check for undefined placeholders in content
    for (const placeholder of contentPlaceholders) {
      // Check reserved name first
      if (checkReservedName(placeholder)) continue;
      
      if (!definedVars.includes(placeholder)) {
        errors.push({
          field: 'sectionContent',
          message: `In "${sectionName}": Placeholder "{{${placeholder}}}" is used but not defined as a variable`,
          sectionId: section.id,
          sectionType: section.type
        });
      }
    }
  }
  
  // Check variables for proper values - only for custom/manual placeholders
  if (section.variables) {
    for (const [varName, varValue] of Object.entries(section.variables)) {
      // Skip system/metadata variables
      if (isSystemVariable(varName)) continue;
      
      // Skip label and content variables (checked above for labeled-content)
      if (['label', 'content', 'items'].includes(varName)) continue;
      
      // For custom placeholders, check if they have values
      // But only flag as error if the variable is actually used in content
      // This check is already done above, so skip here
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
  const subjectErrors = validateSubject(templateSubject);
  errors.push(...subjectErrors);
  
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
