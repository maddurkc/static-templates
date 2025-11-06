import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Code, Copy, Check } from "lucide-react";
import { sectionTypes } from "@/data/sectionTypes";
import { Section } from "@/types/section";
import { useToast } from "@/hooks/use-toast";

const Sections = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredSections = sectionTypes.filter((section) =>
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
    return `<div class="section-${sectionDef.type}">\n  ${sectionDef.defaultContent}\n</div>`;
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

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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
                    <CardDescription className="text-sm min-h-[40px]">
                      {section.description}
                    </CardDescription>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => createSection(section)}
                        className="flex-1 group-hover:shadow-md transition-shadow"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                      
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
