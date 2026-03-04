import { useEffect, useRef } from "react";
import { IntellisenseSuggestion } from "@/hooks/useVariableIntellisense";
import { Database, Braces, Hash, Type, List, ToggleLeft } from "lucide-react";
import styles from "./VariableIntellisense.module.scss";

interface VariableIntellisenseProps {
  isOpen: boolean;
  suggestions: IntellisenseSuggestion[];
  activeIndex: number;
  position: { top: number; left: number };
  onSelect: (suggestion: IntellisenseSuggestion) => void;
  onHover: (index: number) => void;
  onClose: () => void;
}

const getTypeIcon = (detail: string) => {
  switch (detail) {
    case 'string': return <Type className={styles.typeIcon} />;
    case 'number': return <Hash className={styles.typeIcon} />;
    case 'boolean': return <ToggleLeft className={styles.typeIcon} />;
    case 'array':
    case 'string[]':
    case 'object[]': return <List className={styles.typeIcon} />;
    case 'object': return <Braces className={styles.typeIcon} />;
    default: return <Database className={styles.typeIcon} />;
  }
};

export const VariableIntellisense = ({
  isOpen,
  suggestions,
  activeIndex,
  position,
  onSelect,
  onHover,
  onClose,
}: VariableIntellisenseProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Scroll active item into view
  useEffect(() => {
    if (activeRef.current && listRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div
      ref={listRef}
      className={styles.container}
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
    >
      <div className={styles.header}>
        <Database className={styles.headerIcon} />
        <span>API Variables</span>
        <kbd className={styles.kbd}>↑↓</kbd>
        <kbd className={styles.kbd}>↵</kbd>
        <kbd className={styles.kbd}>esc</kbd>
      </div>
      <div className={styles.list}>
        {suggestions.map((suggestion, index) => (
          <div
            key={suggestion.fullPath}
            ref={index === activeIndex ? activeRef : undefined}
            className={`${styles.item} ${index === activeIndex ? styles.itemActive : ''}`}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => onHover(index)}
          >
            <div className={styles.itemLeft}>
              {getTypeIcon(suggestion.detail)}
              <span className={styles.itemLabel}>
                {suggestion.kind === 'field' ? suggestion.label : suggestion.label}
              </span>
            </div>
            <span className={styles.itemType}>{suggestion.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
