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
      {
        id: "4",
        name: "User Profile Report (API Demo)",
        html: `<div style="text-align: center; padding: 20px; background: #f8f9fa; border-bottom: 2px solid #dee2e6;"><h1>{{companyName}}</h1><p>{{reportTitle}}</p></div>\n\n<div style="font-size: 48px; color: #3b3f5c; font-weight: 700;">\n  User Profile Report\n</div>\n\n<div style="font-size: 18px; color: #6c757d;">\n  Generated on: {{generatedDate}}\n</div>\n\n<div style="font-size: 48px; color: #3b3f5c; font-weight: 700;">\n  User Information (From API)\n</div>\n\n<div style="font-size: 18px; color: #6c757d;">\n  <strong>Name:</strong> {{userName}}<br>\n  <strong>Email:</strong> {{userEmail}}<br>\n  <strong>Phone:</strong> {{userPhone}}<br>\n  <strong>Website:</strong> {{userWebsite}}<br>\n  <strong>Company:</strong> {{userCompanyName}}\n</div>\n\n<div style="font-size: 48px; color: #3b3f5c; font-weight: 700;">\n  Address Details (From API)\n</div>\n\n<div style="font-size: 18px; color: #6c757d;">\n  {{addressHtml}}\n</div>\n\n<div style="font-size: 48px; color: #3b3f5c; font-weight: 700;">\n  Custom Notes\n</div>\n\n<div style="font-size: 18px; color: #6c757d;">\n  {{customNotes}}\n</div>\n\n<div style="text-align: center; padding: 20px; background: #f8f9fa; border-top: 2px solid #dee2e6; margin-top: 40px;"><p>&copy; 2024 {{companyName}}. All rights reserved.</p><p>{{contactEmail}}</p></div>`,
        createdAt: new Date().toISOString(),
        sectionCount: 10,
        archived: false,
        apiConfig: {
          enabled: true,
          templateId: "jsonplaceholder-user",
          paramValues: {
            userId: "1"
          },
          mappings: [
            {
              id: "map-1",
              sectionId: "section-user-name",
              apiPath: "name",
              dataType: "text",
              variableName: "userName"
            },
            {
              id: "map-2",
              sectionId: "section-user-email",
              apiPath: "email",
              dataType: "text",
              variableName: "userEmail"
            },
            {
              id: "map-3",
              sectionId: "section-user-phone",
              apiPath: "phone",
              dataType: "text",
              variableName: "userPhone"
            },
            {
              id: "map-4",
              sectionId: "section-user-website",
              apiPath: "website",
              dataType: "text",
              variableName: "userWebsite"
            },
            {
              id: "map-5",
              sectionId: "section-user-company",
              apiPath: "company.name",
              dataType: "text",
              variableName: "userCompanyName"
            },
            {
              id: "map-6",
              sectionId: "section-address",
              apiPath: "address",
              dataType: "html",
              variableName: "addressHtml"
            }
          ]
        },
        sections: [
          {
            id: 'static-header',
            type: 'header',
            content: '<div style="text-align: center; padding: 20px; background: #f8f9fa; border-bottom: 2px solid #dee2e6;"><h1>{{companyName}}</h1><p>{{reportTitle}}</p></div>',
            variables: {
              companyName: 'Acme Corporation',
              reportTitle: 'Professional User Analytics Report'
            },
            styles: {}
          },
          {
            id: 'section-main-heading',
            type: 'heading1',
            content: 'User Profile Report',
            styles: { fontSize: '48px', color: '#3b3f5c', fontWeight: '700' }
          },
          {
            id: 'section-date',
            type: 'paragraph',
            content: 'Generated on: {{generatedDate}}',
            variables: {
              generatedDate: new Date().toLocaleDateString()
            },
            styles: { fontSize: '18px', color: '#6c757d' }
          },
          {
            id: 'section-api-heading',
            type: 'heading1',
            content: 'User Information (From API)',
            styles: { fontSize: '48px', color: '#3b3f5c', fontWeight: '700' }
          },
          {
            id: 'section-user-name',
            type: 'paragraph',
            content: '<strong>Name:</strong> {{userName}}<br><strong>Email:</strong> {{userEmail}}<br><strong>Phone:</strong> {{userPhone}}<br><strong>Website:</strong> {{userWebsite}}<br><strong>Company:</strong> {{userCompanyName}}',
            variables: {
              userName: 'Loading...',
              userEmail: 'Loading...',
              userPhone: 'Loading...',
              userWebsite: 'Loading...',
              userCompanyName: 'Loading...'
            },
            styles: { fontSize: '18px', color: '#6c757d' }
          },
          {
            id: 'section-address-heading',
            type: 'heading1',
            content: 'Address Details (From API)',
            styles: { fontSize: '48px', color: '#3b3f5c', fontWeight: '700' }
          },
          {
            id: 'section-address',
            type: 'html-content',
            content: '{{addressHtml}}',
            variables: {
              addressHtml: '<div style="padding: 15px; background: #f0f0f0; border-radius: 8px; margin: 10px 0;"><p><strong>Street:</strong> Loading...</p><p><strong>Suite:</strong> Loading...</p><p><strong>City:</strong> Loading...</p><p><strong>Zipcode:</strong> Loading...</p></div>'
            },
            styles: { fontSize: '18px', color: '#6c757d' }
          },
          {
            id: 'section-notes-heading',
            type: 'heading1',
            content: 'Custom Notes',
            styles: { fontSize: '48px', color: '#3b3f5c', fontWeight: '700' }
          },
          {
            id: 'section-notes',
            type: 'paragraph',
            content: '{{customNotes}}',
            variables: {
              customNotes: 'Add your custom notes here about this user profile.'
            },
            styles: { fontSize: '18px', color: '#6c757d' }
          },
          {
            id: 'static-footer',
            type: 'footer',
            content: '<div style="text-align: center; padding: 20px; background: #f8f9fa; border-top: 2px solid #dee2e6; margin-top: 40px;"><p>&copy; 2024 {{companyName}}. All rights reserved.</p><p>{{contactEmail}}</p></div>',
            variables: {
              companyName: 'Acme Corporation',
              contactEmail: 'contact@acme.com'
            },
            styles: {}
          }
        ]
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
