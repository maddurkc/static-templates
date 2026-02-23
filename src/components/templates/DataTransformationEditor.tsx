import { useState } from "react";
import {
  DataTransformation,
  FilterCondition,
  FieldMapping,
  DEFAULT_TRANSFORMATION,
  generateFilterId,
  generateMappingId,
} from "@/types/global-api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ChevronDown, ChevronRight, Filter, ArrowUpDown, Columns, Hash } from "lucide-react";
import styles from "./DataTransformationEditor.module.scss";

interface DataTransformationEditorProps {
  transformation: DataTransformation;
  onChange: (transformation: DataTransformation) => void;
  availableFields: string[];
}

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

export const DataTransformationEditor = ({
  transformation,
  onChange,
  availableFields
}: DataTransformationEditorProps) => {
  const [filtersOpen, setFiltersOpen] = useState(transformation.filters.length > 0);
  const [mappingsOpen, setMappingsOpen] = useState(transformation.fieldMappings.length > 0);
  const [selectOpen, setSelectOpen] = useState(transformation.selectFields.length > 0);
  const [sortOpen, setSortOpen] = useState(!!transformation.sortField);

  // Filter operations
  const addFilter = () => {
    onChange({
      ...transformation,
      filters: [
        ...transformation.filters,
        { id: generateFilterId(), field: availableFields[0] || '', operator: 'equals', value: '' }
      ]
    });
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    onChange({
      ...transformation,
      filters: transformation.filters.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const removeFilter = (id: string) => {
    onChange({
      ...transformation,
      filters: transformation.filters.filter(f => f.id !== id)
    });
  };

  // Field mapping operations
  const addMapping = () => {
    onChange({
      ...transformation,
      fieldMappings: [
        ...transformation.fieldMappings,
        { id: generateMappingId(), sourceField: availableFields[0] || '', targetField: '', enabled: true }
      ]
    });
  };

  const updateMapping = (id: string, updates: Partial<FieldMapping>) => {
    onChange({
      ...transformation,
      fieldMappings: transformation.fieldMappings.map(m => m.id === id ? { ...m, ...updates } : m)
    });
  };

  const removeMapping = (id: string) => {
    onChange({
      ...transformation,
      fieldMappings: transformation.fieldMappings.filter(m => m.id !== id)
    });
  };

  // Field selection
  const toggleFieldSelection = (field: string) => {
    const selected = transformation.selectFields.includes(field);
    onChange({
      ...transformation,
      selectFields: selected 
        ? transformation.selectFields.filter(f => f !== field)
        : [...transformation.selectFields, field]
    });
  };

  const selectAllFields = () => {
    onChange({ ...transformation, selectFields: [] }); // Empty means all
  };

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <span className={styles.title}>Data Transformations</span>
        <span className={styles.subtitle}>Filter, map, and sort API data</span>
      </div>

      {/* Filters Section */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger className={styles.sectionTrigger}>
          {filtersOpen ? <ChevronDown className={styles.icon} /> : <ChevronRight className={styles.icon} />}
          <Filter className={styles.icon} />
          <span>Filters</span>
          {transformation.filters.length > 0 && (
            <span className={styles.badge}>{transformation.filters.length}</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={styles.sectionContent}>
            {transformation.filters.length > 1 && (
              <div className={styles.logicSelect}>
                <Label className={styles.smallLabel}>Filter Logic:</Label>
                <Select
                  value={transformation.filterLogic}
                  onValueChange={(value: 'and' | 'or') => onChange({ ...transformation, filterLogic: value })}
                >
                  <SelectTrigger className={styles.miniSelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">Match ALL (AND)</SelectItem>
                    <SelectItem value="or">Match ANY (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {transformation.filters.map((filter) => (
              <div key={filter.id} className={styles.filterRow}>
                <Select
                  value={filter.field}
                  onValueChange={(value) => updateFilter(filter.id, { field: value })}
                >
                  <SelectTrigger className={styles.fieldSelect}>
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(field => (
                      <SelectItem key={field} value={field}>{field}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filter.operator}
                  onValueChange={(value: any) => updateFilter(filter.id, { operator: value })}
                >
                  <SelectTrigger className={styles.operatorSelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    placeholder="Value"
                    className={styles.valueInput}
                  />
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeFilter(filter.id)}
                  className={styles.removeBtn}
                >
                  <Trash2 className={styles.iconSmall} />
                </Button>
              </div>
            ))}

            <Button size="sm" variant="outline" onClick={addFilter} className={styles.addBtn}>
              <Plus className={styles.iconSmall} /> Add Filter
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Sort Section */}
      <Collapsible open={sortOpen} onOpenChange={setSortOpen}>
        <CollapsibleTrigger className={styles.sectionTrigger}>
          {sortOpen ? <ChevronDown className={styles.icon} /> : <ChevronRight className={styles.icon} />}
          <ArrowUpDown className={styles.icon} />
          <span>Sort & Limit</span>
          {transformation.sortField && <span className={styles.badge}>1</span>}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={styles.sectionContent}>
            <div className={styles.sortRow}>
              <div className={styles.sortField}>
                <Label className={styles.smallLabel}>Sort by</Label>
                <Select
                   value={transformation.sortField || '__none__'}
                   onValueChange={(value) => onChange({ ...transformation, sortField: value === '__none__' ? undefined : value })}
                 >
                   <SelectTrigger className={styles.fieldSelect}>
                     <SelectValue placeholder="No sorting" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="__none__">No sorting</SelectItem>
                    {availableFields.map(field => (
                      <SelectItem key={field} value={field}>{field}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {transformation.sortField && (
                <div className={styles.sortOrder}>
                  <Label className={styles.smallLabel}>Order</Label>
                  <Select
                    value={transformation.sortOrder || 'asc'}
                    onValueChange={(value: 'asc' | 'desc') => onChange({ ...transformation, sortOrder: value })}
                  >
                    <SelectTrigger className={styles.miniSelect}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className={styles.limitRow}>
              <Label className={styles.smallLabel}>
                <Hash className={styles.iconSmall} /> Limit results
              </Label>
              <Input
                type="number"
                min={0}
                value={transformation.limit || ''}
                onChange={(e) => onChange({ 
                  ...transformation, 
                  limit: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                placeholder="No limit"
                className={styles.limitInput}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Field Selection Section */}
      <Collapsible open={selectOpen} onOpenChange={setSelectOpen}>
        <CollapsibleTrigger className={styles.sectionTrigger}>
          {selectOpen ? <ChevronDown className={styles.icon} /> : <ChevronRight className={styles.icon} />}
          <Columns className={styles.icon} />
          <span>Select Fields</span>
          {transformation.selectFields.length > 0 && (
            <span className={styles.badge}>{transformation.selectFields.length}</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={styles.sectionContent}>
            <div className={styles.selectAllRow}>
              <Button size="sm" variant="ghost" onClick={selectAllFields}>
                {transformation.selectFields.length === 0 ? 'All selected' : 'Select All'}
              </Button>
            </div>
            <div className={styles.fieldGrid}>
              {availableFields.map(field => (
                <label key={field} className={styles.fieldCheckbox}>
                  <Checkbox
                    checked={transformation.selectFields.length === 0 || transformation.selectFields.includes(field)}
                    onCheckedChange={() => toggleFieldSelection(field)}
                  />
                  <span className={styles.fieldName}>{field}</span>
                </label>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Field Mapping Section */}
      <Collapsible open={mappingsOpen} onOpenChange={setMappingsOpen}>
        <CollapsibleTrigger className={styles.sectionTrigger}>
          {mappingsOpen ? <ChevronDown className={styles.icon} /> : <ChevronRight className={styles.icon} />}
          <ArrowUpDown className={styles.icon} style={{ transform: 'rotate(90deg)' }} />
          <span>Rename Fields</span>
          {transformation.fieldMappings.length > 0 && (
            <span className={styles.badge}>{transformation.fieldMappings.length}</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={styles.sectionContent}>
            {transformation.fieldMappings.map((mapping) => (
              <div key={mapping.id} className={styles.mappingRow}>
                <Select
                  value={mapping.sourceField}
                  onValueChange={(value) => updateMapping(mapping.id, { sourceField: value })}
                >
                  <SelectTrigger className={styles.fieldSelect}>
                    <SelectValue placeholder="Source field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(field => (
                      <SelectItem key={field} value={field}>{field}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className={styles.arrow}>→</span>

                <Input
                  value={mapping.targetField}
                  onChange={(e) => updateMapping(mapping.id, { targetField: e.target.value })}
                  placeholder="New name"
                  className={styles.valueInput}
                />

                <Switch
                  checked={mapping.enabled}
                  onCheckedChange={(enabled) => updateMapping(mapping.id, { enabled })}
                />

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeMapping(mapping.id)}
                  className={styles.removeBtn}
                >
                  <Trash2 className={styles.iconSmall} />
                </Button>
              </div>
            ))}

            <Button size="sm" variant="outline" onClick={addMapping} className={styles.addBtn}>
              <Plus className={styles.iconSmall} /> Add Mapping
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
