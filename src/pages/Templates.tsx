import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Section } from "@/types/section";
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
import { Save, Eye, EyeOff, Library, Code, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Templates = () => {
  const [sections, setSections] = useState<Section[]>([
    {
      id: 'demo-1',
      type: 'heading1',
      content: 'Welcome to Your Template',
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

    // Check if dragging from library
    if (active.id.toString().startsWith('library-')) {
      const dropTargetId = String(over.id);
      const isEditorArea = dropTargetId === 'editor-drop-zone' || sections.some(s => s.id === dropTargetId);
      if (!isEditorArea) return;

      const sectionType = active.id.toString().replace('library-', '');
      const sectionDef = sectionTypes.find(s => s.type === sectionType);
      
      if (sectionDef) {
        const newSection: Section = {
          id: `section-${Date.now()}-${Math.random()}`,
          type: sectionDef.type,
          content: sectionDef.defaultContent,
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

    // Reordering existing sections
    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleUpdateSection = (updatedSection: Section) => {
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
    
    // Save to database (mock)
    const templateData = {
      name: templateName,
      html,
      sections: sections.map((s, index) => ({
        sectionId: s.id,
        orderIndex: index,
        content: s.content,
        styles: s.styles,
      })),
      createdAt: new Date().toISOString(),
    };

    console.log("Template saved:", templateData);

    toast({
      title: "Template saved",
      description: `"${templateName}" has been saved successfully.`,
    });

    setShowSaveDialog(false);
    setTemplateName("");
  };

  const generateHTML = () => {
    return sections.map(section => {
      const styleString = Object.entries(section.styles || {})
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');
      
      return `<div style="${styleString}">\n  ${section.content}\n</div>`;
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
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Template Editor
            </h1>
            <p className="text-xs text-muted-foreground">
              Drag, drop, and customize your sections
            </p>
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
        
        {selectedSection && (
          <CustomizationToolbar
            section={selectedSection}
            onUpdate={handleUpdateSection}
          />
        )}
      </div>

      {/* Main Content */}
        <div className="flex h-[calc(100vh-120px)]">
          {/* Editor */}
          <div className={`flex-1 overflow-auto ${showPreview ? 'border-r' : ''}`}>
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <EditorView
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
              <PreviewView sections={sections} />
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

export default Templates;
