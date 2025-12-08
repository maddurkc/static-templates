/**
 * Template API Service
 * Handles all backend API calls for template management
 */

import { Section, SectionType } from "@/types/section";
import { ApiConfig } from "@/types/api-config";
import { TemplateVariableRequest, TemplateVariableResponse } from "@/types/template-variable";
import { generateListVariableName, generateThymeleafListHtml } from "@/lib/listThymeleafUtils";

// API Configuration - Update this to match your backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Request/Response Types matching backend DTOs
export interface TemplateSectionRequest {
  sectionId: string;
  sectionType: string; // Store the section type for proper reconstruction
  orderIndex: number;
  parentSectionId: string | null;
  content: string;
  variables: Record<string, string | string[]>;
  styles: Record<string, string>;
  isLabelEditable: boolean;
  listItems?: ListItemRequest[];
  tableData?: TableDataRequest;
}

export interface ListItemRequest {
  id: string;
  content: string;
  styles: Record<string, string>;
  children?: ListItemRequest[];
}

export interface TableDataRequest {
  headers: string[];
  rows: string[][];
}

export interface TemplateCreateRequest {
  name: string;
  subject?: string; // Email subject - can contain {{placeholders}}
  html: string;
  sectionCount: number;
  archived: boolean;
  sections: TemplateSectionRequest[];
  variables?: TemplateVariableRequest[]; // Template-level variables registry
  apiConfig?: ApiConfigRequest;
}

export interface TemplateUpdateRequest {
  name?: string;
  subject?: string; // Email subject - can contain {{placeholders}}
  html?: string;
  sectionCount?: number;
  archived?: boolean;
  sections?: TemplateSectionRequest[];
  variables?: TemplateVariableRequest[]; // Template-level variables registry
  apiConfig?: ApiConfigRequest;
}

export interface ApiConfigRequest {
  enabled: boolean;
  templateId: string;
  paramValues: Record<string, string>;
  mappings: ApiMappingRequest[];
}

export interface ApiMappingRequest {
  sectionId: string;
  apiPath: string;
  dataType: 'text' | 'list' | 'html';
  variableName?: string;
}

export interface TemplateResponse {
  id: string;
  name: string;
  subject?: string; // Email subject - can contain {{placeholders}}
  html: string;
  sectionCount: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  sections: TemplateSectionResponse[];
  variables?: TemplateVariableResponse[]; // Template-level variables registry
  apiConfig?: ApiConfigResponse;
}

export interface TemplateSectionResponse {
  id: string;
  sectionId: string;
  sectionType?: string; // Section type for proper reconstruction
  orderIndex: number;
  parentSectionId: string | null;
  content: string;
  variables: Record<string, string | string[]>;
  styles: Record<string, string>;
  isLabelEditable: boolean;
  listItems?: ListItemResponse[];
  tableData?: TableDataResponse;
}

export interface ListItemResponse {
  id: string;
  content: string;
  styles: Record<string, string>;
  children?: ListItemResponse[];
}

export interface TableDataResponse {
  headers: string[];
  rows: string[][];
}

export interface ApiConfigResponse {
  id: string;
  enabled: boolean;
  templateId: string;
  paramValues: Record<string, string>;
  mappings: ApiMappingResponse[];
}

export interface ApiMappingResponse {
  id: string;
  sectionId: string;
  apiPath: string;
  dataType: string;
  variableName?: string;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

// Helper function to convert Section to TemplateSectionRequest
export const sectionToRequest = (
  section: Section,
  orderIndex: number,
  parentSectionId: string | null = null
): TemplateSectionRequest => {
  const variables = section.variables || {};
  
  // For labeled-content sections, clean up variables to store only essential data
  let cleanVariables: Record<string, any> = {};
  
  if (section.type === 'labeled-content') {
    const contentType = (variables.contentType as string) || 'text';
    const listStyle = (variables.listStyle as string) || 'circle';
    
    // Generate unique list variable name based on section ID
    const listVariableName = generateListVariableName(section.id);
    
    // Always store essential properties
    cleanVariables.label = variables.label || '';
    cleanVariables.contentType = contentType;
    cleanVariables.listStyle = listStyle;
    cleanVariables.listVariableName = listVariableName; // Store for reference
    
    // Copy any label placeholder default values (e.g., incidentNumber: "123")
    const labelText = (variables.label as string) || '';
    // Match both {{placeholder}} and ${placeholder} formats
    const placeholderMatches = labelText.match(/\$\{(\w+)\}/g) || [];
    const doubleBraceMatches = labelText.match(/\{\{(\w+)\}\}/g) || [];
    
    placeholderMatches.forEach(match => {
      const varName = match.replace(/\$\{|\}/g, '');
      if (variables[varName] !== undefined) {
        cleanVariables[varName] = variables[varName];
      }
    });
    
    doubleBraceMatches.forEach(match => {
      const varName = match.replace(/\{\{|\}\}/g, '');
      if (variables[varName] !== undefined) {
        cleanVariables[varName] = variables[varName];
      }
    });
    
    // Store ONLY the appropriate content based on contentType - mutually exclusive
    if (contentType === 'list') {
      // Store items with the unique variable name
      cleanVariables[listVariableName] = variables.items || [{ text: 'Item 1', children: [] }];
      // Also store items for backward compatibility during edit
      cleanVariables.items = variables.items || [{ text: 'Item 1', children: [] }];
      // Generate Thymeleaf list HTML
      cleanVariables.listHtml = generateThymeleafListHtml(listVariableName, listStyle);
      // Do NOT include content or tableData for list type
    } else if (contentType === 'table') {
      cleanVariables.tableData = variables.tableData || { headers: ['Column 1'], rows: [['Cell 1']] };
      // Do NOT include content or items for table type
    } else {
      // text content type
      cleanVariables.content = variables.content || '';
      // Do NOT include items or tableData for text type
    }
  } else {
    // For non-labeled-content sections, copy all variables
    cleanVariables = { ...variables };
  }
  
  const request: TemplateSectionRequest = {
    sectionId: section.id,
    sectionType: section.type, // Store section type for reconstruction
    orderIndex,
    parentSectionId,
    content: section.content,
    variables: cleanVariables,
    styles: section.styles || {},
    isLabelEditable: section.isLabelEditable ?? true,
  };

  // Add list items for non-labeled-content sections
  if (section.type !== 'labeled-content') {
    const listItems = variables.listItems as any[] | undefined;
    if (listItems && Array.isArray(listItems) && listItems.length > 0) {
      request.listItems = listItems.map((item: any) => ({
        id: item.id || `item-${Date.now()}`,
        content: item.text || item.content || '',
        styles: {
          color: item.color,
          backgroundColor: item.backgroundColor,
          fontSize: item.fontSize,
          bold: item.bold,
          italic: item.italic,
          underline: item.underline,
        },
        children: item.children?.map((child: any) => ({
          id: child.id || `child-${Date.now()}`,
          content: child.text || child.content || '',
          styles: {
            color: child.color,
            backgroundColor: child.backgroundColor,
            fontSize: child.fontSize,
            bold: child.bold,
            italic: child.italic,
            underline: child.underline,
          },
          children: child.children?.map((grandChild: any) => ({
            id: grandChild.id || `grandchild-${Date.now()}`,
            content: grandChild.text || grandChild.content || '',
            styles: {
              color: grandChild.color,
              backgroundColor: grandChild.backgroundColor,
              fontSize: grandChild.fontSize,
              bold: grandChild.bold,
              italic: grandChild.italic,
              underline: grandChild.underline,
            },
          })),
        })),
      }));
    }

    // Add table data for non-labeled-content sections
    const tableHeaders = variables.tableHeaders as string[] | undefined;
    const tableRows = variables.tableRows as string[][] | undefined;
    if (tableHeaders && tableRows) {
      request.tableData = {
        headers: tableHeaders,
        rows: tableRows,
      };
    }
  }

  return request;
};

// Helper function to flatten sections with proper ordering
export const flattenSectionsForApi = (
  sections: Section[],
  parentSectionId: string | null = null,
  startIndex: number = 0
): TemplateSectionRequest[] => {
  const result: TemplateSectionRequest[] = [];
  
  sections.forEach((section, index) => {
    const orderIndex = startIndex + index;
    result.push(sectionToRequest(section, orderIndex, parentSectionId));
    
    // Process children recursively
    if (section.children && section.children.length > 0) {
      const childRequests = flattenSectionsForApi(
        section.children,
        section.id,
        0 // Children start from 0 within their parent
      );
      result.push(...childRequests);
    }
  });
  
  return result;
};

// API Client class
class TemplateApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  // Set authorization token (JWT)
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Remove authorization token
  clearAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  // Generic request handler
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        errors: errorData.errors,
      };
      throw error;
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // CREATE: Create a new template
  async createTemplate(data: TemplateCreateRequest): Promise<TemplateResponse> {
    return this.request<TemplateResponse>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // READ: Get all templates
  async getTemplates(): Promise<TemplateResponse[]> {
    return this.request<TemplateResponse[]>('/templates');
  }

  // READ: Get template by ID
  async getTemplateById(id: string): Promise<TemplateResponse> {
    return this.request<TemplateResponse>(`/templates/${id}`);
  }

  // UPDATE: Update an existing template
  async updateTemplate(id: string, data: TemplateUpdateRequest): Promise<TemplateResponse> {
    return this.request<TemplateResponse>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE: Delete a template
  async deleteTemplate(id: string): Promise<void> {
    return this.request<void>(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // ARCHIVE: Archive/unarchive a template
  async archiveTemplate(id: string, archived: boolean): Promise<TemplateResponse> {
    return this.request<TemplateResponse>(`/templates/${id}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ archived }),
    });
  }

  // DUPLICATE: Duplicate a template
  async duplicateTemplate(id: string, newName: string): Promise<TemplateResponse> {
    return this.request<TemplateResponse>(`/templates/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });
  }
}

// Export singleton instance
export const templateApi = new TemplateApiClient();

// Export class for custom configurations
export { TemplateApiClient };

// Helper function to convert API response to local Template type
import { Template } from "@/lib/templateStorage";

const inferSectionType = (content: string, sectionId: string, variables?: Record<string, any>): SectionType => {
  // Check if it's a labeled-content section based on variables
  if (variables?.label !== undefined && variables?.contentType !== undefined) {
    return 'labeled-content';
  }
  
  // Check if it's a mixed-content section
  if (variables?.content !== undefined && !variables?.label && sectionId.includes('mixed')) {
    return 'mixed-content';
  }
  
  // Check if it's a static-text section
  if (variables?.content !== undefined && sectionId.includes('static-text')) {
    return 'static-text';
  }
  
  // Try to infer type from content or sectionId
  if (content.includes('<h1')) return 'heading1';
  if (content.includes('<h2')) return 'heading2';
  if (content.includes('<h3')) return 'heading3';
  if (content.includes('<h4')) return 'heading4';
  if (content.includes('<h5')) return 'heading5';
  if (content.includes('<h6')) return 'heading6';
  if (content.includes('<p')) return 'paragraph';
  if (content.includes('<ul')) return 'bullet-list-disc';
  if (content.includes('<ol')) return 'number-list-1';
  if (content.includes('<table')) return 'table';
  if (content.includes('<img')) return 'image';
  if (content.includes('<a')) return 'link';
  if (content.includes('<button')) return 'button';
  if (sectionId === 'static-header') return 'header';
  if (sectionId === 'static-footer') return 'footer';
  return 'text';
};

export const responseToTemplate = (response: TemplateResponse): Template => {
  // Convert API sections to local Section format
  const sections: Section[] = response.sections?.map(s => ({
    id: s.sectionId || s.id,
    // Use stored sectionType if available, otherwise infer from content
    type: (s.sectionType as SectionType) || inferSectionType(s.content, s.sectionId || s.id, s.variables),
    content: s.content,
    variables: s.variables || {},
    styles: s.styles || {},
    isLabelEditable: s.isLabelEditable ?? true,
    children: [],
  })) || [];

  return {
    id: response.id,
    name: response.name,
    subject: response.subject,
    html: response.html,
    createdAt: response.createdAt,
    sectionCount: response.sectionCount,
    archived: response.archived,
    apiConfig: response.apiConfig ? {
      enabled: response.apiConfig.enabled,
      templateId: response.apiConfig.templateId,
      paramValues: response.apiConfig.paramValues,
      mappings: response.apiConfig.mappings.map(m => ({
        id: m.id,
        sectionId: m.sectionId,
        apiPath: m.apiPath,
        dataType: m.dataType as 'text' | 'list' | 'html',
        variableName: m.variableName,
      })),
    } : undefined,
    sections,
  };
};

// Helper to fetch templates from API with localStorage fallback
export const fetchTemplates = async (): Promise<Template[]> => {
  try {
    const response = await templateApi.getTemplates();
    return response.map(responseToTemplate);
  } catch (error) {
    console.warn('Failed to fetch templates from API, using localStorage:', error);
    // Fallback to localStorage
    const { getTemplates } = await import('@/lib/templateStorage');
    return getTemplates();
  }
};

// Helper to fetch single template by ID from API with localStorage fallback
export const fetchTemplateById = async (id: string): Promise<Template | null> => {
  try {
    const response = await templateApi.getTemplateById(id);
    return responseToTemplate(response);
  } catch (error) {
    console.warn('Failed to fetch template from API, using localStorage:', error);
    // Fallback to localStorage
    const { getTemplates } = await import('@/lib/templateStorage');
    const templates = getTemplates();
    return templates.find(t => t.id === id) || null;
  }
};
