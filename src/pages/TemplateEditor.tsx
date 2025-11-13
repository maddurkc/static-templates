import { useState, useEffect } from "react";
import { Section } from "@/types/section";
import { ApiConfig, DEFAULT_API_CONFIG } from "@/types/api-config";
import { sectionTypes } from "@/data/sectionTypes";
import { RichTextEditor } from "@/components/templates/RichTextEditor";
import { DynamicSectionPanel } from "@/components/templates/DynamicSectionPanel";
import { PreviewView } from "@/components/templates/PreviewView";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Save, Eye, EyeOff, Code, Copy, Check, ArrowLeft, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { saveTemplate, updateTemplate } from "@/lib/templateStorage";
import { convertToThymeleaf, renderSectionContent } from "@/lib/templateUtils";
import { buildApiRequest, validateApiConfig } from "@/lib/apiTemplateUtils";
import { applyApiDataToSection } from "@/lib/templateUtils";

const TemplateEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editingTemplate = location.state?.template;
  
  const [editorContent, setEditorContent] = useState<string>('<p>Start typing your template content here...</p>');
  const [dynamicSections, setDynamicSections] = useState<Section[]>([]);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_API_CONFIG);
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load template for editing if passed via navigation state
  useEffect(() => {
    if (editingTemplate) {
      setIsEditMode(true);
      setEditingTemplateId(editingTemplate.id);
      setTemplateName(editingTemplate.name);
      
      if (editingTemplate.editorContent) {
        setEditorContent(editingTemplate.editorContent);
      }
      
      if (editingTemplate.dynamicSections) {
        setDynamicSections(editingTemplate.dynamicSections);
      }
      
      if (editingTemplate.apiConfig) {
        setApiConfig(editingTemplate.apiConfig);
      }
      
      toast({
        title: "Template loaded",
        description: `Editing "${editingTemplate.name}"`,
      });
    }
  }, [editingTemplate]);

  const handleInsertPlaceholder = (name: string, label?: string) => {
    // Check if a section with this placeholder already exists
    const existingSection = dynamicSections.find(
      s => s.variables?.placeholderName === name
    );

    if (!existingSection) {
      // Create a new dynamic section for this placeholder
      const newSection: Section = {
        id: `dynamic-${Date.now()}-${Math.random()}`,
        type: 'text',
        content: `<span th:text="\${${name}}"></span>`,
        variables: {
          placeholderName: name,
          label: label || name,
          text: `Sample value for ${name}`,
        },
        styles: {}
      };

      setDynamicSections([...dynamicSections, newSection]);
      
      toast({
        title: "Placeholder added",
        description: `Dynamic placeholder "${name}" has been added. You can configure it in the right panel.`,
      });
    }
  };

  const handleAddDynamicSection = (type: string) => {
    const sectionDef = sectionTypes.find(s => s.type === type);
    if (!sectionDef) return;

    const variables: Record<string, string | string[]> = {};
    sectionDef.variables?.forEach(varDef => {
      variables[varDef.name] = varDef.defaultValue;
    });

    const newSection: Section = {
      id: `dynamic-${Date.now()}-${Math.random()}`,
      type: sectionDef.type,
      content: sectionDef.defaultContent,
      variables,
      styles: {}
    };

    setDynamicSections([...dynamicSections, newSection]);
    
    toast({
      title: "Section added",
      description: `${sectionDef.label} has been added to dynamic sections.`,
    });
  };

  const handleUpdateDynamicSection = (updatedSection: Section) => {
    setDynamicSections(dynamicSections.map(s => 
      s.id === updatedSection.id ? updatedSection : s
    ));
  };

  const handleDeleteDynamicSection = (id: string) => {
    setDynamicSections(dynamicSections.filter(s => s.id !== id));
    toast({
      title: "Section deleted",
      description: "The dynamic section has been removed.",
    });
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a template name.",
        variant: "destructive",
      });
      return;
    }

    const { html: thymeleafHtml, placeholders } = convertToThymeleaf(editorContent);
    
    const templateData = {
      name: templateName,
      html: thymeleafHtml,
      editorContent,
      dynamicSections,
      placeholders,
      sectionCount: dynamicSections.length,
      createdAt: isEditMode && editingTemplate ? editingTemplate.createdAt : new Date().toISOString(),
      archived: false,
      apiConfig: apiConfig.enabled ? apiConfig : undefined,
    };

    if (isEditMode && editingTemplateId) {
      updateTemplate(editingTemplateId, templateData);
      toast({
        title: "Template updated",
        description: `"${templateName}" has been updated successfully.`,
      });
    } else {
      saveTemplate(templateData);
      toast({
        title: "Template saved",
        description: `"${templateName}" has been saved successfully.`,
      });
    }

    setShowSaveDialog(false);
    setTemplateName("");
    
    setTimeout(() => navigate('/templates'), 500);
  };

  const generateFinalHTML = () => {
    const { html } = convertToThymeleaf(editorContent);
    return html;
  };

  const generatePreviewHTML = () => {
    // For preview, show with sample values
    let html = editorContent;
    
    // Replace placeholders with sample values from dynamic sections
    dynamicSections.forEach(section => {
      const placeholderName = section.variables?.placeholderName as string;
      const sampleValue = section.variables?.text || section.variables?.label || placeholderName;
      
      if (placeholderName) {
        const regex = new RegExp(`<span[^>]*data-placeholder="${placeholderName}"[^>]*>.*?</span>`, 'g');
        html = html.replace(regex, `<span style="background-color: #e3f2fd; padding: 2px 6px; border-radius: 4px;">${sampleValue}</span>`);
      }
    });
    
    return html;
  };

  const handleCopyHTML = async () => {
    const html = generateFinalHTML();
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      toast({
        title: "HTML copied",
        description: "Template HTML with Thymeleaf tags has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy HTML to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleTestApiFetch = async () => {
    if (!apiConfig.enabled || !apiConfig.templateId) {
      toast({
        title: "API not configured",
        description: "Please configure API settings first.",
        variant: "destructive",
      });
      return;
    }

    const validation = validateApiConfig(apiConfig);
    if (!validation.valid) {
      toast({
        title: "Missing parameters",
        description: `Please provide: ${validation.missingParams.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    const request = buildApiRequest(apiConfig);
    if (!request) {
      toast({
        title: "Invalid template",
        description: "Could not build API request from template.",
        variant: "destructive",
      });
      return;
    }

    try {
      const options: RequestInit = {
        method: request.method,
        headers: request.headers,
      };

      if (request.body && (request.method === 'POST' || request.method === 'PUT')) {
        options.body = request.body;
        options.headers = { ...options.headers, 'Content-Type': 'application/json' };
      }

      const response = await fetch(request.url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      const updatedSections = [...dynamicSections];
      apiConfig.mappings.forEach(mapping => {
        const sectionIndex = updatedSections.findIndex(s => s.id === mapping.sectionId);
        if (sectionIndex !== -1) {
          updatedSections[sectionIndex] = applyApiDataToSection(
            updatedSections[sectionIndex],
            data,
            mapping
          );
        }
      });

      setDynamicSections(updatedSections);

      toast({
        title: "API data fetched",
        description: "Successfully fetched and mapped data to sections.",
      });
    } catch (error) {
      console.error('API fetch error:', error);
      toast({
        title: "Fetch failed",
        description: error instanceof Error ? error.message : "Failed to fetch API data.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Top Bar */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/templates')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Rich Template Editor
              </h1>
              <p className="text-xs text-muted-foreground">
                Create templates with free-form text and dynamic placeholders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Code className="h-4 w-4 mr-2" />
                  View HTML
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Generated Thymeleaf HTML</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyHTML}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy HTML
                        </>
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="h-[60vh] w-full rounded-md border">
                    <pre className="p-4 text-sm whitespace-pre-wrap break-words overflow-x-auto">
                      <code className="break-all">{generateFinalHTML()}</code>
                    </pre>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
            
            {apiConfig.enabled && apiConfig.templateId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestApiFetch}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Test API
              </Button>
            )}
            
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="shadow-lg shadow-primary/20"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      placeholder="Enter template name..."
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveTemplate();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowSaveDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTemplate}>
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-80px)]">
        <ResizablePanelGroup direction="horizontal">
          {/* Editor Panel */}
          <ResizablePanel defaultSize={showPreview ? 40 : 60} minSize={30}>
            <div className="h-full overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                <RichTextEditor
                  content={editorContent}
                  onChange={setEditorContent}
                  onInsertPlaceholder={handleInsertPlaceholder}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Dynamic Sections Panel */}
          <ResizablePanel defaultSize={showPreview ? 30 : 40} minSize={20}>
            <DynamicSectionPanel
              sections={dynamicSections}
              onUpdateSection={handleUpdateDynamicSection}
              onDeleteSection={handleDeleteDynamicSection}
              onAddSection={handleAddDynamicSection}
            />
          </ResizablePanel>

          {showPreview && (
            <>
              <ResizableHandle withHandle />
              
              {/* Preview Panel */}
              <ResizablePanel defaultSize={30} minSize={20}>
                <div className="h-full overflow-auto bg-white">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Preview</h3>
                    <div 
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: generatePreviewHTML() }}
                    />
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default TemplateEditor;