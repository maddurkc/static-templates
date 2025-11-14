import { Section } from "@/types/section";
import { ApiMapping } from "@/types/api-config";
import { generateTableHTML, TableData } from "./tableUtils";
import { sanitizeHTML, sanitizeInput } from "./sanitize";

export const renderSectionContent = (section: Section, variables?: Record<string, string | string[]>): string => {
  let content = section.content;
  
  // Handle labeled-content sections
  if (section.type === 'labeled-content') {
    const label = section.variables?.label || 'Label';
    const contentType = section.variables?.contentType || 'text';
    
    let contentHtml = '';
    
    // Check if we have runtime variables (from RunTemplates)
    if (variables && variables[label] !== undefined) {
      const runtimeValue = variables[label];
      if (contentType === 'list' && Array.isArray(runtimeValue)) {
        contentHtml = '<ul style="list-style-type: circle; margin-left: 20px;">' + 
          runtimeValue.map(item => `<li>${sanitizeInput(item)}</li>`).join('') + 
          '</ul>';
      } else if (typeof runtimeValue === 'string') {
        contentHtml = `<div style="white-space: pre-wrap;">${sanitizeInput(runtimeValue)}</div>`;
      }
    } else {
      // Use default values from section variables
      if (contentType === 'table') {
        const tableData = section.variables?.tableData as TableData;
        if (tableData) {
          contentHtml = generateTableHTML(tableData);
        }
      } else if (contentType === 'list') {
        const items = (section.variables?.items as string[]) || [];
        contentHtml = '<ul style="list-style-type: circle; margin-left: 20px;">' + 
          items.map(item => `<li>${sanitizeInput(item)}</li>`).join('') + 
          '</ul>';
      } else {
        const content = (section.variables?.content as string) || '';
        contentHtml = `<div style="white-space: pre-wrap;">${sanitizeInput(content)}</div>`;
      }
    }
    
    return `<div style="margin: 15px 0;">
      <div style="font-weight: bold; margin-bottom: 8px; font-size: 1.1em;">${sanitizeInput(label)}</div>
      ${contentHtml}
    </div>`;
  }
  
  // Handle table sections specially
  if (section.type === 'table' && section.variables?.tableData) {
    return generateTableHTML(section.variables.tableData as TableData);
  }
  
  // Handle static-text sections - use content variable directly
  if (section.type === 'static-text' && section.variables?.content) {
    return `<div style="margin: 10px 0; padding: 8px; line-height: 1.6;">${sanitizeHTML(section.variables.content as string).replace(/\n/g, '<br/>')}</div>`;
  }
  
  // Handle mixed-content sections - free-form text with embedded placeholders
  if (section.type === 'mixed-content' && section.variables?.content) {
    let mixedContent = section.variables.content as string;
    // Replace all {{placeholder}} patterns with sanitized values or keep them
    mixedContent = mixedContent.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (section.variables && section.variables[varName]) {
        return sanitizeHTML(section.variables[varName] as string);
      }
      return match; // Keep placeholder if no value
    });
    return `<div style="margin: 10px 0; padding: 8px; line-height: 1.6;">${sanitizeHTML(mixedContent).replace(/\n/g, '<br/>')}</div>`;
  }
  
  // Handle line-break sections
  if (section.type === 'line-break') {
    return '<br/>';
  }
  
  // Handle container sections with nested children
  if (section.type === 'container' && section.children && section.children.length > 0) {
    const childrenHTML = section.children.map(child => renderSectionContent(child, variables)).join('');
    return `<div style="margin: 15px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;">${childrenHTML}</div>`;
  }
  
  if (!section.variables) {
    return sanitizeHTML(content);
  }

  // Replace all variables in the content
  Object.entries(section.variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    
    if (Array.isArray(value)) {
      // For list variables, generate <li> tags
      const listItems = value.map(item => `<li>${sanitizeHTML(item)}</li>`).join('');
      content = content.replace(placeholder, listItems);
    } else if (typeof value === 'object' && value !== null) {
      // Skip complex objects like table data
      return;
    } else {
      // For text/url variables, replace directly
      content = content.replace(new RegExp(placeholder, 'g'), sanitizeHTML(value as string));
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
      let htmlContent = '';
      if (typeof extractedData === 'object' && extractedData !== null) {
        // Convert object to formatted HTML
        if ('street' in extractedData && 'city' in extractedData) {
          // Special handling for address objects
          htmlContent = `
            <div style="padding: 15px; background: #f0f0f0; border-radius: 8px; margin: 10px 0;">
              <p><strong>Street:</strong> ${extractedData.street || 'N/A'}</p>
              <p><strong>Suite:</strong> ${extractedData.suite || 'N/A'}</p>
              <p><strong>City:</strong> ${extractedData.city || 'N/A'}</p>
              <p><strong>Zipcode:</strong> ${extractedData.zipcode || 'N/A'}</p>
            </div>
          `;
        } else {
          // Generic object to HTML conversion
          htmlContent = '<div>' + 
            Object.entries(extractedData)
              .map(([key, val]) => `<p><strong>${key}:</strong> ${val}</p>`)
              .join('') + 
            '</div>';
        }
      } else {
        htmlContent = String(extractedData);
      }
      
      if (mapping.variableName) {
        updatedSection.variables = {
          ...updatedSection.variables,
          [mapping.variableName]: htmlContent
        };
      } else {
        updatedSection.content = htmlContent;
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
