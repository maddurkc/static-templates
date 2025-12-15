import { Section } from "@/types/section";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2, Palette, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { VariableEditor } from "./VariableEditor";
import { StyleEditor } from "./StyleEditor";
import styles from "./InlineSectionControls.module.scss";

interface InlineSectionControlsProps {
  section: Section;
  onUpdate: (section: Section) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const InlineSectionControls = ({
  section,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: InlineSectionControlsProps) => {
  return (
    <div className={styles.controls}>
      {/* Edit Variables */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={styles.controlButton}
            title="Edit Variables"
            onClick={(e) => e.stopPropagation()}
          >
            <Settings2 className={styles.icon} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          style={{ width: '24rem', maxHeight: '500px', overflowY: 'auto' }} 
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <VariableEditor section={section} onUpdate={onUpdate} />
        </PopoverContent>
      </Popover>

      {/* Customize Style */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={styles.controlButton}
            title="Customize Style"
            onClick={(e) => e.stopPropagation()}
          >
            <Palette className={styles.icon} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          style={{ width: '32rem', maxHeight: '500px', overflowY: 'auto' }} 
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <StyleEditor section={section} onUpdate={onUpdate} />
        </PopoverContent>
      </Popover>

      {/* Move Up */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onMoveUp();
        }}
        disabled={isFirst}
        className={styles.controlButton}
        title="Move Up"
      >
        <ChevronUp className={styles.icon} />
      </Button>

      {/* Move Down */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onMoveDown();
        }}
        disabled={isLast}
        className={styles.controlButton}
        title="Move Down"
      >
        <ChevronDown className={styles.icon} />
      </Button>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className={styles.deleteButton}
        title="Delete"
      >
        <Trash2 className={styles.icon} />
      </Button>
    </div>
  );
};
