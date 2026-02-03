import { useEffect, useRef } from "react";
import { Section } from "@/types/section";
import { renderSectionContent } from "@/lib/templateUtils";
import { thymeleafToPlaceholder, replaceWithDefaults } from "@/lib/thymeleafUtils";
import { generateTableHTML, TableData } from "@/lib/tableUtils";
import { wrapSectionInTable } from "@/lib/templateUtils";
import styles from "./PreviewView.module.scss";

interface PreviewViewProps {
  headerSection: Section;
  footerSection: Section;
  sections: Section[];
  selectedSectionId?: string | null;
  hoveredSectionId?: string | null;
  onHoverSection?: (id: string | null) => void;
}

export const PreviewView = ({ headerSection, footerSection, sections, selectedSectionId, hoveredSectionId, onHoverSection }: PreviewViewProps) => {
  const allSections = [headerSection, ...sections, footerSection];
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to selected section and highlight it
  useEffect(() => {
    if (selectedSectionId && containerRef.current) {
      const element = containerRef.current.querySelector(`[data-preview-section-id="${selectedSectionId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight animation
        element.classList.add(styles.highlighted);
        const timeout = setTimeout(() => {
          element.classList.remove(styles.highlighted);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [selectedSectionId]);
  
  // Helper function to get HTML string for a section (used with wrapSectionInTable)
  const getSectionHtml = (section: Section): string => {
    const defaultStyles: Record<string, string> = {
      margin: '10px 0',
      padding: '8px',
    };
    const combinedStyles = { ...defaultStyles, ...section.styles };
    const styleString = Object.entries(combinedStyles)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join('; ');
    
    // Handle container sections with nested children
    if (section.type === 'container' && section.children && section.children.length > 0) {
      const childrenHtml = section.children.map(child => getSectionHtml(child)).join('');
      return `<div style="margin: 15px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;">${childrenHtml}</div>`;
    }
    
    // Handle labeled-content sections with special rendering
    if (section.type === 'labeled-content') {
      return getLabeledContentHtml(section, combinedStyles);
    }
    
    // Handle line-break sections (empty vertical gap)
    if (section.type === 'line-break') {
      return '<div style="height: 16px;"></div>';
    }
    
    // Handle separator-line sections (horizontal rule)
    if (section.type === 'separator-line') {
      return '<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;"/>';
    }
    
    // Handle standalone table sections and banner sections
    if ((section.type === 'table' || section.type === 'banner') && section.variables?.tableData) {
      const tableData = section.variables.tableData as TableData;
      const tableHtml = generateTableHTML(tableData);
      return `<div style="${styleString}">${tableHtml}</div>`;
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
    
    // Handle mixed-content sections - show content with default values or placeholders
    if (section.type === 'mixed-content' && section.variables?.content) {
      let mixedContent = thymeleafToPlaceholder(section.variables.content as string);
      
      // Helper to check if value is empty
      const isEmptyValue = (value: any): boolean => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string' && value.trim() === '') return true;
        return false;
      };
      
      // Replace placeholders with default values if available, else keep {{placeholder}}
      mixedContent = mixedContent.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        // Check if we have a non-empty default value for this placeholder
        if (section.variables && !isEmptyValue(section.variables[varName])) {
          return String(section.variables[varName]);
        }
        // If no default value, keep as {{placeholder}}
        return match;
      });
      
      // Handle special control structures (if/each)
      mixedContent = mixedContent
        .replace(/\{\{if\s+(\w+)\}\}/g, '<span style="display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; background-color: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd;">if $1</span>')
        .replace(/\{\{\/if\}\}/g, '<span style="display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; background-color: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd;">/if</span>')
        .replace(/\{\{each\s+(\w+)\s+in\s+(\w+)\}\}/g, '<span style="display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; background-color: #dcfce7; color: #15803d; border: 1px solid #86efac;">each $1 in $2</span>')
        .replace(/\{\{\/each\}\}/g, '<span style="display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; background-color: #dcfce7; color: #15803d; border: 1px solid #86efac;">/each</span>')
        .replace(/\n/g, '<br/>');
      
      return `<div style="${styleString}; padding: 8px; line-height: 1.6;">${mixedContent}</div>`;
    }
    
    // Handle CTA text sections - render as styled link
    if (section.type === 'cta-text') {
      const ctaText = (section.variables?.ctaText as string) || 'Call to action&nbsp;>';
      const ctaUrl = (section.variables?.ctaUrl as string) || '#';
      return `<p style="margin: 0; margin-bottom: 0px;"><a href="${ctaUrl}" style="font-size: 14px; color: #5A469B; font-family: 'Wells Fargo Sans', Arial, Helvetica, sans-serif; line-height: 24px; font-weight: bold; text-decoration: underline;">${ctaText}</a></p>`;
    }
    
    // Handle program-name sections
    if (section.type === 'program-name') {
      const programName = (section.variables?.programNameText as string) || 'Program Name';
      return `<font style="font-size: 14px; line-height: 21px; color: #141414; font-weight: bold; font-family: 'Wells Fargo Sans', Arial, Helvetica, sans-serif;">${programName}</font>`;
    }
    
    // For heading and text sections with variables, show default values (but section.content keeps Thymeleaf)
    const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
    const isInlinePlaceholder = inlinePlaceholderTypes.includes(section.type);
    
    // Display logic: show default values from variables or {{placeholder}} if empty
    let displayContent = section.content;
    if (isInlinePlaceholder && section.variables && Object.keys(section.variables).length > 0) {
      // Replace Thymeleaf tags with actual default values for display, or {{placeholder}} if empty
      displayContent = replaceWithDefaults(section.content, section.variables);
    } else {
      // For other sections, convert Thymeleaf to {{placeholder}} format
      displayContent = thymeleafToPlaceholder(section.content);
    }
    
    return `<div style="${styleString}">${displayContent}</div>`;
  };
  
  // Helper function to generate labeled-content HTML
  const getLabeledContentHtml = (section: Section, combinedStyles: Record<string, string | undefined>): string => {
    // Helper to check if value is empty
    const isEmptyValue = (value: any): boolean => {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      return false;
    };
    
    // Get label value - check for labelVariableName first (new pattern), then fall back to label (legacy)
    const labelVariableName = section.variables?.labelVariableName as string;
    let label = 'Label';
    if (labelVariableName && section.variables?.[labelVariableName]) {
      label = String(section.variables[labelVariableName]);
    } else if (section.variables?.label) {
      label = String(section.variables.label);
    }
    
    // Replace Thymeleaf in label with default values or {{placeholder}}
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
      // Get text content - check for textVariableName first (new pattern), then fall back to content (legacy)
      const textVariableName = section.variables?.textVariableName as string;
      let textContent = '';
      if (textVariableName && section.variables?.[textVariableName]) {
        textContent = String(section.variables[textVariableName]);
      } else if (section.variables?.content) {
        // For legacy content with Thymeleaf, resolve the placeholder
        textContent = String(section.variables.content);
        // Replace Thymeleaf <span th:utext="${varName}"/> with actual values or {{placeholder}}
        textContent = textContent.replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (match, varName) => {
          if (section.variables && !isEmptyValue(section.variables[varName])) {
            return String(section.variables[varName]);
          }
          return `{{${varName}}}`;
        });
      }
      
      // Support {{variable}} placeholders in text content - show {{placeholder}} if no value
      textContent = textContent.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        if (section.variables && !isEmptyValue(section.variables[varName])) {
          return String(section.variables[varName]);
        }
        return match; // Keep {{placeholder}} as-is when no value
      });
      contentHtml = `<div style="white-space: pre-wrap; padding-left: 20px; font-family: 'Wells Fargo Sans', Arial, Helvetica, sans-serif; font-size: 14px; line-height: 21px; color: #141414;">${textContent}</div>`;
    } else if (contentType === 'list') {
      const items = (section.variables?.items as any[]) || [];
      const listStyle = (section.variables?.listStyle as string) || 'circle';
      
      const renderListItem = (item: any): string => {
        if (typeof item === 'string') {
          return `<li>${item}</li>`;
        }
        
        const itemStyles = [];
        if (item.color) itemStyles.push(`color: ${item.color}`);
        if (item.bold) itemStyles.push('font-weight: bold');
        if (item.italic) itemStyles.push('font-style: italic');
        if (item.underline) itemStyles.push('text-decoration: underline');
        if (item.backgroundColor) itemStyles.push(`background-color: ${item.backgroundColor}`);
        if (item.fontSize) itemStyles.push(`font-size: ${item.fontSize}`);
        const styleAttr = itemStyles.length > 0 ? ` style="${itemStyles.join('; ')}"` : '';
        
        let html = `<li${styleAttr}>${item.text}`;
        if (item.children && item.children.length > 0) {
          html += `<ul style="list-style-type: ${listStyle}; margin-left: 20px; margin-top: 4px;">`;
          html += item.children.map((child: any) => renderListItem(child)).join('');
          html += '</ul>';
        }
        html += '</li>';
        return html;
      };
      
      contentHtml = `<ul style="list-style-type: ${listStyle}; margin-left: 20px; padding-left: 20px; font-family: 'Wells Fargo Sans', Arial, Helvetica, sans-serif; font-size: 14px; line-height: 21px; color: #141414;">${items.map(item => renderListItem(item)).join('')}</ul>`;
    } else if (contentType === 'table') {
      const tableData = section.variables?.tableData as TableData;
      if (tableData && tableData.rows) {
        contentHtml = generateTableHTML(tableData);
      }
    }
    
    const styleString = Object.entries(combinedStyles)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join('; ');
    
    return `<div style="${styleString}"><div style="font-family: 'Wells Fargo Sans', Arial, Helvetica, sans-serif; font-size: 18px; line-height: 27px; font-weight: bold; color: #D71E28; margin: 0; margin-bottom: 10px;">${label}</div>${contentHtml}</div>`;
  };
  
  
  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <h2 className={styles.title}>Preview</h2>
        <p className={styles.subtitle}>
          Live preview of your static template
        </p>
      </div>

      <div className={styles.previewArea}>
        <div className={styles.previewContent}>
          {/* Global wrapper table */}
          <table cellPadding={0} cellSpacing={0} style={{ border: 'none', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <tbody>
              <tr>
                <td style={{ padding: 0 }}>
                  {allSections.map((section, index) => (
                    <div 
                      key={section.id}
                      data-preview-section-id={section.id}
                      className={`${styles.previewSectionWrapper} ${selectedSectionId === section.id ? styles.selected : ''} ${hoveredSectionId === section.id && selectedSectionId !== section.id ? styles.hovered : ''}`}
                      dangerouslySetInnerHTML={{ __html: wrapSectionInTable(getSectionHtml(section), index === 0) }}
                      onMouseEnter={() => onHoverSection?.(section.id)}
                      onMouseLeave={() => onHoverSection?.(null)}
                    />
                  ))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
