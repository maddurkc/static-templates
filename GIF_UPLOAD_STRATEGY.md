# GIF / Image Upload Strategy — Send-Time Architecture

This document explains **how the frontend ships image / GIF binaries to the
backend** and answers the question raised in chat:

> *"Will frontend send the image as base64? If yes, there's a payload-size
> limit — won't the API fail?"*

**Short answer:** yes, the original implementation embedded the file as a
base64 data URL inside the template JSON. That breaks for files larger than
~1 MB because of HTTP body limits, JSON parsing overhead, and ~33% base64
bloat. We have switched to a **dedicated multipart upload endpoint with a
graceful base64 fallback** so the dev preview keeps working without a
backend.

The companion docs are:

- [`GIF_IMAGE_FRONTEND_CHANGES.md`](./GIF_IMAGE_FRONTEND_CHANGES.md) — full
  list of FE files touched by the GIF section.
- [`GIF_BACKEND_INTEGRATION.md`](./GIF_BACKEND_INTEGRATION.md) — Spring Boot
  controller / `multipart/related` send pipeline.

---

## 1. Why base64-in-JSON fails at scale

| Concern                | Detail                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Payload bloat          | base64 adds **~33%** overhead. A 5 MB GIF becomes ~6.7 MB of ASCII.                                   |
| Server limits          | Spring Boot / Tomcat default `server.tomcat.max-http-form-post-size` is **2 MB**; nginx `client_max_body_size` defaults to **1 MB**. |
| JSON parsing           | Jackson loads the entire base64 string into memory before decoding → GC spikes.                       |
| Editor save            | Every keystroke that auto-saves re-sends the full base64 — multiplies the cost.                       |
| Outlook behaviour      | Outlook strips `data:` images anyway; we already needed a `cid:` reference at send time.              |

---

## 2. New upload pipeline

```
                 ┌────────────────────┐
   user drops →  │ GifSectionEditor   │  src/components/templates/GifSectionEditor.tsx
                 └────────┬───────────┘
                          │  File
                          ▼
                 ┌────────────────────┐
                 │ uploadAttachment() │  src/lib/attachmentUpload.ts
                 │  · compressImage() │  ←— canvas re-encode, 1600px / q=0.82
                 │  · multipart POST  │
                 └────────┬───────────┘
                          │
        ┌─────────────────┴───────────────────┐
        │                                     │
 backend configured?                  no backend (dev preview)
 (VITE_ATTACHMENT_UPLOAD_URL)                 │
        │ yes                                 │
        ▼                                     ▼
 POST /api/attachments              data:image/...;base64,...
   form-data: file, contentId       returned inline, 1 MB cap
   ← { id, url, contentId }
        │
        ▼
 section.variables = {
   gifSrc:          <url>,       // CDN/object-storage URL OR data: URL
   gifAttachmentId: <backend id>,
   gifContentId:    <cid>@inline,
   gifFileName, gifMimeType, gifSizeBytes
 }
```

At **send time** the existing `cid:` rewrite in
`src/components/templates/PreviewView.tsx` still applies — the body HTML
references `cid:<gifContentId>` and the backend resolves either the
`gifAttachmentId` (look up bytes from storage) or the inline `data:` URL
(decode and attach as a MIME part).

---

## 3. New file — `src/lib/attachmentUpload.ts`

Path: [`src/lib/attachmentUpload.ts`](./src/lib/attachmentUpload.ts)

Constants and contract:

```ts
// src/lib/attachmentUpload.ts:32
export const RAW_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// src/lib/attachmentUpload.ts:35
export const INLINE_BASE64_MAX_BYTES = 1 * 1024 * 1024; // 1 MB (fallback only)

// src/lib/attachmentUpload.ts:38-40
const MAX_DIMENSION_PX = 1600;
const JPEG_QUALITY = 0.82;
```

Result shape (lines 42–63):

```ts
export interface UploadedAttachment {
  id: string;          // backend-issued
  url: string;         // CDN URL
  contentId: string;   // cid used in the email
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface InlineAttachment {
  inline: true;        // sentinel — base64 fallback
  url: string;         // data: URL
  contentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export type AttachmentResult = UploadedAttachment | InlineAttachment;
```

Compression — `compressImage()` at **lines 80–115**:

```ts
// GIFs are returned untouched (re-encoding would kill the animation).
if (file.type === "image/gif") return file;
// ...
const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(img.width, img.height));
// ...
const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
const blob: Blob = await new Promise((resolve, reject) =>
  canvas.toBlob(
    (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
    outType,
    outType === "image/jpeg" ? JPEG_QUALITY : undefined
  )
);
```

Upload — `uploadAttachment()` at **lines 121–158**:

```ts
if (rawFile.size > RAW_MAX_BYTES) {
  throw new Error(`File is larger than ${(RAW_MAX_BYTES/1024/1024).toFixed(0)} MB.`);
}
const file = await compressImage(rawFile);

// --- Fallback path: no backend configured ---
if (!UPLOAD_URL) {
  if (file.size > INLINE_BASE64_MAX_BYTES) {
    throw new Error(`Image is ${...} MB after compression. Inline preview only supports up to ${INLINE_BASE64_MAX_BYTES/1024/1024} MB...`);
  }
  const dataUrl = await readAsDataURL(file);
  return { inline: true, url: dataUrl, contentId: generateContentId(file.name), ... };
}

// --- Real upload path ---
const form = new FormData();
form.append("file", file, file.name);
form.append("contentId", generateContentId(file.name));
const resp = await fetch(UPLOAD_URL, { method: "POST", body: form, credentials: "include" });
```

---

## 4. Editor change — `src/components/templates/GifSectionEditor.tsx`

The editor no longer reads the file as base64 directly. It calls
`uploadAttachment()` and stores whatever URL the backend (or fallback)
returns.

Import & cap (lines 15–24):

```ts
// src/components/templates/GifSectionEditor.tsx:22
import { uploadAttachment, RAW_MAX_BYTES } from "@/lib/attachmentUpload";

const ACCEPTED = "image/gif,image/png,image/jpeg,image/webp";
```

Upload handler (lines 48–86) — replaces the previous `readAsDataURL` flow:

```ts
// src/components/templates/GifSectionEditor.tsx:48
const acceptFile = useCallback(
  async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) { setError("Only image / GIF files are supported."); return; }
    if (file.size > RAW_MAX_BYTES) { setError(`File is larger than ${RAW_MAX_BYTES/1024/1024} MB.`); return; }
    setIsUploading(true);
    try {
      // compresses (when safe), uploads via multipart, falls back to base64
      const result = await uploadAttachment(file);
      onUpdate({
        ...section,
        variables: {
          ...section.variables,
          gifSrc:          result.url,
          gifAttachmentId: (result as { id?: string }).id || "",
          gifContentId:    result.contentId,
          gifFileName:     result.fileName,
          gifMimeType:     result.mimeType,
          gifSizeBytes:    String(result.sizeBytes),
          gifAlt:          section.variables?.gifAlt   || result.fileName,
          gifWidth:        section.variables?.gifWidth || "300",
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  },
  [section, onUpdate]
);
```

Loader UI added in the dropzone (around **lines 180–185**):

```tsx
) : isUploading ? (
  <>
    <Loader2 size={28} className="animate-spin" ... />
    <div ...>Uploading…</div>
  </>
) : (
```

---

## 5. New section-variable keys (additive)

Already declared in [`src/types/section.ts`](./src/types/section.ts) — append
two keys to the GIF variable map:

| key                 | added by               | purpose                                  |
| ------------------- | ---------------------- | ---------------------------------------- |
| `gifAttachmentId`   | `attachmentUpload.ts`  | backend file ID — used at send time      |
| `gifSizeBytes`      | `attachmentUpload.ts`  | informational, shown in tooltip / debug  |

`gifSrc` semantics widened: it is now **either** a CDN URL **or** a `data:`
URL. Every consumer (`PreviewView`, `RunTemplates`, `templateApi`) already
treats it as an opaque string, so no other change is required.

---

## 6. Send-time payload (no change to existing JSON shape)

The send endpoint contract documented in
[`GIF_BACKEND_INTEGRATION.md`](./GIF_BACKEND_INTEGRATION.md) (section 1)
stays the same, but `inlineAttachments[]` now has TWO supported forms:

```jsonc
"inlineAttachments": [
  // Preferred — reference to an already-uploaded file
  { "contentId": "report-...@inline", "attachmentId": "att_01HV..." },

  // Legacy / fallback — inline base64 (only when frontend had no upload URL)
  { "contentId": "logo-...@inline",
    "fileName":  "logo.png",
    "mimeType":  "image/png",
    "dataBase64":"iVBORw0KGgo..." }
]
```

Backend resolution order:
1. If `attachmentId` is present → load bytes from object storage.
2. Otherwise decode `dataBase64`.

---

## 7. Required backend endpoint

```
POST /api/attachments
Content-Type: multipart/form-data
fields:
  file       — binary
  contentId  — RFC2392 CID generated by the frontend

200 OK
{
  "id":        "att_01HV9...",
  "url":       "https://cdn.example.com/att/att_01HV9....gif",
  "contentId": "report-abc-1k3-9f@inline",
  "fileName":  "report.gif",
  "mimeType":  "image/gif",
  "sizeBytes": 482133
}
```

Recommended Spring config:

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 12MB
server:
  tomcat:
    max-http-form-post-size: 12MB
    max-swallow-size: 12MB
```

Storage: S3 / Azure Blob / local FS — the URL returned should be a
short-lived signed URL or a CDN-fronted public URL the editor preview can
load with a plain `<img src>`.

---

## 8. Frontend env var

Add to `.env`:

```sh
VITE_ATTACHMENT_UPLOAD_URL=https://api.example.com/api/attachments
```

When this is **unset** the editor keeps working in pure-frontend mode using
the 1 MB base64 fallback — perfect for Storybook / local dev without a
backend.

---

## 9. Migration notes

- Existing templates saved with the old base64-only `gifSrc` continue to
  render — `PreviewView.getSectionHtmlInner` does not care whether `gifSrc`
  is a URL or a data URL.
- On the next edit of an old section the user re-uploads the file; the new
  flow then assigns `gifAttachmentId` and the template moves to the
  reference model.
- No DB migration is required on the frontend side; the backend optionally
  adds a `template_inline_assets` table per
  [`GIF_BACKEND_INTEGRATION.md` §4](./GIF_BACKEND_INTEGRATION.md).
