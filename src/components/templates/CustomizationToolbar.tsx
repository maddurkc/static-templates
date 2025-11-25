import { Section } from "@/types/section";
import { ApiConfig } from "@/types/api-config";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Settings2, Plug, Bold, Italic, Underline } from "lucide-react";
import { VariableEditor } from "./VariableEditor";
import { ApiConfigPopover } from "./ApiConfigPopover";
import styles from "./CustomizationToolbar.module.scss";

interface CustomizationToolbarProps {
  section: Section | null;
  onUpdate: (section: Section) => void;
  apiConfig: ApiConfig;
  sections: Section[];
  onApiConfigUpdate: (config: ApiConfig) => void;
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

export const CustomizationToolbar = ({ 
  section, 
  onUpdate, 
  apiConfig, 
  sections,
  onApiConfigUpdate
}: CustomizationToolbarProps) => {
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

  if (!section) {
    return (
      <div className={styles.toolbar}>
        <div className={styles.toolbarHeader}>
          <div>
            <h3 className={styles.title}>Customize Template</h3>
            <p className={styles.subtitle}>
              Select a section to customize its styles
            </p>
          </div>
          
          {/* API Integration Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={styles.buttonGap}>
                <Plug className={styles.icon} />
                API Integration
                {apiConfig.enabled && (
                  <span className={styles.statusDot} />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent style={{ width: '500px' }} align="end">
              <ApiConfigPopover
                apiConfig={apiConfig}
                sections={sections}
                onUpdate={onApiConfigUpdate}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarHeader}>
        <h3 className={styles.title}>Customize Styles</h3>
        
        <div className={styles.actions}>
          {/* Variables popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={styles.buttonGap}>
                <Settings2 className={styles.icon} />
                Edit Variables
              </Button>
            </PopoverTrigger>
            <PopoverContent style={{ width: '24rem', maxHeight: '500px', overflowY: 'auto' }} align="end">
              <VariableEditor section={section} onUpdate={onUpdate} />
            </PopoverContent>
          </Popover>

          {/* API Integration Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={styles.buttonGap}>
                <Plug className={styles.icon} />
                API Integration
                {apiConfig.enabled && (
                  <span className={styles.statusDot} />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent style={{ width: '500px' }} align="end">
              <ApiConfigPopover
                apiConfig={apiConfig}
                sections={sections}
                onUpdate={onApiConfigUpdate}
              />
            </PopoverContent>
          </Popover>
        </div>
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

          <Separator orientation="vertical" className={styles.separator} />

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

          <Separator orientation="vertical" className={styles.separator} />

          {/* Text Color */}
          <div className={styles.controlGroup}>
            <Label className={styles.label}>Text Color</Label>
            <div className={styles.controlGroup}>
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
            <div className={styles.controlGroup}>
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