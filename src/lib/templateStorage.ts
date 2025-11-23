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
        html: "<h1>Welcome <th:utext=\"${name}\"></h1><p>Thank you for joining us.</p>",
        createdAt: "2024-01-15",
        sectionCount: 2,
        archived: false,
      },
      {
        id: "2",
        name: "Newsletter Template",
        html: "<h1><th:utext=\"${title}\"></h1><p><th:utext=\"${content}\"></p><p>Best regards, <th:utext=\"${sender}\"></p>",
        createdAt: "2024-01-20",
        sectionCount: 3,
        archived: false,
      },
      {
        id: "3",
        name: "Product Launch Template",
        html: "<h1>Introducing <th:utext=\"${productName}\"></h1><p><th:utext=\"${description}\"></p><button>Learn More</button>",
        createdAt: "2024-01-25",
        sectionCount: 3,
        archived: true,
      },
      {
        id: "4",
        name: "Incident Report - Static & Dynamic",
        html: "",
        createdAt: new Date().toISOString(),
        sectionCount: 3,
        archived: false,
        sections: [
          {
            id: "section-1",
            type: "labeled-content",
            content: "",
            order: 0,
            variables: {
              label: "What's Happening",
              contentType: "list",
              items: [
                "Messages journaled in Exchange Online non-deliveries",
                "Invalid characters detected",
                "Header too large"
              ]
            }
          },
          {
            id: "section-2",
            type: "line-break",
            content: "<br/>",
            order: 1
          },
          {
            id: "section-3",
            type: "labeled-content",
            content: "",
            order: 2,
            variables: {
              label: "Impact",
              contentType: "list",
              items: [
                "Some messages to external recipients may not be delivered",
                "In some cases, there is a delay in message delivery",
                "In some cases, there is just a notification to sender"
              ]
            }
          },
          {
            id: "section-4",
            type: "line-break",
            content: "<br/>",
            order: 3
          },
          {
            id: "section-5",
            type: "mixed-content",
            content: "",
            order: 4,
            variables: {
              content: 'For invalid Characters issue, the team is working with Engineer- <th:utext="${incidentNumber}">',
              incidentNumber: "#INC1234567"
            }
          }
        ]
      },
      {
        id: "5",
        name: "Network Ops Template 2024",
        html: "",
        createdAt: new Date().toISOString(),
        sectionCount: 5,
        archived: false,
        sections: [
          {
            id: "nw-summary",
            type: "labeled-content",
            content: "",
            order: 0,
            variables: {
              label: "Summary",
              contentType: "text",
              content: "Latency on Self-pay feature via Wells Internet Banking Transfer and Payment application"
            }
          },
          {
            id: "nw-impact",
            type: "labeled-content",
            content: "",
            order: 1,
            variables: {
              label: "Impact",
              contentType: "text",
              content: "Customers have been experiencing latency with the Self-Pay feature within the Wells Internet Banking Transfer and Payment (WIBTP) application since 22:03 ET Friday, October 24, 2025"
            }
          },
          {
            id: "nw-actions",
            type: "labeled-content",
            content: "",
            order: 2,
            variables: {
              label: "Actions Taken",
              contentType: "list",
              items: [
                "Suspected pool members down in appviewx - checking the f5's but no indication of flapping pool members - F5 is checking too"
              ]
            }
          },
          {
            id: "nw-root",
            type: "labeled-content",
            content: "",
            order: 3,
            variables: {
              label: "Root Cause and Resolution",
              contentType: "text",
              content: "Determined P3 is related to BAS application which is experiencing connection issues to TELS application since 22:00 ET Friday, October 24, 2025. Related ticket INC18046890"
            }
          },
          {
            id: "nw-followup",
            type: "labeled-content",
            content: "",
            order: 4,
            variables: {
              label: "Follow Up Actions",
              contentType: "list",
              items: [
                "Confirmed no flapping; there are some node disabled logs at Oct 24 08:09:20 UTC and then pool members went down and came back up again at about Oct 24 11:03:19 UTC"
              ]
            }
          }
        ]
      },
      {
        id: "6",
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
      {
        id: "7",
        name: "Product Announcement - Interactive Demo",
        html: "",
        createdAt: new Date().toISOString(),
        sectionCount: 7,
        archived: false,
        sections: [
          {
            id: "section-intro",
            type: "heading3",
            content: "<h3><th:utext=\"${introTitle}\"></h3>",
            order: 0,
            variables: {
              introTitle: "Introducing Our Latest Innovation"
            }
          },
          {
            id: "section-intro-text",
            type: "paragraph",
            content: "<th:utext=\"${introText}\">",
            order: 1,
            variables: {
              introText: "We're excited to announce a groundbreaking product that will revolutionize how you work. This innovative solution combines cutting-edge technology with user-friendly design to deliver exceptional results."
            }
          },
          {
            id: "section-features",
            type: "heading3",
            content: "<h3><th:utext=\"${featuresTitle}\"></h3>",
            order: 2,
            variables: {
              featuresTitle: "Key Features"
            }
          },
          {
            id: "section-features-list",
            type: "bullet-list-disc",
            content: "<ul><th:utext=\"${featuresList}\"></ul>",
            order: 3,
            variables: {
              featuresList: [
                "Advanced AI-powered automation",
                "Seamless integration with existing tools",
                "Real-time collaboration features",
                "Enterprise-grade security"
              ]
            }
          },
          {
            id: "section-benefits",
            type: "heading3",
            content: "<h3><th:utext=\"${benefitsTitle}\"></h3>",
            order: 4,
            variables: {
              benefitsTitle: "Why Choose Us"
            }
          },
          {
            id: "section-benefits-list",
            type: "bullet-list-circle",
            content: "<ul><th:utext=\"${benefitsList}\"></ul>",
            order: 5,
            variables: {
              benefitsList: [
                "Save up to 40% of your time",
                "Increase productivity by 3x",
                "Reduce operational costs significantly",
                "24/7 dedicated customer support"
              ]
            }
          },
          {
            id: "section-pricing",
            type: "heading4",
            content: "<h4><th:utext=\"${pricingTitle}\"></h4>",
            order: 6,
            variables: {
              pricingTitle: "Special Launch Pricing"
            }
          },
          {
            id: "section-pricing-text",
            type: "paragraph",
            content: "<th:utext=\"${pricingText}\">",
            order: 7,
            variables: {
              pricingText: "For a limited time, get 50% off on all annual plans. Start your free 30-day trial today with no credit card required. Experience the difference and join thousands of satisfied customers."
            }
          },
          {
            id: "section-contact",
            type: "heading5",
            content: "<h5><th:utext=\"${contactTitle}\"></h5>",
            order: 8,
            variables: {
              contactTitle: "Get Started Today"
            }
          },
          {
            id: "section-contact-text",
            type: "paragraph",
            content: "<th:utext=\"${contactText}\">",
            order: 9,
            variables: {
              contactText: "Ready to transform your business? Contact our sales team for a personalized demo and discover how our solution can help you achieve your goals."
            }
          },
          {
            id: "section-link",
            type: "link",
            content: "<a href=\"<th:utext='${ctaLink}'>\" style=\"color: #0066cc; text-decoration: underline;\"><th:utext=\"${ctaText}\"></a>",
            order: 10,
            variables: {
              ctaLink: "https://example.com/demo",
              ctaText: "Schedule Your Free Demo Now →"
            }
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

export const resetTemplatesToDefault = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
