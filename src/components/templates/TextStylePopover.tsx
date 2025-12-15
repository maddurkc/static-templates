import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Bold, Italic, Underline } from "lucide-react";
import { TextStyle } from "@/types/section";
import styles from "./TextStylePopover.module.scss";

interface TextStylePopoverProps {
  value: string | TextStyle;
  onChange: (newValue: TextStyle) => void;
  disabled?: boolean;
}

const TEXT_COLORS = ['#000000', '#FF0000', '#0066CC', '#008000', '#FF6600', '#800080', '#666666', '#003366'];
const BG_COLORS = ['#FFFFFF', '#FFFF00', '#90EE90', '#ADD8E6', '#FFB6C1', '#E6E6FA', '#F5F5DC', '#F0F0F0'];

export const TextStylePopover = ({ value, onChange, disabled = false }: TextStylePopoverProps) => {
  const textValue = typeof value === 'object' ? value.text : (value as string) || '';
  const currentStyle = typeof value === 'object' ? value as TextStyle : { text: textValue };

  const toggleStyle = (key: keyof TextStyle) => {
    onChange({ ...currentStyle, text: textValue, [key]: !currentStyle[key] });
  };

  const setColor = (key: 'color' | 'backgroundColor', color: string) => {
    onChange({ ...currentStyle, text: textValue, [key]: color });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={disabled}>
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={styles.formatPopover}>
        <div className="space-y-3">
          <div className={styles.styleButtons}>
            <Button 
              size="sm" 
              variant={currentStyle.bold ? "default" : "outline"} 
              className="h-8 w-8 p-0"
              onClick={() => toggleStyle('bold')}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button 
              size="sm" 
              variant={currentStyle.italic ? "default" : "outline"} 
              className="h-8 w-8 p-0"
              onClick={() => toggleStyle('italic')}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button 
              size="sm" 
              variant={currentStyle.underline ? "default" : "outline"} 
              className="h-8 w-8 p-0"
              onClick={() => toggleStyle('underline')}
            >
              <Underline className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-2">
            <div>
              <Label className="text-xs mb-1 block">Text Color</Label>
              <div className="flex flex-wrap gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${currentStyle.color === color ? 'border-primary ring-2 ring-primary/50' : 'border-border'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setColor('color', color)}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Background</Label>
              <div className="flex flex-wrap gap-1">
                {BG_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${currentStyle.backgroundColor === color ? 'border-primary ring-2 ring-primary/50' : 'border-border'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setColor('backgroundColor', color)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
