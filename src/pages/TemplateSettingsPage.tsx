import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Share2, Bell, Wrench, Shield, Palette, ArrowLeft, X, UserPlus, Users, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAutocomplete, User, DelegateType } from "@/components/templates/UserAutocomplete";
import styles from "./TemplateSettingsPage.module.scss";

// ─── Types ───
interface SettingsCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  group: string;
}

const CATEGORIES: SettingsCategory[] = [
  { id: "delegates", label: "Delegates", icon: Share2, description: "Manage who can edit and run this template", group: "Sharing" },
  { id: "subscribers", label: "Subscribers", icon: Bell, description: "Configure notification preferences for template activity", group: "Sharing" },
  { id: "permissions", label: "Permissions", icon: Shield, description: "Control access levels and security settings", group: "Sharing" },
  { id: "config", label: "Configuration", icon: Wrench, description: "General template settings and preferences", group: "Advanced" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Customize the template's visual presentation", group: "Advanced" },
];

const GROUPS = ["Sharing", "Advanced"];

const getInitials = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

// ─── Save Footer per category ───
const CategorySaveFooter = ({ categoryId, onSave }: { categoryId: string; onSave: (id: string) => void }) => {
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    onSave(categoryId);
    setSaved(true);
    toast.success("Settings saved");
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div className={styles.categorySaveFooter}>
      {saved && <span className={styles.savedIndicator}><Check className="h-3.5 w-3.5" /> Saved</span>}
      <Button size="sm" onClick={handleSave}>Save</Button>
    </div>
  );
};

// ─── Delegates ───
const DelegatesContent = ({ delegates, onChange, onSave }: { delegates: User[]; onChange: (d: User[]) => void; onSave: (id: string) => void }) => {
  const [pending, setPending] = useState<User[]>([]);

  const handleAdd = () => {
    const existing = new Set(delegates.map((d) => d.email));
    const fresh = pending.filter((d) => !existing.has(d.email)).map((d) => ({ ...d, delegateType: "extended" as DelegateType }));
    if (fresh.length) onChange([...delegates, ...fresh]);
    setPending([]);
  };

  return (
    <div>
      <div className={styles.settingGroup}>
        <div className={styles.settingGroupLabel}>Add people</div>
        <div className={styles.searchBox}>
          <div className={styles.searchBoxInput}>
            <UserAutocomplete value={pending} onChange={setPending} placeholder="Search by name or email..." />
          </div>
          {pending.length > 0 && (
            <Button size="sm" onClick={handleAdd}>
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          )}
        </div>
      </div>
      <Separator className="mb-5" />
      <div className={styles.settingGroup}>
        <div className={styles.settingGroupLabel}>People with access{delegates.length > 0 && ` · ${delegates.length}`}</div>
        {delegates.length === 0 ? (
          <div className={styles.emptyState}>
            <Users />
            <p className={styles.emptyText}>No delegates yet</p>
            <p className={styles.emptyHint}>Search above to share this template</p>
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
                <Select value={d.delegateType || "extended"} onValueChange={(v) => onChange(delegates.map((x) => (x.id === d.id ? { ...x, delegateType: v as DelegateType } : x)))}>
                  <SelectTrigger className={styles.typeSelect} data-type={d.delegateType || "extended"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="extended">Extended</SelectItem>
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className={styles.removeBtn} onClick={() => onChange(delegates.filter((x) => x.id !== d.id))}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <CategorySaveFooter categoryId="delegates" onSave={onSave} />
    </div>
  );
};

// ─── Subscribers ───
interface Subscriber {
  id: string;
  isDL: boolean;
  dlEmail?: string;
  user?: User;
  subscribeDraft: boolean;
  subscribePublish: boolean;
}

const SubscribersContent = ({ onSave }: { onSave: (id: string) => void }) => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isDL, setIsDL] = useState(false);
  const [dlEmail, setDlEmail] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [subDraft, setSubDraft] = useState(true);
  const [subPublish, setSubPublish] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setIsDL(false);
    setDlEmail("");
    setSelectedUsers([]);
    setSubDraft(true);
    setSubPublish(true);
    setEditingId(null);
  };

  const canAdd = (isDL ? dlEmail.includes("@") : selectedUsers.length > 0) && (subDraft || subPublish);

  const handleAdd = () => {
    if (!canAdd) return;
    if (isDL) {
      const sub: Subscriber = { id: `sub-${Date.now()}`, isDL: true, dlEmail, subscribeDraft: subDraft, subscribePublish: subPublish };
      setSubscribers((prev) => [...prev, sub]);
    } else {
      const newSubs = selectedUsers.map((u) => ({
        id: `sub-${u.id}-${Date.now()}`,
        isDL: false,
        user: u,
        subscribeDraft: subDraft,
        subscribePublish: subPublish,
      }));
      setSubscribers((prev) => [...prev, ...newSubs]);
    }
    resetForm();
    toast.success("Subscriber added");
  };

  const handleDelete = (id: string) => {
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
    toast.success("Subscriber removed");
  };

  const toggleSubField = (id: string, field: "subscribeDraft" | "subscribePublish") => {
    setSubscribers((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: !s[field] };
        if (!updated.subscribeDraft && !updated.subscribePublish) {
          toast.error("At least one subscription type is required");
          return s;
        }
        return updated;
      })
    );
  };

  return (
    <div>
      {/* Add subscriber form */}
      <div className={styles.settingGroup}>
        <div className={styles.settingGroupLabel}>Add Subscriber</div>

        {/* DL toggle */}
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <div className={styles.settingLabel}>Distribution List (DL) Email</div>
            <div className={styles.settingHint}>Toggle on to subscribe a distribution list instead of an individual user</div>
          </div>
          <div className={styles.settingControl}><Switch checked={isDL} onCheckedChange={setIsDL} /></div>
        </div>

        {/* Conditional: DL email or User autocomplete */}
        <div className={styles.subFormField}>
          {isDL ? (
            <div className={styles.dlInputWrapper}>
              <Input
                type="email"
                placeholder="Enter DL email address, e.g. team@company.com"
                value={dlEmail}
                onChange={(e) => setDlEmail(e.target.value)}
                className={styles.dlInput}
              />
              <p className={styles.dlHint}>
                <Mail className="h-3 w-3" />
                All members of this distribution list will receive notifications
              </p>
            </div>
          ) : (
            <div>
              <div className={styles.subFieldLabel}>Select User</div>
              <UserAutocomplete value={selectedUsers} onChange={setSelectedUsers} placeholder="Search by name or email..." />
            </div>
          )}
        </div>

        {/* Subscribe For */}
        <div className={styles.subFormField}>
          <div className={styles.subFieldLabel}>Subscribe For</div>
          <div className={styles.checkboxRow}>
            <label className={styles.checkboxLabel}>
              <Checkbox checked={subDraft} onCheckedChange={(v) => setSubDraft(!!v)} />
              <span>Draft</span>
            </label>
            <label className={styles.checkboxLabel}>
              <Checkbox checked={subPublish} onCheckedChange={(v) => setSubPublish(!!v)} />
              <span>Publish</span>
            </label>
          </div>
        </div>

        {/* Add button */}
        <div className={styles.addSubBtn}>
          <Button size="sm" disabled={!canAdd} onClick={handleAdd}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Subscriber
          </Button>
        </div>
      </div>

      <Separator className="mb-5" />

      {/* Subscriber list */}
      <div className={styles.settingGroup}>
        <div className={styles.settingGroupLabel}>
          Subscribers{subscribers.length > 0 && ` · ${subscribers.length}`}
        </div>
        {subscribers.length === 0 ? (
          <div className={styles.emptyState}>
            <Bell style={{ width: "2rem", height: "2rem" }} />
            <p className={styles.emptyText}>No subscribers yet</p>
            <p className={styles.emptyHint}>Add users or distribution lists to receive template notifications</p>
          </div>
        ) : (
          <div className={styles.subscriberList}>
            {/* Header */}
            <div className={styles.subListHeader}>
              <div className={styles.subListHeaderCell} style={{ flex: 1 }}>Subscriber</div>
              <div className={styles.subListHeaderCell}>Draft</div>
              <div className={styles.subListHeaderCell}>Publish</div>
              <div className={styles.subListHeaderCell} style={{ width: 40 }}></div>
            </div>
            {subscribers.map((sub) => (
              <div key={sub.id} className={styles.subRow}>
                <div className={styles.subRowInfo}>
                  <div className={styles.subRowAvatar} data-dl={sub.isDL}>
                    {sub.isDL ? <Mail className="h-3.5 w-3.5" /> : getInitials(sub.user?.name || "")}
                  </div>
                  <div className={styles.subRowDetails}>
                    <div className={styles.subRowName}>
                      {sub.isDL ? sub.dlEmail : sub.user?.name}
                      {sub.isDL && <span className={styles.dlBadge}>DL</span>}
                    </div>
                    <div className={styles.subRowEmail}>
                      {sub.isDL ? "Distribution List" : sub.user?.email}
                    </div>
                  </div>
                </div>
                <div className={styles.subRowCheck}>
                  <Checkbox checked={sub.subscribeDraft} onCheckedChange={() => toggleSubField(sub.id, "subscribeDraft")} />
                </div>
                <div className={styles.subRowCheck}>
                  <Checkbox checked={sub.subscribePublish} onCheckedChange={() => toggleSubField(sub.id, "subscribePublish")} />
                </div>
                <div className={styles.subRowActions}>
                  <Button variant="ghost" size="icon" className={styles.removeBtn} onClick={() => handleDelete(sub.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <CategorySaveFooter categoryId="subscribers" onSave={onSave} />
    </div>
  );
};

// ─── Permissions ───
const PermissionsContent = ({ onSave }: { onSave: (id: string) => void }) => (
  <div>
    <div className={styles.settingGroup}>
      <div className={styles.settingGroupLabel}>Access control</div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}><div className={styles.settingLabel}>Public template</div><div className={styles.settingHint}>Allow anyone in the organization to view this template</div></div>
        <div className={styles.settingControl}><Switch defaultChecked /></div>
      </div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}><div className={styles.settingLabel}>Allow duplication</div><div className={styles.settingHint}>Let other users duplicate this template for their own use</div></div>
        <div className={styles.settingControl}><Switch defaultChecked /></div>
      </div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}><div className={styles.settingLabel}>Restrict editing</div><div className={styles.settingHint}>Only owner and delegates can edit this template</div></div>
        <div className={styles.settingControl}><Switch defaultChecked /></div>
      </div>
    </div>
    <div className={styles.settingGroup}>
      <div className={styles.settingGroupLabel}>Approval workflow</div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}><div className={styles.settingLabel}>Require approval before run</div><div className={styles.settingHint}>Template runs must be approved by the owner first</div></div>
        <div className={styles.settingControl}><Switch /></div>
      </div>
    </div>
    <CategorySaveFooter categoryId="permissions" onSave={onSave} />
  </div>
);

// ─── Config ───
interface ConfigState {
  autoSave: boolean;
  versionHistory: boolean;
  apiIntegration: boolean;
  maxConcurrentRuns: number;
  timeout: number;
}

const INITIAL_CONFIG: ConfigState = {
  autoSave: true,
  versionHistory: true,
  apiIntegration: false,
  maxConcurrentRuns: 5,
  timeout: 30,
};

const ConfigContent = ({ onSave }: { onSave: (id: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [config, setConfig] = useState<ConfigState>({ ...INITIAL_CONFIG });
  const [savedConfig, setSavedConfig] = useState<ConfigState>({ ...INITIAL_CONFIG });

  const isDirty = JSON.stringify(config) !== JSON.stringify(savedConfig);

  const handleCancel = () => {
    setConfig({ ...savedConfig });
    setEditing(false);
  };

  const handleSubmit = () => {
    if (!isDirty) {
      toast.info("No changes to save — configuration is unchanged");
      return;
    }
    onSave("config");
    setSavedConfig({ ...config });
    setEditing(false);
    toast.success("Configuration saved");
  };

  const update = <K extends keyof ConfigState>(key: K, value: ConfigState[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      {!editing && (
        <div className={styles.editBar}>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Wrench className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
        </div>
      )}
      {editing && (
        <div className={styles.editBar}>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            <Check className="h-3.5 w-3.5 mr-1.5" /> Submit
          </Button>
        </div>
      )}

      <div className={styles.settingGroup}>
        <div className={styles.settingGroupLabel}>General</div>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}><div className={styles.settingLabel}>Auto-save drafts</div><div className={styles.settingHint}>Automatically save changes as you edit</div></div>
          <div className={styles.settingControl}><Switch checked={config.autoSave} onCheckedChange={(v) => update("autoSave", v)} disabled={!editing} /></div>
        </div>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}><div className={styles.settingLabel}>Version history</div><div className={styles.settingHint}>Keep track of all template revisions</div></div>
          <div className={styles.settingControl}><Switch checked={config.versionHistory} onCheckedChange={(v) => update("versionHistory", v)} disabled={!editing} /></div>
        </div>
      </div>
      <div className={styles.settingGroup}>
        <div className={styles.settingGroupLabel}>Execution</div>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}><div className={styles.settingLabel}>API integration</div><div className={styles.settingHint}>Enable external API data fetching</div></div>
          <div className={styles.settingControl}><Switch checked={config.apiIntegration} onCheckedChange={(v) => update("apiIntegration", v)} disabled={!editing} /></div>
        </div>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}><div className={styles.settingLabel}>Max concurrent runs</div><div className={styles.settingHint}>Limit simultaneous template executions</div></div>
          <div className={styles.settingControl}><Input type="number" value={config.maxConcurrentRuns} onChange={(e) => update("maxConcurrentRuns", Number(e.target.value))} className={styles.configInput} style={{ width: 70 }} disabled={!editing} /></div>
        </div>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}><div className={styles.settingLabel}>Timeout (seconds)</div><div className={styles.settingHint}>Maximum execution time per run</div></div>
          <div className={styles.settingControl}><Input type="number" value={config.timeout} onChange={(e) => update("timeout", Number(e.target.value))} className={styles.configInput} style={{ width: 70 }} disabled={!editing} /></div>
        </div>
      </div>
    </div>
  );
};

// ─── Appearance ───
const AppearanceContent = ({ onSave }: { onSave: (id: string) => void }) => (
  <div>
    <div className={styles.settingGroup}>
      <div className={styles.settingGroupLabel}>Email layout</div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}><div className={styles.settingLabel}>Content width</div><div className={styles.settingHint}>Maximum width of the email content area</div></div>
        <div className={styles.settingControl}>
          <Select defaultValue="800">
            <SelectTrigger style={{ width: 120, height: 34, fontSize: "0.8rem" }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="600">600px</SelectItem>
              <SelectItem value="700">700px</SelectItem>
              <SelectItem value="800">800px</SelectItem>
              <SelectItem value="900">900px</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}><div className={styles.settingLabel}>Dark mode support</div><div className={styles.settingHint}>Include dark mode styles for supported email clients</div></div>
        <div className={styles.settingControl}><Switch /></div>
      </div>
    </div>
    <div className={styles.settingGroup}>
      <div className={styles.settingGroupLabel}>Branding</div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}><div className={styles.settingLabel}>Show company logo</div><div className={styles.settingHint}>Display the company logo in header and footer</div></div>
        <div className={styles.settingControl}><Switch defaultChecked /></div>
      </div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}><div className={styles.settingLabel}>Custom footer text</div><div className={styles.settingHint}>Override the default footer with custom content</div></div>
        <div className={styles.settingControl}><Switch /></div>
      </div>
    </div>
    <CategorySaveFooter categoryId="appearance" onSave={onSave} />
  </div>
);

const CONTENT_MAP: Record<string, (props: { delegates: User[]; onChange: (d: User[]) => void; onSave: (id: string) => void }) => React.ReactNode> = {
  delegates: ({ delegates, onChange, onSave }) => <DelegatesContent delegates={delegates} onChange={onChange} onSave={onSave} />,
  subscribers: ({ onSave }) => <SubscribersContent onSave={onSave} />,
  permissions: ({ onSave }) => <PermissionsContent onSave={onSave} />,
  config: ({ onSave }) => <ConfigContent onSave={onSave} />,
  appearance: ({ onSave }) => <AppearanceContent onSave={onSave} />,
};

// ─── Page component ───
export default function TemplateSettingsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("delegates");
  const [delegates, setDelegates] = useState<User[]>([]);
  const active = CATEGORIES.find((c) => c.id === activeCategory)!;

  const handleSaveCategory = useCallback((categoryId: string) => {
    console.log(`Saving settings for category: ${categoryId}`);
    // TODO: integrate with backend API
  }, []);

  return (
    <div className={styles.pageRoot}>
      {/* Left nav */}
      <div className={styles.nav}>
        <div className={styles.navHeader}>
          <Settings /> Template Settings
        </div>
        <div className={styles.navList}>
          {GROUPS.map((group) => (
            <div key={group}>
              <div className={styles.navSectionLabel}>{group}</div>
              {CATEGORIES.filter((c) => c.group === group).map((cat) => (
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
          ))}
        </div>
        <div className={styles.navBackBtn}>
          <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Editor
          </Button>
        </div>
      </div>

      {/* Right content */}
      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <div className={styles.contentTitle}>{active.label}</div>
          <div className={styles.contentDesc}>{active.description}</div>
        </div>
        <div className={styles.contentBody}>
          {CONTENT_MAP[activeCategory]({ delegates, onChange: setDelegates, onSave: handleSaveCategory })}
        </div>
      </div>
    </div>
  );
}
