import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bold, Italic, Underline, Type, Link, Unlink, Strikethrough, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
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
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [hasSelection, setHasSelection] = useState(false);
  const savedSelectionRef = useRef<Range | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const isToolbarInteractionRef = useRef(false);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
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
    // Skip if we're interacting with toolbar
    if (isToolbarInteractionRef.current) {
      return;
    }
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim() === "") {
      setShowToolbar(false);
      setHasSelection(false);
      setShowLinkInput(false);
      return;
    }

    // Check if selection is within our editor or toolbar
    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) {
      // Don't hide if interacting with toolbar
      if (toolbarRef.current?.contains(document.activeElement)) {
        return;
      }
      setShowToolbar(false);
      setHasSelection(false);
      setShowLinkInput(false);
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
      
      // Extract contents and append to span to avoid issues with surroundContents
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      
      // Re-select the content inside the span
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      // Save the new selection
      savedSelectionRef.current = newRange.cloneRange();
      
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }
    editorRef.current?.focus();
  }, [onChange, restoreSelection]);

  const applyColor = useCallback((color: string, isBackground: boolean) => {
    restoreSelection();
    if (isBackground) {
      document.execCommand('hiliteColor', false, color);
    } else {
      document.execCommand('foreColor', false, color);
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

  const applyLink = useCallback(() => {
    if (!linkUrl.trim()) return;
    
    restoreSelection();
    const url = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') 
      ? linkUrl 
      : `https://${linkUrl}`;
    document.execCommand('createLink', false, url);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    setLinkUrl('');
    setShowLinkInput(false);
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
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent Enter key in single line mode
    if (singleLine && e.key === 'Enter') {
      e.preventDefault();
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
        setShowLinkInput(true);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    // For single line, remove newlines
    const processedText = singleLine ? text.replace(/[\r\n]+/g, ' ') : text;
    document.execCommand('insertText', false, processedText);
    if (editorRef.current) {
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
      
      // Use setTimeout to ensure DOM selection is complete before showing toolbar
      setTimeout(() => {
        setIsLink(true);
        setLinkUrl(linkEl.href || '');
        setHasSelection(true);
        setShowLinkInput(true);
        setShowToolbar(true);
      }, 0);
    }
  }, [findLinkAncestor]);

  const minHeight = singleLine ? 32 : rows * 24;

  return (
    <div className={`${styles.editorContainer} ${className}`}>
      {showToolbar && hasSelection && (
        <div 
          ref={toolbarRef}
          className={styles.floatingToolbar}
          style={{
            top: toolbarPosition.top,
            left: toolbarPosition.left,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            isToolbarInteractionRef.current = true;
          }}
          onMouseUp={() => {
            // Reset after a short delay to allow click handlers to execute
            setTimeout(() => {
              isToolbarInteractionRef.current = false;
            }, 100);
          }}
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
          
          <div className={styles.separator} />
          
          {/* Link Button */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${isLink ? 'text-primary' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Link button clicked, showLinkInput:', showLinkInput);
              saveSelection();
              setShowLinkInput(prev => {
                console.log('Setting showLinkInput to:', !prev);
                return !prev;
              });
            }}
            title={isLink ? "Edit Link (Ctrl+K)" : "Add Link (Ctrl+K)"}
          >
            <Link className="h-3.5 w-3.5" />
          </Button>
          
          {/* Link Input Panel - inline in toolbar */}
          {showLinkInput && (
            <div 
              className="flex items-center gap-2 ml-1 pl-2 border-l border-border"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  } else if (e.key === 'Escape') {
                    setShowLinkInput(false);
                    setLinkUrl('');
                  }
                }}
                className="h-6 w-40 text-xs"
                autoFocus
              />
              <Button
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={applyLink}
              >
                {isLink ? 'Update' : 'Add'}
              </Button>
              {isLink && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    removeLink();
                    setShowLinkInput(false);
                  }}
                >
                  <Unlink className="h-3 w-3" />
                </Button>
              )}
            </div>
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
        suppressContentEditableWarning
      />
    </div>
  );
};

