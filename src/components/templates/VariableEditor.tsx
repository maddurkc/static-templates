import { Section } from "@/types/section";
import { sectionTypes } from "@/data/sectionTypes";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TableEditor } from "./TableEditor";
import { ThymeleafEditor } from "./ThymeleafEditor";
import styles from "./VariableEditor.module.scss";

interface VariableEditorProps {
  section: Section;
  onUpdate: (section: Section) => void;
}

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
    const contentText = (section.variables?.content as string) || 'What\'s New: <th:utext="${update}">';
    
    // Extract all placeholders from content
    const placeholderMatches = contentText.match(/<th:utext="\$\{(\w+)\}"></g) || [];
    const placeholders = [...new Set(placeholderMatches.map(m => {
      const match = m.match(/<th:utext="\$\{(\w+)\}"></);
      return match ? match[1] : '';
    }).filter(Boolean))];
    
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Mixed Content (Static + Dynamic)</h3>
        </div>
        <Separator />
        
        <div className={styles.section}>
          <Label className={styles.label}>Template Text</Label>
          <ThymeleafEditor
            value={contentText}
            onChange={(value) => onUpdate({
              ...section,
              variables: { ...section.variables, content: value }
            })}
            placeholder='For invalid Characters issue, the team is working with Engineer- <th:utext="${incidentNumber}">'
            className={styles.thymeleafEditor}
          />
          <p className={styles.description}>
            Write your text and use Thymeleaf tags:<br/>
            • Variables: {'<th:utext="${variableName}">'}<br/>
            • Conditionals: {'<th:if="${condition}">'}content{'</th:if>'}<br/>
            • Loops: {'<th:each="item : ${items}">'}{'<th:utext="${item}">'}{'</th:each>'}
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
                    {'<th:utext="${' + placeholder + '}">'} 
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
    const label = (section.variables?.label as string) || '';
    const contentType = (section.variables?.contentType as string) || 'text';
    
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Labeled Content</h3>
        </div>
        <Separator />
        
        <div className={styles.section}>
          <Label className={styles.label}>Field Label (supports dynamic content)</Label>
          <ThymeleafEditor
            value={label}
            onChange={(value) => onUpdate({
              ...section,
              variables: { ...section.variables, label: value }
            })}
            placeholder='e.g., Summary or Incident <th:utext="${incidentNumber}">'
            className="min-h-[60px]"
          />
          <p className={styles.description}>
            Use static text or add Thymeleaf expressions like {'<th:utext="${variableName}">'} for dynamic parts.
          </p>
        </div>

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

        {contentType === 'text' ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Dynamic Content <span className="text-muted-foreground">(under "{section.variables?.label || "Label"}")</span>
            </Label>
            <Textarea
              value={(section.variables?.content as string) || ''}
              onChange={(e) => onUpdate({
                ...section,
                variables: { ...section.variables, content: e.target.value }
              })}
              className="min-h-[100px] text-sm"
              placeholder="Messages journaled in exchange online reasons:&#10;1. Invalid Characters&#10;2. Header too Large"
            />
            <p className="text-xs text-muted-foreground">
              This content appears below the label and can be replaced with API data.
            </p>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Dynamic List Items <span className="text-muted-foreground">(under "{section.variables?.label || "Label"}")</span>
              </Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const items = (section.variables?.items as string[]) || [];
                  onUpdate({
                    ...section,
                    variables: { ...section.variables, items: [...items, ''] }
                  });
                }}
                className="h-7 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-1">
              {((section.variables?.items as string[]) || ['']).map((item, index) => (
                <div key={index} className="flex gap-1">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const items = (section.variables?.items as string[]) || [];
                      const newItems = [...items];
                      newItems[index] = e.target.value;
                      onUpdate({
                        ...section,
                        variables: { ...section.variables, items: newItems }
                      });
                    }}
                    className="flex-1 h-8 text-sm"
                    placeholder={`Item ${index + 1}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const items = (section.variables?.items as string[]) || [];
                      const newItems = items.filter((_, i) => i !== index);
                      onUpdate({
                        ...section,
                        variables: { ...section.variables, items: newItems }
                      });
                    }}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    disabled={((section.variables?.items as string[]) || []).length === 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Add list items that will appear under this label.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Handle heading and text sections with inline placeholders
  if (isInlinePlaceholderSection) {
    const contentText = section.content || sectionDef?.defaultContent || '';
    const placeholders = extractPlaceholders(contentText);
    
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>{sectionDef?.label || 'Content'}</h3>
        </div>
        <Separator />
        
        <div className={styles.section}>
          <Label className={styles.label}>Content (use {`{{`} variable {`}}`} for dynamic data)</Label>
          <Textarea
            value={contentText}
            onChange={(e) => {
              const newContent = e.target.value;
              const newPlaceholders = extractPlaceholders(newContent);
              
              // Preserve existing variable values and add new ones
              const updatedVariables = { ...section.variables };
              newPlaceholders.forEach(placeholder => {
                if (!updatedVariables[placeholder]) {
                  updatedVariables[placeholder] = '';
                }
              });
              
              onUpdate({
                ...section,
                content: newContent,
                variables: updatedVariables
              });
            }}
            className={styles.staticTextArea}
            placeholder={`Example: Incident Report {{incidentNumber}} - Status: {{status}}`}
          />
          <p className={styles.description}>
            Type your content and use {`{{`} variableName {`}}`} syntax for dynamic values.
            Multiple placeholders are supported.
          </p>
        </div>
        
        {placeholders.length > 0 && (
          <>
            <Separator />
            <div className={styles.variablesSection}>
              <Label className={styles.label}>Variable Default Values</Label>
              <p className={styles.description}>
                Set default values for your placeholders (used when running the template):
              </p>
              {placeholders.map(placeholder => (
                <div key={placeholder} className={styles.variableField}>
                  <Label className={styles.variableLabel}>
                    {`{{` + placeholder + `}}`} 
                  </Label>
                  <Input
                    value={(section.variables?.[placeholder] as string) || ''}
                    onChange={(e) => onUpdate({
                      ...section,
                      variables: { ...section.variables, [placeholder]: e.target.value }
                    })}
                    placeholder={`Default value for ${placeholder}`}
                    className={styles.variableInput}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {hasPlaceholders && (
          <>
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
                When unchecked, users won't be able to modify the placeholder values when running the template.
              </p>
            </div>
          </>
        )}
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

