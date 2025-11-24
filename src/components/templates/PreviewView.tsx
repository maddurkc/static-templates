import { Section } from "@/types/section";
import { renderSectionContent } from "@/lib/templateUtils";
import { thymeleafToPlaceholder } from "@/lib/thymeleafUtils";
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
    
    // Regular sections
    const renderedContent = renderSectionContent(section);
    const variablePlaceholderStyle = 'display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-family: monospace; background-color: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); border: 1px solid hsl(var(--primary) / 0.2);';
    const displayContent = thymeleafToPlaceholder(renderedContent)
      .replace(/\{\{(\w+)\}\}/g, `<span style="${variablePlaceholderStyle}">$\{$1\}</span>`);
    
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
