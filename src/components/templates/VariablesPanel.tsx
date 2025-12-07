/**
 * Variables Panel Component
 * Displays and manages all extracted template variables
 * Shows variable names, types, defaults, required flags, and source sections
 */

import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  Type, 
  Hash, 
  Calendar, 
  Mail, 
  Link, 
  List, 
  Table, 
  ChevronDown, 
  ChevronRight,
  FileText,
  LayoutTemplate,
  Footprints,
  Asterisk
} from "lucide-react";
import { TemplateVariable } from "@/types/template-variable";
import styles from "./VariablesPanel.module.scss";

interface VariablesPanelProps {
  variables: TemplateVariable[];
  onVariableUpdate?: (variableName: string, updates: Partial<TemplateVariable>) => void;
  readOnly?: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  date: <Calendar className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  url: <Link className="h-3.5 w-3.5" />,
  list: <List className="h-3.5 w-3.5" />,
  table: <Table className="h-3.5 w-3.5" />,
};

const sourceIcons: Record<string, React.ReactNode> = {
  subject: <FileText className="h-3.5 w-3.5" />,
  header: <LayoutTemplate className="h-3.5 w-3.5" />,
  section: <Type className="h-3.5 w-3.5" />,
  footer: <Footprints className="h-3.5 w-3.5" />,
};

const sourceLabels: Record<string, string> = {
  subject: "Subject",
  header: "Header",
  section: "Body Section",
  footer: "Footer",
};

const typeBadgeColors: Record<string, string> = {
  text: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  number: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  date: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  email: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  url: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  list: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  table: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

export const VariablesPanel: React.FC<VariablesPanelProps> = ({
  variables,
  onVariableUpdate,
  readOnly = false,
}) => {
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({
    subject: true,
    header: true,
    section: true,
    footer: true,
  });

  // Group variables by source
  const groupedVariables = useMemo(() => {
    const groups: Record<string, TemplateVariable[]> = {
      subject: [],
      header: [],
      section: [],
      footer: [],
    };

    variables.forEach((v) => {
      if (groups[v.source]) {
        groups[v.source].push(v);
      } else {
        groups.section.push(v);
      }
    });

    return groups;
  }, [variables]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const handleRequiredChange = (variableName: string, isRequired: boolean) => {
    if (onVariableUpdate) {
      onVariableUpdate(variableName, { isRequired });
    }
  };

  const handleDefaultValueChange = (variableName: string, defaultValue: string) => {
    if (onVariableUpdate) {
      onVariableUpdate(variableName, { defaultValue });
    }
  };

  const renderVariableItem = (variable: TemplateVariable) => (
    <div key={variable.variableName} className={styles.variableItem}>
      <div className={styles.variableHeader}>
        <div className={styles.variableName}>
          <code className={styles.variableCode}>{"{{" + variable.variableName + "}}"}</code>
          {variable.isRequired && (
            <Asterisk className="h-3 w-3 text-red-500" />
          )}
        </div>
        <Badge 
          variant="secondary" 
          className={`${styles.typeBadge} ${typeBadgeColors[variable.variableType] || ''}`}
        >
          {typeIcons[variable.variableType]}
          <span>{variable.variableType}</span>
        </Badge>
      </div>

      <div className={styles.variableDetails}>
        <div className={styles.variableLabel}>
          {variable.variableLabel}
        </div>

        {!readOnly && (
          <div className={styles.variableControls}>
            <div className={styles.controlRow}>
              <div className={styles.checkboxWrapper}>
                <Checkbox
                  id={`required-${variable.variableName}`}
                  checked={variable.isRequired}
                  onCheckedChange={(checked) =>
                    handleRequiredChange(variable.variableName, checked === true)
                  }
                />
                <Label 
                  htmlFor={`required-${variable.variableName}`}
                  className={styles.checkboxLabel}
                >
                  Required
                </Label>
              </div>
            </div>

            {variable.variableType === 'text' && (
              <div className={styles.controlRow}>
                <Label className={styles.inputLabel}>Default:</Label>
                <Input
                  value={variable.defaultValue || ''}
                  onChange={(e) =>
                    handleDefaultValueChange(variable.variableName, e.target.value)
                  }
                  placeholder="Default value"
                  className={styles.defaultInput}
                />
              </div>
            )}
          </div>
        )}

        {variable.sectionId && (
          <div className={styles.sectionLink}>
            <span className={styles.sectionLinkLabel}>Section:</span>
            <code className={styles.sectionId}>{variable.sectionId.slice(0, 8)}...</code>
          </div>
        )}
      </div>
    </div>
  );

  const renderGroup = (groupKey: string, groupVariables: TemplateVariable[]) => {
    if (groupVariables.length === 0) return null;

    return (
      <Collapsible
        key={groupKey}
        open={expandedGroups[groupKey]}
        onOpenChange={() => toggleGroup(groupKey)}
        className={styles.group}
      >
        <CollapsibleTrigger className={styles.groupTrigger}>
          <div className={styles.groupHeader}>
            {expandedGroups[groupKey] ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {sourceIcons[groupKey]}
            <span className={styles.groupTitle}>{sourceLabels[groupKey]}</span>
            <Badge variant="outline" className={styles.countBadge}>
              {groupVariables.length}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className={styles.groupContent}>
          {groupVariables.map(renderVariableItem)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const totalCount = variables.length;
  const requiredCount = variables.filter((v) => v.isRequired).length;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.title}>Template Variables</h3>
        <div className={styles.stats}>
          <Badge variant="secondary">{totalCount} total</Badge>
          {requiredCount > 0 && (
            <Badge variant="destructive">{requiredCount} required</Badge>
          )}
        </div>
      </div>

      <Separator className={styles.separator} />

      <ScrollArea className={styles.scrollArea}>
        <div className={styles.content}>
          {totalCount === 0 ? (
            <div className={styles.emptyState}>
              <Type className="h-8 w-8 text-muted-foreground" />
              <p>No variables found</p>
              <span className={styles.emptyHint}>
                Add {"{{placeholders}}"} in your sections to create variables
              </span>
            </div>
          ) : (
            <>
              {renderGroup("subject", groupedVariables.subject)}
              {renderGroup("header", groupedVariables.header)}
              {renderGroup("section", groupedVariables.section)}
              {renderGroup("footer", groupedVariables.footer)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default VariablesPanel;
