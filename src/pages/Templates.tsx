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
import { Save, Eye, EyeOff, Library } from "lucide-react";
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
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Check if dragging from library
    if (active.id.toString().startsWith('library-')) {
      // Only add when dropped over the editor drop zone
      if (over?.id !== 'editor-drop-zone') return;

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
    toast({
      title: "Template saved",
      description: "Your template has been saved successfully.",
    });
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
              <SheetContent side="left" className="w-96 p-0 overflow-y-auto">
                <SheetHeader className="p-4 border-b sticky top-0 bg-background z-10">
                  <SheetTitle>Section Library</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag sections to add them to your template
                  </p>
                </SheetHeader>
                <SectionLibrary />
              </SheetContent>
            </Sheet>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              className="shadow-lg shadow-primary/20"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
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
