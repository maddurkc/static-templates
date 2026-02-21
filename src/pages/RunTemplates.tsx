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
import { ArrowLeft, Send, Calendar, PlayCircle, Plus, Trash2, Eye, Loader2, FileJson, Pencil, Check, RefreshCw } from "lucide-react";
import { RichTextEditor } from "@/components/templates/RichTextEditor";
import { TableEditor } from "@/components/templates/TableEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getTemplates, Template } from "@/lib/templateStorage";
import { fetchTemplates, fetchTemplateById, resendDataToTemplate } from "@/lib/templateApi";
import { Section, ListItemStyle, TextStyle } from "@/types/section";
import { renderSectionContent, wrapInEmailHtml, wrapSectionInTable, wrapInGlobalTable } from "@/lib/templateUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { subjectThymeleafToPlaceholder, processSubjectWithValues } from "@/lib/thymeleafUtils";
import { UserAutocomplete, User } from "@/components/templates/UserAutocomplete";
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
  const [toUsers, setToUsers] = useState<User[]>([]);
  const [ccUsers, setCcUsers] = useState<User[]>([]);
  const [bccUsers, setBccUsers] = useState<User[]>([]);
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
  const [resendMode, setResendMode] = useState(false); // Flag to skip default init when loading last sent
  const skipVariableInitRef = React.useRef(false); // Ref to prevent useEffect from overwriting restored variables
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
          if (resendMode) {
            // Resend mode: load last sent payload instead of defaults
            loadLastSentPayload(template);
            setResendMode(false);
          } else {
            handleRunTemplate(template);
          }
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
      // Skip variable initialization if we just restored from last sent payload
      if (skipVariableInitRef.current) {
        skipVariableInitRef.current = false;
        return;
      }
      const vars = extractAllVariables(selectedTemplate);
      const initialVars: Record<string, string | TextStyle> = {};
      const initialListVars: Record<string, string[] | ListItemStyle[]> = {};
      const initialTableVars: Record<string, any> = {};
      const initialLabelVars: Record<string, string> = {};
      
      vars.forEach(v => {
        const defaultVal = getDefaultValue(v);
        if (isTableVariable(v)) {
          // Use full tableData (including headerStyle, cellStyles, etc.) for proper preview rendering
          initialTableVars[v] = getFullTableData(v);
        } else if (Array.isArray(defaultVal)) {
          initialListVars[v] = defaultVal.length > 0 ? defaultVal : [''];
        } else {
          initialVars[v] = String(defaultVal);
        }
      });
      
      // Initialize label and text content variables from labeled-content sections
      if (selectedTemplate.sections) {
        selectedTemplate.sections.forEach(section => {
          if (section.type === 'labeled-content') {
            // Use stored labelVariableName, fallback to section.id for backward compatibility
            const labelVarName = (section.variables?.labelVariableName as string) || `label_${section.id}`;
            
            // Priority: Get the actual stored value for the label variable, preserving HTML styling
            let labelValue = 'Label';
            if (labelVarName && section.variables?.[labelVarName] !== undefined) {
              // New pattern: Use the resolved value stored under the variable name
              // Preserve HTML content as-is (don't convert to plain string if it has HTML)
              const storedValue = section.variables[labelVarName];
              labelValue = typeof storedValue === 'string' ? storedValue : String(storedValue);
            } else if (section.variables?.label) {
              // Legacy pattern: Use the label field, but resolve any Thymeleaf tags
              const rawLabel = String(section.variables.label);
              labelValue = rawLabel
                .replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (_, varName) => {
                  // Try to get the actual value from section.variables (preserve HTML)
                  if (section.variables && section.variables[varName] !== undefined) {
                    const val = section.variables[varName];
                    return typeof val === 'string' ? val : String(val);
                  }
                  return `{{${varName}}}`;
                })
                .replace(/<th:utext="\$\{(\w+)\}">/g, (_, varName) => {
                  if (section.variables && section.variables[varName] !== undefined) {
                    const val = section.variables[varName];
                    return typeof val === 'string' ? val : String(val);
                  }
                  return `{{${varName}}}`;
                });
            }
            initialLabelVars[labelVarName] = labelValue;
            
            // Initialize text content for text type labeled-content sections
            const contentType = section.variables?.contentType || 'text';
            if (contentType === 'text') {
              const textVarName = (section.variables?.textVariableName as string) || section.id;
              let textValue = '';
              
              if (textVarName && section.variables?.[textVarName] !== undefined) {
                // New pattern: Use the resolved value stored under the variable name
                textValue = String(section.variables[textVarName]);
              } else if (section.variables?.content) {
                // Legacy pattern: Use the content field, but resolve any Thymeleaf tags
                const rawContent = section.variables.content as string;
                textValue = rawContent
                  .replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (_, varName) => {
                    if (section.variables && section.variables[varName] !== undefined) {
                      return String(section.variables[varName]);
                    }
                    return `{{${varName}}}`;
                  });
              }
              
              // Only set if we have a value
              if (textValue) {
                initialVars[textVarName] = textValue;
              }
            }
          }
          
          // Initialize date section variables
          if (section.type === 'date') {
            const dateVarName = (section.variables?.dateVariableName as string) || `dateValue_${section.id}`;
            const dateValue = (section.variables?.[dateVarName] as string) ||
                              (section.variables?.dateValue as string) ||
                              new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
            initialVars[dateVarName] = dateValue;
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

  // Get full table data including styling properties (headerStyle, cellStyles, borderColor, etc.)
  const getFullTableData = (varName: string): any => {
    if (!selectedTemplate?.sections) return { headers: ['Column 1'], rows: [['Data 1']] };
    
    for (const section of selectedTemplate.sections) {
      if (section.type === 'labeled-content' && section.id === varName && section.variables?.contentType === 'table') {
        const tableData = section.variables.tableData;
        if (tableData) return { ...tableData };
      }
      if (section.type === 'table' && section.id === varName) {
        const tableData = section.variables?.tableData;
        if (tableData) return { ...tableData };
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
            return (section.variables.items as (string | ListItemStyle)[]) || [''];
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
        if ((listVarName && listVarName === varName) || section.id === varName) {
          return (section.variables?.items as (string | ListItemStyle)[]) || [''];
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
      
      // For heading/text sections with inline placeholders or dynamic variable names
      const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
      if (inlinePlaceholderTypes.includes(section.type)) {
        // Check if this varName matches the stored textVariableName
        const textVarName = section.variables?.textVariableName as string;
        if (textVarName && textVarName === varName) {
          // Get the default value from section.variables stored value or use type-based default
          const storedValue = section.variables?.[varName];
          if (storedValue !== undefined) {
            return String(storedValue);
          }
          // Return type-based default
          if (section.type.startsWith('heading')) {
            const level = section.type.replace('heading', '');
            const defaults: Record<string, string> = {
              '1': 'Main Title',
              '2': 'Section Title',
              '3': 'Subsection Title',
              '4': 'Minor Title',
              '5': 'Small Title',
              '6': 'Tiny Title'
            };
            return defaults[level] || 'Title';
          }
          if (section.type === 'text') return 'Your text here';
          if (section.type === 'paragraph') return 'This is a paragraph. You can add more text here.';
          return '';
        }
        // Fallback to checking if variable exists directly
        if (section.variables && section.variables[varName] !== undefined) {
          return String(section.variables[varName]);
        }
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
      
      // Check heading/text sections with inline placeholders or dynamic variable names
      const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
      if (inlinePlaceholderTypes.includes(section.type)) {
        // Check if this matches the stored textVariableName
        const textVarName = section.variables?.textVariableName as string;
        if (textVarName && textVarName === varName) {
          const typeLabel = section.type.replace(/(\d)/, ' $1').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return {
            sectionType: typeLabel,
            context: `Editable ${typeLabel.toLowerCase()} content`
          };
        }
        
        // Also check for inline {{placeholder}} syntax
        if (section.content && section.content.includes(`{{${varName}}}`)) {
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
    'listVariableName', 'listHtml', 'labelColor', 'textVariableName', 'labelVariableName'
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
          
          // For list content, use the stored listVariableName or fallback to section.id
          if (section.variables?.contentType === 'list') {
            const listVarName = (section.variables.listVariableName as string) || section.id;
            varsFromSections.add(listVarName);
            
            // Extract placeholders from list items
            const items = section.variables?.items as (string | ListItemStyle)[];
            if (items && Array.isArray(items)) {
              items.forEach(item => {
                const itemText = typeof item === 'object' ? item.text : item;
                if (itemText) {
                  // Extract {{placeholder}} patterns
                  const placeholderMatches = itemText.match(/\{\{(\w+)\}\}/g) || [];
                  placeholderMatches.forEach((match: string) => {
                    const varName = match.replace(/\{\{|\}\}/g, '');
                    varsFromSections.add(varName);
                  });
                  // Also extract Thymeleaf variables
                  const thymeleafVars = extractVariables(itemText);
                  thymeleafVars.forEach(v => varsFromSections.add(v));
                }
              });
            }
          } else if (section.variables?.contentType === 'table') {
            // For table content, use section ID as the variable key
            varsFromSections.add(section.id);
          } else {
            // For text content, use textVariableName or section ID as the variable key
            const textVarName = (section.variables?.textVariableName as string) || section.id;
            varsFromSections.add(textVarName);
            
            // Extract placeholders from text content
            const textContent = section.variables?.[textVarName] as string || section.variables?.content as string || '';
            if (textContent) {
              // Extract {{placeholder}} patterns
              const placeholderMatches = textContent.match(/\{\{(\w+)\}\}/g) || [];
              placeholderMatches.forEach((match: string) => {
                const varName = match.replace(/\{\{|\}\}/g, '');
                varsFromSections.add(varName);
              });
              // Also extract Thymeleaf variables
              const thymeleafVars = extractVariables(textContent);
              thymeleafVars.forEach(v => varsFromSections.add(v));
            }
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
        if (inlinePlaceholderTypes.includes(section.type)) {
          // Use stored textVariableName if available (new dynamic naming)
          const textVarName = section.variables?.textVariableName as string;
          if (textVarName) {
            varsFromSections.add(textVarName);
          }
          
          // Also extract any custom placeholders from content
          if (section.content) {
            const placeholderMatches = section.content.match(/\{\{(\w+)\}\}/g) || [];
            placeholderMatches.forEach(match => {
              const varName = match.replace(/\{\{|\}\}/g, '');
              varsFromSections.add(varName);
            });
            
            // Also extract Thymeleaf variables from content
            const contentVars = extractVariables(section.content);
            contentVars.forEach(v => varsFromSections.add(v));
          }
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

  // Build a CSS style string for a cell to apply on <td> element
  const buildCellStyleString = (cellStyle?: any, baseCellStyle?: string): string => {
    const parts: string[] = [];
    if (baseCellStyle) parts.push(baseCellStyle);
    if (!cellStyle) return parts.join('; ');
    if (cellStyle.color) parts.push(`color: ${cellStyle.color}`);
    if (cellStyle.bold) parts.push('font-weight: bold');
    if (cellStyle.italic) parts.push('font-style: italic');
    if (cellStyle.underline) parts.push('text-decoration: underline');
    if (cellStyle.backgroundColor) parts.push(`background-color: ${cellStyle.backgroundColor}`);
    if (cellStyle.fontSize) parts.push(`font-size: ${cellStyle.fontSize}`);
    return parts.join('; ');
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
    if (toUsers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one recipient.",
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
    
    // Table variables are handled below in the per-section loop (standalone table + labeled-content table blocks)
    // to correctly merge runtime edits with original metadata (isStatic, jsonMapping, tableVariableName).
    
    // Add label variables
    Object.entries(labelVariables).forEach(([key, value]) => {
      bodyData[key] = value;
    });
    
    // Add CTA Text and Program Name section variables
    if (selectedTemplate.sections) {
      selectedTemplate.sections.forEach(section => {
        if (section.type === 'cta-text') {
          const ctaTextKey = `ctaText_${section.id}`;
          const ctaUrlKey = `ctaUrl_${section.id}`;
          const ctaText = variables[ctaTextKey] || section.variables?.ctaText || 'Call to action&nbsp;>';
          const ctaUrl = variables[ctaUrlKey] || section.variables?.ctaUrl || '#';
          bodyData[ctaTextKey] = generateStyledHtml(ctaText);
          bodyData[ctaUrlKey] = typeof ctaUrl === 'string' ? ctaUrl : (ctaUrl as TextStyle).text || '#';
        }
        // Program-name uses static variable name (single-use section)
        if (section.type === 'program-name') {
          const programName = variables['programNameText'] || section.variables?.programNameText || 'Program Name';
          bodyData['programNameText'] = generateStyledHtml(programName);
        }
        
        // Date sections - add date value to payload
        if (section.type === 'date') {
          const dateVarName = (section.variables?.dateVariableName as string) || `dateValue_${section.id}`;
          const dateValue = variables[dateVarName] || 
                            section.variables?.[dateVarName] ||
                            section.variables?.dateValue || 
                            new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
          bodyData[dateVarName] = typeof dateValue === 'string' ? dateValue : String(dateValue);
        }
        
        // Add heading/text/paragraph section variables using textVariableName
        // Include edited content from editedSectionContent state
        const textBasedTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
        if (textBasedTypes.includes(section.type)) {
          const textVarName = section.variables?.textVariableName as string;
          if (textVarName) {
            // Check if section has been edited - use editedSectionContent first
            let textValue: string | TextStyle = '';
            
            if (editedSectionContent[section.id] !== undefined) {
              // Section was edited - use the edited content directly
              textValue = editedSectionContent[section.id];
            } else if (variables[textVarName] !== undefined) {
              // Use variable state value
              textValue = variables[textVarName];
            } else if (section.variables?.[textVarName] !== undefined) {
              // Fallback to section's stored variable
              textValue = section.variables[textVarName] as string;
            }
            
            bodyData[textVarName] = generateStyledHtml(textValue);
          }
          
          // Also include any additional inline placeholders from edited content
          if (editedSectionContent[section.id] !== undefined) {
            const editedContent = editedSectionContent[section.id];
            // Extract all placeholders from the edited content and add their values
            const placeholderMatches = editedContent.match(/\{\{(\w+)\}\}/g) || [];
            placeholderMatches.forEach(match => {
              const varName = match.replace(/\{\{|\}\}/g, '');
              if (variables[varName] !== undefined) {
                bodyData[varName] = generateStyledHtml(variables[varName]);
              }
            });
          }
        }
        
        // Add labeled-content section custom placeholders to payload
        if (section.type === 'labeled-content') {
          const contentType = section.variables?.contentType || 'text';
          
          // For text type - extract placeholders from text content
          if (contentType === 'text') {
            const textVarName = (section.variables?.textVariableName as string) || section.id;
            let textContent = '';
            
            // Get the text content (from variables state or section.variables)
            if (variables[textVarName] !== undefined) {
              const val = variables[textVarName];
              textContent = typeof val === 'object' && val !== null && 'text' in val 
                ? (val as TextStyle).text 
                : String(val);
            } else if (section.variables?.[textVarName] !== undefined) {
              textContent = String(section.variables[textVarName]);
            }
            
            // Extract and add all placeholders from the text content
            const placeholderMatches = textContent.match(/\{\{(\w+)\}\}/g) || [];
            placeholderMatches.forEach(match => {
              const varName = match.replace(/\{\{|\}\}/g, '');
              if (variables[varName] !== undefined) {
                bodyData[varName] = generateStyledHtml(variables[varName]);
              }
            });
            
            // Also add the main text variable with placeholders resolved
            if (textContent) {
              let resolvedContent = textContent;
              placeholderMatches.forEach(match => {
                const varName = match.replace(/\{\{|\}\}/g, '');
                if (variables[varName] !== undefined) {
                  const val = variables[varName];
                  const resolvedVal = typeof val === 'object' && val !== null && 'text' in val 
                    ? (val as TextStyle).text 
                    : String(val);
                  resolvedContent = resolvedContent.replace(match, resolvedVal);
                }
              });
              bodyData[textVarName] = resolvedContent;
            }
          }
          
          // For list type - extract placeholders from list items
          if (contentType === 'list') {
            const listVarName = (section.variables?.listVariableName as string) || `items_${section.id}`;
            const items = listVariables[listVarName] || section.variables?.items || [];
            
            if (Array.isArray(items)) {
              items.forEach((item: any) => {
                const itemText = typeof item === 'object' && 'text' in item ? item.text : String(item);
                const placeholderMatches = itemText.match(/\{\{(\w+)\}\}/g) || [];
                placeholderMatches.forEach((match: string) => {
                  const varName = match.replace(/\{\{|\}\}/g, '');
                  if (variables[varName] !== undefined) {
                    bodyData[varName] = generateStyledHtml(variables[varName]);
                  }
                });
              });
              
              // Also add the list items with placeholders resolved
              const resolvedItems = items.map((item: any) => {
                const itemText = typeof item === 'object' && 'text' in item ? item.text : String(item);
                let resolvedText = itemText;
                const placeholderMatches = itemText.match(/\{\{(\w+)\}\}/g) || [];
                placeholderMatches.forEach((match: string) => {
                  const varName = match.replace(/\{\{|\}\}/g, '');
                  if (variables[varName] !== undefined) {
                    const val = variables[varName];
                    const resolvedVal = typeof val === 'object' && val !== null && 'text' in val 
                      ? (val as TextStyle).text 
                      : String(val);
                    resolvedText = resolvedText.replace(match, resolvedVal);
                  }
                });
                
                // Preserve styling if present
                if (typeof item === 'object' && 'text' in item) {
                  return { ...item, text: resolvedText };
                }
                return resolvedText;
              });
              
              bodyData[listVarName] = resolvedItems.map((item: any) => {
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
            }
          }
          
          // Extract placeholders from label as well
          const labelVarName = (section.variables?.labelVariableName as string) || `label_${section.id}`;
          const labelValue = labelVariables[labelVarName] || section.variables?.label || '';
          if (typeof labelValue === 'string') {
            const labelPlaceholders = labelValue.match(/\{\{(\w+)\}\}/g) || [];
            labelPlaceholders.forEach(match => {
              const varName = match.replace(/\{\{|\}\}/g, '');
              if (variables[varName] !== undefined) {
                bodyData[varName] = generateStyledHtml(variables[varName]);
              }
            });
          }
        }
        
        // Standalone table sections - ensure table data is in payload even if not edited
        if (section.type === 'table') {
          const originalTableData = section.variables?.tableData;
          const tableData = { ...originalTableData, ...tableVariables[section.id] };
          if (tableData && tableData.rows && Array.isArray(tableData.rows)) {
            const hasHeaders = tableData.headers && Array.isArray(tableData.headers);
            const headers = hasHeaders ? tableData.headers : (tableData.rows[0] || []);
            const dataRows = hasHeaders ? tableData.rows : (tableData.rows.slice(1) || []);
            
            if (tableData.isStatic === false && tableData.jsonMapping?.columnMappings?.length) {
              const payloadKey = tableData.tableVariableName || section.id;
              const headerPosition = tableData.headerPosition || 'first-row';
              
              // Send headers variable for first-row header position
               if (headerPosition === 'first-row' && tableData.headerVariableName) {
                const hs = tableData.headerStyle;
                const defaultHeaderStyle = `background-color: ${hs?.backgroundColor || '#FFC000'}; color: ${hs?.textColor || 'inherit'}; font-weight: ${hs?.bold !== false ? 'bold' : 'normal'};`;
                const headerValues = tableData.jsonMapping.columnMappings.map((m: any, idx: number) => {
                  const cellStyleKey = hasHeaders ? `h-${idx}` : `0-${idx}`;
                  const cellStyle = tableData.cellStyles?.[cellStyleKey];
                  const customStyle = buildCellStyleString(cellStyle);
                  return {
                    value: m.header,
                    style: customStyle || defaultHeaderStyle
                  };
                });
                if (!bodyData[tableData.headerVariableName]) {
                  bodyData[tableData.headerVariableName] = headerValues;
                }
              }
              
              if (!bodyData[payloadKey]) {
                if (headerPosition === 'first-column') {
                  bodyData[payloadKey] = dataRows.map((row: string[], rowIdx: number) => {
                    const obj: Record<string, string> = {};
                    tableData.jsonMapping.columnMappings.forEach((mapping: any, idx: number) => {
                      const cellValue = row[idx] || '';
                      const cellStyleKey = `${rowIdx}-${idx}`;
                      const cellStyle = tableData.cellStyles?.[cellStyleKey];
                      if (idx === 0) {
                       obj['header'] = cellValue;
                        obj['header_style'] = buildCellStyleString(cellStyle) || (() => {
                          const hs = tableData.headerStyle;
                          return `background-color: ${hs?.backgroundColor || '#FFC000'}; color: ${hs?.textColor || 'inherit'}; font-weight: ${hs?.bold !== false ? 'bold' : 'normal'};`;
                        })();
                      } else {
                        obj['value'] = cellValue;
                        obj['value_style'] = buildCellStyleString(cellStyle);
                      }
                    });
                    return obj;
                  });
                } else {
                  bodyData[payloadKey] = dataRows.map((row: string[], rowIdx: number) => {
                    const obj: Record<string, string> = {};
                    tableData.jsonMapping.columnMappings.forEach((mapping: any, idx: number) => {
                      const cellValue = row[idx] || '';
                      const cellStyleKey = `${rowIdx}-${idx}`;
                      const cellStyle = tableData.cellStyles?.[cellStyleKey];
                      obj[mapping.jsonPath] = cellValue;
                      obj[`${mapping.jsonPath}_style`] = buildCellStyleString(cellStyle);
                    });
                    return obj;
                  });
                }
              }
            } else {
              if (!bodyData[section.id]) {
                bodyData[section.id] = { headers, rows: dataRows };
              }
            }
          }
        }
        
        // Labeled-content table sections - ensure table data is in payload
        if (section.type === 'labeled-content' && section.variables?.contentType === 'table') {
          const originalTableData = section.variables?.tableData;
          const tableData = { ...originalTableData, ...tableVariables[section.id] };
          if (tableData && tableData.rows && Array.isArray(tableData.rows)) {
            const hasHeaders = tableData.headers && Array.isArray(tableData.headers);
            const headers = hasHeaders ? tableData.headers : (tableData.rows[0] || []);
            const dataRows = hasHeaders ? tableData.rows : (tableData.rows.slice(1) || []);
            
            if (tableData.isStatic === false && tableData.jsonMapping?.columnMappings?.length) {
              const payloadKey = tableData.tableVariableName || section.id;
              const headerPosition = tableData.headerPosition || 'first-row';
              
              // Send headers variable for first-row header position
               if (headerPosition === 'first-row' && tableData.headerVariableName) {
                const hs = tableData.headerStyle;
                const defaultHeaderStyle = `background-color: ${hs?.backgroundColor || '#FFC000'}; color: ${hs?.textColor || 'inherit'}; font-weight: ${hs?.bold !== false ? 'bold' : 'normal'};`;
                const headerValues = tableData.jsonMapping.columnMappings.map((m: any, idx: number) => {
                  const cellStyleKey = hasHeaders ? `h-${idx}` : `0-${idx}`;
                  const cellStyle = tableData.cellStyles?.[cellStyleKey];
                  const customStyle = buildCellStyleString(cellStyle);
                  return {
                    value: m.header,
                    style: customStyle || defaultHeaderStyle
                  };
                });
                if (!bodyData[tableData.headerVariableName]) {
                  bodyData[tableData.headerVariableName] = headerValues;
                }
              }
              
              if (!bodyData[payloadKey]) {
                if (headerPosition === 'first-column') {
                  bodyData[payloadKey] = dataRows.map((row: string[], rowIdx: number) => {
                    const obj: Record<string, string> = {};
                    tableData.jsonMapping.columnMappings.forEach((mapping: any, idx: number) => {
                      const cellValue = row[idx] || '';
                      const cellStyleKey = `${rowIdx}-${idx}`;
                      const cellStyle = tableData.cellStyles?.[cellStyleKey];
                      if (idx === 0) {
                       obj['header'] = cellValue;
                        obj['header_style'] = buildCellStyleString(cellStyle) || (() => {
                          const hs = tableData.headerStyle;
                          return `background-color: ${hs?.backgroundColor || '#FFC000'}; color: ${hs?.textColor || 'inherit'}; font-weight: ${hs?.bold !== false ? 'bold' : 'normal'};`;
                        })();
                      } else {
                        obj['value'] = cellValue;
                        obj['value_style'] = buildCellStyleString(cellStyle);
                      }
                    });
                    return obj;
                  });
                } else {
                  bodyData[payloadKey] = dataRows.map((row: string[], rowIdx: number) => {
                    const obj: Record<string, string> = {};
                    tableData.jsonMapping.columnMappings.forEach((mapping: any, idx: number) => {
                      const cellValue = row[idx] || '';
                      const cellStyleKey = `${rowIdx}-${idx}`;
                      const cellStyle = tableData.cellStyles?.[cellStyleKey];
                      obj[mapping.jsonPath] = cellValue;
                      obj[`${mapping.jsonPath}_style`] = buildCellStyleString(cellStyle);
                    });
                    return obj;
                  });
                }
              }
            } else {
              if (!bodyData[section.id]) {
                bodyData[section.id] = { headers, rows: dataRows };
              }
            }
          }
        }
      });
    }

    // Generate full rendered HTML with email wrapper for Outlook/email client compatibility
    const allVars: Record<string, string | string[] | any> = {
      ...variables,
      ...listVariables,
      ...tableVariables,
      ...labelVariables
    };
    const sectionRows = selectedTemplate.sections
      .map((section, index) => wrapSectionInTable(renderSectionContent(section, allVars), index === 0))
      .join('');
    const renderedBodyHtml = wrapInGlobalTable(sectionRows);
    const fullEmailHtml = wrapInEmailHtml(renderedBodyHtml);

    // Build the payload in the requested format
    const payload = {
      templateId: selectedTemplate.id,
      toEmails: toUsers.map(u => u.email),
      ccEmails: ccUsers.map(u => u.email),
      bccEmails: bccUsers.map(u => u.email),
      contentData: {
        subject_data: { ...subjectVariables },
        body_data: bodyData
      },
      renderedHtml: fullEmailHtml
    };

    console.log("Email Payload:", JSON.stringify(payload, null, 2));

    // Save last sent payload in resend format (messageDetails + templateConfigData)
    const resendPayload = {
      messageDetails: {
        messageRequestData: {
          recipients: toUsers.map(u => u.email),
          ccEmails: ccUsers.map(u => u.email),
          bccEmails: bccUsers.map(u => u.email),
          contentData: {
            subject_data: { ...subjectVariables },
            body_data: bodyData,
          },
        },
        sentAt: new Date().toISOString(),
      },
      templateConfigData: {
        templateConfigName: selectedTemplate.name,
        templateId: selectedTemplate.id,
        content: {
          subjectContent: finalSubject,
          sections: (selectedTemplate.sections || []).map((s, idx) => ({
            templateConfigSectionId: s.id,
            sectionType: s.type,
            content: s.content,
            variables: s.variables || {},
            styles: s.styles || {},
            isLabelEditable: s.isLabelEditable ?? true,
            orderIndex: s.order ?? idx,
            childSections: (s.children || []).map((child, ci) => ({
              templateConfigSectionId: child.id,
              sectionType: child.type,
              content: child.content,
              variables: child.variables || {},
              styles: child.styles || {},
              isLabelEditable: child.isLabelEditable ?? true,
              orderIndex: ci,
              childSections: [],
            })),
          })),
        },
      },
    };
    localStorage.setItem(`last_sent_${selectedTemplate.id}`, JSON.stringify(resendPayload));

    toast({
      title: "Template Sent",
      description: `"${finalSubject}" sent successfully to ${payload.toEmails.length} recipient(s).`,
    });

    resetForm();
    navigate('/templates');
  };

  const resetForm = () => {
    setToUsers([]);
    setCcUsers([]);
    setBccUsers([]);
    setVariables({});
    setListVariables({});
    setTableVariables({});
    setLabelVariables({});
    setSubjectVariables({});
    setEmailSubject("");
  };

  // Check if a template has a last sent payload
  const hasLastSentPayload = (tplId: string): boolean => {
    return localStorage.getItem(`last_sent_${tplId}`) !== null;
  };

  // Get last sent date for display
  const getLastSentDate = (tplId: string): string | null => {
    const stored = localStorage.getItem(`last_sent_${tplId}`);
    if (!stored) return null;
    try {
      const data = JSON.parse(stored);
      // Support new format (messageDetails.sentAt) and legacy format (sentAt)
      const sentAt = data.messageDetails?.sentAt || data.sentAt;
      return sentAt ? new Date(sentAt).toLocaleString() : null;
    } catch { return null; }
  };

  // Load last sent payload into the form using resend data format
  const loadLastSentPayload = (fallbackTemplate: Template) => {
    const stored = localStorage.getItem(`last_sent_${fallbackTemplate.id}`);
    if (!stored) return;

    try {
      const rawData = JSON.parse(stored);
      
      // Check if data is in new resend format (messageDetails + templateConfigData)
      if (rawData.templateConfigData && rawData.messageDetails) {
        const { template, bodyData, subjectData, recipients, ccEmails, bccEmails, subject } = resendDataToTemplate(rawData);
        
        // Prevent the useEffect from overwriting restored variables
        skipVariableInitRef.current = true;
        setSelectedTemplate(template);
        setEmailTitle(template.name);
        setExecutedOn(new Date().toLocaleString());

        // Restore recipients
        if (recipients.length) {
          setToUsers(recipients.map((email: string) => ({ id: email, name: email, email })));
        }
        if (ccEmails.length) {
          setCcUsers(ccEmails.map((email: string) => ({ id: email, name: email, email })));
        }
        if (bccEmails.length) {
          setBccUsers(bccEmails.map((email: string) => ({ id: email, name: email, email })));
        }

        // Restore subject
        if (subject) {
          setEmailSubject(subject);
        }
        if (subjectData && Object.keys(subjectData).length > 0) {
          setSubjectVariables(subjectData);
        }

        // Categorize body_data into variables, listVariables, labelVariables, tableVariables
        const restoredVars: Record<string, string | TextStyle> = {};
        const restoredListVars: Record<string, string[] | ListItemStyle[]> = {};
        const restoredTableVars: Record<string, any> = {};
        const restoredLabelVars: Record<string, string> = {};

        Object.entries(bodyData).forEach(([key, value]) => {
          // Label variables
          if (key.startsWith('label_')) {
            restoredLabelVars[key] = String(value);
            return;
          }

          // List variables (items_*)
          if (key.startsWith('items_') && Array.isArray(value)) {
            restoredListVars[key] = value as string[];
            return;
          }

          // Check against template sections for proper categorization
          if (template.sections) {
            const matchingSection = template.sections.find(s => {
              if (s.type === 'labeled-content') {
                const listVarName = s.variables?.listVariableName as string;
                if (listVarName === key && s.variables?.contentType === 'list') return true;
                if (s.id === key && s.variables?.contentType === 'table') return true;
                // Match by tableVariableName for dynamic tables
                const tableVarName = s.variables?.tableData?.tableVariableName as string;
                if (tableVarName === key && s.variables?.contentType === 'table') return true;
              }
              if (s.type === 'table') {
                if (s.id === key) return true;
                // Match by tableVariableName for dynamic tables
                const tableVarName = s.variables?.tableData?.tableVariableName as string;
                if (tableVarName === key) return true;
              }
              return false;
            });

            if (matchingSection) {
              if (matchingSection.variables?.contentType === 'list' || 
                  (Array.isArray(value) && matchingSection.type !== 'table')) {
                restoredListVars[key] = value as string[];
                return;
              }
              if (matchingSection.variables?.contentType === 'table' || matchingSection.type === 'table') {
                // Reconstruct full tableData from section config + sent payload values
                const originalTableData = matchingSection.variables?.tableData;
                if (originalTableData) {
                  const restored = { ...originalTableData };
                  // Static table payload: { headers, rows }
                  if (value && typeof value === 'object' && !Array.isArray(value) && value.headers) {
                    // Headers in payload may be objects {value, style} - extract plain strings
                    restored.headers = Array.isArray(value.headers)
                      ? value.headers.map((h: any) => typeof h === 'object' && h !== null ? h.value || '' : String(h))
                      : value.headers;
                    restored.rows = value.rows || [];
                  }
                  // Dynamic table payload: array of objects - reconstruct rows from mappings
                  else if (Array.isArray(value) && restored.jsonMapping?.columnMappings?.length) {
                    const mappings = restored.jsonMapping.columnMappings;
                    const headerPosition = restored.headerPosition || 'first-row';
                    const reconstructedRows = value.map((rowObj: any) => {
                      if (headerPosition === 'first-column') {
                        return mappings.map((_: any, idx: number) => {
                          if (idx === 0) return rowObj['header'] || '';
                          return rowObj['value'] || '';
                        });
                      }
                      return mappings.map((m: any) => rowObj[m.jsonPath] || '');
                    });
                    restored.rows = reconstructedRows;
                    // Restore headers from columnMappings
                    restored.headers = mappings.map((m: any) => m.header);
                  }
                  restoredTableVars[matchingSection.id] = restored;
                } else {
                  restoredTableVars[matchingSection.id] = value;
                }
                return;
              }
            }
          }

          // Default: treat as text variable
          restoredVars[key] = String(value);
        });

        setVariables(restoredVars);
        setListVariables(restoredListVars);
        setTableVariables(restoredTableVars);
        setLabelVariables(restoredLabelVars);

        const sentAt = rawData.messageDetails?.sentAt;
        toast({
          title: "Last Sent Loaded",
          description: `Restored data from ${sentAt ? new Date(sentAt).toLocaleString() : 'last send'}.`,
        });
      } else {
        // Legacy format fallback - old localStorage format
        const data = rawData;
        skipVariableInitRef.current = true;
        setSelectedTemplate(fallbackTemplate);
        setEmailTitle(fallbackTemplate.name);
        setExecutedOn(new Date().toLocaleString());

        if (data.toEmails?.length) {
          setToUsers(data.toEmails.map((email: string) => ({ id: email, name: email, email })));
        }
        if (data.ccEmails?.length) {
          setCcUsers(data.ccEmails.map((email: string) => ({ id: email, name: email, email })));
        }
        if (data.bccEmails?.length) {
          setBccUsers(data.bccEmails.map((email: string) => ({ id: email, name: email, email })));
        }

        if (data.subjectData && Object.keys(data.subjectData).length > 0) {
          setSubjectVariables(data.subjectData);
          if (fallbackTemplate.subject) {
            setEmailSubject(subjectThymeleafToPlaceholder(fallbackTemplate.subject));
          }
        } else if (data.emailSubject) {
          setEmailSubject(data.emailSubject);
        }

        if (data.bodyData) {
          const restoredVars: Record<string, string | TextStyle> = {};
          const restoredListVars: Record<string, string[] | ListItemStyle[]> = {};
          const restoredTableVars: Record<string, any> = {};
          const restoredLabelVars: Record<string, string> = {};

          Object.entries(data.bodyData).forEach(([key, value]) => {
            if (key.startsWith('label_')) { restoredLabelVars[key] = String(value); return; }
            if (key.startsWith('items_') && Array.isArray(value)) { restoredListVars[key] = value as string[]; return; }
            if (fallbackTemplate.sections) {
              const matchingSection = fallbackTemplate.sections.find(s => {
                if (s.type === 'labeled-content') {
                  const listVarName = s.variables?.listVariableName as string;
                  if (listVarName === key && s.variables?.contentType === 'list') return true;
                  if (s.id === key && s.variables?.contentType === 'table') return true;
                  const tableVarName = s.variables?.tableData?.tableVariableName as string;
                  if (tableVarName === key && s.variables?.contentType === 'table') return true;
                }
                if (s.type === 'table') {
                  if (s.id === key) return true;
                  const tableVarName = s.variables?.tableData?.tableVariableName as string;
                  if (tableVarName === key) return true;
                }
                return false;
              });
              if (matchingSection) {
                if (matchingSection.variables?.contentType === 'list' || (Array.isArray(value) && matchingSection.type !== 'table')) {
                  restoredListVars[key] = value as string[];
                  return;
                }
                if (matchingSection.variables?.contentType === 'table' || matchingSection.type === 'table') {
                  // Reconstruct full tableData from section config + sent payload values
                  const originalTableData = matchingSection.variables?.tableData;
                  if (originalTableData) {
                    const restored = { ...originalTableData };
                    if (value && typeof value === 'object' && !Array.isArray(value) && (value as any).headers) {
                      // Headers in payload may be objects {value, style} - extract plain strings
                      const rawHeaders = (value as any).headers;
                      restored.headers = Array.isArray(rawHeaders)
                        ? rawHeaders.map((h: any) => typeof h === 'object' && h !== null ? h.value || '' : String(h))
                        : rawHeaders;
                      restored.rows = (value as any).rows || [];
                    } else if (Array.isArray(value) && restored.jsonMapping?.columnMappings?.length) {
                      const mappings = restored.jsonMapping.columnMappings;
                      const headerPosition = restored.headerPosition || 'first-row';
                      const reconstructedRows = value.map((rowObj: any) => {
                        if (headerPosition === 'first-column') {
                          return mappings.map((_: any, idx: number) => {
                            if (idx === 0) return rowObj['header'] || '';
                            return rowObj['value'] || '';
                          });
                        }
                        return mappings.map((m: any) => rowObj[m.jsonPath] || '');
                      });
                      restored.rows = reconstructedRows;
                      restored.headers = mappings.map((m: any) => m.header);
                    }
                    restoredTableVars[matchingSection.id] = restored;
                  } else {
                    restoredTableVars[matchingSection.id] = value;
                  }
                  return;
                }
              }
            }
            restoredVars[key] = String(value);
          });

          setVariables(restoredVars);
          setListVariables(restoredListVars);
          setTableVariables(restoredTableVars);
          setLabelVariables(restoredLabelVars);
        }

        toast({
          title: "Last Sent Loaded",
          description: `Restored data from ${data.sentAt ? new Date(data.sentAt).toLocaleString() : 'last send'}.`,
        });
      }
    } catch (e) {
      console.error('Failed to load last sent payload:', e);
      toast({
        title: "Error",
        description: "Failed to load last sent data.",
        variant: "destructive",
      });
    }
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
      
      const sectionRows = selectedTemplate.sections
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
      return wrapInGlobalTable(sectionRows);
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

                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate(`/run-templates/${template.id}`)}
                        className="flex-1 shadow-lg shadow-primary/20"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Run Template
                      </Button>
                      {hasLastSentPayload(template.id) && (
                        <Button
                          variant="outline"
                          size="icon"
                          title={`Resend - Last sent: ${getLastSentDate(template.id) || 'unknown'}`}
                          onClick={() => {
                            setResendMode(true);
                            navigate(`/run-templates/${template.id}`);
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
                <UserAutocomplete
                  value={toUsers}
                  onChange={setToUsers}
                  placeholder="Search and select recipients"
                />
              </div>

              {/* CC Field */}
              <div className={styles.emailFieldRow}>
                <label>CC:</label>
                <UserAutocomplete
                  value={ccUsers}
                  onChange={setCcUsers}
                  placeholder="Add CC recipients (optional)"
                />
              </div>

              {/* BCC Field */}
              <div className={styles.emailFieldRow}>
                <label>BCC:</label>
                <UserAutocomplete
                  value={bccUsers}
                  onChange={setBccUsers}
                  placeholder="Add BCC recipients (optional)"
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
                            // Priority: Use runtime label value, then stored variable value, then resolved label field
                            let labelValue = labelVariables[labelVarName];
                            if (!labelValue) {
                              // Try to get from stored variable value
                              if (labelVarName && section.variables?.[labelVarName] !== undefined) {
                                labelValue = String(section.variables[labelVarName]);
                              } else if (section.variables?.label) {
                                // Resolve Thymeleaf syntax to actual values
                                labelValue = String(section.variables.label)
                                  .replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (_, varName) => {
                                    if (section.variables && section.variables[varName] !== undefined) {
                                      return String(section.variables[varName]);
                                    }
                                    return `{{${varName}}}`;
                                  })
                                  .replace(/<th:utext="\$\{(\w+)\}">/g, (_, varName) => {
                                    if (section.variables && section.variables[varName] !== undefined) {
                                      return String(section.variables[varName]);
                                    }
                                    return `{{${varName}}}`;
                                  });
                              } else {
                                labelValue = 'Label';
                              }
                            }
                            const editable = section.isLabelEditable !== false;
                            const contentType = section.variables?.contentType || 'text';
                            const listVarName = section.variables?.listVariableName as string || section.id;
                            const textVarName = section.variables?.textVariableName as string || section.id;
                            
                            return (
                              <div 
                                key={section.id} 
                                className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}
                              >
                                {/* Label - Jira-style editable with RichTextEditor */}
                                <div className="mb-2">
                                  {editable ? (
                                    editingLabelId === section.id ? (
                                      <div className="border rounded-lg border-primary/30 bg-background">
                                        <RichTextEditor
                                          value={labelValue}
                                          onChange={(html) => setLabelVariables(prev => ({
                                            ...prev,
                                            [labelVarName]: html
                                          }))}
                                          onFocus={() => scrollToSection(section.id)}
                                          placeholder="Enter label..."
                                          className="font-medium text-sm"
                                        />
                                        <div className="flex justify-end p-1 border-t border-border/50">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => setEditingLabelId(null)}
                                          >
                                            <Check className="h-3 w-3 mr-1" />
                                            Done
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div 
                                        className="group flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => {
                                          setEditingLabelId(section.id);
                                          scrollToSection(section.id);
                                        }}
                                      >
                                        <span 
                                          className="flex-1" 
                                          style={{ fontFamily: "'Wells Fargo Sans', Arial, Helvetica, sans-serif", fontSize: '18px', lineHeight: '27px', fontWeight: 'bold', color: '#D71E28' }}
                                          dangerouslySetInnerHTML={{ __html: labelValue || 'Click to edit...' }}
                                        />
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    )
                                  ) : (
                                    <div 
                                      className="px-3 py-1.5 bg-muted rounded"
                                      style={{ fontFamily: "'Wells Fargo Sans', Arial, Helvetica, sans-serif", fontSize: '18px', lineHeight: '27px', fontWeight: 'bold', color: '#D71E28' }}
                                      dangerouslySetInnerHTML={{ __html: labelValue }}
                                    />
                                  )}
                                </div>
                                
                                {/* Content - with left margin */}
                                <div className="ml-4">
                                  {contentType === 'text' && (() => {
                                    // Get the content value - prioritize runtime value, then stored variable value, then content field
                                    let textContent = '';
                                    if (typeof variables[textVarName] === 'object') {
                                      textContent = (variables[textVarName] as TextStyle).text;
                                    } else if (variables[textVarName] !== undefined) {
                                      textContent = variables[textVarName] as string;
                                    } else if (textVarName && section.variables?.[textVarName] !== undefined) {
                                      textContent = String(section.variables[textVarName]);
                                    } else if (section.variables?.content) {
                                      // Resolve Thymeleaf syntax in legacy content field
                                      textContent = String(section.variables.content)
                                        .replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, (_, varName) => {
                                          if (section.variables && section.variables[varName] !== undefined) {
                                            return String(section.variables[varName]);
                                          }
                                          return `{{${varName}}}`;
                                        });
                                    }
                                    
                                    // Extract placeholders from the text content
                                    const textPlaceholders: string[] = [];
                                    const placeholderMatches = textContent.match(/\{\{(\w+)\}\}/g) || [];
                                    placeholderMatches.forEach((match: string) => {
                                      const varName = match.replace(/\{\{|\}\}/g, '');
                                      if (!textPlaceholders.includes(varName)) textPlaceholders.push(varName);
                                    });
                                    
                                    // Also check the stored content for Thymeleaf patterns
                                    const storedContent = section.variables?.[textVarName] as string || section.variables?.content as string || '';
                                    const thymeleafMatches = storedContent.match(/<span\s+th:utext="\$\{(\w+)\}"\/>/g) || [];
                                    thymeleafMatches.forEach((match: string) => {
                                      const varNameMatch = match.match(/\$\{(\w+)\}/);
                                      if (varNameMatch && !textPlaceholders.includes(varNameMatch[1])) {
                                        textPlaceholders.push(varNameMatch[1]);
                                      }
                                    });
                                    
                                    return (
                                      <>
                                        {/* Main text content preview */}
                                        <div 
                                          className="px-3 py-2 bg-muted/30 rounded border border-border/50 text-sm mb-2"
                                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                          dangerouslySetInnerHTML={{ __html: textContent || '<span class="text-muted-foreground">No content</span>' }}
                                        />
                                        
                                        {/* Individual placeholder inputs */}
                                        {textPlaceholders.length > 0 && (
                                          <div className="ml-4 pl-3 border-l-2 border-dashed border-border/50 space-y-2 mt-2">
                                            {textPlaceholders.map(varName => (
                                              <div key={varName} className={styles.formField}>
                                                <Popover>
                                                  <PopoverTrigger asChild>
                                                    <Label htmlFor={`labeled-text-var-${section.id}-${varName}`} className="text-sm font-medium cursor-help mb-1 inline-block">
                                                      {varName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                    </Label>
                                                  </PopoverTrigger>
                                                  <PopoverContent className="w-auto p-2" side="top" align="start">
                                                    <span className="text-xs text-muted-foreground">{`{{${varName}}}`}</span>
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
                                                    placeholder={`Enter ${varName}...`}
                                                    singleLine
                                                  />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                  
                                  {contentType === 'list' && (() => {
                                    const listItems = (listVariables[listVarName] || section.variables?.items || ['']) as (string | ListItemStyle)[];
                                    
                                    // Extract all placeholders from all list items
                                    const listPlaceholders: string[] = [];
                                    listItems.forEach((item: string | ListItemStyle) => {
                                      const itemText = typeof item === 'object' ? item.text : item;
                                      if (itemText) {
                                        const placeholderMatches = itemText.match(/\{\{(\w+)\}\}/g) || [];
                                        placeholderMatches.forEach((match: string) => {
                                          const varName = match.replace(/\{\{|\}\}/g, '');
                                          if (!listPlaceholders.includes(varName)) listPlaceholders.push(varName);
                                        });
                                      }
                                    });
                                    
                                    return (
                                      <>
                                        <div className="space-y-2">
                                          {listItems.map((item: string | ListItemStyle, itemIdx: number) => (
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
                                        
                                        {/* Individual placeholder inputs for list items */}
                                        {listPlaceholders.length > 0 && (
                                          <div className="ml-4 pl-3 border-l-2 border-dashed border-border/50 space-y-2 mt-3">
                                            <div className="text-xs text-muted-foreground mb-1">Placeholders in list items:</div>
                                            {listPlaceholders.map(varName => (
                                              <div key={varName} className={styles.formField}>
                                                <Popover>
                                                  <PopoverTrigger asChild>
                                                    <Label htmlFor={`labeled-list-var-${section.id}-${varName}`} className="text-sm font-medium cursor-help mb-1 inline-block">
                                                      {varName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                    </Label>
                                                  </PopoverTrigger>
                                                  <PopoverContent className="w-auto p-2" side="top" align="start">
                                                    <span className="text-xs text-muted-foreground">{`{{${varName}}}`}</span>
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
                                                    placeholder={`Enter ${varName}...`}
                                                    singleLine
                                                  />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                  
                                  {contentType === 'table' && (
                                    <TableEditor
                                      hideStructuralControls
                                      section={section}
                                      onUpdate={(updatedSection) => {
                                        setTableVariables(prev => ({
                                          ...prev,
                                          [section.id]: updatedSection.variables?.tableData
                                        }));
                                        scrollToSection(section.id);
                                      }}
                                    />
                                  )}
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
                            
                            // Get the stored textVariableName for this section
                            const textVarName = section.variables?.textVariableName as string;
                            
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
                            
                            // Convert Thymeleaf tags to {{placeholder}} format for internal processing
                            const contentWithPlaceholders = rawContent
                              .replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, '{{$1}}')
                              .replace(/<span\s+th:utext="\$\{(\w+)\}"><\/span>/g, '{{$1}}')
                              .replace(/<th:utext="\$\{(\w+)\}">[^<]*<\/th:utext>/g, '{{$1}}')
                              .replace(/<th:block\s+th:utext="\$\{(\w+)\}"\/>/g, '{{$1}}')
                              .replace(/th:utext="\$\{(\w+)\}"/g, '{{$1}}');
                            
                            // Remove only the outer wrapper tag (e.g., <h1>...</h1>, <p>...</p>)
                            let contentForDisplay = contentWithPlaceholders.replace(/^<(\w+)>([\s\S]*)<\/\1>$/, '$2');
                            
                            // For placeholder extraction, strip HTML to get plain text
                            const plainTextContent = contentForDisplay.replace(/<[^>]*>/g, '');
                            const displayContentCheck = plainTextContent.trim();
                            
                            // Dynamically extract placeholders from content
                            const varNames: string[] = [];
                            
                            // Check for stored textVariableName (dynamic naming) 
                            if (textVarName) {
                              varNames.push(textVarName);
                            }
                            
                            // Also check for inline {{placeholder}} syntax
                            if (plainTextContent) {
                              const placeholderMatches = plainTextContent.match(/\{\{(\w+)\}\}/g) || [];
                              placeholderMatches.forEach(match => {
                                const varName = match.replace(/\{\{|\}\}/g, '');
                                if (!varNames.includes(varName)) varNames.push(varName);
                              });
                            }
                            
                            // Skip sections with no content
                            if (!displayContentCheck) return null;
                            
                            const isEditingThisSection = editingSectionId === section.id;
                            
                            // Get banner background color for display
                            const bannerBgColor = isBanner 
                              ? ((section.variables?.tableData as any)?.cellStyles?.['0-0']?.backgroundColor || '#FFFF00')
                              : undefined;
                            
                            // Determine the value for RichTextEditor - preserve HTML formatting
                            const richTextValue = hasBeenEdited 
                              ? editedValue 
                              : originalContent
                                  .replace(/^<(\w+)>([\s\S]*)<\/\1>$/, '$2')
                                  .replace(/<span\s+th:utext="\$\{(\w+)\}"\/>/g, '{{$1}}')
                                  .replace(/<span\s+th:utext="\$\{(\w+)\}"><\/span>/g, '{{$1}}')
                                  .replace(/<th:utext="\$\{(\w+)\}">[^<]*<\/th:utext>/g, '{{$1}}')
                                  .replace(/<th:block\s+th:utext="\$\{(\w+)\}"\/>/g, '{{$1}}')
                                  .replace(/th:utext="\$\{(\w+)\}"/g, '{{$1}}');
                            
                            // Function to get the display value - replace placeholders with actual values
                            const getDisplayValueWithReplacements = (): string => {
                              let display = contentForDisplay;
                              
                              // Replace dynamic text variable placeholder with its value
                              if (textVarName) {
                                const varValue = typeof variables[textVarName] === 'object' 
                                  ? (variables[textVarName] as TextStyle).text 
                                  : (variables[textVarName] as string) || '';
                                
                                // Replace the {{textVarName}} placeholder with the actual value
                                display = display.replace(new RegExp(`\\{\\{${textVarName}\\}\\}`, 'g'), varValue || `{{${textVarName}}}`);
                              }
                              
                              // Replace any other inline placeholders
                              varNames.forEach(varName => {
                                if (varName !== textVarName) {
                                  const varValue = typeof variables[varName] === 'object' 
                                    ? (variables[varName] as TextStyle).text 
                                    : (variables[varName] as string) || '';
                                  display = display.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), varValue || `{{${varName}}}`);
                                }
                              });
                              
                              return display;
                            };
                            
                            // Check if any placeholder still has no value (shows as {{...}})
                            const displayValue = getDisplayValueWithReplacements();
                            const hasUnfilledPlaceholders = /\{\{\w+\}\}/.test(displayValue);
                            
                            // Get the default variable name pattern to identify the "main" placeholder
                            const getDefaultVarNameForType = (type: string): string | null => {
                              if (type.startsWith('heading')) {
                                const level = type.replace('heading', '');
                                return `heading${level}Text`;
                              }
                              if (type === 'text') return 'textContent';
                              if (type === 'paragraph') return 'paragraphContent';
                              return null;
                            };
                            
                            const defaultVarPattern = getDefaultVarNameForType(section.type);
                            
                            // Determine which variables are "extra" (not the default/main placeholder)
                            // These are {{placeholders}} added by the user beyond the default one
                            const extraPlaceholders = varNames.filter(varName => {
                              // If it's the textVarName (dynamic naming), it's the main variable - exclude it
                              if (varName === textVarName) return false;
                              // If it matches the default pattern (e.g., heading1Text), it's the main variable - exclude it
                              if (defaultVarPattern && varName === defaultVarPattern) return false;
                              // If it starts with the default pattern + underscore (dynamic naming), it's the main variable - exclude it
                              if (defaultVarPattern && varName.startsWith(defaultVarPattern + '_')) return false;
                              return true;
                            });
                            
                            // Get the main variable key for editing
                            const mainVarKey = textVarName || (isBanner ? bannerKey : null);
                            
                            // Get current value of the main variable for editing
                            const getMainVarValue = (): string => {
                              if (isBanner) {
                                return (variables[bannerKey] as string) ?? (section.variables?.tableData as any)?.rows?.[0]?.[0] ?? 'EFT';
                              }
                              if (textVarName) {
                                const val = variables[textVarName];
                                return typeof val === 'object' ? (val as TextStyle).text : (val as string) || '';
                              }
                              return '';
                            };
                            
                            const mainVarValue = getMainVarValue();
                            
                            return (
                              <div key={section.id} className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}>
                                {/* Content display - show actual value with edit icon, or editable field when editing */}
                                {isEditingThisSection && isEditable && mainVarKey ? (
                                  <div>
                                    {isBanner ? (
                                      <Input
                                        value={mainVarValue}
                                        onChange={(e) => {
                                          setVariables(prev => ({
                                            ...prev,
                                            [mainVarKey]: e.target.value
                                          }));
                                        }}
                                        autoFocus
                                        placeholder="Enter value..."
                                        className="text-sm font-bold"
                                        style={{ backgroundColor: (section.variables?.tableData as any)?.cellStyles?.['0-0']?.backgroundColor || '#FFFF00' }}
                                      />
                                    ) : extraPlaceholders.length > 0 ? (
                                      // Multiple placeholders - edit the full content template
                                      <RichTextEditor
                                        value={richTextValue}
                                        onChange={(html) => {
                                          // Update the editedSectionContent with the full content
                                          setEditedSectionContent(prev => ({
                                            ...prev,
                                            [section.id]: html
                                          }));
                                          // Also extract and update individual placeholder values
                                          const placeholderMatches = html.match(/\{\{(\w+)\}\}/g) || [];
                                          placeholderMatches.forEach(match => {
                                            const varName = match.replace(/\{\{|\}\}/g, '');
                                            // Keep the placeholder in the content, don't replace with empty values
                                          });
                                        }}
                                        placeholder={`Enter ${section.type.replace(/\d+/, '')} value...`}
                                        singleLine={section.type.startsWith('heading')}
                                      />
                                    ) : (
                                      // Single main variable - edit just that value
                                      <RichTextEditor
                                        value={mainVarValue}
                                        onChange={(html) => {
                                          setVariables(prev => ({
                                            ...prev,
                                            [mainVarKey]: html
                                          }));
                                        }}
                                        placeholder={`Enter ${section.type.replace(/\d+/, '')} value...`}
                                        singleLine={section.type.startsWith('heading')}
                                      />
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      <Button 
                                        size="sm" 
                                        variant="default"
                                        onClick={() => setEditingSectionId(null)}
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Done
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
                                          __html: mainVarValue || '<span style="color: #999;">Click to enter value...</span>'
                                        }}
                                      />
                                    ) : mainVarKey && extraPlaceholders.length === 0 ? (
                                      // Single main variable with no extra placeholders: show the variable value directly
                                      <div 
                                        className={`flex-1 text-sm font-medium ${!mainVarValue ? 'text-muted-foreground italic' : 'text-foreground'}`}
                                        style={{ lineHeight: 1.6 }}
                                        dangerouslySetInnerHTML={{ 
                                          __html: mainVarValue || 'Click to enter value...'
                                        }}
                                      />
                                    ) : (
                                      // Multiple placeholders or content with inline placeholders
                                      // Show the content template WITH placeholders visible (not replaced with values)
                                      <div 
                                        className={`flex-1 text-sm font-medium text-foreground`}
                                        style={{ lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                                        dangerouslySetInnerHTML={{ 
                                          __html: contentForDisplay || 'No content'
                                        }}
                                      />
                                    )}
                                    {isEditable && mainVarKey && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 shrink-0 opacity-50 hover:opacity-100"
                                        onClick={() => setEditingSectionId(section.id)}
                                        title="Edit value"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                                
                                {/* Show input boxes ONLY for extra placeholders (not the default/main one) */}
                                {!isEditingThisSection && extraPlaceholders.length > 0 && (
                                  <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/20 space-y-3">
                                    {extraPlaceholders.map(varName => (
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
                                {isBanner && !textVarName && varNames.length === 0 && isEditable && (
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
                            return (
                              <div key={section.id} className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}>
                                <TableEditor
                                  hideStructuralControls
                                  section={section}
                                  onUpdate={(updatedSection) => {
                                    setTableVariables(prev => ({
                                      ...prev,
                                      [section.id]: updatedSection.variables?.tableData
                                    }));
                                    scrollToSection(section.id);
                                  }}
                                />
                              </div>
                            );
                          }
                          
                          // Handle CTA text sections
                          if (section.type === 'cta-text') {
                            const ctaText = (variables[`ctaText_${section.id}`] as string) || (section.variables?.ctaText as string) || 'Call to action&nbsp;>';
                            const ctaUrl = (variables[`ctaUrl_${section.id}`] as string) || (section.variables?.ctaUrl as string) || '#';
                            
                            return (
                              <div key={section.id} className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}>
                                <div className="text-xs text-muted-foreground mb-2">CTA Text Link</div>
                                
                                {/* Preview */}
                                <div className="mb-3">
                                  <a 
                                    href={ctaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ 
                                      fontSize: '14px',
                                      color: '#5A469B',
                                      lineHeight: '24px',
                                      fontWeight: 'bold',
                                      textDecoration: 'underline'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: ctaText }}
                                  />
                                </div>
                                
                                {/* Inputs */}
                                <div className="ml-4 pl-3 border-l-2 border-primary/20 space-y-3">
                                  <div className={styles.formField}>
                                    <Label className="text-xs font-medium mb-1.5 text-muted-foreground">Link Text</Label>
                                    <Input
                                      value={ctaText}
                                      onChange={(e) => {
                                        setVariables(prev => ({
                                          ...prev,
                                          [`ctaText_${section.id}`]: e.target.value
                                        }));
                                      }}
                                      onFocus={() => scrollToSection(section.id)}
                                      placeholder="Enter link text..."
                                      className="text-sm"
                                    />
                                  </div>
                                  <div className={styles.formField}>
                                    <Label className="text-xs font-medium mb-1.5 text-muted-foreground">Link URL</Label>
                                    <Input
                                      type="url"
                                      value={ctaUrl}
                                      onChange={(e) => {
                                        setVariables(prev => ({
                                          ...prev,
                                          [`ctaUrl_${section.id}`]: e.target.value
                                        }));
                                      }}
                                      onFocus={() => scrollToSection(section.id)}
                                      placeholder="https://example.com"
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          
                          // Handle Program Name sections (uses static variable name - single instance per template)
                          if (section.type === 'program-name') {
                            const isEditable = section.isLabelEditable !== false;
                            const mainVarKey = 'programNameText';
                            const mainVarValue = (variables[mainVarKey] as string) || (section.variables?.programNameText as string) || '';
                            const isEditingThisSection = editingSectionId === section.id;
                            
                            return (
                              <div key={section.id} className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}>
                                {/* Content display with inline editing - same as heading/text/paragraph */}
                                {isEditingThisSection && isEditable ? (
                                  <div>
                                    <RichTextEditor
                                      value={mainVarValue}
                                      onChange={(html) => {
                                        setVariables(prev => ({
                                          ...prev,
                                          [mainVarKey]: html
                                        }));
                                      }}
                                      placeholder="Enter program name..."
                                      singleLine
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
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-2">
                                    <div 
                                      className={`flex-1 text-sm font-bold ${!mainVarValue ? 'text-muted-foreground italic' : 'text-foreground'}`}
                                      style={{ 
                                        fontSize: '14px',
                                        lineHeight: '21px',
                                        color: mainVarValue ? '#141414' : undefined
                                      }}
                                      dangerouslySetInnerHTML={{ 
                                        __html: mainVarValue || 'Click to enter program name...'
                                      }}
                                    />
                                    {isEditable && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 shrink-0 opacity-50 hover:opacity-100"
                                        onClick={() => setEditingSectionId(section.id)}
                                        title="Edit program name"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          // Handle Date sections - right-aligned date display
                          if (section.type === 'date') {
                            const isEditable = section.isLabelEditable !== false;
                            const dateVarName = (section.variables?.dateVariableName as string) || `dateValue_${section.id}`;
                            const dateValue = (variables[dateVarName] as string) || 
                                              (section.variables?.[dateVarName] as string) ||
                                              (section.variables?.dateValue as string) || 
                                              new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
                            const isEditingThisSection = editingSectionId === section.id;
                            
                            return (
                              <div key={section.id} className={`mb-4 pb-4 border-b border-border/50 last:border-b-0 rounded-lg p-3 transition-colors ${activeSectionId === section.id ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/30'}`}>
                                {/* Content display with inline editing */}
                                {isEditingThisSection && isEditable ? (
                                  <div>
                                    <Input
                                      value={dateValue}
                                      onChange={(e) => {
                                        setVariables(prev => ({
                                          ...prev,
                                          [dateVarName]: e.target.value
                                        }));
                                      }}
                                      onFocus={() => scrollToSection(section.id)}
                                      placeholder="February 05, 2026"
                                      className="text-sm text-right"
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
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-2">
                                    <div 
                                      className={`flex-1 text-sm ${!dateValue ? 'text-muted-foreground italic' : 'text-foreground'}`}
                                      style={{ 
                                        textAlign: 'right',
                                        fontSize: '14px',
                                        lineHeight: '21px',
                                        color: dateValue ? '#333333' : undefined
                                      }}
                                    >
                                      {dateValue || 'Click to enter date...'}
                                    </div>
                                    {isEditable && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 shrink-0 opacity-50 hover:opacity-100"
                                        onClick={() => setEditingSectionId(section.id)}
                                        title="Edit date"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
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
                          
                          // For labeled-content sections, inject updated label and content from runtime variables
                          if (s.type === 'labeled-content') {
                            const labelVarName = (s.variables?.labelVariableName as string) || `label_${s.id}`;
                            const textVarName = (s.variables?.textVariableName as string) || s.id;
                            const contentType = s.variables?.contentType || 'text';
                            
                            let updatedVars = { ...updated.variables };
                            
                            // Inject label from runtime labelVariables
                            if (labelVariables[labelVarName]) {
                              updatedVars.label = labelVariables[labelVarName];
                              // Also set the resolved value under the variable name for renderSectionContent
                              updatedVars[labelVarName] = labelVariables[labelVarName];
                            }
                            
                        // For text content type, inject content from variables and resolve placeholders
                        if (contentType === 'text') {
                          let textValue = '';
                          if (variables[textVarName] !== undefined) {
                            textValue = typeof variables[textVarName] === 'object'
                              ? (variables[textVarName] as any).text
                              : String(variables[textVarName]);
                          } else if (s.variables?.[textVarName] !== undefined) {
                            textValue = String(s.variables[textVarName]);
                          } else if (s.variables?.content !== undefined) {
                            textValue = String(s.variables.content);
                          }
                          
                          // Resolve {{placeholder}} patterns in text content with runtime values
                          textValue = textValue.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                            if (variables[varName] !== undefined) {
                              const val = variables[varName];
                              return typeof val === 'object' ? (val as any).text : String(val);
                            }
                            return match; // Keep placeholder if not found
                          });
                          
                          updatedVars.content = textValue;
                          updatedVars[textVarName] = textValue;
                          
                          // Also add resolved placeholder values to updatedVars for renderSectionContent
                          Object.keys(variables).forEach(varKey => {
                            if (varKey !== textVarName && varKey !== 'content') {
                              const val = variables[varKey];
                              updatedVars[varKey] = typeof val === 'object' ? (val as any).text : val;
                            }
                          });
                        }
                        
                        // For list content type, inject items from listVariables and resolve placeholders
                        if (contentType === 'list') {
                          const listVarName = (s.variables?.listVariableName as string) || `items_${s.id}`;
                          if (listVariables[listVarName] !== undefined) {
                            const items = listVariables[listVarName] as (string | ListItemStyle)[];
                            // Resolve {{placeholder}} patterns in list items
                            const resolvedItems = items.map(item => {
                              if (typeof item === 'string') {
                                return item.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                                  if (variables[varName] !== undefined) {
                                    const val = variables[varName];
                                    return typeof val === 'object' ? (val as any).text : String(val);
                                  }
                                  return match;
                                });
                              } else if (typeof item === 'object' && 'text' in item) {
                                return {
                                  ...item,
                                  text: item.text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                                    if (variables[varName] !== undefined) {
                                      const val = variables[varName];
                                      return typeof val === 'object' ? (val as any).text : String(val);
                                    }
                                    return match;
                                  })
                                };
                              }
                              return item;
                            });
                            updatedVars.items = resolvedItems;
                            updatedVars[listVarName] = resolvedItems;
                          }
                        }
                        
                        updated = { ...updated, variables: updatedVars };
                          }
                          
                          // For heading/text/paragraph sections, inject edited content
                          if (['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'].includes(s.type)) {
                            if (editedSectionContent[s.id] !== undefined) {
                              updated = {
                                ...updated,
                                content: editedSectionContent[s.id]
                              };
                            }
                            
                            // Also update section variables with values from the variables state
                            // This ensures individual placeholder edits are reflected in preview
                            const updatedVars = { ...updated.variables };
                            let hasVarUpdates = false;
                            
                            Object.keys(variables).forEach(varName => {
                              // Only include variables that might be placeholders in this section's content
                              const content = updated.content || '';
                              if (content.includes(`\${${varName}}`) || content.includes(`{{${varName}}}`)) {
                                const varValue = typeof variables[varName] === 'object'
                                  ? (variables[varName] as any).text
                                  : variables[varName];
                                if (varValue !== undefined && varValue !== '') {
                                  updatedVars[varName] = varValue;
                                  hasVarUpdates = true;
                                }
                              }
                            });
                            
                            if (hasVarUpdates) {
                              updated = { ...updated, variables: updatedVars };
                            }
                          }
                          
                          // For standalone table sections, inject updated tableData from tableVariables
                          if (s.type === 'table' && tableVariables[s.id]) {
                            updated = {
                              ...updated,
                              variables: {
                                ...updated.variables,
                                tableData: tableVariables[s.id]
                              }
                            };
                          }
                          
                          // For labeled-content table sections, inject updated tableData
                          if (s.type === 'labeled-content' && s.variables?.contentType === 'table' && tableVariables[s.id]) {
                            updated = {
                              ...updated,
                              variables: {
                                ...updated.variables,
                                tableData: tableVariables[s.id]
                              }
                            };
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
                          
                          // For CTA text sections, inject updated text and URL
                          if (s.type === 'cta-text') {
                            const ctaTextKey = `ctaText_${s.id}`;
                            const ctaUrlKey = `ctaUrl_${s.id}`;
                            if (variables[ctaTextKey] !== undefined || variables[ctaUrlKey] !== undefined) {
                              updated = {
                                ...updated,
                                variables: {
                                  ...updated.variables,
                                  ctaText: (variables[ctaTextKey] as string) || s.variables?.ctaText,
                                  ctaUrl: (variables[ctaUrlKey] as string) || s.variables?.ctaUrl
                                }
                              };
                            }
                          }
                          
                          // For program-name sections, inject updated name (uses static variable)
                          if (s.type === 'program-name') {
                            if (variables['programNameText'] !== undefined) {
                              updated = {
                                ...updated,
                                variables: {
                                  ...updated.variables,
                                  programNameText: variables['programNameText'] as string
                                }
                              };
                            }
                          }
                          
                          // For date sections, inject updated date value
                          if (s.type === 'date') {
                            const dateVarName = (s.variables?.dateVariableName as string) || `dateValue_${s.id}`;
                            if (variables[dateVarName] !== undefined) {
                              updated = {
                                ...updated,
                                variables: {
                                  ...updated.variables,
                                  dateVariableName: dateVarName,
                                  [dateVarName]: variables[dateVarName] as string,
                                  dateValue: variables[dateVarName] as string
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
                <p className="text-sm">{toUsers.length > 0 ? toUsers.map(u => u.email).join(', ') : '(No recipients)'}</p>
              </div>
              {ccUsers.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">CC</Label>
                  <p className="text-sm">{ccUsers.map(u => u.email).join(', ')}</p>
                </div>
              )}
              {bccUsers.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">BCC</Label>
                  <p className="text-sm">{bccUsers.map(u => u.email).join(', ')}</p>
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
                  [jsonImportOpen]: { ...prev[jsonImportOpen], headers, rows }
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
