import { useState } from "react";
import { Section, ListItemStyle } from "@/types/section";
import { sectionTypes } from "@/data/sectionTypes";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronRight, ChevronDown, Palette, Bold, Italic, Underline } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TableEditor } from "./TableEditor";
import { ThymeleafEditor } from "./ThymeleafEditor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import styles from "./VariableEditor.module.scss";

interface VariableEditorProps {
  section: Section;
  onUpdate: (section: Section) => void;
}

// Helper function to normalize items to ListItemStyle format
const normalizeListItems = (items: any[]): ListItemStyle[] => {
  return items.map(item => {
    if (typeof item === 'string') {
      return { text: item, children: [] };
    }
    return {
      ...item,
      children: item.children ? normalizeListItems(item.children) : []
    };
  });
};

// Recursive list item editor component
const renderListItemsEditor = (
  section: Section, 
  onUpdate: (section: Section) => void, 
  level: number = 0,
  parentPath: number[] = []
): JSX.Element => {
  const items = normalizeListItems((section.variables?.items as any[]) || []);
  
  const updateItemAtPath = (path: number[], updater: (item: ListItemStyle) => ListItemStyle) => {
    const updateRecursive = (items: ListItemStyle[], currentPath: number[]): ListItemStyle[] => {
      if (currentPath.length === 0) return items;
      
      const [index, ...rest] = currentPath;
      return items.map((item, i) => {
        if (i !== index) return item;
        if (rest.length === 0) return updater(item);
        return {
          ...item,
          children: updateRecursive(item.children || [], rest)
        };
      });
    };
    
    const newItems = updateRecursive(items, path);
    onUpdate({
      ...section,
      variables: { ...section.variables, items: newItems }
    });
  };
  
  const deleteItemAtPath = (path: number[]) => {
    const deleteRecursive = (items: ListItemStyle[], currentPath: number[]): ListItemStyle[] => {
      if (currentPath.length === 0) return items;
      
      const [index, ...rest] = currentPath;
      if (rest.length === 0) {
        return items.filter((_, i) => i !== index);
      }
      return items.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          children: deleteRecursive(item.children || [], rest)
        };
      });
    };
    
    const newItems = deleteRecursive(items, path);
    onUpdate({
      ...section,
      variables: { ...section.variables, items: newItems }
    });
  };
  
  const addSubItem = (path: number[]) => {
    updateItemAtPath(path, (item) => ({
      ...item,
      children: [...(item.children || []), { text: '', children: [] }]
    }));
  };
  
  const getItemAtPath = (path: number[]): ListItemStyle | null => {
    let current: ListItemStyle[] = items;
    for (const index of path) {
      if (!current[index]) return null;
      if (path[path.length - 1] === index) return current[index];
      current = current[index].children || [];
    }
    return null;
  };
  
  const renderItem = (item: ListItemStyle, index: number, currentPath: number[]) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = item.children && item.children.length > 0;
    const itemPath = [...currentPath, index];
    
    return (
      <div key={index} className="space-y-1">
        <div className="flex gap-1 items-start" style={{ marginLeft: `${level * 20}px` }}>
          {level < 3 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 shrink-0"
            >
              {hasChildren && expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : hasChildren ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <div className="w-3 h-3" />
              )}
            </Button>
          )}
          
          <Input
            value={item.text}
            onChange={(e) => {
              updateItemAtPath(itemPath, (i) => ({ ...i, text: e.target.value }));
            }}
            className="flex-1 h-8 text-sm"
            placeholder={`Item ${index + 1}`}
            style={{
              fontWeight: item.bold ? 'bold' : 'normal',
              fontStyle: item.italic ? 'italic' : 'normal',
              textDecoration: item.underline ? 'underline' : 'none',
              color: item.color || 'inherit',
              backgroundColor: item.backgroundColor || 'transparent'
            }}
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
              >
                <Palette className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={item.bold ? "default" : "outline"}
                    onClick={() => updateItemAtPath(itemPath, (i) => ({ ...i, bold: !i.bold }))}
                    className="flex-1"
                  >
                    <Bold className="h-3 w-3 mr-1" />
                    Bold
                  </Button>
                  <Button
                    size="sm"
                    variant={item.italic ? "default" : "outline"}
                    onClick={() => updateItemAtPath(itemPath, (i) => ({ ...i, italic: !i.italic }))}
                    className="flex-1"
                  >
                    <Italic className="h-3 w-3 mr-1" />
                    Italic
                  </Button>
                  <Button
                    size="sm"
                    variant={item.underline ? "default" : "outline"}
                    onClick={() => updateItemAtPath(itemPath, (i) => ({ ...i, underline: !i.underline }))}
                    className="flex-1"
                  >
                    <Underline className="h-3 w-3 mr-1" />
                    Underline
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={item.color || '#000000'}
                      onChange={(e) => updateItemAtPath(itemPath, (i) => ({ ...i, color: e.target.value }))}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      type="text"
                      value={item.color || ''}
                      onChange={(e) => updateItemAtPath(itemPath, (i) => ({ ...i, color: e.target.value }))}
                      placeholder="#000000"
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={item.backgroundColor || '#ffffff'}
                      onChange={(e) => updateItemAtPath(itemPath, (i) => ({ ...i, backgroundColor: e.target.value }))}
                      className="w-12 h-8 p-1"
                    />
                    <Input
                      type="text"
                      value={item.backgroundColor || ''}
                      onChange={(e) => updateItemAtPath(itemPath, (i) => ({ ...i, backgroundColor: e.target.value }))}
                      placeholder="transparent"
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Font Size</Label>
                  <Input
                    type="text"
                    value={item.fontSize || ''}
                    onChange={(e) => updateItemAtPath(itemPath, (i) => ({ ...i, fontSize: e.target.value }))}
                    placeholder="14px"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {level < 3 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => addSubItem(itemPath)}
              className="h-8 w-8 shrink-0"
              title="Add sub-item"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          
          <Button
            size="icon"
            variant="ghost"
            onClick={() => deleteItemAtPath(itemPath)}
            className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        
        {hasChildren && expanded && (
          <div className="space-y-1">
            {item.children?.map((child, childIndex) => 
              renderItem(child, childIndex, itemPath)
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-1">
      {items.map((item, index) => renderItem(item, index, parentPath))}
    </div>
  );
};

export const VariableEditor = ({ section, onUpdate }: VariableEditorProps) => {
  const sectionDef = sectionTypes.find(s => s.type === section.type);
  
  // Extract placeholders from content for heading/text sections
  const extractPlaceholders = (content: string): string[] => {
    const placeholderMatches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(placeholderMatches.map(m => {
      const match = m.match(/\{\{(\w+)\}\}/);
      return match ? match[1] : '';
    }).filter(Boolean))];
  };

  // Check if section supports inline placeholders
  const isInlinePlaceholderSection = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'].includes(section.type);
  const placeholders = isInlinePlaceholderSection ? extractPlaceholders(section.content) : [];
  const hasPlaceholders = placeholders.length > 0;
  
  // Show TableEditor for table sections
  if (section.type === 'table') {
    return <TableEditor section={section} onUpdate={onUpdate} />;
  }
  
  // No editor needed for line breaks
  if (section.type === 'line-break') {
    return (
      <div className={styles.centerText}>
        Line break - no configuration needed
      </div>
    );
  }
  
  // No editor needed for containers (children are managed separately)
  if (section.type === 'container') {
    return (
      <div className={styles.infoBox}>
        <div className={styles.centerText}>
          <p className="font-medium">Container Section</p>
          <p className="hint">
            Use the "Add" button in the editor to add sections inside this container.
          </p>
        </div>
      </div>
    );
  }
  
  // For static-text sections, show a simple textarea
  if (section.type === 'static-text') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Static Text Content</h3>
        </div>
        <Separator />
        <div className={styles.section}>
          <Label className={styles.label}>Enter your text (no placeholders needed)</Label>
          <Textarea
            value={(section.variables?.content as string) || ''}
            onChange={(e) => onUpdate({
              ...section,
              variables: { ...section.variables, content: e.target.value }
            })}
            className={styles.staticTextArea}
            placeholder="Type your static text here..."
          />
          <p className={styles.description}>
            This text will appear exactly as you type it. Supports line breaks.
          </p>
        </div>
      </div>
    );
  }
  
  // For mixed-content sections - free-form text with embedded placeholders
  if (section.type === 'mixed-content') {
    const contentText = (section.variables?.content as string) || 'What\'s New: {{update}}';
    
    // Extract all placeholders from content (both {{placeholder}} and Thymeleaf formats)
    const placeholderPattern = /\{\{(\w+)\}\}/g;
    const thymeleafPattern = /<span\s+th:utext="\$\{(\w+)\}"(?:\s*\/>|>)|<th:utext="\$\{(\w+)\}">/g;
    
    const placeholders: string[] = [];
    let match;
    while ((match = placeholderPattern.exec(contentText)) !== null) {
      if (!placeholders.includes(match[1])) placeholders.push(match[1]);
    }
    while ((match = thymeleafPattern.exec(contentText)) !== null) {
      const varName = match[1] || match[2];
      if (varName && !placeholders.includes(varName)) placeholders.push(varName);
    }
    
    // Convert Thymeleaf to placeholders for display
    const displayContent = contentText
      .replace(/<span\s+th:utext="\$\{(\w+)\}"(?:\s*\/>|>)/g, '{{$1}}')
      .replace(/<th:utext="\$\{(\w+)\}">/g, '{{$1}}');
    
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Mixed Content (Static + Dynamic)</h3>
        </div>
        <Separator />
        
        <div className={styles.section}>
          <Label className={styles.label}>Template Text</Label>
          <ThymeleafEditor
            value={displayContent}
            onChange={(value) => onUpdate({
              ...section,
              variables: { ...section.variables, content: value }
            })}
            placeholder='For invalid Characters issue, the team is working with Engineer- {{incidentNumber}}'
            className={styles.thymeleafEditor}
          />
          <p className={styles.description}>
            Write your text and use {'{{variableName}}'} for dynamic placeholders.
          </p>
        </div>
        
        {placeholders.length > 0 && (
          <>
            <Separator />
            <div className={styles.variablesSection}>
              <Label className={styles.label}>Dynamic Variables</Label>
              <p className={styles.description}>
                Edit the values for placeholders found in your template:
              </p>
              {placeholders.map(placeholder => (
                <div key={placeholder} className={styles.variableField}>
                  <Label className={styles.variableLabel}>
                    {`{{${placeholder}}}`}
                  </Label>
                  <Input
                    value={(section.variables?.[placeholder] as string) || ''}
                    onChange={(e) => onUpdate({
                      ...section,
                      variables: { ...section.variables, [placeholder]: e.target.value }
                    })}
                    placeholder={`Enter value for ${placeholder}`}
                    className={styles.variableInput}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // For labeled-content sections - static label + dynamic content
  if (section.type === 'labeled-content') {
    // Extract label placeholders (both {{placeholder}} and Thymeleaf formats)
    const labelText = (section.variables?.label as string) || '';
    const extractLabelPlaceholders = (): string[] => {
      const placeholders: string[] = [];
      // Match {{placeholder}} format
      const placeholderMatches = labelText.match(/\{\{(\w+)\}\}/g) || [];
      placeholderMatches.forEach(m => {
        const match = m.match(/\{\{(\w+)\}\}/);
        if (match && !placeholders.includes(match[1])) placeholders.push(match[1]);
      });
      // Match Thymeleaf formats
      const thymeleafMatches = labelText.match(/<span\s+th:utext="\$\{(\w+)\}"(?:\s*\/>|>)|<th:utext="\$\{(\w+)\}">/g) || [];
      thymeleafMatches.forEach(m => {
        const match = m.match(/\$\{(\w+)\}/);
        if (match && !placeholders.includes(match[1])) placeholders.push(match[1]);
      });
      return placeholders;
    };
    
    // Get user-friendly label (convert Thymeleaf to {{placeholder}})
    const getUserFriendlyLabel = (): string => {
      let label = labelText;
      // Convert span format
      label = label.replace(/<span\s+th:utext="\$\{(\w+)\}"(?:\s*\/>|>)/g, '{{$1}}');
      // Convert legacy format
      label = label.replace(/<th:utext="\$\{(\w+)\}">/g, '{{$1}}');
      return label;
    };
    
    const userFriendlyLabel = getUserFriendlyLabel();
    const labelPlaceholders = extractLabelPlaceholders();
    const contentType = (section.variables?.contentType as string) || 'text';
    
    // Extract content placeholders (for text content type)
    const contentText = (section.variables?.content as string) || '';
    const extractContentPlaceholders = (): string[] => {
      const placeholderMatches = contentText.match(/\{\{(\w+)\}\}/g) || [];
      return [...new Set(placeholderMatches.map(m => {
        const match = m.match(/\{\{(\w+)\}\}/);
        return match ? match[1] : '';
      }).filter(Boolean))];
    };
    const contentPlaceholders = contentType === 'text' ? extractContentPlaceholders() : [];
    
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Labeled Content</h3>
        </div>
        <Separator />
        
        <div className={styles.section}>
          <Label className={styles.label}>Field Label (use {`{{`}variable{`}}`} for dynamic data)</Label>
          <Textarea
            value={userFriendlyLabel}
            onChange={(e) => {
              const newLabel = e.target.value;
              const newPlaceholders = newLabel.match(/\{\{(\w+)\}\}/g) || [];
              
              // Convert {{placeholder}} to Thymeleaf (using span format)
              let thymeleafLabel = newLabel;
              newPlaceholders.forEach(match => {
                const varName = match.replace(/\{\{|\}\}/g, '');
                thymeleafLabel = thymeleafLabel.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), `<span th:utext="\${${varName}}"/>`);
              });
              
              // Update variables with new placeholders
              const updatedVariables = { ...section.variables, label: thymeleafLabel };
              newPlaceholders.forEach(match => {
                const varName = match.replace(/\{\{|\}\}/g, '');
                if (!updatedVariables[varName]) {
                  updatedVariables[varName] = '';
                }
              });
              
              onUpdate({
                ...section,
                variables: updatedVariables
              });
            }}
            className="min-h-[60px] text-sm"
            placeholder='Example: Incident Report {{incidentNumber}} or Summary {{status}}'
            rows={2}
          />
          <p className={styles.description}>
            Type your label and use {`{{`}variableName{`}}`} syntax for dynamic values.
          </p>
        </div>
        
        {labelPlaceholders.length > 0 && (
          <>
            <Separator />
            <div className={styles.variablesSection}>
              <Label className={styles.label}>Label Variables - Default Values</Label>
              <p className={styles.description}>
                Set default values for placeholders in your label:
              </p>
              {labelPlaceholders.map(placeholder => (
                <div key={placeholder} className={styles.variableField}>
                  <Label className={styles.variableLabel}>
                    {`{{${placeholder}}}`}
                  </Label>
                  <Input
                    value={(section.variables?.[placeholder] as string) || ''}
                    onChange={(e) => {
                      onUpdate({
                        ...section,
                        variables: { ...section.variables, [placeholder]: e.target.value }
                      });
                    }}
                    placeholder={`Default value for ${placeholder}`}
                    className={styles.variableInput}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <Separator />

        <div className={styles.section}>
          <Label className={styles.label}>Content Type</Label>
          <select
            value={contentType}
            onChange={(e) => onUpdate({
              ...section,
              variables: { ...section.variables, contentType: e.target.value }
            })}
            className={styles.selectInput}
          >
            <option value="text">Text Content</option>
            <option value="list">List Items</option>
            <option value="table">Table</option>
          </select>
        </div>

        <div className={styles.section}>
          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="label-editable"
              checked={section.isLabelEditable !== false}
              onChange={(e) => onUpdate({
                ...section,
                isLabelEditable: e.target.checked
              })}
              className="h-4 w-4"
            />
            <Label htmlFor="label-editable" className={styles.checkboxLabel}>
              Label editable at runtime
            </Label>
          </div>
          <p className={styles.description}>
            When unchecked, users won't be able to modify the label value when running the template.
          </p>
        </div>

        <Separator />

        {contentType === 'text' ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Text Content (use {`{{`}variable{`}}`} for dynamic data)
            </Label>
            <Textarea
              value={contentText}
              onChange={(e) => {
                onUpdate({
                  ...section,
                  variables: { ...section.variables, content: e.target.value }
                });
              }}
              className="min-h-[100px] text-sm"
              placeholder="Example: Status is {{status}}&#10;Issue count: {{count}}"
            />
            <p className="text-xs text-muted-foreground">
              Type your content and use {`{{`}variableName{`}}`} for placeholders. Supports multiple lines.
            </p>
            
            {contentPlaceholders.length > 0 && (
              <div className="space-y-2 mt-4 pt-4 border-t">
                <Label className="text-sm font-medium">Content Variables - Default Values</Label>
                <p className="text-xs text-muted-foreground">
                  Set default values for placeholders in your content:
                </p>
                {contentPlaceholders.map(placeholder => (
                  <div key={placeholder} className="flex items-center gap-2">
                    <Label className="text-xs font-mono min-w-[120px]">
                      {`{{${placeholder}}}`}
                    </Label>
                    <Input
                      value={(section.variables?.[placeholder] as string) || ''}
                      onChange={(e) => {
                        onUpdate({
                          ...section,
                          variables: { ...section.variables, [placeholder]: e.target.value }
                        });
                      }}
                      placeholder={`Default value for ${placeholder}`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : contentType === 'table' ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Table Data <span className="text-muted-foreground">(under "{section.variables?.label || "Label"}")</span>
            </Label>
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const tableData = section.variables?.tableData || { headers: [], rows: [] };
                    onUpdate({
                      ...section,
                      variables: {
                        ...section.variables,
                        tableData: {
                          ...tableData,
                          headers: [...(tableData.headers || []), `Column ${(tableData.headers?.length || 0) + 1}`],
                          rows: (tableData.rows || []).map((row: string[]) => [...row, ''])
                        }
                      }
                    });
                  }}
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Column
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const tableData = section.variables?.tableData || { headers: [], rows: [] };
                    const newRow = new Array((tableData.headers || []).length || 1).fill('');
                    onUpdate({
                      ...section,
                      variables: {
                        ...section.variables,
                        tableData: {
                          ...tableData,
                          rows: [...(tableData.rows || []), newRow]
                        }
                      }
                    });
                  }}
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Row
                </Button>
              </div>
              
              {(() => {
                const tableData = section.variables?.tableData || { headers: [], rows: [] };
                if (!tableData.headers || tableData.headers.length === 0) {
                  return <p className="text-xs text-muted-foreground text-center py-4">Click "Add Column" to start</p>;
                }
                
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border text-sm">
                      <thead>
                        <tr>
                          {(tableData.headers || []).map((header: string, colIdx: number) => (
                            <th key={colIdx} className="border p-2 bg-muted">
                              <div className="flex items-center gap-1">
                                <Input
                                  value={header}
                                  onChange={(e) => {
                                    const newHeaders = [...(tableData.headers || [])];
                                    newHeaders[colIdx] = e.target.value;
                                    onUpdate({
                                      ...section,
                                      variables: {
                                        ...section.variables,
                                        tableData: { ...tableData, headers: newHeaders }
                                      }
                                    });
                                  }}
                                  className="h-8 text-xs font-semibold"
                                  placeholder={`Header ${colIdx + 1}`}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    const newHeaders = (tableData.headers || []).filter((_: any, i: number) => i !== colIdx);
                                    const newRows = (tableData.rows || []).map((row: string[]) => 
                                      row.filter((_: any, i: number) => i !== colIdx)
                                    );
                                    onUpdate({
                                      ...section,
                                      variables: {
                                        ...section.variables,
                                        tableData: { headers: newHeaders, rows: newRows }
                                      }
                                    });
                                  }}
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  disabled={(tableData.headers || []).length <= 1}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(tableData.rows || []).map((row: string[], rowIdx: number) => (
                          <tr key={rowIdx}>
                            {row.map((cell: string, colIdx: number) => (
                              <td key={colIdx} className="border p-1">
                                <div className="flex items-center gap-1">
                                  <Input
                                    value={cell}
                                    onChange={(e) => {
                                      const newRows = [...(tableData.rows || [])];
                                      newRows[rowIdx][colIdx] = e.target.value;
                                      onUpdate({
                                        ...section,
                                        variables: {
                                          ...section.variables,
                                          tableData: { ...tableData, rows: newRows }
                                        }
                                      });
                                    }}
                                    className="h-8 text-xs"
                                    placeholder={`R${rowIdx + 1}C${colIdx + 1}`}
                                  />
                                  {colIdx === row.length - 1 && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        const newRows = (tableData.rows || []).filter((_: any, i: number) => i !== rowIdx);
                                        onUpdate({
                                          ...section,
                                          variables: {
                                            ...section.variables,
                                            tableData: { ...tableData, rows: newRows }
                                          }
                                        });
                                      }}
                                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                      disabled={(tableData.rows || []).length <= 1}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              Define the table structure that will appear under this label.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                List Items with Formatting
              </Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const items = (section.variables?.items as any[]) || [];
                  onUpdate({
                    ...section,
                    variables: { 
                      ...section.variables, 
                      items: [...items, { text: '', children: [] }] 
                    }
                  });
                }}
                className="h-7 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">List Style</Label>
              <select
                value={(section.variables?.listStyle as string) || 'circle'}
                onChange={(e) => onUpdate({
                  ...section,
                  variables: { ...section.variables, listStyle: e.target.value }
                })}
                className={styles.selectInput}
              >
                <optgroup label="Bullet Lists">
                  <option value="circle">Circle (○)</option>
                  <option value="disc">Disc (●)</option>
                  <option value="square">Square (■)</option>
                </optgroup>
                <optgroup label="Numbered Lists">
                  <option value="decimal">Numbers (1, 2, 3)</option>
                  <option value="lower-roman">Roman (i, ii, iii)</option>
                  <option value="upper-roman">Roman (I, II, III)</option>
                  <option value="lower-alpha">Letters (a, b, c)</option>
                  <option value="upper-alpha">Letters (A, B, C)</option>
                </optgroup>
              </select>
            </div>
            
            {renderListItemsEditor(section, onUpdate, 0)}
            
            <p className="text-xs text-muted-foreground">
              Add list items with formatting (bold, italic, colors) and create nested sub-items.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Handle heading and text sections with inline placeholders
  if (isInlinePlaceholderSection) {
    // Get user-friendly content (without HTML tags, with placeholders)
    const getUserFriendlyContent = (): string => {
      let content = section.content;
      // Convert Thymeleaf tags back to {{placeholder}} format for editing
      if (section.variables && Object.keys(section.variables).length > 0) {
        Object.keys(section.variables).forEach(key => {
          const thymeleafPattern = new RegExp(`<th:utext="\\$\\{${key}\\}">`, 'g');
          content = content.replace(thymeleafPattern, `{{${key}}}`);
        });
      }
      // Remove HTML tags for clean editing
      return content.replace(/<[^>]*>/g, '');
    };
    
    // Get preview with default values
    const getPreviewContent = (): string => {
      if (section.variables && Object.keys(section.variables).length > 0) {
        let displayContent = getUserFriendlyContent();
        Object.entries(section.variables).forEach(([key, value]) => {
          const placeholderPattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          displayContent = displayContent.replace(placeholderPattern, String(value));
        });
        return displayContent;
      }
      return getUserFriendlyContent();
    };
    
    const userContent = getUserFriendlyContent();
    const previewContent = getPreviewContent();
    const detectedPlaceholders = extractPlaceholders(userContent);
    
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>{sectionDef?.label || 'Content'}</h3>
        </div>
        <Separator />
        
        <div className={styles.section}>
          <Label className={styles.label}>Content (use {`{{`}variable{`}}`} for dynamic data)</Label>
          <Textarea
            value={userContent}
            onChange={(e) => {
              const newContent = e.target.value;
              const newPlaceholders = extractPlaceholders(newContent);
              
              // Get the section's HTML tag wrapper
              const tagMatch = section.content.match(/^<(\w+)>/);
              const htmlTag = tagMatch ? tagMatch[1] : 'div';
              
              // Convert placeholders to Thymeleaf syntax
              let thymeleafContent = newContent;
              newPlaceholders.forEach(placeholder => {
                const placeholderPattern = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g');
                thymeleafContent = thymeleafContent.replace(placeholderPattern, `<th:utext="\${${placeholder}}">`);
              });
              
              // Wrap in HTML tag
              const wrappedContent = `<${htmlTag}>${thymeleafContent}</${htmlTag}>`;
              
              // Preserve existing variable values and add new ones with empty defaults
              const updatedVariables = { ...section.variables };
              newPlaceholders.forEach(placeholder => {
                if (!updatedVariables[placeholder]) {
                  updatedVariables[placeholder] = '';
                }
              });
              
              // Remove variables that are no longer in content
              Object.keys(updatedVariables).forEach(key => {
                if (!newPlaceholders.includes(key)) {
                  delete updatedVariables[key];
                }
              });
              
              onUpdate({
                ...section,
                content: wrappedContent,
                variables: updatedVariables
              });
            }}
            className={styles.staticTextArea}
            placeholder={`Example: Incident Report {{incidentNumber}} - Status: {{status}}`}
            rows={3}
          />
          <p className={styles.description}>
            Type your content and use {`{{`}variableName{`}}`} syntax for dynamic values. Multiple placeholders are supported.
          </p>
        </div>
        
        {detectedPlaceholders.length > 0 && (
          <>
            <Separator />
            <div className={styles.section}>
              <Label className={styles.label}>Preview with Default Values</Label>
              <div className="p-3 border rounded bg-muted/30 text-sm">
                {previewContent || 'No content'}
              </div>
            </div>
          </>
        )}
        
        {detectedPlaceholders.length > 0 && (
          <>
            <Separator />
            <div className={styles.variablesSection}>
              <Label className={styles.label}>Variable Default Values</Label>
              <p className={styles.description}>
                Set default values for your placeholders (used in preview and when running):
              </p>
              {detectedPlaceholders.map(placeholder => (
                <div key={placeholder} className={styles.variableField}>
                  <Label className={styles.variableLabel}>
                    {`{{${placeholder}}}`}
                  </Label>
                  <Input
                    value={(section.variables?.[placeholder] as string) || ''}
                    onChange={(e) => {
                      const updatedVariables = { ...section.variables, [placeholder]: e.target.value };
                      onUpdate({
                        ...section,
                        variables: updatedVariables
                      });
                    }}
                    placeholder={`Default value for ${placeholder}`}
                    className={styles.variableInput}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <Separator />
        <div className={styles.section}>
          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="content-editable"
              checked={section.isLabelEditable !== false}
              onChange={(e) => onUpdate({
                ...section,
                isLabelEditable: e.target.checked
              })}
              className="h-4 w-4"
            />
            <Label htmlFor="content-editable" className={styles.checkboxLabel}>
              Content editable at runtime
            </Label>
          </div>
          <p className={styles.description}>
            When unchecked, users won't be able to modify the content when running the template.
          </p>
        </div>
      </div>
    );
  }
  
  if (!sectionDef || !sectionDef.variables || sectionDef.variables.length === 0) {
    return (
      <div className={styles.centerText}>
        No variables for this section type
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{sectionDef.label}</h3>
      </div>
      <Separator />
      
      {sectionDef.variables.map((variable) => (
        <div key={variable.name} className={styles.section}>
          <Label className={styles.label}>{variable.label}</Label>
          
          {variable.type === 'list' ? (
            <div className={styles.listSection}>
              {(section.variables?.[variable.name] as string[] || [variable.defaultValue as string]).map((item, index) => (
                <div key={index} className={styles.listItemWrapper}>
                  <Input
                    value={item}
                    onChange={(e) => {
                      const items = section.variables?.[variable.name] as string[] || [variable.defaultValue as string];
                      const newItems = [...items];
                      newItems[index] = e.target.value;
                      onUpdate({
                        ...section,
                        variables: { ...section.variables, [variable.name]: newItems }
                      });
                    }}
                    className={styles.listItemInput}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const items = section.variables?.[variable.name] as string[] || [variable.defaultValue as string];
                      const newItems = items.filter((_, i) => i !== index);
                      onUpdate({
                        ...section,
                        variables: { ...section.variables, [variable.name]: newItems }
                      });
                    }}
                    className={styles.deleteButton}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const items = section.variables?.[variable.name] as string[] || [variable.defaultValue as string];
                  onUpdate({
                    ...section,
                    variables: { ...section.variables, [variable.name]: [...items, ''] }
                  });
                }}
                className={styles.addButton}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          ) : variable.type === 'url' ? (
            <Input
              type="url"
              value={(section.variables?.[variable.name] as string) || variable.defaultValue}
              onChange={(e) => onUpdate({
                ...section,
                variables: { ...section.variables, [variable.name]: e.target.value }
              })}
              className={styles.input}
            />
          ) : (
            <Textarea
              value={(section.variables?.[variable.name] as string) || variable.defaultValue}
              onChange={(e) => onUpdate({
                ...section,
                variables: { ...section.variables, [variable.name]: e.target.value }
              })}
              className={styles.textarea}
            />
          )}
        </div>
      ))}
    </div>
  );
};

