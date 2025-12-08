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
import { ArrowLeft, Send, Calendar, PlayCircle, Plus, Trash2, Palette, Bold, Italic, Underline, Eye, Loader2 } from "lucide-react";
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
import { renderSectionContent } from "@/lib/templateUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { subjectThymeleafToPlaceholder, processSubjectWithValues } from "@/lib/thymeleafUtils";

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
  const [toEmails, setToEmails] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [bccEmails, setBccEmails] = useState("");
  const [viewMode, setViewMode] = useState<'template' | 'execution'>('template'); // New: toggle between template view and execution view
  const [executedOn, setExecutedOn] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [subjectVariables, setSubjectVariables] = useState<Record<string, string>>({}); // Variables extracted from template subject
  const [emailTitle, setEmailTitle] = useState<string>("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const { toast } = useToast();

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
      const initialListVars: Record<string, string[]> = {};
      const initialTableVars: Record<string, any> = {};
      
      vars.forEach(v => {
        const defaultVal = getDefaultValue(v);
        if (isTableVariable(v)) {
          initialTableVars[v] = defaultVal || { headers: [], rows: [] };
        } else if (Array.isArray(defaultVal)) {
          initialListVars[v] = defaultVal.length > 0 ? defaultVal : [''];
        } else {
          initialVars[v] = String(defaultVal);
        }
      });
      
      setVariables(initialVars);
      setListVariables(initialListVars);
      setTableVariables(initialTableVars);
    }
  }, [selectedTemplate]);

  const extractVariables = (html: string): string[] => {
    const regex = /<th:utext="\$\{(\w+)\}">/g;
    const matches = html.matchAll(regex);
    return Array.from(new Set(Array.from(matches, m => m[1])));
  };

  // Check if a variable is a labeled-content section by its section ID
  const isLabeledContentSection = (varName: string): Section | undefined => {
    if (!selectedTemplate?.sections) return undefined;
    return selectedTemplate.sections.find(section => 
      section.type === 'labeled-content' && section.id === varName
    );
  };

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
      
      if (section.variables && section.variables[varName]) {
        return Array.isArray(section.variables[varName]);
      }
    }
    return false;
  };

  // Check if a variable is a table type
  const isTableVariable = (varName: string): boolean => {
    if (!selectedTemplate?.sections) return false;
    
    return selectedTemplate.sections.some(section => {
      if (section.type === 'labeled-content' && section.id === varName) {
        return section.variables?.contentType === 'table';
      }
      return false;
    });
  };

  // Check if a label is editable at runtime
  const isLabelEditable = (varName: string): boolean => {
    if (!selectedTemplate?.sections) return true;
    
    const section = selectedTemplate.sections.find(section => 
      section.type === 'labeled-content' && section.id === varName
    );
    return section?.isLabelEditable !== false;
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
    
    for (const section of selectedTemplate.sections) {
      // Check if this is a labeled-content section by listVariableName or ID
      if (section.type === 'labeled-content') {
        const listVarName = section.variables?.listVariableName as string;
        const isMatch = (listVarName && listVarName === varName) || section.id === varName;
        
        if (isMatch) {
          const displayLabel = getLabeledContentDisplayLabel(section);
          return {
            sectionType: section.variables?.contentType === 'list' ? 'List Content' : 'Labeled Content',
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
        if (content.includes(`\${${varName}}`)) {
          // Extract surrounding text for context
          const regex = new RegExp(`([^<]*)<th:utext="\\$\\{${varName}\\}">([^<]*)`, 'g');
          const match = regex.exec(content);
          if (match) {
            const before = match[1].trim();
            const after = match[2].trim();
            return {
              sectionType: 'Mixed Content',
              context: before ? `Appears after: "${before}"` : 'Used in mixed content section'
            };
          }
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
  const extractAllVariables = (template: Template): string[] => {
    const varsFromHtml = extractVariables(template.html);
    const varsFromSections = new Set<string>();

    // Extract from sections if available
    if (template.sections) {
      template.sections.forEach((section: Section) => {
        // For labeled-content sections, use appropriate variable name based on content type
        if (section.type === 'labeled-content') {
          // Extract placeholder variables from the label itself
          if (section.variables?.label) {
            const labelVars = extractVariables(section.variables.label as string);
            labelVars.forEach(v => varsFromSections.add(v));
            
            // Also check for {{placeholder}} format in label
            const placeholderMatches = (section.variables.label as string).match(/\{\{(\w+)\}\}/g) || [];
            placeholderMatches.forEach(match => {
              const varName = match.replace(/\{\{|\}\}/g, '');
              varsFromSections.add(varName);
            });
          }
          
          // For list content, use the listVariableName (e.g., items_abc123)
          if (section.variables?.contentType === 'list' && section.variables?.listVariableName) {
            varsFromSections.add(section.variables.listVariableName as string);
          } else {
            // Use section ID as the key for text/table content
            varsFromSections.add(section.id);
          }
          return;
        }
        
        // For mixed-content sections, extract from content variable
        if (section.type === 'mixed-content' && section.variables?.content) {
          const mixedVars = extractVariables(section.variables.content as string);
          mixedVars.forEach(v => varsFromSections.add(v));
        }
        
        // For heading/text sections with inline placeholders, extract from content
        const inlinePlaceholderTypes = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'text', 'paragraph'];
        if (inlinePlaceholderTypes.includes(section.type) && section.content) {
          const placeholderMatches = section.content.match(/\{\{(\w+)\}\}/g) || [];
          placeholderMatches.forEach(match => {
            const varName = match.replace(/\{\{|\}\}/g, '');
            varsFromSections.add(varName);
          });
        }
        
        // Extract variables from section content
        const contentVars = extractVariables(section.content);
        contentVars.forEach(v => varsFromSections.add(v));

        // Extract from section variables definition
        if (section.variables) {
          Object.keys(section.variables).forEach(key => varsFromSections.add(key));
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

    // Validate emails
    if (!toEmails.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one recipient email.",
        variant: "destructive",
      });
      return;
    }

    // Build body_data from all section variables
    const bodyData: Record<string, any> = {};
    
    // Add text variables
    Object.entries(variables).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && 'text' in value) {
        bodyData[key] = (value as TextStyle).text;
      } else {
        bodyData[key] = value;
      }
    });
    
    // Add list variables
    Object.entries(listVariables).forEach(([key, items]) => {
      bodyData[key] = items.map((item: any) => {
        if (typeof item === 'object' && 'text' in item) {
          return item.text;
        }
        return item;
      });
    });
    
    // Add table variables
    Object.entries(tableVariables).forEach(([key, value]) => {
      bodyData[key] = value;
    });

    // Build the payload in the requested format
    const payload = {
      templateId: selectedTemplate.id,
      toEmails: toEmails.split(',').map(e => e.trim()).filter(Boolean),
      ccEmails: ccEmails.split(',').map(e => e.trim()).filter(Boolean),
      bccEmails: bccEmails.split(',').map(e => e.trim()).filter(Boolean),
      contentData: {
        subject_data: { ...subjectVariables },
        body_data: bodyData
      }
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
      
      return selectedTemplate.sections
        .map((section) => renderSectionContent(section, allVars))
        .join('');
    }
    
    // Otherwise render from html field
    return replaceVariables(selectedTemplate.html, variables, listVariables);
  }, [selectedTemplate, variables, listVariables, tableVariables]);

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
                  {/* Subject Variables Section */}
                  {Object.keys(subjectVariables).length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                        <span className="text-sm font-semibold text-foreground">Subject Variables</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Template: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{getDisplaySubject()}</code>
                      </p>
                      <div className={styles.formGrid}>
                        {Object.keys(subjectVariables).map((varName) => (
                          <div key={`subject-var-${varName}`} className={styles.formField}>
                            <Label htmlFor={`subject-var-input-${varName}`} className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs font-mono bg-destructive/10 border-destructive/30">
                                {`{{${varName}}}`}
                              </Badge>
                              <span className="font-medium">{varName}</span>
                              <Badge variant="secondary" className="text-xs">Subject</Badge>
                            </Label>
                            <Input
                              id={`subject-var-input-${varName}`}
                              placeholder={`Enter value for ${varName}...`}
                              value={subjectVariables[varName] || ''}
                              onChange={(e) => setSubjectVariables(prev => ({
                                ...prev,
                                [varName]: e.target.value
                              }))}
                              className={!subjectVariables[varName]?.trim() ? 'border-destructive/50' : ''}
                            />
                            {!subjectVariables[varName]?.trim() && (
                              <p className="text-xs text-destructive">This field is required</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Body Variables Section */}
                  {extractAllVariables(selectedTemplate).length === 0 && Object.keys(subjectVariables).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No variables in this template</p>
                    </div>
                  ) : extractAllVariables(selectedTemplate).length > 0 && (
                    <>
                      {Object.keys(subjectVariables).length > 0 && (
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                          <span className="text-sm font-semibold text-foreground">Body Variables</span>
                        </div>
                      )}
                      <div className={styles.formGrid}>
                        {extractAllVariables(selectedTemplate).map((varName) => {
                        const isList = isListVariable(varName);
                        const isTable = isTableVariable(varName);
                        const editable = isLabelEditable(varName);
                        const context = getVariableContext(varName);
                        
                        return (
                          <div key={varName} className={styles.formField}>
                            <Label htmlFor={`var-${varName}`} className="flex items-center gap-2 flex-wrap">
                              {editable ? (
                                <Badge variant="outline" className="text-xs font-mono">
                                  {`{{${varName}}}`}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs font-mono bg-muted">
                                  {`{{${varName}}}`}
                                </Badge>
                              )}
                              <span className="font-medium">{varName}</span>
                              {context && (
                                <Badge variant="secondary" className="text-xs">
                                  {context.sectionType}
                                </Badge>
                              )}
                              {isList && (
                                <Badge variant="secondary" className="text-xs">
                                  List
                                </Badge>
                              )}
                              {isTable && (
                                <Badge variant="secondary" className="text-xs">
                                  Table
                                </Badge>
                              )}
                              {!editable && (
                                <Badge variant="outline" className="text-xs">
                                  Locked
                                </Badge>
                              )}
                            </Label>
                            {context && context.context && (
                              <p className="text-xs text-muted-foreground italic mt-1 mb-2">
                                {context.context}
                              </p>
                            )}
                            {isTable ? (
                              <div className="space-y-2 border rounded-lg p-4 bg-background">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs text-muted-foreground">
                                    Edit table content
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const tableData = tableVariables[varName] || { headers: [], rows: [] };
                                        setTableVariables(prev => ({
                                          ...prev,
                                          [varName]: {
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
                                        const tableData = tableVariables[varName] || { headers: [], rows: [] };
                                        const newRow = new Array(tableData.headers?.length || 1).fill('');
                                        setTableVariables(prev => ({
                                          ...prev,
                                          [varName]: {
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
                                
                                {(() => {
                                  const tableData = tableVariables[varName] || { headers: [], rows: [] };
                                  if (!tableData.headers || tableData.headers.length === 0) {
                                    return <p className="text-xs text-muted-foreground text-center py-4">Click "Column" to start</p>;
                                  }
                                  
                                  return (
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse border text-sm">
                                        <thead>
                                          <tr>
                                            {tableData.headers.map((header: string, colIdx: number) => (
                                              <th key={colIdx} className="border p-1 bg-muted">
                                                <div className="flex items-center gap-1">
                                                  <Input
                                                    value={header}
                                                    onChange={(e) => {
                                                      const newHeaders = [...tableData.headers];
                                                      newHeaders[colIdx] = e.target.value;
                                                      setTableVariables(prev => ({
                                                        ...prev,
                                                        [varName]: { ...tableData, headers: newHeaders }
                                                      }));
                                                    }}
                                                    className="h-7 text-xs font-semibold"
                                                    placeholder={`Header ${colIdx + 1}`}
                                                    disabled={!editable}
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
                                                        [varName]: { headers: newHeaders, rows: newRows }
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
                                                  <div className="flex items-center gap-1">
                                                    <Input
                                                      value={cell}
                                                      onChange={(e) => {
                                                        const newRows = [...tableData.rows];
                                                        newRows[rowIdx][colIdx] = e.target.value;
                                                        setTableVariables(prev => ({
                                                          ...prev,
                                                          [varName]: { ...tableData, rows: newRows }
                                                        }));
                                                      }}
                                                      className="h-7 text-xs"
                                                      placeholder={`R${rowIdx + 1}C${colIdx + 1}`}
                                                      disabled={!editable}
                                                    />
                                                  </div>
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
                                                      [varName]: { ...tableData, rows: newRows }
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
                                  );
                                })()}
                              </div>
                            ) : isList ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setListVariables(prev => ({
                                        ...prev,
                                        [varName]: [...(prev[varName] || []), ''] as string[] | ListItemStyle[]
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
                                  {((listVariables[varName] || ['']) as (string | ListItemStyle)[]).map((item, index) => {
                                    const itemValue = typeof item === 'object' && 'text' in item ? item.text : item as string;
                                    const itemStyle = typeof item === 'object' && 'text' in item ? item as ListItemStyle : { text: item as string };
                                    
                                    return (
                                      <div key={index} className={styles.listItemRow}>
                                        <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                                        <Input
                                          value={itemValue}
                                          placeholder={`Item ${index + 1}`}
                                          onChange={(e) => {
                                            setListVariables(prev => {
                                              const newItems = [...(prev[varName] || [])] as (string | ListItemStyle)[];
                                              if (typeof newItems[index] === 'object' && 'text' in newItems[index]) {
                                                newItems[index] = { ...(newItems[index] as ListItemStyle), text: e.target.value };
                                              } else {
                                                newItems[index] = e.target.value;
                                              }
                                              return { ...prev, [varName]: newItems as string[] | ListItemStyle[] };
                                            });
                                          }}
                                          className="flex-1 h-8"
                                          disabled={!editable}
                                          style={{
                                            color: itemStyle.color,
                                            fontWeight: itemStyle.bold ? 'bold' : 'normal',
                                            fontStyle: itemStyle.italic ? 'italic' : 'normal',
                                            textDecoration: itemStyle.underline ? 'underline' : 'none',
                                            backgroundColor: itemStyle.backgroundColor,
                                            fontSize: itemStyle.fontSize
                                          }}
                                        />
                                        
                                        {/* Formatting Popover */}
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-8 w-8 hover:bg-primary/10"
                                              disabled={!editable}
                                            >
                                              <Palette className="h-3.5 w-3.5" />
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-72" align="start">
                                            <div className="space-y-4">
                                              <h4 className="font-medium text-sm">Item Formatting</h4>
                                              
                                              {/* Text Style Toggles */}
                                              <div className="space-y-2">
                                                <Label className="text-xs">Text Style</Label>
                                                <div className="flex gap-2">
                                                  <Button
                                                    size="sm"
                                                    variant={itemStyle.bold ? "default" : "outline"}
                                                    onClick={() => {
                                                      setListVariables(prev => {
                                                        const newItems = [...(prev[varName] || [])] as (string | ListItemStyle)[];
                                                        const current = typeof newItems[index] === 'object' && 'text' in newItems[index]
                                                          ? (newItems[index] as ListItemStyle)
                                                          : { text: newItems[index] as string };
                                                        newItems[index] = { ...current, bold: !current.bold } as ListItemStyle;
                                                        return { ...prev, [varName]: newItems as string[] | ListItemStyle[] };
                                                      });
                                                    }}
                                                    className="h-8 w-8 p-0"
                                                  >
                                                    <Bold className="h-3.5 w-3.5" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant={itemStyle.italic ? "default" : "outline"}
                                                    onClick={() => {
                                                      setListVariables(prev => {
                                                        const newItems = [...(prev[varName] || [])] as (string | ListItemStyle)[];
                                                        const current = typeof newItems[index] === 'object' && 'text' in newItems[index]
                                                          ? (newItems[index] as ListItemStyle)
                                                          : { text: newItems[index] as string };
                                                        newItems[index] = { ...current, italic: !current.italic } as ListItemStyle;
                                                        return { ...prev, [varName]: newItems as string[] | ListItemStyle[] };
                                                      });
                                                    }}
                                                    className="h-8 w-8 p-0"
                                                  >
                                                    <Italic className="h-3.5 w-3.5" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant={itemStyle.underline ? "default" : "outline"}
                                                    onClick={() => {
                                                      setListVariables(prev => {
                                                        const newItems = [...(prev[varName] || [])] as (string | ListItemStyle)[];
                                                        const current = typeof newItems[index] === 'object' && 'text' in newItems[index]
                                                          ? (newItems[index] as ListItemStyle)
                                                          : { text: newItems[index] as string };
                                                        newItems[index] = { ...current, underline: !current.underline } as ListItemStyle;
                                                        return { ...prev, [varName]: newItems as string[] | ListItemStyle[] };
                                                      });
                                                    }}
                                                    className="h-8 w-8 p-0"
                                                  >
                                                    <Underline className="h-3.5 w-3.5" />
                                                  </Button>
                                                </div>
                                              </div>
                                              
                                              {/* Text Color */}
                                              <div className="space-y-2">
                                                <Label className="text-xs">Text Color</Label>
                                                <div className="flex gap-2">
                                                  <Input
                                                    type="color"
                                                    value={itemStyle.color || '#000000'}
                                                    onChange={(e) => {
                                                      setListVariables(prev => {
                                                        const newItems = [...(prev[varName] || [])] as (string | ListItemStyle)[];
                                                        const current = typeof newItems[index] === 'object' && 'text' in newItems[index]
                                                          ? (newItems[index] as ListItemStyle)
                                                          : { text: newItems[index] as string };
                                                        newItems[index] = { ...current, color: e.target.value } as ListItemStyle;
                                                        return { ...prev, [varName]: newItems as string[] | ListItemStyle[] };
                                                      });
                                                    }}
                                                    className="h-8 w-16"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                        
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          onClick={() => {
                                            setListVariables(prev => {
                                              const newItems = ((prev[varName] || []) as (string | ListItemStyle)[]).filter((_, i) => i !== index);
                                              return { ...prev, [varName]: newItems as string[] | ListItemStyle[] };
                                            });
                                          }}
                                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                          disabled={!editable || (listVariables[varName] || ['']).length <= 1}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  id={`var-${varName}`}
                                  placeholder={`Enter ${varName}`}
                                  value={typeof variables[varName] === 'object' && variables[varName] !== null && 'text' in variables[varName] 
                                    ? (variables[varName] as TextStyle).text 
                                    : (variables[varName] as string || "")}
                                  onChange={(e) => {
                                    const currentVar = variables[varName];
                                    if (typeof currentVar === 'object' && currentVar !== null && 'text' in currentVar) {
                                      setVariables({ ...variables, [varName]: { ...currentVar, text: e.target.value } });
                                    } else {
                                      setVariables({ ...variables, [varName]: e.target.value });
                                    }
                                  }}
                                  className="flex-1"
                                  disabled={!editable}
                                  style={typeof variables[varName] === 'object' && variables[varName] !== null && 'text' in variables[varName]
                                    ? {
                                        color: (variables[varName] as TextStyle).color,
                                        fontWeight: (variables[varName] as TextStyle).bold ? 'bold' : 'normal',
                                        fontStyle: (variables[varName] as TextStyle).italic ? 'italic' : 'normal',
                                        textDecoration: (variables[varName] as TextStyle).underline ? 'underline' : 'none',
                                        backgroundColor: (variables[varName] as TextStyle).backgroundColor,
                                        fontSize: (variables[varName] as TextStyle).fontSize
                                      }
                                    : undefined
                                  }
                                />
                                
                                {/* Text Formatting Popover */}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 hover:bg-primary/10"
                                      disabled={!editable}
                                    >
                                      <Palette className="h-3.5 w-3.5" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-72" align="start">
                                    <div className="space-y-4">
                                      <h4 className="font-medium text-sm">Text Formatting</h4>
                                      
                                      {/* Font Size */}
                                      <div className="space-y-2">
                                        <Label className="text-xs">Font Size</Label>
                                        <select
                                          value={(typeof variables[varName] === 'object' && variables[varName] !== null && 'fontSize' in variables[varName] 
                                            ? (variables[varName] as TextStyle).fontSize 
                                            : undefined) || '14px'}
                                          onChange={(e) => {
                                            const currentVar = variables[varName];
                                            const current = typeof currentVar === 'object' && currentVar !== null && 'text' in currentVar
                                              ? currentVar as TextStyle
                                              : { text: currentVar as string || '' };
                                            setVariables({ ...variables, [varName]: { ...current, fontSize: e.target.value } });
                                          }}
                                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                        >
                                          <option value="10px">10px</option>
                                          <option value="12px">12px</option>
                                          <option value="14px">14px</option>
                                          <option value="16px">16px</option>
                                          <option value="18px">18px</option>
                                          <option value="20px">20px</option>
                                          <option value="24px">24px</option>
                                        </select>
                                      </div>
                                      
                                      {/* Text Style Toggles */}
                                      <div className="space-y-2">
                                        <Label className="text-xs">Text Style</Label>
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant={(typeof variables[varName] === 'object' && variables[varName] !== null && 'bold' in variables[varName] && (variables[varName] as TextStyle).bold) ? "default" : "outline"}
                                            onClick={() => {
                                              const currentVar = variables[varName];
                                              const current = typeof currentVar === 'object' && currentVar !== null && 'text' in currentVar
                                                ? currentVar as TextStyle
                                                : { text: currentVar as string || '' };
                                              setVariables({ ...variables, [varName]: { ...current, bold: !current.bold } });
                                            }}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Bold className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant={(typeof variables[varName] === 'object' && variables[varName] !== null && 'italic' in variables[varName] && (variables[varName] as TextStyle).italic) ? "default" : "outline"}
                                            onClick={() => {
                                              const currentVar = variables[varName];
                                              const current = typeof currentVar === 'object' && currentVar !== null && 'text' in currentVar
                                                ? currentVar as TextStyle
                                                : { text: currentVar as string || '' };
                                              setVariables({ ...variables, [varName]: { ...current, italic: !current.italic } });
                                            }}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Italic className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant={(typeof variables[varName] === 'object' && variables[varName] !== null && 'underline' in variables[varName] && (variables[varName] as TextStyle).underline) ? "default" : "outline"}
                                            onClick={() => {
                                              const currentVar = variables[varName];
                                              const current = typeof currentVar === 'object' && currentVar !== null && 'text' in currentVar
                                                ? currentVar as TextStyle
                                                : { text: currentVar as string || '' };
                                              setVariables({ ...variables, [varName]: { ...current, underline: !current.underline } });
                                            }}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Underline className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      {/* Text Color */}
                                      <div className="space-y-2">
                                        <Label className="text-xs">Text Color</Label>
                                        <Input
                                          type="color"
                                          value={(typeof variables[varName] === 'object' && variables[varName] !== null && 'color' in variables[varName] 
                                            ? (variables[varName] as TextStyle).color 
                                            : undefined) || '#000000'}
                                          onChange={(e) => {
                                            const currentVar = variables[varName];
                                            const current = typeof currentVar === 'object' && currentVar !== null && 'text' in currentVar
                                              ? currentVar as TextStyle
                                              : { text: currentVar as string || '' };
                                            setVariables({ ...variables, [varName]: { ...current, color: e.target.value } });
                                          }}
                                          className="h-8 w-16"
                                        />
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Preview (Email Body) */}
            <div className={styles.previewPanel}>
              <div className={styles.previewPanelHeader}>
                <h2>
                  <Eye className="h-4 w-4" />
                  Email Body Preview
                </h2>
              </div>
              <ScrollArea className="flex-1">
                <div className={styles.previewBody}>
                  {selectedTemplate.sections && selectedTemplate.sections.length > 0 ? (
                    <div
                      dangerouslySetInnerHTML={{ 
                        __html: selectedTemplate.sections.map(section => {
                          const runtimeVars: Record<string, string | string[] | any> = {
                            ...variables,
                            ...listVariables,
                            ...tableVariables
                          };
                          return renderSectionContent(section, runtimeVars);
                        }).join('')
                      }}
                      className={styles.previewContent}
                    />
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
    </div>
  );
};

export default RunTemplates;
