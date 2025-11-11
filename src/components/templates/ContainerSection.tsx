import { Section } from "@/types/section";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContainerSectionProps {
  section: Section;
  onDelete: (id: string) => void;
  onSelect: (section: Section) => void;
  onAddChild: (parentId: string) => void;
  isSelected: boolean;
  children?: React.ReactNode;
}

export const ContainerSection = ({
  section,
  onDelete,
  onSelect,
  onAddChild,
  isSelected,
  children
}: ContainerSectionProps) => {
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Card
        className={`mb-2 transition-all ${
          isSelected 
            ? 'ring-2 ring-primary border-primary shadow-md' 
            : 'border-border hover:border-primary/50 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 p-3 bg-muted/30">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing hover:bg-muted rounded p-1"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="flex-1 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Container</Badge>
            <span className="text-sm font-medium">
              {section.children?.length || 0} sections inside
            </span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddChild(section.id)}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Section
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSelect(section)}
            className={`h-7 px-2 text-xs ${isSelected ? 'bg-primary/10' : ''}`}
          >
            Edit
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(section.id)}
            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        
        {section.children && section.children.length > 0 && (
          <div className="p-3 border-t border-dashed border-border/50 bg-background">
            {children}
          </div>
        )}
      </Card>
    </div>
  );
};
