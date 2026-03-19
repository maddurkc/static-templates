import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Templates.module.scss";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, PlayCircle, Eye, Calendar, Copy, Archive, ArchiveRestore, RefreshCw, Edit, Loader2, RotateCw, CopyPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTemplates, updateTemplate, resetTemplatesToDefault, Template } from "@/lib/templateStorage";
import { fetchTemplates, templateApi, responseToTemplate } from "@/lib/templateApi";
import { renderSectionContent } from "@/lib/templateUtils";

const Templates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // Clone dialog state
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneSourceTemplate, setCloneSourceTemplate] = useState<Template | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const cloneNameInputRef = useRef<HTMLInputElement>(null);

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

  const handleArchiveTemplate = async (id: string, name: string, currentlyArchived: boolean) => {
    updateTemplate(id, { archived: !currentlyArchived });
    await loadTemplates();
    
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
    await loadTemplates();
    toast({
      title: "Templates reset",
      description: "All templates have been reset to default demos including the API demo template.",
    });
  };

  const handleEditTemplate = (template: Template) => {
    navigate('/templates/editor', { state: { template } });
  };

  const handleResendTemplate = (template: Template) => {
    navigate('/run-templates', { state: { template, resend: true } });
  };

  const hasLastSent = (templateId: string) => {
    return localStorage.getItem(`last_sent_${templateId}`) !== null;
  };

  // Clone handlers
  const openCloneDialog = (template: Template) => {
    setCloneSourceTemplate(template);
    setCloneName(`${template.name} (Copy)`);
    setCloneDescription("");
    setShowCloneDialog(true);
    // Focus the name input after dialog opens
    setTimeout(() => cloneNameInputRef.current?.select(), 100);
  };

  const handleCloneTemplate = async () => {
    if (!cloneSourceTemplate || !cloneName.trim()) return;

    setIsCloning(true);
    try {
      const response = await templateApi.cloneTemplate(
        cloneSourceTemplate.id,
        cloneName.trim(),
        cloneDescription.trim()
      );
      const clonedTemplate = responseToTemplate(response);
      
      setShowCloneDialog(false);
      await loadTemplates();

      toast({
        title: "Template cloned",
        description: `"${clonedTemplate.name}" has been created from "${cloneSourceTemplate.name}".`,
      });
    } catch (error: any) {
      console.error('Failed to clone template:', error);
      toast({
        title: "Clone failed",
        description: error?.message || "Failed to clone template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCloning(false);
    }
  };

  // Generate preview HTML from sections or html field
  const previewHtml = useMemo(() => {
    if (!previewTemplate) return "";
    
    if (previewTemplate.sections && previewTemplate.sections.length > 0) {
      return previewTemplate.sections
        .map((section) => renderSectionContent(section))
        .join('');
    }
    
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
                    <div className={styles.iconActions}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTemplate(template)}
                        className={styles.iconButton}
                      >
                        <Edit />
                      </Button>
                      {hasLastSent(template.id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResendTemplate(template)}
                          className={styles.iconButton}
                          title="Resend from last sent"
                        >
                          <RotateCw />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openCloneDialog(template)}
                        className={styles.cloneButton}
                        title="Clone template"
                      >
                        <CopyPlus />
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

        {/* Clone Template Dialog */}
        <Dialog open={showCloneDialog} onOpenChange={(open) => { if (!isCloning) setShowCloneDialog(open); }}>
          <DialogContent className={styles.cloneDialog}>
            <DialogHeader>
              <DialogTitle className={styles.cloneDialogTitle}>
                <CopyPlus className={styles.cloneDialogIcon} />
                Clone Template
              </DialogTitle>
              <DialogDescription className={styles.cloneDialogDesc}>
                Create a new template from <strong>"{cloneSourceTemplate?.name}"</strong>. All sections, styles, variables, and API integrations will be copied.
              </DialogDescription>
            </DialogHeader>

            <div className={styles.cloneForm}>
              <div className={styles.cloneField}>
                <label htmlFor="clone-name" className={styles.cloneLabel}>
                  Template Name <span className={styles.required}>*</span>
                </label>
                <Input
                  id="clone-name"
                  ref={cloneNameInputRef}
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="Enter a name for the cloned template"
                  onKeyDown={(e) => { if (e.key === 'Enter' && cloneName.trim()) handleCloneTemplate(); }}
                />
              </div>

              <div className={styles.cloneField}>
                <label htmlFor="clone-desc" className={styles.cloneLabel}>
                  Description <span className={styles.optional}>(optional)</span>
                </label>
                <Textarea
                  id="clone-desc"
                  value={cloneDescription}
                  onChange={(e) => setCloneDescription(e.target.value)}
                  placeholder="Add a description for the cloned template"
                  rows={3}
                  className={styles.cloneTextarea}
                />
              </div>

              <div className={styles.cloneInfoBox}>
                <h4>What will be cloned:</h4>
                <ul>
                  <li>All sections & content structure</li>
                  <li>Styles & formatting</li>
                  <li>Variables & placeholders</li>
                  <li>API integrations & configurations</li>
                  <li>Email subject template</li>
                </ul>
              </div>
            </div>

            <DialogFooter className={styles.cloneFooter}>
              <Button
                variant="outline"
                onClick={() => setShowCloneDialog(false)}
                disabled={isCloning}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCloneTemplate}
                disabled={!cloneName.trim() || isCloning}
                className={styles.cloneSubmitBtn}
              >
                {isCloning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <CopyPlus className="h-4 w-4 mr-2" />
                    Clone Template
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Templates;
