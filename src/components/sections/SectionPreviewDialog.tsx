import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Plus, Trash2 } from "lucide-react";
import { SectionDefinition, TextStyle, ListItemStyle } from "@/types/section";
import { getListTag, getListStyleType } from "@/lib/listThymeleafUtils";
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

  // Generate preview HTML based on section type and variables
  const generatePreviewHtml = (): string => {
    const sectionType = section.type;
    
    // Handle labeled-content sections specially
    if (sectionType === 'labeled-content') {
      return generateLabeledContentPreview();
    }
    
    // Handle table sections
    if (sectionType === 'table') {
      return generateTablePreview();
    }
    
    // Handle list sections
    if (sectionType.includes('list')) {
      return generateListPreview();
    }
    
    // For other sections, replace variables in defaultContent
    return replaceThymeleafVariables(section.defaultContent);
  };

  // Generate preview for labeled-content sections
  const generateLabeledContentPreview = (): string => {
    const label = variableValues['label'] || 'Label';
    const contentType = variableValues['contentType'] || 'text';
    const content = variableValues['content'] || '';
    const items = variableValues['items'] || [];
    const listStyle = variableValues['listStyle'] || 'circle';
    const tableData = variableValues['tableData'];

    let contentHtml = '';

    if (contentType === 'text') {
      contentHtml = `<p>${escapeHtml(content)}</p>`;
    } else if (contentType === 'list') {
      const listTag = getListTag(listStyle);
      const listStyleType = getListStyleType(listStyle);
      contentHtml = renderListItems(items, listTag, listStyleType);
    } else if (contentType === 'table' && tableData) {
      contentHtml = generateTableHtml(tableData);
    }

    return `
      <div style="margin-bottom: 16px;">
        <strong style="display: block; margin-bottom: 8px; font-size: 1rem;">${escapeHtml(label)}</strong>
        <div>${contentHtml}</div>
      </div>
    `;
  };

  // Render list items with nested support
  const renderListItems = (items: any[], listTag: string, listStyleType: string): string => {
    if (!items || items.length === 0) {
      return `<${listTag} style="list-style-type: ${listStyleType}; margin: 0; padding-left: 20px;"><li>No items</li></${listTag}>`;
    }

    const renderItem = (item: any): string => {
      if (typeof item === 'string') {
        return `<li>${escapeHtml(item)}</li>`;
      }
      
      if (typeof item === 'object' && item !== null) {
        const text = item.text || '';
        const children = item.children || [];
        const itemStyles: string[] = [];
        
        if (item.color) itemStyles.push(`color: ${item.color}`);
        if (item.backgroundColor) itemStyles.push(`background-color: ${item.backgroundColor}`);
        if (item.bold) itemStyles.push('font-weight: bold');
        if (item.italic) itemStyles.push('font-style: italic');
        if (item.underline) itemStyles.push('text-decoration: underline');
        if (item.fontSize) itemStyles.push(`font-size: ${item.fontSize}`);
        
        const styleAttr = itemStyles.length > 0 ? ` style="${itemStyles.join('; ')}"` : '';
        
        let itemHtml = `<li${styleAttr}>${escapeHtml(text)}`;
        
        if (children && children.length > 0) {
          itemHtml += `<${listTag} style="list-style-type: ${listStyleType}; margin-top: 4px; padding-left: 20px;">`;
          children.forEach((child: any) => {
            itemHtml += renderItem(child);
          });
          itemHtml += `</${listTag}>`;
        }
        
        itemHtml += '</li>';
        return itemHtml;
      }
      
      return `<li>${String(item)}</li>`;
    };

    let html = `<${listTag} style="list-style-type: ${listStyleType}; margin: 0; padding-left: 20px;">`;
    items.forEach(item => {
      html += renderItem(item);
    });
    html += `</${listTag}>`;
    
    return html;
  };

  // Generate table preview
  const generateTablePreview = (): string => {
    const tableData = variableValues['tableData'];
    if (!tableData) {
      return '<p>No table data</p>';
    }
    return generateTableHtml(tableData);
  };

  // Generate table HTML from table data
  const generateTableHtml = (tableData: any): string => {
    if (!tableData) return '';
    
    const { rows, headers, showBorder = true } = tableData;
    const borderStyle = showBorder ? 'border: 1px solid hsl(var(--border));' : '';
    
    let html = `<table style="width: 100%; border-collapse: collapse; ${borderStyle}">`;
    
    // Handle headers if present
    if (headers && headers.length > 0) {
      html += '<thead><tr>';
      headers.forEach((header: string) => {
        html += `<th style="padding: 8px; ${borderStyle} background: hsl(var(--muted)); text-align: left;">${escapeHtml(header)}</th>`;
      });
      html += '</tr></thead>';
    }
    
    // Handle rows
    if (rows && rows.length > 0) {
      html += '<tbody>';
      const startIndex = headers ? 0 : 1; // If no headers, first row might be headers
      const actualRows = headers ? rows : rows.slice(1);
      
      // If no headers, treat first row as header
      if (!headers && rows.length > 0) {
        html += '<tr>';
        rows[0].forEach((cell: string) => {
          html += `<th style="padding: 8px; ${borderStyle} background: hsl(var(--muted)); text-align: left;">${escapeHtml(cell)}</th>`;
        });
        html += '</tr>';
      }
      
      actualRows.forEach((row: string[]) => {
        html += '<tr>';
        row.forEach((cell: string) => {
          html += `<td style="padding: 8px; ${borderStyle}">${escapeHtml(cell)}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
    }
    
    html += '</table>';
    return html;
  };

  // Generate list preview for list-type sections
  const generateListPreview = (): string => {
    const items = variableValues['items'] || [];
    const sectionType = section.type;
    
    let listTag = 'ul';
    let listStyleType = 'circle';
    
    if (sectionType.includes('number') || sectionType.includes('ordered')) {
      listTag = 'ol';
      if (sectionType.includes('-1') || sectionType.includes('decimal')) {
        listStyleType = 'decimal';
      } else if (sectionType.includes('-i') || sectionType.includes('roman')) {
        listStyleType = 'lower-roman';
      } else if (sectionType.includes('-a') || sectionType.includes('alpha')) {
        listStyleType = 'lower-alpha';
      }
    } else {
      if (sectionType.includes('disc')) {
        listStyleType = 'disc';
      } else if (sectionType.includes('square')) {
        listStyleType = 'square';
      }
    }
    
    return renderListItems(items, listTag, listStyleType);
  };

  // Replace Thymeleaf variables in content
  const replaceThymeleafVariables = (content: string): string => {
    let result = content;
    
    section.variables?.forEach(variable => {
      const value = variableValues[variable.name];
      
      // Replace <span th:utext="${var}"/>
      const spanPattern = new RegExp(`<span\\s+th:utext="\\$\\{${variable.name}\\}"\\s*/>`, 'g');
      // Replace <th:utext="${var}">
      const oldPattern = new RegExp(`<th:utext="\\$\\{${variable.name}\\}">`, 'g');
      // Replace {{var}}
      const placeholderPattern = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      
      let replacement = '';
      
      if (variable.type === 'list' && Array.isArray(value)) {
        replacement = value.map((item: any) => {
          if (typeof item === 'object' && item !== null && 'text' in item) {
            const style = item as ListItemStyle;
            const itemStyles: string[] = [];
            if (style.color) itemStyles.push(`color: ${style.color}`);
            if (style.backgroundColor) itemStyles.push(`background-color: ${style.backgroundColor}`);
            if (style.bold) itemStyles.push('font-weight: bold');
            if (style.italic) itemStyles.push('font-style: italic');
            if (style.underline) itemStyles.push('text-decoration: underline');
            if (style.fontSize) itemStyles.push(`font-size: ${style.fontSize}`);
            return `<li style="${itemStyles.join('; ')}">${escapeHtml(style.text)}</li>`;
          }
          return `<li>${escapeHtml(String(item))}</li>`;
        }).join('');
      } else if (variable.type === 'table' && value) {
        replacement = generateTableHtml(value);
      } else if (typeof value === 'object' && value !== null && 'text' in value) {
        // Handle TextStyle
        const style = value as TextStyle;
        const styleArr: string[] = [];
        if (style.color) styleArr.push(`color: ${style.color}`);
        if (style.backgroundColor) styleArr.push(`background-color: ${style.backgroundColor}`);
        if (style.bold) styleArr.push('font-weight: bold');
        if (style.italic) styleArr.push('font-style: italic');
        if (style.underline) styleArr.push('text-decoration: underline');
        if (style.fontSize) styleArr.push(`font-size: ${style.fontSize}`);
        replacement = styleArr.length > 0 
          ? `<span style="${styleArr.join('; ')}">${escapeHtml(style.text)}</span>`
          : escapeHtml(style.text);
      } else {
        replacement = escapeHtml(String(value || ''));
      }
      
      result = result
        .replace(spanPattern, replacement)
        .replace(oldPattern, replacement)
        .replace(placeholderPattern, replacement);
    });
    
    return result;
  };

  // Escape HTML to prevent XSS
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handleVariableChange = (name: string, value: any) => {
    setVariableValues(prev => ({ ...prev, [name]: value }));
  };

  const handleListItemChange = (varName: string, index: number, value: string) => {
    const currentList = [...(variableValues[varName] || [])];
    if (typeof currentList[index] === 'object') {
      currentList[index] = { ...currentList[index], text: value };
    } else {
      currentList[index] = value;
    }
    handleVariableChange(varName, currentList);
  };

  const handleAddListItem = (varName: string) => {
    const currentList = [...(variableValues[varName] || [])];
    // Check if items are objects or strings
    if (currentList.length > 0 && typeof currentList[0] === 'object') {
      currentList.push({ text: '', children: [] });
    } else {
      currentList.push('');
    }
    handleVariableChange(varName, currentList);
  };

  const handleRemoveListItem = (varName: string, index: number) => {
    const currentList = [...(variableValues[varName] || [])];
    currentList.splice(index, 1);
    handleVariableChange(varName, currentList);
  };

  const getListItemText = (item: any): string => {
    if (typeof item === 'object' && item !== null && 'text' in item) {
      return item.text;
    }
    return String(item || '');
  };

  const previewHtml = useMemo(() => generatePreviewHtml(), [variableValues, section]);

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
                        value={
                          typeof variableValues[variable.name] === 'object' 
                            ? variableValues[variable.name]?.text || ''
                            : variableValues[variable.name] || ''
                        }
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        placeholder={`Enter ${variable.label.toLowerCase()}`}
                      />
                    ) : variable.type === 'list' ? (
                      <div className={styles.spaceY}>
                        {((variableValues[variable.name] as any[]) || []).map((item, index) => (
                          <div key={index} className={styles.listItemRow}>
                            <Input
                              value={getListItemText(item)}
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
                    ) : variable.type === 'table' ? (
                      <p className={styles.textSmall}>
                        Table editing is available in the template editor.
                      </p>
                    ) : (
                      <Textarea
                        id={variable.name}
                        value={
                          typeof variableValues[variable.name] === 'object'
                            ? variableValues[variable.name]?.text || ''
                            : variableValues[variable.name] || ''
                        }
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
