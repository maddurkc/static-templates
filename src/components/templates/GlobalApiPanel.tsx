import { useState } from "react";
import { 
  GlobalApiConfig, 
  GlobalApiIntegration, 
  GlobalApiVariable,
  generateIntegrationId, 
  sanitizeVariableName,
  detectSchema,
  DEFAULT_TRANSFORMATION,
  applyTransformations
} from "@/types/global-api-config";
import { Section } from "@/types/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  AlertCircle,
  PlusCircle,
  Table,
  List,
  Settings2,
  X,
  Copy,
  CheckCircle2,
  Circle,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_TEMPLATES, getAllCategories, getTemplateById } from "@/data/apiTemplates";
import { buildApiRequest, validateApiConfig } from "@/lib/apiTemplateUtils";
import { generateListVariableName, generateThymeleafListHtml } from "@/lib/listThymeleafUtils";
import { DataTransformationEditor } from "./DataTransformationEditor";
import styles from "./GlobalApiPanel.module.scss";

interface GlobalApiPanelProps {
  config: GlobalApiConfig;
  onUpdate: (config: GlobalApiConfig) => void;
  onCreateSection?: (section: Section) => void;
  onClose?: () => void;
}

export const GlobalApiPanel = ({ config, onUpdate, onCreateSection, onClose }: GlobalApiPanelProps) => {
  const { toast } = useToast();
  const categories = getAllCategories();
  const [expandedIntegrations, setExpandedIntegrations] = useState<Set<string>>(new Set());
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});

  // Create section from API variable
  const createSectionFromVariable = (variable: GlobalApiVariable) => {
    if (!onCreateSection) return;

    const sectionId = `section-${Date.now()}-${Math.random()}`;

    if (variable.dataType === 'stringList') {
      const listVariableName = generateListVariableName(sectionId);
      const items = Array.isArray(variable.data) 
        ? variable.data.map((item: string) => ({ text: String(item), children: [] }))
        : [{ text: 'Item 1', children: [] }];

      const newSection: Section = {
        id: sectionId,
        type: 'bullet-list-disc',
        content: '',
        variables: {
          items,
          listVariableName,
          listHtml: generateThymeleafListHtml(listVariableName, 'disc'),
          apiVariable: variable.name,
        },
        styles: { fontSize: '16px', color: '#000000' },
        isLabelEditable: true
      };
      onCreateSection(newSection);
      toast({
        title: "Bullet list created",
        description: `Created from ${variable.name} with ${items.length} items`,
      });
    } else if (variable.dataType === 'list') {
      const sample = Array.isArray(variable.data) && variable.data.length > 0 ? variable.data[0] : {};
      const columns = Object.keys(sample);
      const headers = columns.map(col => col.charAt(0).toUpperCase() + col.slice(1));
      
      const rows = Array.isArray(variable.data) 
        ? variable.data.slice(0, 10).map((item: any) => 
            columns.map(col => String(item[col] ?? ''))
          )
        : [columns.map(() => '')];

      const newSection: Section = {
        id: sectionId,
        type: 'table',
        content: '',
        variables: {
          tableData: {
            rows: [headers, ...rows],
            showBorder: true,
            borderColor: '#ddd',
            mergedCells: {},
            cellStyles: {},
            headerStyle: { backgroundColor: '#f5f5f5', textColor: '#000000', bold: true },
            columnWidths: columns.map(() => 'auto'),
            cellPadding: 'medium',
            isStatic: true,
            jsonMapping: { enabled: false, columnMappings: [] }
          },
          apiVariable: variable.name,
        },
        styles: { fontSize: '14px' },
        isLabelEditable: true
      };
      onCreateSection(newSection);
      toast({
        title: "Table created",
        description: `Created from ${variable.name} with ${columns.length} columns and ${rows.length} rows`,
      });
    } else if (variable.dataType === 'object') {
      const entries = Object.entries(variable.data || {});
      const rows = [
        ['Field', 'Value'],
        ...entries.slice(0, 20).map(([key, value]) => [
          key.charAt(0).toUpperCase() + key.slice(1),
          typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
        ])
      ];

      const newSection: Section = {
        id: sectionId,
        type: 'table',
        content: '',
        variables: {
          tableData: {
            rows,
            showBorder: true,
            borderColor: '#ddd',
            mergedCells: {},
            cellStyles: {},
            headerStyle: { backgroundColor: '#f5f5f5', textColor: '#000000', bold: true },
            columnWidths: ['auto', 'auto'],
            cellPadding: 'medium',
            isStatic: true,
            jsonMapping: { enabled: false, columnMappings: [] }
          },
          apiVariable: variable.name,
        },
        styles: { fontSize: '14px' },
        isLabelEditable: true
      };
      onCreateSection(newSection);
      toast({
        title: "Key-value table created",
        description: `Created from ${variable.name} with ${entries.length} fields`,
      });
    }
  };

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

  const getParamOverrides = (integration: GlobalApiIntegration, template: any): Record<string, string> => {
    const overrides: Record<string, string> = {};
    if (!integration.paramValues) return overrides;
    for (const [key, value] of Object.entries(integration.paramValues)) {
      if (value && value.trim() !== '') {
        overrides[key] = value;
      }
    }
    return overrides;
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
      let rawData: any;

      if (useMock && template.mockData) {
        await new Promise(resolve => setTimeout(resolve, 500));
        rawData = Array.isArray(template.mockData) 
          ? template.mockData.map((item: any) => ({ ...item, ...getParamOverrides(integration, template) }))
          : { ...template.mockData, ...getParamOverrides(integration, template) };
      } else {
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

        rawData = await response.json();
      }

      const transformedData = applyTransformations(rawData, integration.transformation);
      const dataType = detectDataType(transformedData);
      const schema = detectSchema(transformedData);

      const globalVariable: GlobalApiVariable = {
        name: integration.variableName,
        data: transformedData,
        dataType,
        lastFetched: new Date().toISOString(),
        schema,
        rawData: integration.transformation?.filters.length || integration.transformation?.fieldMappings.length 
          ? rawData 
          : undefined
      };

      onUpdate({
        ...config,
        globalVariables: {
          ...config.globalVariables,
          [integration.variableName]: globalVariable
        }
      });

      // Auto-switch to Response tab after successful fetch
      setActiveTab(prev => ({ ...prev, [integration.id]: 'response' }));

      const transformationApplied = integration.transformation?.filters.length || 
        integration.transformation?.limit || 
        integration.transformation?.fieldMappings.length;

      toast({
        title: useMock ? "Mock data loaded" : "API fetch successful",
        description: `Data stored in variable: ${integration.variableName} (${dataType})${transformationApplied ? ' - transformations applied' : ''}`,
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

  const getAvailableFieldsForTemplate = (template: any): string[] => {
    if (!template.mockData) return [];
    const sample = Array.isArray(template.mockData) ? template.mockData[0] : template.mockData;
    if (!sample || typeof sample !== 'object') return [];
    
    const fields: string[] = [];
    const extractFields = (obj: any, prefix: string = '') => {
      for (const key of Object.keys(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        fields.push(path);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          extractFields(value, path);
        }
      }
    };
    extractFields(sample);
    return fields;
  };

  // Build the display URL from template
  const getDisplayUrl = (integration: GlobalApiIntegration) => {
    const template = getTemplateById(integration.templateId);
    if (!template) return '';
    let url = template.url;
    // Replace placeholders with actual values or keep placeholder
    for (const param of template.requiredParams) {
      const value = integration.paramValues[param.name];
      if (value) {
        url = url.replace(`{${param.name}}`, value);
      }
    }
    return url;
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return styles.methodGet;
      case 'POST': return styles.methodPost;
      case 'PUT': return styles.methodPut;
      case 'DELETE': return styles.methodDelete;
      default: return styles.methodGet;
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.headerLeft}>
            <Zap className={styles.headerIcon} />
            <h3 className={styles.title}>API Integrations</h3>
          </div>
          <div className={styles.headerActions}>
            <Button size="sm" onClick={addIntegration} className={styles.addButton}>
              <Plus className={styles.iconSmall} />
              Add
            </Button>
            {onClose && (
              <Button size="icon" variant="ghost" onClick={onClose} className={styles.buttonIcon}>
                <X className={styles.iconSmall} />
              </Button>
            )}
          </div>
        </div>
        <p className={styles.subtitle}>
          Configure API endpoints and store responses as global variables
        </p>
      </div>

      <ScrollArea className={styles.content}>
        {config.integrations.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <Database className={styles.emptyIcon} />
            </div>
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
              const variable = config.globalVariables[integration.variableName];
              const currentTab = activeTab[integration.id] || 'request';

              return (
                <div 
                  key={integration.id} 
                  className={`${styles.integrationCard} ${!integration.enabled ? styles.disabled : ''}`}
                >
                  {/* Compact Header */}
                  <div 
                    className={styles.integrationHeader}
                    onClick={() => toggleExpanded(integration.id)}
                  >
                    <div className={styles.integrationLeft}>
                      {isExpanded ? <ChevronDown className={styles.iconTiny} /> : <ChevronRight className={styles.iconTiny} />}
                      <div className={styles.integrationMeta}>
                        <div className={styles.integrationNameRow}>
                          <span className={styles.integrationName}>{integration.name || 'Unnamed'}</span>
                          <span className={`${styles.statusDot} ${integration.enabled ? styles.statusActive : styles.statusInactive}`} />
                        </div>
                        <span className={styles.variableBadge}>
                          {'{{' + integration.variableName + '}}'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.integrationActions} onClick={(e) => e.stopPropagation()}>
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

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className={styles.integrationBody}>
                      {/* Name & Variable Name fields */}
                      <div className={styles.metaFields}>
                        <div className={styles.metaField}>
                          <Label className={styles.label}>Name</Label>
                          <Input
                            value={integration.name}
                            onChange={(e) => updateIntegration(integration.id, { name: e.target.value })}
                            placeholder="My API Integration"
                            className={styles.inputCompact}
                          />
                        </div>
                        <div className={styles.metaField}>
                          <Label className={styles.label}>Variable</Label>
                          <Input
                            value={integration.variableName}
                            onChange={(e) => updateIntegration(integration.id, { 
                              variableName: sanitizeVariableName(e.target.value) 
                            })}
                            placeholder="apiData"
                            className={`${styles.inputCompact} ${styles.inputMono}`}
                          />
                        </div>
                      </div>

                      {/* API Template Selector */}
                      <div className={styles.templateSelector}>
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

                      {/* Method + URL Bar (Postman-style) */}
                      {template && (
                        <>
                          <div className={styles.urlBar}>
                            <span className={`${styles.methodBadge} ${getMethodColor(template.method)}`}>
                              {template.method}
                            </span>
                            <span className={styles.urlText}>
                              {getDisplayUrl(integration)}
                            </span>
                            <Button
                              size="sm"
                              className={styles.sendButton}
                              onClick={() => testAndFetchApi(integration, !!template.mockData)}
                              disabled={isTesting || !integration.enabled}
                            >
                              {isTesting ? (
                                <Loader2 className={`${styles.iconSmall} ${styles.spinning}`} />
                              ) : (
                                <Send className={styles.iconSmall} />
                              )}
                              <span>{isTesting ? 'Sending...' : 'Send'}</span>
                            </Button>
                          </div>

                          {/* Description */}
                          <div className={styles.templateDescription}>
                            {template.description}
                          </div>

                          {/* Request / Response / Transform Tabs */}
                          <Tabs value={currentTab} onValueChange={(v) => setActiveTab(prev => ({ ...prev, [integration.id]: v }))}>
                            <TabsList className={styles.tabsList}>
                              <TabsTrigger value="request" className={styles.tabTrigger}>
                                Request
                                {template.requiredParams.length > 0 && (
                                  <span className={styles.tabBadge}>{template.requiredParams.length}</span>
                                )}
                              </TabsTrigger>
                              <TabsTrigger value="response" className={styles.tabTrigger}>
                                Response
                                {variable && (
                                  <CheckCircle2 className={styles.tabCheckIcon} />
                                )}
                              </TabsTrigger>
                              <TabsTrigger value="transform" className={styles.tabTrigger}>
                                Transform
                                {(integration.transformation?.filters.length || 
                                  integration.transformation?.fieldMappings.length ||
                                  integration.transformation?.limit) && (
                                  <span className={styles.tabBadgeActive}>Active</span>
                                )}
                              </TabsTrigger>
                            </TabsList>

                            {/* REQUEST TAB */}
                            <TabsContent value="request" className={styles.tabContent}>
                              {template.requiredParams.length === 0 ? (
                                <div className={styles.noParams}>
                                  <Circle className={styles.iconSmall} />
                                  <span>No parameters required</span>
                                </div>
                              ) : (
                                <div className={styles.paramsList}>
                                  {template.requiredParams.map(param => (
                                    <div key={param.name} className={styles.paramRow}>
                                      <div className={styles.paramHeader}>
                                        <span className={styles.paramName}>{param.label}</span>
                                        {param.required && <span className={styles.required}>*</span>}
                                        <Badge variant="outline" className={styles.paramLocation}>
                                          {param.location}
                                        </Badge>
                                      </div>
                                      {param.type === 'select' && param.options ? (
                                        <Select
                                          value={integration.paramValues[param.name] || ''}
                                          onValueChange={(value) => updateIntegration(integration.id, {
                                            paramValues: { ...integration.paramValues, [param.name]: value }
                                          })}
                                        >
                                          <SelectTrigger className={styles.paramInput}>
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
                                          className={styles.paramInput}
                                        />
                                      )}
                                      {param.description && (
                                        <p className={styles.paramDescription}>{param.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className={styles.actionButtons}>
                                {template.mockData && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => testAndFetchApi(integration, true)}
                                    disabled={isTesting || !integration.enabled}
                                    className={styles.actionBtn}
                                  >
                                    {isTesting ? (
                                      <Loader2 className={`${styles.iconSmall} ${styles.spinning}`} />
                                    ) : (
                                      <Database className={styles.iconSmall} />
                                    )}
                                    <span>Use Mock Data</span>
                                  </Button>
                                )}
                                {template.requiredParams.length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => testAndFetchApi(integration, false)}
                                    disabled={isTesting || !integration.enabled}
                                    className={styles.actionBtn}
                                  >
                                    {isTesting ? (
                                      <Loader2 className={`${styles.iconSmall} ${styles.spinning}`} />
                                    ) : (
                                      <Play className={styles.iconSmall} />
                                    )}
                                    <span>Fetch Live</span>
                                  </Button>
                                )}
                              </div>
                            </TabsContent>

                            {/* RESPONSE TAB */}
                            <TabsContent value="response" className={styles.tabContent}>
                              {variable ? (
                                <div className={styles.responseContent}>
                                  {/* Response Meta */}
                                  <div className={styles.responseMeta}>
                                    <div className={styles.responseMetaItem}>
                                      <span className={styles.responseMetaLabel}>Status</span>
                                      <Badge variant="default" className={styles.successBadge}>
                                        <CheckCircle2 className={styles.iconTiny} /> 200 OK
                                      </Badge>
                                    </div>
                                    <div className={styles.responseMetaItem}>
                                      <span className={styles.responseMetaLabel}>Type</span>
                                      <Badge variant="outline">
                                        {variable.dataType === 'stringList' ? 'string[]' : variable.dataType === 'list' ? 'object[]' : 'object'}
                                      </Badge>
                                    </div>
                                    {variable.lastFetched && (
                                      <div className={styles.responseMetaItem}>
                                        <span className={styles.responseMetaLabel}>Fetched</span>
                                        <span className={styles.responseTimestamp}>
                                          {new Date(variable.lastFetched).toLocaleTimeString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Schema/Fields */}
                                  {variable.schema && Object.keys(variable.schema).length > 0 && (
                                    <div className={styles.schemaSection}>
                                      <span className={styles.schemaSectionTitle}>Fields</span>
                                      <div className={styles.schemaFields}>
                                        {Object.entries(variable.schema).slice(0, 8).map(([field, type]) => (
                                          <div key={field} className={styles.schemaField}>
                                            <span className={styles.schemaFieldName}>{field}</span>
                                            <span className={styles.schemaFieldType}>{type}</span>
                                          </div>
                                        ))}
                                        {Object.keys(variable.schema).length > 8 && (
                                          <span className={styles.schemaMore}>
                                            +{Object.keys(variable.schema).length - 8} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Response Body Preview */}
                                  <div className={styles.responseBody}>
                                    <span className={styles.responseBodyTitle}>Body</span>
                                    <pre className={styles.responseJson}>
                                      {JSON.stringify(
                                        Array.isArray(variable.data) 
                                          ? variable.data.slice(0, 2) 
                                          : variable.data, 
                                        null, 
                                        2
                                      ).substring(0, 500)}
                                      {JSON.stringify(variable.data).length > 500 ? '\n...' : ''}
                                    </pre>
                                  </div>

                                  {/* Create Section from response */}
                                  <div className={styles.mappingSuggestion}>
                                    <div className={styles.suggestionRow}>
                                      <span className={styles.suggestionLabel}>Maps to:</span>
                                      {variable.dataType === 'stringList' && (
                                        <span className={styles.suggestionValue}>
                                          <List className={styles.iconTiny} /> Bullet List
                                        </span>
                                      )}
                                      {variable.dataType === 'list' && (
                                        <span className={styles.suggestionValue}>
                                          <Table className={styles.iconTiny} /> Table
                                        </span>
                                      )}
                                      {variable.dataType === 'object' && (
                                        <span className={styles.suggestionValue}>
                                          <Table className={styles.iconTiny} /> Key-Value Table
                                        </span>
                                      )}
                                      {onCreateSection && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => createSectionFromVariable(variable)}
                                          className={styles.createSectionBtn}
                                        >
                                          <PlusCircle className={styles.iconTiny} />
                                          Create Section
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className={styles.noResponse}>
                                  <AlertCircle className={styles.iconSmall} />
                                  <span>No response yet</span>
                                  <p className={styles.noResponseHint}>Send a request to see the response here</p>
                                </div>
                              )}
                            </TabsContent>

                            {/* TRANSFORM TAB */}
                            <TabsContent value="transform" className={styles.tabContent}>
                              {template.mockData ? (
                                <DataTransformationEditor
                                  transformation={integration.transformation || DEFAULT_TRANSFORMATION}
                                  onChange={(transformation) => updateIntegration(integration.id, { transformation })}
                                  availableFields={getAvailableFieldsForTemplate(template)}
                                />
                              ) : (
                                <div className={styles.noResponse}>
                                  <Settings2 className={styles.iconSmall} />
                                  <span>No data available for transformation</span>
                                  <p className={styles.noResponseHint}>Fetch data first to configure transformations</p>
                                </div>
                              )}
                            </TabsContent>
                          </Tabs>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </ScrollArea>
    </div>
  );
};
