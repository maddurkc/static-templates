import { useRef, useEffect, useState, KeyboardEvent } from "react";
import { RichTextToolbar } from "./RichTextToolbar";
import { Section } from "@/types/section";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Settings } from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  dynamicSections: Section[];
  onSectionSelect?: (section: Section) => void;
  onRemoveSection?: (sectionId: string) => void;
}

export const RichTextEditor = ({
  content,
  onChange,
  dynamicSections,
  onSectionSelect,
  onRemoveSection,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: "rich-text-editor",
  });

  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      const selection = window.getSelection();
      let startOffset = 0;
      
      // Safely get current cursor position
      try {
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          startOffset = range.startOffset;
        }
      } catch (e) {
        // Unable to get selection, use default position
      }

      editorRef.current.innerHTML = content;

      // Restore cursor position
      try {
        if (selection && editorRef.current.childNodes.length > 0) {
          const newRange = document.createRange();
          const textNode = editorRef.current.childNodes[0];
          if (textNode && textNode.textContent) {
            newRange.setStart(textNode, Math.min(startOffset, textNode.textContent.length));
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      } catch (e) {
        // Cursor restoration failed, ignore
      }
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInsertImage = (url: string) => {
    document.execCommand("insertImage", false, url);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInsertLink = (url: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand("insertHTML", false, `<a href="${url}">${url}</a>`);
    }
    editorRef.current?.focus();
    handleInput();
  };

  const handleInsertTable = (rows: number, cols: number) => {
    let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">';
    for (let i = 0; i < rows; i++) {
      tableHTML += "<tr>";
      for (let j = 0; j < cols; j++) {
        const cellStyle = 'style="border: 1px solid #ddd; padding: 8px;"';
        if (i === 0) {
          tableHTML += `<th ${cellStyle}>Header ${j + 1}</th>`;
        } else {
          tableHTML += `<td ${cellStyle}>Cell</td>`;
        }
      }
      tableHTML += "</tr>";
    }
    tableHTML += "</table>";

    document.execCommand("insertHTML", false, tableHTML);
    editorRef.current?.focus();
    handleInput();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          handleFormat("bold");
          break;
        case "i":
          e.preventDefault();
          handleFormat("italic");
          break;
        case "u":
          e.preventDefault();
          handleFormat("underline");
          break;
      }
    }
  };

  const insertDynamicSection = (section: Section) => {
    const placeholder = `
      <div 
        class="dynamic-section-placeholder" 
        contenteditable="false"
        data-section-id="${section.id}"
        style="
          display: inline-block;
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%);
          color: white;
          padding: 6px 12px;
          margin: 4px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        "
      >
        🔗 ${section.type.toUpperCase()} Section
      </div>
    `;

    document.execCommand("insertHTML", false, placeholder);
    editorRef.current?.focus();
    handleInput();
  };

  // Handle dropping sections into the editor
  useEffect(() => {
    if (isOver && dynamicSections.length > 0) {
      const lastSection = dynamicSections[dynamicSections.length - 1];
      insertDynamicSection(lastSection);
    }
  }, [isOver]);

  const renderDynamicSections = () => {
    return (
      <div className="space-y-2 p-4 border-t bg-muted/20">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Dynamic Sections</p>
        {dynamicSections.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Drag sections from the library to add dynamic content
          </p>
        ) : (
          dynamicSections.map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between p-2 bg-card border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1">
                <Badge variant="secondary" className="text-xs">
                  {section.type}
                </Badge>
                <span className="text-sm truncate">
                  {section.variables?.label || section.type}
                </span>
              </div>
              <div className="flex gap-1">
                {onSectionSelect && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSectionSelect(section)}
                    className="h-7 w-7 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
                {onRemoveSection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveSection(section.id)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-card">
      <RichTextToolbar
        onFormat={handleFormat}
        onInsertImage={handleInsertImage}
        onInsertLink={handleInsertLink}
        onInsertTable={handleInsertTable}
      />

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-auto",
          isOver && "bg-primary/5 ring-2 ring-primary ring-inset"
        )}
      >
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          className={cn(
            "min-h-[400px] p-6 outline-none prose max-w-none",
            "focus:ring-2 focus:ring-primary/20 focus:ring-inset",
            isFocused && "ring-2 ring-primary/20 ring-inset"
          )}
          style={{
            wordWrap: "break-word",
            overflowWrap: "break-word",
          }}
        />
      </div>

      {renderDynamicSections()}
    </div>
  );
};
