import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Section } from "@/types/section";
import { ApiConfig, DEFAULT_API_CONFIG } from "@/types/api-config";
import { sectionTypes } from "@/data/sectionTypes";
import { SectionLibrary } from "@/components/templates/SectionLibrary";
import { EditorView } from "@/components/templates/EditorView";
import { PreviewView } from "@/components/templates/PreviewView";
import { TextSelectionToolbar } from "@/components/templates/TextSelectionToolbar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Save, Eye, EyeOff, Library, Code, Copy, Check, ArrowLeft, X, Play, PanelLeftClose, PanelRightClose, Columns, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { saveTemplate, updateTemplate, getTemplates } from "@/lib/templateStorage";
import { renderSectionContent, applyApiDataToSection } from "@/lib/templateUtils";
import { buildApiRequest, validateApiConfig } from "@/lib/apiTemplateUtils";
import { templateApi, flattenSectionsForApi, TemplateCreateRequest, TemplateUpdateRequest, fetchTemplateById } from "@/lib/templateApi";
import { validateTemplate, validateTemplateName, validateSubject, ValidationError } from "@/lib/templateValidation";
import styles from "./TemplateEditor.module.scss";

const TemplateEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editingTemplate = location.state?.template;
  const templateIdFromUrl = searchParams.get('id');
  
  // Static header section - cannot be deleted or moved
  const [headerSection, setHeaderSection] = useState<Section>({
    id: 'static-header',
    type: 'header',
    content: '<div style="text-align: center; padding: 20px; background: #f8f9fa; border-bottom: 2px solid #dee2e6;"><h1><th:utext="${companyName}"></h1><p><th:utext="${tagline}"></p></div>',
    variables: {
      companyName: 'Your Company Name',
      tagline: 'Your Company Tagline'
    },
    styles: {}
  });

  // Static footer section - cannot be deleted or moved
  const [footerSection, setFooterSection] = useState<Section>({
    id: 'static-footer',
    type: 'footer',
    content: '<div style="text-align: center; padding: 20px; background: #f8f9fa; border-top: 2px solid #dee2e6; margin-top: 40px;"><p>&copy; <th:utext="${year}"> <th:utext="${companyName}">. All rights reserved.</p><p><th:utext="${contactEmail}"></p></div>',
    variables: {
      year: new Date().getFullYear().toString(),
      companyName: 'Your Company Name',
      contactEmail: 'contact@example.com'
    },
    styles: {}
  });

  const [sections, setSections] = useState<Section[]>([
    {
      id: 'demo-1',
      type: 'heading1',
      content: 'Welcome to Your Static Template',
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
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_API_CONFIG);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showLibrary, setShowLibrary] = useState(false);
  const [copied, setCopied] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState(""); // Email subject with {{placeholders}} support
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'editor-only' | 'preview-only'>('split');
  const [copiedStyles, setCopiedStyles] = useState<Section['styles'] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const { toast } = useToast();

  // Helper function to load template data into state
  const loadTemplateIntoEditor = (template: any) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateSubject(template.subject || "");
    
    // Load sections
    if (template.sections && template.sections.length > 0) {
      const loadedSections = template.sections;
      
      // Find header and footer
      const header = loadedSections.find((s: Section) => s.id === 'static-header');
      const footer = loadedSections.find((s: Section) => s.id === 'static-footer');
      const userSections = loadedSections.filter((s: Section) => 
        s.id !== 'static-header' && s.id !== 'static-footer'
      );
      
      if (header) setHeaderSection(header);
      if (footer) setFooterSection(footer);
      setSections(userSections);
    }
    
    // Load API config
    if (template.apiConfig) {
      setApiConfig(template.apiConfig);
    }
    
    toast({
      title: "Template loaded",
      description: `Editing "${template.name}"`,
    });
  };

  // Load template for editing - from state or fetch by ID
  useEffect(() => {
    const loadTemplate = async () => {
      // If template passed via navigation state, use it
      if (editingTemplate) {
        loadTemplateIntoEditor(editingTemplate);
        return;
      }
      
      // If template ID in URL, fetch from API
      if (templateIdFromUrl) {
        setIsLoadingTemplate(true);
        try {
          const template = await fetchTemplateById(templateIdFromUrl);
          if (template) {
            loadTemplateIntoEditor(template);
          } else {
            toast({
              title: "Template not found",
              description: "The requested template could not be found.",
              variant: "destructive",
            });
            navigate('/templates');
          }
        } catch (error) {
          console.error('Failed to load template:', error);
          toast({
            title: "Error loading template",
            description: "Failed to load the template. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingTemplate(false);
        }
      }
    };
    
    loadTemplate();
  }, [editingTemplate, templateIdFromUrl]);

  // Sync selectedSection with the latest section data from sections array
  useEffect(() => {
    if (selectedSection) {
      // Find the latest version of the selected section
      const findSection = (sectionList: Section[]): Section | null => {
        for (const s of sectionList) {
          if (s.id === selectedSection.id) return s;
          if (s.children && s.children.length > 0) {
            const found = findSection(s.children);
            if (found) return found;
          }
        }
        return null;
      };

      // Check header and footer first
      if (selectedSection.id === 'static-header' && headerSection) {
        if (JSON.stringify(selectedSection) !== JSON.stringify(headerSection)) {
          setSelectedSection(headerSection);
        }
        return;
      }
      if (selectedSection.id === 'static-footer' && footerSection) {
        if (JSON.stringify(selectedSection) !== JSON.stringify(footerSection)) {
          setSelectedSection(footerSection);
        }
        return;
      }

      const latestSection = findSection(sections);
      if (latestSection && JSON.stringify(selectedSection) !== JSON.stringify(latestSection)) {
        setSelectedSection(latestSection);
      }
    }
  }, [sections, headerSection, footerSection]);

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

    if (active.id.toString().startsWith('library-')) {
      const dropTargetId = String(over.id);
      const sectionType = active.id.toString().replace('library-', '');
      const sectionDef = sectionTypes.find(s => s.type === sectionType);
      
      if (!sectionDef) return;
      
      // Check if dropping into a container
      const targetContainer = sections.find(s => s.id === dropTargetId && s.type === 'container');
      
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
        },
        isLabelEditable: true // Default to editable at runtime
      };
      
      if (targetContainer) {
        // Add to container's children
        const updatedSections = sections.map(s => 
          s.id === targetContainer.id 
            ? { ...s, children: [...(s.children || []), newSection] }
            : s
        );
        setSections(updatedSections);
        toast({
          title: "Section added to container",
          description: `${sectionDef.label} added inside container.`,
        });
      } else {
        // Add to main sections
        setSections([...sections, newSection]);
        toast({
          title: "Section added",
          description: `${sectionDef.label} has been added to your template.`,
        });
      }
      return;
    }

    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleUpdateSection = (updatedSection: Section) => {
    // Update header or footer if selected
    if (updatedSection.id === 'static-header') {
      setHeaderSection(updatedSection);
      setSelectedSection(updatedSection);
      return;
    }
    if (updatedSection.id === 'static-footer') {
      setFooterSection(updatedSection);
      setSelectedSection(updatedSection);
      return;
    }
    
    // Helper function to recursively update nested sections
    const updateNestedSection = (sectionList: Section[]): Section[] => {
      return sectionList.map(s => {
        if (s.id === updatedSection.id) {
          return updatedSection;
        }
        // Check if this section has children that need updating
        if (s.children && s.children.length > 0) {
          return {
            ...s,
            children: updateNestedSection(s.children)
          };
        }
        return s;
      });
    };
    
    const updatedSections = updateNestedSection(sections);
    setSections(updatedSections);
    setSelectedSection(updatedSection);
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

  const handleAddChildToContainer = (parentId: string) => {
    // Find the container section
    const containerIndex = sections.findIndex(s => s.id === parentId);
    if (containerIndex === -1) return;

    const container = sections[containerIndex];
    
    // Create a simple text section as default child
      const newChild: Section = {
      id: `child-${Date.now()}-${Math.random()}`,
      type: 'text',
      content: '<span><th:utext="${text}"></span>',
      variables: {
        text: 'New nested section'
      },
      styles: {
        fontSize: '14px',
        color: '#000000',
      }
    };

    // Add child to container
    const updatedContainer = {
      ...container,
      children: [...(container.children || []), newChild]
    };

    // Update sections array
    const newSections = [...sections];
    newSections[containerIndex] = updatedContainer;
    setSections(newSections);

    toast({
      title: "Section added",
      description: "A new section has been added to the container.",
    });
  };

  const handleDeleteSection = (id: string) => {
    // Check if this is a child section first
    let foundInContainer = false;
    const newSections = sections.map(section => {
      if (section.children && section.children.some(child => child.id === id)) {
        foundInContainer = true;
        return {
          ...section,
          children: section.children.filter(child => child.id !== id)
        };
      }
      return section;
    });

    if (foundInContainer) {
      setSections(newSections);
      if (selectedSection?.id === id) {
        setSelectedSection(null);
      }
      toast({
        title: "Section deleted",
        description: "The nested section has been removed.",
      });
      return;
    }

    // Otherwise delete from main sections
    setSections(sections.filter(s => s.id !== id));
    if (selectedSection?.id === id) {
      setSelectedSection(null);
    }
    toast({
      title: "Section deleted",
      description: "The section has been removed from your template.",
    });
  };

  const handleDuplicateSection = (id: string) => {
    const sectionIndex = sections.findIndex(s => s.id === id);
    if (sectionIndex === -1) return;

    const sectionToDuplicate = sections[sectionIndex];
    const duplicatedSection: Section = {
      ...sectionToDuplicate,
      id: `section-${Date.now()}-${Math.random()}`,
      children: sectionToDuplicate.children?.map(child => ({
        ...child,
        id: `child-${Date.now()}-${Math.random()}`
      }))
    };

    const newSections = [...sections];
    newSections.splice(sectionIndex + 1, 0, duplicatedSection);
    setSections(newSections);

    toast({
      title: "Section duplicated",
      description: "The section has been duplicated successfully.",
    });
  };

  const handleCopyStyles = (id: string) => {
    const section = sections.find(s => s.id === id);
    if (section?.styles) {
      setCopiedStyles(section.styles);
      toast({
        title: "Styles copied",
        description: "Section styles have been copied to clipboard.",
      });
    }
  };

  const handlePasteStyles = (id: string) => {
    if (!copiedStyles) {
      toast({
        title: "No styles copied",
        description: "Please copy styles from another section first.",
        variant: "destructive",
      });
      return;
    }

    const section = sections.find(s => s.id === id);
    if (section) {
      const updatedSection = {
        ...section,
        styles: copiedStyles
      };
      handleUpdateSection(updatedSection);
      toast({
        title: "Styles pasted",
        description: "Styles have been applied to the section.",
      });
    }
  };

  // Real-time validation handlers
  const handleNameChange = (value: string) => {
    setTemplateName(value);
    const error = validateTemplateName(value);
    setNameError(error?.message || null);
  };

  const handleSubjectChange = (value: string) => {
    setTemplateSubject(value);
    const error = validateSubject(value);
    setSubjectError(error?.message || null);
  };

  const handleSaveTemplate = async () => {
    // Run comprehensive validation
    const allSections = [headerSection, ...sections, footerSection];
    const validation = validateTemplate(templateName, templateSubject, allSections);
    
    setValidationErrors(validation.errors);
    
    if (!validation.isValid) {
      // Show first few errors in toast
      const errorMessages = validation.errors.slice(0, 3).map(e => e.message);
      const moreCount = validation.errors.length - 3;
      
      toast({
        title: "Validation Failed",
        description: (
          <div className="space-y-1">
            {errorMessages.map((msg, i) => (
              <p key={i}>• {msg}</p>
            ))}
            {moreCount > 0 && <p className="text-muted-foreground">...and {moreCount} more issues</p>}
          </div>
        ),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Generate HTML with placeholders, not rendered values
      const html = generateHTMLWithPlaceholders();
      
      // Prepare all sections for API using flattenSectionsForApi helper
      const allSections = [headerSection, ...sections, footerSection];
      const apiSections = flattenSectionsForApi(allSections);
      
      // Build API config request if enabled
      const apiConfigRequest = apiConfig.enabled ? {
        enabled: apiConfig.enabled,
        templateId: apiConfig.templateId,
        paramValues: apiConfig.paramValues,
        mappings: apiConfig.mappings.map(m => ({
          sectionId: m.sectionId,
          apiPath: m.apiPath,
          dataType: m.dataType,
          variableName: m.variableName,
        })),
      } : undefined;

      if (isEditMode && editingTemplateId) {
        // UPDATE: Call backend API to update existing template
        const updateRequest: TemplateUpdateRequest = {
          name: templateName,
          subject: templateSubject || undefined, // Include subject if provided
          html,
          sectionCount: allSections.length,
          archived: false,
          sections: apiSections,
          apiConfig: apiConfigRequest,
        };

        // Call backend API
        const response = await templateApi.updateTemplate(editingTemplateId, updateRequest);
        console.log('Template updated via API:', response);
        
        // Also update local storage as fallback
        updateTemplate(editingTemplateId, {
          name: templateName,
          subject: templateSubject || undefined,
          html,
          sectionCount: allSections.length,
          archived: false,
          apiConfig: apiConfig.enabled ? apiConfig : undefined,
          sections: allSections,
        });

        toast({
          title: "Template updated",
          description: `"${templateName}" has been updated successfully.`,
        });
      } else {
        // CREATE: Call backend API to create new template
        const createRequest: TemplateCreateRequest = {
          name: templateName,
          subject: templateSubject || undefined, // Include subject if provided
          html,
          sectionCount: allSections.length,
          archived: false,
          sections: apiSections,
          apiConfig: apiConfigRequest,
        };

        // Call backend API
        const response = await templateApi.createTemplate(createRequest);
        console.log('Template created via API:', response);
        
        // Also save to local storage as fallback
        saveTemplate({
          name: templateName,
          subject: templateSubject || undefined,
          html,
          createdAt: new Date().toISOString(),
          sectionCount: allSections.length,
          archived: false,
          apiConfig: apiConfig.enabled ? apiConfig : undefined,
          sections: allSections,
        });

        toast({
          title: "Template saved",
          description: `"${templateName}" has been saved successfully.`,
        });
      }

      // Navigate back to templates list
      setTimeout(() => navigate('/templates'), 500);
    } catch (error: any) {
      console.error('Error saving template:', error);
      
      // Fallback to local storage only if API fails
      const allSections = [headerSection, ...sections, footerSection];
      const html = generateHTMLWithPlaceholders();
      
      if (isEditMode && editingTemplateId) {
        updateTemplate(editingTemplateId, {
          name: templateName,
          subject: templateSubject || undefined,
          html,
          sectionCount: allSections.length,
          archived: false,
          apiConfig: apiConfig.enabled ? apiConfig : undefined,
          sections: allSections,
        });
      } else {
        saveTemplate({
          name: templateName,
          subject: templateSubject || undefined,
          html,
          createdAt: new Date().toISOString(),
          sectionCount: allSections.length,
          archived: false,
          apiConfig: apiConfig.enabled ? apiConfig : undefined,
          sections: allSections,
        });
      }

      toast({
        title: "Saved locally",
        description: `Template saved to local storage. API error: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      
      setTimeout(() => navigate('/templates'), 500);
    } finally {
      setIsSaving(false);
    }
  };

  const generateHTMLWithPlaceholders = () => {
    const allSections = [headerSection, ...sections, footerSection];
    
    const generateSectionHTML = (section: Section, indent = ''): string => {
      const styleString = Object.entries(section.styles || {})
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');
      
      // Handle heading/text sections with inline placeholders
      const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
      if (inlinePlaceholderTypes.includes(section.type) && section.content) {
        const contentWithThymeleaf = section.content.replace(/\{\{(\w+)\}\}/g, '<th:utext="${$1}">');
        
        // Wrap in appropriate HTML tag
        const tagMap: Record<string, string> = {
          'heading1': 'h1',
          'heading2': 'h2',
          'heading3': 'h3',
          'heading4': 'h4',
          'heading5': 'h5',
          'heading6': 'h6',
          'text': 'span',
          'paragraph': 'p'
        };
        const tag = tagMap[section.type] || 'div';
        
        return `${indent}<${tag} style="${styleString}">${contentWithThymeleaf}</${tag}>`;
      }
      
      // Handle container sections with children
      if (section.type === 'container' && section.children && section.children.length > 0) {
        const childrenHTML = section.children.map(child => generateSectionHTML(child, indent + '  ')).join('\n');
        return `${indent}<div style="margin: 15px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;">\n${childrenHTML}\n${indent}</div>`;
      }
      
      // Keep Thymeleaf tags in content - don't render variables
      return `${indent}<div style="${styleString}">\n${indent}  ${section.content}\n${indent}</div>`;
    };
    
    return allSections.map(section => generateSectionHTML(section)).join('\n\n');
  };

  const generateHTML = () => {
    const allSections = [headerSection, ...sections, footerSection];
    return allSections.map(section => {
      // Add default spacing styles for better layout
      const defaultStyles = {
        margin: '10px 0',
        padding: '8px',
      };
      
      const combinedStyles = { ...defaultStyles, ...section.styles };
      const styleString = Object.entries(combinedStyles)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');
      
      const content = renderSectionContent(section);
      return `<div style="${styleString}">\n  ${content}\n</div>`;
    }).join('\n\n');
  };

  const handleCopyHTML = async () => {
    const html = generateHTMLWithPlaceholders();
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      toast({
        title: "HTML copied",
        description: "Template HTML with Thymeleaf tags has been copied to clipboard.",
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

  const handleTestApiFetch = async () => {
    if (!apiConfig.enabled || !apiConfig.templateId) {
      toast({
        title: "API not configured",
        description: "Please select an API template first.",
        variant: "destructive",
      });
      return;
    }

    // Validate required parameters
    const validation = validateApiConfig(apiConfig);
    if (!validation.valid) {
      toast({
        title: "Missing parameters",
        description: `Please provide: ${validation.missingParams.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Build API request from template
    const request = buildApiRequest(apiConfig);
    if (!request) {
      toast({
        title: "Invalid template",
        description: "Could not build API request from template.",
        variant: "destructive",
      });
      return;
    }

    try {
      const options: RequestInit = {
        method: request.method,
        headers: request.headers,
      };

      if (request.body && (request.method === 'POST' || request.method === 'PUT')) {
        options.body = request.body;
        options.headers = { ...options.headers, 'Content-Type': 'application/json' };
      }

      const response = await fetch(request.url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Apply mappings to sections
      const updatedSections = [...sections];
      apiConfig.mappings.forEach(mapping => {
        const sectionIndex = updatedSections.findIndex(s => s.id === mapping.sectionId);
        if (sectionIndex !== -1) {
          updatedSections[sectionIndex] = applyApiDataToSection(
            updatedSections[sectionIndex],
            data,
            mapping
          );
        }
      });

      setSections(updatedSections);

      toast({
        title: "API data fetched",
        description: "Successfully fetched and mapped data to sections.",
      });
    } catch (error) {
      console.error('API fetch error:', error);
      toast({
        title: "Fetch failed",
        description: error instanceof Error ? error.message : "Failed to fetch API data.",
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
      <div className={styles.container}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          <div className={styles.topBarRow}>
            <div className={styles.titleSection}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/templates')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            
            {/* Inline Template Name and Subject Fields */}
            <div className={styles.templateMetaFields}>
              <div className={`${styles.metaField} ${nameError ? styles.hasError : ''}`}>
                <Label htmlFor="inline-template-name" className={styles.metaLabel}>
                  Template Name <span className={styles.required}>*</span>
                </Label>
                <div className={styles.inputWrapper}>
                  <Input
                    id="inline-template-name"
                    placeholder="Enter template name..."
                    value={templateName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className={`${styles.metaInput} ${nameError ? styles.inputError : ''}`}
                  />
                  {nameError && <span className={styles.errorText}>{nameError}</span>}
                </div>
              </div>
              <div className={`${styles.metaField} ${subjectError ? styles.hasError : ''}`}>
                <Label htmlFor="inline-template-subject" className={styles.metaLabel}>
                  Subject <span className={styles.required}>*</span>
                </Label>
                <div className={styles.inputWrapper}>
                  <Input
                    id="inline-template-subject"
                    placeholder="Email subject (supports {{placeholders}})..."
                    value={templateSubject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className={`${styles.metaInput} ${subjectError ? styles.inputError : ''}`}
                  />
                  {subjectError && <span className={styles.errorText}>{subjectError}</span>}
                </div>
              </div>
            </div>
            
            <div className={styles.viewControls}>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowLibrary(false)}
                        className="h-8 w-8 hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </Button>
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
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
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
                      <pre className="p-4 text-sm whitespace-pre-wrap break-words overflow-x-auto">
                        <code className="break-all">{generateHTMLWithPlaceholders()}</code>
                      </pre>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
              
              {apiConfig.enabled && apiConfig.templateId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestApiFetch}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Test & Fetch API Data
                </Button>
              )}
              
              {/* Validation indicator */}
              {validationErrors.length > 0 && (
                <div className={styles.validationIndicator}>
                  <AlertCircle className="h-4 w-4" />
                  <span>{validationErrors.length} issue{validationErrors.length > 1 ? 's' : ''}</span>
                </div>
              )}
              
              <Button
                size="sm"
                className="shadow-lg shadow-primary/20"
                onClick={handleSaveTemplate}
                disabled={isSaving || !!nameError || !!subjectError}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

          {/* Main Content */}
          <div className={styles.contentArea}>
            {/* Text Selection Toolbar */}
            <TextSelectionToolbar 
              onApplyStyle={(styles) => {
                // Apply styles to selected text
                if (selectedSection) {
                  handleUpdateSection({
                    ...selectedSection,
                    styles: {
                      ...selectedSection.styles,
                      ...styles
                    }
                  });
                }
              }}
            />
          
          {/* View Mode Controls - Floating */}
          <div className={styles.floatingViewControls}>
            <Button
              variant={viewMode === 'editor-only' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('editor-only')}
              title="Editor Only View"
              className={styles.viewButton}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            
            <Button
              variant={viewMode === 'split' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('split')}
              title="Split View"
              className={styles.viewButton}
            >
              <Columns className="h-4 w-4" />
            </Button>
            
            <Button
              variant={viewMode === 'preview-only' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('preview-only')}
              title="Preview Only View"
              className={styles.viewButton}
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
          
          {viewMode === 'split' ? (
            <ResizablePanelGroup direction="horizontal" className={styles.resizableGroup}>
              <ResizablePanel defaultSize={50} minSize={20} className={styles.editorSection}>
                <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <EditorView
                    headerSection={headerSection}
                    footerSection={footerSection}
                    sections={sections}
                    selectedSection={selectedSection}
                    onSelectSection={setSelectedSection}
                    onUpdateSection={handleUpdateSection}
                    onDeleteSection={handleDeleteSection}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onAddChildToContainer={handleAddChildToContainer}
                    onDuplicateSection={handleDuplicateSection}
                    onCopyStyles={handleCopyStyles}
                    onPasteStyles={handlePasteStyles}
                    apiConfig={apiConfig}
                    onApiConfigUpdate={setApiConfig}
                  />
                </SortableContext>
              </ResizablePanel>
              
              <ResizableHandle withHandle className={styles.resizeHandle} />
              
              <ResizablePanel defaultSize={50} minSize={20} className={styles.previewSection}>
                <PreviewView 
                  headerSection={headerSection}
                  footerSection={footerSection}
                  sections={sections} 
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <>
              {/* Editor Only */}
              {viewMode === 'editor-only' && (
                <div className={styles.singleViewContainer}>
                  <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <EditorView
                      headerSection={headerSection}
                      footerSection={footerSection}
                      sections={sections}
                      selectedSection={selectedSection}
                      onSelectSection={setSelectedSection}
                      onUpdateSection={handleUpdateSection}
                      onDeleteSection={handleDeleteSection}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onAddChildToContainer={handleAddChildToContainer}
                      onDuplicateSection={handleDuplicateSection}
                      onCopyStyles={handleCopyStyles}
                      onPasteStyles={handlePasteStyles}
                      apiConfig={apiConfig}
                      onApiConfigUpdate={setApiConfig}
                    />
                  </SortableContext>
                </div>
              )}

              {/* Preview Only */}
              {viewMode === 'preview-only' && (
                <div className={styles.singleViewContainer}>
                  <PreviewView 
                    headerSection={headerSection}
                    footerSection={footerSection}
                    sections={sections} 
                  />
                </div>
              )}
            </>
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

export default TemplateEditor;
