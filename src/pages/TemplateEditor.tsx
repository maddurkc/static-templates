import { useState, useEffect, useMemo, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Section } from "@/types/section";
import { TemplateVariable } from "@/types/template-variable";
import { GlobalApiConfig, DEFAULT_GLOBAL_API_CONFIG } from "@/types/global-api-config";
import { sectionTypes, headingDefaultStyles, OUTLOOK_FONT_FAMILY } from "@/data/sectionTypes";
import { SectionLibrary } from "@/components/templates/SectionLibrary";
import { EditorView } from "@/components/templates/EditorView";
import { PreviewView } from "@/components/templates/PreviewView";
import { TextSelectionToolbar } from "@/components/templates/TextSelectionToolbar";
import { ValidationErrorsPanel } from "@/components/templates/ValidationErrorsPanel";
import { VariablesPanel } from "@/components/templates/VariablesPanel";
import { GlobalApiPanel } from "@/components/templates/GlobalApiPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Save, Eye, EyeOff, Library, Code, Copy, Check, ArrowLeft, X, Play, PanelLeftClose, PanelRightClose, Columns, Loader2, AlertCircle, Variable, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { saveTemplate, updateTemplate, getTemplates } from "@/lib/templateStorage";
import { renderSectionContent, wrapSectionInTable } from "@/lib/templateUtils";
import { templateApi, flattenSectionsForApi, TemplateCreateRequest, TemplateUpdateRequest, fetchTemplateById } from "@/lib/templateApi";
import { validateTemplate, validateTemplateName, validateSubject, ValidationError } from "@/lib/templateValidation";
import { extractAllTemplateVariables, variableToRequest } from "@/lib/variableExtractor";
import { subjectPlaceholderToThymeleaf, subjectThymeleafToPlaceholder } from "@/lib/thymeleafUtils";
import { generateListVariableName, generateThymeleafListHtml } from "@/lib/listThymeleafUtils";
import { generateTextSectionVariableName, isTextBasedSection, generateThymeleafTextHtml } from "@/lib/textThymeleafUtils";
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
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [globalApiConfig, setGlobalApiConfig] = useState<GlobalApiConfig>(DEFAULT_GLOBAL_API_CONFIG);
  const [showApiPanel, setShowApiPanel] = useState(false);
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
  const [showValidationPanel, setShowValidationPanel] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [showVariablesPanel, setShowVariablesPanel] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<{ sectionId: string; position: 'before' | 'after' } | null>(null);
  const { toast } = useToast();

  // Extract all template variables from sections and subject
  const extractedVariables = useMemo(() => {
    return extractAllTemplateVariables(
      templateSubject,
      headerSection,
      sections,
      footerSection
    );
  }, [templateSubject, headerSection, sections, footerSection]);

  // Compute section IDs with errors for highlighting
  const sectionIdsWithErrors = useMemo(() => {
    const ids = new Set<string>();
    validationErrors.forEach(error => {
      if (error.sectionId) {
        ids.add(error.sectionId);
      }
    });
    return ids;
  }, [validationErrors]);

  // Scroll to section with error
  const handleScrollToSection = useCallback((sectionId: string) => {
    const element = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Find and select the section
      const section = sections.find(s => s.id === sectionId);
      if (section) {
        setSelectedSection(section);
      }
    }
  }, [sections]);

  // Helper function to load template data into state
  const loadTemplateIntoEditor = (template: any) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    // Convert Thymeleaf tags back to placeholders for editing display
    setTemplateSubject(template.subject ? subjectThymeleafToPlaceholder(template.subject) : "");
    
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
    
    // Load Global API config
    if (template.globalApiConfig) {
      setGlobalApiConfig(template.globalApiConfig);
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
    setDropIndicator(null);
    if (id.startsWith('library-')) {
      setShowLibrary(false);
    }
  };

  // Track current mouse position for accurate drop placement
  const [currentMouseY, setCurrentMouseY] = useState<number>(0);

  // Global mouse move handler for accurate drag positioning
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCurrentMouseY(e.clientY);
    };
    
    if (activeId) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [activeId]);

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || !active.id.toString().startsWith('library-')) {
      setDropIndicator(null);
      return;
    }

    const dropTargetId = String(over.id);
    
    // Skip if dropping on the main drop zone
    if (dropTargetId === 'editor-drop-zone') {
      setDropIndicator(null);
      return;
    }

    // Find the section being hovered over
    const overIndex = sections.findIndex(s => s.id === dropTargetId);
    if (overIndex === -1) {
      setDropIndicator(null);
      return;
    }

    // Get the DOM element and cursor position to determine before/after
    const sectionElement = document.querySelector(`[data-section-id="${dropTargetId}"]`);
    if (!sectionElement) {
      setDropIndicator(null);
      return;
    }

    const rect = sectionElement.getBoundingClientRect();
    const middleY = rect.top + rect.height / 2;
    
    // Use the tracked current mouse position for accurate placement
    const position: 'before' | 'after' = currentMouseY < middleY ? 'before' : 'after';
    
    setDropIndicator({ sectionId: dropTargetId, position });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    const currentDropIndicator = dropIndicator;
    setDropIndicator(null);

    if (!over) return;

    if (active.id.toString().startsWith('library-')) {
      const dropTargetId = String(over.id);
      const sectionType = active.id.toString().replace('library-', '');
      const sectionDef = sectionTypes.find(s => s.type === sectionType);
      
      if (!sectionDef) return;
      
      // Check if this is a single-use section type that already exists
      const SINGLE_USE_SECTION_TYPES = ['program-name', 'banner'];
      if (SINGLE_USE_SECTION_TYPES.includes(sectionType)) {
        const checkSectionExists = (sectionList: Section[]): boolean => {
          for (const s of sectionList) {
            if (s.type === sectionType) return true;
            if (s.children && checkSectionExists(s.children)) return true;
          }
          return false;
        };
        
        if (checkSectionExists(sections)) {
          const typeLabel = sectionType === 'program-name' ? 'Program Name' : 'Banner';
          toast({
            title: "Section limit reached",
            description: `Only one ${typeLabel} section is allowed per template.`,
            variant: "destructive",
          });
          return;
        }
      }
      
      // Check if dropping into a container
      const targetContainer = sections.find(s => s.id === dropTargetId && s.type === 'container');
      
      // Determine insertion index using the tracked drop indicator
      let insertIndex = sections.length; // Default to end
      if (dropTargetId !== 'editor-drop-zone' && !targetContainer) {
        const overIndex = sections.findIndex(s => s.id === dropTargetId);
        if (overIndex !== -1) {
          // Use the drop indicator to determine position
          if (currentDropIndicator && currentDropIndicator.sectionId === dropTargetId) {
            insertIndex = currentDropIndicator.position === 'after' ? overIndex + 1 : overIndex;
          } else {
            insertIndex = overIndex;
          }
        }
      }
      
      const variables: Record<string, string | string[]> = {};
      
      // For labeled-content sections, only initialize essential variables based on default contentType
      if (sectionDef.type === 'labeled-content') {
        const labelVar = sectionDef.variables?.find(v => v.name === 'label');
        const contentTypeVar = sectionDef.variables?.find(v => v.name === 'contentType');
        const defaultContentType = (contentTypeVar?.defaultValue as string) || 'text';
        
        variables['label'] = labelVar?.defaultValue || 'Label';
        variables['contentType'] = defaultContentType;
        variables['listStyle'] = 'circle'; // Default list style
        
        // Only initialize the appropriate content field based on contentType
        if (defaultContentType === 'list') {
          const itemsVar = sectionDef.variables?.find(v => v.name === 'items');
          variables['items'] = itemsVar?.defaultValue || [{ text: 'Item 1', children: [] }];
        } else if (defaultContentType === 'table') {
          const tableVar = sectionDef.variables?.find(v => v.name === 'tableData');
          variables['tableData'] = tableVar?.defaultValue || { headers: ['Column 1'], rows: [['Cell 1']] };
        } else {
          const contentVar = sectionDef.variables?.find(v => v.name === 'content');
          variables['content'] = contentVar?.defaultValue || 'Enter content here...';
        }
      } else {
        // For other section types, copy all default variables
        sectionDef.variables?.forEach(varDef => {
          variables[varDef.name] = varDef.defaultValue;
        });
      }
      
      // Generate a unique ID for the new section first, so we can use it for variable names
      const newSectionId = `section-${Date.now()}-${Math.random()}`;
      
      // For standalone list sections (bullet-list-*, number-list-*), store the unique list variable name
      if (sectionDef.type.includes('list') && sectionDef.type !== 'labeled-content') {
        const listVariableName = generateListVariableName(newSectionId);
        variables['listVariableName'] = listVariableName;
      }
      
      // For labeled-content sections, store unique variable names for label, content, and list
      if (sectionDef.type === 'labeled-content') {
        // Always store labelVariableName for consistency across template updates
        const labelVariableName = `label_${newSectionId.replace(/[^a-zA-Z0-9]/g, '_')}`;
        variables['labelVariableName'] = labelVariableName;
        
        // Store the label value under the variable name and convert label to Thymeleaf format
        // Default label value is "Title"
        const labelValue = variables['label'] as string || 'Title';
        variables[labelVariableName] = labelValue;
        variables['label'] = '<span th:utext="${' + labelVariableName + '}"/>';
        
        const contentType = variables['contentType'] as string;
        if (contentType === 'list') {
          const listVariableName = generateListVariableName(newSectionId);
          variables['listVariableName'] = listVariableName;
          variables['listHtml'] = generateThymeleafListHtml(listVariableName, variables['listStyle'] as string || 'circle');
          
          // Set default list items with proper structure
          variables['items'] = [
            { text: 'Item 1', children: [] },
            { text: 'Item 2', children: [] }
          ] as any;
        } else if (contentType === 'text') {
          // Generate unique variable name for text content
          const textVariableName = `content_${newSectionId.replace(/[^a-zA-Z0-9]/g, '_')}`;
          variables['textVariableName'] = textVariableName;
          
          // Store the content value under the variable name and convert content to Thymeleaf format
          // Default content value is "text content goes here"
          const contentValue = variables['content'] as string || 'text content goes here';
          variables[textVariableName] = contentValue;
          variables['content'] = '<span th:utext="${' + textVariableName + '}"/>';
        }
      }
      
      // For text-based sections (headings, text, paragraph), generate unique variable names
      // This prevents collisions when multiple sections of the same type exist
      let dynamicContent = sectionDef.defaultContent;
      if (isTextBasedSection(sectionDef.type)) {
        const textVariableName = generateTextSectionVariableName(sectionDef.type, newSectionId);
        variables['textVariableName'] = textVariableName;
        
        // Get the first variable from section def (e.g., heading1Text, textContent, paragraphContent)
        const defaultVar = sectionDef.variables?.[0];
        if (defaultVar) {
          // Store the default value under the dynamic variable name
          variables[textVariableName] = defaultVar.defaultValue;
          
          // Update the content to use the dynamic variable name
          // Replace the static variable name with the dynamic one in the Thymeleaf expression
          const staticVarPattern = new RegExp(`\\$\\{${defaultVar.name}\\}`, 'g');
          dynamicContent = sectionDef.defaultContent.replace(staticVarPattern, `\${${textVariableName}}`);
        }
      }

      // Get default styles for heading sections - include Outlook font family for all sections
      const isHeadingSection = sectionDef.type.startsWith('heading');
      const defaultStyles = isHeadingSection && headingDefaultStyles[sectionDef.type] 
        ? headingDefaultStyles[sectionDef.type]
        : { fontSize: '14px', color: '#333333', fontFamily: OUTLOOK_FONT_FAMILY };

      const newSection: Section = {
        id: newSectionId,
        type: sectionDef.type,
        content: dynamicContent,
        variables,
        styles: defaultStyles,
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
        // Insert at the calculated position
        const newSections = [...sections];
        newSections.splice(insertIndex, 0, newSection);
        setSections(newSections);
        toast({
          title: "Section added",
          description: `${sectionDef.label} has been added to your template.`,
        });
      }
      
      // Select the new section and scroll to it after a brief delay
      setSelectedSection(newSection);
      setTimeout(() => {
        scrollToSection(newSectionId);
      }, 100);
      
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

  // Scroll to a section in both editor and preview with highlight animation
  const scrollToSection = useCallback((sectionId: string) => {
    // Scroll in editor and add highlight animation
    const editorElement = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (editorElement) {
      editorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add highlight animation class (using global class name)
      editorElement.classList.add('section-highlighted');
      setTimeout(() => {
        editorElement.classList.remove('section-highlighted');
      }, 2000);
    }
  }, []);

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
      // Show the validation panel if hidden
      setShowValidationPanel(true);
      
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
      
      // Convert subject placeholders to Thymeleaf format for storage
      const subjectForStorage = templateSubject 
        ? subjectPlaceholderToThymeleaf(templateSubject) 
        : undefined;
      
      // Prepare all sections for API using flattenSectionsForApi helper
      const allSections = [headerSection, ...sections, footerSection];
      const apiSections = flattenSectionsForApi(allSections);
      
      // Extract all template variables for the centralized registry
      // Use the converted subject with Thymeleaf tags for proper extraction
      const templateVariables = extractAllTemplateVariables(
        subjectForStorage || '',
        headerSection,
        sections,
        footerSection
      );
      const variableRequests = templateVariables.map(variableToRequest);
      
      console.log('Extracted template variables:', templateVariables);
      console.log('Subject with Thymeleaf:', subjectForStorage);
      
      // Build global API config for storage
      const globalApiConfigRequest = globalApiConfig.integrations.length > 0 ? globalApiConfig : undefined;

      if (isEditMode && editingTemplateId) {
        // UPDATE: Call backend API to update existing template
        const updateRequest: TemplateUpdateRequest = {
          name: templateName,
          subject: subjectForStorage,
          html,
          sectionCount: allSections.length,
          archived: false,
          sections: apiSections,
          variables: variableRequests,
        };

        const response = await templateApi.updateTemplate(editingTemplateId, updateRequest);
        console.log('Template updated via API:', response);
        
        updateTemplate(editingTemplateId, {
          name: templateName,
          subject: subjectForStorage,
          html,
          sectionCount: allSections.length,
          archived: false,
          globalApiConfig: globalApiConfigRequest,
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
          subject: subjectForStorage,
          html,
          sectionCount: allSections.length,
          archived: false,
          sections: apiSections,
          variables: variableRequests,
        };

        const response = await templateApi.createTemplate(createRequest);
        console.log('Template created via API:', response);
        
        saveTemplate({
          name: templateName,
          subject: subjectForStorage,
          html,
          createdAt: new Date().toISOString(),
          sectionCount: allSections.length,
          archived: false,
          globalApiConfig: globalApiConfigRequest,
          sections: allSections,
        });

        toast({
          title: "Template saved",
          description: `"${templateName}" has been saved successfully.`,
        });
      }

      setTimeout(() => navigate('/templates'), 500);
    } catch (error: any) {
      console.error('Error saving template:', error);
      
      const allSections = [headerSection, ...sections, footerSection];
      const html = generateHTMLWithPlaceholders();
      const subjectForStorage = templateSubject 
        ? subjectPlaceholderToThymeleaf(templateSubject) 
        : undefined;
      
      if (isEditMode && editingTemplateId) {
        updateTemplate(editingTemplateId, {
          name: templateName,
          subject: subjectForStorage,
          html,
          sectionCount: allSections.length,
          archived: false,
          globalApiConfig: globalApiConfig.integrations.length > 0 ? globalApiConfig : undefined,
          sections: allSections,
        });
      } else {
        saveTemplate({
          name: templateName,
          subject: subjectForStorage,
          html,
          createdAt: new Date().toISOString(),
          sectionCount: allSections.length,
          archived: false,
          globalApiConfig: globalApiConfig.integrations.length > 0 ? globalApiConfig : undefined,
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
    
    // Helper to wrap section content in a row with nested table (for Outlook compatibility - each section in its own <tr>)
    const wrapInSectionRow = (content: string, isFirst: boolean): string => {
      const paddingTop = isFirst ? '0' : '10px';
      return `<tr>
  <td style="padding-top: ${paddingTop};">
    <!--[if mso]>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
      <tr>
        <td style="padding:0;font-family:'Wells Fargo Sans',Arial,Helvetica,sans-serif;">
    ${content}
        </td>
      </tr>
    </table>
    <![endif]-->
    <!--[if !mso]><!-->
    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 100%; border: none; word-wrap: break-word; table-layout: fixed; font-family: 'Wells Fargo Sans', Arial, Helvetica, sans-serif; mso-line-height-rule: exactly;">
      <tr>
        <td style="padding: 0; word-wrap: break-word; overflow-wrap: break-word; font-family: 'Wells Fargo Sans', Arial, Helvetica, sans-serif;">
    ${content}
        </td>
      </tr>
    </table>
    <!--<![endif]-->
  </td>
</tr>`;
    };
    
    const generateSectionHTML = (section: Section, indent = ''): string => {
      const styleString = Object.entries(section.styles || {})
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');
      
      // Handle heading/text sections with inline placeholders
      const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
      if (inlinePlaceholderTypes.includes(section.type) && section.content) {
        const contentWithThymeleaf = section.content.replace(/\{\{(\w+)\}\}/g, '<span th:utext="${$1}"/>');
        
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
      
      // Handle labeled-content sections
      if (section.type === 'labeled-content') {
        return generateLabeledContentHTML(section, indent, styleString);
      }
      
      // Handle table sections
      if (section.type === 'table') {
        return generateTableHTML(section, indent, styleString);
      }
      
      // Handle list sections (bullet-list-*, number-list-*)
      if (section.type.includes('list')) {
        return generateListSectionHTML(section, indent, styleString);
      }
      
      // Handle mixed-content sections - convert {{placeholders}} to Thymeleaf
      if (section.type === 'mixed-content') {
        const content = String(section.variables?.content || section.content || '');
        // Convert {{placeholder}} to Thymeleaf format and preserve line breaks
        const contentWithThymeleaf = content
          .replace(/\{\{(\w+)\}\}/g, '<span th:utext="${$1}"/>')
          .replace(/\n/g, '<br/>');
        return `${indent}<div style="${styleString}; padding: 8px; line-height: 1.6;">${contentWithThymeleaf}</div>`;
      }
      
      // Handle container sections with children
      if (section.type === 'container' && section.children && section.children.length > 0) {
        const childrenHTML = section.children.map(child => generateSectionHTML(child, indent + '  ')).join('\n');
        return `${indent}<div style="margin: 15px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;">\n${childrenHTML}\n${indent}</div>`;
      }
      
      // Keep Thymeleaf tags in content - don't render variables
      return `${indent}<div style="${styleString}">\n${indent}  ${section.content}\n${indent}</div>`;
    };
    
    // Generate HTML for labeled-content sections
    const generateLabeledContentHTML = (section: Section, indent: string, styleString: string): string => {
      const variables = section.variables || {};
      const label = String(variables['label'] || 'Label');
      const contentType = String(variables['contentType'] || 'text');
      
      // Check if label contains {{placeholder}} syntax - only use Thymeleaf for dynamic labels
      const hasPlaceholder = /\{\{(\w+)\}\}/.test(label);
      let labelHtml = '';
      
      if (hasPlaceholder) {
        // Convert {{placeholder}} to Thymeleaf
        const labelWithThymeleaf = label.replace(/\{\{(\w+)\}\}/g, '<span th:utext="${$1}"/>');
        labelHtml = `<strong>${labelWithThymeleaf}</strong>`;
      } else {
        // Static label - no Thymeleaf needed, just use the label text directly
        labelHtml = `<strong>${label}</strong>`;
      }
      
      let contentHtml = '';
      
      if (contentType === 'text') {
        const content = String(variables['content'] || '');
        const contentWithThymeleaf = content.replace(/\{\{(\w+)\}\}/g, '<span th:utext="${$1}"/>');
        contentHtml = `<p>${contentWithThymeleaf}</p>`;
      } else if (contentType === 'list') {
        // Use stored listVariableName if available, otherwise generate from section ID
        const listVariableName = String(variables['listVariableName'] || generateListVariableName(section.id));
        const listStyle = String(variables['listStyle'] || 'circle');
        contentHtml = generateThymeleafListHtml(listVariableName, listStyle);
      } else if (contentType === 'table') {
        const tableData = variables['tableData'];
        contentHtml = generateThymeleafTableHTML(tableData);
      }
      
      return `${indent}<div style="${styleString}">
${indent}  ${labelHtml}
${indent}  <div>${contentHtml}</div>
${indent}</div>`;
    };
    
    // Generate HTML for table sections
    const generateTableHTML = (section: Section, indent: string, styleString: string): string => {
      const tableData = section.variables?.['tableData'];
      const tableHtml = generateThymeleafTableHTML(tableData);
      return `${indent}<div style="${styleString}">\n${indent}  ${tableHtml}\n${indent}</div>`;
    };
    
    // Generate Thymeleaf-compatible table HTML
    const generateThymeleafTableHTML = (tableData: any): string => {
      if (!tableData) return '<table><tr><td>No data</td></tr></table>';
      
      const { rows, headers, showBorder = true } = tableData;
      const borderStyle = showBorder ? 'border: 1px solid #dee2e6;' : '';
      
      let html = `<table style="width: 100%; border-collapse: collapse; ${borderStyle}">`;
      
      if (headers && headers.length > 0) {
        html += '<thead><tr>';
        headers.forEach((header: string) => {
          html += `<th style="padding: 8px; ${borderStyle} background: #f8f9fa; text-align: left;">${header}</th>`;
        });
        html += '</tr></thead>';
      }
      
      if (rows && rows.length > 0) {
        html += '<tbody>';
        const dataRows = headers ? rows : rows.slice(1);
        
        if (!headers && rows.length > 0) {
          html += '<tr>';
          rows[0].forEach((cell: string) => {
            html += `<th style="padding: 8px; ${borderStyle} background: #f8f9fa; text-align: left;">${cell}</th>`;
          });
          html += '</tr>';
        }
        
        dataRows.forEach((row: string[]) => {
          html += '<tr>';
          row.forEach((cell: string) => {
            html += `<td style="padding: 8px; ${borderStyle}">${cell}</td>`;
          });
          html += '</tr>';
        });
        html += '</tbody>';
      }
      
      html += '</table>';
      return html;
    };
    
    // Generate HTML for standalone list sections
    const generateListSectionHTML = (section: Section, indent: string, styleString: string): string => {
      const sectionType = section.type;
      const items = section.variables?.['items'] as any[];
      
      let listTag: 'ul' | 'ol' = 'ul';
      let listStyleType = 'disc';
      
      if (sectionType.includes('number') || sectionType.includes('ordered')) {
        listTag = 'ol';
        if (sectionType.includes('-1') || sectionType.includes('decimal')) {
          listStyleType = 'decimal';
        } else if (sectionType.includes('-i')) {
          listStyleType = 'lower-roman';
        } else if (sectionType.includes('-a')) {
          listStyleType = 'lower-alpha';
        }
      } else {
        if (sectionType.includes('disc')) {
          listStyleType = 'disc';
        } else if (sectionType.includes('square')) {
          listStyleType = 'square';
        } else if (sectionType.includes('circle')) {
          listStyleType = 'circle';
        }
      }
      
      // Use stored listVariableName if available, otherwise fallback (for backward compatibility)
      const variableName = String(section.variables?.['listVariableName'] || generateListVariableName(section.id));
      const listHtml = `<${listTag} style="list-style-type: ${listStyleType};">` +
        `<li th:each="item : \${${variableName}}"><span th:utext="\${item}"/></li>` +
        `</${listTag}>`;
      
      return `${indent}<div style="${styleString}">\n${indent}  ${listHtml}\n${indent}</div>`;
    };
    
    // Wrap all sections in a global table, with each section in its own <tr> row
    const sectionRows = allSections.map((section, index) => {
      const sectionContent = generateSectionHTML(section);
      return wrapInSectionRow(sectionContent, index === 0);
    }).join('\n');
    
    // Return global wrapper table with each section in its own row
    return `<!--[if mso]>
<table cellpadding="0" cellspacing="0" border="0" width="800" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
${sectionRows}
</table>
<![endif]-->
<!--[if !mso]><!-->
<table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 800px; margin: 0 auto; border: none;">
${sectionRows}
</table>
<!--<![endif]-->`;
  };

  const generateHTML = () => {
    const allSections = [headerSection, ...sections, footerSection];
    // Wrap all sections in a global table, with each section in its own <tr> row
    const sectionRows = allSections.map((section, index) => {
      const content = renderSectionContent(section);
      return wrapSectionInTable(content, index === 0);
    }).join('\n');
    
    // Return global wrapper table with each section in its own row
    return `<!--[if mso]>
<table cellpadding="0" cellspacing="0" border="0" width="800" align="center" style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
${sectionRows}
</table>
<![endif]-->
<!--[if !mso]><!-->
<table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 800px; margin: 0 auto; border: none;">
${sectionRows}
</table>
<!--<![endif]-->`;
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

  // Old section-level API test removed - now handled by GlobalApiPanel

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
                  <SectionLibrary existingSections={sections} />
                </SheetContent>
              </Sheet>
              
              {/* Global API Panel Sheet */}
              <Sheet open={showApiPanel} onOpenChange={setShowApiPanel}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Database className="h-4 w-4 mr-2" />
                    API ({globalApiConfig.integrations.length})
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" onInteractOutside={(e) => e.preventDefault()} className="w-[400px] p-0 overflow-hidden [&>button]:hidden">
                  <GlobalApiPanel 
                    config={globalApiConfig}
                    onUpdate={setGlobalApiConfig}
                    onCreateSection={(newSection) => {
                      setSections(prev => [...prev, newSection]);
                      setSelectedSection(newSection);
                    }}
                    onClose={() => setShowApiPanel(false)}
                  />
                </SheetContent>
              </Sheet>
              
              {/* Variables Panel Sheet */}
              <Sheet open={showVariablesPanel} onOpenChange={setShowVariablesPanel}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Variable className="h-4 w-4 mr-2" />
                    Variables ({extractedVariables.length})
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" onInteractOutside={(e) => e.preventDefault()} className="w-96 p-0 overflow-hidden">
                  <SheetHeader className="p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <SheetTitle>Template Variables</SheetTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          All placeholders extracted from your template
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowVariablesPanel(false)}
                        className="h-8 w-8 hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </SheetHeader>
                  <div className="h-[calc(100vh-80px)]">
                    <VariablesPanel 
                      variables={extractedVariables}
                      readOnly={false}
                    />
                  </div>
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

          {/* Validation Errors Panel */}
          {validationErrors.length > 0 && showValidationPanel && (
            <ValidationErrorsPanel
              errors={validationErrors}
              onScrollToSection={handleScrollToSection}
              onClose={() => setShowValidationPanel(false)}
            />
          )}

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
                    sectionIdsWithErrors={sectionIdsWithErrors}
                    onSelectSection={setSelectedSection}
                    onUpdateSection={handleUpdateSection}
                    onDeleteSection={handleDeleteSection}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onAddChildToContainer={handleAddChildToContainer}
                    onDuplicateSection={handleDuplicateSection}
                    onCopyStyles={handleCopyStyles}
                    onPasteStyles={handlePasteStyles}
                    globalApiConfig={globalApiConfig}
                    hoveredSectionId={hoveredSectionId}
                    onHoverSection={setHoveredSectionId}
                    dropIndicator={dropIndicator}
                  />
                </SortableContext>
              </ResizablePanel>
              
              <ResizableHandle withHandle className={styles.resizeHandle} />
              
              <ResizablePanel defaultSize={50} minSize={20} className={styles.previewSection}>
                <PreviewView 
                  headerSection={headerSection}
                  footerSection={footerSection}
                  sections={sections}
                  selectedSectionId={selectedSection?.id}
                  hoveredSectionId={hoveredSectionId}
                  onHoverSection={setHoveredSectionId}
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
                      sectionIdsWithErrors={sectionIdsWithErrors}
                      onSelectSection={setSelectedSection}
                      onUpdateSection={handleUpdateSection}
                      onDeleteSection={handleDeleteSection}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onAddChildToContainer={handleAddChildToContainer}
                      onDuplicateSection={handleDuplicateSection}
                      onCopyStyles={handleCopyStyles}
                      onPasteStyles={handlePasteStyles}
                      globalApiConfig={globalApiConfig}
                      hoveredSectionId={hoveredSectionId}
                      onHoverSection={setHoveredSectionId}
                      dropIndicator={dropIndicator}
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
                    selectedSectionId={selectedSection?.id}
                    hoveredSectionId={hoveredSectionId}
                    onHoverSection={setHoveredSectionId}
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
