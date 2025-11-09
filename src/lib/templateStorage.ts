import { Section } from "@/types/section";
import { ApiConfig } from "@/types/api-config";

export interface Template {
  id: string;
  name: string;
  html: string;
  createdAt: string;
  sectionCount: number;
  archived?: boolean;
  apiConfig?: ApiConfig;
  sections?: Section[];
}

const STORAGE_KEY = 'email_templates';

export const saveTemplate = (template: Omit<Template, 'id'>): Template => {
  const templates = getTemplates();
  const newTemplate: Template = {
    ...template,
    id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  
  templates.push(newTemplate);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return newTemplate;
};

export const getTemplates = (): Template[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Return initial mock data
    const mockTemplates: Template[] = [
      {
        id: "1",
        name: "Welcome Email Template",
        html: "<h1>Welcome {{name}}!</h1><p>Thank you for joining us.</p>",
        createdAt: "2024-01-15",
        sectionCount: 2,
        archived: false,
      },
      {
        id: "2",
        name: "Newsletter Template",
        html: "<h1>{{title}}</h1><p>{{content}}</p><p>Best regards, {{sender}}</p>",
        createdAt: "2024-01-20",
        sectionCount: 3,
        archived: false,
      },
      {
        id: "3",
        name: "Product Launch Template",
        html: "<h1>Introducing {{productName}}</h1><p>{{description}}</p><button>Learn More</button>",
        createdAt: "2024-01-25",
        sectionCount: 3,
        archived: true,
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockTemplates));
    return mockTemplates;
  }
  return JSON.parse(stored);
};

export const updateTemplate = (id: string, updates: Partial<Template>): void => {
  const templates = getTemplates();
  const updatedTemplates = templates.map(t => 
    t.id === id ? { ...t, ...updates } : t
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
};
