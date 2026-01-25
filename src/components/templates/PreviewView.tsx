import { useMemo } from "react";
import { Section } from "@/types/section";
import { renderSectionContent } from "@/lib/templateUtils";
import { thymeleafToPlaceholder, replaceWithDefaults } from "@/lib/thymeleafUtils";
import { generateTableHTML, TableData } from "@/lib/tableUtils";
import { IframePreview } from "./IframePreview";
import styles from "./PreviewView.module.scss";

interface PreviewViewProps {
  headerSection: Section;
  footerSection: Section;
  sections: Section[];
}

export const PreviewView = ({ headerSection, footerSection, sections }: PreviewViewProps) => {
  const allSections = [headerSection, ...sections, footerSection];
  
  const generateSectionHtml = (section: Section): string => {
    const defaultStyles = {
      margin: '10px 0',
      padding: '8px',
    };
    const combinedStyles = { ...defaultStyles, ...section.styles };
    
    const styleString = Object.entries(combinedStyles)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join('; ');
    
    // Handle container sections with nested children
    if (section.type === 'container' && section.children && section.children.length > 0) {
      const childrenHtml = section.children.map(child => generateSectionHtml(child)).join('');
      return `<div class="container-section">${childrenHtml}</div>`;
    }
    
    // Handle labeled-content sections with special rendering
    if (section.type === 'labeled-content') {
      let label = (section.variables?.label as string) || 'Label';
      
      const isEmptyValue = (value: any): boolean => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        return false;
      };
      
      label = label.replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (match, varName) => {
        if (section.variables && !isEmptyValue(section.variables[varName])) {
          return String(section.variables[varName]);
        }
        return `{{${varName}}}`;
      }).replace(/<th:utext="\$\{(\w+)\}">/g, (match, varName) => {
        if (section.variables && !isEmptyValue(section.variables[varName])) {
          return String(section.variables[varName]);
        }
        return `{{${varName}}}`;
      });
      
      const contentType = (section.variables?.contentType as string) || 'text';
      let contentHtml = '';
      
      if (contentType === 'text') {
        let textContent = (section.variables?.content as string) || '';
        textContent = textContent.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
          if (section.variables && !isEmptyValue(section.variables[varName])) {
            return String(section.variables[varName]);
          }
          return match;
        });
        contentHtml = `<div style="white-space: pre-wrap;">${textContent}</div>`;
      } else if (contentType === 'list') {
        const items = (section.variables?.items as any[]) || [];
        const listStyle = (section.variables?.listStyle as string) || 'circle';
        
        const renderListItem = (item: any): string => {
          if (typeof item === 'string') {
            return `<li>${item}</li>`;
          }
          
          const styles = [];
          if (item.color) styles.push(`color: ${item.color}`);
          if (item.bold) styles.push('font-weight: bold');
          if (item.italic) styles.push('font-style: italic');
          if (item.underline) styles.push('text-decoration: underline');
          if (item.backgroundColor) styles.push(`background-color: ${item.backgroundColor}`);
          if (item.fontSize) styles.push(`font-size: ${item.fontSize}`);
          const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
          
          let html = `<li${styleAttr}>${item.text}`;
          if (item.children && item.children.length > 0) {
            html += `<ul style="list-style-type: ${listStyle}; margin-left: 20px; margin-top: 4px;">`;
            html += item.children.map((child: any) => renderListItem(child)).join('');
            html += '</ul>';
          }
          html += '</li>';
          return html;
        };
        
        contentHtml = `<ul style="list-style-type: ${listStyle}; margin-left: 20px;">${items.map(item => renderListItem(item)).join('')}</ul>`;
      } else if (contentType === 'table') {
        const tableData = section.variables?.tableData as TableData;
        if (tableData && tableData.rows) {
          contentHtml = generateTableHTML(tableData);
        }
      }
      
      return `<div style="${styleString}"><div style="font-weight: bold; margin-bottom: 8px;">${label}</div>${contentHtml}</div>`;
    }
    
    // Handle standalone table sections
    if (section.type === 'table' && section.variables?.tableData) {
      const tableData = section.variables.tableData as TableData;
      const tableHtml = generateTableHTML(tableData);
      return `<div style="${styleString}">${tableHtml}</div>`;
    }
    
    // Handle banner sections (table with yellow background, no border)
    if (section.type === 'banner') {
      const tableData = section.variables?.tableData as TableData;
      if (tableData && tableData.rows) {
        const tableHtml = generateTableHTML(tableData, { autoWidth: true });
        return `<div style="${styleString}">${tableHtml}</div>`;
      }
      // Fallback if no tableData
      return `<div style="${styleString}"><table style="border-collapse: collapse; width: auto;"><tr><td style="background-color: #FFFF00; padding: 8px;">EFT</td></tr></table></div>`;
    }
    
    // Handle list sections with proper rendering
    const listTypes = ['bullet-list-circle', 'bullet-list-disc', 'bullet-list-square', 'number-list-1', 'number-list-i', 'number-list-a'];
    if (listTypes.includes(section.type) && section.variables?.items) {
      const items = section.variables.items as string[];
      const listStyleMap: Record<string, string> = {
        'bullet-list-circle': 'circle',
        'bullet-list-disc': 'disc',
        'bullet-list-square': 'square',
        'number-list-1': 'decimal',
        'number-list-i': 'lower-roman',
        'number-list-a': 'lower-alpha'
      };
      const listStyle = listStyleMap[section.type] || 'disc';
      const isOrdered = section.type.startsWith('number-list');
      const tag = isOrdered ? 'ol' : 'ul';
      const listHtml = `<${tag} style="list-style-type: ${listStyle}; margin-left: 20px;">${items.map(item => `<li>${item}</li>`).join('')}</${tag}>`;
      return `<div style="${styleString}">${listHtml}</div>`;
    }
    
    // Handle mixed-content sections
    if (section.type === 'mixed-content' && section.variables?.content) {
      let mixedContent = thymeleafToPlaceholder(section.variables.content as string);
      
      const isEmptyValue = (value: any): boolean => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        return false;
      };
      
      mixedContent = mixedContent.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        if (section.variables && !isEmptyValue(section.variables[varName])) {
          return String(section.variables[varName]);
        }
        return match;
      });
      
      mixedContent = mixedContent
        .replace(/\{\{if\s+(\w+)\}\}/g, '<span style="display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; background-color: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd;">if $1</span>')
        .replace(/\{\{\/if\}\}/g, '<span style="display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; background-color: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd;">/if</span>')
        .replace(/\{\{each\s+(\w+)\s+in\s+(\w+)\}\}/g, '<span style="display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; background-color: #dcfce7; color: #15803d; border: 1px solid #86efac;">each $1 in $2</span>')
        .replace(/\{\{\/each\}\}/g, '<span style="display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; background-color: #dcfce7; color: #15803d; border: 1px solid #86efac;">/each</span>')
        .replace(/\n/g, '<br/>');
      
      return `<div style="${styleString}"><div style="padding: 8px; line-height: 1.6;">${mixedContent}</div></div>`;
    }
    
    // For heading and text sections with variables
    const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
    const isInlinePlaceholder = inlinePlaceholderTypes.includes(section.type);
    
    let displayContent = section.content;
    if (isInlinePlaceholder && section.variables && Object.keys(section.variables).length > 0) {
      displayContent = replaceWithDefaults(section.content, section.variables);
    } else {
      displayContent = thymeleafToPlaceholder(section.content);
    }
    
    return `<div style="${styleString}">${displayContent}</div>`;
  };
  
  // Generate all sections HTML as a single string
  const previewHtml = useMemo(() => {
    return allSections.map(section => generateSectionHtml(section)).join('');
  }, [allSections]);
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Preview</h2>
        <p className={styles.subtitle}>
          Live preview of your static template
        </p>
      </div>

      <div className={styles.previewArea}>
        <div className={styles.iframeWrapper}>
          <IframePreview html={previewHtml} title="Template Preview" />
        </div>
      </div>
    </div>
  );
};
