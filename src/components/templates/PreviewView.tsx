import { Section } from "@/types/section";
import { renderSectionContent } from "@/lib/templateUtils";

interface PreviewViewProps {
  headerSection: Section;
  footerSection: Section;
  sections: Section[];
}

export const PreviewView = ({ headerSection, footerSection, sections }: PreviewViewProps) => {
  const allSections = [headerSection, ...sections, footerSection];
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
          {allSections.map((section) => {
            const defaultStyles = {
              margin: '10px 0',
              padding: '8px',
            };
            const combinedStyles = { ...defaultStyles, ...section.styles };
            
            return (
              <div
                key={section.id}
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: renderSectionContent(section) }}
                style={combinedStyles as React.CSSProperties}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
