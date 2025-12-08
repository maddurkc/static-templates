import { Section } from "@/types/section";
import { ApiMapping } from "@/types/api-config";
import { generateTableHTML, TableData } from "./tableUtils";
import { sanitizeHTML, sanitizeInput } from "./sanitize";
import { generateListVariableName, getListTag, getListStyleType } from "./listThymeleafUtils";

export const renderSectionContent = (section: Section, variables?: Record<string, string | string[] | any>): string => {
  let content = section.content;
  
  // Handle labeled-content sections
  if (section.type === 'labeled-content') {
    let label = section.variables?.label || 'Label';
    
    // Check for label variable override (label_<sectionId>)
    const labelVarName = `label_${section.id}`;
    if (variables && variables[labelVarName] !== undefined) {
      label = String(variables[labelVarName]);
    } else {
      // Process Thymeleaf expressions in label - supports both new and legacy formats
      label = String(label)
        .replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (match, varName) => {
          if (variables && variables[varName] !== undefined) {
            return sanitizeInput(String(variables[varName]));
          }
          if (section.variables && section.variables[varName]) {
            return sanitizeInput(String(section.variables[varName]));
          }
          return match;
        })
        .replace(/<th:utext="\$\{(\w+)\}">/g, (match, varName) => {
          if (variables && variables[varName] !== undefined) {
            return sanitizeInput(String(variables[varName]));
          }
          if (section.variables && section.variables[varName]) {
            return sanitizeInput(String(section.variables[varName]));
          }
          return match;
        });
    }
    
    const contentType = section.variables?.contentType || 'text';
    
    let contentHtml = '';
    
    // Check if we have runtime variables (from RunTemplates)
    if (variables && variables[label] !== undefined) {
      const runtimeValue = variables[label];
      if (contentType === 'table' && typeof runtimeValue === 'object' && runtimeValue.headers) {
        // Render table from runtime data
        let tableHtml = '<table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;"><thead><tr>';
        runtimeValue.headers.forEach((header: string) => {
          tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5; text-align: left;">${sanitizeInput(header)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        (runtimeValue.rows || []).forEach((row: string[]) => {
          tableHtml += '<tr>';
          row.forEach((cell: string) => {
            tableHtml += `<td style="border: 1px solid #ddd; padding: 8px;">${sanitizeInput(cell)}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';
        contentHtml = tableHtml;
      } else if (contentType === 'list' && Array.isArray(runtimeValue)) {
        const listStyle = (section.variables?.listStyle as string) || 'circle';
        const listTag = getListTag(listStyle);
        const listStyleType = getListStyleType(listStyle);
        
        const renderListItem = (item: any, nestedListStyle: string): string => {
          if (typeof item === 'string') {
            return `<li>${sanitizeInput(item)}</li>`;
          }
          
          const styles = [];
          if (item.color) styles.push(`color: ${item.color}`);
          if (item.bold) styles.push('font-weight: bold');
          if (item.italic) styles.push('font-style: italic');
          if (item.underline) styles.push('text-decoration: underline');
          if (item.backgroundColor) styles.push(`background-color: ${item.backgroundColor}`);
          if (item.fontSize) styles.push(`font-size: ${item.fontSize}`);
          const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
          
          let html = `<li${styleAttr}>${sanitizeInput(item.text)}`;
          if (item.children && item.children.length > 0) {
            const nestedTag = getListTag(nestedListStyle);
            const nestedStyleType = getListStyleType(nestedListStyle);
            html += `<${nestedTag} style="list-style-type: ${nestedStyleType}; margin-left: 20px; margin-top: 4px;">`;
            html += item.children.map((child: any) => renderListItem(child, nestedListStyle)).join('');
            html += `</${nestedTag}>`;
          }
          html += '</li>';
          return html;
        };
        
        contentHtml = `<${listTag} style="list-style-type: ${listStyleType}; margin-left: 20px;">` + 
          runtimeValue.map((item: any) => renderListItem(item, listStyle)).join('') + 
          `</${listTag}>`;
      } else if (typeof runtimeValue === 'string') {
        contentHtml = `<div style="white-space: pre-wrap;">${sanitizeInput(runtimeValue)}</div>`;
      }
    } else {
      // Use default values from section variables
      if (contentType === 'table') {
        const tableData = section.variables?.tableData;
        if (tableData && tableData.headers) {
          let tableHtml = '<table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;"><thead><tr>';
          tableData.headers.forEach((header: string) => {
            tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5; text-align: left;">${sanitizeInput(header)}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';
          (tableData.rows || []).forEach((row: string[]) => {
            tableHtml += '<tr>';
            row.forEach((cell: string) => {
              tableHtml += `<td style="border: 1px solid #ddd; padding: 8px;">${sanitizeInput(cell)}</td>`;
            });
            tableHtml += '</tr>';
          });
          tableHtml += '</tbody></table>';
          contentHtml = tableHtml;
        }
      } else if (contentType === 'list') {
        const items = (section.variables?.items as any[]) || [];
        const listStyle = (section.variables?.listStyle as string) || 'circle';
        const listTag = getListTag(listStyle);
        const listStyleType = getListStyleType(listStyle);
        
        const renderListItem = (item: any, nestedListStyle: string): string => {
          if (typeof item === 'string') {
            return `<li>${sanitizeInput(item)}</li>`;
          }
          
          const styles = [];
          if (item.color) styles.push(`color: ${item.color}`);
          if (item.bold) styles.push('font-weight: bold');
          if (item.italic) styles.push('font-style: italic');
          if (item.underline) styles.push('text-decoration: underline');
          if (item.backgroundColor) styles.push(`background-color: ${item.backgroundColor}`);
          if (item.fontSize) styles.push(`font-size: ${item.fontSize}`);
          const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
          
          let html = `<li${styleAttr}>${sanitizeInput(item.text)}`;
          if (item.children && item.children.length > 0) {
            const nestedTag = getListTag(nestedListStyle);
            const nestedStyleType = getListStyleType(nestedListStyle);
            html += `<${nestedTag} style="list-style-type: ${nestedStyleType}; margin-left: 20px; margin-top: 4px;">`;
            html += item.children.map((child: any) => renderListItem(child, nestedListStyle)).join('');
            html += `</${nestedTag}>`;
          }
          html += '</li>';
          return html;
        };
        
        contentHtml = `<${listTag} style="list-style-type: ${listStyleType}; margin-left: 20px;">` + 
          items.map((item: any) => renderListItem(item, listStyle)).join('') + 
          `</${listTag}>`;
      } else {
        const content = (section.variables?.content as string) || '';
        contentHtml = `<div style="white-space: pre-wrap;">${sanitizeInput(content)}</div>`;
      }
    }
    
    const labelColor = section.variables?.labelColor ? `color: ${section.variables.labelColor};` : '';
    return `<div style="margin: 15px 0;">
      <div style="font-weight: bold; margin-bottom: 8px; font-size: 1.1em; ${labelColor}">${sanitizeInput(label)}</div>
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
    
    // Process Thymeleaf conditionals: <th:if="${condition}">content</th:if>
    mixedContent = mixedContent.replace(
      /<th:if="\$\{(\w+)\}">([\s\S]*?)<\/th:if>/g,
      (match, varName, content) => {
        if (section.variables && section.variables[varName]) {
          const value = section.variables[varName];
          // Evaluate condition: truthy values, non-empty strings, non-zero numbers
          const isTrue = value && value !== 'false' && value !== '0' && value !== 'null';
          return isTrue ? content : '';
        }
        return ''; // If variable doesn't exist, condition is false
      }
    );
    
    // Process Thymeleaf loops: <th:each="item : ${items}">content with ${item}</th:each>
    mixedContent = mixedContent.replace(
      /<th:each="(\w+)\s*:\s*\$\{(\w+)\}">([\s\S]*?)<\/th:each>/g,
      (match, itemName, arrayName, loopContent) => {
        if (section.variables && section.variables[arrayName]) {
          const items = section.variables[arrayName];
          if (Array.isArray(items)) {
            return items.map(item => {
              let itemContent = loopContent;
              // Replace new format <span th:utext="${item}"/>
              itemContent = itemContent.replace(
                new RegExp(`<span\\s+th:utext="\\$\\{${itemName}\\}"/>`, 'g'),
                typeof item === 'object' && item.text ? sanitizeInput(item.text) : sanitizeInput(String(item))
              );
              // Replace legacy format <th:utext="${item}">
              itemContent = itemContent.replace(
                new RegExp(`<th:utext="\\$\\{${itemName}\\}">`, 'g'),
                typeof item === 'object' && item.text ? sanitizeInput(item.text) : sanitizeInput(String(item))
              );
              // Also support simple ${item} references
              itemContent = itemContent.replace(
                new RegExp(`\\$\\{${itemName}\\}`, 'g'),
                typeof item === 'object' && item.text ? sanitizeInput(item.text) : sanitizeInput(String(item))
              );
              return itemContent;
            }).join('');
          }
        }
        return ''; // If array doesn't exist, render nothing
      }
    );
    
    // Replace all Thymeleaf placeholder patterns with sanitized values
    // New format: <span th:utext="${placeholder}"/>
    mixedContent = mixedContent.replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (match, varName) => {
      if (section.variables && section.variables[varName]) {
        return sanitizeHTML(section.variables[varName] as string);
      }
      return match;
    });
    
    // Legacy format: <th:utext="${placeholder}">
    mixedContent = mixedContent.replace(/<th:utext="\$\{(\w+)\}">/g, (match, varName) => {
      if (section.variables && section.variables[varName]) {
        return sanitizeHTML(section.variables[varName] as string);
      }
      return match;
    });
    
    return `<div style="margin: 10px 0; padding: 8px; line-height: 1.6;">${sanitizeHTML(mixedContent).replace(/\n/g, '<br/>')}</div>`;
  }
  
  // Handle heading and text sections (with or without placeholders)
  const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
  if (inlinePlaceholderTypes.includes(section.type)) {
    // Get content from section.content or from section.variables
    let processedContent = section.content || '';
    
    // If content is empty, try to get from variables
    if (!processedContent && section.variables) {
      // Check for common variable names
      if (section.variables.content) {
        processedContent = String(section.variables.content);
      } else if (section.variables.text) {
        processedContent = String(section.variables.text);
      }
    }
    
    // Replace {{variable}} placeholders with values
    const placeholderMatches = processedContent.match(/\{\{(\w+)\}\}/g) || [];
    placeholderMatches.forEach(match => {
      const varName = match.replace(/\{\{|\}\}/g, '');
      let value = '';
      
      // Check runtime variables first, then section variables
      if (variables && variables[varName] !== undefined) {
        value = sanitizeInput(String(variables[varName]));
      } else if (section.variables && section.variables[varName] !== undefined) {
        value = sanitizeInput(String(section.variables[varName]));
      } else {
        value = match; // Keep placeholder if no value
      }
      
      processedContent = processedContent.replace(new RegExp(match.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    // Replace Thymeleaf-style placeholders - new format: <span th:utext="${variable}"/>
    processedContent = processedContent.replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (match, varName) => {
      if (variables && variables[varName] !== undefined) {
        return sanitizeInput(String(variables[varName]));
      } else if (section.variables && section.variables[varName] !== undefined) {
        return sanitizeInput(String(section.variables[varName]));
      }
      return match;
    });
    
    // Also handle legacy format: <th:utext="${variable}">
    processedContent = processedContent.replace(/<th:utext="\$\{(\w+)\}">/g, (match, varName) => {
      if (variables && variables[varName] !== undefined) {
        return sanitizeInput(String(variables[varName]));
      } else if (section.variables && section.variables[varName] !== undefined) {
        return sanitizeInput(String(section.variables[varName]));
      }
      return match;
    });
    
    // Wrap content in appropriate HTML tags
    const tagMap: Record<string, string> = {
      'heading1': 'h1',
      'heading2': 'h2',
      'heading3': 'h3',
      'heading4': 'h4',
      'heading5': 'h5',
      'heading6': 'h6',
      'text': 'span',
      'paragraph': 'p'
    };
    
    const tag = tagMap[section.type] || 'div';
    
    // Apply section styles if available
    let styleStr = '';
    if (section.styles) {
      const styleProps = [];
      if (section.styles.fontSize) styleProps.push(`font-size: ${section.styles.fontSize}`);
      if (section.styles.color) styleProps.push(`color: ${section.styles.color}`);
      if (section.styles.backgroundColor) styleProps.push(`background-color: ${section.styles.backgroundColor}`);
      if (section.styles.fontWeight) styleProps.push(`font-weight: ${section.styles.fontWeight}`);
      if (section.styles.fontStyle) styleProps.push(`font-style: ${section.styles.fontStyle}`);
      if (section.styles.textDecoration) styleProps.push(`text-decoration: ${section.styles.textDecoration}`);
      if (section.styles.textAlign) styleProps.push(`text-align: ${section.styles.textAlign}`);
      if (section.styles.margin) styleProps.push(`margin: ${section.styles.margin}`);
      if (section.styles.padding) styleProps.push(`padding: ${section.styles.padding}`);
      if (styleProps.length > 0) {
        styleStr = ` style="${styleProps.join('; ')}"`;
      }
    }
    
    return `<${tag}${styleStr}>${processedContent}</${tag}>`;
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

  // Replace all variables in the content - supports both new and legacy formats
  Object.entries(section.variables).forEach(([key, value]) => {
    // New format: <span th:utext="${key}"/>
    const spanRegex = new RegExp(`<span\\s+th:utext="\\$\\{${key}\\}"/>`, 'g');
    // Legacy format: <th:utext="${key}">
    const legacyRegex = new RegExp(`<th:utext="\\$\\{${key}\\}">`, 'g');
    
    if (Array.isArray(value)) {
      // For list variables, generate <li> tags
      const listItems = value.map(item => `<li>${sanitizeHTML(item)}</li>`).join('');
      content = content.replace(spanRegex, listItems);
      content = content.replace(legacyRegex, listItems);
    } else if (typeof value === 'object' && value !== null) {
      // Skip complex objects like table data
      return;
    } else {
      // For text/url variables, replace directly
      content = content.replace(spanRegex, sanitizeHTML(value as string));
      content = content.replace(legacyRegex, sanitizeHTML(value as string));
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
