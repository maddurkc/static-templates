import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./ThymeleafEditor.module.scss";

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
    <div className={cn(styles.editorWrapper, className)}>
      {/* Highlighted background */}
      <div
        className={styles.highlightLayer}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
      
      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={styles.textarea}
        spellCheck={false}
      />
    </div>
  );
};
