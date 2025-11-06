import { Section } from "@/types/section";
import { renderSectionContent } from "@/lib/templateUtils";

interface PreviewViewProps {
  sections: Section[];
}

export const PreviewView = ({ sections }: PreviewViewProps) => {
  return (
    <div className="h-full">
      <div className="sticky top-0 p-4 border-b bg-white z-10">
        <h2 className="font-semibold text-lg">Preview</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Live preview of your template
        </p>
      </div>

      <div className="p-8">
        {sections.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>No sections yet</p>
          </div>
        ) : (
          <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.id}
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: renderSectionContent(section) }}
            style={section.styles as React.CSSProperties}
          />
        ))}
          </div>
        )}
      </div>
    </div>
  );
};
