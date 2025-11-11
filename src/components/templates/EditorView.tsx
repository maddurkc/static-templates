import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Section } from "@/types/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";
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
  onAddChild?: (parentId: string) => void;
  renderChildren?: (section: Section) => React.ReactNode;
}

const SortableSection = ({
  section,
  isSelected,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onAddChild,
  renderChildren
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

  const isContainer = section.type === 'container';
  
  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: section.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative border-2 rounded-lg mb-3 bg-card transition-all",
        isSelected ? "border-primary shadow-lg shadow-primary/20" : "border-border hover:border-primary/50",
        isDragging && "opacity-50",
        isContainer && "bg-muted/20",
        isContainer && isDropOver && "border-primary border-dashed bg-primary/10"
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-4 cursor-grab active:cursor-grabbing p-1 hover:bg-primary/10 rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Container Header */}
      {isContainer && (
        <div 
          ref={setDropRef}
          className={cn(
            "flex items-center gap-2 p-3 pl-10 pr-32 bg-muted/30 border-b border-border transition-colors",
            isDropOver && "bg-primary/10 border-primary"
          )}
        >
          <Badge variant="outline" className="text-xs">Container</Badge>
          <span className="text-sm text-muted-foreground">
            {section.children?.length || 0} section{section.children?.length !== 1 ? 's' : ''} inside
          </span>
          {isDropOver && (
            <span className="text-xs text-primary font-medium ml-auto">Drop here to add</span>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn("pl-10 pr-32", isContainer ? "p-4" : "p-4")}>
        {!isContainer && (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: section.content }}
            style={section.styles as React.CSSProperties}
          />
        )}
        
        {/* Nested Children for Container */}
        {isContainer && renderChildren && (
          <div className="space-y-2">
            {section.children && section.children.length > 0 ? (
              renderChildren(section)
            ) : (
              <div className="text-center py-8 border-2 border-dashed rounded-lg border-border bg-background">
                <p className="text-sm text-muted-foreground">Empty container</p>
                <p className="text-xs text-muted-foreground mt-1">Add sections below</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute right-2 top-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isContainer && onAddChild && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(section.id);
            }}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
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
  headerSection: Section;
  footerSection: Section;
  sections: Section[];
  selectedSection: Section | null;
  onSelectSection: (section: Section) => void;
  onDeleteSection: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onAddChildToContainer?: (parentId: string) => void;
}

export const EditorView = ({
  headerSection,
  footerSection,
  sections,
  selectedSection,
  onSelectSection,
  onDeleteSection,
  onMoveUp,
  onMoveDown,
  onAddChildToContainer
}: EditorViewProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'editor-drop-zone',
  });

  const renderNestedChildren = (section: Section) => {
    if (!section.children || section.children.length === 0) return null;
    
    return (
      <div className="space-y-2 ml-4">
        {section.children.map((child, index) => (
          <div key={child.id} className="border-l-2 border-primary/30 pl-3">
            <div
              className={cn(
                "p-3 rounded border bg-background hover:border-primary/50 transition-colors cursor-pointer",
                selectedSection?.id === child.id ? "border-primary shadow-md" : "border-border"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSection(child);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="text-xs">
                  {child.type}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSection(child.id);
                  }}
                  className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div
                className="prose prose-sm max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: child.content }}
                style={child.styles as React.CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStaticSection = (section: Section, label: string) => (
    <div 
      onClick={() => onSelectSection(section)}
      className={cn(
        "p-4 rounded-lg border-2 transition-all cursor-pointer bg-muted/30",
        selectedSection?.id === section.id 
          ? 'border-primary shadow-lg' 
          : 'border-muted-foreground/20 hover:border-muted-foreground/40'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase">{label}</span>
          <span className="text-xs text-muted-foreground">(Cannot be deleted or moved)</span>
        </div>
      </div>
      <div 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: section.content }}
        style={section.styles as React.CSSProperties}
      />
    </div>
  );

  return (
    <div className="p-8 space-y-4" ref={setNodeRef}>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Static Header */}
        {renderStaticSection(headerSection, 'Header')}
        
        {/* User Sections */}
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
              onAddChild={onAddChildToContainer}
              renderChildren={renderNestedChildren}
            />
          ))
        )}
        
        {/* Static Footer */}
        {renderStaticSection(footerSection, 'Footer')}
      </div>
    </div>
  );
};
