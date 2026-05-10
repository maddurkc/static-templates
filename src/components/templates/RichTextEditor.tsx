import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Bold, Italic, Underline, Type, Link, Unlink, Strikethrough, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Circle, IndentIncrease, IndentDecrease, HelpCircle } from "lucide-react";
import { useIntellisenseContext } from "@/contexts/IntellisenseContext";
import { useVariableIntellisense } from "@/hooks/useVariableIntellisense";
import { VariableIntellisense } from "./VariableIntellisense";
import { normalizeListPaddingToMargin } from "@/lib/templateUtils";
import styles from "./RichTextEditor.module.scss";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  rows?: number;
  className?: string;
  singleLine?: boolean;
}

const TEXT_COLORS = ['#000000', '#FF0000', '#0066CC', '#008000', '#FF6600', '#800080', '#666666', '#003366'];
const BG_COLORS = ['#FFFFFF', '#FFFF00', '#90EE90', '#ADD8E6', '#FFB6C1', '#E6E6FA', '#F5F5DC', '#F0F0F0'];
const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

export const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Enter content...",
  onFocus,
  rows = 4,
  className = "",
  singleLine = false
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [hasSelection, setHasSelection] = useState(false);
  const savedSelectionRef = useRef<Range | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const isUserEditingRef = useRef(false);
  const lastValueRef = useRef(value);

  // Intellisense - use ref to avoid stale closures in contentEditable handlers
  const { globalApiConfig, enabled: intellisenseEnabled } = useIntellisenseContext();
  const intellisense = useVariableIntellisense({ globalApiConfig, enabled: intellisenseEnabled });
  const intellisenseRef = useRef(intellisense);
  intellisenseRef.current = intellisense;

  // ---- Undo/redo stacks for list indent/outdent (browser undo doesn't capture
  // our manual DOM reparenting). Stacks are cleared on regular typing so the
  // browser's native undo continues to work for normal edits.
  type Snapshot = {
    html: string;
    range: { startPath: number[]; startOffset: number; endPath: number[]; endOffset: number } | null;
  };
  const undoStackRef = useRef<Snapshot[]>([]);
  const redoStackRef = useRef<Snapshot[]>([]);

  const serializeRange = useCallback(() => {
    const root = editorRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0) return null;
    const r = sel.getRangeAt(0);
    if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) return null;
    const path = (n: Node): number[] => {
      const out: number[] = [];
      let cur: Node | null = n;
      while (cur && cur !== root) {
        const parent = cur.parentNode;
        if (!parent) break;
        out.unshift(Array.prototype.indexOf.call(parent.childNodes, cur));
        cur = parent;
      }
      return out;
    };
    return {
      startPath: path(r.startContainer),
      startOffset: r.startOffset,
      endPath: path(r.endContainer),
      endOffset: r.endOffset,
    };
  }, []);

  const restoreSerializedRange = useCallback((s: Snapshot['range']) => {
    const root = editorRef.current;
    if (!s || !root) return;
    const resolve = (path: number[]): Node | null => {
      let cur: Node = root;
      for (const i of path) {
        if (!cur.childNodes[i]) return null;
        cur = cur.childNodes[i];
      }
      return cur;
    };
    const sn = resolve(s.startPath);
    const en = resolve(s.endPath);
    if (!sn || !en) return;
    try {
      const r = document.createRange();
      const maxS = sn.nodeType === Node.TEXT_NODE ? (sn as Text).length : sn.childNodes.length;
      const maxE = en.nodeType === Node.TEXT_NODE ? (en as Text).length : en.childNodes.length;
      r.setStart(sn, Math.min(s.startOffset, maxS));
      r.setEnd(en, Math.min(s.endOffset, maxE));
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    } catch { /* ignore */ }
  }, []);

  const takeSnapshot = useCallback((): Snapshot => ({
    html: editorRef.current?.innerHTML || '',
    range: serializeRange(),
  }), [serializeRange]);

  const pushUndo = useCallback(() => {
    undoStackRef.current.push(takeSnapshot());
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
  }, [takeSnapshot]);

  const applySnapshot = useCallback((snap: Snapshot) => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = snap.html;
    isUserEditingRef.current = true;
    onChange(snap.html);
    requestAnimationFrame(() => restoreSerializedRange(snap.range));
  }, [onChange, restoreSerializedRange]);

  const performUndo = useCallback((): boolean => {
    if (undoStackRef.current.length === 0) return false;
    redoStackRef.current.push(takeSnapshot());
    const prev = undoStackRef.current.pop()!;
    applySnapshot(prev);
    return true;
  }, [takeSnapshot, applySnapshot]);

  const performRedo = useCallback((): boolean => {
    if (redoStackRef.current.length === 0) return false;
    undoStackRef.current.push(takeSnapshot());
    const next = redoStackRef.current.pop()!;
    applySnapshot(next);
    return true;
  }, [takeSnapshot, applySnapshot]);

  // Initialize content on mount and update if value changed externally
  useEffect(() => {
    // Skip if user is actively editing
    if (isUserEditingRef.current) {
      isUserEditingRef.current = false;
      lastValueRef.current = value;
      return;
    }
    
    // Update if the value changed from external source OR if this is the first render
    if (editorRef.current && (value !== lastValueRef.current || editorRef.current.innerHTML === '')) {
      const normalized = normalizeListPaddingToMargin(value || '');
      editorRef.current.innerHTML = normalized;
      lastValueRef.current = value;
      if (normalized !== value) {
        isUserEditingRef.current = true;
        onChange(normalized);
      }
    }
  }, [value]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
  }, []);

  const findLinkAncestor = useCallback((node: Node | null): HTMLAnchorElement | null => {
    while (node && node !== editorRef.current) {
      if (node.nodeName === 'A') {
        return node as HTMLAnchorElement;
      }
      node = node.parentNode;
    }
    return null;
  }, []);

  const checkIfLink = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const linkEl = findLinkAncestor(range.commonAncestorContainer);
      if (linkEl) {
        setIsLink(true);
        setLinkUrl(linkEl.href || '');
        return true;
      }
    }
    setIsLink(false);
    setLinkUrl('');
    return false;
  }, [findLinkAncestor]);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim() === "") {
      setShowToolbar(false);
      setHasSelection(false);
      return;
    }

    // Check if selection is within our editor
    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) {
      setShowToolbar(false);
      setHasSelection(false);
      return;
    }

    // Save selection for later restoration
    saveSelection();
    setHasSelection(true);
    checkIfLink();

    // Position toolbar above selection using fixed positioning
    const rect = range.getBoundingClientRect();
    const toolbarWidth = 380; // Approximate toolbar width
    const toolbarHeight = 45;
    
    // Calculate left position, keeping toolbar on screen
    let left = rect.left + rect.width / 2 - toolbarWidth / 2;
    const minLeft = 10;
    const maxLeft = window.innerWidth - toolbarWidth - 10;
    left = Math.max(minLeft, Math.min(left, maxLeft));
    
    // Calculate top position
    let top = rect.top - toolbarHeight - 8;
    if (top < 10) {
      top = rect.bottom + 8; // Show below if not enough space above
    }
    
    setToolbarPosition({ top, left });
    setShowToolbar(true);
  }, [saveSelection, checkIfLink]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const applyStyle = useCallback((command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    // Keep toolbar open and refocus
    editorRef.current?.focus();
  }, [onChange, restoreSelection]);

  const applyFontSize = useCallback((size: string) => {
    restoreSelection();
    // Use a span with inline style for font size
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size;
      range.surroundContents(span);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }
    editorRef.current?.focus();
  }, [onChange, restoreSelection]);

  const applyColor = useCallback((color: string | null, isBackground: boolean) => {
    restoreSelection();
    if (isBackground) {
      if (color === null) {
        // Remove background color by applying transparent
        document.execCommand('hiliteColor', false, 'transparent');
      } else {
        document.execCommand('hiliteColor', false, color);
      }
    } else {
      document.execCommand('foreColor', false, color || '#000000');
    }
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  }, [onChange, restoreSelection]);

  const applyAlignment = useCallback((alignment: 'left' | 'center' | 'right') => {
    restoreSelection();
    const command = alignment === 'left' ? 'justifyLeft' : alignment === 'center' ? 'justifyCenter' : 'justifyRight';
    document.execCommand(command, false);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  }, [onChange, restoreSelection]);

  const applyList = useCallback((listType: 'bullet' | 'number', styleType?: string) => {
    restoreSelection();
    
    if (listType === 'bullet') {
      document.execCommand('insertUnorderedList', false);
      // Apply list-style-type after creating the list
      if (editorRef.current && styleType) {
        const lists = editorRef.current.querySelectorAll('ul');
        lists.forEach(list => {
          list.style.listStyleType = styleType;
          list.style.marginLeft = '20px';
        });
      }
    } else {
      document.execCommand('insertOrderedList', false);
      // Apply list-style-type after creating the list
      if (editorRef.current && styleType) {
        const lists = editorRef.current.querySelectorAll('ol');
        lists.forEach(list => {
          list.style.listStyleType = styleType;
          list.style.marginLeft = '20px';
        });
      }
    }
    
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  }, [onChange, restoreSelection]);

  // Find the nearest list item ancestor of a node within the editor
  const findListItemAncestor = useCallback((node: Node | null): HTMLLIElement | null => {
    while (node && node !== editorRef.current) {
      if ((node as HTMLElement).nodeName === 'LI') return node as HTMLLIElement;
      node = node.parentNode;
    }
    return null;
  }, []);

  // Caret-aware resolver: when caret sits on UL/OL/LI directly (empty trailing
  // items, after <br>, post-Enter), walk to the actual LI at that offset.
  const resolveCaretToLi = useCallback((node: Node | null, offset: number): Node | null => {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'UL' || el.tagName === 'OL') {
        const kids = el.childNodes;
        if (kids.length === 0) return node;
        const idx = Math.min(Math.max(offset, 0), kids.length - 1);
        for (let i = idx; i < kids.length; i++) {
          if ((kids[i] as HTMLElement).nodeName === 'LI') return kids[i];
        }
        for (let i = idx - 1; i >= 0; i--) {
          if ((kids[i] as HTMLElement).nodeName === 'LI') return kids[i];
        }
      }
      if (el.tagName === 'LI') return el;
    }
    return node;
  }, []);

  // Convert blockquote (browser default for indent) to Outlook-friendly margin-left wrapper
  const normalizeIndentForOutlook = useCallback(() => {
    if (!editorRef.current) return;
    const blockquotes = editorRef.current.querySelectorAll('blockquote');
    blockquotes.forEach((bq) => {
      (bq as HTMLElement).style.marginLeft = '40px';
      (bq as HTMLElement).style.marginRight = '0';
      (bq as HTMLElement).style.borderLeft = 'none';
    });
    // Ensure nested ul/ol get inline margin (Outlook needs explicit)
    const nestedLists = editorRef.current.querySelectorAll('ul ul, ul ol, ol ul, ol ol');
    nestedLists.forEach((l) => {
      (l as HTMLElement).style.marginLeft = '20px';
    });
  }, []);

  // Normalize every UL/OL in the editor so siblings share the same type and
  // each nesting level uses the Outlook-style bullet/number cycle.
  const normalizeListStyles = useCallback(() => {
    if (!editorRef.current) return;
    const lists = editorRef.current.querySelectorAll('ul, ol');
    lists.forEach((list) => {
      const el = list as HTMLElement;
      const depth = getListDepth(el); // 0 = top-level
      el.style.listStyleType = styleForDepth(el.tagName, depth);
      if (depth > 0) {
        el.style.marginLeft = '20px';
      }
      Array.from(el.children).forEach((child) => {
        if (child.tagName !== 'LI') return;
        const li = child as HTMLElement;
        // Auto-detect wrapper LIs whose only child is a nested UL/OL
        const onlyChild = li.children.length === 1 ? li.children[0] : null;
        const isEmptyText = !(li.textContent || '').replace(/[\s\u00a0]/g, '').length;
        if (onlyChild && (onlyChild.tagName === 'UL' || onlyChild.tagName === 'OL') && isEmptyText) {
          li.dataset.wrapper = '1';
          li.style.listStyleType = 'none';
        } else if (li.dataset.wrapper !== '1') {
          li.style.listStyleType = '';
        }
      });
    });
  }, []);

  // Custom list-aware indent: nest selected LI(s) inside a sublist of the SAME
  // type (ul/ol) so the bullet/number style is preserved instead of becoming a
  // blockquote (which is what document.execCommand('indent') does to a first LI).
  // Outlook-style bullet/number cycling per nesting depth
  const UL_CYCLE = ['disc', 'circle', 'square'];
  const OL_CYCLE = ['decimal', 'lower-alpha', 'lower-roman'];
  const getListDepth = (el: HTMLElement): number => {
    let depth = 0;
    let cur: HTMLElement | null = el.parentElement;
    while (cur && cur !== editorRef.current) {
      if (cur.tagName === 'UL' || cur.tagName === 'OL') depth++;
      cur = cur.parentElement;
    }
    return depth;
  };
  const styleForDepth = (tag: string, depth: number): string => {
    const cycle = tag === 'OL' ? OL_CYCLE : UL_CYCLE;
    return cycle[depth % cycle.length];
  };

  const indentListItems = useCallback((items: HTMLLIElement[]): boolean => {
    if (items.length === 0) return false;
    const first = items[0];
    const parentList = first.parentElement as HTMLElement | null;
    if (!parentList || (parentList.tagName !== 'UL' && parentList.tagName !== 'OL')) return false;
    const prevSibling = first.previousElementSibling as HTMLElement | null;
    const siblingSublist = prevSibling && prevSibling.tagName === parentList.tagName ? prevSibling : null;
    const prev = (siblingSublist ? siblingSublist.previousElementSibling : prevSibling) as HTMLElement | null;

    // No preceding LI to nest under (e.g. caret is on the first item).
    // Outlook still indents and cycles the bullet style — wrap the selected
    // items in a new nested sublist of the SAME tag, hosted in a synthesized
    // LI inserted at their original position.
    if (!prev || prev.tagName !== 'LI') {
      const tag = parentList.tagName.toLowerCase();
      const newDepth = getListDepth(parentList) + 1;
      const wrapperLi = document.createElement('li');
      wrapperLi.dataset.wrapper = '1';
      wrapperLi.style.listStyleType = 'none'; // hide marker for the wrapper
      const sublist = document.createElement(tag);
      sublist.style.listStyleType = styleForDepth(parentList.tagName, newDepth);
      sublist.style.marginLeft = '20px';
      parentList.insertBefore(wrapperLi, first);
      wrapperLi.appendChild(sublist);
      items.forEach((li) => {
        (li as HTMLElement).style.listStyleType = '';
        sublist.appendChild(li);
      });
      return true;
    }

    let sublist = siblingSublist || (prev.lastElementChild as HTMLElement | null);
    if (!sublist || sublist.tagName !== parentList.tagName) {
      sublist = document.createElement(parentList.tagName.toLowerCase());
      // Outlook-style: each nested level uses next style in the cycle
      const newDepth = getListDepth(parentList) + 1;
      sublist.style.listStyleType = styleForDepth(parentList.tagName, newDepth);
      sublist.style.marginLeft = '20px';
      prev.appendChild(sublist);
    } else if (sublist.parentElement !== prev) {
      prev.appendChild(sublist);
    }
    items.forEach((li) => {
      // Clear any per-LI list-style override so the sublist style takes effect
      (li as HTMLElement).style.listStyleType = '';
      sublist!.appendChild(li);
    });
    return true;
  }, []);

  const outdentListItems = useCallback((items: HTMLLIElement[]): boolean => {
    if (items.length === 0) return false;
    const first = items[0];
    const parentList = first.parentElement as HTMLElement | null;
    if (!parentList || (parentList.tagName !== 'UL' && parentList.tagName !== 'OL')) return false;
    const grandparent = parentList.parentElement;
    if (!grandparent) return false;

    // Nested sublist inside an LI -> promote items to be siblings of that outer LI
    if (grandparent.tagName === 'LI') {
      const outerLi = grandparent as HTMLLIElement;
      const outerList = outerLi.parentElement;
      if (!outerList) return false;
      items.slice().reverse().forEach((li) => {
        outerList.insertBefore(li, outerLi.nextSibling);
      });
      if (parentList.children.length === 0) parentList.remove();
      return true;
    }

    // Top-level list -> unwrap items as paragraphs after the list
    items.forEach((li) => {
      const p = document.createElement('div');
      p.innerHTML = li.innerHTML || '<br>';
      parentList.parentElement!.insertBefore(p, parentList.nextSibling);
      li.remove();
    });
    if (parentList.children.length === 0) parentList.remove();
    return true;
  }, []);

  const getSelectedListItems = useCallback((): HTMLLIElement[] => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return [];
    const range = sel.getRangeAt(0);

    const startLi =
      findListItemAncestor(resolveCaretToLi(range.startContainer, range.startOffset)) ||
      findListItemAncestor(sel.anchorNode);
    let endLi =
      findListItemAncestor(resolveCaretToLi(range.endContainer, range.endOffset)) ||
      findListItemAncestor(sel.focusNode);

    // Boundary fix: if the selection ends right at offset 0 of the very first
    // node inside an LI, the user didn't actually intend to include that LI
    // (selection just grazed it). Walk back to the previous LI.
    if (
      endLi &&
      startLi !== endLi &&
      range.endOffset === 0
    ) {
      // Determine if endContainer is at the leading edge of endLi
      let n: Node | null = range.endContainer;
      let atStart = true;
      while (n && n !== endLi) {
        const parent: Node | null = n.parentNode;
        if (parent && parent.firstChild !== n) { atStart = false; break; }
        n = parent;
      }
      if (atStart) {
        const prev = endLi.previousElementSibling as HTMLLIElement | null;
        if (prev && prev.tagName === 'LI') endLi = prev;
        else endLi = startLi; // collapse to startLi only
      }
    }

    if (!startLi) return [];
    if (!endLi || startLi === endLi) return [startLi];
    if (startLi.parentElement === endLi.parentElement) {
      const items: HTMLLIElement[] = [];
      let cur: Element | null = startLi;
      while (cur) {
        if (cur.tagName === 'LI') items.push(cur as HTMLLIElement);
        if (cur === endLi) break;
        cur = cur.nextElementSibling;
      }
      return items;
    }
    return [startLi];
  }, [findListItemAncestor, resolveCaretToLi]);

  const applyIndent = useCallback(() => {
    pushUndo();
    restoreSelection();
    const items = getSelectedListItems();
    if (items.length > 0) {
      indentListItems(items);
    } else {
      document.execCommand('indent', false);
    }
    normalizeIndentForOutlook();
    normalizeListStyles();
    isUserEditingRef.current = true;
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    editorRef.current?.focus();
  }, [onChange, restoreSelection, normalizeIndentForOutlook, normalizeListStyles, getSelectedListItems, indentListItems, pushUndo]);

  const applyOutdent = useCallback(() => {
    pushUndo();
    restoreSelection();
    const items = getSelectedListItems();
    if (items.length > 0) {
      outdentListItems(items);
    } else {
      document.execCommand('outdent', false);
    }
    normalizeIndentForOutlook();
    normalizeListStyles();
    isUserEditingRef.current = true;
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    editorRef.current?.focus();
  }, [onChange, restoreSelection, normalizeIndentForOutlook, normalizeListStyles, getSelectedListItems, outdentListItems, pushUndo]);

  const applyLink = useCallback(() => {
    if (!linkUrl.trim()) return;
    
    restoreSelection();
    const url = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') 
      ? linkUrl 
      : `https://${linkUrl}`;
    
    // First apply the link color while text is still selected
    document.execCommand('foreColor', false, '#0066CC');
    
    // Then create the link
    document.execCommand('createLink', false, url);
    
    // Add target="_blank" to the newly created link
    if (editorRef.current) {
      const links = editorRef.current.querySelectorAll(`a[href="${url}"]`);
      links.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });
      onChange(editorRef.current.innerHTML);
    }
    setLinkUrl('');
    setShowLinkDialog(false);
    editorRef.current?.focus();
  }, [linkUrl, onChange, restoreSelection]);

  const removeLink = useCallback(() => {
    restoreSelection();
    document.execCommand('unlink', false);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    setIsLink(false);
    setLinkUrl('');
    editorRef.current?.focus();
  }, [onChange, restoreSelection]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isUserEditingRef.current = true;
      // Regular typing supersedes our list-op undo stack — clear it so the
      // browser's native undo handles subsequent typing.
      undoStackRef.current = [];
      redoStackRef.current = [];
      onChange(editorRef.current.innerHTML);
      // Trigger intellisense via ref to avoid stale closures
      intellisenseRef.current.handleContentEditableInput(editorRef.current);
    }
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Intellisense keyboard handling
    const handled = intellisenseRef.current.handleKeyDown(e);
    if (handled) {
      // If Enter/Tab was pressed on an active suggestion, insert it
      if ((e.key === 'Enter' || e.key === 'Tab') && editorRef.current) {
        const suggestion = intellisenseRef.current.getActiveSuggestion();
        if (suggestion) {
          intellisenseRef.current.insertIntoContentEditable(editorRef.current, suggestion);
          intellisenseRef.current.close();
          if (editorRef.current) {
            isUserEditingRef.current = true;
            onChange(editorRef.current.innerHTML);
          }
        }
      }
      return;
    }

    // Ctrl+Space manual trigger
    if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      e.preventDefault();
      if (editorRef.current) {
        intellisenseRef.current.handleContentEditableInput(editorRef.current);
      }
      return;
    }

    // Undo / Redo for our list-indent/outdent operations.
    // We only intercept when our stacks have entries; otherwise let the browser
    // handle native undo for normal typing.
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const isUndo = e.key === 'z' && !e.shiftKey;
      const isRedo = (e.key === 'y') || (e.key === 'z' && e.shiftKey);
      if (isUndo && undoStackRef.current.length > 0) {
        e.preventDefault();
        performUndo();
        return;
      }
      if (isRedo && redoStackRef.current.length > 0) {
        e.preventDefault();
        performRedo();
        return;
      }
    }

    // Prevent Enter key in single line mode
    if (singleLine && e.key === 'Enter') {
      e.preventDefault();
      return;
    }

    // Tab / Shift+Tab — indent or nest list
    if (e.key === 'Tab') {
      e.preventDefault();
      // Stop Radix Popover/Dialog FocusScope from stealing the Tab to move focus
      e.stopPropagation();
      const sel = window.getSelection();
      const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
      // Resolve caret robustly: handle UL/OL/LI direct caret + anchor fallback.
      const resolvedStart: Node | null = range
        ? resolveCaretToLi(range.startContainer, range.startOffset)
        : null;
      const liFromRange = resolvedStart ? findListItemAncestor(resolvedStart) : null;
      const liFromAnchor = sel ? findListItemAncestor(sel.anchorNode) : null;
      const liFromFocus = sel ? findListItemAncestor(sel.focusNode) : null;
      const inList = !!(liFromRange || liFromAnchor || liFromFocus);

      // Snapshot for undo before mutating (only for list ops; plain insert is captured by browser)
      if (inList) pushUndo();

      // Snapshot caret so we can restore it after DOM reparenting
      let caretNode: Node | null = null;
      let caretOffset = 0;
      if (range) {
        caretNode = range.startContainer;
        caretOffset = range.startOffset;
      }

      if (inList) {
        let items = getSelectedListItems();
        if (items.length === 0) {
          const fallback = liFromRange || liFromAnchor || liFromFocus;
          if (fallback) items = [fallback];
        }
        if (e.shiftKey) outdentListItems(items);
        else indentListItems(items);
        normalizeIndentForOutlook();
        normalizeListStyles();
      } else if (e.shiftKey) {
        document.execCommand('outdent', false);
        normalizeIndentForOutlook();
        normalizeListStyles();
      } else {
        // Insert non-breaking spaces so Outlook preserves indentation
        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
        caretNode = null; // execCommand already moved caret correctly
      }

      // Restore caret to its original text node/offset (nodes were just reparented)
      if (caretNode && editorRef.current?.contains(caretNode)) {
        try {
          const newRange = document.createRange();
          const maxOffset = caretNode.nodeType === Node.TEXT_NODE
            ? (caretNode as Text).length
            : caretNode.childNodes.length;
          newRange.setStart(caretNode, Math.min(caretOffset, maxOffset));
          newRange.collapse(true);
          const s = window.getSelection();
          if (s) {
            s.removeAllRanges();
            s.addRange(newRange);
          }
          savedSelectionRef.current = newRange.cloneRange();
        } catch {
          /* ignore */
        }
      }

      // Mark as user-edit so the value->innerHTML sync effect doesn't wipe the DOM/caret
      isUserEditingRef.current = true;
      if (editorRef.current) onChange(editorRef.current.innerHTML);
      return;
    }
    
    // Multi-line Enter handling
    if (!singleLine && e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      const node = sel && sel.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
      const li = findListItemAncestor(node);

      if (li) {
        // Inside a list item: if the LI is empty, exit the list (Outlook behavior).
        // Otherwise let the browser create a new LI of the same type.
        const isEmpty = li.textContent?.replace(/\u00A0/g, '').trim() === '';
        if (isEmpty) {
          e.preventDefault();
          // Outdent repeatedly until we exit the list, then insert a paragraph break
          const listEl = li.closest('ul, ol');
          document.execCommand('outdent', false);
          // If still inside a list (was nested), let outdent handle it; otherwise insert a break
          const stillInList = !!findListItemAncestor(window.getSelection()?.getRangeAt(0)?.commonAncestorContainer || null);
          if (!stillInList) {
            // Ensure caret is on a fresh line outside the list
            document.execCommand('insertHTML', false, '<br>');
          }
          normalizeIndentForOutlook();
          if (editorRef.current) onChange(editorRef.current.innerHTML);
          return;
        }
        // Non-empty LI — let the browser handle Enter (creates a new LI)
        return;
      }

      // Not in a list — keep existing <br><br> behavior
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br><br>');
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
      return;
    }
    
    // Handle bold/italic/underline shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        applyStyle('bold');
      } else if (e.key === 'i') {
        e.preventDefault();
        applyStyle('italic');
      } else if (e.key === 'u') {
        e.preventDefault();
        applyStyle('underline');
      } else if (e.key === 'k') {
        e.preventDefault();
        saveSelection();
        setShowLinkDialog(true);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (singleLine) {
      const processedText = text.replace(/[\r\n]+/g, ' ');
      document.execCommand('insertText', false, processedText);
      if (editorRef.current) onChange(editorRef.current.innerHTML);
      return;
    }

    // If we have rich HTML, sanitize/normalize lists before inserting so mixed
    // UL/OL styles get the Outlook depth cycle and Word/Office gunk is stripped.
    if (html && /<[a-z][\s\S]*>/i.test(html)) {
      // Strip MS Office conditional comments + meta + style blocks
      const cleaned = html
        .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<\/?(meta|link|style|script|o:p)[^>]*>/gi, '')
        .replace(/\sclass="[^"]*Mso[^"]*"/gi, '')
        .replace(/\smso-[a-z-]+:[^;"']+;?/gi, '');

      const tmp = document.createElement('div');
      tmp.innerHTML = cleaned;

      // Walk every UL/OL inside the pasted fragment and assign list-style-type
      // per nesting depth using the Outlook cycle (UL: disc/circle/square,
      // OL: decimal/lower-alpha/lower-roman). Also clear per-LI overrides.
      const depthOf = (el: HTMLElement): number => {
        let d = 0;
        let cur: HTMLElement | null = el.parentElement;
        while (cur && cur !== tmp) {
          if (cur.tagName === 'UL' || cur.tagName === 'OL') d++;
          cur = cur.parentElement;
        }
        return d;
      };
      tmp.querySelectorAll('ul, ol').forEach((list) => {
        const el = list as HTMLElement;
        const depth = depthOf(el);
        el.style.listStyleType = styleForDepth(el.tagName, depth);
        if (depth > 0) {
          el.style.marginLeft = '20px';
        }
        Array.from(el.children).forEach((c) => {
          if (c.tagName === 'LI') (c as HTMLElement).style.listStyleType = '';
        });
      });

      // Snapshot pre-paste so this can be undone
      pushUndo();
      document.execCommand('insertHTML', false, tmp.innerHTML);
    } else {
      const htmlContent = text.replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, htmlContent);
    }

    if (editorRef.current) {
      // Re-normalize entire editor in case the paste merged with existing lists
      normalizeListStyles();
      isUserEditingRef.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const linkEl = findLinkAncestor(target);
    if (linkEl) {
      e.preventDefault();
      e.stopPropagation();
      
      // Position toolbar first
      const rect = linkEl.getBoundingClientRect();
      const editorRect = editorRef.current?.getBoundingClientRect();
      if (editorRect) {
        setToolbarPosition({
          top: rect.top - editorRect.top - 45,
          left: rect.left - editorRect.left + rect.width / 2
        });
      }
      
      // Select the entire link text
      const range = document.createRange();
      range.selectNodeContents(linkEl);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Save selection and set all states together
      savedSelectionRef.current = range.cloneRange();
      
      // Use setTimeout to ensure DOM selection is complete before showing dialog
      setTimeout(() => {
        setIsLink(true);
        setLinkUrl(linkEl.href || '');
        setHasSelection(true);
        setShowLinkDialog(true);
        setShowToolbar(true);
      }, 0);
    }
  }, [findLinkAncestor]);

  const minHeight = singleLine ? 32 : rows * 24;

  return (
    <div className={`${styles.editorContainer} ${className}`}>
      {showToolbar && hasSelection && (
        <div 
          className={styles.floatingToolbar}
          data-walkthrough="text-toolbar"
          style={{
            top: toolbarPosition.top,
            left: toolbarPosition.left,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => applyStyle('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => applyStyle('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => applyStyle('underline')}
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => applyStyle('strikeThrough')}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>
          
          <div className={styles.separator} />
          
          {/* Alignment */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} title="Alignment">
                <AlignLeft className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" onMouseDown={(e) => e.preventDefault()}>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyAlignment('left')} title="Align Left">
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyAlignment('center')} title="Align Center">
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => applyAlignment('right')} title="Align Right">
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Bullet List */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} title="Bullet List">
                <List className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" onMouseDown={(e) => e.preventDefault()}>
              <Label className="text-xs mb-2 block">Bullet Style</Label>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 flex flex-col items-center justify-center" 
                  onClick={() => applyList('bullet', 'disc')} 
                  title="Disc (•)"
                >
                  <span className="text-lg leading-none">•</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 flex flex-col items-center justify-center" 
                  onClick={() => applyList('bullet', 'circle')} 
                  title="Circle (○)"
                >
                  <span className="text-lg leading-none">○</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 flex flex-col items-center justify-center" 
                  onClick={() => applyList('bullet', 'square')} 
                  title="Square (■)"
                >
                  <span className="text-lg leading-none">■</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Number List */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }} title="Numbered List">
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" onMouseDown={(e) => e.preventDefault()}>
              <Label className="text-xs mb-2 block">Number Style</Label>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-xs" 
                  onClick={() => applyList('number', 'decimal')} 
                  title="1, 2, 3..."
                >
                  1.
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-xs" 
                  onClick={() => applyList('number', 'lower-alpha')} 
                  title="a, b, c..."
                >
                  a)
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-xs" 
                  onClick={() => applyList('number', 'upper-alpha')} 
                  title="A, B, C..."
                >
                  A)
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-xs" 
                  onClick={() => applyList('number', 'lower-roman')} 
                  title="i, ii, iii..."
                >
                  i.
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Indent / Outdent */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={() => applyOutdent()}
            title="Decrease indent (Shift+Tab)"
          >
            <IndentDecrease className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
            onClick={() => applyIndent()}
            title="Increase indent (Tab)"
          >
            <IndentIncrease className="h-3.5 w-3.5" />
          </Button>

          {/* Keyboard help */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}
                title="Keyboard shortcuts"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 text-xs" onMouseDown={(e) => e.preventDefault()}>
              <Label className="text-xs font-semibold mb-2 block">Lists & nesting</Label>
              <div className="space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Inside a list item</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Tab</kbd>
                </div>
                <div className="text-[11px] text-muted-foreground -mt-1 mb-1">
                  Nests one level deeper. Bullet/number style cycles per depth (• ○ ■ / 1 a i).
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Inside a list item</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Shift + Tab</kbd>
                </div>
                <div className="text-[11px] text-muted-foreground -mt-1 mb-1">
                  Outdents one level. At top level, exits the list as a paragraph.
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">On an empty list item</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Enter</kbd>
                </div>
                <div className="text-[11px] text-muted-foreground -mt-1 mb-1">
                  Outdents one level (twice from top-level exits the list — Outlook behavior).
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Undo / Redo indent</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Ctrl+Z / Ctrl+Y</kbd>
                </div>
              </div>
              <Label className="text-xs font-semibold mt-3 mb-2 block">Formatting</Label>
              <div className="space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Bold / Italic / Underline</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Ctrl+B/I/U</kbd>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Add link</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Ctrl+K</kbd>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className={styles.separator} />
          
          {/* Link Button */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${isLink ? 'text-primary' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
            }}
            onClick={() => {
              setShowLinkDialog(true);
            }}
            title={isLink ? "Edit Link (Ctrl+K)" : "Add Link (Ctrl+K)"}
          >
            <Link className="h-3.5 w-3.5" />
          </Button>
          
          {/* Unlink Button - only show when link is selected */}
          {isLink && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                removeLink();
              }}
              title="Remove Link"
            >
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          )}
          
          <div className={styles.separator} />
          
          {/* Font Size */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}>
                <Type className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" onMouseDown={(e) => e.preventDefault()}>
              <Label className="text-xs mb-1 block">Font Size</Label>
              <div className="flex flex-wrap gap-1 max-w-[140px]">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    className="px-2 py-1 text-xs rounded border border-border hover:bg-muted transition-colors"
                    onClick={() => applyFontSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Text Color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}>
                A
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" onMouseDown={(e) => e.preventDefault()}>
              <Label className="text-xs mb-1 block">Text Color</Label>
              <div className="flex flex-wrap gap-1 max-w-[160px]">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => applyColor(color, false)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Background Color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onMouseDown={(e) => { e.preventDefault(); saveSelection(); }}>
                <span className="bg-yellow-200 px-1">A</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" onMouseDown={(e) => e.preventDefault()}>
              <Label className="text-xs mb-1 block">Background</Label>
              <div className="flex flex-wrap gap-1 max-w-[160px]">
                {/* None/Remove background option */}
                <button
                  className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform relative bg-white"
                  onClick={() => applyColor(null, true)}
                  title="Remove Background"
                >
                  <span className="absolute inset-0 flex items-center justify-center text-destructive text-xs font-bold">✕</span>
                </button>
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => applyColor(color, true)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      
      <div
        ref={editorRef}
        contentEditable
        className={`${styles.editor} ${singleLine ? styles.singleLine : ''}`}
        style={{ minHeight: `${minHeight}px` }}
        onInput={handleInput}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={handleLinkClick}
        data-placeholder={placeholder}
        data-walkthrough="variable-input"
        suppressContentEditableWarning
      />

      {/* Variable Intellisense */}
      <VariableIntellisense
        isOpen={intellisense.isOpen}
        suggestions={intellisense.suggestions}
        activeIndex={intellisense.activeIndex}
        position={intellisense.position}
        onSelect={(suggestion) => {
          if (editorRef.current) {
            intellisense.insertIntoContentEditable(editorRef.current, suggestion);
            intellisense.close();
            isUserEditingRef.current = true;
            onChange(editorRef.current.innerHTML);
          }
        }}
        onHover={intellisense.setActiveIndex}
        onClose={intellisense.close}
      />
      
      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={(open) => {
        if (!open) {
          setLinkUrl('');
        }
        setShowLinkDialog(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isLink ? 'Edit Hyperlink' : 'Add Hyperlink'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="link-url" className="text-sm font-medium mb-2 block">
              URL
            </Label>
            <Input
              id="link-url"
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyLink();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            {isLink && (
              <Button
                variant="destructive"
                onClick={() => {
                  removeLink();
                  setShowLinkDialog(false);
                }}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Remove Link
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkDialog(false);
                setLinkUrl('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={applyLink} disabled={!linkUrl.trim()}>
              {isLink ? 'Update' : 'Add'} Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

