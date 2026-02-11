import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Templates.module.scss";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, PlayCircle, Eye, Calendar, Copy, Archive, ArchiveRestore, RefreshCw, Edit, Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTemplates, updateTemplate, resetTemplatesToDefault, Template } from "@/lib/templateStorage";
import { fetchTemplates } from "@/lib/templateApi";
import { renderSectionContent } from "@/lib/templateUtils";

const Templates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Load templates from API (with localStorage fallback)
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const loadedTemplates = await fetchTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: "Error loading templates",
        description: "Using cached templates from local storage.",
        variant: "destructive",
      });
      setTemplates(getTemplates());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleRunTemplate = (template: Template) => {
    navigate(`/run-templates/${template.id}`);
  };

  const hasLastSentPayload = (tplId: string): boolean => {
    try {
      const allSent = JSON.parse(localStorage.getItem('lastSentPayloads') || '{}');
      return !!allSent[tplId];
    } catch { return false; }
  };

  const handleResendTemplate = (template: Template) => {
    navigate(`/run-templates/${template.id}?resend=true`);
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

  const handleArchiveTemplate = async (id: string, name: string, currentlyArchived: boolean) => {
    updateTemplate(id, { archived: !currentlyArchived });
    await loadTemplates(); // Reload from API
    
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

  const handleResetTemplates = async () => {
    resetTemplatesToDefault();
    await loadTemplates(); // Reload from API
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
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>
              Static Templates
            </h1>
            <p>
              Create and manage your static templates
            </p>
          </div>
          <div className={styles.headerActions}>
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

        {/* Active Templates Section */}
        <div>
          <div className={styles.sectionHeader}>
            <h2>Active Templates</h2>
            <Badge variant="secondary">{activeTemplates.length}</Badge>
          </div>

          {isLoading ? (
            <div className={styles.cardsGrid}>
              {[1, 2, 3].map((i) => (
                <Card key={i} className={styles.templateCard}>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-6 w-20 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </Card>
              ))}
            </div>
          ) : activeTemplates.length === 0 ? (
            <Card className={styles.emptyCard}>
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Plus />
                </div>
                <p className={styles.emptyText}>No templates yet</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/templates/editor')}
                >
                  Create Your First Template
                </Button>
              </div>
            </Card>
          ) : (
            <div className={styles.cardsGrid}>
              {activeTemplates.map((template) => (
                <Card key={template.id} className={styles.templateCard}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{template.name}</h3>
                    <div className={styles.cardMeta}>
                      <Calendar className={styles.metaIcon} />
                      <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className={styles.cardBadges}>
                    <Badge variant="secondary">
                      {template.sectionCount} sections
                    </Badge>
                  </div>

                  <Separator className={styles.cardSeparator} />

                  <div className={styles.cardActions}>
                    <Button
                      onClick={() => handleRunTemplate(template)}
                      className={styles.runButton}
                    >
                      <PlayCircle />
                      Run
                    </Button>
                    {hasLastSentPayload(template.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendTemplate(template)}
                        title="Edit & resend last sent"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Resend
                      </Button>
                    )}
                    <div className={styles.iconActions}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTemplate(template)}
                        className={styles.iconButton}
                      >
                        <Edit />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreviewTemplate(template)}
                        className={styles.iconButton}
                      >
                        <Eye />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyHTML(template.html, template.name)}
                        className={styles.iconButton}
                      >
                        <Copy />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchiveTemplate(template.id, template.name, false)}
                        className={styles.archiveButton}
                      >
                        <Archive />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Archived Templates */}
        {archivedTemplates.length > 0 && (
          <div>
            <div className={styles.sectionHeader}>
              <div className={styles.archivedTitleGroup}>
                <Archive />
                <h2>Archived Templates</h2>
              </div>
              <Badge variant="outline">{archivedTemplates.length}</Badge>
            </div>

            <div className={styles.cardsGrid}>
              {archivedTemplates.map((template) => (
                <Card key={template.id} className={styles.archivedTemplateCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.titleWithBadge}>
                      <h3 className={styles.cardTitle}>{template.name}</h3>
                      <Badge variant="outline" className={styles.archivedBadgeSmall}>
                        Archived
                      </Badge>
                    </div>
                    <div className={styles.cardMeta}>
                      <Calendar className={styles.metaIcon} />
                      <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className={styles.cardBadges}>
                    <Badge variant="secondary">
                      {template.sectionCount} sections
                    </Badge>
                  </div>

                  <Separator className={styles.cardSeparator} />

                  <div className={styles.cardActions}>
                    <Button
                      variant="outline"
                      onClick={() => handleArchiveTemplate(template.id, template.name, true)}
                      className={styles.restoreButton}
                    >
                      <ArchiveRestore />
                      Restore
                    </Button>
                    <div className={styles.iconActions}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreviewTemplate(template)}
                        className={styles.iconButton}
                      >
                        <Eye />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyHTML(template.html, template.name)}
                        className={styles.iconButton}
                      >
                        <Copy />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
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
                  className={styles.previewContent}
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
