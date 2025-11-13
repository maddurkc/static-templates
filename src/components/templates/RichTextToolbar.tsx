import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Link,
  Image,
  Table,
  Type,
  Palette,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface RichTextToolbarProps {
  onFormat: (command: string, value?: string) => void;
  onInsertImage: (url: string) => void;
  onInsertLink: (url: string) => void;
  onInsertTable: (rows: number, cols: number) => void;
  onViewHtml?: () => void;
  content?: string;
}

export const RichTextToolbar = ({
  onFormat,
  onInsertImage,
  onInsertLink,
  onInsertTable,
  onViewHtml,
  content = "",
}: RichTextToolbarProps) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tableRows, setTableRows] = useState("3");
  const [tableCols, setTableCols] = useState("3");
  const [textColor, setTextColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");

  const handleHeadingChange = (value: string) => {
    if (value === "normal") {
      onFormat("formatBlock", "p");
    } else {
      onFormat("formatBlock", value);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30 sticky top-0 z-10">
      {/* Heading Dropdown */}
      <Select onValueChange={handleHeadingChange} defaultValue="normal">
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Normal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="h1">Heading 1</SelectItem>
          <SelectItem value="h2">Heading 2</SelectItem>
          <SelectItem value="h3">Heading 3</SelectItem>
          <SelectItem value="h4">Heading 4</SelectItem>
          <SelectItem value="h5">Heading 5</SelectItem>
          <SelectItem value="h6">Heading 6</SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6" />

      {/* Basic Formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("bold")}
        title="Bold (Ctrl+B)"
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("italic")}
        title="Italic (Ctrl+I)"
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("underline")}
        title="Underline (Ctrl+U)"
        className="h-8 w-8 p-0"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("insertUnorderedList")}
        title="Bullet List"
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("insertOrderedList")}
        title="Numbered List"
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Indentation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("indent")}
        title="Increase Indent"
        className="h-8 w-8 p-0"
      >
        <IndentIncrease className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onFormat("outdent")}
        title="Decrease Indent"
        className="h-8 w-8 p-0"
      >
        <IndentDecrease className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Text Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Text Color"
            className="h-8 w-8 p-0 relative"
          >
            <Type className="h-4 w-4" />
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 rounded"
              style={{ backgroundColor: textColor }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="space-y-3">
            <Label>Text Color</Label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-12 w-full cursor-pointer"
                />
              </div>
              <Input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-24 font-mono text-xs"
                placeholder="#000000"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                onFormat("foreColor", textColor);
              }}
              className="w-full"
            >
              Apply Text Color
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Background Color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Background Color"
            className="h-8 w-8 p-0 relative"
          >
            <Palette className="h-4 w-4" />
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 rounded"
              style={{ backgroundColor: bgColor }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="space-y-3">
            <Label>Background Color</Label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-12 w-full cursor-pointer"
                />
              </div>
              <Input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-24 font-mono text-xs"
                placeholder="#ffffff"
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                onFormat("hiliteColor", bgColor);
              }}
              className="w-full"
            >
              Apply Background Color
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6" />

      {/* Link */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Insert Link"
            className="h-8 w-8 p-0"
          >
            <Link className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (linkUrl) {
                  onInsertLink(linkUrl);
                  setLinkUrl("");
                }
              }}
              className="w-full"
            >
              Insert Link
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Image */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Insert Image"
            className="h-8 w-8 p-0"
          >
            <Image className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (imageUrl) {
                  onInsertImage(imageUrl);
                  setImageUrl("");
                }
              }}
              className="w-full"
            >
              Insert Image
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Table */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Insert Table"
            className="h-8 w-8 p-0"
          >
            <Table className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Rows</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={tableRows}
                onChange={(e) => setTableRows(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Columns</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={tableCols}
                onChange={(e) => setTableCols(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                onInsertTable(parseInt(tableRows), parseInt(tableCols));
                setTableRows("3");
                setTableCols("3");
              }}
              className="w-full"
            >
              Insert Table
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6" />
      
      {/* View HTML */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="View HTML"
            className="h-8 px-3"
          >
            &lt;/&gt;
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] max-h-[500px]">
          <div className="space-y-2">
            <Label>Generated HTML</Label>
            <ScrollArea className="h-[400px] w-full rounded border bg-muted/30 p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {content}
              </pre>
            </ScrollArea>
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(content || "");
              }}
              className="w-full"
            >
              Copy HTML
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
