import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThymeleafEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const ThymeleafEditor = ({ value, onChange, placeholder, className }: ThymeleafEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [highlightedHtml, setHighlightedHtml] = useState("");

  useEffect(() => {
    const highlighted = highlightThymeleaf(value || "");
    setHighlightedHtml(highlighted);
  }, [value]);

  const highlightThymeleaf = (text: string): string => {
    if (!text) return "";
    
    // Escape HTML entities first
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Highlight Thymeleaf tags
    escaped = escaped.replace(
      /(&lt;th:(utext|if|each)="\$\{([^}]+)\}"&gt;)/g,
      '<span class="text-primary font-semibold">$1</span>'
    );
    
    // Highlight closing tags
    escaped = escaped.replace(
      /(&lt;\/th:(if|each)&gt;)/g,
      '<span class="text-primary font-semibold">$1</span>'
    );
    
    // Highlight variables inside expressions
    escaped = escaped.replace(
      /(\$\{[^}]+\})/g,
      '<span class="text-accent font-bold">$1</span>'
    );
    
    return escaped.replace(/\n/g, "<br />");
  };

  const handleScroll = () => {
    if (textareaRef.current) {
      const highlightDiv = textareaRef.current.previousElementSibling as HTMLDivElement;
      if (highlightDiv) {
        highlightDiv.scrollTop = textareaRef.current.scrollTop;
        highlightDiv.scrollLeft = textareaRef.current.scrollLeft;
      }
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Highlighted background */}
      <div
        className="absolute inset-0 pointer-events-none overflow-auto whitespace-pre-wrap break-words font-mono text-sm p-3 leading-6"
        style={{ 
          color: "transparent",
          border: "1px solid transparent"
        }}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
      
      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={cn(
          "relative w-full min-h-[120px] p-3 font-mono text-sm",
          "bg-transparent caret-foreground",
          "border border-input rounded-md",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          "resize-y leading-6"
        )}
        style={{
          color: "inherit"
        }}
        spellCheck={false}
      />
    </div>
  );
};
