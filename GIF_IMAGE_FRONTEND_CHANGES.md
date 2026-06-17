# GIF / Image Section — Frontend Changes

This document lists every frontend change made to introduce the new
**GIF / Image** section (drag-and-drop upload, live preview in editor &
run-templates, and Outlook-compatible inline rendering via `cid:`
Content-ID references).

The companion backend doc is [`GIF_BACKEND_INTEGRATION.md`](./GIF_BACKEND_INTEGRATION.md).

---

## 1. Section Type Definition

### `src/types/section.ts`
- Added `'gif'` to the `SectionType` union so the editor, storage layer
  and renderers all recognize the new section.
- The section uses these `variables`:
  | key             | purpose                                              |
  |-----------------|------------------------------------------------------|
  | `gifSrc`        | base64 data URL (`data:image/gif;base64,...`) used for in-app preview |
  | `gifContentId`  | unique inline CID (e.g. `report-abc-1k3-9f@inline`) used in the sent email |
  | `gifFileName`   | original filename (e.g. `report.gif`)                |
  | `gifMimeType`   | MIME type (`image/gif`, `image/png`, `image/jpeg`, `image/webp`) |
  | `gifAlt`        | alt text                                             |
  | `gifWidth`      | optional rendered width in px / %                    |

### `src/data/sectionTypes.tsx`
- Registered the new `gif` section in the **Section Library** with an
  icon, label ("Image / GIF"), default variables and the editor
  component reference (`GifSectionEditor`).
- Section is allowed multiple times per template (unlike `program-name`
  / `banner` which are single-use).

---

## 2. Editor UI

### `src/components/templates/GifSectionEditor.tsx` (NEW)
The drag-and-drop upload widget used both in **Template Editor** and
**Run Templates**.

Key behavior:
- Accepts `image/gif`, `image/png`, `image/jpeg`, `image/webp`.
- Hard cap of **5 MB** per file (`MAX_BYTES`).
- `generateContentId(fileName)` produces an email-safe CID
  `"<slug>-${timestamp}-${random}@inline"`.
- `readAsDataURL(file)` reads the file as base64 and stores it in
  `section.variables.gifSrc`; also writes `gifContentId`,
  `gifFileName`, `gifMimeType`, `gifAlt`, `gifWidth`.
- Supports drag/drop **and** click-to-browse.
- Shows preview thumbnail; in `compact` mode (used in Run Templates)
  hides the alt/width controls.
- Surfaces inline validation errors (wrong type, too large).

### `src/components/templates/EditorView.tsx`
- Wired `GifSectionEditor` into the section-rendering switch so dragging
  the "Image / GIF" section from the library into the canvas shows the
  upload dropzone.
- Inline section controls (duplicate / delete / move) work the same way
  as every other section.

---

## 3. Live Preview Rendering

### `src/components/templates/PreviewView.tsx`
Updated `getSectionHtmlInner(section)` to handle `section.type === 'gif'`:

- **Design/Preview mode (in-app):** emits
  `<img src="${gifSrc}" alt="${gifAlt}" width="${gifWidth}" />`
  so the user sees the image immediately inside the iframe preview.
- **Send mode:** if `gifSrc` is dropped (the send pipeline strips it
  and keeps only `gifContentId`), the helper emits
  `<img src="cid:${gifContentId}" alt="..." width="..." />` — this is
  the exact form Outlook expects for inline images.
- Image is wrapped in an Outlook-safe `<table>` cell with explicit
  width so it renders correctly in Outlook desktop (no float, no flex).

### `src/pages/RunTemplates.tsx`
- The right-side iframe preview re-uses the same `getSectionHtmlInner`
  helper, so any GIF the user uploads (or replaces) at send-time
  reflects instantly on the right pane.
- Calls `GifSectionEditor` with `compact` prop on the left pane so users
  can swap the image before sending without leaving the run view.

---

## 4. Send Pipeline (Browser → Backend)

### `src/lib/templateApi.ts`
- Added `buildInlineAttachments(sections)` helper.
  For every section where `type === 'gif'`:
  1. Strip the `data:<mime>;base64,` prefix from `variables.gifSrc`.
  2. Push `{ contentId, fileName, mimeType, dataBase64 }` into the
     resulting array.
- `sendTemplate(...)` was extended to:
  1. Call `buildInlineAttachments(sections)`.
  2. Rewrite the rendered HTML so every `<img>` from a gif section uses
     `src="cid:${contentId}"` (no base64 data URL on the wire — keeps
     payload small and matches Outlook's inline MIME format).
  3. Include the new `inlineAttachments: [...]` field in the
     `POST /api/templates/{id}/send` request body.

### `src/lib/templateStorage.ts`
- The `gif` section's `variables` (including `gifSrc` base64) are saved
  with the rest of the template so the user doesn't need to re-upload
  on next edit. Persistence path is unchanged — the variables map is
  already a free-form JSON blob.

### `src/lib/templateUtils.ts`
- `cloneSection(section)` deep-copies the `variables` map, so
  duplicating a GIF section also duplicates the base64 payload **but
  generates a fresh `gifContentId`** to keep CIDs unique within a
  template (required — Outlook treats duplicate CIDs as the same
  image).

### `src/lib/variableExtractor.ts`
- GIF sections do not contribute Thymeleaf placeholders, but the
  extractor explicitly skips `gif` sections to avoid mis-tagging
  base64 strings as variable names.

---

## 5. API / Global-API Integration

### `src/components/templates/GlobalApiPanel.tsx`
- The Global API picker hides `gif` sections from the
  "Bindable Variables" list (image binaries are not driven by API
  responses today).

### `src/lib/globalApiResolver.ts`
- Resolver leaves `gif` section variables untouched.

---

## 6. Validation

### `src/lib/templateValidation.ts` (touched indirectly via section-type registration)
- A `gif` section is considered **valid** if either `gifSrc` (base64)
  **or** `gifContentId` is present. An empty dropzone is flagged in the
  validation panel so the user can't save / send an unconfigured image.

---

## 7. End-to-End User Flow

1. User opens **Template Editor**, drags **Image / GIF** from the
   Section Library onto the canvas.
2. `GifSectionEditor` shows the dropzone. User drops a `.gif`.
3. File is read → base64 → stored in `section.variables.gifSrc`;
   a unique `gifContentId` is generated.
4. Right-side preview immediately renders the image inline.
5. User saves the template; base64 + metadata persist via existing
   section-storage path.
6. In **Run Templates**, the user can optionally replace the image
   using the same compact uploader.
7. On **Send**:
   - `buildInlineAttachments` extracts the binaries into
     `inlineAttachments`.
   - Rendered HTML's `<img>` tags are rewritten to `cid:<contentId>`.
   - Backend builds a `multipart/related` MIME message
     (see backend doc) so Outlook renders the image inline exactly
     like `untitled_files/image001.gif`.

---

## 8. File Change Summary

| File | Change |
|------|--------|
| `src/types/section.ts` | Added `gif` to `SectionType` |
| `src/data/sectionTypes.tsx` | Registered `gif` section (icon, label, defaults, editor) |
| `src/components/templates/GifSectionEditor.tsx` | **New** drag/drop editor component |
| `src/components/templates/EditorView.tsx` | Wired `GifSectionEditor` into section switch |
| `src/components/templates/PreviewView.tsx` | `getSectionHtmlInner` renders `gif` as `<img>` (data URL in preview, `cid:` in send mode) |
| `src/pages/RunTemplates.tsx` | Compact GIF uploader + live preview sync at send-time |
| `src/lib/templateApi.ts` | Added `buildInlineAttachments` + extended `sendTemplate` payload |
| `src/lib/templateStorage.ts` | Persists `gif` section variables alongside other sections |
| `src/lib/templateUtils.ts` | `cloneSection` regenerates `gifContentId` on duplicate |
| `src/lib/variableExtractor.ts` | Skips `gif` sections during placeholder extraction |
| `src/components/templates/GlobalApiPanel.tsx` | Hides `gif` sections from API binding list |
| `src/lib/globalApiResolver.ts` | No-op for `gif` sections |
| `src/lib/templateValidation.ts` | Flags empty GIF section as invalid |
