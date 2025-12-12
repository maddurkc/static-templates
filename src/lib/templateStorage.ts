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
    // Return initial mock data with ALL section types
    const mockTemplates: Template[] = [
      {
        id: "all-sections-demo",
        name: "All Sections Demo Template",
        subject: "{{priority}} Alert: {{incidentTitle}} - Ref #{{referenceNumber}}",
        html: "",
        createdAt: new Date().toISOString(),
        sectionCount: 25,
        archived: false,
        sections: [
          // 1. Heading 1
          {
            id: "sec-h1",
            type: "heading1",
            content: "<h1>{{reportTitle}} - {{companyName}}</h1>",
            order: 0,
            isLabelEditable: true,
            variables: {
              reportTitle: "Incident Report",
              companyName: "Acme Corporation"
            },
            styles: { fontSize: '32px', color: '#1a365d' }
          },
          // 2. Heading 2
          {
            id: "sec-h2",
            type: "heading2",
            content: "<h2>{{sectionTitle}} Overview</h2>",
            order: 1,
            isLabelEditable: true,
            variables: {
              sectionTitle: "System Status"
            },
            styles: { fontSize: '28px', color: '#2d3748' }
          },
          // 3. Heading 3
          {
            id: "sec-h3",
            type: "heading3",
            content: "<h3>{{subSectionTitle}}</h3>",
            order: 2,
            isLabelEditable: true,
            variables: {
              subSectionTitle: "Technical Details"
            },
            styles: { fontSize: '24px', color: '#4a5568' }
          },
          // 4. Heading 4
          {
            id: "sec-h4",
            type: "heading4",
            content: "<h4>{{minorTitle}} - {{dateInfo}}</h4>",
            order: 3,
            isLabelEditable: true,
            variables: {
              minorTitle: "Timeline",
              dateInfo: "December 2024"
            },
            styles: { fontSize: '20px', color: '#4a5568' }
          },
          // 5. Heading 5
          {
            id: "sec-h5",
            type: "heading5",
            content: "<h5>Contact: {{contactPerson}}</h5>",
            order: 4,
            isLabelEditable: true,
            variables: {
              contactPerson: "John Smith"
            },
            styles: { fontSize: '18px', color: '#718096' }
          },
          // 6. Heading 6
          {
            id: "sec-h6",
            type: "heading6",
            content: "<h6>Reference: {{refCode}}</h6>",
            order: 5,
            isLabelEditable: true,
            variables: {
              refCode: "REF-2024-001"
            },
            styles: { fontSize: '16px', color: '#718096' }
          },
          // 7. Text
          {
            id: "sec-text",
            type: "text",
            content: "<span>Status: {{currentStatus}} | Priority: {{priorityLevel}}</span>",
            order: 6,
            isLabelEditable: true,
            variables: {
              currentStatus: "In Progress",
              priorityLevel: "High"
            },
            styles: { fontSize: '14px', color: '#4a5568' }
          },
          // 8. Paragraph
          {
            id: "sec-paragraph",
            type: "paragraph",
            content: "<p>This incident was reported by {{reportedBy}} on {{reportDate}}. The affected system is {{affectedSystem}} which serves {{userCount}} users daily.</p>",
            order: 7,
            isLabelEditable: true,
            variables: {
              reportedBy: "Jane Doe",
              reportDate: "December 8, 2024",
              affectedSystem: "Payment Gateway",
              userCount: "10,000"
            },
            styles: { fontSize: '16px', color: '#4a5568' }
          },
          // 9. Static Text
          {
            id: "sec-static",
            type: "static-text",
            content: "This is a static text section that cannot contain placeholders. It displays exactly as entered.",
            order: 8,
            isLabelEditable: false,
            variables: {
              content: "This is a static text section that cannot contain placeholders. It displays exactly as entered."
            },
            styles: { fontSize: '14px', color: '#718096', fontStyle: 'italic' }
          },
          // 10. Mixed Content
          {
            id: "sec-mixed",
            type: "mixed-content",
            content: "Incident {{incidentId}} was escalated to {{escalationTeam}}. View details: <a href=\"{{detailsLink}}\">{{linkLabel}}</a>",
            order: 9,
            isLabelEditable: true,
            variables: {
              content: "Incident {{incidentId}} was escalated to {{escalationTeam}}. View details: <a href=\"{{detailsLink}}\">{{linkLabel}}</a>",
              incidentId: "INC-12345",
              escalationTeam: "Level 3 Support",
              detailsLink: "https://portal.example.com/incident/12345",
              linkLabel: "Incident Portal"
            },
            styles: {}
          },
          // 11. Bullet List (Circle)
          {
            id: "sec-bullet-circle",
            type: "bullet-list-circle",
            content: "<ul style=\"list-style-type: circle;\"><span th:utext=\"${items}\"/></ul>",
            order: 10,
            isLabelEditable: true,
            variables: {
              items: [
                { text: "{{affectedService1}}", children: [] },
                { text: "{{affectedService2}}", children: [] },
                { text: "{{affectedService3}}", children: [] }
              ],
              affectedService1: "User Authentication Service",
              affectedService2: "Payment Processing Module",
              affectedService3: "Email Notification System"
            },
            styles: {}
          },
          // 12. Bullet List (Disc)
          {
            id: "sec-bullet-disc",
            type: "bullet-list-disc",
            content: "<ul style=\"list-style-type: disc;\"><span th:utext=\"${items}\"/></ul>",
            order: 11,
            isLabelEditable: true,
            variables: {
              items: [
                { text: "Primary impact: {{primaryImpact}}", children: [] },
                { text: "Secondary impact: {{secondaryImpact}}", children: [] }
              ],
              primaryImpact: "Transaction failures",
              secondaryImpact: "Delayed notifications"
            },
            styles: {}
          },
          // 13. Bullet List (Square)
          {
            id: "sec-bullet-square",
            type: "bullet-list-square",
            content: "<ul style=\"list-style-type: square;\"><span th:utext=\"${items}\"/></ul>",
            order: 12,
            isLabelEditable: true,
            variables: {
              items: [
                { text: "Root cause: {{rootCause}}", children: [] },
                { text: "Resolution: {{resolution}}", children: [] }
              ],
              rootCause: "Database connection timeout",
              resolution: "Connection pool optimization"
            },
            styles: {}
          },
          // 14. Number List (1,2,3)
          {
            id: "sec-num-decimal",
            type: "number-list-1",
            content: "<ol style=\"list-style-type: decimal;\"><span th:utext=\"${items}\"/></ol>",
            order: 13,
            isLabelEditable: true,
            variables: {
              items: [
                { text: "Step 1: {{step1}}", children: [] },
                { text: "Step 2: {{step2}}", children: [] },
                { text: "Step 3: {{step3}}", children: [] }
              ],
              step1: "Identify affected systems",
              step2: "Isolate the problem",
              step3: "Apply fix and verify"
            },
            styles: {}
          },
          // 15. Number List (i,ii,iii)
          {
            id: "sec-num-roman",
            type: "number-list-i",
            content: "<ol style=\"list-style-type: lower-roman;\"><span th:utext=\"${items}\"/></ol>",
            order: 14,
            isLabelEditable: true,
            variables: {
              items: [
                { text: "{{phase1}}", children: [] },
                { text: "{{phase2}}", children: [] },
                { text: "{{phase3}}", children: [] }
              ],
              phase1: "Investigation Phase",
              phase2: "Remediation Phase",
              phase3: "Validation Phase"
            },
            styles: {}
          },
          // 16. Number List (a,b,c)
          {
            id: "sec-num-alpha",
            type: "number-list-a",
            content: "<ol style=\"list-style-type: lower-alpha;\"><span th:utext=\"${items}\"/></ol>",
            order: 15,
            isLabelEditable: true,
            variables: {
              items: [
                { text: "{{option1}}", children: [] },
                { text: "{{option2}}", children: [] }
              ],
              option1: "Immediate hotfix deployment",
              option2: "Scheduled maintenance window"
            },
            styles: {}
          },
          // 17. Table
          {
            id: "sec-table",
            type: "table",
            content: "<table><tr><th>Header 1</th><th>Header 2</th></tr></table>",
            order: 16,
            isLabelEditable: true,
            variables: {
              tableData: {
                headers: ["{{col1Header}}", "{{col2Header}}", "{{col3Header}}"],
                rows: [
                  ["{{row1col1}}", "{{row1col2}}", "{{row1col3}}"],
                  ["{{row2col1}}", "{{row2col2}}", "{{row2col3}}"]
                ],
                showBorder: true
              },
              col1Header: "Metric",
              col2Header: "Before",
              col3Header: "After",
              row1col1: "Response Time",
              row1col2: "5000ms",
              row1col3: "200ms",
              row2col1: "Error Rate",
              row2col2: "15%",
              row2col3: "0.1%"
            },
            styles: {}
          },
          // 18. Image
          {
            id: "sec-image",
            type: "image",
            content: "<img src=\"{{imageUrl}}\" alt=\"{{imageAlt}}\" />",
            order: 17,
            isLabelEditable: true,
            variables: {
              imageUrl: "https://placehold.co/600x200",
              imageAlt: "System Architecture Diagram"
            },
            styles: {}
          },
          // 19. Link
          {
            id: "sec-link",
            type: "link",
            content: "<a href=\"{{linkHref}}\">{{linkText}}</a>",
            order: 18,
            isLabelEditable: true,
            variables: {
              linkHref: "https://docs.example.com/runbook",
              linkText: "View Complete Runbook Documentation"
            },
            styles: {}
          },
          // 20. Button
          {
            id: "sec-button",
            type: "button",
            content: "<button>{{buttonText}}</button>",
            order: 19,
            isLabelEditable: true,
            variables: {
              buttonText: "Acknowledge Incident"
            },
            styles: {}
          },
          // 21. Labeled Content - Text
          {
            id: "sec-labeled-text",
            type: "labeled-content",
            content: "<div><strong><span th:utext=\"${label}\"/></strong><div><span th:utext=\"${content}\"/></div></div>",
            order: 20,
            isLabelEditable: true,
            variables: {
              label: "Impact Summary for {{impactArea}}",
              impactArea: "Production Environment",
              contentType: "text",
              content: "The {{systemName}} experienced {{issueType}} affecting {{affectedUsers}} users during {{downtime}}."
            },
            styles: {}
          },
          // 22. Labeled Content - List
          {
            id: "sec-labeled-list",
            type: "labeled-content",
            content: "<div><strong><span th:utext=\"${label}\"/></strong><div><span th:utext=\"${content}\"/></div></div>",
            order: 21,
            isLabelEditable: true,
            variables: {
              label: "Action Items - {{teamName}} Team",
              teamName: "Infrastructure",
              contentType: "list",
              listStyle: "disc",
              items: [
                { text: "Review {{metric1}} metrics", children: [] },
                { text: "Update {{configItem}} configuration", children: [
                  { text: "Verify {{subItem1}}", children: [] },
                  { text: "Test {{subItem2}}", children: [] }
                ]},
                { text: "Document findings in {{documentName}}", children: [] }
              ],
              metric1: "CPU and Memory",
              configItem: "database pool",
              subItem1: "connection limits",
              subItem2: "timeout values",
              documentName: "Post-Incident Report"
            },
            styles: {}
          },
          // 23. Labeled Content - Table
          {
            id: "sec-labeled-table",
            type: "labeled-content",
            content: "<div><strong><span th:utext=\"${label}\"/></strong><div><span th:utext=\"${content}\"/></div></div>",
            order: 22,
            isLabelEditable: true,
            variables: {
              label: "Event Timeline - {{timezone}}",
              timezone: "EST",
              contentType: "table",
              tableData: {
                headers: ["Time", "Event", "Owner"],
                rows: [
                  ["{{time1}}", "{{event1}}", "{{owner1}}"],
                  ["{{time2}}", "{{event2}}", "{{owner2}}"],
                  ["{{time3}}", "{{event3}}", "{{owner3}}"]
                ]
              },
              time1: "09:00 AM",
              event1: "Issue Detected",
              owner1: "Monitoring Team",
              time2: "09:15 AM",
              event2: "Investigation Started",
              owner2: "On-Call Engineer",
              time3: "10:00 AM",
              event3: "Resolution Applied",
              owner3: "DevOps Team"
            },
            styles: {}
          },
          // 24. Line Break
          {
            id: "sec-linebreak",
            type: "line-break",
            content: "<br/>",
            order: 23,
            isLabelEditable: false,
            variables: {},
            styles: {}
          },
          // 25. HTML Content
          {
            id: "sec-html",
            type: "html-content",
            content: "<span th:utext=\"${htmlContent}\"/>",
            order: 24,
            isLabelEditable: true,
            variables: {
              htmlContent: "<div style=\"padding: 16px; border: 2px solid {{borderColor}}; border-radius: 8px; background-color: {{bgColor}};\"><h4>{{alertTitle}}</h4><p>{{alertMessage}}</p></div>",
              borderColor: "#e53e3e",
              bgColor: "#fed7d7",
              alertTitle: "Critical Alert",
              alertMessage: "This incident requires immediate attention from all stakeholders."
            },
            styles: {}
          }
        ]
      }
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
