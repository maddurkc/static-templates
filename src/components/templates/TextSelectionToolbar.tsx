import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bold, Italic, Underline, Type } from "lucide-react";
import styles from "./TextSelectionToolbar.module.scss";

interface TextSelectionToolbarProps {
  onApplyStyle: (styles: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
  }) => void;
}

const fontSizes = [
  "12px", "14px", "16px", "18px", "20px", "24px", "32px", "40px", "48px"
];

export const TextSelectionToolbar = ({ onApplyStyle }: TextSelectionToolbarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedStyles, setSelectedStyles] = useState({
    bold: false,
    italic: false,
    underline: false,
    color: "#000000",
    backgroundColor: "#ffffff",
    fontSize: "16px"
  });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.toString().trim() === "") {
        setIsVisible(false);
        return;
      }

      // Check if selection is within an editable content area
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer.parentElement;
      const editableParent = container?.closest('[contenteditable="true"], textarea, input');
      
      if (!editableParent) {
        setIsVisible(false);
        return;
      }

      // Get selection rectangle
      const rect = range.getBoundingClientRect();
      
      // Position toolbar above selection
      setPosition({
        top: rect.top - 60 + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX
      });
      
      setIsVisible(true);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mouseup", handleSelectionChange);
    
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mouseup", handleSelectionChange);
    };
  }, []);

  const handleApplyStyle = (styleKey: keyof typeof selectedStyles, value: any) => {
    const newStyles = { ...selectedStyles, [styleKey]: value };
    setSelectedStyles(newStyles);
    onApplyStyle(newStyles);
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={toolbarRef}
      className={styles.toolbar}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        zIndex: 1000
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      {/* Text Formatting */}
      <Button
        variant={selectedStyles.bold ? "default" : "outline"}
        size="sm"
        onClick={() => handleApplyStyle("bold", !selectedStyles.bold)}
        className={styles.toolbarButton}
        title="Bold"
      >
        <Bold className={styles.icon} />
      </Button>
      
      <Button
        variant={selectedStyles.italic ? "default" : "outline"}
        size="sm"
        onClick={() => handleApplyStyle("italic", !selectedStyles.italic)}
        className={styles.toolbarButton}
        title="Italic"
      >
        <Italic className={styles.icon} />
      </Button>
      
      <Button
        variant={selectedStyles.underline ? "default" : "outline"}
        size="sm"
        onClick={() => handleApplyStyle("underline", !selectedStyles.underline)}
        className={styles.toolbarButton}
        title="Underline"
      >
        <Underline className={styles.icon} />
      </Button>

      <Separator orientation="vertical" className={styles.separator} />

      {/* Font Size */}
      <Select
        value={selectedStyles.fontSize}
        onValueChange={(value) => handleApplyStyle("fontSize", value)}
      >
        <SelectTrigger className={styles.selectTrigger}>
          <Type className={styles.icon} />
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map((size) => (
            <SelectItem key={size} value={size}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className={styles.separator} />

      {/* Text Color */}
      <Input
        type="color"
        value={selectedStyles.color}
        onChange={(e) => handleApplyStyle("color", e.target.value)}
        className={styles.colorInput}
        title="Text Color"
      />

      {/* Background Color */}
      <Input
        type="color"
        value={selectedStyles.backgroundColor}
        onChange={(e) => handleApplyStyle("backgroundColor", e.target.value)}
        className={styles.colorInput}
        title="Background Color"
      />
    </div>
  );
};
