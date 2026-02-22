import { ApiTemplate } from "@/types/api-config";

export const API_TEMPLATES: ApiTemplate[] = [
  {
    id: "jira-fix-version-details",
    name: "Jira Fix Version Details",
    description: "Get details of a specific fix version from Jira",
    category: "Jira",
    url: "https://{domain}.atlassian.net/rest/api/3/version/{versionId}",
    method: "GET",
    headers: {
      "Authorization": "Basic {authToken}",
      "Content-Type": "application/json"
    },
    requiredParams: [
      {
        name: "domain",
        label: "Jira Domain",
        type: "text",
        placeholder: "your-company",
        required: true,
        description: "Your Jira subdomain (e.g., 'your-company' for your-company.atlassian.net)",
        location: "path"
      },
      {
        name: "versionId",
        label: "Version ID",
        type: "text",
        placeholder: "10000",
        required: true,
        description: "The ID of the fix version",
        location: "path"
      },
      {
        name: "authToken",
        label: "Auth Token",
        type: "text",
        placeholder: "Base64 encoded email:api_token",
        required: true,
        description: "Base64 encoded 'email:api_token'",
        location: "header"
      }
    ],
    sampleMappings: [
      {
        id: "mapping-1",
        sectionId: "",
        apiPath: "name",
        dataType: "text",
        variableName: "title"
      },
      {
        id: "mapping-2",
        sectionId: "",
        apiPath: "description",
        dataType: "html",
        variableName: "content"
      }
    ]
  },
  {
    id: "jira-version-issues",
    name: "Jira Version Issues",
    description: "Get all issues associated with a fix version",
    category: "Jira",
    url: "https://{domain}.atlassian.net/rest/api/3/search?jql=fixVersion={versionName}",
    method: "GET",
    headers: {
      "Authorization": "Basic {authToken}",
      "Content-Type": "application/json"
    },
    requiredParams: [
      {
        name: "domain",
        label: "Jira Domain",
        type: "text",
        placeholder: "your-company",
        required: true,
        description: "Your Jira subdomain",
        location: "path"
      },
      {
        name: "versionName",
        label: "Version Name",
        type: "text",
        placeholder: "v1.0.0",
        required: true,
        description: "Name of the fix version",
        location: "query"
      },
      {
        name: "authToken",
        label: "Auth Token",
        type: "text",
        placeholder: "Base64 encoded email:api_token",
        required: true,
        description: "Base64 encoded 'email:api_token'",
        location: "header"
      }
    ],
    sampleMappings: [
      {
        id: "mapping-1",
        sectionId: "",
        apiPath: "issues",
        dataType: "list",
        variableName: "items"
      }
    ]
  },
  {
    id: "servicenow-incident",
    name: "ServiceNow Incident Details",
    description: "Get details of a specific incident from ServiceNow",
    category: "ServiceNow",
    url: "https://{instance}.service-now.com/api/now/table/incident/{incidentNumber}",
    method: "GET",
    headers: {
      "Authorization": "Basic {authToken}",
      "Content-Type": "application/json"
    },
    requiredParams: [
      {
        name: "instance",
        label: "ServiceNow Instance",
        type: "text",
        placeholder: "dev12345",
        required: true,
        description: "Your ServiceNow instance name",
        location: "path"
      },
      {
        name: "incidentNumber",
        label: "Incident Number",
        type: "text",
        placeholder: "INC0010001",
        required: true,
        description: "The incident number",
        location: "path"
      },
      {
        name: "authToken",
        label: "Auth Token",
        type: "text",
        placeholder: "Base64 encoded username:password",
        required: true,
        description: "Base64 encoded 'username:password'",
        location: "header"
      }
    ],
    sampleMappings: [
      {
        id: "mapping-1",
        sectionId: "",
        apiPath: "result.short_description",
        dataType: "text",
        variableName: "title"
      },
      {
        id: "mapping-2",
        sectionId: "",
        apiPath: "result.description",
        dataType: "html",
        variableName: "content"
      }
    ]
  },
  {
    id: "servicenow-change",
    name: "ServiceNow Change Details",
    description: "Get details of a specific change request from ServiceNow",
    category: "ServiceNow",
    url: "https://{instance}.service-now.com/api/now/table/change_request/{changeNumber}",
    method: "GET",
    headers: {
      "Authorization": "Basic {authToken}",
      "Content-Type": "application/json"
    },
    requiredParams: [
      {
        name: "instance",
        label: "ServiceNow Instance",
        type: "text",
        placeholder: "dev12345",
        required: true,
        description: "Your ServiceNow instance name",
        location: "path"
      },
      {
        name: "changeNumber",
        label: "Change Number",
        type: "text",
        placeholder: "CHG0030001",
        required: true,
        description: "The change request number",
        location: "path"
      },
      {
        name: "authToken",
        label: "Auth Token",
        type: "text",
        placeholder: "Base64 encoded username:password",
        required: true,
        description: "Base64 encoded 'username:password'",
        location: "header"
      }
    ],
    sampleMappings: [
      {
        id: "mapping-1",
        sectionId: "",
        apiPath: "result.short_description",
        dataType: "text",
        variableName: "title"
      },
      {
        id: "mapping-2",
        sectionId: "",
        apiPath: "result.description",
        dataType: "html",
        variableName: "content"
      }
    ]
  },
  {
    id: "github-repo-info",
    name: "GitHub Repository Info",
    description: "Get information about a GitHub repository",
    category: "GitHub",
    url: "https://api.github.com/repos/{owner}/{repo}",
    method: "GET",
    headers: {
      "Authorization": "Bearer {token}",
      "Accept": "application/vnd.github.v3+json"
    },
    requiredParams: [
      {
        name: "owner",
        label: "Repository Owner",
        type: "text",
        placeholder: "octocat",
        required: true,
        description: "GitHub username or organization",
        location: "path"
      },
      {
        name: "repo",
        label: "Repository Name",
        type: "text",
        placeholder: "hello-world",
        required: true,
        description: "Repository name",
        location: "path"
      },
      {
        name: "token",
        label: "GitHub Token",
        type: "text",
        placeholder: "ghp_xxxxxxxxxxxxx",
        required: true,
        description: "GitHub personal access token",
        location: "header"
      }
    ],
    sampleMappings: [
      {
        id: "mapping-1",
        sectionId: "",
        apiPath: "name",
        dataType: "text",
        variableName: "title"
      },
      {
        id: "mapping-2",
        sectionId: "",
        apiPath: "description",
        dataType: "text",
        variableName: "subtitle"
      }
    ]
  },
  {
    id: "jsonplaceholder-user",
    name: "JSONPlaceholder User (Demo)",
    description: "Get user information from JSONPlaceholder - Free fake API for testing",
    category: "Demo",
    url: "https://jsonplaceholder.typicode.com/users/{userId}",
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    requiredParams: [
      {
        name: "userId",
        label: "User ID",
        type: "text",
        placeholder: "1",
        required: true,
        description: "User ID (1-10 available in demo API)",
        location: "path"
      }
    ],
    sampleMappings: [],
    mockData: {
      id: 1,
      name: "Leanne Graham",
      username: "Bret",
      email: "leanne@example.com",
      phone: "1-770-736-8031",
      website: "hildegard.org",
      company: {
        name: "Romaguera-Crona",
        catchPhrase: "Multi-layered client-server neural-net"
      },
      address: {
        street: "Kulas Light",
        city: "Gwenborough",
        zipcode: "92998-3874"
      }
    }
  },
  {
    id: "mock-string-list",
    name: "Mock Tags List (Demo)",
    description: "Returns a list of string tags - Maps to bullet list",
    category: "Demo",
    url: "mock://string-list",
    method: "GET",
    headers: {},
    requiredParams: [],
    sampleMappings: [],
    mockData: [
      "Critical Bug Fix",
      "Performance Improvement",
      "Security Patch",
      "New Feature",
      "Documentation Update"
    ]
  },
  {
    id: "mock-object-list",
    name: "Mock Issues List (Demo)",
    description: "Returns a list of objects - Maps to table",
    category: "Demo",
    url: "mock://object-list",
    method: "GET",
    headers: {},
    requiredParams: [],
    sampleMappings: [],
    mockData: [
      { id: "JIRA-101", title: "Fix login timeout", status: "Done", priority: "High", assignee: "John Doe" },
      { id: "JIRA-102", title: "Add dark mode support", status: "In Progress", priority: "Medium", assignee: "Jane Smith" },
      { id: "JIRA-103", title: "Optimize database queries", status: "Open", priority: "High", assignee: "Bob Wilson" },
      { id: "JIRA-104", title: "Update API documentation", status: "Done", priority: "Low", assignee: "Alice Brown" }
    ]
  },
  {
    id: "mock-single-object",
    name: "Mock Release Info (Demo)",
    description: "Returns a single object - Maps to table or labeled list",
    category: "Demo",
    url: "mock://single-object",
    method: "GET",
    headers: {},
    requiredParams: [],
    sampleMappings: [],
    mockData: {
      version: "2.5.0",
      releaseName: "Aurora",
      releaseDate: "2024-01-15",
      status: "Released",
      totalIssues: 45,
      fixedBugs: 28,
      newFeatures: 12,
      improvements: 5,
      breakingChanges: false
    }
  },
  {
    id: "mock-servicenow-change",
    name: "Mock ServiceNow Change (Demo)",
    description: "Returns a ServiceNow change request object - Use with dot notation like {{snowDetails.changeNo}}",
    category: "Demo",
    url: "mock://servicenow-change",
    method: "GET",
    headers: {},
    requiredParams: [
      { name: 'changeNo', label: 'Change Number', type: 'text', placeholder: 'CHG1234567', required: false, description: 'Enter a change number to override mock data', location: 'query' }
    ],
    sampleMappings: [],
    mockData: {
      changeNo: "CHG1234567",
      changeStDt: "12-12-2024",
      changeEdDt: "12-15-2024",
      shortDescription: "Upgrade database server to v12.5",
      priority: "High",
      risk: "Moderate",
      status: "Implement",
      assignedTo: "John Smith",
      assignmentGroup: "Database Administration",
      category: "Software",
      type: "Standard",
      requestedBy: "Jane Doe",
      approvalStatus: "Approved",
      environment: "Production",
      impactedCIs: "DB-PROD-01, DB-PROD-02"
    }
  },
  {
    id: "mock-servicenow-incident",
    name: "Mock ServiceNow Incident (Demo)",
    description: "Returns a ServiceNow incident object",
    category: "Demo",
    url: "mock://servicenow-incident",
    method: "GET",
    headers: {},
    requiredParams: [
      { name: 'incidentNo', label: 'Incident Number', type: 'text', placeholder: 'INC0012345', required: false, description: 'Enter an incident number to override mock data', location: 'query' }
    ],
    sampleMappings: [],
    mockData: {
      incidentNo: "INC0012345",
      shortDescription: "Email service unavailable for east region",
      priority: "1 - Critical",
      state: "In Progress",
      assignedTo: "Alice Johnson",
      assignmentGroup: "Email Support",
      openedAt: "2024-12-10 08:30:00",
      category: "Network",
      subcategory: "Email",
      impact: "1 - High",
      urgency: "1 - High",
      resolvedBy: "",
      resolutionNotes: ""
    }
  },
  {
    id: "mock-nested-object-list",
    name: "Mock Team Members (Demo)",
    description: "Returns nested objects with arrays - Complex data structure",
    category: "Demo",
    url: "mock://nested-list",
    method: "GET",
    headers: {},
    requiredParams: [],
    sampleMappings: [],
    mockData: [
      { 
        name: "Engineering Team",
        lead: "Sarah Connor",
        members: ["John", "Jane", "Bob"],
        projects: [
          { name: "Project Alpha", status: "Active" },
          { name: "Project Beta", status: "Planning" }
        ]
      },
      {
        name: "Design Team", 
        lead: "Mike Chen",
        members: ["Alice", "Tom"],
        projects: [
          { name: "UI Redesign", status: "Active" }
        ]
      }
    ]
  }
];

export const getTemplateById = (id: string): ApiTemplate | undefined => {
  return API_TEMPLATES.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: string): ApiTemplate[] => {
  return API_TEMPLATES.filter(template => template.category === category);
};

export const getAllCategories = (): string[] => {
  return [...new Set(API_TEMPLATES.map(template => template.category))];
};
