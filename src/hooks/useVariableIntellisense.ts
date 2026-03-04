import { useState, useCallback, useEffect, useRef } from "react";
import { GlobalApiConfig, GlobalApiVariable } from "@/types/global-api-config";

export interface IntellisenseSuggestion {
  label: string;       // Display label (e.g., "changeNo")
  insertText: string;  // Text to insert (e.g., "changeNo")
  detail: string;      // Type info (e.g., "string")
  kind: 'variable' | 'field';
  fullPath: string;    // Full path (e.g., "snowDetails.changeNo")
}

interface UseVariableIntellisenseOptions {
  globalApiConfig: GlobalApiConfig;
  enabled?: boolean;
}

interface IntellisenseState {
  isOpen: boolean;
  suggestions: IntellisenseSuggestion[];
  activeIndex: number;
  position: { top: number; left: number };
  triggerStart: number; // cursor position where {{ started
  query: string;       // current text after {{ or after dot
}

const getDataTypeLabel = (v: GlobalApiVariable) => {
  switch (v.dataType) {
    case 'stringList': return 'string[]';
    case 'list': return 'object[]';
    case 'object': return 'object';
    default: return 'unknown';
  }
};

export const useVariableIntellisense = ({ globalApiConfig, enabled = true }: UseVariableIntellisenseOptions) => {
  const [state, setState] = useState<IntellisenseState>({
    isOpen: false,
    suggestions: [],
    activeIndex: 0,
    position: { top: 0, left: 0 },
    triggerStart: -1,
    query: '',
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, suggestions: [], activeIndex: 0, query: '' }));
  }, []);

  // Get top-level variable suggestions
  const getVariableSuggestions = useCallback((query: string): IntellisenseSuggestion[] => {
    if (!globalApiConfig?.globalVariables) return [];
    return Object.entries(globalApiConfig.globalVariables)
      .filter(([name]) => name.toLowerCase().includes(query.toLowerCase()))
      .map(([name, variable]) => ({
        label: name,
        insertText: name,
        detail: getDataTypeLabel(variable),
        kind: 'variable' as const,
        fullPath: name,
      }));
  }, [globalApiConfig]);

  // Get field suggestions for a specific variable
  const getFieldSuggestions = useCallback((varName: string, fieldQuery: string): IntellisenseSuggestion[] => {
    const variable = globalApiConfig?.globalVariables?.[varName];
    if (!variable?.schema) return [];

    return Object.entries(variable.schema)
      .filter(([path, type]) => {
        // Only show direct child fields or matching nested paths
        const matchesQuery = path.toLowerCase().includes(fieldQuery.toLowerCase());
        // Skip array/object types for leaf selection, but include them for navigation
        return matchesQuery && type !== 'null';
      })
      .map(([path, type]) => ({
        label: path,
        insertText: path,
        detail: type,
        kind: 'field' as const,
        fullPath: `${varName}.${path}`,
      }));
  }, [globalApiConfig]);

  // Parse the text before cursor to determine context
  const parseContext = useCallback((textBeforeCursor: string): { mode: 'none' | 'variable' | 'field'; query: string; varName?: string; fullPrefix: string } => {
    // Find the last {{ that hasn't been closed
    const lastOpen = textBeforeCursor.lastIndexOf('{{');
    if (lastOpen === -1) return { mode: 'none', query: '', fullPrefix: '' };

    const afterOpen = textBeforeCursor.slice(lastOpen + 2);
    
    // Check if there's a closing }} between the {{ and cursor
    if (afterOpen.includes('}}')) return { mode: 'none', query: '', fullPrefix: '' };

    // Check if there's a dot - field mode
    const dotIndex = afterOpen.indexOf('.');
    if (dotIndex !== -1) {
      const varName = afterOpen.slice(0, dotIndex);
      const fieldQuery = afterOpen.slice(dotIndex + 1);
      // Check if varName is a valid global variable
      if (globalApiConfig?.globalVariables?.[varName]) {
        return { mode: 'field', query: fieldQuery, varName, fullPrefix: afterOpen };
      }
    }

    // Variable name mode
    return { mode: 'variable', query: afterOpen, fullPrefix: afterOpen };
  }, [globalApiConfig]);

  // Compute suggestions based on context
  const computeSuggestions = useCallback((textBeforeCursor: string): IntellisenseSuggestion[] => {
    const ctx = parseContext(textBeforeCursor);
    if (ctx.mode === 'none') return [];
    if (ctx.mode === 'variable') return getVariableSuggestions(ctx.query);
    if (ctx.mode === 'field' && ctx.varName) return getFieldSuggestions(ctx.varName, ctx.query);
    return [];
  }, [parseContext, getVariableSuggestions, getFieldSuggestions]);

  // Get caret coordinates for contentEditable
  const getCaretCoordinates = useCallback((): { top: number; left: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(false);
    
    // Insert a temporary span to get position
    const span = document.createElement('span');
    span.textContent = '\u200b'; // zero-width space
    range.insertNode(span);
    const rect = span.getBoundingClientRect();
    const coords = { top: rect.bottom + 4, left: rect.left };
    span.parentNode?.removeChild(span);
    // Restore selection
    selection.removeAllRanges();
    const restoredRange = document.createRange();
    restoredRange.setStart(range.startContainer, range.startOffset);
    restoredRange.collapse(true);
    selection.addRange(restoredRange);
    return coords;
  }, []);

  // Get caret coordinates for textarea
  const getTextareaCaretCoords = useCallback((textarea: HTMLTextAreaElement): { top: number; left: number } => {
    // Create a mirror div
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    const props = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing', 'padding', 'border', 'boxSizing', 'whiteSpace', 'wordWrap', 'overflowWrap'] as const;
    props.forEach(prop => {
      (mirror.style as any)[prop] = style.getPropertyValue(prop.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`));
    });
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.width = `${textarea.offsetWidth}px`;
    mirror.style.height = 'auto';
    mirror.style.overflow = 'hidden';

    const textBefore = textarea.value.substring(0, textarea.selectionStart);
    const textNode = document.createTextNode(textBefore);
    const span = document.createElement('span');
    span.textContent = '.';
    mirror.appendChild(textNode);
    mirror.appendChild(span);
    document.body.appendChild(mirror);

    const textareaRect = textarea.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    
    const top = textareaRect.top + (spanRect.top - mirrorRect.top) - textarea.scrollTop + span.offsetHeight + 4;
    const left = textareaRect.left + (spanRect.left - mirrorRect.left) - textarea.scrollLeft;
    
    document.body.removeChild(mirror);
    return { top, left };
  }, []);

  // Handle text change in contentEditable
  const handleContentEditableInput = useCallback((element: HTMLElement) => {
    if (!enabled) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Get text content before cursor
    const range = selection.getRangeAt(0);
    const preRange = document.createRange();
    preRange.selectNodeContents(element);
    preRange.setEnd(range.startContainer, range.startOffset);
    const textBeforeCursor = preRange.toString();

    const suggestions = computeSuggestions(textBeforeCursor);
    if (suggestions.length > 0) {
      const coords = getCaretCoordinates();
      if (coords) {
        setState(prev => ({
          ...prev,
          isOpen: true,
          suggestions,
          activeIndex: 0,
          position: coords,
          query: textBeforeCursor,
        }));
      }
    } else {
      close();
    }
  }, [enabled, computeSuggestions, getCaretCoordinates, close]);

  // Handle text change in textarea
  const handleTextareaInput = useCallback((textarea: HTMLTextAreaElement) => {
    if (!enabled) return;
    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
    
    const suggestions = computeSuggestions(textBeforeCursor);
    if (suggestions.length > 0) {
      const coords = getTextareaCaretCoords(textarea);
      setState(prev => ({
        ...prev,
        isOpen: true,
        suggestions,
        activeIndex: 0,
        position: coords,
        query: textBeforeCursor,
      }));
    } else {
      close();
    }
  }, [enabled, computeSuggestions, getTextareaCaretCoords, close]);

  // Handle input in a regular input element
  const handleInputElementInput = useCallback((input: HTMLInputElement) => {
    if (!enabled) return;
    const textBeforeCursor = input.value.substring(0, input.selectionStart || 0);
    
    const suggestions = computeSuggestions(textBeforeCursor);
    if (suggestions.length > 0) {
      const rect = input.getBoundingClientRect();
      setState(prev => ({
        ...prev,
        isOpen: true,
        suggestions,
        activeIndex: 0,
        position: { top: rect.bottom + 4, left: rect.left },
        query: textBeforeCursor,
      }));
    } else {
      close();
    }
  }, [enabled, computeSuggestions, close]);

  // Insert selected suggestion into contentEditable
  const insertIntoContentEditable = useCallback((element: HTMLElement, suggestion: IntellisenseSuggestion) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Get text before cursor to find what to replace
    const range = selection.getRangeAt(0);
    const preRange = document.createRange();
    preRange.selectNodeContents(element);
    preRange.setEnd(range.startContainer, range.startOffset);
    const textBeforeCursor = preRange.toString();

    const ctx = parseContext(textBeforeCursor);
    if (ctx.mode === 'none') return;

    // Calculate how many chars to delete (the partial query)
    const charsToDelete = ctx.fullPrefix.length;
    
    // Delete the partial text
    for (let i = 0; i < charsToDelete; i++) {
      document.execCommand('delete', false);
    }

    // Insert the full path with closing braces
    let insertText: string;
    if (suggestion.kind === 'variable') {
      insertText = `${suggestion.insertText}}}`;
    } else {
      // Field: replace entire prefix with varName.fieldPath}}
      const varName = ctx.varName!;
      insertText = `${varName}.${suggestion.insertText}}}`;
    }
    
    document.execCommand('insertText', false, insertText);
  }, [parseContext]);

  // Insert into textarea
  const insertIntoTextarea = useCallback((textarea: HTMLTextAreaElement, suggestion: IntellisenseSuggestion, onChange: (val: string) => void) => {
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const textAfterCursor = textarea.value.substring(cursorPos);

    const ctx = parseContext(textBeforeCursor);
    if (ctx.mode === 'none') return;

    const prefixEnd = cursorPos;
    const prefixStart = prefixEnd - ctx.fullPrefix.length;

    let insertText: string;
    if (suggestion.kind === 'variable') {
      insertText = `${suggestion.insertText}}}`;
    } else {
      const varName = ctx.varName!;
      insertText = `${varName}.${suggestion.insertText}}}`;
    }

    const newValue = textarea.value.substring(0, prefixStart) + insertText + textAfterCursor;
    onChange(newValue);
    
    // Set cursor position after insert
    const newCursorPos = prefixStart + insertText.length;
    requestAnimationFrame(() => {
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
      textarea.focus();
    });
  }, [parseContext]);

  // Insert into regular input
  const insertIntoInput = useCallback((input: HTMLInputElement, suggestion: IntellisenseSuggestion, onChange: (val: string) => void) => {
    const cursorPos = input.selectionStart || 0;
    const textBeforeCursor = input.value.substring(0, cursorPos);
    const textAfterCursor = input.value.substring(cursorPos);

    const ctx = parseContext(textBeforeCursor);
    if (ctx.mode === 'none') return;

    const prefixEnd = cursorPos;
    const prefixStart = prefixEnd - ctx.fullPrefix.length;

    let insertText: string;
    if (suggestion.kind === 'variable') {
      insertText = `${suggestion.insertText}}}`;
    } else {
      const varName = ctx.varName!;
      insertText = `${varName}.${suggestion.insertText}}}`;
    }

    const newValue = input.value.substring(0, prefixStart) + insertText + textAfterCursor;
    onChange(newValue);
    
    const newCursorPos = prefixStart + insertText.length;
    requestAnimationFrame(() => {
      input.selectionStart = newCursorPos;
      input.selectionEnd = newCursorPos;
      input.focus();
    });
  }, [parseContext]);

  // Keyboard navigation handler - returns true if event was handled
  const handleKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent): boolean => {
    const s = stateRef.current;
    
    // Ctrl+Space manual trigger - don't handle here, handle in input handlers
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      return false; // Let the input handler deal with it
    }

    if (!s.isOpen) return false;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        activeIndex: Math.min(prev.activeIndex + 1, prev.suggestions.length - 1),
      }));
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        activeIndex: Math.max(prev.activeIndex - 1, 0),
      }));
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (s.suggestions.length > 0) {
        e.preventDefault();
        return true; // Signal to caller to insert suggestion
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return true;
    }
    return false;
  }, [close]);

  const getActiveSuggestion = useCallback((): IntellisenseSuggestion | null => {
    const s = stateRef.current;
    if (!s.isOpen || s.suggestions.length === 0) return null;
    return s.suggestions[s.activeIndex] || null;
  }, []);

  return {
    isOpen: state.isOpen,
    suggestions: state.suggestions,
    activeIndex: state.activeIndex,
    position: state.position,
    close,
    handleContentEditableInput,
    handleTextareaInput,
    handleInputElementInput,
    insertIntoContentEditable,
    insertIntoTextarea,
    insertIntoInput,
    handleKeyDown,
    getActiveSuggestion,
    setActiveIndex: (index: number) => setState(prev => ({ ...prev, activeIndex: index })),
  };
};
