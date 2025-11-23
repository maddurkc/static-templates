import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Plus, Trash2 } from "lucide-react";
import { SectionDefinition, TextStyle, ListItemStyle } from "@/types/section";

interface SectionPreviewDialogProps {
  section: SectionDefinition;
}

export const SectionPreviewDialog = ({ section }: SectionPreviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    section.variables?.forEach(v => {
      initial[v.name] = v.defaultValue;
    });
    return initial;
  });

  const replaceVariables = (content: string): string => {
    let result = content;
    
    section.variables?.forEach(variable => {
      const value = variableValues[variable.name];
      const placeholder = `{{${variable.name}}}`;
      
      if (variable.type === 'list' && Array.isArray(value)) {
        const items = value.map(item => {
          if (typeof item === 'object' && 'text' in item) {
            const style = item as ListItemStyle;
            const styles = [];
            if (style.color) styles.push(`color: ${style.color}`);
            if (style.backgroundColor) styles.push(`background-color: ${style.backgroundColor}`);
            if (style.bold) styles.push('font-weight: bold');
            if (style.italic) styles.push('font-style: italic');
            if (style.underline) styles.push('text-decoration: underline');
            if (style.fontSize) styles.push(`font-size: ${style.fontSize}`);
            return `<li style="${styles.join('; ')}">${style.text}</li>`;
          }
          return `<li>${item}</li>`;
        }).join('');
        result = result.replace(placeholder, items);
      } else if (variable.type === 'table' && value) {
        // Handle table rendering if needed
        result = result.replace(placeholder, String(value));
      } else {
        // Handle TextStyle for regular text variables
        if (typeof value === 'object' && value !== null && 'text' in value) {
          const style = value as TextStyle;
          const styles = [];
          if (style.color) styles.push(`color: ${style.color}`);
          if (style.backgroundColor) styles.push(`background-color: ${style.backgroundColor}`);
          if (style.bold) styles.push('font-weight: bold');
          if (style.italic) styles.push('font-style: italic');
          if (style.underline) styles.push('text-decoration: underline');
          if (style.fontSize) styles.push(`font-size: ${style.fontSize}`);
          const styledText = styles.length > 0 
            ? `<span style="${styles.join('; ')}">${style.text}</span>`
            : style.text;
          result = result.replace(new RegExp(placeholder, 'g'), styledText);
        } else {
          result = result.replace(new RegExp(placeholder, 'g'), String(value || ''));
        }
      }
    });
    
    return result;
  };

  const handleVariableChange = (name: string, value: any) => {
    setVariableValues(prev => ({ ...prev, [name]: value }));
  };

  const handleListItemChange = (varName: string, index: number, value: string) => {
    const currentList = variableValues[varName] as string[];
    const newList = [...currentList];
    newList[index] = value;
    handleVariableChange(varName, newList);
  };

  const handleAddListItem = (varName: string) => {
    const currentList = (variableValues[varName] as string[]) || [];
    handleVariableChange(varName, [...currentList, '']);
  };

  const handleRemoveListItem = (varName: string, index: number) => {
    const currentList = variableValues[varName] as string[];
    const newList = currentList.filter((_, i) => i !== index);
    handleVariableChange(varName, newList);
  };

  const previewHtml = replaceVariables(section.defaultContent);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Test Section - {section.label}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
          {/* Left: Variable Inputs */}
          <ScrollArea className="pr-4">
            <div className="space-y-4">
              {!section.variables || section.variables.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This section has no variables to configure.
                </p>
              ) : (
                section.variables.map((variable) => (
                  <div key={variable.name} className="space-y-2">
                    <Label htmlFor={variable.name}>{variable.label}</Label>
                    
                    {variable.type === 'text' || variable.type === 'url' ? (
                      <Input
                        id={variable.name}
                        type={variable.type === 'url' ? 'url' : 'text'}
                        value={variableValues[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        placeholder={`Enter ${variable.label.toLowerCase()}`}
                      />
                    ) : variable.type === 'list' ? (
                      <div className="space-y-2">
                        {((variableValues[variable.name] as string[]) || []).map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={item}
                              onChange={(e) => handleListItemChange(variable.name, index, e.target.value)}
                              placeholder={`Item ${index + 1}`}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveListItem(variable.name, index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddListItem(variable.name)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    ) : (
                      <Textarea
                        id={variable.name}
                        value={variableValues[variable.name] || ''}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        placeholder={`Enter ${variable.label.toLowerCase()}`}
                        rows={3}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Right: Live Preview */}
          <div className="border rounded-lg bg-background">
            <div className="border-b px-4 py-2 bg-muted/30">
              <h4 className="text-sm font-medium">Live Preview</h4>
            </div>
            <ScrollArea className="h-[calc(90vh-200px)]">
              <div className="p-6">
                <div
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                  className="[&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-4 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-3 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mb-2 [&>h4]:text-lg [&>h4]:font-semibold [&>h4]:mb-2 [&>h5]:text-base [&>h5]:font-medium [&>h5]:mb-2 [&>h6]:text-sm [&>h6]:font-medium [&>h6]:mb-2 [&>p]:text-sm [&>p]:mb-4 [&>ul]:list-disc [&>ul]:list-inside [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:list-inside [&>ol]:mb-4 [&>table]:w-full [&>table]:border-collapse [&>table]:mb-4 [&_th]:border [&_th]:p-2 [&_th]:bg-muted [&_td]:border [&_td]:p-2 [&>img]:max-w-full [&>img]:h-auto [&>img]:mb-4 [&>button]:px-4 [&>button]:py-2 [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:rounded [&>button]:mb-4 [&>a]:text-primary [&>a]:underline"
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
