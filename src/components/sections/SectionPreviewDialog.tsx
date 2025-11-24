import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Plus, Trash2 } from "lucide-react";
import { SectionDefinition, TextStyle, ListItemStyle } from "@/types/section";
import styles from "./SectionPreviewDialog.module.scss";

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
          <Eye className={styles.icon} />
        </Button>
      </DialogTrigger>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader>
          <DialogTitle>Test Section - {section.label}</DialogTitle>
        </DialogHeader>
        
        <div className={styles.gridLayout}>
          {/* Left: Variable Inputs */}
          <ScrollArea className={styles.leftPanel}>
            <div className={styles.formSection}>
              {!section.variables || section.variables.length === 0 ? (
                <p className={styles.textSmall}>
                  This section has no variables to configure.
                </p>
              ) : (
                section.variables.map((variable) => (
                  <div key={variable.name} className={styles.formField}>
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
                      <div className={styles.spaceY}>
                        {((variableValues[variable.name] as string[]) || []).map((item, index) => (
                          <div key={index} className={styles.listItemRow}>
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
                              <Trash2 className={styles.icon} />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddListItem(variable.name)}
                          className={styles.buttonFull}
                        >
                          <Plus className={`${styles.icon} ${styles.iconMargin}`} />
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
          <div className={styles.previewPanel}>
            <div className={styles.previewHeader}>
              <h4 className={styles.textSmall} style={{ fontWeight: 500 }}>Live Preview</h4>
            </div>
            <ScrollArea style={{ height: 'calc(90vh - 200px)' }}>
              <div className={styles.previewContent}>
                <div
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                  className={styles.previewHtml}
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};