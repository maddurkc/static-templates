import { Section } from "@/types/section";
import { ApiMapping } from "@/types/api-config";
import { generateTableHTML, TableData } from "./tableUtils";
import { sanitizeHTML, sanitizeInput } from "./sanitize";
import { generateListVariableName, getListTag, getListStyleType } from "./listThymeleafUtils";

// Helper function to wrap content in table for Outlook email margin compatibility
const wrapInOutlookTable = (content: string, marginBottom: string = '20px'): string => {
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: ${marginBottom};">
    <tr>
      <td style="padding: 0;">
        ${content}
      </td>
    </tr>
  </table>`;
};

// Render Outlook-compatible list HTML without relying on native ul/li rendering
const renderOutlookCompatibleList = (items: any[], listTag: string, listStyleType: string): string => {
  const isOrdered = listTag === 'ol';
  
  const renderItem = (item: any, index: number): string => {
    const text = typeof item === 'string' ? item : (item.text || '');
    const styles: string[] = [];
    
    if (typeof item === 'object') {
      if (item.color) styles.push(`color: ${item.color}`);
      if (item.bold) styles.push('font-weight: bold');
      if (item.italic) styles.push('font-style: italic');
      if (item.underline) styles.push('text-decoration: underline');
      if (item.backgroundColor) styles.push(`background-color: ${item.backgroundColor}`);
      if (item.fontSize) styles.push(`font-size: ${item.fontSize}`);
    }
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    
    // Use bullet character or number based on list type
    let bullet = '';
    if (isOrdered) {
      if (listStyleType === 'lower-roman') {
        bullet = toRoman(index + 1).toLowerCase() + '.';
      } else if (listStyleType === 'upper-roman') {
        bullet = toRoman(index + 1) + '.';
      } else if (listStyleType === 'lower-alpha') {
        bullet = String.fromCharCode(97 + (index % 26)) + '.';
      } else if (listStyleType === 'upper-alpha') {
        bullet = String.fromCharCode(65 + (index % 26)) + '.';
      } else {
        bullet = (index + 1) + '.';
      }
    } else {
      if (listStyleType === 'circle') bullet = '○';
      else if (listStyleType === 'square') bullet = '■';
      else bullet = '•';
    }
    
    return `<tr>
      <td style="vertical-align: top; padding-right: 8px; width: 20px;">${bullet}</td>
      <td style="vertical-align: top;${styleAttr ? ' ' + styles.join('; ') : ''}">${sanitizeInput(text)}</td>
    </tr>`;
  };
  
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-left: 20px;">
    ${items.map((item, idx) => renderItem(item, idx)).join('')}
  </table>`;
};

// Render Outlook-compatible list with nested items support (table-based)
const renderOutlookCompatibleListWithNesting = (items: any[], listTag: string, listStyleType: string, indentLevel: number = 0): string => {
  const isOrdered = listTag === 'ol';
  
  const getBullet = (index: number): string => {
    if (isOrdered) {
      if (listStyleType === 'lower-roman') return toRoman(index + 1).toLowerCase() + '.';
      if (listStyleType === 'upper-roman') return toRoman(index + 1) + '.';
      if (listStyleType === 'lower-alpha') return String.fromCharCode(97 + (index % 26)) + '.';
      if (listStyleType === 'upper-alpha') return String.fromCharCode(65 + (index % 26)) + '.';
      return (index + 1) + '.';
    } else {
      if (listStyleType === 'circle') return '○';
      if (listStyleType === 'square') return '■';
      return '•';
    }
  };
  
  const renderItem = (item: any, index: number): string => {
    const text = typeof item === 'string' ? item : (item.text || '');
    const styles: string[] = [];
    
    if (typeof item === 'object') {
      if (item.color) styles.push(`color: ${item.color}`);
      if (item.bold) styles.push('font-weight: bold');
      if (item.italic) styles.push('font-style: italic');
      if (item.underline) styles.push('text-decoration: underline');
      if (item.backgroundColor) styles.push(`background-color: ${item.backgroundColor}`);
      if (item.fontSize) styles.push(`font-size: ${item.fontSize}`);
    }
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    
    let childrenHtml = '';
    if (typeof item === 'object' && item.children && item.children.length > 0) {
      // Recursively render children with increased indent
      childrenHtml = renderOutlookCompatibleListWithNesting(item.children, listTag, listStyleType, indentLevel + 1);
    }
    
    return `<tr>
      <td style="vertical-align: top; padding-right: 8px; width: 20px;">${getBullet(index)}</td>
      <td style="vertical-align: top;${styleAttr ? ' ' + styles.join('; ') : ''}">${sanitizeInput(text)}${childrenHtml}</td>
    </tr>`;
  };
  
  const marginLeft = 20 + (indentLevel * 20);
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-left: ${marginLeft}px;">
    ${items.map((item, idx) => renderItem(item, idx)).join('')}
  </table>`;
};

// Helper function to convert number to Roman numerals
const toRoman = (num: number): string => {
  const romanNumerals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let result = '';
  for (const [value, symbol] of romanNumerals) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
};

// Email wrapper with proper DOCTYPE, head, and meta tags for email client compatibility
export const wrapInEmailHtml = (bodyContent: string): string => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, p, a, li {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333333;
    }
    table {
      border-collapse: collapse !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 20px; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.5; color: #333333;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 800px; margin: 0 auto;">
    <tr>
      <td style="padding: 0;">
        ${bodyContent}
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const renderSectionContent = (section: Section, variables?: Record<string, string | string[] | any>): string => {
  let content = section.content;
  
  // Handle labeled-content sections
  if (section.type === 'labeled-content') {
    let label = section.variables?.label || 'Label';
    
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
    
    const contentType = section.variables?.contentType || 'text';
    
    let contentHtml = '';
    
    // Determine the correct variable name for runtime data lookup
    // For list content: use listVariableName (e.g., items_abc123)
    // For text/table content: use section ID
    const contentVarName = contentType === 'list' 
      ? (section.variables?.listVariableName as string) || section.id
      : section.id;
    
    // Check if we have runtime variables (from RunTemplates)
    if (variables && variables[contentVarName] !== undefined) {
      const runtimeValue = variables[contentVarName];
      if (contentType === 'table' && typeof runtimeValue === 'object') {
        // Handle both formats: {headers, rows} for runtime editing and TableData format
        if (runtimeValue.rows && Array.isArray(runtimeValue.rows)) {
          // Check if it's new TableData format (rows where first row is header) or runtime format (separate headers)
          if (runtimeValue.headers && Array.isArray(runtimeValue.headers)) {
            // Runtime format with separate headers and rows
            const headerStyle = section.variables?.tableData?.headerStyle || { backgroundColor: '#f5f5f5', textColor: '#000000', bold: true };
            const showBorder = section.variables?.tableData?.showBorder !== false;
            const borderColor = section.variables?.tableData?.borderColor || '#ddd';
            const columnWidths = section.variables?.tableData?.columnWidths || [];
            
            let tableHtml = `<table style="border-collapse: collapse; width: 100%;${showBorder ? ` border: 1px solid ${borderColor};` : ''}">`;
            
            // Add colgroup for column widths
            if (columnWidths.length > 0) {
              tableHtml += '<colgroup>';
              columnWidths.forEach((width: string) => {
                tableHtml += `<col style="width: ${width};">`;
              });
              tableHtml += '</colgroup>';
            }
            
            tableHtml += '<thead><tr>';
            runtimeValue.headers.forEach((header: string, idx: number) => {
              const widthStyle = columnWidths[idx] ? `width: ${columnWidths[idx]};` : '';
              const bgColor = headerStyle.backgroundColor || '#f5f5f5';
              const textColor = headerStyle.textColor || '#000000';
              const fontWeight = headerStyle.bold !== false ? 'bold' : 'normal';
              tableHtml += `<th style="${showBorder ? `border: 1px solid ${borderColor};` : ''} padding: 8px; background-color: ${bgColor}; color: ${textColor}; font-weight: ${fontWeight}; text-align: left; ${widthStyle}">${sanitizeInput(header)}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';
            (runtimeValue.rows || []).forEach((row: string[]) => {
              tableHtml += '<tr>';
              row.forEach((cell: string, idx: number) => {
                const widthStyle = columnWidths[idx] ? `width: ${columnWidths[idx]};` : '';
                tableHtml += `<td style="${showBorder ? `border: 1px solid ${borderColor};` : ''} padding: 8px; ${widthStyle}">${sanitizeInput(cell)}</td>`;
              });
              tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            contentHtml = tableHtml;
          } else {
            // TableData format - use generateTableHTML
            contentHtml = generateTableHTML(runtimeValue as TableData);
          }
        }
      } else if (contentType === 'list' && Array.isArray(runtimeValue)) {
        const listStyle = (section.variables?.listStyle as string) || 'circle';
        const listTag = getListTag(listStyle);
        const listStyleType = getListStyleType(listStyle);
        
        // Use Outlook-compatible table-based list rendering
        contentHtml = renderOutlookCompatibleListWithNesting(runtimeValue, listTag, listStyleType);
      } else if (typeof runtimeValue === 'string') {
        contentHtml = `<div style="white-space: pre-wrap;">${sanitizeInput(runtimeValue)}</div>`;
      } else if (typeof runtimeValue === 'object' && runtimeValue !== null && 'text' in runtimeValue) {
        // Handle TextStyle object with styling properties
        const textStyle = runtimeValue as { text: string; color?: string; bold?: boolean; italic?: boolean; underline?: boolean; backgroundColor?: string; fontSize?: string };
        const styles = [];
        if (textStyle.color) styles.push(`color: ${textStyle.color}`);
        if (textStyle.bold) styles.push('font-weight: bold');
        if (textStyle.italic) styles.push('font-style: italic');
        if (textStyle.underline) styles.push('text-decoration: underline');
        if (textStyle.backgroundColor) styles.push(`background-color: ${textStyle.backgroundColor}`);
        if (textStyle.fontSize) styles.push(`font-size: ${textStyle.fontSize}`);
        const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
        contentHtml = `<div style="white-space: pre-wrap;"><span${styleAttr}>${sanitizeInput(textStyle.text)}</span></div>`;
      }
    } else {
      // Use default values from section variables
      if (contentType === 'table') {
        const tableData = section.variables?.tableData;
        if (tableData) {
          // Use generateTableHTML for full TableData with styling
          if (tableData.rows && Array.isArray(tableData.rows)) {
            contentHtml = generateTableHTML(tableData as TableData);
          } else if (tableData.headers) {
            // Legacy format with separate headers
            const headerStyle = tableData.headerStyle || { backgroundColor: '#f5f5f5', textColor: '#000000', bold: true };
            const showBorder = tableData.showBorder !== false;
            const borderColor = tableData.borderColor || '#ddd';
            
            let tableHtml = `<table style="border-collapse: collapse; width: 100%;${showBorder ? ` border: 1px solid ${borderColor};` : ''}"><thead><tr>`;
            tableData.headers.forEach((header: string) => {
              const bgColor = headerStyle.backgroundColor || '#f5f5f5';
              const textColor = headerStyle.textColor || '#000000';
              const fontWeight = headerStyle.bold !== false ? 'bold' : 'normal';
              tableHtml += `<th style="${showBorder ? `border: 1px solid ${borderColor};` : ''} padding: 8px; background-color: ${bgColor}; color: ${textColor}; font-weight: ${fontWeight}; text-align: left;">${sanitizeInput(header)}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';
            (tableData.rows || []).forEach((row: string[]) => {
              tableHtml += '<tr>';
              row.forEach((cell: string) => {
                tableHtml += `<td style="${showBorder ? `border: 1px solid ${borderColor};` : ''} padding: 8px;">${sanitizeInput(cell)}</td>`;
              });
              tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            contentHtml = tableHtml;
          }
        }
      } else if (contentType === 'list') {
        const items = (section.variables?.items as any[]) || [];
        const listStyle = (section.variables?.listStyle as string) || 'circle';
        const listTag = getListTag(listStyle);
        const listStyleType = getListStyleType(listStyle);
        
        // Use Outlook-compatible table-based list rendering
        contentHtml = renderOutlookCompatibleListWithNesting(items, listTag, listStyleType);
      } else {
        const content = (section.variables?.content as string) || '';
        contentHtml = `<div style="white-space: pre-wrap;">${sanitizeInput(content)}</div>`;
      }
    }
    
    const labelColor = section.variables?.labelColor ? `color: ${section.variables.labelColor};` : '';
    // Use table-based layout for Outlook email client compatibility with proper margins
    return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px;">
      <tr>
        <td style="padding: 0;">
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 1.1em; ${labelColor}">${sanitizeInput(label)}</div>
          ${contentHtml}
        </td>
      </tr>
    </table>`;
  }
  
  // Handle table sections specially - wrapped in table for Outlook margin compatibility
  if (section.type === 'table') {
    // Check for runtime variables first (from RunTemplates)
    if (variables && variables[section.id] !== undefined) {
      const runtimeValue = variables[section.id];
      if (typeof runtimeValue === 'object' && runtimeValue.headers && Array.isArray(runtimeValue.headers)) {
        // Runtime format with separate headers and rows
        const tableData = section.variables?.tableData || {};
        const headerStyle = tableData.headerStyle || { backgroundColor: '#f5f5f5', textColor: '#000000', bold: true };
        const showBorder = tableData.showBorder !== false;
        const borderColor = tableData.borderColor || '#ddd';
        const columnWidths = tableData.columnWidths || [];
        
        let tableHtml = `<table style="border-collapse: collapse; width: 100%;${showBorder ? ` border: 1px solid ${borderColor};` : ''}">`;
        
        // Add colgroup for column widths
        if (columnWidths.length > 0) {
          tableHtml += '<colgroup>';
          columnWidths.forEach((width: string) => {
            tableHtml += `<col style="width: ${width};">`;
          });
          tableHtml += '</colgroup>';
        }
        
        tableHtml += '<thead><tr>';
        runtimeValue.headers.forEach((header: string, idx: number) => {
          const widthStyle = columnWidths[idx] ? `width: ${columnWidths[idx]};` : '';
          const bgColor = headerStyle.backgroundColor || '#f5f5f5';
          const textColor = headerStyle.textColor || '#000000';
          const fontWeight = headerStyle.bold !== false ? 'bold' : 'normal';
          tableHtml += `<th style="${showBorder ? `border: 1px solid ${borderColor};` : ''} padding: 8px; background-color: ${bgColor}; color: ${textColor}; font-weight: ${fontWeight}; text-align: left; ${widthStyle}">${sanitizeInput(header)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        (runtimeValue.rows || []).forEach((row: string[]) => {
          tableHtml += '<tr>';
          row.forEach((cell: string, idx: number) => {
            const widthStyle = columnWidths[idx] ? `width: ${columnWidths[idx]};` : '';
            tableHtml += `<td style="${showBorder ? `border: 1px solid ${borderColor};` : ''} padding: 8px; ${widthStyle}">${sanitizeInput(cell)}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';
        return wrapInOutlookTable(tableHtml);
      }
    }
    
    // Use default table data from section
    if (section.variables?.tableData) {
      const tableContent = generateTableHTML(section.variables.tableData as TableData);
      return wrapInOutlookTable(tableContent);
    }
  }
  
  // Handle static-text sections - use content variable directly
  if (section.type === 'static-text' && section.variables?.content) {
    const staticContent = `<div style="padding: 8px; line-height: 1.6;">${sanitizeHTML(section.variables.content as string).replace(/\n/g, '<br/>')}</div>`;
    return wrapInOutlookTable(staticContent);
  }
  
  // Handle mixed-content sections - free-form text with embedded placeholders
  if (section.type === 'mixed-content' && section.variables?.content) {
    let mixedContent = section.variables.content as string;
    
    // Helper to get value from runtime variables first, then section variables
    const getValue = (varName: string): any => {
      if (variables && variables[varName] !== undefined) {
        return variables[varName];
      }
      if (section.variables && section.variables[varName] !== undefined) {
        return section.variables[varName];
      }
      return undefined;
    };
    
    // Process Thymeleaf conditionals: <th:if="${condition}">content</th:if>
    mixedContent = mixedContent.replace(
      /<th:if="\$\{(\w+)\}">([\s\S]*?)<\/th:if>/g,
      (match, varName, content) => {
        const value = getValue(varName);
        if (value !== undefined) {
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
        const items = getValue(arrayName);
        if (items && Array.isArray(items)) {
          return items.map(item => {
            let itemContent = loopContent;
            const itemText = typeof item === 'object' && item.text ? sanitizeInput(item.text) : sanitizeInput(String(item));
            // Replace new format <span th:utext="${item}"/>
            itemContent = itemContent.replace(
              new RegExp(`<span\\s+th:utext="\\$\\{${itemName}\\}"/>`, 'g'),
              itemText
            );
            // Replace legacy format <th:utext="${item}">
            itemContent = itemContent.replace(
              new RegExp(`<th:utext="\\$\\{${itemName}\\}">`, 'g'),
              itemText
            );
            // Replace {{placeholder}} format
            itemContent = itemContent.replace(
              new RegExp(`\\{\\{${itemName}\\}\\}`, 'g'),
              itemText
            );
            // Also support simple ${item} references
            itemContent = itemContent.replace(
              new RegExp(`\\$\\{${itemName}\\}`, 'g'),
              itemText
            );
            return itemContent;
          }).join('');
        }
        return ''; // If array doesn't exist, render nothing
      }
    );
    
    // Replace {{placeholder}} format with runtime values first
    mixedContent = mixedContent.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = getValue(varName);
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && 'text' in value) {
          // Handle styled text
          const textStyle = value as { text: string; color?: string; bold?: boolean; italic?: boolean; underline?: boolean; backgroundColor?: string; fontSize?: string };
          const styles = [];
          if (textStyle.color) styles.push(`color: ${textStyle.color}`);
          if (textStyle.bold) styles.push('font-weight: bold');
          if (textStyle.italic) styles.push('font-style: italic');
          if (textStyle.underline) styles.push('text-decoration: underline');
          if (textStyle.backgroundColor) styles.push(`background-color: ${textStyle.backgroundColor}`);
          if (textStyle.fontSize) styles.push(`font-size: ${textStyle.fontSize}`);
          const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
          return `<span${styleAttr}>${sanitizeInput(textStyle.text)}</span>`;
        }
        return sanitizeInput(String(value));
      }
      return match;
    });
    
    // Replace Thymeleaf patterns: <span th:utext="${placeholder}"/>
    mixedContent = mixedContent.replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (match, varName) => {
      const value = getValue(varName);
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && 'text' in value) {
          const textStyle = value as { text: string; color?: string; bold?: boolean; italic?: boolean; underline?: string; backgroundColor?: string; fontSize?: string };
          const styles = [];
          if (textStyle.color) styles.push(`color: ${textStyle.color}`);
          if (textStyle.bold) styles.push('font-weight: bold');
          if (textStyle.italic) styles.push('font-style: italic');
          if (textStyle.underline) styles.push('text-decoration: underline');
          if (textStyle.backgroundColor) styles.push(`background-color: ${textStyle.backgroundColor}`);
          if (textStyle.fontSize) styles.push(`font-size: ${textStyle.fontSize}`);
          const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
          return `<span${styleAttr}>${sanitizeInput(textStyle.text)}</span>`;
        }
        return sanitizeInput(String(value));
      }
      return match;
    });
    
    // Legacy format: <th:utext="${placeholder}">
    mixedContent = mixedContent.replace(/<th:utext="\$\{(\w+)\}">/g, (match, varName) => {
      const value = getValue(varName);
      if (value !== undefined) {
        return sanitizeInput(String(value));
      }
      return match;
    });
    
    // Handle anchor tags with placeholders for href and text
    // Pattern: <a href="{{linkUrl}}">{{linkText}}</a>
    mixedContent = mixedContent.replace(
      /<a\s+href="([^"]*)"([^>]*)>([^<]*)<\/a>/g,
      (match, href, attrs, text) => {
        // href and text may already be processed, or contain raw values
        return `<a href="${href}"${attrs}>${text}</a>`;
      }
    );
    
    const mixedHtml = `<div style="padding: 8px; line-height: 1.6;">${mixedContent.replace(/\n/g, '<br/>')}</div>`;
    return wrapInOutlookTable(mixedHtml);
  }
  
  // Handle heading and text sections (with or without placeholders)
  const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
  if (inlinePlaceholderTypes.includes(section.type)) {
    // Metadata keys to skip when looking for user content
    const metadataKeys = ['label', 'content', 'contentType', 'listStyle', 'items', 'tableData', 'listVariableName', 'listHtml', 'labelColor'];
    
    // Find the variable name for this section
    let varName: string | null = null;
    if (section.variables) {
      for (const [key, value] of Object.entries(section.variables)) {
        if (!metadataKeys.includes(key) && typeof value === 'string') {
          varName = key;
          break;
        }
      }
    }
    
    // PRIORITY: Check runtime variables first (from RichTextEditor)
    // This ensures user edits from RichTextEditor are reflected in preview
    let processedContent = '';
    if (varName && variables && variables[varName] !== undefined) {
      // Use the runtime variable value directly (already contains HTML from RichTextEditor)
      processedContent = sanitizeHTML(String(variables[varName]));
    } else if (section.content) {
      // Fall back to section.content
      processedContent = section.content;
    } else if (section.variables) {
      // Fall back to section.variables
      if (section.variables.content) {
        processedContent = String(section.variables.content);
      } else if (section.variables.text) {
        processedContent = String(section.variables.text);
      } else if (section.variables.title) {
        processedContent = String(section.variables.title);
      } else if (varName && section.variables[varName]) {
        processedContent = String(section.variables[varName]);
      }
    }
    
    // If content contains Thymeleaf tags, replace them with variable values
    if (processedContent.includes('th:utext') && section.variables) {
      // Replace all Thymeleaf patterns with their values from variables
      processedContent = processedContent.replace(
        /<span\s+th:utext="\$\{(\w+)\}"\/>/g,
        (match, varName) => {
          const value = section.variables?.[varName] ?? variables?.[varName];
          return value !== undefined ? sanitizeHTML(String(value)) : match;
        }
      ).replace(
        /<th:utext="\$\{(\w+)\}">/g,
        (match, varName) => {
          const value = section.variables?.[varName] ?? variables?.[varName];
          return value !== undefined ? sanitizeHTML(String(value)) : match;
        }
      );
    }
    
    // Replace {{variable}} placeholders with values
    const placeholderMatches = processedContent.match(/\{\{(\w+)\}\}/g) || [];
    placeholderMatches.forEach(match => {
      const varName = match.replace(/\{\{|\}\}/g, '');
      let value = '';
      
      // Check runtime variables first, then section variables
      if (variables && variables[varName] !== undefined) {
        const varValue = variables[varName];
        // Handle TextStyle objects with styling properties
        if (typeof varValue === 'object' && varValue !== null && 'text' in varValue) {
          const textStyle = varValue as { text: string; color?: string; bold?: boolean; italic?: boolean; underline?: boolean; backgroundColor?: string; fontSize?: string };
          const styles = [];
          if (textStyle.color) styles.push(`color: ${textStyle.color}`);
          if (textStyle.bold) styles.push('font-weight: bold');
          if (textStyle.italic) styles.push('font-style: italic');
          if (textStyle.underline) styles.push('text-decoration: underline');
          if (textStyle.backgroundColor) styles.push(`background-color: ${textStyle.backgroundColor}`);
          if (textStyle.fontSize) styles.push(`font-size: ${textStyle.fontSize}`);
          const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
          value = `<span${styleAttr}>${sanitizeHTML(textStyle.text)}</span>`;
        } else {
          // Use sanitizeHTML to allow rich text formatting from RichTextEditor
          value = sanitizeHTML(String(varValue));
        }
      } else if (section.variables && section.variables[varName] !== undefined) {
        value = sanitizeHTML(String(section.variables[varName]));
      } else {
        value = match; // Keep placeholder if no value
      }
      
      processedContent = processedContent.replace(new RegExp(match.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    // Helper function to convert value to styled HTML
    const valueToStyledHtml = (value: any): string => {
      if (typeof value === 'object' && value !== null && 'text' in value) {
        const textStyle = value as { text: string; color?: string; bold?: boolean; italic?: boolean; underline?: boolean; backgroundColor?: string; fontSize?: string };
        const styles = [];
        if (textStyle.color) styles.push(`color: ${textStyle.color}`);
        if (textStyle.bold) styles.push('font-weight: bold');
        if (textStyle.italic) styles.push('font-style: italic');
        if (textStyle.underline) styles.push('text-decoration: underline');
        if (textStyle.backgroundColor) styles.push(`background-color: ${textStyle.backgroundColor}`);
        if (textStyle.fontSize) styles.push(`font-size: ${textStyle.fontSize}`);
        const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
        return `<span${styleAttr}>${sanitizeHTML(textStyle.text)}</span>`;
      }
      // Use sanitizeHTML to preserve rich text formatting
      return sanitizeHTML(String(value));
    };
    
    // Replace Thymeleaf-style placeholders - new format: <span th:utext="${variable}"/>
    processedContent = processedContent.replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (match, varName) => {
      if (variables && variables[varName] !== undefined) {
        return valueToStyledHtml(variables[varName]);
      } else if (section.variables && section.variables[varName] !== undefined) {
        return sanitizeHTML(String(section.variables[varName]));
      }
      return match;
    });
    
    // Also handle legacy format: <th:utext="${variable}">
    processedContent = processedContent.replace(/<th:utext="\$\{(\w+)\}">/g, (match, varName) => {
      if (variables && variables[varName] !== undefined) {
        return valueToStyledHtml(variables[varName]);
      } else if (section.variables && section.variables[varName] !== undefined) {
        return sanitizeHTML(String(section.variables[varName]));
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
    
    // Check if processedContent already has the wrapper tag to avoid double-wrapping
    const tagRegex = new RegExp(`^\\s*<${tag}[^>]*>`, 'i');
    let headingTextHtml: string;
    if (tagRegex.test(processedContent)) {
      // Content already has the tag, just use it directly (but inject styles if needed)
      if (styleStr && !processedContent.includes('style=')) {
        headingTextHtml = processedContent.replace(new RegExp(`<${tag}`, 'i'), `<${tag}${styleStr}`);
      } else {
        headingTextHtml = processedContent;
      }
    } else {
      // Wrap content in the appropriate tag
      headingTextHtml = `<${tag}${styleStr}>${processedContent}</${tag}>`;
    }
    return wrapInOutlookTable(headingTextHtml);
  }
  // Handle standalone list sections (bullet-list-*, number-list-*)
  const listSectionTypes = [
    'bullet-list-circle', 'bullet-list-disc', 'bullet-list-square',
    'number-list-1', 'number-list-i', 'number-list-a'
  ];
  if (listSectionTypes.includes(section.type)) {
    // Determine list style based on section type
    let listStyle = 'disc';
    if (section.type.includes('circle')) listStyle = 'circle';
    else if (section.type.includes('disc')) listStyle = 'disc';
    else if (section.type.includes('square')) listStyle = 'square';
    else if (section.type === 'number-list-1') listStyle = 'decimal';
    else if (section.type === 'number-list-i') listStyle = 'lower-roman';
    else if (section.type === 'number-list-a') listStyle = 'lower-alpha';
    
    const listTag = getListTag(listStyle);
    const listStyleType = getListStyleType(listStyle);
    
    // Check for runtime variables first (from RunTemplates)
    // Use stored listVariableName if available (for consistency across template updates)
    const listVarName = section.variables?.listVariableName as string;
    let items: any[] = [];
    if (variables && listVarName && variables[listVarName] !== undefined) {
      items = Array.isArray(variables[listVarName]) ? variables[listVarName] : [];
    } else if (variables && variables[section.id] !== undefined) {
      // Fallback to section.id for backward compatibility
      items = Array.isArray(variables[section.id]) ? variables[section.id] : [];
    } else if (section.variables?.items) {
      items = section.variables.items as any[];
    }
    
    const renderListItem = (item: any): string => {
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
      
      return `<li${styleAttr}>${sanitizeInput(item.text || '')}</li>`;
    };
    
    const listHtml = renderOutlookCompatibleList(items, listTag, listStyleType);
    return wrapInOutlookTable(listHtml);
  }
  
  // Handle line-break sections
  if (section.type === 'line-break') {
    return '<br/>';
  }
  
  // Handle container sections with nested children
  if (section.type === 'container' && section.children && section.children.length > 0) {
    const childrenHTML = section.children.map(child => renderSectionContent(child, variables)).join('');
    const containerHtml = `<div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;">${childrenHTML}</div>`;
    return wrapInOutlookTable(containerHtml);
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
