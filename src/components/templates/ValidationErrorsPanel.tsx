import { ValidationError } from "@/lib/templateValidation";
import { AlertCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import styles from "./ValidationErrorsPanel.module.scss";

interface ValidationErrorsPanelProps {
  errors: ValidationError[];
  onScrollToSection: (sectionId: string) => void;
  onClose: () => void;
}

export const ValidationErrorsPanel = ({
  errors,
  onScrollToSection,
  onClose
}: ValidationErrorsPanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  if (errors.length === 0) return null;

  const sectionErrors = errors.filter(e => e.sectionId);
  const generalErrors = errors.filter(e => !e.sectionId);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <AlertCircle className={styles.icon} />
          <span className={styles.title}>
            {errors.length} Validation Issue{errors.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className={styles.headerRight}>
          <Button
            variant="ghost"
            size="icon"
            className={styles.collapseButton}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={styles.closeButton}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className={styles.content}>
          {generalErrors.length > 0 && (
            <div className={styles.errorGroup}>
              <div className={styles.groupLabel}>General</div>
              {generalErrors.map((error, index) => (
                <div key={`general-${index}`} className={styles.errorItem}>
                  <span className={styles.errorDot} />
                  <span className={styles.errorMessage}>{error.message}</span>
                </div>
              ))}
            </div>
          )}
          
          {sectionErrors.length > 0 && (
            <div className={styles.errorGroup}>
              <div className={styles.groupLabel}>Section Issues</div>
              {sectionErrors.map((error, index) => (
                <button
                  key={`section-${index}`}
                  className={styles.errorItemClickable}
                  onClick={() => error.sectionId && onScrollToSection(error.sectionId)}
                >
                  <span className={styles.errorDot} />
                  <span className={styles.errorMessage}>{error.message}</span>
                  <span className={styles.goToLink}>Go to section →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
