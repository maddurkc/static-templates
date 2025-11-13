import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Section } from "@/types/section";
import { sectionTypes } from "@/data/sectionTypes";
import { SectionLibrary } from "@/components/templates/SectionLibrary";
import { RichTextEditor } from "@/components/templates/RichTextEditor";
import { VariableEditor } from "@/components/templates/VariableEditor";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Eye, EyeOff, Library, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { saveTemplate, updateTemplate } from "@/lib/templateStorage";
import { renderSectionContent } from "@/lib/templateUtils";

const TemplateEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editingTemplate = location.state?.template;
  
  // Rich text content for the template body
  const [richTextContent, setRichTextContent] = useState<string>(
    '<h1>Welcome to Your Template</h1><p>Start typing here or use the toolbar above to format your content. Drag sections from the library to add dynamic content placeholders.</p>'
  );
  
  // Dynamic sections that will be embedded in the rich text
  const [dynamicSections, setDynamicSections] = useState<Section[]>([]);
  const [selectedDynamicSection, setSelectedDynamicSection] = useState<Section | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showVariableEditor, setShowVariableEditor] = useState(false);
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
      
      // Load rich text content if available
      if (editingTemplate.richTextContent) {
        setRichTextContent(editingTemplate.richTextContent);
      }
      
      // Load dynamic sections if available
      if (editingTemplate.dynamicSections && editingTemplate.dynamicSections.length > 0) {
        setDynamicSections(editingTemplate.dynamicSections);
      }
      
      toast({
        title: "Template loaded",
        description: `Editing "${editingTemplate.name}"`,
      });
    }
  }, [editingTemplate, toast]);

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

    // Handle dropping from library
    if (active.id.toString().startsWith('library-')) {
      const sectionType = active.id.toString().replace('library-', '');
      const sectionDef = sectionTypes.find(s => s.type === sectionType);
      
      if (!sectionDef) return;
      
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
      
      // Add to dynamic sections
      setDynamicSections([...dynamicSections, newSection]);
      toast({
        title: "Dynamic section added",
        description: `${sectionDef.label} added to your template.`,
      });
    }
  };

  const handleUpdateDynamicSection = (updatedSection: Section) => {
    setDynamicSections(dynamicSections.map(s => 
      s.id === updatedSection.id ? updatedSection : s
    ));
    setSelectedDynamicSection(updatedSection);
  };

  const handleRemoveDynamicSection = (sectionId: string) => {
    setDynamicSections(dynamicSections.filter(s => s.id !== sectionId));
    if (selectedDynamicSection?.id === sectionId) {
      setSelectedDynamicSection(null);
    }
    toast({
      title: "Section removed",
      description: "Dynamic section has been removed.",
    });
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your template.",
        variant: "destructive",
      });
      return;
    }

    const templateData = {
      name: templateName,
      richTextContent,
      dynamicSections,
      sectionCount: dynamicSections.length,
      createdAt: isEditMode ? editingTemplate.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    navigate('/templates');
  };

  const renderPreview = () => {
    // Replace dynamic section placeholders with actual rendered content
    let previewContent = richTextContent;
    
    dynamicSections.forEach(section => {
      const placeholder = `data-section-id="${section.id}"`;
      if (previewContent.includes(placeholder)) {
        const renderedSection = renderSectionContent(section);
        previewContent = previewContent.replace(
          new RegExp(`<div[^>]*${placeholder}[^>]*>.*?<\/div>`, 'g'),
          `<div style="margin: 10px 0; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; background: #f9f9f9;">
            <div style="font-size: 11px; color: #666; margin-bottom: 5px; font-weight: bold;">DYNAMIC: ${section.type.toUpperCase()}</div>
            ${renderedSection}
          </div>`
        );
      }
    });
    
    return (
      <div className="h-full">
        <div className="sticky top-0 p-4 border-b bg-card z-10">
          <h2 className="font-semibold text-lg">Preview</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Live preview of your template with dynamic sections
          </p>
        </div>

        <div className="p-8 bg-muted/20">
          <div className="max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-6">
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          </div>
        </div>
      </div>
    );
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
                Back to Templates
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Rich Text Template Editor
                </h1>
                <p className="text-xs text-muted-foreground">
                  Create templates with rich formatting and dynamic sections
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
                        <SheetTitle>Dynamic Sections</SheetTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Drag sections into the editor
                        </p>
                      </div>
                    </div>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-80px)]">
                    <SectionLibrary />
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Preview
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Preview
                  </>
                )}
              </Button>

              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? 'Update' : 'Save'} Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isEditMode ? 'Update Template' : 'Save Template'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        placeholder="Enter template name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTemplate}>
                      {isEditMode ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-73px)]">
          {/* Editor Area */}
          <div className={showPreview ? "w-1/2" : "w-full"}>
            <div className="h-full p-6">
              <RichTextEditor
                content={richTextContent}
                onChange={setRichTextContent}
                dynamicSections={dynamicSections}
                onSectionSelect={(section) => {
                  setSelectedDynamicSection(section);
                  setShowVariableEditor(true);
                }}
                onRemoveSection={handleRemoveDynamicSection}
              />
            </div>
          </div>

          {/* Preview Area */}
          {showPreview && (
            <div className="w-1/2 border-l bg-muted/10">
              {renderPreview()}
            </div>
          )}
        </div>

        {/* Variable Editor Sheet */}
        <Sheet open={showVariableEditor} onOpenChange={setShowVariableEditor}>
          <SheetContent side="right" className="w-96 p-0 overflow-y-auto">
            <SheetHeader className="p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
              <SheetTitle>Edit Variables</SheetTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Configure dynamic content for this section
              </p>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-80px)]">
              {selectedDynamicSection && (
                <div className="p-4">
                  <VariableEditor
                    section={selectedDynamicSection}
                    onUpdate={handleUpdateDynamicSection}
                  />
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      <DragOverlay>
        {activeId && activeId.startsWith('library-') ? (
          <div className="bg-card border-2 border-primary shadow-lg rounded-lg p-4 opacity-80">
            <p className="font-medium">
              {sectionTypes.find(s => `library-${s.type}` === activeId)?.label}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TemplateEditor;
