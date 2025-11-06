import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Section } from "@/types/section";
import { sectionTypes } from "@/data/sectionTypes";
import { SectionLibrary } from "@/components/templates/SectionLibrary";
import { EditorView } from "@/components/templates/EditorView";
import { PreviewView } from "@/components/templates/PreviewView";
import { CustomizationToolbar } from "@/components/templates/CustomizationToolbar";
import { Button } from "@/components/ui/button";
import { Save, Eye, EyeOff } from "lucide-react";
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-[calc(100vh-120px)]">
          {/* Left: Section Library */}
          <SectionLibrary />

          {/* Middle: Editor */}
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

          {/* Right: Preview */}
          {showPreview && (
            <div className="w-1/3 overflow-auto bg-white">
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
      </DndContext>
    </div>
  );
};

export default Templates;
