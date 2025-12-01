import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Section } from "@/types/section";
import { ApiConfig } from "@/types/api-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, Trash2, Settings2, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import { thymeleafToPlaceholder, replaceWithDefaults } from "@/lib/thymeleafUtils";
import { InlineSectionControls } from "./InlineSectionControls";
import { SectionContextMenu } from "./SectionContextMenu";
import styles from "./EditorView.module.scss";


interface SortableSectionProps {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (section: Section) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onAddChild?: (parentId: string) => void;
  onDuplicate: (id: string) => void;
  onCopyStyles: (id: string) => void;
  onPasteStyles: (id: string) => void;
  renderChildren?: (section: Section) => React.ReactNode;
  apiConfig: ApiConfig;
  sections: Section[];
  onApiConfigUpdate: (config: ApiConfig) => void;
}

const SortableSection = ({
  section,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onAddChild,
  onDuplicate,
  onCopyStyles,
  onPasteStyles,
  renderChildren,
  apiConfig,
  sections,
  onApiConfigUpdate
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
    <SectionContextMenu
      onDuplicate={() => onDuplicate(section.id)}
      onCopyStyles={() => onCopyStyles(section.id)}
      onPasteStyles={() => onPasteStyles(section.id)}
      onDelete={() => onDelete()}
    >
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
        <GripVertical className={styles.icon} />
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
          <Badge variant="outline" className={styles.containerBadge}>Container</Badge>
          <span className={styles.containerInfo}>
            {section.children?.length || 0} section{section.children?.length !== 1 ? 's' : ''} inside
          </span>
          {isDropOver && (
            <span className={styles.dropHint}>Drop here to add</span>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn(styles.sectionContent, isContainer && styles.containerContent)}>
        {!isContainer && section.type === 'labeled-content' && section.variables?.label ? (
          <div className={styles.labeledContent}>
            <div className={styles.labelRow}>
              <span 
                className={styles.labelText}
                dangerouslySetInnerHTML={{ 
                  __html: thymeleafToPlaceholder(String(section.variables.label)).replace(
                    /\{\{(\w+)\}\}/g,
                    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">${$1}</span>'
                  )
                }}
              />
              <Badge variant="secondary" className={styles.badgeSmall}>
                {section.variables.contentType === 'text' ? 'Text' : section.variables.contentType === 'list' ? 'List' : 'Table'}
              </Badge>
              {String(section.variables.label).includes('{{') && (
                <Badge variant="outline" className={styles.badgeDynamic}>
                  Dynamic Label
                </Badge>
              )}
              {!section.isLabelEditable && (
                <Badge variant="outline" className={styles.badgeSmall}>
                  Label locked
                </Badge>
              )}
            </div>
            {section.variables.contentType === 'table' && section.variables.tableData ? (
              <div 
                className={styles.tablePreview}
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
              <div className={styles.contentPlaceholder}>
                {'{'}content{'}'} - {section.variables.contentType || 'text'}
              </div>
            )}
          </div>
        ) : !isContainer && (
          <>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: (() => {
                  // For inline placeholder sections with variables, show default values
                  const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
                  const isInlinePlaceholder = inlinePlaceholderTypes.includes(section.type);
                  
                  if (isInlinePlaceholder && section.variables && Object.keys(section.variables).length > 0) {
                    return replaceWithDefaults(section.content, section.variables);
                  }
                  
                  // Otherwise show Thymeleaf placeholders as visual badges
                  return thymeleafToPlaceholder(section.content)
                    .replace(/\{\{(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">${$1}</span>')
                    .replace(/\{\{if\s+(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 border border-blue-300">if $1</span>')
                    .replace(/\{\{\/if\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 border border-blue-300">/if</span>')
                    .replace(/\{\{each\s+(\w+)\s+in\s+(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-green-100 text-green-700 border border-green-300">each $1 in $2</span>')
                    .replace(/\{\{\/each\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-green-100 text-green-700 border border-green-300">/each</span>');
                })()
              }}
              style={section.styles as React.CSSProperties}
            />
            {(section.content.includes('{{') || section.content.includes('<th:utext=')) && (
              <Badge variant="outline" className={cn(styles.badgeSmall, "mt-2")}>
                {section.isLabelEditable !== false ? 'Content editable at runtime' : 'Content locked'}
              </Badge>
            )}
          </>
        )}
        
        {/* Nested Children for Container */}
        {isContainer && renderChildren && (
          <div className={styles.nestedContainerWrapper}>
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

      {/* Visual Indicators */}
      <div className="absolute -top-8 left-12 flex items-center gap-1 z-10">
        {section.variables && Object.keys(section.variables).length > 0 && (
          <Badge variant="secondary" className="text-xs">
            <Settings2 className="h-3 w-3 mr-1" />
            Variables
          </Badge>
        )}
        {apiConfig.enabled && apiConfig.mappings?.some(m => m.sectionId === section.id) && (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-300">
            <Plug className="h-3 w-3 mr-1" />
            API
          </Badge>
        )}
        {(section.type === 'labeled-content' || section.content.includes('{{') || section.content.includes('<th:utext=')) && (
          <Badge variant="outline" className="text-xs">
            {section.isLabelEditable !== false ? '✏️ Editable' : '🔒 Locked'}
          </Badge>
        )}
      </div>

      {/* Controls */}
      <div className="absolute -top-8 right-2 flex items-center gap-1 z-10">
        {isContainer && onAddChild && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(section.id);
            }}
            className={styles.addButton}
          >
            <Plus />
            Add
          </Button>
        )}
        <InlineSectionControls
          section={section}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          isFirst={isFirst}
          isLast={isLast}
          apiConfig={apiConfig}
          sections={sections}
          onApiConfigUpdate={onApiConfigUpdate}
        />
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className={styles.selectedIndicator} />
      )}
    </div>
    </SectionContextMenu>
  );
};

interface EditorViewProps {
  headerSection: Section;
  footerSection: Section;
  sections: Section[];
  selectedSection: Section | null;
  onSelectSection: (section: Section) => void;
  onUpdateSection: (section: Section) => void;
  onDeleteSection: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onAddChildToContainer?: (parentId: string) => void;
  onDuplicateSection: (id: string) => void;
  onCopyStyles: (id: string) => void;
  onPasteStyles: (id: string) => void;
  apiConfig: ApiConfig;
  onApiConfigUpdate: (config: ApiConfig) => void;
}

export const EditorView = ({
  headerSection,
  footerSection,
  sections,
  selectedSection,
  onSelectSection,
  onUpdateSection,
  onDeleteSection,
  onMoveUp,
  onMoveDown,
  onAddChildToContainer,
  onDuplicateSection,
  onCopyStyles,
  onPasteStyles,
  apiConfig,
  onApiConfigUpdate
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
                <Badge variant="secondary" className={styles.badgeSmall}>
                  {child.type}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSection(child.id);
                  }}
                  className={styles.deleteButtonSmall}
                >
                  <Trash2 />
                </Button>
              </div>
              <div
                className={styles.nestedContent}
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
        className={styles.staticContent}
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
              onUpdate={onUpdateSection}
              onDelete={() => onDeleteSection(section.id)}
              onMoveUp={() => onMoveUp(section.id)}
              onMoveDown={() => onMoveDown(section.id)}
              isFirst={index === 0}
              isLast={index === sections.length - 1}
              onAddChild={onAddChildToContainer}
              onDuplicate={onDuplicateSection}
              onCopyStyles={onCopyStyles}
              onPasteStyles={onPasteStyles}
              renderChildren={renderNestedChildren}
              apiConfig={apiConfig}
              sections={sections}
              onApiConfigUpdate={onApiConfigUpdate}
            />
          ))
        )}
        
        {/* Static Footer */}
        {renderStaticSection(footerSection, 'Footer')}
      </div>
    </div>
  );
};
