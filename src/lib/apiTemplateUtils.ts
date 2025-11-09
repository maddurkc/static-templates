import { ApiConfig } from "@/types/api-config";
import { getTemplateById } from "@/data/apiTemplates";

/**
 * Replaces placeholders in a string with actual parameter values
 * Example: "https://{domain}.atlassian.net/api/{version}" with {domain: "myco", version: "v3"}
 * becomes "https://myco.atlassian.net/api/v3"
 */
export const replacePlaceholders = (template: string, params: Record<string, string>): string => {
  return template.replace(/\{(\w+)\}/g, (match, paramName) => {
    return params[paramName] || match;
  });
};

/**
 * Builds the complete API request configuration from template and user parameters
 */
export const buildApiRequest = (apiConfig: ApiConfig): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
} | null => {
  const template = getTemplateById(apiConfig.templateId);
  if (!template) return null;

  // Build URL with path and query parameters
  let url = template.url;
  const pathParams: Record<string, string> = {};
  const queryParams: Record<string, string> = {};
  const headerParams: Record<string, string> = {};
  const bodyParams: Record<string, string> = {};

  // Categorize parameters by location
  template.requiredParams.forEach(param => {
    const value = apiConfig.paramValues[param.name];
    if (!value) return;

    switch (param.location) {
      case 'path':
        pathParams[param.name] = value;
        break;
      case 'query':
        queryParams[param.name] = value;
        break;
      case 'header':
        headerParams[param.name] = value;
        break;
      case 'body':
        bodyParams[param.name] = value;
        break;
    }
  });

  // Replace path placeholders
  url = replacePlaceholders(url, pathParams);

  // Add query parameters
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  
  if (queryString) {
    url += (url.includes('?') ? '&' : '?') + queryString;
  }

  // Build headers
  const headers: Record<string, string> = {};
  if (template.headers) {
    Object.entries(template.headers).forEach(([key, value]) => {
      headers[key] = replacePlaceholders(value, headerParams);
    });
  }

  // Build body for POST/PUT requests
  let body: string | undefined;
  if (template.bodyTemplate && (template.method === 'POST' || template.method === 'PUT')) {
    body = replacePlaceholders(template.bodyTemplate, bodyParams);
  } else if (Object.keys(bodyParams).length > 0) {
    body = JSON.stringify(bodyParams);
  }

  return {
    url,
    method: template.method,
    headers,
    body
  };
};

/**
 * Validates that all required parameters are provided
 */
export const validateApiConfig = (apiConfig: ApiConfig): { valid: boolean; missingParams: string[] } => {
  const template = getTemplateById(apiConfig.templateId);
  if (!template) return { valid: false, missingParams: [] };

  const missingParams: string[] = [];
  
  template.requiredParams.forEach(param => {
    if (param.required && !apiConfig.paramValues[param.name]) {
      missingParams.push(param.label);
    }
  });

  return {
    valid: missingParams.length === 0,
    missingParams
  };
};
