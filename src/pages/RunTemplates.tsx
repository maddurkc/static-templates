import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Calendar, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTemplates, Template } from "@/lib/templateStorage";
import { Section } from "@/types/section";

const RunTemplates = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const templateFromState = location.state?.template;
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(templateFromState || null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [toEmails, setToEmails] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [bccEmails, setBccEmails] = useState("");
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
      vars.forEach(v => initialVars[v] = "");
      setVariables(initialVars);
    }
  }, [selectedTemplate]);

  const extractVariables = (html: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = html.matchAll(regex);
    return Array.from(new Set(Array.from(matches, m => m[1])));
  };

  // Extract variables from both HTML and sections
  const extractAllVariables = (template: Template): string[] => {
    const varsFromHtml = extractVariables(template.html);
    const varsFromSections = new Set<string>();

    // Extract from sections if available
    if (template.sections) {
      template.sections.forEach((section: Section) => {
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

  const replaceVariables = (html: string, vars: Record<string, string>): string => {
    let result = html;
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return result;
  };

  const handleRunTemplate = (template: Template) => {
    setSelectedTemplate(template);
    const vars = extractAllVariables(template);
    const initialVars: Record<string, string> = {};
    vars.forEach(v => initialVars[v] = "");
    setVariables(initialVars);
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
      htmlOutput: replaceVariables(selectedTemplate.html, variables),
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
  };

  const previewHtml = selectedTemplate
    ? replaceVariables(selectedTemplate.html, variables)
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
                        {extractAllVariables(selectedTemplate).map((varName) => (
                          <div key={varName} className="space-y-2">
                            <Label htmlFor={`var-${varName}`} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-mono">
                                {`{{${varName}}}`}
                              </Badge>
                              <span>{varName}</span>
                            </Label>
                            <Input
                              id={`var-${varName}`}
                              placeholder={`Enter ${varName}`}
                              value={variables[varName] || ""}
                              onChange={(e) =>
                                setVariables({ ...variables, [varName]: e.target.value })
                              }
                            />
                          </div>
                        ))}
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
                  <div
                    dangerouslySetInnerHTML={{ __html: replaceVariables(selectedTemplate.html, variables) }}
                    className="prose max-w-none"
                  />
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
