/**
 * GifSectionEditor
 *
 * Drag-and-drop / file-picker uploader for GIF (and other image) sections.
 * Stores the file as a base64 data URL inside section.variables.gifSrc so the
 * editor + run-template previews can render it locally. A unique
 * `gifContentId` is generated per upload — at email send time the backend
 * swaps the data URL for `cid:<gifContentId>` and attaches the binary as an
 * inline MIME part (Outlook-style "untitled_files/imageNNN.gif" behaviour).
 *
 * Used by both the template editor and the run-template runtime panel so
 * the same widget controls design-time and send-time uploads.
 */

import React, { useCallback, useRef, useState } from "react";
import { Section } from "@/types/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED = "image/gif,image/png,image/jpeg,image/webp";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB safety cap for inline embedding

const generateContentId = (fileName: string): string => {
  // CID format mirrors Outlook: <something>@local — collision-resistant + email-safe.
  const slug = fileName.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().slice(0, 24) || "image";
  const rand = Math.random().toString(36).slice(2, 10);
  return `${slug}-${Date.now().toString(36)}-${rand}@inline`;
};

const readAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

interface GifSectionEditorProps {
  section: Section;
  onUpdate: (section: Section) => void;
  /** Compact runtime mode — no width/alt controls, smaller preview. */
  compact?: boolean;
}

export const GifSectionEditor: React.FC<GifSectionEditorProps> = ({
  section,
  onUpdate,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const vars = section.variables || {};
  const gifSrc = (vars.gifSrc as string) || "";
  const gifFileName = (vars.gifFileName as string) || "";
  const gifAlt = (vars.gifAlt as string) || "Inline image";
  const gifWidth = (vars.gifWidth as string) || "300";

  const acceptFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Only image / GIF files are supported.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("File is larger than 5 MB.");
        return;
      }
      try {
        const dataUrl = await readAsDataURL(file);
        const contentId = generateContentId(file.name);
        onUpdate({
          ...section,
          variables: {
            ...section.variables,
            gifSrc: dataUrl,
            gifContentId: contentId,
            gifFileName: file.name,
            gifMimeType: file.type,
            gifAlt: section.variables?.gifAlt || file.name,
            gifWidth: section.variables?.gifWidth || "300",
          },
        });
      } catch {
        setError("Failed to read file.");
      }
    },
    [section, onUpdate]
  );

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void acceptFile(file);
  };

  const handleClear = () => {
    onUpdate({
      ...section,
      variables: {
        ...section.variables,
        gifSrc: "",
        gifContentId: "",
        gifFileName: "",
        gifMimeType: "",
      },
    });
    setError(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Dropzone / preview */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center cursor-pointer rounded-md border-2 border-dashed transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50 bg-muted/20"
        )}
        style={{
          minHeight: compact ? 120 : 160,
          padding: 12,
          textAlign: "center",
        }}
      >
        {gifSrc ? (
          <>
            <img
              src={gifSrc}
              alt={gifAlt}
              style={{
                maxWidth: "100%",
                maxHeight: compact ? 120 : 220,
                objectFit: "contain",
                borderRadius: 4,
              }}
            />
            {gifFileName && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "hsl(var(--muted-foreground))",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ImageIcon size={12} />
                <span>{gifFileName}</span>
              </div>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                height: 24,
                width: 24,
              }}
              title="Remove image"
            >
              <X size={14} />
            </Button>
          </>
        ) : (
          <>
            <UploadCloud size={28} style={{ opacity: 0.6, marginBottom: 6 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              Drag & drop GIF / image
            </div>
            <div
              style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4 }}
            >
              or click to browse · GIF, PNG, JPG, WEBP · up to 5&nbsp;MB
            </div>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void acceptFile(file);
            // Reset so re-uploading the same file fires onChange
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "hsl(var(--destructive))" }}>{error}</div>
      )}

      {!compact && (
        <>
          <div>
            <Label style={{ fontSize: 12 }}>Alt text</Label>
            <Input
              value={gifAlt}
              onChange={(e) =>
                onUpdate({
                  ...section,
                  variables: { ...section.variables, gifAlt: e.target.value },
                })
              }
              placeholder="Describe the image for accessibility"
            />
          </div>
          <div>
            <Label style={{ fontSize: 12 }}>Display width (px)</Label>
            <Input
              type="number"
              min={20}
              max={1200}
              value={gifWidth}
              onChange={(e) =>
                onUpdate({
                  ...section,
                  variables: { ...section.variables, gifWidth: e.target.value },
                })
              }
            />
          </div>
        </>
      )}
    </div>
  );
};

export default GifSectionEditor;
