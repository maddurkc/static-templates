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
    const placeholderMatches = contentText.match(/<th:utext="\$\{(\w+)\}">/g) || [];
    const placeholders = [...new Set(placeholderMatches.map(m => {
      const match = m.match(/<th:utext="\$\{(\w+)\}">/);
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
            className={styles.minHeight60}
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
              className={styles.checkboxInput}
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
          <div className={styles.spaceY}>
            <Label className={styles.mediumLabel}>
              Dynamic Content <span className={styles.mutedText}>(under "{section.variables?.label || "Label"}")</span>
            </Label>
            <Textarea
              value={(section.variables?.content as string) || ''}
              onChange={(e) => onUpdate({
                ...section,
                variables: { ...section.variables, content: e.target.value }
              })}
              className={styles.minHeight100}
              placeholder="Messages journaled in exchange online reasons:&#10;1. Invalid Characters&#10;2. Header too Large"
            />
            <p className={styles.textMutedSmall}>
              This content appears below the label and can be replaced with API data.
            </p>
          </div>
        ) : contentType === 'table' ? (
          <div className={styles.spaceY}>
            <Label className={styles.mediumLabel}>
              Table Data <span className={styles.mutedText}>(under "{section.variables?.label || "Label"}")</span>
            </Label>
            <div className={`${styles.border} ${styles.spaceY}`} style={{ gap: '1rem' }}>
              <div className={styles.flexGap}>
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
                  className={styles.actionButtonSmall}
                >
                  <Plus className={`${styles.iconSmall} ${styles.iconMarginSmall}`} />
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
                  className={styles.actionButtonSmall}
                >
                  <Plus className={`${styles.iconSmall} ${styles.iconMarginSmall}`} />
                  Add Row
                </Button>
              </div>
              
              {(() => {
                const tableData = section.variables?.tableData || { headers: [], rows: [] };
                if (!tableData.headers || tableData.headers.length === 0) {
                  return <p className={`${styles.textMutedSmall} ${styles.textCenter}`}>Click "Add Column" to start</p>;
                }
                
                return (
                  <div className={styles.overflowAuto}>
                    <table className={styles.tableFullWidth}>
                      <thead>
                        <tr>
                          {(tableData.headers || []).map((header: string, colIdx: number) => (
                            <th key={colIdx} className={`${styles.tableBorder} ${styles.tableBgMuted}`}>
                              <div className={styles.cellFlexGroup}>
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
                                  className={styles.headerInputSmall}
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
                                  className={styles.deleteIconButton}
                                  disabled={(tableData.headers || []).length <= 1}
                                >
                                  <Trash2 className={styles.iconSmall} />
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
                              <td key={colIdx} className={styles.tableCellPadding}>
                                <div className={styles.cellFlexGroup}>
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
                                    className={styles.cellInputSmall}
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
                                      className={styles.deleteIconButton}
                                      disabled={(tableData.rows || []).length <= 1}
                                    >
                                      <Trash2 className={styles.iconSmall} />
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
            <p className={styles.textMutedSmall}>
              Define the table structure that will appear under this label.
            </p>
          </div>
        ) : (
          <div className={styles.spaceY}>
            <div className={styles.flexBetween}>
              <Label className={styles.mediumLabel}>
                Dynamic List Items <span className={styles.mutedText}>(under "{section.variables?.label || "Label"}")</span>
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
                className={styles.actionButtonSmall}
              >
                <Plus className={`${styles.iconSmall} ${styles.iconMarginSmall}`} />
                Add Item
              </Button>
            </div>
            
            <div className={`${styles.spaceY} ${styles.listBorder}`}>
              {((section.variables?.items as string[]) || ['']).map((item, index) => (
                <div key={index} className={styles.listItemFlex}>
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
                    className={styles.listInputFlex}
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
                    className={styles.deleteIconButton}
                    disabled={((section.variables?.items as string[]) || []).length === 1}
                  >
                    <Trash2 className={styles.iconSmall} />
                  </Button>
                </div>
              ))}
            </div>
            <p className={styles.textMutedSmall}>
              These list items appear below the label and can be replaced with API data.
            </p>
          </div>
        )}
      </div>
    );
  }
  
  if (!sectionDef?.variables || sectionDef.variables.length === 0) {
    return null;
  }

  const updateVariable = (name: string, value: string | string[]) => {
    onUpdate({
      ...section,
      variables: {
        ...section.variables,
        [name]: value,
      },
    });
  };

  const addListItem = (varName: string) => {
    const currentValue = section.variables?.[varName] as string[] || [];
    updateVariable(varName, [...currentValue, '']);
  };

  const removeListItem = (varName: string, index: number) => {
    const currentValue = section.variables?.[varName] as string[] || [];
    updateVariable(varName, currentValue.filter((_, i) => i !== index));
  };

  const updateListItem = (varName: string, index: number, value: string) => {
    const currentValue = section.variables?.[varName] as string[] || [];
    const newValue = [...currentValue];
    newValue[index] = value;
    updateVariable(varName, newValue);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Variables</h3>
      </div>
      
      <Separator />

      {sectionDef.variables.map((varDef) => {
        const currentValue = section.variables?.[varDef.name] ?? varDef.defaultValue;

        if (varDef.type === 'list') {
          const listValues = Array.isArray(currentValue) ? currentValue : [currentValue as string];
          
          return (
            <div key={varDef.name} className={styles.section}>
              <div className={styles.header}>
                <Label className={styles.label}>{varDef.label}</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addListItem(varDef.name)}
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>
              
              <div className={styles.listItems}>
                {listValues.map((item, index) => (
                  <div key={index} className={styles.listItem}>
                    <Input
                      value={item}
                      onChange={(e) => updateListItem(varDef.name, index, e.target.value)}
                      className={styles.listInput}
                      placeholder={`Item ${index + 1}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeListItem(varDef.name, index)}
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      disabled={listValues.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (varDef.type === 'text') {
          const textValue = currentValue as string;
          const isLongText = textValue.length > 50 || textValue.includes('\n');
          
          return (
            <div key={varDef.name} className={styles.section}>
              <Label className={styles.label}>{varDef.label}</Label>
              {isLongText ? (
                <Textarea
                  value={textValue}
                  onChange={(e) => updateVariable(varDef.name, e.target.value)}
                  className={styles.staticTextArea}
                  placeholder={varDef.defaultValue as string}
                />
              ) : (
                <Input
                  value={textValue}
                  onChange={(e) => updateVariable(varDef.name, e.target.value)}
                  className="h-8 text-sm"
                  placeholder={varDef.defaultValue as string}
                />
              )}
            </div>
          );
        }

        if (varDef.type === 'url') {
          return (
            <div key={varDef.name} className={styles.section}>
              <Label className={styles.label}>{varDef.label}</Label>
              <Input
                type="url"
                value={currentValue as string}
                onChange={(e) => updateVariable(varDef.name, e.target.value)}
                className="h-8 text-sm font-mono"
                placeholder={varDef.defaultValue as string}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
