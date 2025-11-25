import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as React from "react";
import styles from "./RunTemplates.module.scss";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Calendar, PlayCircle, Plus, Trash2, Palette, Bold, Italic, Underline } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTemplates, Template } from "@/lib/templateStorage";
import { Section, ListItemStyle, TextStyle } from "@/types/section";
import { renderSectionContent } from "@/lib/templateUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const RunTemplates = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const templateFromState = location.state?.template;
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(templateFromState || null);
  const [variables, setVariables] = useState<Record<string, string | TextStyle>>({});
  const [listVariables, setListVariables] = useState<Record<string, string[] | ListItemStyle[]>>({});
  const [tableVariables, setTableVariables] = useState<Record<string, any>>({});
  const [toEmails, setToEmails] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [bccEmails, setBccEmails] = useState("");
  const [viewMode, setViewMode] = useState<'template' | 'execution'>('template'); // New: toggle between template view and execution view
  const [executedOn, setExecutedOn] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailTitle, setEmailTitle] = useState<string>("");
  const { toast } = useToast();

  // Load templates from localStorage
  useEffect(() => {
    const loadedTemplates = getTemplates().filter(t => !t.archived);
    setTemplates(loadedTemplates);
  }, []);

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

  // Check if a variable is a list type based on sections
  const isListVariable = (varName: string): boolean => {
    if (!selectedTemplate?.sections) return false;
    
    for (const section of selectedTemplate.sections) {
      // For labeled-content sections, check contentType
      if (section.type === 'labeled-content' && section.variables?.label === varName) {
        return section.variables?.contentType === 'list';
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
      if (section.type === 'labeled-content' && section.variables?.label === varName) {
        return section.variables.contentType === 'table';
      }
      return false;
    });
  };

  // Check if a label is editable at runtime
  const isLabelEditable = (varName: string): boolean => {
    if (!selectedTemplate?.sections) return true;
    
    const section = selectedTemplate.sections.find(section => 
      section.type === 'labeled-content' && section.variables?.label === varName
    );
    return section?.isLabelEditable !== false;
  };

  // Get default value for a variable from sections
  const getDefaultValue = (varName: string): string | string[] | any => {
    if (!selectedTemplate?.sections) return '';
    
    for (const section of selectedTemplate.sections) {
      // For labeled-content sections, return content or items based on contentType
      if (section.type === 'labeled-content' && section.variables?.label === varName) {
        if (section.variables.contentType === 'list') {
          return (section.variables.items as string[]) || [''];
        } else if (section.variables.contentType === 'table') {
          const tableData = section.variables.tableData;
          if (tableData && tableData.headers) {
            return {
              headers: tableData.headers || [],
              rows: tableData.rows || []
            };
          }
          return { headers: [], rows: [] };
        }
        return (section.variables.content as string) || '';
      }
      
      if (section.variables && section.variables[varName] !== undefined) {
        const value = section.variables[varName];
        return Array.isArray(value) ? value : String(value);
      }
    }
    return '';
  };

  // Extract variables from both HTML and sections
  const extractAllVariables = (template: Template): string[] => {
    const varsFromHtml = extractVariables(template.html);
    const varsFromSections = new Set<string>();

    // Extract from sections if available
    if (template.sections) {
      template.sections.forEach((section: Section) => {
        // For labeled-content sections, extract variables from both label and content
        if (section.type === 'labeled-content') {
          // Extract variables from the label itself
          if (section.variables?.label) {
            const labelVars = extractVariables(section.variables.label as string);
            labelVars.forEach(v => varsFromSections.add(v));
          }
          
          // Also add the label as a variable name for content (if not editable, skip content variable)
          if (section.variables?.label) {
            varsFromSections.add(section.variables.label as string);
          }
          return;
        }
        
        // For mixed-content sections, extract from content variable
        if (section.type === 'mixed-content' && section.variables?.content) {
          const mixedVars = extractVariables(section.variables.content as string);
          mixedVars.forEach(v => varsFromSections.add(v));
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
    setEmailSubject(`${template.name} - ${new Date().toLocaleDateString()}`);
    setEmailTitle(template.name);
  };

  const handleSendTemplate = () => {
    if (!selectedTemplate) return;

    // Validate subject
    if (!emailSubject.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an email subject.",
        variant: "destructive",
      });
      return;
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

    // Save to database (mock)
    const runData = {
      templateId: selectedTemplate.id,
      subject: emailSubject,
      toEmails: toEmails.split(',').map(e => e.trim()),
      ccEmails: ccEmails.split(',').map(e => e.trim()).filter(Boolean),
      bccEmails: bccEmails.split(',').map(e => e.trim()).filter(Boolean),
      variables,
      listVariables,
      htmlOutput: replaceVariables(selectedTemplate.html, variables, listVariables),
      runAt: new Date().toISOString(),
    };

    console.log("Template run data:", runData);

    toast({
      title: "Template Sent",
      description: `"${emailSubject}" sent successfully to ${runData.toEmails.length} recipient(s).`,
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
      {!selectedTemplate ? (
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
            {templates.length === 0 ? (
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
                      onClick={() => handleRunTemplate(template)}
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
        // Side-by-Side Run View
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="border-b bg-card/50 backdrop-blur-sm p-4">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTemplate(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Change Template
                </Button>
                <div>
                  <h1 className="text-xl font-bold">{selectedTemplate.name}</h1>
                  <p className="text-xs text-muted-foreground">
                    Configure and send template
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSendTemplate}
                className="shadow-lg shadow-primary/20"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Template
              </Button>
            </div>
          </div>

          {/* Side-by-Side Layout */}
          <div className={styles.mainContent}>
            {/* Left Panel - Configuration */}
            <div className={styles.editorSection}>
              <ScrollArea className="h-full">
                <div>
                  {/* Email Recipients */}
                  <Card>
                    <div className={styles.sectionHeader}>
                      <h2>Email Configuration</h2>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <Label htmlFor="subject">
                          Subject <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="subject"
                          placeholder="Enter email subject"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                        />
                      </div>

                      <div className={styles.formField}>
                        <Label htmlFor="to-emails">
                          To <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="to-emails"
                          placeholder="email1@example.com, email2@example.com"
                          value={toEmails}
                          onChange={(e) => setToEmails(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter comma-separated email addresses
                        </p>
                      </div>

                      <div className={styles.formField}>
                        <Label htmlFor="cc-emails">CC (Optional)</Label>
                        <Input
                          id="cc-emails"
                          placeholder="email@example.com, email2@example.com"
                          value={ccEmails}
                          onChange={(e) => setCcEmails(e.target.value)}
                        />
                      </div>

                      <div className={styles.formField}>
                        <Label htmlFor="bcc-emails">BCC (Optional)</Label>
                        <Input
                          id="bcc-emails"
                          placeholder="email@example.com, email2@example.com"
                          value={bccEmails}
                          onChange={(e) => setBccEmails(e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Template Variables */}
                  {extractAllVariables(selectedTemplate).length > 0 && (
                    <Card>
                      <div className={styles.sectionHeader}>
                        <h2>Template Variables</h2>
                      </div>
                      <div className={styles.formGrid}>
                        {extractAllVariables(selectedTemplate).map((varName) => {
                          const isList = isListVariable(varName);
                          const isTable = isTableVariable(varName);
                          const editable = isLabelEditable(varName);
                          
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
                                <span>{varName}</span>
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
                                    Label locked
                                  </Badge>
                                )}
                              </Label>
                              {isTable ? (
                                <div className="space-y-2 border rounded-lg p-4">
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
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Column
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
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Row
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {(() => {
                                    const tableData = tableVariables[varName] || { headers: [], rows: [] };
                                    if (!tableData.headers || tableData.headers.length === 0) {
                                      return <p className="text-xs text-muted-foreground text-center py-4">Click "Add Column" to start</p>;
                                    }
                                    
                                    return (
                                      <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border">
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
                                                      disabled={tableData.headers.length <= 1}
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
                                                      />
                                                      {colIdx === row.length - 1 && (
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
                                                          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                                                          disabled={tableData.rows.length <= 1}
                                                        >
                                                          <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                      )}
                                                    </div>
                                                  </td>
                                                ))}
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
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground">List Items</span>
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
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Item
                                      </Button>
                                  </div>
                                   <div className="space-y-2 pl-2 border-l-2 border-muted">
                                     {(listVariables[varName] || ['']).map((item, index) => {
                                      const isStyled = typeof item === 'object' && 'text' in item;
                                      const itemValue = isStyled ? (item as ListItemStyle).text : (item as string);
                                      const itemStyle = isStyled ? (item as ListItemStyle) : { text: item as string };
                                      
                                      return (
                                        <div key={index} className="flex items-center gap-2 ml-2">
                                           <Input
                                            value={itemValue}
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
                                            placeholder={`Item ${index + 1}`}
                                            className="h-8 text-sm flex-1"
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
                                                  <div className="flex gap-2">
                                                    <select
                                                      value={itemStyle.fontSize || '14px'}
                                                      onChange={(e) => {
                                                        setListVariables(prev => {
                                                          const newItems = [...(prev[varName] || [])] as (string | ListItemStyle)[];
                                                          const current = typeof newItems[index] === 'object' && 'text' in newItems[index]
                                                            ? (newItems[index] as ListItemStyle)
                                                            : { text: newItems[index] as string };
                                                          newItems[index] = { ...current, fontSize: e.target.value } as ListItemStyle;
                                                          return { ...prev, [varName]: newItems as string[] | ListItemStyle[] };
                                                        });
                                                      }}
                                                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                                    >
                                                      <option value="10px">10px</option>
                                                      <option value="12px">12px</option>
                                                      <option value="14px">14px</option>
                                                      <option value="16px">16px</option>
                                                      <option value="18px">18px</option>
                                                      <option value="20px">20px</option>
                                                      <option value="24px">24px</option>
                                                      <option value="28px">28px</option>
                                                      <option value="32px">32px</option>
                                                    </select>
                                                  </div>
                                                </div>
                                                
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
                                                      title="Bold"
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
                                                      title="Italic"
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
                                                      title="Underline"
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
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => {
                                                        setListVariables(prev => {
                                                          const newItems = [...(prev[varName] || [])] as (string | ListItemStyle)[];
                                                          const current = typeof newItems[index] === 'object' && 'text' in newItems[index]
                                                            ? (newItems[index] as ListItemStyle)
                                                            : { text: newItems[index] as string };
                                                          const { color, ...rest } = current;
                                                          newItems[index] = rest as ListItemStyle;
                                                          return { ...prev, [varName]: newItems as string[] | ListItemStyle[] };
                                                        });
                                                      }}
                                                      className="h-8"
                                                    >
                                                      Clear
                                                    </Button>
                                                  </div>
                                                </div>
                                                
                                                {/* Background Color */}
                                                <div className="space-y-2">
                                                  <Label className="text-xs">Background Color</Label>
                                                  <div className="flex gap-2">
                                                    <Input
                                                      type="color"
                                                      value={itemStyle.backgroundColor || '#ffffff'}
                                                      onChange={(e) => {
                                                        setListVariables(prev => {
                                                          const newItems = [...(prev[varName] || [])] as (string | ListItemStyle)[];
                                                          const current = typeof newItems[index] === 'object' && 'text' in newItems[index]
                                                            ? (newItems[index] as ListItemStyle)
                                                            : { text: newItems[index] as string };
                                                          newItems[index] = { ...current, backgroundColor: e.target.value } as ListItemStyle;
                                                          return { ...prev, [varName]: newItems as string[] | ListItemStyle[] };
                                                        });
                                                      }}
                                                      className="h-8 w-16"
                                                    />
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => {
                                                        setListVariables(prev => {
                                                          const newItems = [...(prev[varName] || [])] as (string | ListItemStyle)[];
                                                          const current = typeof newItems[index] === 'object' && 'text' in newItems[index]
                                                            ? (newItems[index] as ListItemStyle)
                                                            : { text: newItems[index] as string };
                                                          const { backgroundColor, ...rest } = current;
                                                          newItems[index] = rest as ListItemStyle;
                                                          return { ...prev, [varName]: newItems as string[] | ListItemStyle[] };
                                                        });
                                                      }}
                                                      className="h-8"
                                                    >
                                                      Clear
                                                    </Button>
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
                                            disabled={(listVariables[varName] || ['']).length <= 1}
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
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                          >
                                            <option value="10px">10px</option>
                                            <option value="12px">12px</option>
                                            <option value="14px">14px</option>
                                            <option value="16px">16px</option>
                                            <option value="18px">18px</option>
                                            <option value="20px">20px</option>
                                            <option value="24px">24px</option>
                                            <option value="28px">28px</option>
                                            <option value="32px">32px</option>
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
                                              title="Bold"
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
                                              title="Italic"
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
                                              title="Underline"
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
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                const currentVar = variables[varName];
                                                if (typeof currentVar === 'object' && currentVar !== null && 'text' in currentVar) {
                                                  const { color, ...rest } = currentVar as TextStyle;
                                                  setVariables({ ...variables, [varName]: rest });
                                                }
                                              }}
                                              className="h-8"
                                            >
                                              Clear
                                            </Button>
                                          </div>
                                        </div>
                                        
                                        {/* Background Color */}
                                        <div className="space-y-2">
                                          <Label className="text-xs">Background Color</Label>
                                          <div className="flex gap-2">
                                            <Input
                                              type="color"
                                              value={(typeof variables[varName] === 'object' && variables[varName] !== null && 'backgroundColor' in variables[varName] 
                                                ? (variables[varName] as TextStyle).backgroundColor 
                                                : undefined) || '#ffffff'}
                                              onChange={(e) => {
                                                const currentVar = variables[varName];
                                                const current = typeof currentVar === 'object' && currentVar !== null && 'text' in currentVar
                                                  ? currentVar as TextStyle
                                                  : { text: currentVar as string || '' };
                                                setVariables({ ...variables, [varName]: { ...current, backgroundColor: e.target.value } });
                                              }}
                                              className="h-8 w-16"
                                            />
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                const currentVar = variables[varName];
                                                if (typeof currentVar === 'object' && currentVar !== null && 'text' in currentVar) {
                                                  const { backgroundColor, ...rest } = currentVar as TextStyle;
                                                  setVariables({ ...variables, [varName]: rest });
                                                }
                                              }}
                                              className="h-8"
                                            >
                                              Clear
                                            </Button>
                                          </div>
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
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right Panel - Live Preview */}
            <div className={styles.previewSection}>
              <div className={styles.sectionHeader}>
                <h2>Live Preview</h2>
                <p className="text-xs text-muted-foreground">
                  Preview updates as you enter variable values
                </p>
              </div>
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div>
                  {selectedTemplate.sections && selectedTemplate.sections.length > 0 ? (
                    // Render from sections with runtime values
                    <div
                      dangerouslySetInnerHTML={{ 
                        __html: selectedTemplate.sections.map(section => {
                          // Combine variables, listVariables, and tableVariables for rendering
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
                    // Render from HTML for legacy templates
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
    </div>
  );
};

export default RunTemplates;
