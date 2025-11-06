import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { sectionTypes } from "@/data/sectionTypes";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";

const DraggableSection = ({ section }: { section: typeof sectionTypes[0] }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${section.type}`,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all hover:border-primary/50 group"
    >
      <div className="flex items-center gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
        <section.icon className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{section.label}</p>
          <p className="text-xs text-muted-foreground truncate">{section.description}</p>
        </div>
      </div>
    </Card>
  );
};

export const SectionLibrary = () => {
  const groupedSections = sectionTypes.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, typeof sectionTypes>);

  const categoryLabels: Record<string, string> = {
    text: "Text",
    media: "Media",
    layout: "Layout",
    interactive: "Interactive"
  };

  return (
    <div className="w-80 border-r bg-card/30 backdrop-blur-sm overflow-auto">
      <div className="p-4 border-b sticky top-0 bg-card/80 backdrop-blur-sm z-10">
        <h2 className="font-semibold text-lg">Section Library</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Drag sections to add them
        </p>
      </div>

      <div className="p-4 space-y-6">
        {Object.entries(groupedSections).map(([category, categorySections]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {categoryLabels[category]}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {categorySections.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {categorySections.map((section) => (
                <DraggableSection key={section.type} section={section} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
