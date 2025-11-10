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
    sampleMappings: [
      {
        id: "mapping-1",
        sectionId: "",
        apiPath: "name",
        dataType: "text",
        variableName: "userName"
      },
      {
        id: "mapping-2",
        sectionId: "",
        apiPath: "email",
        dataType: "text",
        variableName: "userEmail"
      },
      {
        id: "mapping-3",
        sectionId: "",
        apiPath: "phone",
        dataType: "text",
        variableName: "userPhone"
      },
      {
        id: "mapping-4",
        sectionId: "",
        apiPath: "website",
        dataType: "text",
        variableName: "userWebsite"
      },
      {
        id: "mapping-5",
        sectionId: "",
        apiPath: "company.name",
        dataType: "text",
        variableName: "userCompanyName"
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
