import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAutocomplete, User } from "./UserAutocomplete";
import { Users, X, UserPlus } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [pendingDelegates, setPendingDelegates] = useState<User[]>([]);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setPendingDelegates([]);
    }
    setOpen(isOpen);
  };

  const handleAddDelegates = () => {
    // Merge pending into existing, avoiding duplicates by email
    const existingEmails = new Set(delegates.map((d) => d.email));
    const newDelegates = pendingDelegates.filter((d) => !existingEmails.has(d.email));
    if (newDelegates.length > 0) {
      onChange([...delegates, ...newDelegates]);
    }
    setPendingDelegates([]);
  };

  const handleRemoveDelegate = (userId: string) => {
    onChange(delegates.filter((d) => d.id !== userId));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Delegates ({delegates.length})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader>
          <div className={styles.header}>
            <DialogTitle>Manage Delegates</DialogTitle>
            <p className={styles.subtitle}>
              Add users who can edit and run this template
            </p>
          </div>
        </DialogHeader>

        <div className={styles.body}>
          {/* Add delegates */}
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Add delegates</span>
            <UserAutocomplete
              value={pendingDelegates}
              onChange={setPendingDelegates}
              placeholder="Search by name or email..."
            />
            {pendingDelegates.length > 0 && (
              <Button size="sm" onClick={handleAddDelegates} className="self-end mt-1">
                <UserPlus className="h-4 w-4 mr-1" />
                Add {pendingDelegates.length} delegate{pendingDelegates.length > 1 ? "s" : ""}
              </Button>
            )}
          </div>

          {/* Current delegates list */}
          <div className={styles.fieldGroup}>
            <div className="flex items-center justify-between">
              <span className={styles.fieldLabel}>Current delegates</span>
              <span className={styles.delegateCount}>{delegates.length} total</span>
            </div>

            {delegates.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Users />
                </div>
                <p className={styles.emptyText}>No delegates added yet</p>
              </div>
            ) : (
              <div className={styles.delegateList}>
                {delegates.map((delegate) => (
                  <div key={delegate.id} className={styles.delegateItem}>
                    <div className={styles.delegateAvatar}>
                      {getInitials(delegate.name)}
                    </div>
                    <div className={styles.delegateInfo}>
                      <span className={styles.delegateName}>{delegate.name}</span>
                      <span className={styles.delegateEmail}>
                        {delegate.email}
                        {delegate.department && ` · ${delegate.department}`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={styles.removeButton}
                      onClick={() => handleRemoveDelegate(delegate.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
