import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  IndentIncrease,
  IndentDecrease,
  Type,
  Highlighter,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onInsertPlaceholder?: (name: string, label?: string) => void;
}

export const RichTextEditor = ({ content, onChange, onInsertPlaceholder }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showPlaceholderDialog, setShowPlaceholderDialog] = useState(false);
  const [placeholderName, setPlaceholderName] = useState('');
  const [placeholderLabel, setPlaceholderLabel] = useState('');
  const [currentFormat, setCurrentFormat] = useState<string>('p');

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const formatBlock = (tag: string) => {
    execCommand('formatBlock', tag);
    setCurrentFormat(tag);
  };

  const insertTable = () => {
    const table = document.createElement('table');
    table.style.border = '1px solid #ddd';
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.marginTop = '10px';
    table.style.marginBottom = '10px';

    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let i = 0; i < 3; i++) {
      const th = document.createElement('th');
      th.style.border = '1px solid #ddd';
      th.style.padding = '8px';
      th.style.backgroundColor = '#f4f4f4';
      th.textContent = `Header ${i + 1}`;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body rows
    const tbody = document.createElement('tbody');
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('tr');
      for (let j = 0; j < 3; j++) {
        const td = document.createElement('td');
        td.style.border = '1px solid #ddd';
        td.style.padding = '8px';
        td.textContent = `Cell ${i + 1},${j + 1}`;
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(table);
      range.collapse(false);
    }
    handleInput();
  };

  const addLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkDialog(false);
    }
  };

  const addImage = () => {
    if (imageUrl) {
      execCommand('insertImage', imageUrl);
      setImageUrl('');
      setShowImageDialog(false);
    }
  };

  const addPlaceholder = () => {
    if (placeholderName) {
      const span = document.createElement('span');
      span.className = 'dynamic-placeholder';
      span.setAttribute('data-placeholder', placeholderName);
      span.setAttribute('data-label', placeholderLabel || '');
      span.style.backgroundColor = '#e3f2fd';
      span.style.padding = '2px 6px';
      span.style.borderRadius = '4px';
      span.style.border = '1px solid #2196f3';
      span.style.color = '#1976d2';
      span.style.fontFamily = 'monospace';
      span.style.fontSize = '0.9em';
      span.textContent = `\${${placeholderName}}`;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(span);
        
        // Add a space after the placeholder
        const space = document.createTextNode(' ');
        range.insertNode(space);
        range.setStartAfter(space);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      if (onInsertPlaceholder) {
        onInsertPlaceholder(placeholderName, placeholderLabel);
      }
      setPlaceholderName('');
      setPlaceholderLabel('');
      setShowPlaceholderDialog(false);
      handleInput();
    }
  };

  const setTextColor = (color: string) => {
    execCommand('foreColor', color);
  };

  const setBackgroundColor = (color: string) => {
    execCommand('backColor', color);
  };

  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc',
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
    '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
  ];

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="border-b bg-muted/30 p-2 flex flex-wrap items-center gap-1">
        {/* Format Dropdown */}
        <Select
          value={currentFormat}
          onValueChange={(value) => formatBlock(value)}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
            <SelectItem value="h4">Heading 4</SelectItem>
            <SelectItem value="h5">Heading 5</SelectItem>
            <SelectItem value="h6">Heading 6</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-8" />

        {/* Text Formatting */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => execCommand('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => execCommand('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => execCommand('underline')}
          className="h-8 w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-8" />

        {/* Lists */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => execCommand('insertUnorderedList')}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => execCommand('insertOrderedList')}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-8" />

        {/* Indent */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => execCommand('indent')}
          className="h-8 w-8 p-0"
        >
          <IndentIncrease className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => execCommand('outdent')}
          className="h-8 w-8 p-0"
        >
          <IndentDecrease className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-8" />

        {/* Alignment */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => execCommand('justifyLeft')}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => execCommand('justifyCenter')}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => execCommand('justifyRight')}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-8" />

        {/* Color Picker */}
        <div className="flex items-center gap-1">
          <Select onValueChange={setTextColor}>
            <SelectTrigger className="w-24 h-8">
              <Type className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent>
              <div className="grid grid-cols-6 gap-1 p-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => setTextColor(color)}
                  />
                ))}
              </div>
            </SelectContent>
          </Select>

          <Select onValueChange={setBackgroundColor}>
            <SelectTrigger className="w-24 h-8">
              <Highlighter className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent>
              <div className="grid grid-cols-6 gap-1 p-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => setBackgroundColor(color)}
                  />
                ))}
              </div>
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Insert Link */}
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <LinkIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>URL</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <Button onClick={addLink}>Insert Link</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Insert Image */}
        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Image URL</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <Button onClick={addImage}>Insert Image</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Insert Table */}
        <Button
          size="sm"
          variant="ghost"
          onClick={insertTable}
          className="h-8 w-8 p-0"
        >
          <TableIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-8" />

        {/* Insert Dynamic Placeholder */}
        <Dialog open={showPlaceholderDialog} onOpenChange={setShowPlaceholderDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              Add Dynamic Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Dynamic Placeholder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Variable Name</Label>
                <Input
                  value={placeholderName}
                  onChange={(e) => setPlaceholderName(e.target.value)}
                  placeholder="e.g., userName, totalAmount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be used as th:text="$&#123;{placeholderName}&#125;"
                </p>
              </div>
              <div>
                <Label>Static Label (Optional)</Label>
                <Input
                  value={placeholderLabel}
                  onChange={(e) => setPlaceholderLabel(e.target.value)}
                  placeholder="e.g., User Name, Total Amount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Helps identify what this placeholder represents
                </p>
              </div>
              <Button onClick={addPlaceholder}>Insert Placeholder</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[400px] p-4 focus:outline-none prose prose-sm max-w-none bg-background"
        style={{
          overflowWrap: 'break-word',
          wordWrap: 'break-word'
        }}
      />
    </div>
  );
};
