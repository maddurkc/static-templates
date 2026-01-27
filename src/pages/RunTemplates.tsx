import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as React from "react";
import styles from "./RunTemplates.module.scss";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, Calendar, PlayCircle, Plus, Trash2, Eye, Loader2, FileJson, Pencil, Check } from "lucide-react";
import { RichTextEditor } from "@/components/templates/RichTextEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getTemplates, Template } from "@/lib/templateStorage";
import { fetchTemplates, fetchTemplateById } from "@/lib/templateApi";
import { Section, ListItemStyle, TextStyle } from "@/types/section";
import { renderSectionContent, wrapInEmailHtml, wrapSectionInTable } from "@/lib/templateUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { subjectThymeleafToPlaceholder, processSubjectWithValues } from "@/lib/thymeleafUtils";
import { mapJsonToTableData, getValueByPath } from "@/lib/tableUtils";

const RunTemplates = () => {
  const navigate = useNavigate();
  const { id: templateId } = useParams<{ id: string }>();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string | TextStyle>>({});
  const [listVariables, setListVariables] = useState<Record<string, string[] | ListItemStyle[]>>({});
  const [tableVariables, setTableVariables] = useState<Record<string, any>>({});
  const [labelVariables, setLabelVariables] = useState<Record<string, string>>({});
  const [toEmails, setToEmails] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [bccEmails, setBccEmails] = useState("");
  const [viewMode, setViewMode] = useState<'template' | 'execution'>('template'); // New: toggle between template view and execution view
  const [executedOn, setExecutedOn] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [subjectVariables, setSubjectVariables] = useState<Record<string, string>>({}); // Variables extracted from template subject
  const [emailTitle, setEmailTitle] = useState<string>("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [jsonImportOpen, setJsonImportOpen] = useState<string | null>(null); // Tracks which table is being imported to
  const [jsonImportValue, setJsonImportValue] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editedSectionContent, setEditedSectionContent] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Scroll to section in preview when editing
  const scrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const element = document.getElementById(`preview-section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-section');
      setTimeout(() => element.classList.remove('highlight-section'), 2000);
    }
  };

  // Load template by ID from API if templateId is present in URL
  useEffect(() => {
    const loadTemplateById = async () => {
      if (!templateId) return;
      
      setIsLoadingTemplate(true);
      try {
        const template = await fetchTemplateById(templateId);
        if (template) {
          handleRunTemplate(template);
        } else {
          toast({
            title: "Template not found",
            description: "The requested template could not be found.",
            variant: "destructive",
          });
          navigate('/run-templates');
        }
      } catch (error) {
        console.error('Failed to load template:', error);
        toast({
          title: "Error loading template",
          description: "Failed to load template from server.",
          variant: "destructive",
        });
        navigate('/run-templates');
      } finally {
        setIsLoadingTemplate(false);
      }
    };
    
    loadTemplateById();
  }, [templateId]);

  // Load templates list from API (with localStorage fallback) - only when no templateId
  useEffect(() => {
    if (templateId) return; // Skip loading list if we have a specific template ID
    
    // Reset selected template when navigating to list view
    setSelectedTemplate(null);
    resetForm();
    
    const loadTemplates = async () => {
      setIsLoading(true);
      try {
        const loadedTemplates = await fetchTemplates();
        setTemplates(loadedTemplates.filter(t => !t.archived));
      } catch (error) {
        console.error('Failed to load templates:', error);
        toast({
          title: "Error loading templates",
          description: "Using cached templates from local storage.",
          variant: "destructive",
        });
        setTemplates(getTemplates().filter(t => !t.archived));
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplates();
  }, [templateId]);

  // Initialize variables when template is selected
  React.useEffect(() => {
    if (selectedTemplate) {
      const vars = extractAllVariables(selectedTemplate);
      const initialVars: Record<string, string | TextStyle> = {};
      const initialListVars: Record<string, string[] | ListItemStyle[]> = {};
      const initialTableVars: Record<string, any> = {};
      const initialLabelVars: Record<string, string> = {};
      
      vars.forEach(v => {
        const defaultVal = getDefaultValue(v);
        if (isTableVariable(v)) {
          // Use getTableData for proper format conversion
          initialTableVars[v] = getTableData(v);
        } else if (Array.isArray(defaultVal)) {
          initialListVars[v] = defaultVal.length > 0 ? defaultVal : [''];
        } else {
          initialVars[v] = String(defaultVal);
        }
      });
      
      // Initialize label variables and list variables directly from sections
      if (selectedTemplate.sections) {
        selectedTemplate.sections.forEach(section => {
          if (section.type === 'labeled-content') {
            // Use stored labelVariableName, fallback to section.id for backward compatibility
            const labelVarName = (section.variables?.labelVariableName as string) || `label_${section.id}`;
            const rawLabel = (section.variables?.label as string) || 'Label';
            // Extract clean label text (without Thymeleaf tags)
            const cleanLabel = rawLabel
              .replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (_, varName) => `{{${varName}}}`)
              .replace(/<th:utext="\$\{(\w+)\}">/g, (_, varName) => `{{${varName}}}`);
            initialLabelVars[labelVarName] = cleanLabel;
            
            // Initialize list variables for labeled-content with list contentType
            if (section.variables?.contentType === 'list') {
              const listVarName = (section.variables.listVariableName as string) || section.id;
              const rawItems = section.variables.items as (string | ListItemStyle)[];
              if (rawItems && rawItems.length > 0) {
                // Handle both string[] and ListItemStyle[] formats
                initialListVars[listVarName] = rawItems as (string[] | ListItemStyle[]);
              } else if (!initialListVars[listVarName]) {
                initialListVars[listVarName] = [''];
              }
            }
          }
          
          // Initialize standalone list sections directly
          if (LIST_SECTION_TYPES.includes(section.type)) {
            const listVarName = (section.variables?.listVariableName as string) || section.id;
            const rawItems = section.variables?.items as (string | ListItemStyle)[];
            if (rawItems && rawItems.length > 0) {
              initialListVars[listVarName] = rawItems as (string[] | ListItemStyle[]);
            } else if (!initialListVars[listVarName]) {
              initialListVars[listVarName] = [''];
            }
          }
        });
      }
      
      setVariables(initialVars);
      setListVariables(initialListVars);
      setTableVariables(initialTableVars);
      setLabelVariables(initialLabelVars);
    }
  }, [selectedTemplate]);

  const extractVariables = (html: string): string[] => {
    const vars: string[] = [];
    
    // Match <th:utext="${varName}"> format
    const regex1 = /<th:utext="\$\{(\w+)\}">/g;
    for (const match of html.matchAll(regex1)) {
      if (!vars.includes(match[1])) vars.push(match[1]);
    }
    
    // Match <span th:utext="${varName}"/> format
    const regex2 = /<span\s+th:utext="\$\{(\w+)\}"\/>/g;
    for (const match of html.matchAll(regex2)) {
      if (!vars.includes(match[1])) vars.push(match[1]);
    }
    
    // Match ${varName} inside th:utext or th:text attributes
    const regex3 = /th:(?:u)?text="\$\{(\w+)\}"/g;
    for (const match of html.matchAll(regex3)) {
      if (!vars.includes(match[1])) vars.push(match[1]);
    }
    
    return vars;
  };

  // Check if a variable is a labeled-content section by its section ID
  const isLabeledContentSection = (varName: string): Section | undefined => {
    if (!selectedTemplate?.sections) return undefined;
    return selectedTemplate.sections.find(section => 
      section.type === 'labeled-content' && section.id === varName
    );
  };

  // List section types that can be dragged into templates
  const LIST_SECTION_TYPES = [
    'bullet-list-circle', 'bullet-list-disc', 'bullet-list-square',
    'number-list-1', 'number-list-i', 'number-list-a'
  ];

  // Check if a variable is a list type based on sections
  const isListVariable = (varName: string): boolean => {
    if (!selectedTemplate?.sections) return false;
    
    for (const section of selectedTemplate.sections) {
      // For labeled-content sections, check contentType using listVariableName or section ID
      if (section.type === 'labeled-content') {
        const listVarName = section.variables?.listVariableName as string;
        if ((listVarName && listVarName === varName) || section.id === varName) {
          return section.variables?.contentType === 'list';
        }
      }
      
      // For standalone list sections (bullet-list-*, number-list-*)
      if (LIST_SECTION_TYPES.includes(section.type)) {
        const listVarName = section.variables?.listVariableName as string;
        if ((listVarName && listVarName === varName) || section.id === varName) {
          return true;
        }
      }
      
      if (section.variables && section.variables[varName]) {
        return Array.isArray(section.variables[varName]);
      }
    }
    return false;
  };
  
  // Get list style for a section
  const getListStyle = (varName: string): string => {
    if (!selectedTemplate?.sections) return 'disc';
    
    for (const section of selectedTemplate.sections) {
      if (section.type === 'labeled-content' && section.id === varName) {
        return (section.variables?.listStyle as string) || 'disc';
      }
      
      if (LIST_SECTION_TYPES.includes(section.type)) {
        const listVarName = section.variables?.listVariableName as string;
        if ((listVarName && listVarName === varName) || section.id === varName) {
          // Extract style from section type
          if (section.type.includes('circle')) return 'circle';
          if (section.type.includes('disc')) return 'disc';
          if (section.type.includes('square')) return 'square';
          if (section.type === 'number-list-1') return 'decimal';
          if (section.type === 'number-list-i') return 'lower-roman';
          if (section.type === 'number-list-a') return 'lower-alpha';
          return 'disc';
        }
      }
    }
    return 'disc';
  };

  // Check if a variable is a table type
  const isTableVariable = (varName: string): boolean => {
    if (!selectedTemplate?.sections) return false;
    
    return selectedTemplate.sections.some(section => {
      // Check labeled-content sections with table contentType
      if (section.type === 'labeled-content' && section.id === varName) {
        return section.variables?.contentType === 'table';
      }
      // Check direct table sections
      if (section.type === 'table' && section.id === varName) {
        return true;
      }
      return false;
    });
  };

  // Get table data for a variable - handles both old (headers/rows) and new (rows with first row as header) formats
  const getTableData = (varName: string): { headers: string[]; rows: string[][] } => {
    if (!selectedTemplate?.sections) return { headers: ['Column 1'], rows: [['Data 1']] };
    
    for (const section of selectedTemplate.sections) {
      // Handle labeled-content with table
      if (section.type === 'labeled-content' && section.id === varName && section.variables?.contentType === 'table') {
        const tableData = section.variables.tableData;
        if (tableData) {
          // New format: rows array where first row is headers
          if (tableData.rows && Array.isArray(tableData.rows) && tableData.rows.length > 0) {
            // Check if it's new format (no separate headers property or rows[0] is headers)
            if (!tableData.headers) {
              const headers = tableData.rows[0] || ['Column 1'];
              const dataRows = tableData.rows.slice(1) || [];
              return { headers, rows: dataRows };
            }
          }
          // Old format: separate headers and rows
          return {
            headers: tableData.headers || ['Column 1'],
            rows: tableData.rows || [['Data 1']]
          };
        }
      }
      
      // Handle direct table sections
      if (section.type === 'table' && section.id === varName) {
        const tableData = section.variables?.tableData;
        if (tableData) {
          // New format: rows array where first row is headers
          if (tableData.rows && Array.isArray(tableData.rows) && tableData.rows.length > 0) {
            if (!tableData.headers) {
              const headers = tableData.rows[0] || ['Column 1'];
              const dataRows = tableData.rows.slice(1) || [];
              return { headers, rows: dataRows };
            }
          }
          // Old format
          return {
            headers: tableData.headers || (tableData.rows?.[0] || ['Column 1']),
            rows: tableData.headers ? (tableData.rows || []) : (tableData.rows?.slice(1) || [])
          };
        }
      }
    }
    return { headers: ['Column 1'], rows: [['Data 1']] };
  };

  // Check if a label is editable at runtime
  const isLabelEditable = (varName: string): boolean => {
    if (!selectedTemplate?.sections) return true;
    
    // Handle label variables - find section by stored labelVariableName or legacy pattern
    if (varName.startsWith('label_')) {
      const section = selectedTemplate.sections.find(section => 
        section.type === 'labeled-content' && 
        ((section.variables?.labelVariableName as string) === varName || `label_${section.id}` === varName)
      );
      return section?.isLabelEditable !== false;
    }
    
    const section = selectedTemplate.sections.find(section => 
      section.type === 'labeled-content' && section.id === varName
    );
    return section?.isLabelEditable !== false;
  };
  
  // Check if variable is a label variable
  const isLabelVariable = (varName: string): boolean => {
    return varName.startsWith('label_');
  };
  
  // Get section for a label variable
  const getLabelSection = (labelVarName: string): Section | undefined => {
    if (!selectedTemplate?.sections || !labelVarName.startsWith('label_')) return undefined;
    // Find section by matching stored labelVariableName or legacy pattern
    return selectedTemplate.sections.find(section => 
      section.type === 'labeled-content' && 
      ((section.variables?.labelVariableName as string) === labelVarName || `label_${section.id}` === labelVarName)
    );
  };

  // Get default value for a variable from sections
  const getDefaultValue = (varName: string): string | string[] | any => {
    if (!selectedTemplate?.sections) return '';
    
    for (const section of selectedTemplate.sections) {
      // For labeled-content sections, check both listVariableName and section ID
      if (section.type === 'labeled-content') {
        const listVarName = section.variables?.listVariableName as string;
        const isListMatch = listVarName && listVarName === varName;
        const isSectionIdMatch = section.id === varName;
        
        if (isListMatch || isSectionIdMatch) {
          if (section.variables?.contentType === 'list') {
            return (section.variables.items as string[]) || [''];
          } else if (section.variables?.contentType === 'table') {
            const tableData = section.variables.tableData;
            if (tableData && tableData.headers) {
              return {
                headers: tableData.headers || [],
                rows: tableData.rows || []
              };
            }
            return { headers: [], rows: [] };
          }
          return (section.variables?.content as string) || '';
        }
      }
      
      // For standalone list sections (bullet-list-*, number-list-*)
      if (LIST_SECTION_TYPES.includes(section.type)) {
        const listVarName = section.variables?.listVariableName as string;
        const matchesVarName = listVarName && listVarName === varName;
        const matchesSectionId = section.id === varName;
        const matchesEither = matchesVarName || matchesSectionId;
        
        if (matchesEither) {
          const items = section.variables?.items as string[];
          // Return actual items if they exist and have content, otherwise default to empty array with placeholder
          if (items && items.length > 0) {
            return items;
          }
          return [''];
        }
      }
      
      // For direct table sections
      if (section.type === 'table' && section.id === varName) {
        const tableData = section.variables?.tableData;
        if (tableData) {
          // Handle new TableData format (rows where first row is headers)
          if (tableData.rows && Array.isArray(tableData.rows) && !tableData.headers) {
            const headers = tableData.rows[0] || ['Column 1'];
            const dataRows = tableData.rows.slice(1) || [];
            return { headers, rows: dataRows };
          }
          // Handle legacy format
          return {
            headers: tableData.headers || (tableData.rows?.[0] || ['Column 1']),
            rows: tableData.headers ? (tableData.rows || []) : (tableData.rows?.slice(1) || [])
          };
        }
        return { headers: ['Column 1'], rows: [['Data 1']] };
      }
      
      // For heading/text sections with inline placeholders
      const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
      if (inlinePlaceholderTypes.includes(section.type) && section.variables && section.variables[varName] !== undefined) {
        return String(section.variables[varName]);
      }
      
      if (section.variables && section.variables[varName] !== undefined) {
        const value = section.variables[varName];
        return Array.isArray(value) ? value : String(value);
      }
    }
    return '';
  };

  // Get the display label for a labeled-content section (convert Thymeleaf to {{placeholder}})
  const getLabeledContentDisplayLabel = (section: Section): string => {
    const label = (section.variables?.label as string) || 'Untitled';
    return label
      .replace(/<span\s+th:utext="\$\{(\w+)\}"(?:\s*\/>|>)/g, '{{$1}}')
      .replace(/<th:utext="\$\{(\w+)\}">/g, '{{$1}}');
  };

  // Get context information for a variable - shows where it's used
  const getVariableContext = (varName: string): { sectionType: string; label?: string; context?: string } | null => {
    if (!selectedTemplate?.sections) return null;
    
    // Handle label variables
    if (varName.startsWith('label_')) {
      const section = getLabelSection(varName);
      if (section) {
        return {
          sectionType: 'Section Label',
          label: varName,
          context: `Label for: ${section.variables?.contentType || 'content'} section`
        };
      }
    }
    
    for (const section of selectedTemplate.sections) {
      // Check if this is a labeled-content section by listVariableName or ID
      if (section.type === 'labeled-content') {
        const listVarName = section.variables?.listVariableName as string;
        const isMatch = (listVarName && listVarName === varName) || section.id === varName;
        
        if (isMatch) {
          const displayLabel = getLabeledContentDisplayLabel(section);
          const contentType = section.variables?.contentType || 'text';
          let sectionTypeLabel = 'Labeled Content';
          if (contentType === 'list') sectionTypeLabel = 'List Content';
          else if (contentType === 'table') sectionTypeLabel = 'Table Content';
          
          return {
            sectionType: sectionTypeLabel,
            label: displayLabel,
            context: `Content for: ${displayLabel}`
          };
        }
      }
      
      // Check if variable appears in label of labeled-content
      if (section.type === 'labeled-content' && section.variables?.label) {
        const labelText = section.variables.label as string;
        if (labelText.includes(`\${${varName}}`)) {
          const displayLabel = getLabeledContentDisplayLabel(section);
          return {
            sectionType: 'Dynamic Label',
            label: displayLabel,
            context: `Used in label: ${displayLabel}`
          };
        }
      }
      
      // Check mixed-content sections
      if (section.type === 'mixed-content' && section.variables?.content) {
        const content = section.variables.content as string;
        // Check both {{placeholder}} format and Thymeleaf format
        if (content.includes(`{{${varName}}}`) || content.includes(`\${${varName}}`)) {
          // Extract surrounding text for context - try {{placeholder}} format first
          const placeholderRegex = new RegExp(`([^{]{0,30})\\{\\{${varName}\\}\\}([^}]{0,30})`, 'g');
          const placeholderMatch = placeholderRegex.exec(content);
          if (placeholderMatch) {
            const before = placeholderMatch[1].replace(/\{\{[^}]+\}\}/g, '').trim().slice(-20);
            const after = placeholderMatch[2].replace(/\{\{[^}]+\}\}/g, '').trim().slice(0, 20);
            const contextPart = before || after;
            return {
              sectionType: 'Mixed Content',
              context: contextPart ? `Near: "${contextPart}"` : 'Used in mixed content'
            };
          }
          // Fallback to Thymeleaf format check
          return {
            sectionType: 'Mixed Content',
            context: 'Used in mixed content section'
          };
        }
      }
      
      // Check heading/text sections with inline placeholders
      const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
      if (inlinePlaceholderTypes.includes(section.type) && section.content) {
        if (section.content.includes(`{{${varName}}}`)) {
          const typeLabel = section.type.replace(/(\d)/, ' $1').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          // Extract surrounding text for context
          const regex = new RegExp(`([^{]*)\\{\\{${varName}\\}\\}([^{]*)`, 'g');
          const match = regex.exec(section.content);
          if (match) {
            const before = match[1].trim().slice(-30); // Last 30 chars before
            const after = match[2].trim().slice(0, 30); // First 30 chars after
            const contextText = before + ' {{' + varName + '}} ' + after;
            return {
              sectionType: typeLabel,
              context: `In ${typeLabel.toLowerCase()}: "${contextText}"`
            };
          }
          return {
            sectionType: typeLabel,
            context: `Used in ${typeLabel.toLowerCase()}`
          };
        }
      }
      
      // Check standalone list sections (bullet-list-*, number-list-*)
      if (LIST_SECTION_TYPES.includes(section.type)) {
        const listVarName = section.variables?.listVariableName as string;
        if ((listVarName && listVarName === varName) || section.id === varName) {
          const styleType = section.type.includes('bullet') ? 'Bullet List' : 'Numbered List';
          return {
            sectionType: styleType,
            context: `Editable list items`
          };
        }
      }
      
      // Check direct table sections
      if (section.type === 'table' && section.id === varName) {
        return {
          sectionType: 'Table',
          context: 'Editable table content'
        };
      }
      
      // Check regular sections
      if (section.variables && section.variables[varName] !== undefined) {
        const typeLabel = section.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return {
          sectionType: typeLabel,
          context: `Used in ${typeLabel.toLowerCase()}`
        };
      }
    }
    
    return null;
  };

  // Extract variables from both HTML and sections
  // Metadata keys that should NOT be treated as user-editable variables
  const METADATA_KEYS = [
    'label', 'content', 'contentType', 'listStyle', 'items', 'tableData',
    'listVariableName', 'listHtml', 'labelColor'
  ];

  const extractAllVariables = (template: Template): string[] => {
    const varsFromHtml = extractVariables(template.html);
    const varsFromSections = new Set<string>();

    // Extract from sections if available
    if (template.sections) {
      template.sections.forEach((section: Section) => {
        // For labeled-content sections, use appropriate variable name based on content type
        if (section.type === 'labeled-content') {
          // Extract placeholder variables from the label itself (e.g., {{teamName}} in label text)
          if (section.variables?.label) {
            const labelText = section.variables.label as string;
            
            // Check for {{placeholder}} format in label
            const placeholderMatches = labelText.match(/\{\{(\w+)\}\}/g) || [];
            placeholderMatches.forEach(match => {
              const varName = match.replace(/\{\{|\}\}/g, '');
              varsFromSections.add(varName);
            });
            
            // Also extract Thymeleaf variables from label
            const thymeleafVars = extractVariables(labelText);
            thymeleafVars.forEach(v => varsFromSections.add(v));
          }
          
          // For list content, use the stored listVariableName
          if (section.variables?.contentType === 'list') {
            const listVarName = section.variables.listVariableName as string;
            if (listVarName) {
              varsFromSections.add(listVarName);
            }
          } else if (section.variables?.contentType === 'table') {
            // For table content, use section ID as the variable key
            varsFromSections.add(section.id);
          } else {
            // For text content, use section ID as the variable key
            varsFromSections.add(section.id);
          }
          
          // Extract any user-defined variables (not metadata)
          if (section.variables && typeof section.variables === 'object') {
            Object.entries(section.variables).forEach(([key, value]) => {
              // Skip metadata keys
              if (METADATA_KEYS.includes(key)) return;
              // Only add if it's a user-defined variable with a value
              if (value !== undefined && value !== null && typeof value === 'string') {
                varsFromSections.add(key);
              }
            });
          }
          return;
        }
        
        // For mixed-content sections, extract from content variable
        if (section.type === 'mixed-content' && section.variables?.content) {
          const mixedVars = extractVariables(section.variables.content as string);
          mixedVars.forEach(v => varsFromSections.add(v));
          
          // Also check for {{placeholder}} format
          const placeholderMatches = (section.variables.content as string).match(/\{\{(\w+)\}\}/g) || [];
          placeholderMatches.forEach(match => {
            const varName = match.replace(/\{\{|\}\}/g, '');
            varsFromSections.add(varName);
          });
        }
        
        // For heading/text sections with inline placeholders, extract from content
        const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
        if (inlinePlaceholderTypes.includes(section.type) && section.content) {
          const placeholderMatches = section.content.match(/\{\{(\w+)\}\}/g) || [];
          placeholderMatches.forEach(match => {
            const varName = match.replace(/\{\{|\}\}/g, '');
            varsFromSections.add(varName);
          });
          
          // Also extract Thymeleaf variables from content
          const contentVars = extractVariables(section.content);
          contentVars.forEach(v => varsFromSections.add(v));
        }
        
        // For standalone list sections (bullet-list-*, number-list-*)
        const listSectionTypes = [
          'bullet-list-circle', 'bullet-list-disc', 'bullet-list-square',
          'number-list-1', 'number-list-i', 'number-list-a'
        ];
        if (listSectionTypes.includes(section.type)) {
          // Use stored listVariableName if available, fallback to section ID for backward compatibility
          const listVarName = section.variables?.listVariableName as string;
          varsFromSections.add(listVarName || section.id);
        }
        
        // For direct table sections
        if (section.type === 'table') {
          varsFromSections.add(section.id);
        }
        
        // For other sections, extract user-defined variables (not metadata)
        if (section.variables && typeof section.variables === 'object') {
          Object.entries(section.variables).forEach(([key, value]) => {
            // Skip metadata keys
            if (METADATA_KEYS.includes(key)) return;
            // Only add if it's a meaningful variable
            if (value !== undefined && value !== null) {
              varsFromSections.add(key);
            }
          });
        }
      });
    }

    return Array.from(new Set([...varsFromHtml, ...varsFromSections]));
  };

  const replaceVariables = (html: string, vars: Record<string, string | TextStyle>, listVars: Record<string, string[] | ListItemStyle[]>): string => {
    let result = html;
    
    // Replace list variables
    Object.entries(listVars).forEach(([key, items]) => {
      const listHtml = items.filter((item: any) => typeof item === 'string' ? item.trim() : item.text?.trim()).map((item: any) => {
        if (typeof item === 'object' && 'text' in item) {
          const styles = [];
          if (item.color) styles.push(`color: ${item.color}`);
          if (item.bold) styles.push('font-weight: bold');
          if (item.italic) styles.push('font-style: italic');
          if (item.underline) styles.push('text-decoration: underline');
          if (item.backgroundColor) styles.push(`background-color: ${item.backgroundColor}`);
          if (item.fontSize) styles.push(`font-size: ${item.fontSize}`);
          const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
          return `<li${styleAttr}>${item.text}</li>`;
        }
        return `<li>${item}</li>`;
      }).join('');
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), listHtml);
    });
    
    // Replace regular variables
    Object.entries(vars).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && 'text' in value) {
        // Handle styled text
        const styles = [];
        if (value.color) styles.push(`color: ${value.color}`);
        if (value.bold) styles.push('font-weight: bold');
        if (value.italic) styles.push('font-style: italic');
        if (value.underline) styles.push('text-decoration: underline');
        if (value.backgroundColor) styles.push(`background-color: ${value.backgroundColor}`);
        if (value.fontSize) styles.push(`font-size: ${value.fontSize}`);
        const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), `<span${styleAttr}>${value.text}</span>`);
      } else {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value as string);
      }
    });
    
    // Handle labeled-content sections with runtime variables
    if (selectedTemplate?.sections) {
      selectedTemplate.sections.forEach(section => {
        if (section.type === 'labeled-content' && section.variables?.label) {
          const label = section.variables.label as string;
          const runtimeValue = listVars[label] || vars[label];
          if (runtimeValue) {
            if (Array.isArray(runtimeValue)) {
              const listHtml = runtimeValue.map((item: any) => {
                if (typeof item === 'object' && 'text' in item) {
                  const styles = [];
                  if (item.color) styles.push(`color: ${item.color}`);
                  if (item.bold) styles.push('font-weight: bold');
                  if (item.italic) styles.push('font-style: italic');
                  if (item.underline) styles.push('text-decoration: underline');
                  if (item.backgroundColor) styles.push(`background-color: ${item.backgroundColor}`);
                  if (item.fontSize) styles.push(`font-size: ${item.fontSize}`);
                  const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
                  return `<li${styleAttr}>${item.text}</li>`;
                }
                return `<li>${item}</li>`;
              }).join('');
              result = result.replace(new RegExp(`<th:utext="\\$\\{${label}\\}">`, 'g'), listHtml);
            } else {
              result = result.replace(new RegExp(`<th:utext="\\$\\{${label}\\}">`, 'g'), runtimeValue as string);
            }
          }
        }
      });
    }
    
    return result;
  };

  // Extract placeholders from subject - supports {{placeholder}}, <th:block>, and legacy formats
  const extractSubjectVariables = (subject: string): string[] => {
    // Match {{variableName}} pattern
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const placeholderMatches = subject.matchAll(placeholderRegex);
    const placeholderVars = Array.from(placeholderMatches, m => m[1]);
    
    // Match new format: <th:block th:utext="${variableName}"/>
    const blockRegex = /<th:block\s+th:utext="\$\{(\w+)\}"\/>/g;
    const blockMatches = subject.matchAll(blockRegex);
    const blockVars = Array.from(blockMatches, m => m[1]);
    
    // Match legacy format: <th:utext="${variableName}">
    const legacyRegex = /<th:utext="\$\{(\w+)\}">/g;
    const legacyMatches = subject.matchAll(legacyRegex);
    const legacyVars = Array.from(legacyMatches, m => m[1]);
    
    // Combine and deduplicate
    return Array.from(new Set([...placeholderVars, ...blockVars, ...legacyVars]));
  };

  // Get processed subject with variables replaced - handles both formats
  const getProcessedSubject = (): string => {
    if (!selectedTemplate?.subject) return emailSubject;
    
    return processSubjectWithValues(selectedTemplate.subject, subjectVariables);
  };
  
  // Get display-friendly subject (converts Thymeleaf to placeholders for display)
  const getDisplaySubject = (): string => {
    if (!selectedTemplate?.subject) return emailSubject;
    return subjectThymeleafToPlaceholder(selectedTemplate.subject);
  };

  const handleRunTemplate = (template: Template) => {
    setSelectedTemplate(template);
    const vars = extractAllVariables(template);
    const initialVars: Record<string, string | TextStyle> = {};
    const initialListVars: Record<string, string[] | ListItemStyle[]> = {};
    
    vars.forEach(v => {
      const defaultVal = getDefaultValue(v);
      if (Array.isArray(defaultVal)) {
        initialListVars[v] = defaultVal.length > 0 ? defaultVal : [''];
      } else {
        initialVars[v] = String(defaultVal);
      }
    });
    
    // Also directly initialize list variables from sections to ensure all items are captured
    if (template.sections) {
      template.sections.forEach(section => {
        // Initialize standalone list sections directly
        if (LIST_SECTION_TYPES.includes(section.type)) {
          const listVarName = (section.variables?.listVariableName as string) || section.id;
          const rawItems = section.variables?.items as (string | ListItemStyle)[];
          if (rawItems && rawItems.length > 0) {
            initialListVars[listVarName] = rawItems as (string[] | ListItemStyle[]);
          } else if (!initialListVars[listVarName]) {
            initialListVars[listVarName] = [''];
          }
        }
        
        // Initialize labeled-content list sections
        if (section.type === 'labeled-content' && section.variables?.contentType === 'list') {
          const listVarName = (section.variables.listVariableName as string) || section.id;
          const rawItems = section.variables.items as (string | ListItemStyle)[];
          if (rawItems && rawItems.length > 0) {
            initialListVars[listVarName] = rawItems as (string[] | ListItemStyle[]);
          } else if (!initialListVars[listVarName]) {
            initialListVars[listVarName] = [''];
          }
        }
      });
    }
    
    setVariables(initialVars);
    setListVariables(initialListVars);
    
    // Set initial execution metadata
    setExecutedOn(new Date().toLocaleString());
    
    // Initialize subject from template or default
    if (template.subject) {
      // Convert Thymeleaf to placeholders for display
      const displaySubject = subjectThymeleafToPlaceholder(template.subject);
      setEmailSubject(displaySubject);
      // Extract subject variables and initialize them
      const subjectVars = extractSubjectVariables(template.subject);
      const initialSubjectVars: Record<string, string> = {};
      subjectVars.forEach(v => {
        initialSubjectVars[v] = ''; // Empty by default, user needs to fill
      });
      setSubjectVariables(initialSubjectVars);
    } else {
      setEmailSubject(`${template.name} - ${new Date().toLocaleDateString()}`);
      setSubjectVariables({});
    }
    
    setEmailTitle(template.name);
  };

  const handleSendTemplate = () => {
    if (!selectedTemplate) return;

    // Get the final subject (either processed from template or manual input)
    const finalSubject = selectedTemplate?.subject && Object.keys(subjectVariables).length > 0 
      ? getProcessedSubject() 
      : emailSubject;

    // Validate subject
    if (!finalSubject.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an email subject.",
        variant: "destructive",
      });
      return;
    }

    // Validate subject variables are filled
    if (selectedTemplate?.subject && Object.keys(subjectVariables).length > 0) {
      const emptyVars = Object.entries(subjectVariables).filter(([_, value]) => !value.trim());
      if (emptyVars.length > 0) {
        toast({
          title: "Validation Error",
          description: `Please fill in all subject variables: ${emptyVars.map(([k]) => k).join(', ')}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate listVariableName exists for all list sections
    if (selectedTemplate.sections) {
      const listSectionsWithoutVarName = selectedTemplate.sections.filter(section => 
        section.type === 'labeled-content' && 
        section.variables?.contentType === 'list' && 
        !section.variables?.listVariableName
      );
      
      if (listSectionsWithoutVarName.length > 0) {
        toast({
          title: "Validation Error",
          description: `Some list sections are missing variable names. Please edit the template and ensure all list sections have valid variable names.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate emails
    if (!toEmails.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one recipient email.",
        variant: "destructive",
      });
      return;
    }

    // Helper function to generate styled HTML for a value
    const generateStyledHtml = (value: string | TextStyle): string => {
      if (typeof value === 'object' && value !== null && 'text' in value) {
        const textStyle = value as TextStyle;
        const hasStyles = textStyle.color || textStyle.bold || textStyle.italic || 
                          textStyle.underline || textStyle.backgroundColor || textStyle.fontSize;
        if (hasStyles) {
          const styles = [];
          if (textStyle.color) styles.push(`color: ${textStyle.color}`);
          if (textStyle.bold) styles.push('font-weight: bold');
          if (textStyle.italic) styles.push('font-style: italic');
          if (textStyle.underline) styles.push('text-decoration: underline');
          if (textStyle.backgroundColor) styles.push(`background-color: ${textStyle.backgroundColor}`);
          if (textStyle.fontSize) styles.push(`font-size: ${textStyle.fontSize}`);
          return `<span style="${styles.join('; ')}">${textStyle.text}</span>`;
        }
        return textStyle.text;
      }
      return value as string;
    };

    // Build body_data from all section variables
    const bodyData: Record<string, any> = {};
    
    // Add text variables with styles
    Object.entries(variables).forEach(([key, value]) => {
      bodyData[key] = generateStyledHtml(value);
    });
    
    // Add list variables with styles
    Object.entries(listVariables).forEach(([key, items]) => {
      bodyData[key] = items.map((item: any) => {
        if (typeof item === 'object' && 'text' in item) {
          const itemStyle = item as ListItemStyle;
          const hasStyles = itemStyle.color || itemStyle.bold || itemStyle.italic || 
                            itemStyle.underline || itemStyle.backgroundColor || itemStyle.fontSize;
          if (hasStyles) {
            const styles = [];
            if (itemStyle.color) styles.push(`color: ${itemStyle.color}`);
            if (itemStyle.bold) styles.push('font-weight: bold');
            if (itemStyle.italic) styles.push('font-style: italic');
            if (itemStyle.underline) styles.push('text-decoration: underline');
            if (itemStyle.backgroundColor) styles.push(`background-color: ${itemStyle.backgroundColor}`);
            if (itemStyle.fontSize) styles.push(`font-size: ${itemStyle.fontSize}`);
            return `<span style="${styles.join('; ')}">${itemStyle.text}</span>`;
          }
          return itemStyle.text;
        }
        return item;
      });
    });
    
    // Add table variables
    Object.entries(tableVariables).forEach(([key, value]) => {
      bodyData[key] = value;
    });
    
    // Add label variables
    Object.entries(labelVariables).forEach(([key, value]) => {
      bodyData[key] = value;
    });

    // Generate full rendered HTML with email wrapper for Outlook/email client compatibility
    const allVars: Record<string, string | string[] | any> = {
      ...variables,
      ...listVariables,
      ...tableVariables,
      ...labelVariables
    };
    const renderedBodyHtml = selectedTemplate.sections
      .map((section, index) => wrapSectionInTable(renderSectionContent(section, allVars), index === 0))
      .join('');
    const fullEmailHtml = wrapInEmailHtml(renderedBodyHtml);

    // Build the payload in the requested format
    const payload = {
      templateId: selectedTemplate.id,
      toEmails: toEmails.split(',').map(e => e.trim()).filter(Boolean),
      ccEmails: ccEmails.split(',').map(e => e.trim()).filter(Boolean),
      bccEmails: bccEmails.split(',').map(e => e.trim()).filter(Boolean),
      contentData: {
        subject_data: { ...subjectVariables },
        body_data: bodyData
      },
      renderedHtml: fullEmailHtml
    };

    console.log("Email Payload:", JSON.stringify(payload, null, 2));

    toast({
      title: "Template Sent",
      description: `"${finalSubject}" sent successfully to ${payload.toEmails.length} recipient(s).`,
    });

    resetForm();
    navigate('/templates');
  };

  const resetForm = () => {
    setToEmails("");
    setCcEmails("");
    setBccEmails("");
    setVariables({});
    setListVariables({});
    setTableVariables({});
    setLabelVariables({});
    setSubjectVariables({});
    setEmailSubject("");
  };

  const previewHtml = React.useMemo(() => {
    if (!selectedTemplate) return "";
    
    // If template has sections, render from sections
    if (selectedTemplate.sections && selectedTemplate.sections.length > 0) {
      // Combine all variables for rendering, converting TextStyle objects to strings
      const allVars: Record<string, any> = {};
      
      Object.entries(variables).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && 'text' in value) {
          const textStyle = value as TextStyle;
          const styles = [];
          if (textStyle.color) styles.push(`color: ${textStyle.color}`);
          if (textStyle.bold) styles.push('font-weight: bold');
          if (textStyle.italic) styles.push('font-style: italic');
          if (textStyle.underline) styles.push('text-decoration: underline');
          if (textStyle.backgroundColor) styles.push(`background-color: ${textStyle.backgroundColor}`);
          if (textStyle.fontSize) styles.push(`font-size: ${textStyle.fontSize}`);
          const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
          allVars[key] = `<span${styleAttr}>${textStyle.text}</span>`;
        } else {
          allVars[key] = value;
        }
      });
      
      // Add list and table variables
      Object.entries(listVariables).forEach(([key, value]) => {
        allVars[key] = value;
      });
      
      Object.entries(tableVariables).forEach(([key, value]) => {
        allVars[key] = value;
      });
      
      // Add label variables for preview rendering
      Object.entries(labelVariables).forEach(([key, value]) => {
        allVars[key] = value;
      });
      
      return selectedTemplate.sections
        .map((section, index) => {
          // For labeled-content sections, inject updated label from labelVariables
          let sectionToRender = section;
          if (section.type === 'labeled-content') {
            const labelVarName = (section.variables?.labelVariableName as string) || `label_${section.id}`;
            if (labelVariables[labelVarName]) {
              sectionToRender = {
                ...section,
                variables: {
                  ...(section.variables || {}),
                  label: labelVariables[labelVarName]
                }
              };
            }
          }
          return wrapSectionInTable(renderSectionContent(sectionToRender, allVars), index === 0);
        })
        .join('');
    }
    
    // Otherwise render from html field
    return replaceVariables(selectedTemplate.html, variables, listVariables);
  }, [selectedTemplate, variables, listVariables, tableVariables, labelVariables]);

  return (
    <div className={styles.container}>
      {isLoadingTemplate ? (
        // Loading state when fetching template by ID
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading template...</p>
          </div>
        </div>
      ) : !selectedTemplate ? (
        // Template Selection View
        <div className={styles.innerContainer}>
          <div className={styles.header}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/templates')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
            <div>
              <h1 className={styles.title}>
                Run Templates
              </h1>
              <p className={styles.subtitle}>
                Select a template to run and send via email
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </Card>
              ))
            ) : templates.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No templates found. Create a template first.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/template-editor')}
                >
                  Create Template
                </Button>
              </div>
            ) : (
              templates.map((template) => (
                <Card key={template.id} className="p-6 hover:shadow-lg transition-all border-2 hover:border-primary/50">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {template.sectionCount} sections
                      </Badge>
                      <Badge variant="outline">
                        {extractAllVariables(template).length} variables
                      </Badge>
                    </div>

                    <Button
                      onClick={() => navigate(`/run-templates/${template.id}`)}
                      className="w-full shadow-lg shadow-primary/20"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Run Template
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        // Outlook-style Email Composition View
        <div className="h-screen flex flex-col">
          {/* Top Navigation Bar */}
          <div className="border-b bg-card/50 backdrop-blur-sm px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/run-templates')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-lg font-bold">{selectedTemplate.name}</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailPreview(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>

          {/* Outlook-style Email Header */}
          <div className={styles.emailHeader}>
            {/* Send Button Container */}
            <div className={styles.sendButtonContainer}>
              <button
                className={styles.sendButton}
                onClick={handleSendTemplate}
              >
                <Send />
                Send
              </button>
            </div>

            {/* Email Fields */}
            <div className={styles.emailFieldsContainer}>
              {/* To Field */}
              <div className={styles.emailFieldRow}>
                <label>To:</label>
                <input
                  type="text"
                  placeholder="Enter email addresses (comma separated)"
                  value={toEmails}
                  onChange={(e) => setToEmails(e.target.value)}
                />
              </div>

              {/* CC Field */}
              <div className={styles.emailFieldRow}>
                <label>CC:</label>
                <input
                  type="text"
                  placeholder="Enter CC addresses (optional)"
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                />
              </div>

              {/* BCC Field */}
              <div className={styles.emailFieldRow}>
                <label>BCC:</label>
                <input
                  type="text"
                  placeholder="Enter BCC addresses (optional)"
                  value={bccEmails}
                  onChange={(e) => setBccEmails(e.target.value)}
                />
              </div>

              {/* Subject Field */}
              <div className={styles.emailFieldRow}>
                <label>Subject:</label>
                {selectedTemplate?.subject && Object.keys(subjectVariables).length > 0 ? (
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-mono shrink-0">
                      {/* Show processed subject with values or placeholders */}
                      {getDisplaySubject().replace(/\{\{(\w+)\}\}/g, (_, varName) => 
                        subjectVariables[varName] || `{{${varName}}}`
                      )}
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          Edit Variables
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Subject Variables</h4>
                          <p className="text-xs text-muted-foreground">
                            Template: <code className="bg-muted px-1 rounded">{getDisplaySubject()}</code>
                          </p>
                          {Object.keys(subjectVariables).map((varName) => (
                            <div key={`subject-var-${varName}`} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-mono shrink-0">
                                {`{{${varName}}}`}
                              </Badge>
                              <Input
                                id={`subject-var-${varName}`}
                                placeholder={`Enter ${varName}...`}
                                value={subjectVariables[varName] || ''}
                                onChange={(e) => setSubjectVariables(prev => ({
                                  ...prev,
                                  [varName]: e.target.value
                                }))}
                                className="flex-1 h-8"
                              />
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter email subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Main Content: Variables (left) | Preview/Body (right) */}
          <div className={styles.mainContent}>
            {/* Left Panel - Template Variables */}
            <div className={styles.variablesPanel}>
              <div className={styles.variablesPanelHeader}>
                <h2>Template Variables</h2>
              </div>
              <ScrollArea className="flex-1">
                <div className={styles.variablesList}>
                  {/* Subject Data Section */}
                  {Object.keys(subjectVariables).length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                        <span className="text-sm font-semibold text-foreground">Subject Data</span>
                      </div>
                      <div className={styles.formGrid}>
                        {Object.keys(subjectVariables).map((varName) => (
                          <div key={`subject-var-${varName}`} className={styles.formField}>
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="relative w-full cursor-help">
                                  <Input
                                    id={`subject-var-input-${varName}`}
                                    placeholder={varName}
                                    value={subjectVariables[varName] || ''}
                                    onChange={(e) => setSubjectVariables(prev => ({
                                      ...prev,
                                      [varName]: e.target.value
                                    }))}
                                  />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2" side="top" align="start">
                                <span className="text-xs text-muted-foreground">{varName}</span>
                              </PopoverContent>
                            </Popover>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Body Content Section - All sections in template order */}
                  {(() => {
                    // Helper function to flatten sections including children
                    const flattenSections = (sections: Section[]): Section[] => {
                      const result: Section[] = [];
                      sections.forEach(section => {
                        result.push(section);
                        if (section.children && section.children.length > 0) {
                          result.push(...flattenSections(section.children));
                        }
                      });
                      return result;
                    };
                    
                    // Build ordered sections - ALL sections in template order including nested children
                    const rawSections = selectedTemplate?.sections || [];
                    const allSections = flattenSections(rawSections);
                    
                    const hasContent = allSections.length > 0;
                    
                    if (!hasContent && Object.keys(subjectVariables).length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">No variables in this template</p>
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        {hasContent && (
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                            <span className="text-sm font-semibold text-foreground">Body Content</span>
                          </div>
                        )}
                        
                        {/* All sections in template order */}
                        {allSections.map((section: Section) => {
                          // Handle labeled-content sections
                          if (section.type === 'labeled-content') {
                            const labelVarName = (section.variables?.labelVariableName as string) || `label_${section.id}`;
                            const labelValue = labelVariables[labelVarName] || (section.variables?.label as string) || 'Label';
                            const editable = section.isLabelEditable !== false;
                            const contentType = section.variables?.contentType || 'text';
                            const listVarName = section.variables?.listVariableName as string || section.id;
                            
                            return (
                              <div 
                                key={section.id} 
                                className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}
                              >
                                {/* Label - Jira-style editable */}
                                <div className="mb-2">
                                  {editable ? (
                                    editingLabelId === section.id ? (
                                      <Input
                                        autoFocus
                                        value={labelValue}
                                        onChange={(e) => setLabelVariables(prev => ({
                                          ...prev,
                                          [labelVarName]: e.target.value
                                        }))}
                                        onFocus={() => scrollToSection(section.id)}
                                        onBlur={() => setEditingLabelId(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === 'Escape') {
                                            setEditingLabelId(null);
                                          }
                                        }}
                                        className="font-medium text-sm h-9 border-primary/30 focus:border-primary bg-background"
                                        placeholder="Enter label..."
                                      />
                                    ) : (
                                      <div 
                                        className="group flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => {
                                          setEditingLabelId(section.id);
                                          scrollToSection(section.id);
                                        }}
                                      >
                                        <span 
                                          className="flex-1 font-semibold" 
                                          style={{ fontSize: '1rem', color: '#212529' }}
                                          dangerouslySetInnerHTML={{ __html: labelValue || 'Click to edit...' }}
                                        />
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    )
                                  ) : (
                                    <div 
                                      className="px-3 py-1.5 bg-muted rounded"
                                      style={{ fontSize: '1rem', color: '#212529', fontWeight: 600 }}
                                      dangerouslySetInnerHTML={{ __html: labelValue }}
                                    />
                                  )}
                                </div>
                                
                                {/* Content - with left margin */}
                                <div className="ml-4">
                                  {contentType === 'text' && (
                                    <div className={styles.inputWrapper}>
                                      <RichTextEditor
                                        value={typeof variables[section.id] === 'object' 
                                          ? (variables[section.id] as TextStyle).text 
                                          : (variables[section.id] as string) || (section.variables?.content as string) || ''
                                        }
                                        onChange={(html) => setVariables(prev => ({
                                          ...prev,
                                          [section.id]: html
                                        }))}
                                        onFocus={() => scrollToSection(section.id)}
                                        rows={4}
                                        placeholder="Enter content... (select text to apply styles)"
                                      />
                                    </div>
                                  )}
                                  
                                  {contentType === 'list' && (
                                    <div className="space-y-2">
                                      {((listVariables[listVarName] || section.variables?.items || ['']) as (string | ListItemStyle)[]).map((item: string | ListItemStyle, itemIdx: number) => (
                                        <div key={itemIdx} className={styles.listItemRow}>
                                          <span className="text-xs text-muted-foreground w-4">{itemIdx + 1}.</span>
                                          <RichTextEditor
                                            value={typeof item === 'object' ? item.text : item}
                                            onChange={(html) => {
                                              const currentItems = (listVariables[listVarName] || section.variables?.items || ['']) as (string | ListItemStyle)[];
                                              const newItems = [...currentItems] as (string | ListItemStyle)[];
                                              newItems[itemIdx] = html;
                                              setListVariables(prev => ({
                                                ...prev,
                                                [listVarName]: newItems as string[] | ListItemStyle[]
                                              }));
                                            }}
                                            onFocus={() => scrollToSection(section.id)}
                                            placeholder="List item..."
                                            singleLine
                                            className="flex-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => {
                                              const currentItems = (listVariables[listVarName] || section.variables?.items || ['']) as (string | ListItemStyle)[];
                                              if (currentItems.length > 1) {
                                                const newItems = currentItems.filter((_, i) => i !== itemIdx) as (string | ListItemStyle)[];
                                                setListVariables(prev => ({
                                                  ...prev,
                                                  [listVarName]: newItems as string[] | ListItemStyle[]
                                                }));
                                              }
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const currentItems = (listVariables[listVarName] || section.variables?.items || ['']) as (string | ListItemStyle)[];
                                          setListVariables(prev => ({
                                            ...prev,
                                            [listVarName]: [...currentItems, ''] as string[] | ListItemStyle[]
                                          }));
                                          scrollToSection(section.id);
                                        }}
                                        className="h-7"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Item
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {contentType === 'table' && (() => {
                                    const tableData = tableVariables[section.id] || getTableData(section.id);
                                    return (
                                      <div className="space-y-2 border rounded-lg p-3 bg-background">
                                        <div className="flex gap-2 mb-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setTableVariables(prev => ({
                                                ...prev,
                                                [section.id]: {
                                                  ...tableData,
                                                  headers: [...(tableData.headers || []), `Col ${(tableData.headers?.length || 0) + 1}`]
                                                }
                                              }));
                                              scrollToSection(section.id);
                                            }}
                                            className="h-7 px-2"
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Column
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              const newRow = new Array(tableData.headers?.length || 1).fill('');
                                              setTableVariables(prev => ({
                                                ...prev,
                                                [section.id]: {
                                                  ...tableData,
                                                  rows: [...(tableData.rows || []), newRow]
                                                }
                                              }));
                                              scrollToSection(section.id);
                                            }}
                                            className="h-7 px-2"
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Row
                                          </Button>
                                        </div>
                                        {tableData.headers && tableData.headers.length > 0 && (
                                          <div className="overflow-x-auto">
                                            <table className="w-full border-collapse border text-sm">
                                              <thead>
                                                <tr>
                                                  {tableData.headers.map((header: string, colIdx: number) => (
                                                    <th key={colIdx} className="border p-1 bg-muted">
                                                      <RichTextEditor
                                                        value={header}
                                                        onChange={(html) => {
                                                          const newHeaders = [...tableData.headers];
                                                          newHeaders[colIdx] = html;
                                                          setTableVariables(prev => ({
                                                            ...prev,
                                                            [section.id]: { ...tableData, headers: newHeaders }
                                                          }));
                                                        }}
                                                        onFocus={() => scrollToSection(section.id)}
                                                        placeholder={`Header ${colIdx + 1}`}
                                                        singleLine
                                                        className="font-semibold"
                                                      />
                                                    </th>
                                                  ))}
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {(tableData.rows || []).map((row: string[], rowIdx: number) => (
                                                  <tr key={rowIdx}>
                                                    {row.map((cell: string, colIdx: number) => (
                                                      <td key={colIdx} className="border p-1">
                                                        <RichTextEditor
                                                          value={cell}
                                                          onChange={(html) => {
                                                            const newRows = [...tableData.rows];
                                                            newRows[rowIdx][colIdx] = html;
                                                            setTableVariables(prev => ({
                                                              ...prev,
                                                              [section.id]: { ...tableData, rows: newRows }
                                                            }));
                                                          }}
                                                          onFocus={() => scrollToSection(section.id)}
                                                          placeholder={`R${rowIdx + 1}C${colIdx + 1}`}
                                                          singleLine
                                                        />
                                                      </td>
                                                    ))}
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          }
                          
                          // Handle mixed-content sections
                          if (section.type === 'mixed-content' && section.variables?.content) {
                            const mixedVars: string[] = [];
                            const placeholderMatches = (section.variables.content as string).match(/\{\{(\w+)\}\}/g) || [];
                            placeholderMatches.forEach(match => {
                              const varName = match.replace(/\{\{|\}\}/g, '');
                              if (!mixedVars.includes(varName)) mixedVars.push(varName);
                            });
                            const contentVars = extractVariables(section.variables.content as string);
                            contentVars.forEach(v => { if (!mixedVars.includes(v)) mixedVars.push(v); });
                            
                            if (mixedVars.length === 0) return null;
                            
                            return (
                              <div key={section.id} className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}>
                                <div className="text-xs text-muted-foreground mb-2">Mixed Content</div>
                                {mixedVars.map(varName => (
                                  <div key={varName} className={styles.formField}>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Label htmlFor={`var-${varName}`} className="text-sm font-medium cursor-help mb-1 inline-block">
                                          {varName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        </Label>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-2" side="top" align="start">
                                        <span className="text-xs text-muted-foreground">{varName}</span>
                                      </PopoverContent>
                                    </Popover>
                                    <div className={styles.inputWrapper}>
                                      <RichTextEditor
                                        value={typeof variables[varName] === 'object' 
                                          ? (variables[varName] as TextStyle).text 
                                          : (variables[varName] as string) || ''
                                        }
                                        onChange={(html) => {
                                          setVariables(prev => ({
                                            ...prev,
                                            [varName]: html
                                          }));
                                        }}
                                        onFocus={() => scrollToSection(section.id)}
                                        placeholder={varName}
                                        singleLine
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          
                          // Handle banner sections separately (uses tableData, not content)
                          // Handle heading/text/paragraph/banner sections
                          if (['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph', 'banner'].includes(section.type)) {
                            // Check if this section is editable at runtime
                            const isEditable = section.isLabelEditable !== false;
                            const isBanner = section.type === 'banner';
                            const bannerKey = `banner_${section.id}`;
                            
                            // Get the original content from template (before any edits)
                            const getOriginalContent = (): string => {
                              if (isBanner) {
                                const tableData = section.variables?.tableData as any;
                                return tableData?.rows?.[0]?.[0] || 'EFT';
                              }
                              return section.content || '';
                            };
                            
                            // Get current edited value (for textarea binding)
                            const getEditedValue = (): string => {
                              if (isBanner) {
                                return variables[bannerKey] as string | undefined ?? '';
                              }
                              return editedSectionContent[section.id] ?? '';
                            };
                            
                            const originalContent = getOriginalContent();
                            const editedValue = getEditedValue();
                            const hasBeenEdited = isBanner ? variables[bannerKey] !== undefined : editedSectionContent[section.id] !== undefined;
                            
                            // Use edited value if available, otherwise use original
                            const rawContent = hasBeenEdited ? editedValue : originalContent;
                            
                            // Convert Thymeleaf tags to {{placeholder}} format BEFORE stripping HTML
                            const contentWithPlaceholders = rawContent
                              .replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, '{{$1}}')
                              .replace(/<th:utext="\$\{(\w+)\}">[^<]*<\/th:utext>/g, '{{$1}}')
                              .replace(/<th:block\s+th:utext="\$\{(\w+)\}"\/>/g, '{{$1}}')
                              .replace(/th:utext="\$\{(\w+)\}"/g, '{{$1}}');
                            
                            // Strip remaining HTML tags to get plain text for label display
                            // Don't trim - preserve spaces for editing
                            const plainTextContent = contentWithPlaceholders.replace(/<[^>]*>/g, '');
                            const displayContent = plainTextContent.trim(); // Only trim for display checks
                            
                            // Dynamically extract placeholders from content
                            const varNames: string[] = [];
                            if (plainTextContent) {
                              const placeholderMatches = plainTextContent.match(/\{\{(\w+)\}\}/g) || [];
                              placeholderMatches.forEach(match => {
                                const varName = match.replace(/\{\{|\}\}/g, '');
                                if (!varNames.includes(varName)) varNames.push(varName);
                              });
                            }
                            
                            // Skip sections with no content
                            if (!displayContent) return null;
                            
                            const isEditingThisSection = editingSectionId === section.id;
                            const hasPlaceholders = varNames.length > 0;
                            
                            // Get banner background color for display
                            const bannerBgColor = isBanner 
                              ? ((section.variables?.tableData as any)?.cellStyles?.['0-0']?.backgroundColor || '#FFFF00')
                              : undefined;
                            
                            // Determine the value for textarea - use edited value or convert original to plain text
                            const textareaValue = hasBeenEdited 
                              ? editedValue 
                              : originalContent.replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, '{{$1}}')
                                  .replace(/<th:utext="\$\{(\w+)\}">[^<]*<\/th:utext>/g, '{{$1}}')
                                  .replace(/<th:block\s+th:utext="\$\{(\w+)\}"\/>/g, '{{$1}}')
                                  .replace(/th:utext="\$\{(\w+)\}"/g, '{{$1}}')
                                  .replace(/<[^>]*>/g, '');
                            
                            return (
                              <div key={section.id} className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}>
                                {/* Content label - show with placeholders highlighted or as static text */}
                                {isEditingThisSection && isEditable ? (
                                  <div className="mb-3">
                                    <Textarea
                                      value={textareaValue}
                                      onChange={(e) => {
                                        if (isBanner) {
                                          setVariables(prev => ({
                                            ...prev,
                                            [bannerKey]: e.target.value
                                          }));
                                        } else {
                                          setEditedSectionContent(prev => ({
                                            ...prev,
                                            [section.id]: e.target.value
                                          }));
                                        }
                                      }}
                                      className="text-sm min-h-[80px]"
                                      placeholder={isBanner ? "Edit banner text..." : "Edit content... Use {{variableName}} for placeholders"}
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-2 mt-2">
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        onClick={() => setEditingSectionId(null)}
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Done
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => {
                                          if (isBanner) {
                                            setVariables(prev => {
                                              const newState = { ...prev };
                                              delete newState[bannerKey];
                                              return newState;
                                            });
                                          } else {
                                            setEditedSectionContent(prev => {
                                              const newState = { ...prev };
                                              delete newState[section.id];
                                              return newState;
                                            });
                                          }
                                          setEditingSectionId(null);
                                        }}
                                      >
                                        Reset
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-2">
                                    {isBanner ? (
                                      <div 
                                        className="flex-1 inline-block px-3 py-1 rounded text-sm font-bold"
                                        style={{ backgroundColor: bannerBgColor, color: '#000' }}
                                        dangerouslySetInnerHTML={{ 
                                          __html: hasPlaceholders 
                                            ? displayContent.replace(
                                                /\{\{(\w+)\}\}/g, 
                                                '<span style="background-color: rgba(0,0,0,0.1); padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.85em;">{{$1}}</span>'
                                              )
                                            : displayContent
                                        }}
                                      />
                                    ) : (
                                      <div 
                                        className={`flex-1 text-sm font-medium ${hasPlaceholders ? 'text-foreground' : 'text-muted-foreground'}`}
                                        style={{ lineHeight: 1.6 }}
                                        dangerouslySetInnerHTML={{ 
                                          __html: hasPlaceholders 
                                            ? displayContent.replace(
                                                /\{\{(\w+)\}\}/g, 
                                                '<span style="background-color: hsl(var(--primary) / 0.15); color: hsl(var(--primary)); padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.85em; font-weight: 600;">{{$1}}</span>'
                                              )
                                            : displayContent
                                        }}
                                      />
                                    )}
                                    {isEditable && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 shrink-0 opacity-50 hover:opacity-100"
                                        onClick={() => setEditingSectionId(section.id)}
                                        title="Edit content"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                                
                                {/* Show input boxes for each placeholder - indented to show association */}
                                {hasPlaceholders && (
                                  <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/20 space-y-3">
                                    {varNames.map(varName => (
                                      <div key={varName} className={styles.formField}>
                                        <Label htmlFor={`var-${varName}`} className="text-xs font-medium mb-1.5 inline-flex items-center gap-1.5 text-muted-foreground">
                                          <span className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-semibold">{`{{${varName}}}`}</span>
                                        </Label>
                                        {isBanner ? (
                                          <Input
                                            value={(variables[varName] as string) || ''}
                                            onChange={(e) => {
                                              setVariables(prev => ({
                                                ...prev,
                                                [varName]: e.target.value
                                              }));
                                            }}
                                            onFocus={() => scrollToSection(section.id)}
                                            placeholder={`Enter value for ${varName}...`}
                                            className="text-sm"
                                          />
                                        ) : (
                                          <RichTextEditor
                                            value={typeof variables[varName] === 'object' 
                                              ? (variables[varName] as TextStyle).text 
                                              : (variables[varName] as string) || ''
                                            }
                                            onChange={(html) => {
                                              setVariables(prev => ({
                                                ...prev,
                                                [varName]: html
                                              }));
                                            }}
                                            onFocus={() => scrollToSection(section.id)}
                                            placeholder={`Enter value for ${varName}...`}
                                            singleLine={section.type.startsWith('heading')}
                                          />
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* For banner without placeholders, show simple input */}
                                {isBanner && !hasPlaceholders && isEditable && (
                                  <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/20">
                                    <Input
                                      value={rawContent}
                                      onChange={(e) => {
                                        setVariables(prev => ({
                                          ...prev,
                                          [bannerKey]: e.target.value
                                        }));
                                      }}
                                      onFocus={() => scrollToSection(section.id)}
                                      placeholder="Enter banner text..."
                                      className="text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          // Handle standalone list sections
                          if (['bullet-list-circle', 'bullet-list-disc', 'bullet-list-square', 'number-list-1', 'number-list-i', 'number-list-a'].includes(section.type)) {
                            const listVarName = section.variables?.listVariableName as string || section.id;
                            const editable = isLabelEditable(listVarName);
                            
                            return (
                              <div key={section.id} className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Label className="text-sm font-medium cursor-help mb-2 inline-block">
                                      {listVarName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </Label>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" side="top" align="start">
                                    <span className="text-xs text-muted-foreground">{listVarName}</span>
                                  </PopoverContent>
                                </Popover>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setListVariables(prev => ({
                                          ...prev,
                                          [listVarName]: [...(prev[listVarName] || []), ''] as string[] | ListItemStyle[]
                                        }));
                                      }}
                                      className="h-7 px-2"
                                      disabled={!editable}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Item
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {((listVariables[listVarName] || ['']) as (string | ListItemStyle)[]).map((item, index) => {
                                      const itemValue = typeof item === 'object' && 'text' in item ? item.text : item as string;
                                      
                                      return (
                                        <div key={index} className={styles.listItemRow}>
                                          <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                                          <RichTextEditor
                                            value={itemValue}
                                            onChange={(html) => {
                                              setListVariables(prev => {
                                                const newItems = [...(prev[listVarName] || [])] as (string | ListItemStyle)[];
                                                newItems[index] = html;
                                                return { ...prev, [listVarName]: newItems as string[] | ListItemStyle[] };
                                              });
                                            }}
                                            onFocus={() => scrollToSection(section.id)}
                                            placeholder={`Item ${index + 1}`}
                                            singleLine
                                            className="flex-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => {
                                              setListVariables(prev => {
                                                const items = prev[listVarName] || [];
                                                if (items.length > 1) {
                                                  return { ...prev, [listVarName]: items.filter((_, i) => i !== index) as string[] | ListItemStyle[] };
                                                }
                                                return prev;
                                              });
                                            }}
                                            disabled={!editable}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          // Handle standalone table sections
                          if (section.type === 'table') {
                            const editable = isLabelEditable(section.id);
                            const tableData = tableVariables[section.id] || getTableData(section.id);
                            
                            return (
                              <div key={section.id} className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}>
                                <div className="space-y-2 border rounded-lg p-4 bg-background">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-muted-foreground">Table</p>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setJsonImportOpen(section.id);
                                          setJsonImportValue('');
                                        }}
                                        className="h-7 px-2"
                                        disabled={!editable}
                                      >
                                        <FileJson className="h-3 w-3 mr-1" />
                                        JSON
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setTableVariables(prev => ({
                                            ...prev,
                                            [section.id]: {
                                              ...tableData,
                                              headers: [...(tableData.headers || []), `Column ${(tableData.headers?.length || 0) + 1}`]
                                            }
                                          }));
                                        }}
                                        className="h-7 px-2"
                                        disabled={!editable}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Column
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const newRow = new Array(tableData.headers?.length || 1).fill('');
                                          setTableVariables(prev => ({
                                            ...prev,
                                            [section.id]: {
                                              ...tableData,
                                              rows: [...(tableData.rows || []), newRow]
                                            }
                                          }));
                                        }}
                                        className="h-7 px-2"
                                        disabled={!editable}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Row
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {tableData.headers && tableData.headers.length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse border text-sm">
                                        <thead>
                                          <tr>
                                            {tableData.headers.map((header: string, colIdx: number) => (
                                              <th key={colIdx} className="border p-1 bg-muted">
                                                <div className="flex items-center gap-1">
                                                  <RichTextEditor
                                                    value={header}
                                                    onChange={(html) => {
                                                      const newHeaders = [...tableData.headers];
                                                      newHeaders[colIdx] = html;
                                                      setTableVariables(prev => ({
                                                        ...prev,
                                                        [section.id]: { ...tableData, headers: newHeaders }
                                                      }));
                                                    }}
                                                    placeholder={`Header ${colIdx + 1}`}
                                                    singleLine
                                                    className="flex-1 font-semibold"
                                                  />
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => {
                                                      const newHeaders = tableData.headers.filter((_: any, i: number) => i !== colIdx);
                                                      const newRows = tableData.rows.map((row: string[]) => 
                                                        row.filter((_: any, i: number) => i !== colIdx)
                                                      );
                                                      setTableVariables(prev => ({
                                                        ...prev,
                                                        [section.id]: { headers: newHeaders, rows: newRows }
                                                      }));
                                                    }}
                                                    className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                                                    disabled={!editable || tableData.headers.length <= 1}
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(tableData.rows || []).map((row: string[], rowIdx: number) => (
                                            <tr key={rowIdx}>
                                              {row.map((cell: string, colIdx: number) => (
                                                <td key={colIdx} className="border p-1">
                                                  <RichTextEditor
                                                    value={cell}
                                                    onChange={(html) => {
                                                      const newRows = [...tableData.rows];
                                                      newRows[rowIdx][colIdx] = html;
                                                      setTableVariables(prev => ({
                                                        ...prev,
                                                        [section.id]: { ...tableData, rows: newRows }
                                                      }));
                                                    }}
                                                    placeholder={`R${rowIdx + 1}C${colIdx + 1}`}
                                                    singleLine
                                                  />
                                                </td>
                                              ))}
                                              <td className="border p-1 w-8">
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  onClick={() => {
                                                    const newRows = tableData.rows.filter((_: any, i: number) => i !== rowIdx);
                                                    setTableVariables(prev => ({
                                                      ...prev,
                                                      [section.id]: { ...tableData, rows: newRows }
                                                    }));
                                                  }}
                                                  className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                                                  disabled={!editable}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-4">Click "Column" to start</p>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          return null;
                        })}
                      </>
                    );
                  })()}
                  </div>
                </ScrollArea>
            </div>

            {/* Right Panel - Preview (Email Body) */}
            <div className={styles.previewPanel} id="preview-panel">
              <div className={styles.previewPanelHeader}>
                <h2>
                  <Eye className="h-4 w-4" />
                  Email Body Preview
                </h2>
              </div>
              <ScrollArea className="flex-1" id="preview-scroll-area">
                <div className={styles.previewBody}>
                  {selectedTemplate.sections && selectedTemplate.sections.length > 0 ? (
                    <div className={styles.previewContent}>
                      {selectedTemplate.sections.map((section, sectionIndex) => {
                        const runtimeVars: Record<string, string | string[] | any> = {
                          ...variables,
                          ...listVariables,
                          ...tableVariables,
                          ...labelVariables
                        };
                        
                        // Helper to apply editedSectionContent to section and its children
                        const applyEditedContent = (s: Section): Section => {
                          let updated = s;
                          
                          // For labeled-content sections, inject updated label from labelVariables
                          if (s.type === 'labeled-content') {
                            const labelVarName = (s.variables?.labelVariableName as string) || `label_${s.id}`;
                            if (labelVariables[labelVarName]) {
                              updated = {
                                ...updated,
                                variables: {
                                  ...updated.variables,
                                  label: labelVariables[labelVarName]
                                }
                              };
                            }
                          }
                          
                          // For heading/text/paragraph sections, inject edited content
                          if (['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'].includes(s.type)) {
                            if (editedSectionContent[s.id] !== undefined) {
                              updated = {
                                ...updated,
                                content: editedSectionContent[s.id]
                              };
                            }
                          }
                          
                          // For banner sections, inject updated text into tableData
                          if (s.type === 'banner') {
                            const bannerKey = `banner_${s.id}`;
                            if (variables[bannerKey] !== undefined) {
                              const currentTableData = (s.variables?.tableData as any) || { rows: [['']], cellStyles: {} };
                              updated = {
                                ...updated,
                                variables: {
                                  ...updated.variables,
                                  tableData: {
                                    ...currentTableData,
                                    rows: [[variables[bannerKey] as string]]
                                  }
                                }
                              };
                            }
                          }
                          
                          // Recursively apply to children
                          if (updated.children && updated.children.length > 0) {
                            updated = {
                              ...updated,
                              children: updated.children.map(applyEditedContent)
                            };
                          }
                          
                          return updated;
                        };
                        
                        const sectionToRender = applyEditedContent(section);
                        
                        return (
                          <div 
                            key={section.id} 
                            id={`preview-section-${section.id}`}
                            dangerouslySetInnerHTML={{ __html: wrapSectionInTable(renderSectionContent(sectionToRender, runtimeVars), sectionIndex === 0) }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      dangerouslySetInnerHTML={{ __html: replaceVariables(selectedTemplate.html, variables, listVariables) }}
                      className={styles.previewContent}
                    />
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Dialog */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto space-y-4">
            {/* Subject Preview */}
            <div className="bg-muted/50 rounded-lg p-4 border">
              <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
              <p className="text-lg font-semibold mt-1">
                {selectedTemplate?.subject && Object.keys(subjectVariables).length > 0 
                  ? getProcessedSubject() 
                  : emailSubject || '(No subject)'}
              </p>
            </div>

            {/* Recipients Preview */}
            <div className="bg-muted/50 rounded-lg p-4 border space-y-2">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">To</Label>
                <p className="text-sm">{toEmails || '(No recipients)'}</p>
              </div>
              {ccEmails && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">CC</Label>
                  <p className="text-sm">{ccEmails}</p>
                </div>
              )}
              {bccEmails && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">BCC</Label>
                  <p className="text-sm">{bccEmails}</p>
                </div>
              )}
            </div>

            {/* Email Body Preview */}
            <div className="border rounded-lg p-4 bg-white">
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Email Body</Label>
              <ScrollArea className="h-[400px]">
                <div
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                  className={styles.previewContent}
                />
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEmailPreview(false)}>
              Close
            </Button>
            <Button onClick={() => { setShowEmailPreview(false); handleSendTemplate(); }}>
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Import Dialog */}
      <Dialog open={jsonImportOpen !== null} onOpenChange={(open) => !open && setJsonImportOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import JSON Data to Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste JSON array data below. Each object's properties will become columns, and each object will become a row.
            </p>
            <Textarea
              value={jsonImportValue}
              onChange={(e) => setJsonImportValue(e.target.value)}
              placeholder={'[\n  { "name": "John", "email": "john@example.com", "status": "Active" },\n  { "name": "Jane", "email": "jane@example.com", "status": "Pending" }\n]'}
              className="font-mono text-xs min-h-[200px]"
            />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Supported formats:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Array of objects: <code>[{"{"}"key": "value"{"}"}, ...]</code></li>
                <li>Single object (creates one row): <code>{"{"}"key": "value"{"}"}</code></li>
                <li>Nested paths supported: <code>user.name</code>, <code>items[0].value</code></li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJsonImportOpen(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (!jsonImportOpen) return;
              try {
                const parsed = JSON.parse(jsonImportValue);
                const dataArray = Array.isArray(parsed) ? parsed : [parsed];
                
                if (dataArray.length === 0) {
                  toast({
                    title: "Empty data",
                    description: "JSON data is empty",
                    variant: "destructive"
                  });
                  return;
                }

                // Auto-detect columns from first object
                const firstItem = dataArray[0];
                const keys = Object.keys(firstItem);
                
                if (keys.length === 0) {
                  toast({
                    title: "No properties",
                    description: "No properties found in JSON data",
                    variant: "destructive"
                  });
                  return;
                }

                // Create headers from keys
                const headers = keys.map(key => 
                  key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
                );
                
                // Create rows from data
                const rows = dataArray.map(item => 
                  keys.map(key => {
                    const value = getValueByPath(item, key);
                    return value !== undefined && value !== null ? String(value) : '';
                  })
                );

                setTableVariables(prev => ({
                  ...prev,
                  [jsonImportOpen]: { headers, rows }
                }));

                toast({
                  title: "Data imported",
                  description: `Imported ${dataArray.length} rows with ${keys.length} columns`
                });
                
                setJsonImportOpen(null);
                setJsonImportValue('');
              } catch (e) {
                toast({
                  title: "Invalid JSON",
                  description: "Please check your JSON format and try again",
                  variant: "destructive"
                });
              }
            }}>
              <FileJson className="h-4 w-4 mr-2" />
              Import Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RunTemplates;
