import { useState } from "react";
import { Settings, Share2, Bell, Wrench, X, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserAutocomplete, User, DelegateType } from "./UserAutocomplete";
import styles from "./TemplateSettingsPanel.module.scss";

// ─── Types ───
interface SettingsCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: number;
}

interface TemplateSettingsPanelProps {
  delegates: User[];
  onDelegatesChange: (delegates: User[]) => void;
  onClose: () => void;
}

const getInitials = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

// ─── Delegates Tab ───
const DelegatesContent = ({
  delegates,
  onChange,
}: {
  delegates: User[];
  onChange: (d: User[]) => void;
}) => {
  const [pending, setPending] = useState<User[]>([]);

  const handleAdd = () => {
    const existing = new Set(delegates.map((d) => d.email));
    const fresh = pending
      .filter((d) => !existing.has(d.email))
      .map((d) => ({ ...d, delegateType: "extended" as DelegateType }));
    if (fresh.length) onChange([...delegates, ...fresh]);
    setPending([]);
  };

  const handleRemove = (id: string) => onChange(delegates.filter((d) => d.id !== id));

  const handleType = (id: string, type: DelegateType) =>
    onChange(delegates.map((d) => (d.id === id ? { ...d, delegateType: type } : d)));

  return (
    <div>
      <div className={styles.settingGroup}>
        <div className={styles.settingGroupLabel}>Add people</div>
        <div className={styles.searchBox}>
          <div className={styles.searchBoxInput}>
            <UserAutocomplete
              value={pending}
              onChange={setPending}
              placeholder="Search by name or email..."
            />
          </div>
          {pending.length > 0 && (
            <Button size="sm" onClick={handleAdd}>
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          )}
        </div>
      </div>

      <Separator className="mb-4" />

      <div className={styles.settingGroup}>
        <div className={styles.settingGroupLabel}>
          People with access{delegates.length > 0 && ` · ${delegates.length}`}
        </div>

        {delegates.length === 0 ? (
          <div className={styles.emptyState}>
            <Users />
            <p className={styles.emptyText}>No delegates yet</p>
            <p className={styles.emptyHint}>Search above to add people</p>
          </div>
        ) : (
          <div className={styles.userList}>
            {delegates.map((d) => (
              <div key={d.id} className={styles.userRow}>
                <div className={styles.userAvatar}>{getInitials(d.name)}</div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{d.name}</div>
                  <div className={styles.userEmail}>{d.email}</div>
                </div>
                <Select
                  value={d.delegateType || "extended"}
                  onValueChange={(v) => handleType(d.id, v as DelegateType)}
                >
                  <SelectTrigger
                    className={styles.typeSelect}
                    data-type={d.delegateType || "extended"}
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
                  className={styles.removeBtn}
                  onClick={() => handleRemove(d.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Subscribers Tab ───
const SubscribersContent = () => (
  <div>
    <div className={styles.settingGroup}>
      <div className={styles.settingGroupLabel}>Notifications</div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <div className={styles.settingLabel}>Email on template change</div>
          <div className={styles.settingHint}>Notify subscribers when the template is modified</div>
        </div>
        <div className={styles.settingControl}><Switch defaultChecked /></div>
      </div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <div className={styles.settingLabel}>Run completion alerts</div>
          <div className={styles.settingHint}>Alert when a template run finishes</div>
        </div>
        <div className={styles.settingControl}><Switch /></div>
      </div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <div className={styles.settingLabel}>Weekly usage digest</div>
          <div className={styles.settingHint}>Send a weekly summary of template runs and stats</div>
        </div>
        <div className={styles.settingControl}><Switch /></div>
      </div>
    </div>
  </div>
);

// ─── Config Tab ───
const ConfigContent = () => (
  <div>
    <div className={styles.settingGroup}>
      <div className={styles.settingGroupLabel}>General</div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <div className={styles.settingLabel}>Auto-save drafts</div>
          <div className={styles.settingHint}>Automatically save changes as you edit</div>
        </div>
        <div className={styles.settingControl}><Switch defaultChecked /></div>
      </div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <div className={styles.settingLabel}>Version history</div>
          <div className={styles.settingHint}>Keep track of all template revisions</div>
        </div>
        <div className={styles.settingControl}><Switch defaultChecked /></div>
      </div>
    </div>

    <div className={styles.settingGroup}>
      <div className={styles.settingGroupLabel}>Advanced</div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <div className={styles.settingLabel}>API integration</div>
          <div className={styles.settingHint}>Enable external API data fetching for this template</div>
        </div>
        <div className={styles.settingControl}><Switch /></div>
      </div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <div className={styles.settingLabel}>Max concurrent runs</div>
          <div className={styles.settingHint}>Limit simultaneous template executions</div>
        </div>
        <div className={styles.settingControl}>
          <Input type="number" defaultValue={5} className={styles.configInput} style={{ width: 70 }} />
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Panel ───
const CATEGORIES: SettingsCategory[] = [
  { id: "delegates", label: "Delegates", icon: Share2, description: "Manage who can edit and run this template" },
  { id: "subscribers", label: "Subscribers", icon: Bell, description: "Configure notification preferences" },
  { id: "config", label: "Configuration", icon: Wrench, description: "General template settings and preferences" },
];

export const TemplateSettingsPanel = ({
  delegates,
  onDelegatesChange,
  onClose,
}: TemplateSettingsPanelProps) => {
  const [activeCategory, setActiveCategory] = useState("delegates");
  const active = CATEGORIES.find((c) => c.id === activeCategory)!;

  const renderContent = () => {
    switch (activeCategory) {
      case "delegates":
        return <DelegatesContent delegates={delegates} onChange={onDelegatesChange} />;
      case "subscribers":
        return <SubscribersContent />;
      case "config":
        return <ConfigContent />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.panelRoot}>
      {/* Left sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Settings /> Settings
        </div>
        <div className={styles.navList}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className={`${styles.navItem} ${activeCategory === cat.id ? styles.active : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <cat.icon />
              {cat.label}
              {cat.id === "delegates" && delegates.length > 0 && (
                <span className={styles.navBadge}>{delegates.length}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right content */}
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <div className={styles.contentHeaderRow}>
            <div>
              <div className={styles.contentTitle}>{active.label}</div>
              <div className={styles.contentDesc}>{active.description}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className={styles.contentBody}>
          {renderContent()}
        </ScrollArea>
      </div>
    </div>
  );
};
