import { useState, useEffect } from "react";
import styles from "./Sections.module.scss";
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
import { thymeleafToPlaceholder, replaceWithDefaults } from "@/lib/thymeleafUtils";
import * as LucideIcons from "lucide-react";

const Sections = () => {
  const [searchQuery, setSearchQuery] = useState("");
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
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              Section Library
            </h1>
            <p className={styles.subtitle}>
              Create and manage reusable content sections for your templates
            </p>
          </div>

          {/* Search and Create Button */}
          <div className={styles.searchBar}>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} />
              <Input
                placeholder="Search sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
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
          <div key={category} className={styles.categorySection}>
            <div className={styles.categoryHeader}>
              <h2 className={styles.categoryTitle}>{categoryLabels[category]}</h2>
              <Badge variant="secondary" className="text-xs">
                {categorySections.length}
              </Badge>
            </div>

            <div className={styles.cardsGrid}>
              {categorySections.map((section) => (
                <Card 
                  key={section.type}
                  className={styles.sectionCard}
                >
                  <CardHeader className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>
                      <div className={styles.iconBox}>
                        <section.icon className={styles.cardIcon} />
                      </div>
                      <Badge className={`${styles.categoryBadge} ${styles[category]}`}>
                        {categoryLabels[category]}
                      </Badge>
                    </div>
                    <CardTitle className={styles.cardTitle}>{section.label}</CardTitle>
                  </CardHeader>
                  <CardContent className={styles.cardContent}>
                    {/* Preview of the actual content */}
                    <div className={styles.previewBox}>
                      <div
                        dangerouslySetInnerHTML={{ 
                          __html: replaceWithDefaults(section.defaultContent, section.variables)
                        }}
                      />
                    </div>
                    
                    <CardDescription className={styles.cardDescription}>
                      {section.description}
                    </CardDescription>
                    
                    <div className={styles.cardActions}>
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
        <Card className={styles.schemaCard}>
          <CardHeader className={styles.schemaHeader}>
            <CardTitle className={styles.schemaTitle}>
              <span>📊</span>
              Database Schema
            </CardTitle>
          </CardHeader>
          <CardContent className={styles.schemaContent}>
            <pre className={styles.schemaCode}>
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

      </div>
    </div>
  );
};

export default Sections;
