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
        id: "tpl-all-sections",
        name: "Full Section Showcase",
        subject: "{{priority}} - Report #{{reportId}} - {{status}}",
        html: "",
        createdAt: new Date().toISOString(),
        sectionCount: 14,
        archived: false,
        sections: [
          {
            id: "sec-h1",
            type: "heading1",
            content: "<h1>{{mainTitle}}</h1>",
            order: 0,
            isLabelEditable: true,
            variables: { textVariableName: "mainTitle", mainTitle: "Quarterly Performance Report" },
            styles: { fontSize: '32px', color: '#1a365d' }
          },
          {
            id: "sec-h2",
            type: "heading2",
            content: "<h2>Executive Summary</h2>",
            order: 1,
            isLabelEditable: false,
            variables: { textVariableName: "summaryHeading", summaryHeading: "Executive Summary" },
            styles: { fontSize: '24px', color: '#2d3748' }
          },
          {
            id: "sec-para1",
            type: "paragraph",
            content: "<p>{{summaryText}}</p>",
            order: 2,
            isLabelEditable: true,
            variables: { textVariableName: "summaryText", summaryText: "This quarter showed significant growth across all departments. Revenue increased by 18% compared to last quarter, driven primarily by new client acquisitions and expanded service offerings." },
            styles: { fontSize: '16px', color: '#4a5568' }
          },
          {
            id: "sec-h3",
            type: "heading3",
            content: "<h3>Key Metrics</h3>",
            order: 3,
            isLabelEditable: true,
            variables: { textVariableName: "metricsHeading", metricsHeading: "Key Metrics" },
            styles: { fontSize: '20px', color: '#2d3748' }
          },
          {
            id: "sec-labeled-text",
            type: "labeled-content",
            content: "<div><strong><span th:utext=\"${label}\"/></strong><div><span th:utext=\"${content}\"/></div></div>",
            order: 4,
            isLabelEditable: true,
            variables: {
              label: "Overall Status",
              labelVariableName: "label_sec-labeled-text",
              "label_sec-labeled-text": "Overall Status",
              contentType: "text",
              textVariableName: "statusText",
              statusText: "All systems are operational. Customer satisfaction scores remain above 95% for the third consecutive quarter.",
              content: "All systems are operational. Customer satisfaction scores remain above 95% for the third consecutive quarter."
            },
            styles: {}
          },
          {
            id: "sec-labeled-list",
            type: "labeled-content",
            content: "<div><strong><span th:utext=\"${label}\"/></strong><div><span th:utext=\"${content}\"/></div></div>",
            order: 5,
            isLabelEditable: true,
            variables: {
              label: "Action Items",
              labelVariableName: "label_sec-labeled-list",
              "label_sec-labeled-list": "Action Items",
              contentType: "list",
              listStyle: "disc",
              listVariableName: "actionItems",
              items: [
                { text: "Review budget allocations for Q2", bold: true, children: [] },
                { text: "Schedule team performance reviews", children: [] },
                { text: "Finalize vendor contracts", italic: true, children: [] },
                { text: "Update project timelines", children: [] }
              ]
            },
            styles: {}
          },
          {
            id: "sec-labeled-table",
            type: "labeled-content",
            content: "<div><strong><span th:utext=\"${label}\"/></strong><div><span th:utext=\"${content}\"/></div></div>",
            order: 6,
            isLabelEditable: false,
            variables: {
              label: "Revenue Breakdown",
              labelVariableName: "label_sec-labeled-table",
              "label_sec-labeled-table": "Revenue Breakdown",
              contentType: "table",
              tableData: {
                headers: ["Department", "Q1 Revenue", "Q2 Revenue", "Growth"],
                rows: [
                  ["Sales", "$1.2M", "$1.5M", "+25%"],
                  ["Services", "$800K", "$920K", "+15%"],
                  ["Support", "$400K", "$450K", "+12.5%"]
                ]
              }
            },
            styles: {}
          },
          {
            id: "sec-bullet-disc",
            type: "bullet-list-disc",
            content: "<ul></ul>",
            order: 7,
            variables: {
              listVariableName: "highlights",
              items: [
                "Record-breaking customer acquisition",
                "Zero critical incidents this quarter",
                "Employee satisfaction at all-time high",
                "Launched 3 new product features"
              ]
            }
          },
          {
            id: "sec-h4",
            type: "heading4",
            content: "<h4>Timeline</h4>",
            order: 8,
            isLabelEditable: false,
            variables: { textVariableName: "timelineHeading", timelineHeading: "Timeline" },
            styles: { fontSize: '18px', color: '#4a5568' }
          },
          {
            id: "sec-table",
            type: "table",
            content: "<table></table>",
            order: 9,
            variables: {
              tableData: {
                headers: ["Date", "Milestone", "Status"],
                rows: [
                  ["Jan 15", "Project kickoff", "Complete"],
                  ["Feb 28", "Phase 1 delivery", "Complete"],
                  ["Mar 31", "Final review", "In Progress"]
                ]
              }
            }
          },
          {
            id: "sec-h5",
            type: "heading5",
            content: "<h5>Contact: {{contactName}}</h5>",
            order: 10,
            isLabelEditable: true,
            variables: { textVariableName: "contactHeading", contactHeading: "Contact: {{contactName}}", contactName: "Sarah Johnson" },
            styles: { fontSize: '16px', color: '#2d3748' }
          },
          {
            id: "sec-separator",
            type: "separator-line",
            content: "<hr/>",
            order: 11,
            variables: {}
          },
          {
            id: "sec-closing",
            type: "paragraph",
            content: "<p>For questions, reach out to the operations team.</p>",
            order: 12,
            isLabelEditable: false,
            variables: { textVariableName: "closingText", closingText: "For questions, reach out to the operations team." },
            styles: { fontSize: '14px', color: '#718096', fontStyle: 'italic' }
          },
          {
            id: "sec-date",
            type: "date",
            content: "<span></span>",
            order: 13,
            variables: {
              dateVariableName: "reportDate",
              reportDate: "February 11, 2026"
            }
          }
        ]
      },
      {
        id: "tpl-simple",
        name: "Quick Update Notice",
        subject: "Update: {{topic}}",
        html: "",
        createdAt: new Date().toISOString(),
        sectionCount: 4,
        archived: false,
        sections: [
          {
            id: "sec-s-h1",
            type: "heading2",
            content: "<h2>{{updateTitle}}</h2>",
            order: 0,
            isLabelEditable: true,
            variables: { textVariableName: "updateTitle", updateTitle: "System Maintenance Notice" },
            styles: { fontSize: '24px', color: '#1a365d' }
          },
          {
            id: "sec-s-para",
            type: "paragraph",
            content: "<p>{{bodyText}}</p>",
            order: 1,
            isLabelEditable: true,
            variables: { textVariableName: "bodyText", bodyText: "Scheduled maintenance will occur this weekend from Saturday 10PM to Sunday 6AM EST. During this window, services may be intermittently unavailable." },
            styles: { fontSize: '16px', color: '#4a5568' }
          },
          {
            id: "sec-s-list",
            type: "bullet-list-disc",
            content: "<ul></ul>",
            order: 2,
            variables: {
              listVariableName: "affectedServices",
              items: [
                "Web portal",
                "API endpoints",
                "Email notifications"
              ]
            }
          },
          {
            id: "sec-s-closing",
            type: "paragraph",
            content: "<p>Thank you for your patience.</p>",
            order: 3,
            isLabelEditable: false,
            variables: { textVariableName: "closingNote", closingNote: "Thank you for your patience." },
            styles: { fontSize: '14px', color: '#718096' }
          }
        ]
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockTemplates));

    // Pre-populate last-sent payloads so resend is available immediately
    const lastSentPayloads: Record<string, any> = {
      "tpl-all-sections": {
        templateId: "tpl-all-sections",
        toUsers: [{ id: "u1", name: "Alice Cooper", email: "alice@example.com" }],
        ccUsers: [{ id: "u2", name: "Bob Martin", email: "bob@example.com" }],
        bccUsers: [],
        variables: {
          mainTitle: "Quarterly Performance Report",
          summaryText: "This quarter showed significant growth across all departments. Revenue increased by 18% compared to last quarter.",
          metricsHeading: "Key Metrics",
          statusText: "All systems are operational.",
          contactHeading: "Contact: Sarah Johnson",
          contactName: "Sarah Johnson",
          closingText: "For questions, reach out to the operations team.",
          reportDate: "February 11, 2026"
        },
        listVariables: {
          actionItems: [
            { text: "Review budget allocations for Q2", bold: true, children: [] },
            { text: "Schedule team performance reviews", children: [] },
            { text: "Finalize vendor contracts", italic: true, children: [] }
          ],
          highlights: ["Record-breaking customer acquisition", "Zero critical incidents", "Employee satisfaction at all-time high"]
        },
        tableVariables: {
          "sec-labeled-table": {
            headers: ["Department", "Q1 Revenue", "Q2 Revenue", "Growth"],
            rows: [["Sales", "$1.2M", "$1.5M", "+25%"], ["Services", "$800K", "$920K", "+15%"]]
          },
          "sec-table": {
            headers: ["Date", "Milestone", "Status"],
            rows: [["Jan 15", "Project kickoff", "Complete"], ["Feb 28", "Phase 1 delivery", "Complete"]]
          }
        },
        labelVariables: {
          "label_sec-labeled-text": "Overall Status",
          "label_sec-labeled-list": "Action Items",
          "label_sec-labeled-table": "Revenue Breakdown"
        },
        subjectVariables: { priority: "HIGH", reportId: "RPT-2026-Q1", status: "Final" },
        emailSubject: "HIGH - Report #RPT-2026-Q1 - Final",
        editedSectionContent: {},
        sentAt: new Date(Date.now() - 3600000).toISOString()
      },
      "tpl-simple": {
        templateId: "tpl-simple",
        toUsers: [{ id: "u3", name: "Carol Danvers", email: "carol@example.com" }, { id: "u4", name: "Dave Wilson", email: "dave@example.com" }],
        ccUsers: [],
        bccUsers: [],
        variables: {
          updateTitle: "System Maintenance Notice",
          bodyText: "Scheduled maintenance will occur this weekend. Services may be intermittently unavailable.",
          closingNote: "Thank you for your patience."
        },
        listVariables: {
          affectedServices: ["Web portal", "API endpoints", "Email notifications"]
        },
        tableVariables: {},
        labelVariables: {},
        subjectVariables: { topic: "Weekend Maintenance" },
        emailSubject: "Update: Weekend Maintenance",
        editedSectionContent: {},
        sentAt: new Date(Date.now() - 7200000).toISOString()
      }
    };
    localStorage.setItem('lastSentPayloads', JSON.stringify(lastSentPayloads));

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
  localStorage.removeItem('lastSentPayloads');
};
