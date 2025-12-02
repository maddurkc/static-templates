import { Section } from "@/types/section";
import { renderSectionContent } from "@/lib/templateUtils";
import { thymeleafToPlaceholder, replaceWithDefaults } from "@/lib/thymeleafUtils";
import styles from "./PreviewView.module.scss";

interface PreviewViewProps {
  headerSection: Section;
  footerSection: Section;
  sections: Section[];
}

export const PreviewView = ({ headerSection, footerSection, sections }: PreviewViewProps) => {
  const allSections = [headerSection, ...sections, footerSection];
  
  const renderSection = (section: Section): JSX.Element => {
    const defaultStyles = {
      margin: '10px 0',
      padding: '8px',
    };
    const combinedStyles = { ...defaultStyles, ...section.styles };
    
    // Handle container sections with nested children
    if (section.type === 'container' && section.children && section.children.length > 0) {
      return (
        <div key={section.id} className={styles.containerSection}>
          {section.children.map(child => renderSection(child))}
        </div>
      );
    }
    
    // Handle labeled-content sections with special rendering
    if (section.type === 'labeled-content') {
      let label = (section.variables?.label as string) || 'Label';
      
      // Replace Thymeleaf in label with default values
      label = label.replace(/<th:utext="\$\{(\w+)\}">/g, (match, varName) => {
        if (section.variables && section.variables[varName] !== undefined) {
          return String(section.variables[varName]);
        }
        return `\${${varName}}`;
      });
      
      const contentType = (section.variables?.contentType as string) || 'text';
      let contentHtml = '';
      
      if (contentType === 'text') {
        let textContent = (section.variables?.content as string) || '';
        // Support {{variable}} placeholders in text content
        textContent = textContent.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
          if (section.variables && section.variables[varName] !== undefined) {
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
        const tableData = section.variables?.tableData as any;
        if (tableData && tableData.headers) {
          let tableHtml = '<table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;"><thead><tr>';
          tableData.headers.forEach((header: string) => {
            tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5; text-align: left;">${header}</th>`;
          });
          tableHtml += '</tr></thead><tbody>';
          (tableData.rows || []).forEach((row: string[]) => {
            tableHtml += '<tr>';
            row.forEach((cell: string) => {
              tableHtml += `<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`;
            });
            tableHtml += '</tr>';
          });
          tableHtml += '</tbody></table>';
          contentHtml = tableHtml;
        }
      }
      
      return (
        <div key={section.id} style={combinedStyles as React.CSSProperties}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</div>
          <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </div>
      );
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
      
      return (
        <div
          key={section.id}
          dangerouslySetInnerHTML={{ __html: listHtml }}
          style={combinedStyles as React.CSSProperties}
        />
      );
    }
    
    // For heading and text sections with variables, show default values (but section.content keeps Thymeleaf)
    const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
    const isInlinePlaceholder = inlinePlaceholderTypes.includes(section.type);
    
    // Display logic: show default values from variables, actual content still has Thymeleaf tags
    let displayContent = section.content;
    if (isInlinePlaceholder && section.variables && Object.keys(section.variables).length > 0) {
      // Replace Thymeleaf tags with actual default values for display only
      displayContent = replaceWithDefaults(section.content, section.variables);
    } else {
      // For other sections, show Thymeleaf placeholders as visual badges
      displayContent = thymeleafToPlaceholder(section.content)
        .replace(/\{\{(\w+)\}\}/g, '<span style="display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; background-color: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); border: 1px solid hsl(var(--primary) / 0.2);">${$1}</span>');
    }
    
    return (
      <div
        key={section.id}
        dangerouslySetInnerHTML={{ __html: displayContent }}
        style={combinedStyles as React.CSSProperties}
      />
    );
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Preview</h2>
        <p className={styles.subtitle}>
          Live preview of your static template
        </p>
      </div>

      <div className={styles.previewArea}>
        <div className={styles.previewContent}>
          {allSections.map((section) => renderSection(section))}
        </div>
      </div>
    </div>
  );
};
