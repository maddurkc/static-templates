import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { sectionTypes } from "@/data/sectionTypes";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";
import styles from "./SectionLibrary.module.scss";

const DraggableSection = ({ section }: { section: typeof sectionTypes[0] }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${section.type}`,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={styles.draggableCard}
    >
      <div className={styles.cardContent}>
        <GripVertical className={styles.dragIcon} />
        <section.icon className={styles.sectionIcon} />
        <div className={styles.cardText}>
          <p className={styles.sectionTitle}>{section.label}</p>
          <p className={styles.sectionDescription}>{section.description}</p>
        </div>
      </div>
    </Card>
  );
};

export const SectionLibrary = () => {
  const groupedSections = sectionTypes.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, typeof sectionTypes>);

  const categoryLabels: Record<string, string> = {
    text: "Text",
    media: "Media",
    layout: "Layout",
    interactive: "Interactive"
  };

  return (
    <div className={styles.container}>
      {Object.entries(groupedSections).map(([category, categorySections]) => (
        <div key={category} className={styles.categorySection}>
          <div className={styles.categoryHeader}>
            <h3 className={styles.categoryTitle}>
              {categoryLabels[category]}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {categorySections.length}
            </Badge>
          </div>
          <div className={styles.sectionsList}>
            {categorySections.map((section) => (
              <DraggableSection key={section.type} section={section} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
