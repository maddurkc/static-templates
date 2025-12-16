import { GlobalApiConfig, GlobalApiVariable } from "@/types/global-api-config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Database, List, Table } from "lucide-react";
import styles from "./ApiVariablePicker.module.scss";

interface ApiVariablePickerProps {
  globalApiConfig: GlobalApiConfig;
  value?: string;
  onChange: (variableName: string, fieldPath?: string) => void;
  placeholder?: string;
  showFields?: boolean; // Whether to show nested field options
  dataTypeFilter?: 'stringList' | 'list' | 'object' | 'all'; // Filter by data type
}

export const ApiVariablePicker = ({ 
  globalApiConfig, 
  value, 
  onChange, 
  placeholder = "Select API variable...",
  showFields = true,
  dataTypeFilter = 'all'
}: ApiVariablePickerProps) => {
  const variables = Object.entries(globalApiConfig.globalVariables).filter(([_, variable]) => {
    if (dataTypeFilter === 'all') return true;
    return variable.dataType === dataTypeFilter;
  });

  if (variables.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Database className={styles.emptyIcon} />
        <span>No API variables available</span>
      </div>
    );
  }

  const getFieldOptions = (variable: GlobalApiVariable): { path: string; type: string }[] => {
    if (!variable.schema || !showFields) return [];
    return Object.entries(variable.schema)
      .filter(([_, type]) => type !== 'array' && type !== 'null')
      .map(([path, type]) => ({ path, type }));
  };

  const getVariableIcon = (dataType: GlobalApiVariable['dataType']) => {
    switch (dataType) {
      case 'stringList':
        return <List className={styles.optionIcon} />;
      case 'list':
        return <Table className={styles.optionIcon} />;
      default:
        return <Database className={styles.optionIcon} />;
    }
  };

  return (
    <Select value={value} onValueChange={(val) => {
      // Parse if it's a field path (format: variableName.fieldPath)
      const [varName, ...fieldParts] = val.split('.');
      onChange(varName, fieldParts.length > 0 ? fieldParts.join('.') : undefined);
    }}>
      <SelectTrigger className={styles.trigger}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={styles.content}>
        {variables.map(([name, variable]) => (
          <SelectGroup key={name}>
            <SelectLabel className={styles.groupLabel}>
              {getVariableIcon(variable.dataType)}
              <span>{name}</span>
              <span className={styles.typeTag}>
                {variable.dataType === 'stringList' ? 'string[]' : variable.dataType === 'list' ? 'object[]' : 'object'}
              </span>
            </SelectLabel>
            
            {/* Variable itself */}
            <SelectItem value={name} className={styles.option}>
              <div className={styles.optionContent}>
                <code className={styles.optionCode}>{`{{${name}}}`}</code>
                <span className={styles.optionHint}>
                  {variable.dataType === 'stringList' && 'Use for list items'}
                  {variable.dataType === 'list' && 'Use for table rows'}
                  {variable.dataType === 'object' && 'Use for key-value data'}
                </span>
              </div>
            </SelectItem>
            
            {/* Field paths for objects/arrays */}
            {showFields && getFieldOptions(variable).map(({ path, type }) => (
              <SelectItem key={`${name}.${path}`} value={`${name}.${path}`} className={styles.fieldOption}>
                <div className={styles.optionContent}>
                  <code className={styles.optionCode}>{`{{${name}.${path}}}`}</code>
                  <span className={styles.fieldType}>{type}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ApiVariablePicker;
