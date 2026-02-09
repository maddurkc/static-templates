/**
 * Variables Panel Component
 * Displays only user-created {{placeholder}} variables from body sections
 * Allows editing variable values with live preview updates
 */

import React, { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Type, Edit3 } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { TemplateVariable } from "@/types/template-variable";
import styles from "./VariablesPanel.module.scss";

interface VariablesPanelProps {
  variables: TemplateVariable[];
  onVariableValueChange?: (variableName: string, value: string) => void;
  onFocusVariable?: (variableName: string | null) => void;
  readOnly?: boolean;
}

// System-generated variables follow these patterns - filter them out
const isSystemVariable = (varName: string): boolean => {
  const systemPatterns = [
    /^label_/,
    /^content_/,
    /^heading\d?Text_/,
    /^dateValue_/,
    /^items_/,
    /^ctaText_/,
    /^ctaUrl_/,
    /^programNameText$/,
    /^text_/,
    /^paragraph_/,
    /^paragraphContent_/,
    /^textContent_/,
    /^companyName$/,
    /^tagline$/,
    /^year$/,
    /^contactEmail$/,
  ];
  return systemPatterns.some(pattern => pattern.test(varName));
};

export const VariablesPanel: React.FC<VariablesPanelProps> = ({
  variables,
  onVariableValueChange,
  onFocusVariable,
  readOnly = false,
}) => {
  // Track local edits for each variable
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  // Filter to only show user-created placeholders from body sections
  const customBodyVariables = useMemo(() => {
    return variables.filter(v => 
      v.source === 'section' && !isSystemVariable(v.variableName)
    );
  }, [variables]);

  const handleValueChange = (variableName: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [variableName]: value }));
    if (onVariableValueChange) {
      onVariableValueChange(variableName, value);
    }
  };

  const getDisplayValue = (variable: TemplateVariable): string => {
    if (editedValues[variable.variableName] !== undefined) {
      return editedValues[variable.variableName];
    }
    return variable.defaultValue || '';
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>Custom Placeholders</h3>
          <p className={styles.subtitle}>
            Edit values to update preview
          </p>
        </div>
        <div className={styles.countBadge}>
          {customBodyVariables.length}
        </div>
      </div>

      <ScrollArea className={styles.scrollArea}>
        <div className={styles.content}>
          {customBodyVariables.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Type className="h-8 w-8" />
              </div>
              <p className={styles.emptyTitle}>No custom placeholders</p>
              <p className={styles.emptyHint}>
                Add {"{{variableName}}"} in your sections to create custom placeholders
              </p>
            </div>
          ) : (
            <div className={styles.variablesList}>
              {customBodyVariables.map((variable) => (
                <div key={variable.variableName} className={styles.variableCard}>
                  <div className={styles.variableHeader}>
                    <div className={styles.variableNameWrapper}>
                      <code className={styles.variableCode}>
                        {`{{${variable.variableName}}}`}
                      </code>
                    </div>
                    {!readOnly && (
                      <Edit3 className={styles.editIcon} />
                    )}
                  </div>
                  
                  <div className={styles.variableBody}>
                    <Label 
                      htmlFor={`var-${variable.variableName}`}
                      className={styles.variableLabel}
                    >
                      {variable.variableLabel}
                    </Label>
                    
                    {!readOnly ? (
                      <RichTextEditor
                        value={getDisplayValue(variable)}
                        onChange={(html) => handleValueChange(variable.variableName, html)}
                        onFocus={() => onFocusVariable?.(variable.variableName)}
                        placeholder={`Enter ${variable.variableLabel.toLowerCase()}`}
                        singleLine
                        className={styles.variableInput}
                      />
                    ) : (
                      <div className={styles.variableValue}>
                        {getDisplayValue(variable) || (
                          <span className={styles.noValue}>No value set</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default VariablesPanel;
