import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Section } from "@/types/section";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableSectionProps {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const SortableSection = ({
  section,
  isSelected,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: SortableSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative border-2 rounded-lg p-4 mb-3 bg-card transition-all",
        isSelected ? "border-primary shadow-lg shadow-primary/20" : "border-border hover:border-primary/50",
        isDragging && "opacity-50"
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 hover:bg-primary/10 rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="pl-8 pr-32">
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: section.content }}
          style={section.styles as React.CSSProperties}
        />
      </div>

      {/* Controls */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={isFirst}
          className="h-8 w-8"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={isLast}
          className="h-8 w-8"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute -left-1 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-accent rounded-l" />
      )}
    </div>
  );
};

interface EditorViewProps {
  sections: Section[];
  selectedSection: Section | null;
  onSelectSection: (section: Section) => void;
  onDeleteSection: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export const EditorView = ({
  sections,
  selectedSection,
  onSelectSection,
  onDeleteSection,
  onMoveUp,
  onMoveDown
}: EditorViewProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'editor-drop-zone',
  });

  return (
    <div className="p-8" ref={setNodeRef}>
      <div className="max-w-4xl mx-auto">
        {sections.length === 0 ? (
          <div className={cn(
            "text-center py-20 border-2 border-dashed rounded-lg transition-all",
            isOver ? "border-primary bg-primary/10" : "border-border bg-muted/20"
          )}>
            <p className="text-muted-foreground text-lg">
              Drop sections here to start building
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Open Section Library and drag sections here
            </p>
          </div>
        ) : (
          sections.map((section, index) => (
            <SortableSection
              key={section.id}
              section={section}
              isSelected={selectedSection?.id === section.id}
              onSelect={() => onSelectSection(section)}
              onDelete={() => onDeleteSection(section.id)}
              onMoveUp={() => onMoveUp(section.id)}
              onMoveDown={() => onMoveDown(section.id)}
              isFirst={index === 0}
              isLast={index === sections.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
};
