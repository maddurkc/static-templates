import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAutocomplete, User, DelegateType } from "./UserAutocomplete";
import { Share2, X, Users, UserPlus } from "lucide-react";
import styles from "./DelegatesDialog.module.scss";

interface DelegatesDialogProps {
  delegates: User[];
  onChange: (delegates: User[]) => void;
  trigger?: React.ReactNode;
}

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const DelegatesDialog = ({ delegates, onChange, trigger }: DelegatesDialogProps) => {
  const [pendingDelegates, setPendingDelegates] = useState<User[]>([]);

  const handleAddDelegates = () => {
    const existingEmails = new Set(delegates.map((d) => d.email));
    const newDelegates = pendingDelegates
      .filter((d) => !existingEmails.has(d.email))
      .map((d) => ({ ...d, delegateType: 'extended' as DelegateType }));
    if (newDelegates.length > 0) {
      onChange([...delegates, ...newDelegates]);
    }
    setPendingDelegates([]);
  };

  const handleRemoveDelegate = (userId: string) => {
    onChange(delegates.filter((d) => d.id !== userId));
  };

  const handleTypeChange = (userId: string, type: DelegateType) => {
    onChange(delegates.map((d) => (d.id === userId ? { ...d, delegateType: type } : d)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className={styles.shareTrigger}>
            <Share2 className="h-4 w-4" />
            Share
            {delegates.length > 0 && (
              <span className={styles.shareCount}>{delegates.length}</span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className={styles.popoverContent}>
        {/* Header */}
        <div className={styles.popoverHeader}>
          <span className={styles.popoverTitle}>
            <Share2 className={styles.popoverTitleIcon} />
            Share Template
          </span>
        </div>

        {/* Search */}
        <div className={styles.searchArea}>
          <div className={styles.searchRow}>
            <div className={styles.searchInputWrapper}>
              <UserAutocomplete
                value={pendingDelegates}
                onChange={setPendingDelegates}
                placeholder="Add people by name or email..."
              />
            </div>
            {pendingDelegates.length > 0 && (
              <Button size="sm" onClick={handleAddDelegates} className={styles.addButton}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            )}
          </div>
        </div>

        {/* People list */}
        <div className={styles.peopleSection}>
          {delegates.length > 0 && (
            <div className={styles.peopleSectionLabel}>
              People with access · {delegates.length}
            </div>
          )}

          {delegates.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Users />
              </div>
              <p className={styles.emptyText}>No one has access yet</p>
              <p className={styles.emptySubtext}>Search for people above to share this template</p>
            </div>
          ) : (
            delegates.map((delegate) => (
              <div key={delegate.id} className={styles.delegateItem}>
                <div className={styles.delegateAvatar}>
                  {getInitials(delegate.name)}
                </div>
                <div className={styles.delegateInfo}>
                  <span className={styles.delegateName}>{delegate.name}</span>
                  <span className={styles.delegateEmail}>{delegate.email}</span>
                </div>
                <Select
                  value={delegate.delegateType || "extended"}
                  onValueChange={(val) => handleTypeChange(delegate.id, val as DelegateType)}
                >
                  <SelectTrigger
                    className={styles.typeSelect}
                    data-type={delegate.delegateType || "extended"}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="extended">Extended</SelectItem>
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className={styles.removeButton}
                  onClick={() => handleRemoveDelegate(delegate.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
