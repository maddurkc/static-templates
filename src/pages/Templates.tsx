import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, PlayCircle, Eye, Calendar, Copy, Archive, ArchiveRestore, RefreshCw, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTemplates, updateTemplate, resetTemplatesToDefault, Template } from "@/lib/templateStorage";
import { renderSectionContent } from "@/lib/templateUtils";

const Templates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Load templates from localStorage on mount
  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

  const handleRunTemplate = (template: Template) => {
    navigate('/run-templates', { state: { template } });
  };

  const handleCopyHTML = async (html: string, templateName: string) => {
    try {
      await navigator.clipboard.writeText(html);
      toast({
        title: "HTML copied",
        description: `HTML for "${templateName}" copied to clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy HTML to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleArchiveTemplate = (id: string, name: string, currentlyArchived: boolean) => {
    updateTemplate(id, { archived: !currentlyArchived });
    setTemplates(getTemplates());
    
    toast({
      title: currentlyArchived ? "Template restored" : "Template archived",
      description: currentlyArchived 
        ? `"${name}" has been restored.`
        : `"${name}" has been archived.`,
    });
  };

  const handlePreviewTemplate = (template: Template) => {
    setPreviewTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleResetTemplates = () => {
    resetTemplatesToDefault();
    setTemplates(getTemplates());
    toast({
      title: "Templates reset",
      description: "All templates have been reset to default demos including the API demo template.",
    });
  };

  const handleEditTemplate = (template: Template) => {
    navigate('/templates/editor', { state: { template } });
  };

  // Generate preview HTML from sections or html field
  const previewHtml = useMemo(() => {
    if (!previewTemplate) return "";
    
    // If template has sections, render from sections
    if (previewTemplate.sections && previewTemplate.sections.length > 0) {
      return previewTemplate.sections
        .map((section) => renderSectionContent(section))
        .join('');
    }
    
    // Otherwise use html field
    return previewTemplate.html;
  }, [previewTemplate]);

  const activeTemplates = templates.filter(t => !t.archived);
  const archivedTemplates = templates.filter(t => t.archived);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Static Templates
            </h1>
            <p className="text-muted-foreground">
              Create and manage your static templates
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="lg"
              variant="outline"
              onClick={handleResetTemplates}
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Reset to Demo Templates
            </Button>
            <Button
              size="lg"
              onClick={() => navigate('/templates/editor')}
              className="shadow-lg shadow-primary/20"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Static Template
            </Button>
          </div>
        </div>

        {/* Templates Table */}
        <Card className="border-2 mb-6">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-semibold text-lg">Active Templates</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Template Name</TableHead>
                <TableHead className="font-semibold">Sections</TableHead>
                <TableHead className="font-semibold">Created Date</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-muted p-4">
                        <Plus className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">No templates yet</p>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/templates/editor')}
                      >
                        Create Your First Template
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                activeTemplates.map((template) => (
                  <TableRow key={template.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {template.sectionCount} sections
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunTemplate(template)}
                          className="shadow-sm"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Run
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="hover:bg-blue-100 hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewTemplate(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyHTML(template.html, template.name)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveTemplate(template.id, template.name, false)}
                          className="hover:bg-orange-100 hover:text-orange-700"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Archived Templates */}
        {archivedTemplates.length > 0 && (
          <Card className="border-2 border-orange-200 bg-orange-50/50">
            <div className="p-4 border-b bg-orange-100/50">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Archived Templates
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-100/30">
                  <TableHead className="font-semibold">Template Name</TableHead>
                  <TableHead className="font-semibold">Sections</TableHead>
                  <TableHead className="font-semibold">Created Date</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedTemplates.map((template) => (
                  <TableRow key={template.id} className="hover:bg-orange-100/30 transition-colors opacity-60">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge variant="outline" className="text-xs">Archived</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {template.sectionCount} sections
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewTemplate(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyHTML(template.html, template.name)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchiveTemplate(template.id, template.name, true)}
                          className="text-green-700 hover:bg-green-100"
                        >
                          <ArchiveRestore className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[70vh] w-full rounded-md border bg-white p-6">
              {previewTemplate && (
                <div
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                  className="prose max-w-none [&>h1]:text-3xl [&>h1]:font-bold [&>h2]:text-2xl [&>h2]:font-bold [&>h3]:text-xl [&>h3]:font-semibold [&>h4]:text-lg [&>h4]:font-semibold [&>h5]:text-base [&>h5]:font-medium [&>h6]:text-sm [&>h6]:font-medium [&>p]:text-sm [&>ul]:list-disc [&>ul]:list-inside [&>ul]:text-sm [&>ol]:list-decimal [&>ol]:list-inside [&>ol]:text-sm"
                />
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Templates;
