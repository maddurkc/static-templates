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
  
  // For mixed-content sections
  if (section.type === 'mixed-content') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Mixed Content</h3>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Static Text (Prefix)</Label>
            <Input
              value={(section.variables?.prefix as string) || ''}
              onChange={(e) => onUpdate({
                ...section,
                variables: { ...section.variables, prefix: e.target.value }
              })}
              className="h-9 text-sm"
              placeholder="What's New: "
            />
            <p className="text-xs text-muted-foreground">
              This text appears before dynamic content (e.g., "What's New: ", "Status: ")
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dynamic Content</Label>
            <Textarea
              value={(section.variables?.dynamicContent as string) || ''}
              onChange={(e) => onUpdate({
                ...section,
                variables: { ...section.variables, dynamicContent: e.target.value }
              })}
              className="min-h-[80px] text-sm"
              placeholder="This can be updated via API"
            />
            <p className="text-xs text-muted-foreground">
              This content can be replaced with API data or edited manually
            </p>
          </div>
        </div>
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
