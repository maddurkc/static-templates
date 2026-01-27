import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Section } from "@/types/section";
import { GlobalApiConfig } from "@/types/global-api-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, Trash2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { thymeleafToPlaceholder, replaceWithDefaults } from "@/lib/thymeleafUtils";
import { generateTableHTML, TableData } from "@/lib/tableUtils";
import { InlineSectionControls } from "./InlineSectionControls";
import { SectionContextMenu } from "./SectionContextMenu";
import styles from "./EditorView.module.scss";


interface SortableSectionProps {
  section: Section;
  isSelected: boolean;
  hasError: boolean;
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
  globalApiConfig?: GlobalApiConfig;
}

const SortableSection = ({
  section,
  isSelected,
  hasError,
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
  globalApiConfig,
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
        data-section-id={section.id}
        className={cn(
          "group relative",
          styles.section,
          isSelected && styles.selected,
          isDragging && styles.dragging,
          isContainer && styles.container,
          isContainer && isDropOver && styles.dropOver,
          hasError && styles.hasError
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
                  __html: generateTableHTML(section.variables.tableData as TableData)
                }}
              />
            ) : section.variables.contentType === 'list' && section.variables.items ? (
              <div 
                className={styles.listPreview}
                dangerouslySetInnerHTML={{ 
                  __html: (() => {
                    const items = section.variables.items as any[];
                    const listStyle = (section.variables.listStyle as string) || 'circle';
                    if (!items || items.length === 0) {
                      return '<p class="text-muted-foreground p-2">No list items</p>';
                    }
                    
                    const isNumbered = ['decimal', 'lower-roman', 'upper-roman', 'lower-alpha', 'upper-alpha'].includes(listStyle);
                    const tag = isNumbered ? 'ol' : 'ul';
                    
                    const renderItems = (itemList: any[]): string => {
                      return itemList.map(item => {
                        const text = typeof item === 'string' ? item : item.text || '';
                        const styles: string[] = [];
                        if (item.color) styles.push(`color: ${item.color}`);
                        if (item.bold) styles.push('font-weight: bold');
                        if (item.italic) styles.push('font-style: italic');
                        if (item.underline) styles.push('text-decoration: underline');
                        if (item.backgroundColor) styles.push(`background-color: ${item.backgroundColor}`);
                        if (item.fontSize) styles.push(`font-size: ${item.fontSize}`);
                        const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
                        
                        let childHtml = '';
                        if (item.children && item.children.length > 0) {
                          childHtml = `<${tag} style="list-style-type: ${listStyle}; margin-left: 1rem;">${renderItems(item.children)}</${tag}>`;
                        }
                        
                        return `<li${styleAttr}>${text}${childHtml}</li>`;
                      }).join('');
                    };
                    
                    return `<${tag} style="list-style-type: ${listStyle}; padding-left: 1.5rem;">${renderItems(items)}</${tag}>`;
                  })()
                }}
              />
            ) : section.variables.contentType === 'text' && section.variables.content ? (
              <div className={styles.contentPlaceholder}>
                {String(section.variables.content).substring(0, 100)}{String(section.variables.content).length > 100 ? '...' : ''}
              </div>
            ) : (
              <div className={styles.contentPlaceholder}>
                {'{'}content{'}'} - {section.variables.contentType || 'text'}
              </div>
            )}
          </div>
        ) : !isContainer && section.type === 'table' && section.variables?.tableData ? (
          // Handle standalone table sections
          <div
            className={styles.tablePreview}
            dangerouslySetInnerHTML={{ 
              __html: generateTableHTML(section.variables.tableData as TableData)
            }}
          />
        ) : !isContainer && ['bullet-list-circle', 'bullet-list-disc', 'bullet-list-square', 'number-list-1', 'number-list-i', 'number-list-a'].includes(section.type) && section.variables?.items ? (
          // Handle standalone list sections
          <div 
            className={styles.listPreview}
            dangerouslySetInnerHTML={{ 
              __html: (() => {
                const items = section.variables.items as any[];
                // Determine list style from section type
                let listStyle = 'disc';
                if (section.type === 'bullet-list-circle') listStyle = 'circle';
                else if (section.type === 'bullet-list-disc') listStyle = 'disc';
                else if (section.type === 'bullet-list-square') listStyle = 'square';
                else if (section.type === 'number-list-1') listStyle = 'decimal';
                else if (section.type === 'number-list-i') listStyle = 'lower-roman';
                else if (section.type === 'number-list-a') listStyle = 'lower-alpha';
                
                if (!items || items.length === 0) {
                  return '<p class="text-muted-foreground p-2">No list items</p>';
                }
                
                const isNumbered = ['decimal', 'lower-roman', 'upper-roman', 'lower-alpha', 'upper-alpha'].includes(listStyle);
                const tag = isNumbered ? 'ol' : 'ul';
                
                const renderItems = (itemList: any[]): string => {
                  return itemList.map(item => {
                    const text = typeof item === 'string' ? item : item.text || '';
                    const styles: string[] = [];
                    if (item.color) styles.push(`color: ${item.color}`);
                    if (item.bold) styles.push('font-weight: bold');
                    if (item.italic) styles.push('font-style: italic');
                    if (item.underline) styles.push('text-decoration: underline');
                    if (item.backgroundColor) styles.push(`background-color: ${item.backgroundColor}`);
                    if (item.fontSize) styles.push(`font-size: ${item.fontSize}`);
                    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
                    
                    let childHtml = '';
                    if (item.children && item.children.length > 0) {
                      childHtml = `<${tag} style="list-style-type: ${listStyle}; margin-left: 1rem;">${renderItems(item.children)}</${tag}>`;
                    }
                    
                    return `<li${styleAttr}>${text}${childHtml}</li>`;
                  }).join('');
                };
                
                return `<${tag} style="list-style-type: ${listStyle}; padding-left: 1.5rem;">${renderItems(items)}</${tag}>`;
              })()
            }}
          />
        ) : !isContainer && (
          <>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: (() => {
                  // For heading and text sections with variables, show default values (but keep Thymeleaf in section.content)
                  const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
                  const isInlinePlaceholder = inlinePlaceholderTypes.includes(section.type);
                  
                  if (isInlinePlaceholder && section.variables && Object.keys(section.variables).length > 0) {
                    // Display default values from variables, actual content still has Thymeleaf tags
                    return replaceWithDefaults(section.content, section.variables);
                  }
                  
                  // For mixed-content sections, show the content with placeholders as badges
                  if (section.type === 'mixed-content' && section.variables?.content) {
                    const content = thymeleafToPlaceholder(section.variables.content as string);
                    return content
                      .replace(/\{\{(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">${$1}</span>')
                      .replace(/\{\{if\s+(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 border border-blue-300">if $1</span>')
                      .replace(/\{\{\/if\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 border border-blue-300">/if</span>')
                      .replace(/\{\{each\s+(\w+)\s+in\s+(\w+)\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-green-100 text-green-700 border border-green-300">each $1 in $2</span>')
                      .replace(/\{\{\/each\}\}/g, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-green-100 text-green-700 border border-green-300">/each</span>')
                      .replace(/\n/g, '<br/>');
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
            {(section.content.includes('{{') || section.content.includes('<th:utext=') || 
              (section.type === 'mixed-content' && section.variables?.content && 
               (String(section.variables.content).includes('{{') || String(section.variables.content).includes('<th:utext=')))) && (
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
          globalApiConfig={globalApiConfig}
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
  sectionIdsWithErrors?: Set<string>;
  onSelectSection: (section: Section) => void;
  onUpdateSection: (section: Section) => void;
  onDeleteSection: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onAddChildToContainer?: (parentId: string) => void;
  onDuplicateSection: (id: string) => void;
  onCopyStyles: (id: string) => void;
  onPasteStyles: (id: string) => void;
  globalApiConfig?: GlobalApiConfig;
}

export const EditorView = ({
  headerSection,
  footerSection,
  sections,
  selectedSection,
  sectionIdsWithErrors = new Set(),
  onSelectSection,
  onUpdateSection,
  onDeleteSection,
  onMoveUp,
  onMoveDown,
  onAddChildToContainer,
  onDuplicateSection,
  onCopyStyles,
  onPasteStyles,
  globalApiConfig,
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
              hasError={sectionIdsWithErrors.has(section.id)}
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
              globalApiConfig={globalApiConfig}
            />
          ))
        )}
        
        {/* Static Footer */}
        {renderStaticSection(footerSection, 'Footer')}
      </div>
    </div>
  );
};
