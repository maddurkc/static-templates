import { useState } from "react";
import { ApiConfig, ApiMapping } from "@/types/api-config";
import { Section } from "@/types/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { API_TEMPLATES, getAllCategories } from "@/data/apiTemplates";
import styles from "./ApiConfigPopover.module.scss";

interface ApiConfigPopoverProps {
  apiConfig: ApiConfig;
  sections: Section[];
  onUpdate: (config: ApiConfig) => void;
}

export const ApiConfigPopover = ({ apiConfig, sections, onUpdate }: ApiConfigPopoverProps) => {
  const { toast } = useToast();
  const selectedTemplate = API_TEMPLATES.find(t => t.id === apiConfig.templateId);
  const categories = getAllCategories();

  const updateConfig = (updates: Partial<ApiConfig>) => {
    onUpdate({ ...apiConfig, ...updates });
  };

  const updateParamValue = (paramName: string, value: string) => {
    updateConfig({
      paramValues: { ...apiConfig.paramValues, [paramName]: value }
    });
  };

  const addMapping = () => {
    if (selectedTemplate?.sampleMappings && apiConfig.mappings.length === 0) {
      const mappingsWithIds = selectedTemplate.sampleMappings.map(m => ({
        ...m,
        id: `mapping-${Date.now()}-${Math.random()}`,
        sectionId: sections[0]?.id || ''
      }));
      updateConfig({ mappings: mappingsWithIds });
    } else {
      const newMapping: ApiMapping = {
        id: `mapping-${Date.now()}`,
        sectionId: sections[0]?.id || '',
        apiPath: '',
        dataType: 'text',
      };
      updateConfig({ mappings: [...apiConfig.mappings, newMapping] });
    }
  };

  const updateMapping = (id: string, updates: Partial<ApiMapping>) => {
    updateConfig({
      mappings: apiConfig.mappings.map(m => m.id === id ? { ...m, ...updates } : m)
    });
  };

  const removeMapping = (id: string) => {
    updateConfig({ mappings: apiConfig.mappings.filter(m => m.id !== id) });
  };

  const getSectionVariables = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section?.variables) return [];
    return Object.keys(section.variables);
  };

  return (
    <ScrollArea style={{ maxHeight: '600px' }}>
      <div className={styles.container}>
        <div className={styles.section}>
          <div className={styles.enableSwitch}>
            <Label className={styles.sectionTitle}>Enable API Integration</Label>
            <Switch
              checked={apiConfig.enabled}
              onCheckedChange={(enabled) => updateConfig({ enabled })}
            />
          </div>
          <p className={styles.description}>
            Fetch data from an API and automatically map it to section variables
          </p>
        </div>

        {apiConfig.enabled && (
          <>
            <Separator />

            {/* API Template Selection */}
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Select API Template</h4>
              
              <div className={styles.section}>
                <Label className={styles.label}>Template</Label>
                <Select
                  value={apiConfig.templateId}
                  onValueChange={(templateId) => updateConfig({ templateId, paramValues: {} })}
                >
                  <SelectTrigger className={styles.selectTrigger}>
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <div key={category}>
                        <div className={styles.categoryHeader}>
                          {category}
                        </div>
                        {API_TEMPLATES.filter(t => t.category === category).map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className={styles.infoBox}>
                  {selectedTemplate.description}
                </div>
              )}
            </div>

            {selectedTemplate && (
              <>
                <Separator />

                {/* Template Parameters */}
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>Template Parameters</h4>
                  
                  {selectedTemplate.requiredParams.map(param => (
                    <div key={param.name} className={styles.section}>
                      <Label className={styles.label}>
                        {param.label}
                        {param.required && <span className={styles.textError}>*</span>}
                      </Label>
                      {param.type === 'select' && param.options ? (
                        <Select
                          value={apiConfig.paramValues[param.name] || ''}
                          onValueChange={(value) => updateParamValue(param.name, value)}
                        >
                          <SelectTrigger className={styles.selectTrigger}>
                            <SelectValue placeholder={param.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {param.options.map(option => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={apiConfig.paramValues[param.name] || ''}
                          onChange={(e) => updateParamValue(param.name, e.target.value)}
                          placeholder={param.placeholder}
                          className={styles.inputSmall}
                        />
                      )}
                      {param.description && (
                        <p className={styles.description}>{param.description}</p>
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Data Mappings */}
                <div className={styles.section}>
                  <div className={styles.enableSwitch}>
                    <h4 className={styles.sectionTitle}>Data Mappings</h4>
                    <Button size="sm" variant="outline" onClick={addMapping} className={styles.buttonSmall}>
                      <Plus className={`${styles.icon} ${styles.iconMargin}`} />
                      Add Mapping
                    </Button>
                  </div>

                  <div className={styles.section}>
                    {apiConfig.mappings.map((mapping) => {
                      const selectedSection = sections.find(s => s.id === mapping.sectionId);
                      const variables = getSectionVariables(mapping.sectionId);
                      
                      return (
                        <div key={mapping.id} className={styles.mappingCard}>
                          <div className={styles.enableSwitch}>
                            <Label className={styles.label} style={{ fontWeight: 600 }}>Mapping</Label>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeMapping(mapping.id)}
                              className={styles.buttonIcon}
                            >
                              <Trash2 className={styles.icon} />
                            </Button>
                          </div>

                          <div className={styles.section}>
                            <Label className={styles.label}>Target Section</Label>
                            <Select
                              value={mapping.sectionId}
                              onValueChange={(sectionId) => updateMapping(mapping.id, { sectionId })}
                            >
                              <SelectTrigger className={styles.selectTrigger}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {sections.map((section) => (
                                  <SelectItem key={section.id} value={section.id}>
                                    Section {sections.indexOf(section) + 1} ({section.type})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className={styles.section}>
                            <Label className={styles.label}>API Response Path (JSON Path)</Label>
                            <Input
                              value={mapping.apiPath}
                              onChange={(e) => updateMapping(mapping.id, { apiPath: e.target.value })}
                              placeholder="data.items or $.results[0].name"
                              className={styles.inputMono}
                            />
                            <p className={styles.description}>
                              e.g., "data.items" or "results[0].title"
                            </p>
                          </div>

                          <div className={styles.section}>
                            <Label className={styles.label}>Data Type</Label>
                            <Select
                              value={mapping.dataType}
                              onValueChange={(dataType: 'text' | 'list' | 'html') => 
                                updateMapping(mapping.id, { dataType })
                              }
                            >
                              <SelectTrigger className={styles.selectTrigger}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="list">List (Array)</SelectItem>
                                <SelectItem value="html">HTML</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {variables.length > 0 && (
                            <div className={styles.section}>
                              <Label className={styles.label}>Variable (Optional)</Label>
                              <Select
                                value={mapping.variableName || ''}
                                onValueChange={(variableName) => 
                                  updateMapping(mapping.id, { variableName })
                                }
                              >
                                <SelectTrigger className={styles.selectTrigger}>
                                  <SelectValue placeholder="Select variable" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">Content only</SelectItem>
                                  {variables.map((varName) => (
                                    <SelectItem key={varName} value={varName}>
                                      {varName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {apiConfig.mappings.length === 0 && (
                    <p className={`${styles.description} ${styles.textCenter}`}>
                      No mappings configured. Add a mapping to start.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
};