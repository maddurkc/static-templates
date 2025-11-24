import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Section } from "@/types/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { thymeleafToPlaceholder } from "@/lib/thymeleafUtils";
import styles from "./EditorView.module.scss";


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
        "group relative",
        styles.section,
        isSelected && styles.selected,
        isDragging && styles.dragging,
        isContainer && styles.container,
        isContainer && isDropOver && styles.dropOver
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={styles.dragHandle}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Container Header */}
      {isContainer && (
        <div 
          ref={setDropRef}
          className={cn(
            styles.containerHeader,
            isDropOver && styles.dropOver
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
      <div className={cn(styles.sectionContent, isContainer && styles.containerContent)}>
        {!isContainer && section.type === 'labeled-content' && section.variables?.label ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="font-semibold text-base"
                dangerouslySetInnerHTML={{ 
                  __html: thymeleafToPlaceholder(String(section.variables.label)).replace(
                    /\{\{(\w+)\}\}/g,
                    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">${$1}</span>'
                  )
                }}
              />
              <Badge variant="secondary" className="text-xs">
                {section.variables.contentType === 'text' ? 'Text' : section.variables.contentType === 'list' ? 'List' : 'Table'}
              </Badge>
              {String(section.variables.label).includes('{{') && (
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  Dynamic Label
                </Badge>
              )}
              {!section.isLabelEditable && (
                <Badge variant="outline" className="text-xs">
                  Label locked
                </Badge>
              )}
            </div>
            {section.variables.contentType === 'table' && section.variables.tableData ? (
              <div 
                className="text-sm border rounded overflow-x-auto"
                dangerouslySetInnerHTML={{ 
                  __html: (() => {
                    const tableData = section.variables.tableData as any;
                    if (!tableData.headers || tableData.headers.length === 0) {
                      return '<p class="text-muted-foreground p-2">No table data</p>';
                    }
                    
                    let html = '<table class="w-full border-collapse"><thead><tr>';
                    (tableData.headers || []).forEach((header: string) => {
                      html += `<th class="border p-2 bg-muted text-left font-semibold">${header}</th>`;
                    });
                    html += '</tr></thead><tbody>';
                    (tableData.rows || []).forEach((row: string[]) => {
                      html += '<tr>';
                      row.forEach((cell: string) => {
                        html += `<td class="border p-2">${cell}</td>`;
                      });
                      html += '</tr>';
                    });
                    html += '</tbody></table>';
                    return html;
                  })()
                }}
              />
            ) : (
              <div className="text-sm text-muted-foreground pl-4 border-l-2 border-muted">
                {'{'}content{'}'} - {section.variables.contentType || 'text'}
              </div>
            )}
          </div>
        ) : !isContainer && (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: thymeleafToPlaceholder(section.content)
                .replace(/\{\{(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">${$1}</span>')
                .replace(/\{\{if\s+(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 border border-blue-300">if $1</span>')
                .replace(/\{\{\/if\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 border border-blue-300">/if</span>')
                .replace(/\{\{each\s+(\w+)\s+in\s+(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-green-100 text-green-700 border border-green-300">each $1 in $2</span>')
                .replace(/\{\{\/each\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-green-100 text-green-700 border border-green-300">/each</span>')
            }}
            style={section.styles as React.CSSProperties}
          />
        )}
        
        {/* Nested Children for Container */}
        {isContainer && renderChildren && (
          <div className="space-y-2">
            {section.children && section.children.length > 0 ? (
              renderChildren(section)
            ) : (
              <div className={styles.emptyContainer}>
                <p className={styles.emptyContainerText}>Empty container</p>
                <p className={styles.emptyContainerHint}>Add sections below</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
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
        <div className={styles.selectedIndicator} />
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
      <div className={styles.nestedChildren}>
        {section.children.map((child, index) => (
          <div key={child.id}>
            <div
              className={cn(
                styles.nestedSection,
                selectedSection?.id === child.id && styles.selected
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSection(child);
              }}
            >
              <div className={styles.nestedHeader}>
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
                dangerouslySetInnerHTML={{ 
                  __html: thymeleafToPlaceholder(child.content)
                    .replace(/\{\{(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">${$1}</span>')
                }}
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
        styles.staticSection,
        selectedSection?.id === section.id && styles.selected
      )}
    >
      <div className={styles.staticHeader}>
        <div className={styles.staticLabel}>
          <span>{label}</span>
          <span className={styles.staticNote}>(Cannot be deleted or moved)</span>
        </div>
      </div>
      <div 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ 
          __html: thymeleafToPlaceholder(section.content)
            .replace(/\{\{(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">${$1}</span>')
        }}
        style={section.styles as React.CSSProperties}
      />
    </div>
  );

  return (
    <div className={styles.container} ref={setNodeRef}>
      <div className={styles.innerContainer}>
        {/* Static Header */}
        {renderStaticSection(headerSection, 'Header')}
        
        {/* User Sections */}
        {sections.length === 0 ? (
          <div className={cn(
            styles.dropZone,
            isOver && styles.dropOver
          )}>
            <p className={styles.dropZoneText}>
              Drop sections here to start building
            </p>
            <p className={styles.dropZoneHint}>
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
