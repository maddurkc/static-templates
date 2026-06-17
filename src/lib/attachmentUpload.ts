/**
 * attachmentUpload.ts
 *
 * Upload pipeline for inline GIF / image attachments.
 *
 * Why this exists:
 *   Originally the GIF section stored the file as a base64 data URL inside
 *   `section.variables.gifSrc` and shipped it inside the JSON body of the
 *   template save / send request. That works for tiny files but breaks down
 *   for anything beyond ~1 MB:
 *
 *     - base64 inflates payload by ~33% (5 MB file -> ~6.7 MB of ASCII)
 *     - Spring Boot / Tomcat default `max-http-form-post-size` is ~2 MB,
 *       `server.tomcat.max-swallow-size` is 2 MB, and most reverse proxies
 *       (nginx `client_max_body_size`, AWS ALB) cap JSON bodies at 1-10 MB.
 *     - JSON parsing of multi-MB strings spikes memory + GC on the server.
 *
 * Strategy implemented here:
 *   1. Client-side compression / resizing (canvas re-encode) BEFORE upload —
 *      caps any non-GIF image at 1600px wide / 0.82 JPEG quality. GIFs are
 *      left untouched (re-encoding would kill the animation).
 *   2. Separate upload endpoint: `POST /api/attachments` (multipart/form-data)
 *      returns `{ id, url, contentId }`. Template JSON only stores the
 *      reference, NOT the bytes.
 *   3. Graceful fallback: if `VITE_ATTACHMENT_UPLOAD_URL` is not configured
 *      we keep the legacy base64 behaviour so the dev preview still works
 *      without a backend.
 */

const UPLOAD_URL = import.meta.env.VITE_ATTACHMENT_UPLOAD_URL as string | undefined;

/** Hard cap before resize is attempted. */
export const RAW_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Cap on bytes that may travel inside JSON when no upload endpoint is configured. */
export const INLINE_BASE64_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

/** Resize ceiling for re-encoded raster images. */
const MAX_DIMENSION_PX = 1600;
const JPEG_QUALITY = 0.82;

export interface UploadedAttachment {
  /** Backend-issued ID (used for delete / re-fetch). */
  id: string;
  /** Public URL the editor + preview should load. */
  url: string;
  /** RFC2392 Content-ID used in the sent email. */
  contentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface InlineAttachment {
  /** Sentinel — true when the file was stored as a base64 data URL (no backend). */
  inline: true;
  url: string; // data: URL
  contentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export type AttachmentResult = UploadedAttachment | InlineAttachment;

const generateContentId = (fileName: string): string => {
  const slug = fileName.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().slice(0, 24) || "image";
  const rand = Math.random().toString(36).slice(2, 10);
  return `${slug}-${Date.now().toString(36)}-${rand}@inline`;
};

const readAsDataURL = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * Re-encode a raster image to keep it under a sane size.
 * - GIFs are returned untouched (animation would be lost).
 * - PNG with alpha is kept as PNG; everything else re-encoded to JPEG.
 */
async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  if (typeof document === "undefined") return file;

  const dataUrl = await readAsDataURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  // Skip re-encode when nothing would change AND file is already small enough.
  if (scale === 1 && file.size < INLINE_BASE64_MAX_BYTES) return file;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
      outType,
      outType === "image/jpeg" ? JPEG_QUALITY : undefined
    )
  );

  // If compression somehow grew the file, keep the original.
  if (blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + (outType === "image/png" ? ".png" : ".jpg");
  return new File([blob], newName, { type: outType });
}

/**
 * Upload a file to the backend attachments endpoint.
 * Falls back to an inline base64 data URL when no endpoint is configured.
 */
export async function uploadAttachment(rawFile: File): Promise<AttachmentResult> {
  if (rawFile.size > RAW_MAX_BYTES) {
    throw new Error(`File is larger than ${(RAW_MAX_BYTES / 1024 / 1024).toFixed(0)} MB.`);
  }

  const file = await compressImage(rawFile);

  // --- Fallback path: no backend configured -------------------------------
  if (!UPLOAD_URL) {
    if (file.size > INLINE_BASE64_MAX_BYTES) {
      throw new Error(
        `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB after compression. ` +
          `Inline preview only supports up to ${INLINE_BASE64_MAX_BYTES / 1024 / 1024} MB ` +
          `until VITE_ATTACHMENT_UPLOAD_URL is configured.`
      );
    }
    const dataUrl = await readAsDataURL(file);
    return {
      inline: true,
      url: dataUrl,
      contentId: generateContentId(file.name),
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
  }

  // --- Real upload path ---------------------------------------------------
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("contentId", generateContentId(file.name));

  const resp = await fetch(UPLOAD_URL, { method: "POST", body: form, credentials: "include" });
  if (!resp.ok) {
    throw new Error(`Upload failed (${resp.status}): ${await resp.text().catch(() => "")}`);
  }
  const json = (await resp.json()) as Partial<UploadedAttachment>;
  if (!json.id || !json.url || !json.contentId) {
    throw new Error("Upload response missing id/url/contentId.");
  }
  return {
    id: json.id,
    url: json.url,
    contentId: json.contentId,
    fileName: json.fileName ?? file.name,
    mimeType: json.mimeType ?? file.type,
    sizeBytes: json.sizeBytes ?? file.size,
  };
}

/** True when the result is a real backend upload (not the base64 fallback). */
export const isUploaded = (a: AttachmentResult): a is UploadedAttachment =>
  !(a as InlineAttachment).inline;
