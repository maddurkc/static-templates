import { useState } from "react";
import { ApiConfig, ApiMapping } from "@/types/api-config";
import { Section } from "@/types/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface ApiConfigPopoverProps {
  apiConfig: ApiConfig;
  sections: Section[];
  onUpdate: (config: ApiConfig) => void;
  onTestFetch: () => void;
}

export const ApiConfigPopover = ({ apiConfig, sections, onUpdate, onTestFetch }: ApiConfigPopoverProps) => {
  const { toast } = useToast();
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");

  const updateConfig = (updates: Partial<ApiConfig>) => {
    onUpdate({ ...apiConfig, ...updates });
  };

  const addHeader = () => {
    if (!headerKey || !headerValue) {
      toast({ title: "Error", description: "Please enter both header key and value", variant: "destructive" });
      return;
    }
    updateConfig({
      headers: { ...apiConfig.headers, [headerKey]: headerValue }
    });
    setHeaderKey("");
    setHeaderValue("");
  };

  const removeHeader = (key: string) => {
    const { [key]: _, ...rest } = apiConfig.headers || {};
    updateConfig({ headers: rest });
  };

  const addMapping = () => {
    const newMapping: ApiMapping = {
      id: `mapping-${Date.now()}`,
      sectionId: sections[0]?.id || '',
      apiPath: '',
      dataType: 'text',
    };
    updateConfig({ mappings: [...apiConfig.mappings, newMapping] });
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
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-4 p-1">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Enable API Integration</Label>
            <Switch
              checked={apiConfig.enabled}
              onCheckedChange={(enabled) => updateConfig({ enabled })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Fetch data from an API and automatically map it to section variables
          </p>
        </div>

        {apiConfig.enabled && (
          <>
            <Separator />

            {/* API Configuration */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">API Endpoint</h4>
              
              <div className="space-y-2">
                <Label className="text-xs">Method</Label>
                <Select
                  value={apiConfig.method}
                  onValueChange={(method: 'GET' | 'POST') => updateConfig({ method })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">URL</Label>
                <Input
                  value={apiConfig.url}
                  onChange={(e) => updateConfig({ url: e.target.value })}
                  placeholder="https://api.example.com/data"
                  className="h-8 text-sm"
                />
              </div>

              {apiConfig.method === 'POST' && (
                <div className="space-y-2">
                  <Label className="text-xs">Request Body (JSON)</Label>
                  <Input
                    value={apiConfig.body || ''}
                    onChange={(e) => updateConfig({ body: e.target.value })}
                    placeholder='{"key": "value"}'
                    className="h-8 text-sm font-mono"
                  />
                </div>
              )}

              {/* Headers */}
              <div className="space-y-2">
                <Label className="text-xs">Headers</Label>
                <div className="space-y-2">
                  {Object.entries(apiConfig.headers || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Input value={key} disabled className="h-8 text-xs flex-1" />
                      <Input value={value} disabled className="h-8 text-xs flex-1" />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeHeader(key)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={headerKey}
                      onChange={(e) => setHeaderKey(e.target.value)}
                      placeholder="Header name"
                      className="h-8 text-xs flex-1"
                    />
                    <Input
                      value={headerValue}
                      onChange={(e) => setHeaderValue(e.target.value)}
                      placeholder="Header value"
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={addHeader}
                      className="h-8 w-8"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={onTestFetch}
                className="w-full"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Test API & Fetch Data
              </Button>
            </div>

            <Separator />

            {/* Data Mappings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Data Mappings</h4>
                <Button size="sm" variant="outline" onClick={addMapping} className="h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Mapping
                </Button>
              </div>

              <div className="space-y-3">
                {apiConfig.mappings.map((mapping) => {
                  const selectedSection = sections.find(s => s.id === mapping.sectionId);
                  const variables = getSectionVariables(mapping.sectionId);
                  
                  return (
                    <div key={mapping.id} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Mapping</Label>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeMapping(mapping.id)}
                          className="h-6 w-6"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Target Section</Label>
                        <Select
                          value={mapping.sectionId}
                          onValueChange={(sectionId) => updateMapping(mapping.id, { sectionId })}
                        >
                          <SelectTrigger className="h-8">
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

                      <div className="space-y-2">
                        <Label className="text-xs">API Response Path (JSON Path)</Label>
                        <Input
                          value={mapping.apiPath}
                          onChange={(e) => updateMapping(mapping.id, { apiPath: e.target.value })}
                          placeholder="data.items or $.results[0].name"
                          className="h-8 text-xs font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          e.g., "data.items" or "results[0].title"
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Data Type</Label>
                        <Select
                          value={mapping.dataType}
                          onValueChange={(dataType: 'text' | 'list' | 'html') => 
                            updateMapping(mapping.id, { dataType })
                          }
                        >
                          <SelectTrigger className="h-8">
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
                        <div className="space-y-2">
                          <Label className="text-xs">Variable (Optional)</Label>
                          <Select
                            value={mapping.variableName || ''}
                            onValueChange={(variableName) => 
                              updateMapping(mapping.id, { variableName })
                            }
                          >
                            <SelectTrigger className="h-8">
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
                <p className="text-xs text-muted-foreground text-center py-4">
                  No mappings configured. Add a mapping to start.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};
