import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlayCircle, Calendar, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  html: string;
  createdAt: string;
  sectionCount: number;
}

// Mock data - replace with actual data from database
const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Welcome Email Template",
    html: "<h1>Welcome {{name}}!</h1><p>Thank you for joining us.</p>",
    createdAt: "2024-01-15",
    sectionCount: 2,
  },
  {
    id: "2",
    name: "Newsletter Template",
    html: "<h1>{{title}}</h1><p>{{content}}</p><p>Best regards, {{sender}}</p>",
    createdAt: "2024-01-20",
    sectionCount: 3,
  },
];

const RunTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [toEmails, setToEmails] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [bccEmails, setBccEmails] = useState("");
  const { toast } = useToast();

  const extractVariables = (html: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = html.matchAll(regex);
    return Array.from(new Set(Array.from(matches, m => m[1])));
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
    const vars = extractVariables(template.html);
    const initialVars: Record<string, string> = {};
    vars.forEach(v => initialVars[v] = "");
    setVariables(initialVars);
    setShowRunDialog(true);
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

    setShowRunDialog(false);
    resetForm();
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
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Run Templates
          </h1>
          <p className="text-muted-foreground">
            Select a template to run and send via email
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockTemplates.map((template) => (
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
                    {extractVariables(template.html).length} variables
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
          ))}
        </div>

        {/* Run Template Dialog */}
        <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Run Template: {selectedTemplate?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-6 h-[70vh]">
              {/* Left Side - Input Form */}
              <ScrollArea className="pr-4">
                <div className="space-y-6">
                  {/* Email Fields */}
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                    <h3 className="font-semibold text-lg">Email Recipients</h3>
                    
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
                        placeholder="email@example.com"
                        value={ccEmails}
                        onChange={(e) => setCcEmails(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bcc-emails">BCC (Optional)</Label>
                      <Input
                        id="bcc-emails"
                        placeholder="email@example.com"
                        value={bccEmails}
                        onChange={(e) => setBccEmails(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Variables */}
                  {selectedTemplate && extractVariables(selectedTemplate.html).length > 0 && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                      <h3 className="font-semibold text-lg">Template Variables</h3>
                      {extractVariables(selectedTemplate.html).map((varName) => (
                        <div key={varName} className="space-y-2">
                          <Label htmlFor={`var-${varName}`}>
                            {varName}
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
                  )}

                  <Button
                    onClick={handleSendTemplate}
                    className="w-full shadow-lg shadow-primary/20"
                    size="lg"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Template
                  </Button>
                </div>
              </ScrollArea>

              {/* Right Side - Preview */}
              <div className="border rounded-lg bg-white overflow-hidden flex flex-col">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <h3 className="font-semibold">Live Preview</h3>
                </div>
                <ScrollArea className="flex-1 p-6">
                  <div
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                    className="prose max-w-none"
                  />
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default RunTemplates;
