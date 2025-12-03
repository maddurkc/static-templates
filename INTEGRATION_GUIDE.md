# CSS Modules Integration Guide

## Overview
All three main pages (Sections, Templates, RunTemplates) have been converted to use **CSS Modules** with `.module.scss` files. This ensures complete style isolation - styles will NOT affect your other project components.

## What Was Converted

### Pages Converted:
1. **src/pages/Sections.tsx** → Uses `Sections.module.scss`
2. **src/pages/Templates.tsx** → Uses `Templates.module.scss`
3. **src/pages/RunTemplates.tsx** → Uses `RunTemplates.module.scss`

### What Changed:
- ❌ Removed: All Tailwind utility classes
- ✅ Added: Scoped CSS Module classes (`.container`, `.title`, `.card`, etc.)
- ✅ Added: SCSS files with all styling converted from Tailwind to standard CSS

## Files To Copy To Your Project

### Required Files (Pages):
```
src/pages/Sections.tsx
src/pages/Sections.module.scss

src/pages/Templates.tsx
src/pages/Templates.module.scss

src/pages/RunTemplates.tsx
src/pages/RunTemplates.module.scss
```

### Supporting Files (Also copy these):
```
src/types/section.ts          (Type definitions)
src/types/api-config.ts        (API configuration types)
src/lib/sectionStorage.ts      (Section utilities)
src/lib/templateStorage.ts     (Template utilities)
src/lib/templateUtils.ts       (Template rendering)
src/lib/thymeleafUtils.ts      (Thymeleaf processing)
src/lib/tableUtils.ts          (Table utilities)
src/lib/sanitize.ts            (HTML sanitization)
src/lib/templateApi.ts         (Backend API client)
src/data/sectionTypes.tsx      (Section type definitions)
src/data/apiTemplates.ts       (API template definitions)
```

### UI Components (Shadcn components - adapt to MUI as needed):
```
src/components/ui/*            (All UI components)
src/components/sections/*      (Section components)
src/components/templates/*     (Template components)
```

---

# Backend API Integration

## Overview
The template editor integrates with a Spring Boot backend API for persisting templates. The API client (`src/lib/templateApi.ts`) handles all CRUD operations.

## Configuration

### Environment Variables
Create a `.env` file with:
```env
VITE_API_BASE_URL=http://localhost:8080/api
```

### API Base URL
Default: `http://localhost:8080/api`

## API Client Usage

### Import
```typescript
import { 
  templateApi, 
  flattenSectionsForApi, 
  TemplateCreateRequest, 
  TemplateUpdateRequest 
} from "@/lib/templateApi";
```

### Authentication
```typescript
// Set JWT token for authenticated requests
templateApi.setAuthToken('your-jwt-token');

// Clear token on logout
templateApi.clearAuthToken();
```

## API Endpoints

### 1. Create Template
**Endpoint:** `POST /api/templates`

**Request Payload:**
```typescript
interface TemplateCreateRequest {
  name: string;
  subject?: string; // Email subject with optional {{placeholders}}
  html: string;
  sectionCount: number;
  archived: boolean;
  sections: TemplateSectionRequest[];
  apiConfig?: ApiConfigRequest;
}
```

**Example:**
```typescript
const createRequest: TemplateCreateRequest = {
  name: "My Template",
  subject: "Order Confirmation - {{orderNumber}}", // Subject with placeholder
  html: "<div>...</div>",
  sectionCount: 5,
  archived: false,
  sections: [
    {
      sectionId: "section-123",
      orderIndex: 0,
      parentSectionId: null,
      content: "<h1><th:utext=\"${title}\"></h1>",
      variables: { title: "Default Title" },
      styles: { fontSize: "24px", color: "#333" },
      isLabelEditable: true
    }
  ]
};

const response = await templateApi.createTemplate(createRequest);
```

### 2. Update Template
**Endpoint:** `PUT /api/templates/{id}`

**Request Payload:**
```typescript
interface TemplateUpdateRequest {
  name?: string;
  subject?: string; // Email subject with optional {{placeholders}}
  html?: string;
  sectionCount?: number;
  archived?: boolean;
  sections?: TemplateSectionRequest[];
  apiConfig?: ApiConfigRequest;
}
```

**Example:**
```typescript
const updateRequest: TemplateUpdateRequest = {
  name: "Updated Template Name",
  subject: "Updated Subject - {{newVariable}}",
  html: "<div>Updated HTML</div>",
  sections: flattenSectionsForApi(allSections)
};

const response = await templateApi.updateTemplate(templateId, updateRequest);
```

### 3. Get All Templates
**Endpoint:** `GET /api/templates`

```typescript
const templates = await templateApi.getTemplates();
```

### 4. Get Template by ID
**Endpoint:** `GET /api/templates/{id}`

```typescript
const template = await templateApi.getTemplateById(templateId);
```

### 5. Delete Template
**Endpoint:** `DELETE /api/templates/{id}`

```typescript
await templateApi.deleteTemplate(templateId);
```

### 6. Archive/Unarchive Template
**Endpoint:** `PATCH /api/templates/{id}/archive`

```typescript
await templateApi.archiveTemplate(templateId, true); // Archive
await templateApi.archiveTemplate(templateId, false); // Unarchive
```

### 7. Duplicate Template
**Endpoint:** `POST /api/templates/{id}/duplicate`

```typescript
const duplicatedTemplate = await templateApi.duplicateTemplate(templateId, "Copy of Template");
```

## Request/Response Types

### TemplateSectionRequest
```typescript
interface TemplateSectionRequest {
  sectionId: string;           // Unique section identifier
  orderIndex: number;          // Position in the template (0-based)
  parentSectionId: string | null; // Parent section ID for nested sections
  content: string;             // HTML content with Thymeleaf tags
  variables: Record<string, string | string[]>; // Variable values
  styles: Record<string, string>; // CSS styles
  isLabelEditable: boolean;    // Whether section is editable at runtime
  listItems?: ListItemRequest[]; // For list sections
  tableData?: TableDataRequest;  // For table sections
}
```

### ListItemRequest
```typescript
interface ListItemRequest {
  id: string;
  content: string;
  styles: Record<string, string>;
  children?: ListItemRequest[]; // For nested lists (up to 3 levels)
}
```

### TableDataRequest
```typescript
interface TableDataRequest {
  headers: string[];
  rows: string[][];
}
```

### ApiConfigRequest
```typescript
interface ApiConfigRequest {
  enabled: boolean;
  templateId: string;
  paramValues: Record<string, string>;
  mappings: ApiMappingRequest[];
}

interface ApiMappingRequest {
  sectionId: string;
  apiPath: string;
  dataType: 'text' | 'list' | 'html';
  variableName?: string;
}
```

### TemplateResponse
```typescript
interface TemplateResponse {
  id: string;
  name: string;
  html: string;
  sectionCount: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  sections: TemplateSectionResponse[];
  apiConfig?: ApiConfigResponse;
}
```

## Helper Functions

### flattenSectionsForApi
Converts nested Section objects to flat array with proper ordering:

```typescript
import { flattenSectionsForApi } from "@/lib/templateApi";

const allSections = [headerSection, ...userSections, footerSection];
const apiSections = flattenSectionsForApi(allSections);
// Result: Flat array with orderIndex and parentSectionId populated
```

### sectionToRequest
Converts a single Section to TemplateSectionRequest:

```typescript
import { sectionToRequest } from "@/lib/templateApi";

const sectionRequest = sectionToRequest(section, orderIndex, parentSectionId);
```

## Error Handling

The API client throws `ApiError` on failures:

```typescript
interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>; // Validation errors
}

try {
  await templateApi.createTemplate(request);
} catch (error) {
  if (error.status === 400) {
    // Validation error
    console.error('Validation errors:', error.errors);
  } else if (error.status === 401) {
    // Unauthorized - token expired
    templateApi.clearAuthToken();
    // Redirect to login
  } else if (error.status === 404) {
    // Template not found
  } else {
    // Other error
    console.error('API error:', error.message);
  }
}
```

## Complete Save Template Flow

```typescript
const handleSaveTemplate = async () => {
  setIsSaving(true);

  try {
    // 1. Generate HTML with Thymeleaf placeholders
    const html = generateHTMLWithPlaceholders();
    
    // 2. Prepare sections for API
    const allSections = [headerSection, ...sections, footerSection];
    const apiSections = flattenSectionsForApi(allSections);
    
    // 3. Build API config if enabled
    const apiConfigRequest = apiConfig.enabled ? {
      enabled: apiConfig.enabled,
      templateId: apiConfig.templateId,
      paramValues: apiConfig.paramValues,
      mappings: apiConfig.mappings.map(m => ({
        sectionId: m.sectionId,
        apiPath: m.apiPath,
        dataType: m.dataType,
        variableName: m.variableName,
      })),
    } : undefined;

    // 4. Call appropriate API endpoint
    if (isEditMode && editingTemplateId) {
      const updateRequest: TemplateUpdateRequest = {
        name: templateName,
        html,
        sectionCount: allSections.length,
        archived: false,
        sections: apiSections,
        apiConfig: apiConfigRequest,
      };
      await templateApi.updateTemplate(editingTemplateId, updateRequest);
    } else {
      const createRequest: TemplateCreateRequest = {
        name: templateName,
        html,
        sectionCount: allSections.length,
        archived: false,
        sections: apiSections,
        apiConfig: apiConfigRequest,
      };
      await templateApi.createTemplate(createRequest);
    }

    // 5. Success handling
    toast({ title: "Template saved successfully" });
    navigate('/templates');
    
  } catch (error) {
    // 6. Error handling with local storage fallback
    console.error('API error:', error);
    toast({ 
      title: "Saved locally", 
      description: "API unavailable, saved to local storage",
      variant: "destructive" 
    });
  } finally {
    setIsSaving(false);
  }
};
```

## Backend API Mapping

| Frontend Field | Backend DTO Field | Database Column |
|----------------|-------------------|-----------------|
| `sectionId` | `sectionId` | `section_id` |
| `orderIndex` | `orderIndex` | `order_index` |
| `parentSectionId` | `parentSectionId` | `parent_section_id` |
| `content` | `content` | `content` |
| `variables` | `variables` | `variables` (JSON) |
| `styles` | `styles` | `styles` (JSON) |
| `isLabelEditable` | `isLabelEditable` | `is_label_editable` |
| `listItems` | `listItems` | `list_items` (JSON) |
| `tableData` | `tableData` | `table_data` (JSON) |

---

## Integration Steps

### 1. Install Required Dependencies
```bash
npm install sass
# OR
yarn add sass
```

### 2. Copy Files
Copy all the files listed above to your existing project, maintaining the same directory structure.

### 3. Configure API Base URL
Set the `VITE_API_BASE_URL` environment variable to point to your Spring Boot backend.

### 4. Adapt UI Components to Material-UI

The current code uses Shadcn UI components. You'll need to replace them with Material-UI equivalents:

#### Component Mapping:
```tsx
// Shadcn → Material-UI
import { Button } from "@/components/ui/button"
→ import { Button } from '@mui/material'

import { Card } from "@/components/ui/card"
→ import { Card, CardContent, CardHeader } from '@mui/material'

import { Input } from "@/components/ui/input"
→ import { TextField } from '@mui/material'

import { Label } from "@/components/ui/label"
→ Use <InputLabel> or <FormLabel> from '@mui/material'

import { Badge } from "@/components/ui/badge"
→ import { Chip } from '@mui/material'

import { Dialog } from "@/components/ui/dialog"
→ import { Dialog, DialogTitle, DialogContent } from '@mui/material'

import { ScrollArea } from "@/components/ui/scroll-area"
→ Use Box with overflow: 'auto' or custom scrollbar

import { Textarea } from "@/components/ui/textarea"
→ import { TextField } with multiline prop
```

## Style Isolation Guarantee

✅ **Fully Scoped**: All styles in `.module.scss` files are automatically scoped to their component
✅ **No Global Pollution**: Styles won't leak to other parts of your application
✅ **No Conflicts**: CSS class names are hashed (e.g., `.container` becomes `.Sections_container__a1b2c`)

## Testing Integration

1. **Start your dev server** with the new files
2. **Navigate to /sections** to test the Sections page
3. **Check browser DevTools** - all styles should be scoped
4. **Verify API calls** - check Network tab for API requests to your backend
5. **Test save functionality** - templates should persist to backend

## Summary

🎉 **You now have**:
- ✅ Fully isolated, scoped styles for all template pages
- ✅ Backend API integration for template persistence
- ✅ Automatic local storage fallback if API is unavailable
- ✅ Complete request/response type definitions
- ✅ Error handling with user-friendly messages
- ✅ Ready to integrate with Spring Boot backend
- ✅ **Email subject field with {{placeholder}} support**

---

## Email Subject Feature

Templates now support an optional `subject` field that can contain static text and/or `{{placeholders}}` for dynamic content.

### Creating Templates with Subject
When saving a template, enter the subject in the "Email Subject" field:
- Static: `Order Confirmation`
- Dynamic: `Order Confirmation - {{orderNumber}}`
- Mixed: `Welcome {{customerName}} to {{companyName}}!`

### Running Templates with Subject Placeholders
When running a template with subject placeholders:
1. The original subject template is displayed
2. Input fields appear for each placeholder variable
3. A live preview shows the processed subject
4. All subject variables must be filled before sending

### API Payload
```typescript
{
  name: "My Template",
  subject: "Order {{orderNumber}} - {{customerName}}",
  html: "...",
  sections: [...]
}
```

---

## Template List API Integration

### Overview
Templates are now fetched from the backend API instead of localStorage. The system includes automatic fallback to localStorage if the API is unavailable.

### Helper Functions

```typescript
import { fetchTemplates, fetchTemplateById } from "@/lib/templateApi";

// Fetch all templates (with localStorage fallback)
const templates = await fetchTemplates();

// Fetch single template by ID (with localStorage fallback)
const template = await fetchTemplateById('template-123');
```

### API Endpoints

#### GET /api/templates
Returns list of all templates.

**Response:**
```typescript
interface TemplateResponse[] {
  id: string;
  name: string;
  subject?: string;
  html: string;
  sectionCount: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  sections: TemplateSectionResponse[];
}
```

#### GET /api/templates/{id}
Returns single template by ID.

**Response:** Same as above (single `TemplateResponse`)

### Usage in Pages

#### Templates.tsx (List Page)
```typescript
// Uses fetchTemplates() to load templates with loading state
const [templates, setTemplates] = useState<Template[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const loadedTemplates = await fetchTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      // Falls back to localStorage automatically
    } finally {
      setIsLoading(false);
    }
  };
  loadTemplates();
}, []);
```

#### TemplateEditor.tsx (Edit Page)
Supports loading template by ID via URL parameter:
```
/templates/editor?id=template-123
```

```typescript
const [searchParams] = useSearchParams();
const templateIdFromUrl = searchParams.get('id');

useEffect(() => {
  if (templateIdFromUrl) {
    const template = await fetchTemplateById(templateIdFromUrl);
    // Load template into editor
  }
}, [templateIdFromUrl]);
```

#### RunTemplates.tsx (Execution Page)
```typescript
// Uses fetchTemplates() with filtering for non-archived templates
const loadedTemplates = await fetchTemplates();
setTemplates(loadedTemplates.filter(t => !t.archived));
```

### Error Handling
All API calls include automatic fallback to localStorage:
```typescript
try {
  const response = await templateApi.getTemplates();
  return response.map(responseToTemplate);
} catch (error) {
  console.warn('API failed, using localStorage:', error);
  return getTemplates(); // localStorage fallback
}
```

### Response Conversion
API responses are automatically converted to local `Template` type using `responseToTemplate()` helper:
- Section types are inferred from HTML content
- Nested sections are properly structured
- API config is mapped to local format
