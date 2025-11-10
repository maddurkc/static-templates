import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Code, Copy, Check, Sparkles, Trash2 } from "lucide-react";
import { sectionTypes } from "@/data/sectionTypes";
import { Section, SectionDefinition } from "@/types/section";
import { useToast } from "@/hooks/use-toast";
import { saveCustomSection, getCustomSections, deleteCustomSection } from "@/lib/sectionStorage";
import { SectionPreviewDialog } from "@/components/sections/SectionPreviewDialog";
import * as LucideIcons from "lucide-react";

const Sections = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customSections, setCustomSections] = useState<SectionDefinition[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSection, setNewSection] = useState({
    type: "",
    label: "",
    description: "",
    defaultContent: "",
    category: "text" as "text" | "media" | "layout" | "interactive",
    icon: "Box"
  });
  const { toast } = useToast();

  useEffect(() => {
    setCustomSections(getCustomSections());
  }, []);

  const allSections = [...sectionTypes, ...customSections];

  const filteredSections = allSections.filter((section) =>
    section.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedSections = filteredSections.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, typeof sectionTypes>);

  const createSection = (sectionDef: typeof sectionTypes[0]) => {
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
      title: "Section created",
      description: `${sectionDef.label} has been added to your collection.`,
    });
  };

  const generateSectionHTML = (sectionDef: typeof sectionTypes[0]) => {
    return sectionDef.defaultContent;
  };

  const handleCopyHTML = async (html: string, id: string) => {
    try {
      await navigator.clipboard.writeText(html);
      setCopiedId(id);
      toast({
        title: "HTML copied",
        description: "Section HTML has been copied to clipboard.",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy HTML to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleCreateCustomSection = () => {
    if (!newSection.type || !newSection.label || !newSection.defaultContent) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const IconComponent = (LucideIcons as any)[newSection.icon] || LucideIcons.Box;

    const sectionDef: SectionDefinition = {
      type: newSection.type as any,
      label: newSection.label,
      icon: IconComponent,
      description: newSection.description,
      defaultContent: newSection.defaultContent,
      category: newSection.category,
    };

    saveCustomSection(sectionDef);
    setCustomSections(getCustomSections());
    setCreateDialogOpen(false);
    setNewSection({
      type: "",
      label: "",
      description: "",
      defaultContent: "",
      category: "text",
      icon: "Box"
    });

    toast({
      title: "Custom Section Created",
      description: `${newSection.label} has been added to the library.`,
    });
  };

  const handleDeleteCustomSection = (type: string, label: string) => {
    deleteCustomSection(type);
    setCustomSections(getCustomSections());
    toast({
      title: "Section Deleted",
      description: `${label} has been removed from the library.`,
    });
  };

  const isCustomSection = (section: SectionDefinition) => {
    return customSections.some(cs => cs.type === section.type);
  };

  const categoryColors: Record<string, string> = {
    text: "bg-primary/10 text-primary",
    media: "bg-accent/10 text-accent",
    layout: "bg-purple-100 text-purple-700",
    interactive: "bg-orange-100 text-orange-700"
  };

  const categoryLabels: Record<string, string> = {
    text: "Text",
    media: "Media",
    layout: "Layout",
    interactive: "Interactive"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Section Library
            </h1>
            <p className="text-muted-foreground mt-2">
              Create and manage reusable content sections for your templates
            </p>
          </div>

          {/* Search and Create Button */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Create Custom Section
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Custom Section</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type ID *</Label>
                    <Input
                      id="type"
                      placeholder="e.g., custom-hero"
                      value={newSection.type}
                      onChange={(e) => setNewSection({...newSection, type: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="label">Label *</Label>
                    <Input
                      id="label"
                      placeholder="e.g., Hero Section"
                      value={newSection.label}
                      onChange={(e) => setNewSection({...newSection, label: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Brief description of the section"
                      value={newSection.description}
                      onChange={(e) => setNewSection({...newSection, description: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={newSection.category} onValueChange={(value: any) => setNewSection({...newSection, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="layout">Layout</SelectItem>
                        <SelectItem value="interactive">Interactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon Name</Label>
                    <Input
                      id="icon"
                      placeholder="e.g., Box, Sparkles, Layout"
                      value={newSection.icon}
                      onChange={(e) => setNewSection({...newSection, icon: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">Use any Lucide icon name</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Default HTML Content *</Label>
                    <Textarea
                      id="content"
                      placeholder="<div>Your HTML content here</div>"
                      value={newSection.defaultContent}
                      onChange={(e) => setNewSection({...newSection, defaultContent: e.target.value})}
                      rows={8}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCustomSection}>
                    Create Section
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Section Cards by Category */}
        {Object.entries(groupedSections).map(([category, categorySections]) => (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold">{categoryLabels[category]}</h2>
              <Badge variant="secondary" className="text-xs">
                {categorySections.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categorySections.map((section) => (
                <Card 
                  key={section.type}
                  className="group hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-primary/50"
                >
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
                        <section.icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge className={categoryColors[category]}>
                        {categoryLabels[category]}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{section.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Preview of the actual content */}
                    <div className="min-h-[60px] p-3 rounded-md bg-muted/30 border border-muted-foreground/20">
                      <div
                        dangerouslySetInnerHTML={{ __html: section.defaultContent }}
                        className="[&>h1]:text-3xl [&>h1]:font-bold [&>h2]:text-2xl [&>h2]:font-bold [&>h3]:text-xl [&>h3]:font-semibold [&>h4]:text-lg [&>h4]:font-semibold [&>h5]:text-base [&>h5]:font-medium [&>h6]:text-sm [&>h6]:font-medium [&>p]:text-sm [&>ul]:list-inside [&>ul]:text-sm [&>ol]:list-inside [&>ol]:text-sm [&>table]:text-xs [&>table]:border-collapse [&_th]:border [&_th]:p-1 [&_td]:border [&_td]:p-1 [&>img]:max-w-full [&>img]:h-auto [&>button]:px-3 [&>button]:py-1 [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:rounded [&>a]:text-primary [&>a]:underline"
                      />
                    </div>
                    
                    <CardDescription className="text-sm">
                      {section.description}
                    </CardDescription>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => createSection(section)}
                        className="flex-1 group-hover:shadow-md transition-shadow"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Session
                      </Button>

                      <SectionPreviewDialog section={section} />
                      
                      {isCustomSection(section) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCustomSection(section.type, section.label)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline"
                            size="sm"
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                          <DialogHeader>
                            <DialogTitle>HTML Code - {section.label}</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyHTML(generateSectionHTML(section), section.type)}
                              >
                                {copiedId === section.type ? (
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
                            <ScrollArea className="flex-1 rounded-md border bg-muted/30">
                              <pre className="p-4 text-sm overflow-x-auto">
                                <code className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                                  {generateSectionHTML(section)}
                                </code>
                              </pre>
                            </ScrollArea>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* Database Schema Info */}
        <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-primary">📊</span>
              Database Schema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-card p-4 rounded-lg overflow-x-auto text-sm border">
              <code>{`-- Sections Table
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  styles JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  parent_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates Table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template Sections (Junction Table)
CREATE TABLE template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  parent_section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sections_parent ON sections(parent_id);
CREATE INDEX idx_template_sections_template ON template_sections(template_id);
CREATE INDEX idx_template_sections_order ON template_sections(order_index);`}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Created Sections Count */}
        {sections.length > 0 && (
          <Card className="border-accent bg-accent/5">
            <CardContent className="py-4">
              <p className="text-center text-sm text-muted-foreground">
                <span className="font-semibold text-accent">{sections.length}</span> sections created in this session
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Sections;
