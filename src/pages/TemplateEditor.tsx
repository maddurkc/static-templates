import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Section } from "@/types/section";
import { ApiConfig, DEFAULT_API_CONFIG } from "@/types/api-config";
import { sectionTypes } from "@/data/sectionTypes";
import { SectionLibrary } from "@/components/templates/SectionLibrary";
import { EditorView } from "@/components/templates/EditorView";
import { PreviewView } from "@/components/templates/PreviewView";
import { CustomizationToolbar } from "@/components/templates/CustomizationToolbar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Eye, EyeOff, Library, Code, Copy, Check, ArrowLeft, X, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { saveTemplate } from "@/lib/templateStorage";
import { renderSectionContent, applyApiDataToSection } from "@/lib/templateUtils";
import { buildApiRequest, validateApiConfig } from "@/lib/apiTemplateUtils";

const TemplateEditor = () => {
  const navigate = useNavigate();
  
  // Static header section - cannot be deleted or moved
  const [headerSection] = useState<Section>({
    id: 'static-header',
    type: 'header',
    content: '<div style="text-align: center; padding: 20px; background: #f8f9fa; border-bottom: 2px solid #dee2e6;"><h1>{{companyName}}</h1><p>{{tagline}}</p></div>',
    variables: {
      companyName: 'Your Company Name',
      tagline: 'Your Company Tagline'
    },
    styles: {}
  });

  // Static footer section - cannot be deleted or moved
  const [footerSection] = useState<Section>({
    id: 'static-footer',
    type: 'footer',
    content: '<div style="text-align: center; padding: 20px; background: #f8f9fa; border-top: 2px solid #dee2e6; margin-top: 40px;"><p>&copy; {{year}} {{companyName}}. All rights reserved.</p><p>{{contactEmail}}</p></div>',
    variables: {
      year: new Date().getFullYear().toString(),
      companyName: 'Your Company Name',
      contactEmail: 'contact@example.com'
    },
    styles: {}
  });

  const [sections, setSections] = useState<Section[]>([
    {
      id: 'demo-1',
      type: 'heading1',
      content: 'Welcome to Your Static Template',
      styles: { fontSize: '48px', color: '#3b3f5c', fontWeight: '700' }
    },
    {
      id: 'demo-2',
      type: 'paragraph',
      content: 'Start building your page by dragging sections from the library on the left.',
      styles: { fontSize: '18px', color: '#6c757d' }
    }
  ]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_API_CONFIG);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    if (id.startsWith('library-')) {
      setShowLibrary(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    if (active.id.toString().startsWith('library-')) {
      const dropTargetId = String(over.id);
      const isEditorArea = dropTargetId === 'editor-drop-zone' || sections.some(s => s.id === dropTargetId);
      if (!isEditorArea) return;

      const sectionType = active.id.toString().replace('library-', '');
      const sectionDef = sectionTypes.find(s => s.type === sectionType);
      
      if (sectionDef) {
        const variables: Record<string, string | string[]> = {};
        sectionDef.variables?.forEach(varDef => {
          variables[varDef.name] = varDef.defaultValue;
        });

        const newSection: Section = {
          id: `section-${Date.now()}-${Math.random()}`,
          type: sectionDef.type,
          content: sectionDef.defaultContent,
          variables,
          styles: {
            fontSize: '16px',
            color: '#000000',
          }
        };
        setSections([...sections, newSection]);
        
        toast({
          title: "Section added",
          description: `${sectionDef.label} has been added to your template.`,
        });
      }
      return;
    }

    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleUpdateSection = (updatedSection: Section) => {
    // Update header or footer if selected
    if (updatedSection.id === 'static-header') {
      // Header is immutable in state, but we update selection
      setSelectedSection(updatedSection);
      return;
    }
    if (updatedSection.id === 'static-footer') {
      // Footer is immutable in state, but we update selection
      setSelectedSection(updatedSection);
      return;
    }
    setSections(sections.map(s => s.id === updatedSection.id ? updatedSection : s));
    setSelectedSection(updatedSection);
  };

  const handleDeleteSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (selectedSection?.id === id) {
      setSelectedSection(null);
    }
    toast({
      title: "Section deleted",
      description: "The section has been removed from your template.",
    });
  };

  const handleMoveUp = (id: string) => {
    const index = sections.findIndex(s => s.id === id);
    if (index > 0) {
      setSections(arrayMove(sections, index, index - 1));
    }
  };

  const handleMoveDown = (id: string) => {
    const index = sections.findIndex(s => s.id === id);
    if (index < sections.length - 1) {
      setSections(arrayMove(sections, index, index + 1));
    }
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

    const html = generateHTML();
    
    // Save template to localStorage
    const savedTemplate = saveTemplate({
      name: templateName,
      html,
      createdAt: new Date().toISOString(),
      sectionCount: sections.length,
      archived: false,
      apiConfig: apiConfig.enabled ? apiConfig : undefined,
      sections: [...sections],
    });

    toast({
      title: "Template saved",
      description: `"${templateName}" has been saved successfully.`,
    });

    setShowSaveDialog(false);
    setTemplateName("");
    
    // Navigate back to templates list
    setTimeout(() => navigate('/templates'), 500);
  };

  const generateHTML = () => {
    const allSections = [headerSection, ...sections, footerSection];
    return allSections.map(section => {
      const styleString = Object.entries(section.styles || {})
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');
      
      const content = renderSectionContent(section);
      return `<div style="${styleString}">\n  ${content}\n</div>`;
    }).join('\n\n');
  };

  const handleCopyHTML = async () => {
    const html = generateHTML();
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      toast({
        title: "HTML copied",
        description: "Template HTML has been copied to clipboard.",
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
        description: "Please select an API template first.",
        variant: "destructive",
      });
      return;
    }

    // Validate required parameters
    const validation = validateApiConfig(apiConfig);
    if (!validation.valid) {
      toast({
        title: "Missing parameters",
        description: `Please provide: ${validation.missingParams.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Build API request from template
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

      // Apply mappings to sections
      const updatedSections = [...sections];
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

      setSections(updatedSections);

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
                Back to Static Templates
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Static Template Editor
                </h1>
                <p className="text-xs text-muted-foreground">
                  Drag, drop, and customize your sections
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={showLibrary} onOpenChange={setShowLibrary}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Library className="h-4 w-4 mr-2" />
                    Section Library
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" onInteractOutside={(e) => e.preventDefault()} className="w-96 p-0 overflow-y-auto">
                  <SheetHeader className="p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <SheetTitle>Section Library</SheetTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Drag sections to add them to your template
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowLibrary(false)}
                        className="h-8 w-8 hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </SheetHeader>
                  <SectionLibrary />
                </SheetContent>
              </Sheet>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Code className="h-4 w-4 mr-2" />
                    View HTML
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Generated HTML</DialogTitle>
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
                      <pre className="p-4 text-sm">
                        <code>{generateHTML()}</code>
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
                  Test & Fetch API Data
                </Button>
              )}
              
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="shadow-lg shadow-primary/20"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Static Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Static Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Static Template Name</Label>
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
          
          <CustomizationToolbar
            section={selectedSection}
            onUpdate={handleUpdateSection}
            apiConfig={apiConfig}
            sections={sections}
            onApiConfigUpdate={setApiConfig}
          />
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-120px)]">
          {/* Editor */}
          <div className={`flex-1 overflow-auto ${showPreview ? 'border-r' : ''}`}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <EditorView
                headerSection={headerSection}
                footerSection={footerSection}
                sections={sections}
                selectedSection={selectedSection}
                onSelectSection={setSelectedSection}
                onDeleteSection={handleDeleteSection}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            </SortableContext>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="w-1/2 overflow-auto bg-white">
              <PreviewView 
                headerSection={headerSection}
                footerSection={footerSection}
                sections={sections} 
              />
            </div>
          )}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-xl">
              Dragging...
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default TemplateEditor;
