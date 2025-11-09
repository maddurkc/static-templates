import { Section } from "@/types/section";
import { ApiConfig } from "@/types/api-config";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Settings2, Plug } from "lucide-react";
import { VariableEditor } from "./VariableEditor";
import { ApiConfigPopover } from "./ApiConfigPopover";

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

  if (!section) {
    return (
      <div className="border-t bg-card/80 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Customize Template</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select a section to customize its styles
            </p>
          </div>
          
          {/* API Integration Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plug className="h-4 w-4" />
                API Integration
                {apiConfig.enabled && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-green-500" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px]" align="end">
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
    <div className="border-t bg-card/80 backdrop-blur-sm px-6 py-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Customize Styles</h3>
        
        <div className="flex items-center gap-2">
          {/* Variables popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Edit Variables
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 max-h-[500px] overflow-y-auto" align="end">
              <VariableEditor section={section} onUpdate={onUpdate} />
            </PopoverContent>
          </Popover>

          {/* API Integration Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plug className="h-4 w-4" />
                API Integration
                {apiConfig.enabled && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-green-500" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px]" align="end">
              <ApiConfigPopover
                apiConfig={apiConfig}
                sections={sections}
                onUpdate={onApiConfigUpdate}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Font Size */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Font Size</Label>
            <Select
              value={section.styles?.fontSize || "16px"}
              onValueChange={(value) => updateStyle("fontSize", value)}
            >
              <SelectTrigger className="w-[100px] h-8">
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

          <Separator orientation="vertical" className="h-8" />

          {/* Font Weight */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Weight</Label>
            <Select
              value={section.styles?.fontWeight || "400"}
              onValueChange={(value) => updateStyle("fontWeight", value)}
            >
              <SelectTrigger className="w-[140px] h-8">
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

          <Separator orientation="vertical" className="h-8" />

          {/* Text Alignment */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Align</Label>
            <Select
              value={section.styles?.textAlign || "left"}
              onValueChange={(value) => updateStyle("textAlign", value)}
            >
              <SelectTrigger className="w-[100px] h-8">
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

          <Separator orientation="vertical" className="h-8" />

          {/* Text Color */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Text Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={section.styles?.color || "#000000"}
                onChange={(e) => updateStyle("color", e.target.value)}
                className="w-16 h-8 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={section.styles?.color || "#000000"}
                onChange={(e) => updateStyle("color", e.target.value)}
                className="w-24 h-8 text-xs font-mono"
                placeholder="#000000"
              />
            </div>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Background Color */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Background</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={section.styles?.backgroundColor || "#ffffff"}
                onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                className="w-16 h-8 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={section.styles?.backgroundColor || "#ffffff"}
                onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                className="w-24 h-8 text-xs font-mono"
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
