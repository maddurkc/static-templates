import { Section } from "@/types/section";
import { renderSectionContent } from "@/lib/templateUtils";
import { thymeleafToPlaceholder } from "@/lib/thymeleafUtils";

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
        <div
          key={section.id}
          style={{
            margin: '15px 0',
            padding: '15px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            background: '#fafafa'
          }}
        >
          {section.children.map(child => renderSection(child))}
        </div>
      );
    }
    
    // Regular sections
    const renderedContent = renderSectionContent(section);
    const displayContent = thymeleafToPlaceholder(renderedContent)
      .replace(/\{\{(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">${$1}</span>');
    
    return (
      <div
        key={section.id}
        className="[&>h1]:text-3xl [&>h1]:font-bold [&>h2]:text-2xl [&>h2]:font-bold [&>h3]:text-xl [&>h3]:font-semibold [&>h4]:text-lg [&>h4]:font-semibold [&>h5]:text-base [&>h5]:font-medium [&>h6]:text-sm [&>h6]:font-medium [&>p]:text-sm [&>ul]:list-disc [&>ul]:list-inside [&>ul]:text-sm [&>ol]:list-decimal [&>ol]:list-inside [&>ol]:text-sm [&>table]:text-xs [&>table]:border-collapse [&_th]:border [&_th]:p-2 [&_th]:font-semibold [&_td]:border [&_td]:p-2 [&>img]:max-w-full [&>img]:h-auto [&>button]:px-3 [&>button]:py-1.5 [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:rounded [&>a]:text-primary [&>a]:underline"
        dangerouslySetInnerHTML={{ __html: displayContent }}
        style={combinedStyles as React.CSSProperties}
      />
    );
  };
  
  return (
    <div className="h-full">
      <div className="sticky top-0 p-4 border-b bg-white z-10">
        <h2 className="font-semibold text-lg">Preview</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Live preview of your static template
        </p>
      </div>

      <div className="p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
          {allSections.map((section) => renderSection(section))}
        </div>
      </div>
    </div>
  );
};
