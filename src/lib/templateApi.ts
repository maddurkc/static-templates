/**
 * Template API Service
 * Handles all backend API calls for template management
 */

import { Section } from "@/types/section";
import { ApiConfig } from "@/types/api-config";

// API Configuration - Update this to match your backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Request/Response Types matching backend DTOs
export interface TemplateSectionRequest {
  sectionId: string;
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
  html: string;
  sectionCount: number;
  archived: boolean;
  sections: TemplateSectionRequest[];
  apiConfig?: ApiConfigRequest;
}

export interface TemplateUpdateRequest {
  name?: string;
  html?: string;
  sectionCount?: number;
  archived?: boolean;
  sections?: TemplateSectionRequest[];
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
  html: string;
  sectionCount: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  sections: TemplateSectionResponse[];
  apiConfig?: ApiConfigResponse;
}

export interface TemplateSectionResponse {
  id: string;
  sectionId: string;
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
  
  const request: TemplateSectionRequest = {
    sectionId: section.id,
    orderIndex,
    parentSectionId,
    content: section.content,
    variables: variables,
    styles: section.styles || {},
    isLabelEditable: section.isLabelEditable ?? true,
  };

  // Add list items if present in variables
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

  // Add table data if present in variables
  const tableHeaders = variables.tableHeaders as string[] | undefined;
  const tableRows = variables.tableRows as string[][] | undefined;
  if (tableHeaders && tableRows) {
    request.tableData = {
      headers: tableHeaders,
      rows: tableRows,
    };
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
