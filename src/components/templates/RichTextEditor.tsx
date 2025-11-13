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
  const [dropPosition, setDropPosition] = useState<{ x: number; y: number } | null>(null);

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
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleInsertImage = (url: string) => {
    editorRef.current?.focus();
    document.execCommand("insertImage", false, url);
    handleInput();
  };

  const handleInsertLink = (url: string) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand("insertHTML", false, `<a href="${url}">${url}</a>`);
    }
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

    editorRef.current?.focus();
    document.execCommand("insertHTML", false, tableHTML);
    handleInput();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Tab indentation for lists
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        handleFormat("outdent");
      } else {
        handleFormat("indent");
      }
      return;
    }

    // Delete dynamic section placeholder with Backspace/Delete
    if (e.key === "Backspace" || e.key === "Delete") {
      const selection = window.getSelection();
      const anchor = selection?.anchorNode as Node | null;
      const element = (anchor && (anchor.nodeType === 3 ? (anchor.parentElement as HTMLElement | null) : (anchor as HTMLElement | null))) || null;
      const placeholder = element?.closest?.('.dynamic-section-placeholder') as HTMLElement | null;
      if (placeholder && editorRef.current?.contains(placeholder)) {
        e.preventDefault();
        const sectionId = placeholder.getAttribute('data-section-id') || '';
        placeholder.remove();
        onRemoveSection?.(sectionId);
        handleInput();
        return;
      }
    }

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

  const insertDynamicSection = (section: Section, useDropPos = false) => {
    if (!editorRef.current) return;
    
    const placeholder = `<span class="dynamic-section-placeholder" contenteditable="false" data-section-id="${section.id}"><span class="dynamic-section-label">${section.type.toUpperCase()}</span><span class="dynamic-section-actions"><button type="button" data-action="up" aria-label="Move up">↑</button><button type="button" data-action="down" aria-label="Move down">↓</button><button type="button" data-action="delete" aria-label="Remove">✕</button></span></span>`;

    // If we have a drop position, use it to position the cursor
    if (useDropPos && dropPosition) {
      const range = document.caretRangeFromPoint(dropPosition.x, dropPosition.y);
      if (range) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      setDropPosition(null);
    }

    // Focus the editor first
    editorRef.current.focus();
    
    // Get current selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Create a temporary div to parse the HTML
      const temp = document.createElement('div');
      temp.innerHTML = placeholder;
      const node = temp.firstChild;
      
      if (node) {
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      // Fallback: append at the end
      editorRef.current.innerHTML += placeholder;
    }
    
    handleInput();
  };

  // Ensure any newly added dynamic sections are present as placeholders in the editor
  useEffect(() => {
    const currentHTML = editorRef.current?.innerHTML ?? content;
    dynamicSections.forEach((section) => {
      if (!currentHTML?.includes(`data-section-id="${section.id}"`)) {
        insertDynamicSection(section, true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicSections]);

  // Handle clicks on dynamic section placeholders within the editor
  const handlePlaceholderClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const placeholder = target.closest('.dynamic-section-placeholder') as HTMLElement | null;

    if (!placeholder) return;

    const sectionId = placeholder.getAttribute('data-section-id') || '';

    // Actions: up / down / delete
    const actionButton = target.closest('button') as HTMLButtonElement | null;
    const action = actionButton?.dataset.action;
    if (action) {
      e.preventDefault();
      if (action === 'delete') {
        placeholder.remove();
        onRemoveSection?.(sectionId);
        handleInput();
        return;
      }
      if (action === 'up') {
        const prev = placeholder.previousElementSibling;
        if (prev) {
          placeholder.parentElement?.insertBefore(placeholder, prev);
          handleInput();
        }
        return;
      }
      if (action === 'down') {
        const next = placeholder.nextElementSibling;
        if (next) {
          placeholder.parentElement?.insertBefore(next, placeholder);
          handleInput();
        }
        return;
      }
    }

    // Select/open section settings if clicking on placeholder body
    if (onSectionSelect) {
      const section = dynamicSections.find((s) => s.id === sectionId);
      if (section) onSectionSelect(section);
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-card">
      <RichTextToolbar
        onFormat={handleFormat}
        onInsertImage={handleInsertImage}
        onInsertLink={handleInsertLink}
        onInsertTable={handleInsertTable}
        content={content}
      />

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-auto",
          isOver && "bg-primary/5 ring-2 ring-primary ring-inset"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDropPosition({ x: e.clientX, y: e.clientY });
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDropPosition({ x: e.clientX, y: e.clientY });
        }}
      >
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onClick={handlePlaceholderClick}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          className={cn(
            "min-h-[400px] p-6 outline-none prose max-w-none rich-editor-content",
            "focus:ring-2 focus:ring-primary/20 focus:ring-inset",
            isFocused && "ring-2 ring-primary/20 ring-inset"
          )}
          style={{
            wordWrap: "break-word",
            overflowWrap: "break-word",
          }}
        />
      </div>
    </div>
  );
};
