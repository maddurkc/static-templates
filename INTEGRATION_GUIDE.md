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
src/data/sectionTypes.tsx      (Section type definitions)
src/data/apiTemplates.ts       (API template definitions)
```

### UI Components (Shadcn components - adapt to MUI as needed):
```
src/components/ui/*            (All UI components)
src/components/sections/*      (Section components)
src/components/templates/*     (Template components)
```

## Integration Steps

### 1. Install Required Dependencies
```bash
npm install sass
# OR
yarn add sass
```

### 2. Copy Files
Copy all the files listed above to your existing project, maintaining the same directory structure.

### 3. Adapt UI Components to Material-UI

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

### 4. Example: Converting Sections.tsx to Use MUI

```tsx
// Before (Shadcn)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// After (Material-UI)
import { Card, CardContent, CardHeader, Typography, Button } from '@mui/material';
```

```tsx
// Before (Shadcn)
<Card className={styles.sectionCard}>
  <CardHeader className={styles.cardHeader}>
    <CardTitle className={styles.cardTitle}>{section.label}</CardTitle>
  </CardHeader>
  <CardContent className={styles.cardContent}>
    {/* content */}
  </CardContent>
</Card>

// After (Material-UI) 
<Card className={styles.sectionCard}>
  <CardHeader className={styles.cardHeader}>
    <Typography variant="h6" className={styles.cardTitle}>
      {section.label}
    </Typography>
  </CardHeader>
  <CardContent className={styles.cardContent}>
    {/* content */}
  </CardContent>
</Card>
```

### 5. Use sx Prop for Dynamic Styles (Optional)

For dynamic/conditional styles, you can use MUI's `sx` prop alongside CSS Modules:

```tsx
<Button
  className={styles.actionButton}
  sx={{
    mb: 2,  // margin-bottom: 16px
    '&:hover': {
      backgroundColor: 'primary.dark'
    }
  }}
>
  Click Me
</Button>
```

## Style Isolation Guarantee

✅ **Fully Scoped**: All styles in `.module.scss` files are automatically scoped to their component
✅ **No Global Pollution**: Styles won't leak to other parts of your application
✅ **No Conflicts**: CSS class names are hashed (e.g., `.container` becomes `.Sections_container__a1b2c`)

Example:
```scss
// Sections.module.scss
.container {
  padding: 2rem;
  background: #f8f9fa;
}

// Compiles to:
.Sections_container__3xY2k {
  padding: 2rem;
  background: #f8f9fa;
}
```

## Color System

The SCSS files use standard hex colors that you can easily customize:

```scss
// Primary color (blue)
--primary: #4361ee

// Accent color (teal)  
--accent: #14b8a6

// Text colors
--text-primary: #212529
--text-muted: #6c757d

// Backgrounds
--bg-light: #f8f9fa
--bg-white: #ffffff
```

## Testing Integration

1. **Start your dev server** with the new files
2. **Navigate to /sections** to test the Sections page
3. **Check browser DevTools** - all styles should be scoped (e.g., `Sections_container__abc123`)
4. **Verify isolation** - modify styles in `.module.scss` and confirm they only affect that component

## Need Help?

Common issues:

### SCSS not compiling?
Make sure you have `sass` installed: `npm install sass`

### Styles not applying?
Check that you're importing the SCSS file: `import styles from "./Component.module.scss"`

### Class names not found?
Verify your TypeScript config allows CSS modules. Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "plugins": [{ "name": "typescript-plugin-css-modules" }]
  }
}
```

## Summary

🎉 **You now have**:
- ✅ Fully isolated, scoped styles for all template pages
- ✅ No Tailwind dependency
- ✅ Easy to integrate with your existing Material-UI project
- ✅ Standard CSS that won't conflict with your existing styles
- ✅ Ready to customize colors, spacing, and typography

Simply copy the files, replace Shadcn components with Material-UI equivalents, and you're ready to go!
