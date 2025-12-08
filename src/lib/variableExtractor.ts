/**
 * Variable Extractor Utility
 * Extracts all placeholders/variables from template sections and subject
 * Creates a centralized registry for the template_variables table
 */

import { Section } from "@/types/section";
import { TemplateVariable } from "@/types/template-variable";

// Extract {{placeholder}} patterns from a string
const extractPlaceholders = (text: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = text.matchAll(regex);
  return Array.from(new Set(Array.from(matches, m => m[1])));
};

// Extract Thymeleaf variable patterns from a string
// Supports: <span th:utext="${var}"/>, <th:block th:utext="${var}"/>, and legacy <th:utext="${var}">
const extractThymeleafVariables = (text: string): string[] => {
  const patterns = [
    /<span\s+th:utext="\$\{(\w+)\}"\/>/g,  // New span format
    /<th:block\s+th:utext="\$\{(\w+)\}"\/>/g,  // Subject block format
    /<th:utext="\$\{(\w+)\}">/g,  // Legacy format
  ];
  
  const allMatches: string[] = [];
  patterns.forEach(regex => {
    const matches = text.matchAll(regex);
    allMatches.push(...Array.from(matches, m => m[1]));
  });
  
  return Array.from(new Set(allMatches));
};

// Infer variable type from context
const inferVariableType = (
  varName: string,
  section?: Section
): TemplateVariable['variableType'] => {
  // Check if it's a list type from section
  if (section?.type === 'labeled-content' && section.variables?.contentType === 'list') {
    return 'list';
  }
  
  // Check if it's a table type
  if (section?.type === 'labeled-content' && section.variables?.contentType === 'table') {
    return 'table';
  }
  
  // Infer from variable name patterns
  const lowerName = varName.toLowerCase();
  if (lowerName.includes('email')) return 'email';
  if (lowerName.includes('date') || lowerName.includes('year')) return 'date';
  if (lowerName.includes('url') || lowerName.includes('link')) return 'url';
  if (lowerName.includes('count') || lowerName.includes('number') || lowerName.includes('amount')) return 'number';
  
  return 'text';
};

// Get default value from section variables
const getDefaultValue = (varName: string, section?: Section): string | null => {
  if (!section?.variables) return null;
  
  const value = section.variables[varName];
  if (value === undefined || value === null) return null;
  
  if (Array.isArray(value)) {
    // For lists, serialize as JSON
    return JSON.stringify(value);
  }
  
  if (typeof value === 'object') {
    // For objects (like table data), serialize as JSON
    return JSON.stringify(value);
  }
  
  return String(value);
};

// Create a human-readable label from variable name
const createLabel = (varName: string): string => {
  return varName
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
    .trim();
};

/**
 * Extract all variables from template subject line
 * Supports both {{placeholder}} and <th:utext="${variable}"> formats
 */
export const extractSubjectVariables = (subject: string): TemplateVariable[] => {
  // Extract from both placeholder and Thymeleaf formats
  const placeholders = extractPlaceholders(subject);
  const thymeleafVars = extractThymeleafVariables(subject);
  
  // Combine and deduplicate
  const allVars = Array.from(new Set([...placeholders, ...thymeleafVars]));
  
  return allVars.map(varName => ({
    variableName: varName,
    variableLabel: createLabel(varName),
    variableType: 'text' as const,
    defaultValue: null,
    isRequired: true, // Subject variables are always required
    source: 'subject' as const,
  }));
};

/**
 * Extract all variables from a single section
 */
export const extractSectionVariables = (
  section: Section,
  source: 'section' | 'header' | 'footer' = 'section'
): TemplateVariable[] => {
  const variables: TemplateVariable[] = [];
  const processedVars = new Set<string>();

  // 1. Extract from section content (both {{placeholder}} and Thymeleaf syntax)
  if (section.content) {
    const placeholders = extractPlaceholders(section.content);
    const thymeleafVars = extractThymeleafVariables(section.content);
    
    [...placeholders, ...thymeleafVars].forEach(varName => {
      if (!processedVars.has(varName)) {
        processedVars.add(varName);
        variables.push({
          variableName: varName,
          variableLabel: createLabel(varName),
          variableType: inferVariableType(varName, section),
          defaultValue: getDefaultValue(varName, section),
          isRequired: false,
          sectionId: section.id,
          source,
        });
      }
    });
  }

  // 2. Extract from section variables (for labeled-content, mixed-content, etc.)
  if (section.variables) {
    // Check label for placeholders (labeled-content)
    if (typeof section.variables.label === 'string') {
      const labelVars = [
        ...extractPlaceholders(section.variables.label),
        ...extractThymeleafVariables(section.variables.label)
      ];
      labelVars.forEach(varName => {
        if (!processedVars.has(varName)) {
          processedVars.add(varName);
          variables.push({
            variableName: varName,
            variableLabel: createLabel(varName),
            variableType: 'text',
            defaultValue: getDefaultValue(varName, section),
            isRequired: false,
            sectionId: section.id,
            source,
          });
        }
      });
    }

    // Check content field for placeholders (mixed-content)
    if (typeof section.variables.content === 'string') {
      const contentVars = [
        ...extractPlaceholders(section.variables.content),
        ...extractThymeleafVariables(section.variables.content)
      ];
      contentVars.forEach(varName => {
        if (!processedVars.has(varName)) {
          processedVars.add(varName);
          variables.push({
            variableName: varName,
            variableLabel: createLabel(varName),
            variableType: 'text',
            defaultValue: getDefaultValue(varName, section),
            isRequired: false,
            sectionId: section.id,
            source,
          });
        }
      });
    }

    // Add variables from section.variables that have actual values
    Object.entries(section.variables).forEach(([key, value]) => {
      // Skip metadata keys
      if (['label', 'content', 'contentType', 'listStyle', 'items', 'tableData'].includes(key)) {
        return;
      }
      
      if (!processedVars.has(key) && value !== undefined && value !== null) {
        processedVars.add(key);
        variables.push({
          variableName: key,
          variableLabel: createLabel(key),
          variableType: inferVariableType(key, section),
          defaultValue: typeof value === 'string' ? value : JSON.stringify(value),
          isRequired: false,
          sectionId: section.id,
          source,
        });
      }
    });
  }

  // 3. Process children recursively (for container sections)
  if (section.children && section.children.length > 0) {
    section.children.forEach(child => {
      const childVars = extractSectionVariables(child, source);
      childVars.forEach(childVar => {
        if (!processedVars.has(childVar.variableName)) {
          processedVars.add(childVar.variableName);
          variables.push(childVar);
        }
      });
    });
  }

  return variables;
};

/**
 * Extract all variables from the entire template
 * Returns a deduplicated list of all variables with their metadata
 */
export const extractAllTemplateVariables = (
  subject: string,
  headerSection: Section,
  sections: Section[],
  footerSection: Section
): TemplateVariable[] => {
  const allVariables: TemplateVariable[] = [];
  const processedVars = new Map<string, TemplateVariable>();

  // 1. Extract from subject (highest priority - always required)
  const subjectVars = extractSubjectVariables(subject);
  subjectVars.forEach(v => {
    processedVars.set(v.variableName, v);
  });

  // 2. Extract from header section
  const headerVars = extractSectionVariables(headerSection, 'header');
  headerVars.forEach(v => {
    if (!processedVars.has(v.variableName)) {
      processedVars.set(v.variableName, v);
    }
  });

  // 3. Extract from all content sections
  sections.forEach(section => {
    const sectionVars = extractSectionVariables(section, 'section');
    sectionVars.forEach(v => {
      if (!processedVars.has(v.variableName)) {
        processedVars.set(v.variableName, v);
      }
    });
  });

  // 4. Extract from footer section
  const footerVars = extractSectionVariables(footerSection, 'footer');
  footerVars.forEach(v => {
    if (!processedVars.has(v.variableName)) {
      processedVars.set(v.variableName, v);
    }
  });

  // Convert map to array and sort by source priority
  const sourceOrder = { subject: 0, header: 1, section: 2, footer: 3 };
  return Array.from(processedVars.values()).sort((a, b) => {
    return sourceOrder[a.source] - sourceOrder[b.source];
  });
};

/**
 * Convert TemplateVariable to API request format
 */
export const variableToRequest = (variable: TemplateVariable): {
  variableName: string;
  variableLabel: string;
  variableType: string;
  defaultValue?: string;
  isRequired: boolean;
  placeholder?: string;
  sectionId?: string;
} => {
  return {
    variableName: variable.variableName,
    variableLabel: variable.variableLabel,
    variableType: variable.variableType,
    defaultValue: variable.defaultValue || undefined,
    isRequired: variable.isRequired,
    placeholder: variable.placeholder,
    sectionId: variable.sectionId,
  };
};
