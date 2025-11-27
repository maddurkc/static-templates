import { Section } from "@/types/section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline } from "lucide-react";
import styles from "./StyleEditor.module.scss";

interface StyleEditorProps {
  section: Section;
  onUpdate: (section: Section) => void;
}

const fontSizes = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "32px", value: "32px" },
  { label: "40px", value: "40px" },
  { label: "48px", value: "48px" },
  { label: "56px", value: "56px" },
  { label: "64px", value: "64px" },
];

const fontWeights = [
  { label: "Light (300)", value: "300" },
  { label: "Normal (400)", value: "400" },
  { label: "Medium (500)", value: "500" },
  { label: "Semibold (600)", value: "600" },
  { label: "Bold (700)", value: "700" },
];

const textAlignments = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
  { label: "Justify", value: "justify" },
];

export const StyleEditor = ({ section, onUpdate }: StyleEditorProps) => {
  const updateStyle = (key: string, value: string) => {
    onUpdate({
      ...section,
      styles: {
        ...section.styles,
        [key]: value,
      },
    });
  };

  const toggleStyle = (key: string, onValue: string, offValue: string) => {
    const currentValue = section?.styles?.[key] || offValue;
    const newValue = currentValue === onValue ? offValue : onValue;
    updateStyle(key, newValue);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <h3 className={styles.title}>Section Styles</h3>
        <p className={styles.subtitle}>Customize the appearance of this section</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          {/* Font Size */}
          <div className={styles.controlGroup}>
            <Label className={styles.label}>Font Size</Label>
            <Select
              value={section.styles?.fontSize || "16px"}
              onValueChange={(value) => updateStyle("fontSize", value)}
            >
              <SelectTrigger className={styles.selectTrigger} style={{ width: '100px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontSizes.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className={styles.separator} />

          {/* Font Weight */}
          <div className={styles.controlGroup}>
            <Label className={styles.label}>Weight</Label>
            <Select
              value={section.styles?.fontWeight || "400"}
              onValueChange={(value) => updateStyle("fontWeight", value)}
            >
              <SelectTrigger className={styles.selectTrigger} style={{ width: '140px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontWeights.map((weight) => (
                  <SelectItem key={weight.value} value={weight.value}>
                    {weight.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={styles.controlRow}>
          {/* Bold, Italic, Underline Toggle Buttons */}
          <div className={styles.controlGroup}>
            <Label className={styles.label}>Style</Label>
            <div className={styles.toggleButtons}>
              <Button
                variant={section.styles?.fontWeight === "700" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStyle("fontWeight", "700", "400")}
                className={styles.toggleButton}
                title="Bold"
              >
                <Bold className={styles.iconSmall} />
              </Button>
              <Button
                variant={section.styles?.fontStyle === "italic" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStyle("fontStyle", "italic", "normal")}
                className={styles.toggleButton}
                title="Italic"
              >
                <Italic className={styles.iconSmall} />
              </Button>
              <Button
                variant={section.styles?.textDecoration === "underline" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStyle("textDecoration", "underline", "none")}
                className={styles.toggleButton}
                title="Underline"
              >
                <Underline className={styles.iconSmall} />
              </Button>
            </div>
          </div>

          <Separator orientation="vertical" className={styles.separator} />

          {/* Text Alignment */}
          <div className={styles.controlGroup}>
            <Label className={styles.label}>Align</Label>
            <Select
              value={section.styles?.textAlign || "left"}
              onValueChange={(value) => updateStyle("textAlign", value)}
            >
              <SelectTrigger className={styles.selectTrigger} style={{ width: '100px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {textAlignments.map((align) => (
                  <SelectItem key={align.value} value={align.value}>
                    {align.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={styles.controlRow}>
          {/* Text Color */}
          <div className={styles.controlGroup}>
            <Label className={styles.label}>Text Color</Label>
            <div className={styles.colorInputs}>
              <Input
                type="color"
                value={section.styles?.color || "#000000"}
                onChange={(e) => updateStyle("color", e.target.value)}
                className={styles.inputColor}
              />
              <Input
                type="text"
                value={section.styles?.color || "#000000"}
                onChange={(e) => updateStyle("color", e.target.value)}
                className={styles.inputText}
                placeholder="#000000"
              />
            </div>
          </div>

          <Separator orientation="vertical" className={styles.separator} />

          {/* Background Color */}
          <div className={styles.controlGroup}>
            <Label className={styles.label}>Background</Label>
            <div className={styles.colorInputs}>
              <Input
                type="color"
                value={section.styles?.backgroundColor || "#ffffff"}
                onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                className={styles.inputColor}
              />
              <Input
                type="text"
                value={section.styles?.backgroundColor || "#ffffff"}
                onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                className={styles.inputText}
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
