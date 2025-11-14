import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Calendar, PlayCircle, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTemplates, Template } from "@/lib/templateStorage";
import { Section } from "@/types/section";
import { renderSectionContent } from "@/lib/templateUtils";

const RunTemplates = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const templateFromState = location.state?.template;
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(templateFromState || null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [listVariables, setListVariables] = useState<Record<string, string[]>>({});
  const [toEmails, setToEmails] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [bccEmails, setBccEmails] = useState("");
  const [viewMode, setViewMode] = useState<'template' | 'execution'>('template'); // New: toggle between template view and execution view
  const [executedOn, setExecutedOn] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailTitle, setEmailTitle] = useState<string>("");
  const { toast } = useToast();

  // Load templates from localStorage
  useEffect(() => {
    const loadedTemplates = getTemplates().filter(t => !t.archived);
    setTemplates(loadedTemplates);
  }, []);

  // Initialize variables when template is selected
  React.useEffect(() => {
    if (selectedTemplate) {
      const vars = extractAllVariables(selectedTemplate);
      const initialVars: Record<string, string> = {};
      const initialListVars: Record<string, string[]> = {};
      
      vars.forEach(v => {
        const defaultVal = getDefaultValue(v);
        if (isTableVariable(v)) {
          // Skip table variables - they'll be handled separately
          // For now we don't support runtime table editing
        } else if (Array.isArray(defaultVal)) {
          initialListVars[v] = defaultVal.length > 0 ? defaultVal : [''];
        } else {
          initialVars[v] = String(defaultVal);
        }
      });
      
      setVariables(initialVars);
      setListVariables(initialListVars);
    }
  }, [selectedTemplate]);

  const extractVariables = (html: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = html.matchAll(regex);
    return Array.from(new Set(Array.from(matches, m => m[1])));
  };

  // Check if a variable is a list type based on sections
  const isListVariable = (varName: string): boolean => {
    if (!selectedTemplate?.sections) return false;
    
    for (const section of selectedTemplate.sections) {
      // For labeled-content sections, check contentType
      if (section.type === 'labeled-content' && section.variables?.label === varName) {
        return section.variables?.contentType === 'list';
      }
      
      if (section.variables && section.variables[varName]) {
        return Array.isArray(section.variables[varName]);
      }
    }
    return false;
  };

  // Check if a variable is a table type
  const isTableVariable = (varName: string): boolean => {
    if (!selectedTemplate?.sections) return false;
    
    return selectedTemplate.sections.some(section => {
      if (section.type === 'labeled-content' && section.variables?.label === varName) {
        return section.variables.contentType === 'table';
      }
      return false;
    });
  };

  // Check if a label is editable at runtime
  const isLabelEditable = (varName: string): boolean => {
    if (!selectedTemplate?.sections) return true;
    
    const section = selectedTemplate.sections.find(section => 
      section.type === 'labeled-content' && section.variables?.label === varName
    );
    return section?.isLabelEditable !== false;
  };

  // Get default value for a variable from sections
  const getDefaultValue = (varName: string): string | string[] | any => {
    if (!selectedTemplate?.sections) return '';
    
    for (const section of selectedTemplate.sections) {
      // For labeled-content sections, return content or items based on contentType
      if (section.type === 'labeled-content' && section.variables?.label === varName) {
        if (section.variables.contentType === 'list') {
          return (section.variables.items as string[]) || [''];
        } else if (section.variables.contentType === 'table') {
          return section.variables.tableData || { headers: [], rows: [] };
        }
        return (section.variables.content as string) || '';
      }
      
      if (section.variables && section.variables[varName] !== undefined) {
        const value = section.variables[varName];
        return Array.isArray(value) ? value : String(value);
      }
    }
    return '';
  };

  // Extract variables from both HTML and sections
  const extractAllVariables = (template: Template): string[] => {
    const varsFromHtml = extractVariables(template.html);
    const varsFromSections = new Set<string>();

    // Extract from sections if available
    if (template.sections) {
      template.sections.forEach((section: Section) => {
        // For labeled-content sections, use the label value as the variable name
        if (section.type === 'labeled-content' && section.variables?.label) {
          varsFromSections.add(section.variables.label as string);
          return;
        }
        
        // Extract variables from section content
        const contentVars = extractVariables(section.content);
        contentVars.forEach(v => varsFromSections.add(v));

        // Extract from section variables definition
        if (section.variables) {
          Object.keys(section.variables).forEach(key => varsFromSections.add(key));
        }
      });
    }

    return Array.from(new Set([...varsFromHtml, ...varsFromSections]));
  };

  const replaceVariables = (html: string, vars: Record<string, string>, listVars: Record<string, string[]>): string => {
    let result = html;
    
    // Replace list variables
    Object.entries(listVars).forEach(([key, items]) => {
      const listHtml = items.filter(item => item.trim()).map(item => `<li>${item}</li>`).join('');
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), listHtml);
    });
    
    // Replace regular variables
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    
    // Handle labeled-content sections with runtime variables
    if (selectedTemplate?.sections) {
      selectedTemplate.sections.forEach(section => {
        if (section.type === 'labeled-content' && section.variables?.label) {
          const label = section.variables.label as string;
          const runtimeValue = listVars[label] || vars[label];
          if (runtimeValue) {
            result = result.replace(
              new RegExp(`\\{\\{${label}\\}\\}`, 'g'),
              Array.isArray(runtimeValue) 
                ? runtimeValue.filter(item => item.trim()).map(item => `<li>${item}</li>`).join('')
                : runtimeValue
            );
          }
        }
      });
    }
    
    return result;
  };

  const handleRunTemplate = (template: Template) => {
    setSelectedTemplate(template);
    const vars = extractAllVariables(template);
    const initialVars: Record<string, string> = {};
    const initialListVars: Record<string, string[]> = {};
    
    vars.forEach(v => {
      const defaultVal = getDefaultValue(v);
      if (Array.isArray(defaultVal)) {
        initialListVars[v] = defaultVal.length > 0 ? defaultVal : [''];
      } else {
        initialVars[v] = String(defaultVal);
      }
    });
    
    setVariables(initialVars);
    setListVariables(initialListVars);
    
    // Set initial execution metadata
    setExecutedOn(new Date().toLocaleString());
    setEmailSubject(`${template.name} - ${new Date().toLocaleDateString()}`);
    setEmailTitle(template.name);
  };

  const handleSendTemplate = () => {
    if (!selectedTemplate) return;

    // Validate emails
    if (!toEmails.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one recipient email.",
        variant: "destructive",
      });
      return;
    }

    // Save to database (mock)
    const runData = {
      templateId: selectedTemplate.id,
      toEmails: toEmails.split(',').map(e => e.trim()),
      ccEmails: ccEmails.split(',').map(e => e.trim()).filter(Boolean),
      bccEmails: bccEmails.split(',').map(e => e.trim()).filter(Boolean),
      variables,
      listVariables,
      htmlOutput: replaceVariables(selectedTemplate.html, variables, listVariables),
      runAt: new Date().toISOString(),
    };

    console.log("Template run data:", runData);

    toast({
      title: "Template Sent",
      description: `Template sent successfully to ${runData.toEmails.length} recipient(s).`,
    });

    resetForm();
    navigate('/templates');
  };

  const resetForm = () => {
    setToEmails("");
    setCcEmails("");
    setBccEmails("");
    setVariables({});
    setListVariables({});
  };

  const previewHtml = selectedTemplate
    ? replaceVariables(selectedTemplate.html, variables, listVariables)
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      {!selectedTemplate ? (
        // Template Selection View
        <div className="container mx-auto p-8">
          <div className="mb-8 flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/templates')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                Run Templates
              </h1>
              <p className="text-muted-foreground">
                Select a template to run and send via email
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No templates found. Create a template first.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/template-editor')}
                >
                  Create Template
                </Button>
              </div>
            ) : (
              templates.map((template) => (
                <Card key={template.id} className="p-6 hover:shadow-lg transition-all border-2 hover:border-primary/50">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {template.sectionCount} sections
                      </Badge>
                      <Badge variant="outline">
                        {extractAllVariables(template).length} variables
                      </Badge>
                    </div>

                    <Button
                      onClick={() => handleRunTemplate(template)}
                      className="w-full shadow-lg shadow-primary/20"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Run Template
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        // Side-by-Side Run View
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="border-b bg-card/50 backdrop-blur-sm p-4">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTemplate(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change Template
                </Button>
                <div>
                  <h1 className="text-xl font-bold">{selectedTemplate.name}</h1>
                  <p className="text-xs text-muted-foreground">
                    Configure and send template
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSendTemplate}
                className="shadow-lg shadow-primary/20"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Template
              </Button>
            </div>
          </div>

          {/* Side-by-Side Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Configuration */}
            <div className="w-1/2 border-r overflow-auto">
              <ScrollArea className="h-full">
                <div className="p-8 space-y-6">
                  {/* Email Recipients */}
                  <Card className="p-6 border-2">
                    <h2 className="text-lg font-semibold mb-4">Email Recipients</h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="to-emails">
                          To <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="to-emails"
                          placeholder="email1@example.com, email2@example.com"
                          value={toEmails}
                          onChange={(e) => setToEmails(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter comma-separated email addresses
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cc-emails">CC (Optional)</Label>
                        <Input
                          id="cc-emails"
                          placeholder="email@example.com, email2@example.com"
                          value={ccEmails}
                          onChange={(e) => setCcEmails(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bcc-emails">BCC (Optional)</Label>
                        <Input
                          id="bcc-emails"
                          placeholder="email@example.com, email2@example.com"
                          value={bccEmails}
                          onChange={(e) => setBccEmails(e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Template Variables */}
                  {extractAllVariables(selectedTemplate).length > 0 && (
                    <Card className="p-6 border-2">
                      <h2 className="text-lg font-semibold mb-4">Template Variables</h2>
                      <div className="space-y-4">
                        {extractAllVariables(selectedTemplate).map((varName) => {
                          const isList = isListVariable(varName);
                          const isTable = isTableVariable(varName);
                          const editable = isLabelEditable(varName);
                          
                          return (
                            <div key={varName} className="space-y-2">
                              <Label htmlFor={`var-${varName}`} className="flex items-center gap-2 flex-wrap">
                                {editable ? (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {`{{${varName}}}`}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs font-mono bg-muted">
                                    {`{{${varName}}}`}
                                  </Badge>
                                )}
                                <span>{varName}</span>
                                {isList && (
                                  <Badge variant="secondary" className="text-xs">
                                    List
                                  </Badge>
                                )}
                                {isTable && (
                                  <Badge variant="secondary" className="text-xs">
                                    Table
                                  </Badge>
                                )}
                                {!editable && (
                                  <Badge variant="outline" className="text-xs">
                                    Label locked
                                  </Badge>
                                )}
                              </Label>
                              {isTable ? (
                                <div className="space-y-2 border rounded-lg p-4">
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Table content - customize rows and columns
                                  </p>
                                  {/* Table editor would go here - for now show placeholder */}
                                  <div className="text-sm text-muted-foreground">
                                    Table editing in runtime coming soon...
                                  </div>
                                </div>
                              ) : isList ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground">List Items</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setListVariables(prev => ({
                                          ...prev,
                                          [varName]: [...(prev[varName] || ['']), '']
                                        }));
                                      }}
                                      className="h-7 px-2"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Item
                                    </Button>
                                  </div>
                                  <div className="space-y-2 pl-2 border-l-2 border-muted">
                                    {(listVariables[varName] || ['']).map((item, index) => (
                                      <div key={index} className="flex items-center gap-2 ml-2">
                                        <Input
                                          value={item}
                                          onChange={(e) => {
                                            setListVariables(prev => {
                                              const newItems = [...(prev[varName] || [''])];
                                              newItems[index] = e.target.value;
                                              return { ...prev, [varName]: newItems };
                                            });
                                          }}
                                          placeholder={`Item ${index + 1}`}
                                          className="h-8 text-sm"
                                        />
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => {
                                            setListVariables(prev => {
                                              const newItems = [...(prev[varName] || [''])];
                                              if (newItems.length > 1) {
                                                newItems.splice(index, 1);
                                                return { ...prev, [varName]: newItems };
                                              }
                                              return prev;
                                            });
                                          }}
                                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                          disabled={(listVariables[varName]?.length || 0) <= 1}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <Input
                                  id={`var-${varName}`}
                                  placeholder={`Enter ${varName}`}
                                  value={variables[varName] || ""}
                                  onChange={(e) =>
                                    setVariables({ ...variables, [varName]: e.target.value })
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Live Preview */}
            <div className="w-1/2 bg-white overflow-auto">
              <div className="sticky top-0 bg-muted/50 px-6 py-3 border-b z-10">
                <h2 className="font-semibold">Live Preview</h2>
                <p className="text-xs text-muted-foreground">
                  Preview updates as you enter variable values
                </p>
              </div>
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="p-8">
                  {selectedTemplate.sections && selectedTemplate.sections.length > 0 ? (
                    // Render from sections with runtime values
                    <div
                      dangerouslySetInnerHTML={{ 
                        __html: selectedTemplate.sections.map(section => {
                          // Combine variables and listVariables for rendering
                          const runtimeVars: Record<string, string | string[]> = {
                            ...variables,
                            ...listVariables
                          };
                          return renderSectionContent(section, runtimeVars);
                        }).join('')
                      }}
                      className="prose max-w-none"
                    />
                  ) : (
                    // Render from HTML for legacy templates
                    <div
                      dangerouslySetInnerHTML={{ __html: replaceVariables(selectedTemplate.html, variables, listVariables) }}
                      className="prose max-w-none"
                    />
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunTemplates;
