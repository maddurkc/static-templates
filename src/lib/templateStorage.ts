import { Section } from "@/types/section";
import { GlobalApiConfig } from "@/types/global-api-config";

export interface Template {
  id: string;
  name: string;
  subject?: string; // Email subject - can contain {{placeholders}}
  html: string;
  createdAt: string;
  sectionCount: number;
  archived?: boolean;
  globalApiConfig?: GlobalApiConfig;
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
        id: "demo-comprehensive-template",
        name: "Comprehensive Demo Template",
        subject: "{{priority}} - Incident #{{incidentNumber}} - {{status}}",
        html: "",
        createdAt: new Date().toISOString(),
        sectionCount: 10,
        archived: false,
        sections: [
          // Heading 1 - Editable with placeholder
          {
            id: "section-main-title",
            type: "heading1",
            content: "<h1>{{reportType}} Report - {{incidentNumber}}</h1>",
            order: 0,
            isLabelEditable: true,
            variables: {
              reportType: "Incident",
              incidentNumber: "INC-2024-001"
            },
            styles: { fontSize: '32px', color: '#1a365d' }
          },
          // Heading 2 - Non-editable static heading
          {
            id: "section-summary-heading",
            type: "heading2",
            content: "<h2>Executive Summary</h2>",
            order: 1,
            isLabelEditable: false,
            variables: {},
            styles: { fontSize: '24px', color: '#2d3748' }
          },
          // Paragraph - Editable with placeholder
          {
            id: "section-summary-text",
            type: "paragraph",
            content: "<p>This report covers the {{incidentType}} incident that occurred on {{incidentDate}}. The issue was reported by {{reportedBy}} and has been assigned to {{assignedTeam}} for resolution.</p>",
            order: 2,
            isLabelEditable: true,
            variables: {
              incidentType: "System Outage",
              incidentDate: "December 8, 2024",
              reportedBy: "John Smith",
              assignedTeam: "Infrastructure Team"
            },
            styles: { fontSize: '16px', color: '#4a5568' }
          },
          // Heading 3 - Editable without placeholders
          {
            id: "section-details-heading",
            type: "heading3",
            content: "<h3>Incident Details</h3>",
            order: 3,
            isLabelEditable: true,
            variables: {},
            styles: { fontSize: '20px', color: '#2d3748' }
          },
          // Labeled Content - Text type
          {
            id: "section-labeled-status",
            type: "labeled-content",
            content: "<div><strong><span th:utext=\"${label}\"/></strong><div><span th:utext=\"${content}\"/></div></div>",
            order: 4,
            isLabelEditable: true,
            variables: {
              label: "Current Status",
              contentType: "text",
              content: "The incident is currently being investigated. Initial analysis indicates a database connection timeout issue affecting the production environment."
            },
            styles: {}
          },
          // Labeled Content - List type with dynamic label
          {
            id: "section-labeled-actions",
            type: "labeled-content",
            content: "<div><strong><span th:utext=\"${label}\"/></strong><div><span th:utext=\"${content}\"/></div></div>",
            order: 5,
            isLabelEditable: true,
            variables: {
              label: "Action Items for <span th:utext=\"${teamName}\"/>",
              teamName: "Infrastructure",
              contentType: "list",
              listStyle: "disc",
              items: [
                { text: "Review database connection pool settings", bold: true, children: [] },
                { text: "Analyze server performance metrics", children: [
                  { text: "CPU utilization", children: [] },
                  { text: "Memory usage", children: [] }
                ]},
                { text: "Implement connection retry logic", italic: true, children: [] },
                { text: "Update monitoring alerts", children: [] }
              ]
            },
            styles: {}
          },
          // Heading 4 - Non-editable with placeholder
          {
            id: "section-timeline-heading",
            type: "heading4",
            content: "<h4>Timeline - {{timeZone}}</h4>",
            order: 6,
            isLabelEditable: false,
            variables: {
              timeZone: "EST"
            },
            styles: { fontSize: '18px', color: '#4a5568' }
          },
          // Labeled Content - Table type
          {
            id: "section-labeled-timeline",
            type: "labeled-content",
            content: "<div><strong><span th:utext=\"${label}\"/></strong><div><span th:utext=\"${content}\"/></div></div>",
            order: 7,
            isLabelEditable: false,
            variables: {
              label: "Event Timeline",
              contentType: "table",
              tableData: {
                headers: ["Time", "Event", "Action Taken"],
                rows: [
                  ["09:15 AM", "Issue detected", "Alert triggered"],
                  ["09:20 AM", "Team notified", "Investigation started"],
                  ["09:45 AM", "Root cause identified", "Fix in progress"],
                  ["10:30 AM", "Fix deployed", "Monitoring"]
                ]
              }
            },
            styles: {}
          },
          // Paragraph - Non-editable
          {
            id: "section-closing",
            type: "paragraph",
            content: "<p>For any questions regarding this report, please contact the on-call team or raise a ticket in the support portal.</p>",
            order: 8,
            isLabelEditable: false,
            variables: {},
            styles: { fontSize: '14px', color: '#718096', fontStyle: 'italic' }
          },
          // Heading 5 - Editable with multiple placeholders
          {
            id: "section-contact-heading",
            type: "heading5",
            content: "<h5>Contact: {{contactName}} ({{contactRole}})</h5>",
            order: 9,
            isLabelEditable: true,
            variables: {
              contactName: "Jane Doe",
              contactRole: "Incident Manager"
            },
            styles: { fontSize: '16px', color: '#2d3748' }
          }
        ]
      },
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
      {
        id: "demo-table-showcase",
        name: "Table Showcase - Static & Dynamic",
        subject: "{{reportTitle}} - Data Report",
        html: "",
        createdAt: new Date().toISOString(),
        sectionCount: 13,
        archived: false,
        sections: [
          {
            id: "section-table-title",
            type: "heading1",
            content: "<h1>{{reportTitle}} Data Report</h1>",
            order: 0,
            isLabelEditable: true,
            variables: { reportTitle: "Monthly" },
            styles: { fontSize: '32px', color: '#1a365d' }
          },
          // ── Static Table 1 ──
          {
            id: "section-static1-heading",
            type: "heading3",
            content: "<h3>Regional Revenue (Static)</h3>",
            order: 1,
            isLabelEditable: false,
            variables: {},
            styles: { fontSize: '20px', color: '#2d3748' }
          },
          {
            id: "section-static1-table",
            type: "table",
            content: "",
            order: 2,
            variables: {
              tableData: {
                rows: [
                  ["Region", "Q1 Revenue", "Q2 Revenue", "Growth"],
                  ["North America", "$1,250,000", "$1,480,000", "+18.4%"],
                  ["Europe", "$890,000", "$1,020,000", "+14.6%"],
                  ["Asia Pacific", "$650,000", "$810,000", "+24.6%"],
                  ["Latin America", "$320,000", "$385,000", "+20.3%"]
                ],
                showBorder: true,
                borderColor: "#dee2e6",
                mergedCells: {},
                cellStyles: {},
                headerStyle: { backgroundColor: "#1a365d", textColor: "#ffffff", bold: true },
                columnWidths: ["25%", "25%", "25%", "25%"],
                cellPadding: "medium" as const,
                isStatic: true,
                jsonMapping: { enabled: false, columnMappings: [] }
              }
            },
            styles: {}
          },
          // ── Dynamic Table 1 ──
          {
            id: "section-dynamic1-heading",
            type: "heading3",
            content: "<h3>Employee Directory (Dynamic)</h3>",
            order: 3,
            isLabelEditable: false,
            variables: {},
            styles: { fontSize: '20px', color: '#2d3748' }
          },
          {
            id: "section-dynamic1-desc",
            type: "paragraph",
            content: "<p>Rows auto-generated via <code>th:each</code> from JSON array at runtime.</p>",
            order: 4,
            variables: {},
            styles: { fontSize: '14px', color: '#4a5568' }
          },
          {
            id: "section-dynamic1-table",
            type: "table",
            content: "",
            order: 5,
            variables: {
              tableData: {
                rows: [
                  ["Employee Name", "Department", "Status", "Start Date"],
                  ["John Smith", "Engineering", "Active", "2024-01-15"],
                  ["Jane Doe", "Marketing", "Active", "2024-03-01"],
                  ["Bob Johnson", "Sales", "On Leave", "2023-11-20"]
                ],
                showBorder: true,
                borderColor: "#dee2e6",
                mergedCells: {},
                cellStyles: {},
                headerStyle: { backgroundColor: "#2d6a4f", textColor: "#ffffff", bold: true },
                columnWidths: ["30%", "25%", "20%", "25%"],
                cellPadding: "medium" as const,
                isStatic: false,
                tableVariableName: "employeeRows",
                jsonMapping: {
                  enabled: true,
                  columnMappings: [
                    { header: "Employee Name", jsonPath: "name" },
                    { header: "Department", jsonPath: "department" },
                    { header: "Status", jsonPath: "status" },
                    { header: "Start Date", jsonPath: "startDate" }
                  ]
                }
              }
            },
            styles: {}
          },
          // ── Static Table 2 ──
          {
            id: "section-static2-heading",
            type: "heading3",
            content: "<h3>Server Health Summary (Static)</h3>",
            order: 6,
            isLabelEditable: false,
            variables: {},
            styles: { fontSize: '20px', color: '#2d3748' }
          },
          {
            id: "section-static2-table",
            type: "table",
            content: "",
            order: 7,
            variables: {
              tableData: {
                rows: [
                  ["Server", "CPU %", "Memory %", "Disk %", "Status"],
                  ["prod-web-01", "45%", "62%", "38%", "Healthy"],
                  ["prod-web-02", "78%", "81%", "55%", "Warning"],
                  ["prod-db-01", "32%", "70%", "42%", "Healthy"],
                  ["prod-cache-01", "15%", "45%", "20%", "Healthy"]
                ],
                showBorder: true,
                borderColor: "#dee2e6",
                mergedCells: {},
                cellStyles: {},
                headerStyle: { backgroundColor: "#6c3483", textColor: "#ffffff", bold: true },
                columnWidths: ["25%", "15%", "15%", "15%", "15%"],
                cellPadding: "medium" as const,
                isStatic: true,
                jsonMapping: { enabled: false, columnMappings: [] }
              }
            },
            styles: {}
          },
          // ── Dynamic Table 2 ──
          {
            id: "section-dynamic2-heading",
            type: "heading3",
            content: "<h3>Recent Transactions (Dynamic)</h3>",
            order: 8,
            isLabelEditable: false,
            variables: {},
            styles: { fontSize: '20px', color: '#2d3748' }
          },
          {
            id: "section-dynamic2-desc",
            type: "paragraph",
            content: "<p>Transaction rows populated dynamically from API response data.</p>",
            order: 9,
            variables: {},
            styles: { fontSize: '14px', color: '#4a5568' }
          },
          {
            id: "section-dynamic2-table",
            type: "table",
            content: "",
            order: 10,
            variables: {
              tableData: {
                rows: [
                  ["Transaction ID", "Customer", "Amount", "Date", "Type"],
                  ["TXN-001", "Acme Corp", "$5,200.00", "2024-12-01", "Invoice"],
                  ["TXN-002", "GlobalTech", "$3,750.00", "2024-12-02", "Payment"],
                  ["TXN-003", "StartupXYZ", "$1,100.00", "2024-12-03", "Refund"]
                ],
                showBorder: true,
                borderColor: "#dee2e6",
                mergedCells: {},
                cellStyles: {},
                headerStyle: { backgroundColor: "#c0392b", textColor: "#ffffff", bold: true },
                columnWidths: ["20%", "20%", "20%", "20%", "20%"],
                cellPadding: "medium" as const,
                isStatic: false,
                tableVariableName: "transactionRows",
                jsonMapping: {
                  enabled: true,
                  columnMappings: [
                    { header: "Transaction ID", jsonPath: "txnId" },
                    { header: "Customer", jsonPath: "customer" },
                    { header: "Amount", jsonPath: "amount" },
                    { header: "Date", jsonPath: "date" },
                    { header: "Type", jsonPath: "type" }
                  ]
                }
              }
            },
            styles: {}
          }
        ]
      },
      {
        id: "demo-api-integration",
        name: "API Integration Demo - User Directory",
        subject: "{{reportTitle}} - User Directory Report",
        html: "",
        createdAt: new Date().toISOString(),
        sectionCount: 8,
        archived: false,
        globalApiConfig: {
          integrations: [
            {
              id: "api-demo-users",
              name: "JSONPlaceholder Users",
              templateId: "jsonplaceholder-users-list",
              paramValues: {},
              variableName: "usersData",
              enabled: true
            }
          ],
          globalVariables: {}
        },
        sections: [
          // Heading 1 - Editable with placeholder
          {
            id: "section-api-title",
            type: "heading1",
            content: "<h1>{{reportTitle}} - User Directory</h1>",
            order: 0,
            isLabelEditable: true,
            variables: {
              reportTitle: "Q1 2026"
            },
            styles: { fontSize: '32px', color: '#1a365d' }
          },
          // Paragraph - Description with placeholder
          {
            id: "section-api-desc",
            type: "paragraph",
            content: "<p>This directory lists all users fetched from the system API. Prepared for: {{department}}. Data is auto-populated from the API integration configured at template level.</p>",
            order: 1,
            isLabelEditable: true,
            variables: {
              department: "Engineering"
            },
            styles: { fontSize: '16px', color: '#4a5568' }
          },
          // Heading 3 - Static
          {
            id: "section-api-summary-heading",
            type: "heading3",
            content: "<h3>Summary</h3>",
            order: 2,
            isLabelEditable: false,
            variables: {},
            styles: { fontSize: '20px', color: '#2d3748' }
          },
          // Labeled Content - Text - Summary info
          {
            id: "section-api-summary",
            type: "labeled-content",
            content: "<div><strong><span th:utext=\"${label}\"/></strong><div><span th:utext=\"${content}\"/></div></div>",
            order: 3,
            isLabelEditable: true,
            variables: {
              label: "Report Overview",
              contentType: "text",
              content: "Total users fetched from the API: {{totalUsers}}. Use the API panel to re-fetch with updated parameters."
            },
            styles: {}
          },
          // Heading 3 - User Locations
          {
            id: "section-api-locations-heading",
            type: "heading3",
            content: "<h3>User Locations</h3>",
            order: 4,
            isLabelEditable: false,
            variables: {},
            styles: { fontSize: '20px', color: '#2d3748' }
          },
          // Bullet List - User cities (linked to API)
          {
            id: "section-api-cities",
            type: "bullet-list-disc",
            content: "",
            order: 5,
            isLabelEditable: true,
            variables: {
              items: [
                { text: "Gwenborough", children: [] },
                { text: "Wisokyburgh", children: [] },
                { text: "McKenziehaven", children: [] },
                { text: "South Elvis", children: [] },
                { text: "Roscoeview", children: [] }
              ],
              listVariableName: "items_section_api_cities",
              apiVariable: "usersData",
              apiFieldPath: "address.city"
            },
            styles: { fontSize: '16px', color: '#000000' }
          },
          // Heading 3 - User Directory Table
          {
            id: "section-api-table-heading",
            type: "heading3",
            content: "<h3>User Directory (Dynamic Table)</h3>",
            order: 6,
            isLabelEditable: false,
            variables: {},
            styles: { fontSize: '20px', color: '#2d3748' }
          },
          // Dynamic Table - User data (linked to API)
          {
            id: "section-api-users-table",
            type: "table",
            content: "",
            order: 7,
            variables: {
              tableData: {
                rows: [
                  ["Name", "Email", "Company", "City"],
                  ["Leanne Graham", "Sincere@april.biz", "Romaguera-Crona", "Gwenborough"],
                  ["Ervin Howell", "Shanna@melissa.tv", "Deckow-Crist", "Wisokyburgh"],
                  ["Clementine Bauch", "Nathan@yesenia.net", "Romaguera-Jacobson", "McKenziehaven"],
                  ["Patricia Lebsack", "Julianne.OConner@kory.org", "Robel-Corkery", "South Elvis"],
                  ["Chelsey Dietrich", "Lucio_Hettinger@annie.ca", "Keebler LLC", "Roscoeview"]
                ],
                showBorder: true,
                borderColor: "#dee2e6",
                mergedCells: {},
                cellStyles: {},
                headerStyle: { backgroundColor: "#0d47a1", textColor: "#ffffff", bold: true },
                columnWidths: ["25%", "30%", "25%", "20%"],
                cellPadding: "medium" as const,
                isStatic: false,
                tableVariableName: "userDirectoryRows",
                jsonMapping: {
                  enabled: true,
                  columnMappings: [
                    { header: "Name", jsonPath: "name" },
                    { header: "Email", jsonPath: "email" },
                    { header: "Company", jsonPath: "company.name" },
                    { header: "City", jsonPath: "address.city" }
                  ]
                }
              },
              apiVariable: "usersData"
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

export const resetTemplatesToDefault = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
