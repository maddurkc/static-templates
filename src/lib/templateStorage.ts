import { Section } from "@/types/section";
import { ApiConfig } from "@/types/api-config";

export interface Template {
  id: string;
  name: string;
  subject?: string; // Email subject - can contain {{placeholders}}
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
        id: "7",
        name: "Product Announcement - Interactive Demo",
        html: "",
        createdAt: new Date().toISOString(),
        sectionCount: 11,
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
            content: "<p><th:utext=\"${introText}\"></p>",
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
            content: "<p><th:utext=\"${pricingText}\"></p>",
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
            content: "<p><th:utext=\"${contactText}\"></p>",
            order: 9,
            variables: {
              contactText: "Ready to transform your business? Contact our sales team for a personalized demo and discover how our solution can help you achieve your goals."
            }
          },
          {
            id: "section-link",
            type: "link",
            content: "<a href=\"<th:utext=\"${ctaLink}\">\"><th:utext=\"${ctaText}\"></a>",
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
