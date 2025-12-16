import { useState } from "react";
import { 
  GlobalApiConfig, 
  GlobalApiIntegration, 
  GlobalApiVariable,
  generateIntegrationId, 
  sanitizeVariableName,
  detectSchema 
} from "@/types/global-api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Play, 
  Loader2, 
  Database,
  Zap,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_TEMPLATES, getAllCategories, getTemplateById } from "@/data/apiTemplates";
import { buildApiRequest, validateApiConfig } from "@/lib/apiTemplateUtils";
import styles from "./GlobalApiPanel.module.scss";

interface GlobalApiPanelProps {
  config: GlobalApiConfig;
  onUpdate: (config: GlobalApiConfig) => void;
}

export const GlobalApiPanel = ({ config, onUpdate }: GlobalApiPanelProps) => {
  const { toast } = useToast();
  const categories = getAllCategories();
  const [expandedIntegrations, setExpandedIntegrations] = useState<Set<string>>(new Set());
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedIntegrations);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIntegrations(next);
  };

  const addIntegration = () => {
    const newIntegration: GlobalApiIntegration = {
      id: generateIntegrationId(),
      name: `API Integration ${config.integrations.length + 1}`,
      templateId: '',
      paramValues: {},
      variableName: `apiData${config.integrations.length + 1}`,
      enabled: true
    };
    
    onUpdate({
      ...config,
      integrations: [...config.integrations, newIntegration]
    });
    
    // Auto-expand new integration
    setExpandedIntegrations(prev => new Set([...prev, newIntegration.id]));
  };

  const updateIntegration = (id: string, updates: Partial<GlobalApiIntegration>) => {
    onUpdate({
      ...config,
      integrations: config.integrations.map(i => 
        i.id === id ? { ...i, ...updates } : i
      )
    });
  };

  const removeIntegration = (id: string) => {
    // Also remove the associated global variable
    const integration = config.integrations.find(i => i.id === id);
    const newVariables = { ...config.globalVariables };
    if (integration?.variableName && newVariables[integration.variableName]) {
      delete newVariables[integration.variableName];
    }
    
    onUpdate({
      ...config,
      integrations: config.integrations.filter(i => i.id !== id),
      globalVariables: newVariables
    });
  };

  const testAndFetchApi = async (integration: GlobalApiIntegration, useMock: boolean = false) => {
    const template = getTemplateById(integration.templateId);
    if (!template) {
      toast({
        title: "No template selected",
        description: "Please select an API template first.",
        variant: "destructive"
      });
      return;
    }

    setTestingIntegration(integration.id);

    try {
      let data: any;

      if (useMock && template.mockData) {
        // Use mock data directly
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        data = template.mockData;
      } else {
        // Build a temporary ApiConfig to use existing utilities
        const tempApiConfig = {
          enabled: true,
          templateId: integration.templateId,
          paramValues: integration.paramValues,
          mappings: []
        };

        const validation = validateApiConfig(tempApiConfig);
        if (!validation.valid) {
          toast({
            title: "Missing parameters",
            description: `Please fill in: ${validation.missingParams.join(', ')}`,
            variant: "destructive"
          });
          setTestingIntegration(null);
          return;
        }

        const request = buildApiRequest(tempApiConfig);
        if (!request) {
          toast({
            title: "Invalid configuration",
            description: "Could not build API request.",
            variant: "destructive"
          });
          setTestingIntegration(null);
          return;
        }

        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        data = await response.json();
      }

      const dataType = detectDataType(data);
      const schema = detectSchema(data);

      // Store the response as a global variable
      const globalVariable: GlobalApiVariable = {
        name: integration.variableName,
        data,
        dataType,
        lastFetched: new Date().toISOString(),
        schema
      };

      onUpdate({
        ...config,
        globalVariables: {
          ...config.globalVariables,
          [integration.variableName]: globalVariable
        }
      });

      toast({
        title: useMock ? "Mock data loaded" : "API fetch successful",
        description: `Data stored in variable: ${integration.variableName} (${dataType})`,
      });
    } catch (error) {
      console.error('API fetch error:', error);
      toast({
        title: "API fetch failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setTestingIntegration(null);
    }
  };

  // Detect data type more accurately
  const detectDataType = (data: any): 'object' | 'list' | 'stringList' => {
    if (Array.isArray(data)) {
      if (data.length === 0) return 'list';
      if (typeof data[0] === 'string' || typeof data[0] === 'number') {
        return 'stringList';
      }
      return 'list';
    }
    return 'object';
  };

  const getVariableFieldsList = (variable: GlobalApiVariable): string => {
    if (!variable.schema) return '';
    const fields = Object.keys(variable.schema).slice(0, 5);
    const suffix = Object.keys(variable.schema).length > 5 ? '...' : '';
    return fields.join(', ') + suffix;
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h3 className={styles.title}>API Integrations</h3>
          <Button size="sm" onClick={addIntegration} className={styles.buttonSmall}>
            <Plus className={styles.iconSmall} />
            Add
          </Button>
        </div>
        <p className={styles.subtitle}>
          Configure APIs and store responses as global variables
        </p>
      </div>

      <ScrollArea className={styles.content}>
        {config.integrations.length === 0 ? (
          <div className={styles.emptyState}>
            <Database className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No API integrations</p>
            <p className={styles.emptyText}>
              Add an API integration to fetch data and use it across your template sections.
            </p>
            <Button size="sm" onClick={addIntegration}>
              <Plus className={styles.iconSmall} style={{ marginRight: '0.5rem' }} />
              Add Integration
            </Button>
          </div>
        ) : (
          <>
            {config.integrations.map((integration) => {
              const template = getTemplateById(integration.templateId);
              const isExpanded = expandedIntegrations.has(integration.id);
              const isTesting = testingIntegration === integration.id;

              return (
                <div 
                  key={integration.id} 
                  className={`${styles.integrationCard} ${!integration.enabled ? styles.disabled : ''}`}
                >
                  <div className={styles.integrationHeader}>
                    <div className={styles.integrationName}>
                      <button onClick={() => toggleExpanded(integration.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {isExpanded ? <ChevronDown className={styles.iconSmall} /> : <ChevronRight className={styles.iconSmall} />}
                      </button>
                      <Zap className={styles.iconSmall} />
                      <span>{integration.name || 'Unnamed Integration'}</span>
                      <span className={`${styles.statusBadge} ${integration.enabled ? styles.active : styles.inactive}`}>
                        {integration.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className={styles.integrationActions}>
                      <Switch
                        checked={integration.enabled}
                        onCheckedChange={(enabled) => updateIntegration(integration.id, { enabled })}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeIntegration(integration.id)}
                        className={styles.buttonIcon}
                      >
                        <Trash2 className={styles.iconSmall} />
                      </Button>
                    </div>
                  </div>

                  <Collapsible open={isExpanded}>
                    <CollapsibleContent>
                      <div className={styles.integrationBody}>
                        {/* Integration Name */}
                        <div className={styles.fieldGroup}>
                          <Label className={styles.label}>Integration Name</Label>
                          <Input
                            value={integration.name}
                            onChange={(e) => updateIntegration(integration.id, { name: e.target.value })}
                            placeholder="My API Integration"
                            className={styles.input}
                          />
                        </div>

                        {/* Variable Name */}
                        <div className={styles.fieldGroup}>
                          <Label className={styles.label}>
                            Variable Name <span className={styles.required}>*</span>
                          </Label>
                          <Input
                            value={integration.variableName}
                            onChange={(e) => updateIntegration(integration.id, { 
                              variableName: sanitizeVariableName(e.target.value) 
                            })}
                            placeholder="apiData"
                            className={`${styles.input} ${styles.inputMono}`}
                          />
                          <p className={styles.description}>
                            Use this name to reference the data in sections
                          </p>
                        </div>

                        {/* API Template Selection */}
                        <div className={styles.fieldGroup}>
                          <Label className={styles.label}>API Template</Label>
                          <Select
                            value={integration.templateId}
                            onValueChange={(templateId) => updateIntegration(integration.id, { 
                              templateId, 
                              paramValues: {} 
                            })}
                          >
                            <SelectTrigger className={styles.selectTrigger}>
                              <SelectValue placeholder="Choose an API template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(category => (
                                <div key={category}>
                                  <div className={styles.categoryHeader}>{category}</div>
                                  {API_TEMPLATES.filter(t => t.category === category).map(t => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {template && (
                          <>
                            <div className={styles.infoBox}>
                              {template.description}
                            </div>

                            {/* Template Parameters */}
                            {template.requiredParams.map(param => (
                              <div key={param.name} className={styles.fieldGroup}>
                                <Label className={styles.label}>
                                  {param.label}
                                  {param.required && <span className={styles.required}>*</span>}
                                </Label>
                                {param.type === 'select' && param.options ? (
                                  <Select
                                    value={integration.paramValues[param.name] || ''}
                                    onValueChange={(value) => updateIntegration(integration.id, {
                                      paramValues: { ...integration.paramValues, [param.name]: value }
                                    })}
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
                                    value={integration.paramValues[param.name] || ''}
                                    onChange={(e) => updateIntegration(integration.id, {
                                      paramValues: { ...integration.paramValues, [param.name]: e.target.value }
                                    })}
                                    placeholder={param.placeholder}
                                    className={styles.input}
                                  />
                                )}
                                {param.description && (
                                  <p className={styles.description}>{param.description}</p>
                                )}
                              </div>
                            ))}

                            {/* Test & Fetch Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              {template.mockData && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => testAndFetchApi(integration, true)}
                                  disabled={isTesting || !integration.enabled}
                                  style={{ flex: 1 }}
                                >
                                  {isTesting ? (
                                    <>
                                      <Loader2 className={styles.iconSmall} style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                                      Loading...
                                    </>
                                  ) : (
                                    <>
                                      <Database className={styles.iconSmall} style={{ marginRight: '0.5rem' }} />
                                      Use Mock Data
                                    </>
                                  )}
                                </Button>
                              )}
                              {template.requiredParams.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => testAndFetchApi(integration, false)}
                                  disabled={isTesting || !integration.enabled}
                                  style={{ flex: 1 }}
                                >
                                  {isTesting ? (
                                    <>
                                      <Loader2 className={styles.iconSmall} style={{ marginRight: '0.5rem', animation: 'spin 1s linear infinite' }} />
                                      Fetching...
                                    </>
                                  ) : (
                                    <>
                                      <Play className={styles.iconSmall} style={{ marginRight: '0.5rem' }} />
                                      Fetch Live Data
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}

            {/* Global Variables Section */}
            {Object.keys(config.globalVariables).length > 0 && (
              <div className={styles.variablesSection}>
                <div className={styles.variablesHeader}>
                  <h4 className={styles.variablesTitle}>Available Global Variables</h4>
                </div>

                {Object.entries(config.globalVariables).map(([name, variable]) => (
                  <div key={name} className={styles.variableCard}>
                    <div>
                      <span className={styles.variableName}>{name}</span>
                      <span className={styles.variableType}>
                        ({variable.dataType === 'stringList' ? 'string[]' : variable.dataType === 'list' ? 'object[]' : 'object'})
                      </span>
                    </div>
                    <div className={styles.variableMeta}>
                      <span className={styles.variableFields}>
                        {variable.dataType === 'stringList' 
                          ? `${Array.isArray(variable.data) ? variable.data.length : 0} items`
                          : `Fields: ${getVariableFieldsList(variable)}`
                        }
                      </span>
                      {variable.lastFetched && (
                        <span className={styles.variableTimestamp}>
                          {new Date(variable.lastFetched).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    {/* Mapping suggestion */}
                    <div className={styles.mappingSuggestion}>
                      <span className={styles.suggestionLabel}>Suggested mapping:</span>
                      {variable.dataType === 'stringList' && (
                        <span className={styles.suggestionValue}>→ Bullet List</span>
                      )}
                      {variable.dataType === 'list' && (
                        <span className={styles.suggestionValue}>→ Table Section</span>
                      )}
                      {variable.dataType === 'object' && (
                        <span className={styles.suggestionValue}>→ Table or Key-Value List</span>
                      )}
                    </div>
                    {/* Preview data sample */}
                    <div className={styles.dataSample}>
                      <code className={styles.sampleCode}>
                        {JSON.stringify(
                          Array.isArray(variable.data) 
                            ? variable.data.slice(0, 2) 
                            : variable.data, 
                          null, 
                          1
                        ).substring(0, 150)}
                        {JSON.stringify(variable.data).length > 150 ? '...' : ''}
                      </code>
                    </div>
                  </div>
                ))}

                <div className={styles.usageHint}>
                  <div className={styles.usageTitle}>Data Type Mapping:</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>String List</strong> → Add a bullet list section
                  </div>
                  <div style={{ marginTop: '0.25rem' }}>
                    <strong>Object List</strong> → Add a table section
                  </div>
                  <div style={{ marginTop: '0.25rem' }}>
                    <strong>Single Object</strong> → Add table (rows as fields) or labeled list
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
};
