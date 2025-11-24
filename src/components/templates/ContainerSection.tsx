import { Section } from "@/types/section";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import styles from "./ContainerSection.module.scss";

interface ContainerSectionProps {
  section: Section;
  onDelete: (id: string) => void;
  onSelect: (section: Section) => void;
  onAddChild: (parentId: string) => void;
  isSelected: boolean;
  children?: React.ReactNode;
}

export const ContainerSection = ({
  section,
  onDelete,
  onSelect,
  onAddChild,
  isSelected,
  children
}: ContainerSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.container}>
      <Card
        className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      >
        <div className={styles.header}>
          <div
            {...attributes}
            {...listeners}
            className={styles.dragHandle}
          >
            <GripVertical className={styles.icon} />
          </div>
          
          <div className={styles.contentArea}>
            <Badge variant="outline" className={styles.badge}>Container</Badge>
            <span className={styles.sectionCount}>
              {section.children?.length || 0} sections inside
            </span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddChild(section.id)}
            className={styles.actionButton}
          >
            <Plus className={styles.iconSmall} style={{ marginRight: '0.25rem' }} />
            Add Section
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSelect(section)}
            className={`${styles.editButton} ${isSelected ? styles.selected : ''}`}
          >
            Edit
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(section.id)}
            className={styles.deleteButton}
          >
            <Trash2 className={styles.iconSmall} />
          </Button>
        </div>
        
        {section.children && section.children.length > 0 && (
          <div className={styles.childrenArea}>
            {children}
          </div>
        )}
      </Card>
    </div>
  );
};