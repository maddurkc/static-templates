import { Section } from "@/types/section";
import { ApiMapping } from "@/types/api-config";
import { generateTableHTML, TableData } from "./tableUtils";

export const renderSectionContent = (section: Section): string => {
  let content = section.content;
  
  // Handle table sections specially
  if (section.type === 'table' && section.variables?.tableData) {
    return generateTableHTML(section.variables.tableData as TableData);
  }
  
  if (!section.variables) {
    return content;
  }

  // Replace all variables in the content
  Object.entries(section.variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    
    if (Array.isArray(value)) {
      // For list variables, generate <li> tags
      const listItems = value.map(item => `<li>${item}</li>`).join('');
      content = content.replace(placeholder, listItems);
    } else if (typeof value === 'object' && value !== null) {
      // Skip complex objects like table data
      return;
    } else {
      // For text/url variables, replace directly
      content = content.replace(new RegExp(placeholder, 'g'), value as string);
    }
  });

  return content;
};

// Extract value from API response using JSONPath-like syntax
export const extractApiValue = (data: any, path: string): any => {
  if (!path) return data;
  
  // Simple JSONPath implementation
  // Supports: data.items, data[0], data.items[0].name
  const parts = path.split('.').flatMap(part => {
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      return [arrayMatch[1], parseInt(arrayMatch[2])];
    }
    return part;
  });
  
  let result = data;
  for (const part of parts) {
    if (result === null || result === undefined) return null;
    result = result[part];
  }
  
  return result;
};

// Apply API data to section based on mapping
export const applyApiDataToSection = (
  section: Section,
  apiData: any,
  mapping: ApiMapping
): Section => {
  const extractedData = extractApiValue(apiData, mapping.apiPath);
  
  if (!extractedData) return section;

  const updatedSection = { ...section };

  switch (mapping.dataType) {
    case 'list':
      if (Array.isArray(extractedData)) {
        if (mapping.variableName) {
          // Update specific variable
          updatedSection.variables = {
            ...updatedSection.variables,
            [mapping.variableName]: extractedData.map(item => 
              typeof item === 'string' ? item : JSON.stringify(item)
            )
          };
        } else {
          // Replace content with list
          const listItems = extractedData.map(item => `<li>${item}</li>`).join('');
          updatedSection.content = `<ul>${listItems}</ul>`;
        }
      }
      break;

    case 'html':
      if (mapping.variableName) {
        updatedSection.variables = {
          ...updatedSection.variables,
          [mapping.variableName]: String(extractedData)
        };
      } else {
        updatedSection.content = String(extractedData);
      }
      break;

    case 'text':
    default:
      if (mapping.variableName) {
        updatedSection.variables = {
          ...updatedSection.variables,
          [mapping.variableName]: String(extractedData)
        };
      } else {
        updatedSection.content = String(extractedData);
      }
      break;
  }

  return updatedSection;
};
