import { Section } from "@/types/section";
import { sectionTypes } from "@/data/sectionTypes";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TableEditor } from "./TableEditor";

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
      <div className="p-4 text-center text-sm text-muted-foreground">
        Line break - no configuration needed
      </div>
    );
  }
  
  // No editor needed for containers (children are managed separately)
  if (section.type === 'container') {
    return (
      <div className="p-4 space-y-2">
        <div className="text-center text-sm text-muted-foreground">
          <p className="font-medium">Container Section</p>
          <p className="text-xs mt-2">
            Use the "Add" button in the editor to add sections inside this container.
          </p>
        </div>
      </div>
    );
  }
  
  // For static-text sections, show a simple textarea
  if (section.type === 'static-text') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Static Text Content</h3>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label className="text-sm font-medium">Enter your text (no placeholders needed)</Label>
          <Textarea
            value={(section.variables?.content as string) || ''}
            onChange={(e) => onUpdate({
              ...section,
              variables: { ...section.variables, content: e.target.value }
            })}
            className="min-h-[120px] text-sm"
            placeholder="Type your static text here..."
          />
          <p className="text-xs text-muted-foreground">
            This text will appear exactly as you type it. Supports line breaks.
          </p>
        </div>
      </div>
    );
  }
  
  // For mixed-content sections - free-form text with embedded placeholders
  if (section.type === 'mixed-content') {
    const contentText = (section.variables?.content as string) || 'What\'s New: {{update}}';
    
    // Extract all placeholders from content
    const placeholderMatches = contentText.match(/\{\{(\w+)\}\}/g) || [];
    const placeholders = [...new Set(placeholderMatches.map(m => m.replace(/\{\{|\}\}/g, '')))];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Mixed Content (Static + Dynamic)</h3>
        </div>
        <Separator />
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">Template Text</Label>
          <Textarea
            value={contentText}
            onChange={(e) => onUpdate({
              ...section,
              variables: { ...section.variables, content: e.target.value }
            })}
            className="min-h-[120px] text-sm font-mono"
            placeholder="For invalid Characters issue, the team is working with Engineer- {{incidentNumber}}"
          />
          <p className="text-xs text-muted-foreground">
            Write your text and use {`{{variableName}}`} for dynamic parts. Example: "Status: {`{{status}}`}"
          </p>
        </div>
        
        {placeholders.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Dynamic Variables</Label>
              <p className="text-xs text-muted-foreground">
                Edit the values for placeholders found in your template:
              </p>
              {placeholders.map(placeholder => (
                <div key={placeholder} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {`{{${placeholder}}}`}
                  </Label>
                  <Input
                    value={(section.variables?.[placeholder] as string) || ''}
                    onChange={(e) => onUpdate({
                      ...section,
                      variables: { ...section.variables, [placeholder]: e.target.value }
                    })}
                    placeholder={`Enter value for ${placeholder}`}
                    className="text-sm"
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Labeled Content</h3>
        </div>
        <Separator />
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">Field Label</Label>
          <Input
            value={label}
            onChange={(e) => onUpdate({
              ...section,
              variables: { ...section.variables, label: e.target.value }
            })}
            className="h-9 text-sm font-semibold"
            placeholder="e.g., Summary, Impact, Actions"
          />
          <p className="text-xs text-muted-foreground">
            This will be the field name. Users will see <code className="text-xs bg-muted px-1 rounded">{`{{${label || 'FieldName'}}}`}</code> when running the template.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm font-medium">Content Type</Label>
          <select
            value={contentType}
            onChange={(e) => onUpdate({
              ...section,
              variables: { ...section.variables, contentType: e.target.value }
            })}
            className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background"
          >
            <option value="text">Text Content</option>
            <option value="list">List Items</option>
          </select>
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
            
            <div className="space-y-2 pl-2 border-l-2 border-muted">
              {((section.variables?.items as string[]) || ['']).map((item, index) => (
                <div key={index} className="flex items-center gap-2 ml-2">
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Variables</h3>
      </div>
      
      <Separator />

      {sectionDef.variables.map((varDef) => {
        const currentValue = section.variables?.[varDef.name] ?? varDef.defaultValue;

        if (varDef.type === 'list') {
          const listValues = Array.isArray(currentValue) ? currentValue : [currentValue as string];
          
          return (
            <div key={varDef.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{varDef.label}</Label>
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
              
              <div className="space-y-2 pl-2 border-l-2 border-muted">
                {listValues.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 ml-2">
                    <Input
                      value={item}
                      onChange={(e) => updateListItem(varDef.name, index, e.target.value)}
                      className="flex-1 h-8 text-sm"
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
            <div key={varDef.name} className="space-y-2">
              <Label className="text-sm font-medium">{varDef.label}</Label>
              {isLongText ? (
                <Textarea
                  value={textValue}
                  onChange={(e) => updateVariable(varDef.name, e.target.value)}
                  className="min-h-[80px] text-sm"
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
            <div key={varDef.name} className="space-y-2">
              <Label className="text-sm font-medium">{varDef.label}</Label>
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
