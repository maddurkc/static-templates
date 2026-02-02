import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { sectionTypes } from "@/data/sectionTypes";
import { Section } from "@/types/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVertical, Ban } from "lucide-react";
import styles from "./SectionLibrary.module.scss";

// Section types that can only appear once per template
export const SINGLE_USE_SECTION_TYPES = ['program-name', 'banner'] as const;

interface DraggableSectionProps {
  section: typeof sectionTypes[0];
  isDisabled?: boolean;
}

const DraggableSection = ({ section, isDisabled = false }: DraggableSectionProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${section.type}`,
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : isDisabled ? 0.5 : 1,
  };

  const card = (
    <Card
      ref={setNodeRef}
      style={style}
      {...(isDisabled ? {} : { ...attributes, ...listeners })}
      className={`${styles.draggableCard} ${isDisabled ? styles.disabledCard : ''}`}
    >
      <div className={styles.cardContent}>
        {isDisabled ? (
          <Ban className={styles.dragIcon} />
        ) : (
          <GripVertical className={styles.dragIcon} />
        )}
        <section.icon className={styles.sectionIcon} />
        <div className={styles.cardText}>
          <p className={styles.sectionTitle}>{section.label}</p>
          <p className={styles.sectionDescription}>{section.description}</p>
        </div>
      </div>
    </Card>
  );

  if (isDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {card}
          </TooltipTrigger>
          <TooltipContent>
            <p>Only one {section.label} section allowed per template</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return card;
};

interface SectionLibraryProps {
  existingSections?: Section[];
}

export const SectionLibrary = ({ existingSections = [] }: SectionLibraryProps) => {
  // Check which single-use sections already exist in the template
  const existingSingleUseSections = new Set<string>();
  
  const checkSections = (sections: Section[]) => {
    for (const section of sections) {
      if (SINGLE_USE_SECTION_TYPES.includes(section.type as any)) {
        existingSingleUseSections.add(section.type);
      }
      if (section.children) {
        checkSections(section.children);
      }
    }
  };
  checkSections(existingSections);

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
              <DraggableSection 
                key={section.type} 
                section={section}
                isDisabled={existingSingleUseSections.has(section.type)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
