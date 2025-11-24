# Components CSS Modules Conversion Guide

## Completed Conversions

All SCSS module files have been created for the following components:

### Sections Components
- ✅ `SectionPreviewDialog.module.scss` - Created

### Templates Components  
- ✅ `ApiConfigPopover.module.scss` - Created
- ✅ `ContainerSection.module.scss` - Created
- ✅ `CustomizationToolbar.module.scss` - Created
- ✅ `EditorView.module.scss` - Created
- ✅ `PreviewView.module.scss` - Created
- ✅ `SectionLibrary.module.scss` - Created
- ✅ `TableEditor.module.scss` - Created
- ✅ `ThymeleafEditor.module.scss` - Created
- ✅ `VariableEditor.module.scss` - Created

## How to Apply CSS Modules to Each Component

### 1. SectionPreviewDialog.tsx

**Add import:**
```tsx
import styles from "./SectionPreviewDialog.module.scss";
```

**Update classes:**
- `.max-w-6xl max-h-[90vh] flex flex-col` → `{styles.dialogContent}`
- `.flex-1 grid grid-cols-2 gap-6` → `{styles.gridLayout}`
- `.pr-4` → `{styles.leftPanel}`
- `.space-y-4` → `{styles.formSection}`
- `.space-y-2` (form fields) → `{styles.formField}`
- `.flex gap-2` (list items) → `{styles.listItemRow}`
- `.border rounded-lg bg-background` → `{styles.previewPanel}`
- `.border-b px-4 py-2 bg-muted/30` → `{styles.previewHeader}`
- `.p-6` (preview content) → `{styles.previewContent}`

### 2. ApiConfigPopover.tsx

**Add import:**
```tsx
import styles from "./ApiConfigPopover.module.scss";
```

**Update classes:**
- `.space-y-4 p-1` → `{styles.container}`
- `.space-y-2` (sections) → `{styles.section}`
- `.text-sm font-semibold` → `{styles.sectionTitle}`
- `.flex items-center justify-between` → `{styles.enableSwitch}`
- `.text-xs text-muted-foreground` → `{styles.description}`
- `.p-2 bg-muted/50 rounded text-xs` → `{styles.infoBox}`
- `.p-3 border rounded-lg space-y-2 bg-muted/30` → `{styles.mappingCard}`

### 3. ContainerSection.tsx

**Add import:**
```tsx
import styles from "./ContainerSection.module.scss";
```

**Update classes:**
- `.group` → `{styles.container}`
- `.mb-2 transition-all ...` → `{styles.card} ${isSelected ? styles.selected : ''}`
- `.flex items-center gap-2 p-3 bg-muted/30` → `{styles.header}`
- `.cursor-grab active:cursor-grabbing hover:bg-muted rounded p-1` → `{styles.dragHandle}`
- `.flex-1 flex items-center gap-2` → `{styles.contentArea}`
- `.text-sm font-medium` → `{styles.sectionCount}`
- `.p-3 border-t border-dashed` → `{styles.childrenArea}`

### 4. CustomizationToolbar.tsx

**Add import:**
```tsx
import styles from "./CustomizationToolbar.module.scss";
```

**Update classes:**
- `.border-t bg-card/80 backdrop-blur-sm px-6 py-3` → `{styles.toolbar}`
- `.flex items-center justify-between` → `{styles.toolbarHeader}`
- `.text-sm font-semibold` → `{styles.title}`
- `.text-xs text-muted-foreground` → `{styles.subtitle}`
- `.flex items-center gap-2` → `{styles.actions}`
- `.space-y-3` → `{styles.controls}`
- `.flex items-center gap-6 flex-wrap` → `{styles.controlRow}`

### 5. SectionLibrary.tsx

**Add import:**
```tsx
import styles from "./SectionLibrary.module.scss";
```

**Update classes:**
- `.p-4 space-y-6` → `{styles.container}`
- `.space-y-3` (category) → `{styles.categorySection}`
- `.flex items-center gap-2` → `{styles.categoryHeader}`
- `.text-sm font-semibold text-muted-foreground uppercase` → `{styles.categoryTitle}`
- `.space-y-2` (sections list) → `{styles.sectionsList}`
- `.p-3 cursor-grab ...` → `{styles.draggableCard}`
- `.flex items-center gap-3` → `{styles.cardContent}`

### 6. EditorView.tsx

**Add import:**
```tsx
import styles from "./EditorView.module.scss";
```

**Update classes:**
- `.p-8 space-y-4` → `{styles.container}`
- `.max-w-4xl mx-auto space-y-4` → `{styles.innerContainer}`
- `.group relative border-2 rounded-lg mb-3` → `{styles.section} ${isSelected ? styles.selected : ''}`
- `.absolute left-2 top-4 cursor-grab` → `{styles.dragHandle}`
- `.flex items-center gap-2 p-3 bg-muted/30 border-b` → `{styles.containerHeader}`
- `.pl-10 pr-32 py-4` → `{styles.sectionContent}`
- `.absolute right-2 top-4 flex items-center gap-1` → `{styles.controls}`

### 7. PreviewView.tsx

**Add import:**
```tsx
import styles from "./PreviewView.module.scss";
```

**Update classes:**
- `.h-full` → `{styles.container}`
- `.sticky top-0 p-4 border-b bg-white z-10` → `{styles.header}`
- `.font-semibold text-lg` → `{styles.title}`
- `.text-xs text-muted-foreground mt-1` → `{styles.subtitle}`
- `.p-8 bg-gray-50` → `{styles.previewArea}`
- `.max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6` → `{styles.previewContent}`

### 8. TableEditor.tsx

**Add import:**
```tsx
import styles from "./TableEditor.module.scss";
```

**Update classes:**
- `.space-y-4` → `{styles.container}`
- `.flex items-center justify-between` → `{styles.header}`
- `.text-sm font-semibold` → `{styles.title}`
- `.flex items-center gap-2` → `{styles.toggleGroup}`
- `.text-xs` → `{styles.toggleLabel}`
- `.flex gap-2 flex-wrap` → `{styles.actions}`
- `.overflow-auto max-h-[400px]` → `{styles.tableWrapper}`
- `.w-full` → `{styles.table} ${tableData.showBorder ? styles.bordered : ''}`

### 9. ThymeleafEditor.tsx

**Add import:**
```tsx
import styles from "./ThymeleafEditor.module.scss";
```

**Update classes:**
- `.relative` → `{styles.editorWrapper}`
- `.absolute inset-0 pointer-events-none ...` → `{styles.highlightLayer}`
- `.relative w-full min-h-[120px] p-3 font-mono ...` → `{styles.textarea}`

### 10. VariableEditor.tsx

**Add import:**
```tsx
import styles from "./VariableEditor.module.scss";
```

**Update classes:**
- `.space-y-4` → `{styles.container}`
- `.flex items-center justify-between` → `{styles.header}`
- `.text-sm font-semibold` → `{styles.title}`
- `.space-y-2` → `{styles.section}`
- `.text-sm font-medium` → `{styles.label}`
- `.text-xs text-muted-foreground` → `{styles.description}`
- `.flex items-center gap-2` (checkboxes) → `{styles.checkboxGroup}`
- `.overflow-x-auto` → `{styles.tableWrapper}`

## Quick Migration Steps

For each component:

1. **Add the import** at the top of the file:
   ```tsx
   import styles from "./ComponentName.module.scss";
   ```

2. **Replace Tailwind classes** with CSS Module classes using the mapping above

3. **Handle conditional classes** with template literals:
   ```tsx
   // Before
   className={`card ${isSelected ? 'selected' : ''}`}
   
   // After
   className={`${styles.card} ${isSelected ? styles.selected : ''}`}
   ```

4. **Combine with other classes** if needed:
   ```tsx
   className={`${styles.container} ${customClass}`}
   ```

## Benefits of CSS Modules

✅ **Fully scoped** - No global namespace pollution
✅ **Type-safe** - TypeScript support for class names
✅ **Zero conflicts** - Styles won't leak to other components
✅ **Easy to maintain** - All styles in one file per component
✅ **Material-UI compatible** - Works alongside MUI's sx prop

## Testing

After migration:

1. Check that all components render correctly
2. Verify styles are applied (check browser DevTools for hashed class names)
3. Confirm no style conflicts with existing project components

## Need Help?

If you encounter issues:
- Check that SCSS files are in the same directory as components
- Verify imports use correct relative paths
- Ensure `sass-embedded` is installed
- Check browser console for missing class names
