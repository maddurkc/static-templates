import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useIntellisenseContext } from "@/contexts/IntellisenseContext";
import { useVariableIntellisense } from "@/hooks/useVariableIntellisense";
import { VariableIntellisense } from "./VariableIntellisense";
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

  // Intellisense
  const { globalApiConfig, enabled: intellisenseEnabled } = useIntellisenseContext();
  const intellisense = useVariableIntellisense({ globalApiConfig, enabled: intellisenseEnabled });

  useEffect(() => {
    const highlighted = highlightThymeleaf(value || "");
    setHighlightedHtml(highlighted);
  }, [value]);

  const highlightThymeleaf = (text: string): string => {
    if (!text) return "";
    
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Highlight {{placeholder}} and {{var.field}} syntax
    escaped = escaped.replace(
      /(\{\{(\w+(?:\.\w+)*)\}\})/g,
      '<span class="text-primary font-semibold bg-primary/10 px-0.5 rounded">$1</span>'
    );
    
    escaped = escaped.replace(
      /(&lt;span\s+th:utext="\$\{([^}]+)\}"(?:\s*\/&gt;|&gt;))/g,
      '<span class="text-primary font-semibold">$1</span>'
    );
    
    escaped = escaped.replace(
      /(&lt;th:(utext|if|each)="\$\{([^}]+)\}"&gt;)/g,
      '<span class="text-primary font-semibold">$1</span>'
    );
    
    escaped = escaped.replace(
      /(&lt;\/th:(if|each)&gt;)/g,
      '<span class="text-primary font-semibold">$1</span>'
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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Trigger intellisense
    if (textareaRef.current) {
      intellisense.handleTextareaInput(textareaRef.current);
    }
  }, [onChange, intellisense]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const handled = intellisense.handleKeyDown(e);
    if (handled) {
      if ((e.key === 'Enter' || e.key === 'Tab') && textareaRef.current) {
        const suggestion = intellisense.getActiveSuggestion();
        if (suggestion) {
          intellisense.insertIntoTextarea(textareaRef.current, suggestion, onChange);
          intellisense.close();
        }
      }
      return;
    }

    // Ctrl+Space manual trigger
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      if (textareaRef.current) {
        intellisense.handleTextareaInput(textareaRef.current);
      }
    }
  }, [intellisense, onChange]);

  return (
    <div className={cn(styles.editorWrapper, className)}>
      <div
        className={styles.highlightLayer}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={styles.textarea}
        spellCheck={false}
      />

      <VariableIntellisense
        isOpen={intellisense.isOpen}
        suggestions={intellisense.suggestions}
        activeIndex={intellisense.activeIndex}
        position={intellisense.position}
        onSelect={(suggestion) => {
          if (textareaRef.current) {
            intellisense.insertIntoTextarea(textareaRef.current, suggestion, onChange);
            intellisense.close();
          }
        }}
        onHover={intellisense.setActiveIndex}
        onClose={intellisense.close}
      />
    </div>
  );
};
