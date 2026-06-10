import React, { useState, useMemo } from "react";
import { Plus, Users, Trash2, Edit3, X, Search, Lock, Globe, Share2 } from "lucide-react";
import {
  listDistributionLists,
  createDistributionList,
  updateDistributionList,
  deleteDistributionList,
  getUsersByIds,
  type DistributionList,
  type DLVisibility,
  type DLMember,
  type DirectoryUser,
} from "@/lib/distributionListStorage";
import { SharedUserPicker } from "./SharedUserPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import styles from "./DistributionLists.module.scss";

const DEFAULT_PREFIX = "DSPCH-";

interface DraftDL {
  id?: string;
  prefix: string;
  name: string;
  description: string;
  visibility: DLVisibility;
  members: DLMember[];
  sharedWith: string[];
}

const blankDraft = (): DraftDL => ({
  prefix: DEFAULT_PREFIX,
  name: "",
  description: "",
  visibility: "PRIVATE",
  members: [],
  sharedWith: [],
});

export default function DistributionLists() {
  const { toast } = useToast();
  const [lists, setLists] = useState<DistributionList[]>(() => listDistributionLists());
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DraftDL>(blankDraft());
  const [emailInput, setEmailInput] = useState("");
  const [sharedUsers, setSharedUsers] = useState<DirectoryUser[]>([]);

  const refresh = () => setLists(listDistributionLists());

  const filtered = useMemo(() => {
    if (!search.trim()) return lists;
    const q = search.toLowerCase();
    return lists.filter(
      (dl) =>
        dl.displayName.toLowerCase().includes(q) ||
        dl.name.toLowerCase().includes(q) ||
        dl.members.some((m) => m.email.toLowerCase().includes(q)),
    );
  }, [lists, search]);

  const openCreate = () => {
    setDraft(blankDraft());
    setEmailInput("");
    setSharedUsers([]);
    setDialogOpen(true);
  };

  const openEdit = (dl: DistributionList) => {
    setDraft({
      id: dl.id,
      prefix: dl.prefix,
      name: dl.name,
      description: dl.description ?? "",
      visibility: dl.visibility,
      members: [...dl.members],
      sharedWith: [...dl.sharedWith],
    });
    setEmailInput("");
    setSharedUsers(getUsersByIds(dl.sharedWith));
    setDialogOpen(true);
  };

  const addEmails = (raw: string) => {
    const emails = raw
      .split(/[,;\s\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (emails.length === 0) return;
    const existing = new Set(draft.members.map((m) => m.email));
    const fresh = emails
      .filter((e) => !existing.has(e))
      .map<DLMember>((email) => ({ email }));
    setDraft({ ...draft, members: [...draft.members, ...fresh] });
    setEmailInput("");
  };

  const removeMember = (email: string) => {
    setDraft({ ...draft, members: draft.members.filter((m) => m.email !== email) });
  };

  const save = () => {
    const effectiveSharedWith =
      draft.visibility === "SHARED" ? sharedUsers.map((u) => u.id) : [];
    try {
      if (draft.id) {
        updateDistributionList(draft.id, {
          name: draft.name,
          prefix: draft.prefix,
          description: draft.description,
          visibility: draft.visibility,
          members: draft.members,
          sharedWith: effectiveSharedWith,
        });
        toast({ title: "Distribution list updated" });
      } else {
        createDistributionList({
          name: draft.name,
          prefix: draft.prefix,
          description: draft.description,
          visibility: draft.visibility,
          members: draft.members,
          sharedWith: effectiveSharedWith,
        });
        toast({ title: "Distribution list created" });
      }
      setDialogOpen(false);
      refresh();
    } catch (err) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const remove = (dl: DistributionList) => {
    if (!confirm(`Delete distribution list "${dl.displayName}"?`)) return;
    deleteDistributionList(dl.id);
    refresh();
    toast({ title: "Distribution list deleted" });
  };

  const visIcon = (v: DLVisibility) =>
    v === "PRIVATE" ? <Lock size={12} /> : v === "PUBLIC" ? <Globe size={12} /> : <Share2 size={12} />;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Distribution Lists</h1>
          <p className={styles.subtitle}>
            Create reusable groups of recipients with the{" "}
            <code className={styles.codeChip}>{DEFAULT_PREFIX}</code> prefix. Use them anywhere in
            Run Templates To / CC / BCC.
          </p>
        </div>
        <Button onClick={openCreate} className={styles.newBtn}>
          <Plus size={16} /> New Distribution List
        </Button>
      </header>

      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, DSPCH- prefix, or member email..."
          className={styles.searchInput}
        />
      </div>

      <div className={styles.grid}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <Users size={32} className={styles.emptyIcon} />
            <p>No distribution lists yet.</p>
            <Button variant="outline" onClick={openCreate}>
              Create your first DL
            </Button>
          </div>
        ) : (
          filtered.map((dl) => (
            <div key={dl.id} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.dlName}>
                  <Users size={14} className={styles.dlNameIcon} />
                  {dl.displayName}
                </span>
                <span className={styles.vis}>
                  {visIcon(dl.visibility)} {dl.visibility.toLowerCase()}
                </span>
              </div>

              {dl.description && <p className={styles.desc}>{dl.description}</p>}

              <div className={styles.memberCount}>
                {dl.members.length} member{dl.members.length === 1 ? "" : "s"}
              </div>

              <ul className={styles.memberPreview}>
                {dl.members.slice(0, 4).map((m) => (
                  <li key={m.email}>{m.email}</li>
                ))}
                {dl.members.length > 4 && <li className={styles.more}>+{dl.members.length - 4} more</li>}
              </ul>

              <div className={styles.cardActions}>
                <button className={styles.actionBtn} onClick={() => openEdit(dl)}>
                  <Edit3 size={14} /> Edit
                </button>
                <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => remove(dl)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={styles.dialog}>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Distribution List" : "New Distribution List"}</DialogTitle>
          </DialogHeader>

          <div className={styles.dialogBody}>
            <div className={styles.field}>
              <Label>Display Preview</Label>
              <div className={styles.previewBox}>
                <Users size={14} />
                <strong>
                  {draft.prefix}
                  {draft.name || "<name>"}
                </strong>
                <span className={styles.previewCount}>{draft.members.length} members</span>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field} style={{ flex: 1 }}>
                <Label>Name *</Label>
                <div className={styles.prefixedInput}>
                  <span className={styles.prefixAddon}>{draft.prefix}</span>
                  <Input
                    value={draft.name}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^A-Za-z0-9]/g, "");
                      setDraft({ ...draft, name: cleaned });
                    }}
                    placeholder="TeamAlpha"
                    className={styles.prefixedInputControl}
                    maxLength={50}
                  />
                </div>
                {(() => {
                  const trimmed = draft.name.trim();
                  const dupe =
                    trimmed &&
                    lists.some(
                      (l) =>
                        l.id !== draft.id &&
                        l.name.toLowerCase() === trimmed.toLowerCase(),
                    );
                  if (dupe) {
                    return <span className={styles.fieldError}>This name is already in use.</span>;
                  }
                  return (
                    <span className={styles.fieldHint}>
                      Letters and numbers only — no spaces or special characters. Must be unique.
                    </span>
                  );
                })()}
              </div>
            </div>


            <div className={styles.field}>
              <Label>Description</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>

            <div className={styles.field}>
              <Label>Visibility</Label>
              <Select
                value={draft.visibility}
                onValueChange={(v) => setDraft({ ...draft, visibility: v as DLVisibility })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Private — only you can use</SelectItem>
                  <SelectItem value="SHARED">Shared — visible to selected users</SelectItem>
                  <SelectItem value="PUBLIC">Public — visible to everyone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {draft.visibility === "SHARED" && (
              <div className={styles.field}>
                <Label>Share with users *</Label>
                <SharedUserPicker
                  selected={sharedUsers}
                  onChange={setSharedUsers}
                />
                {sharedUsers.length === 0 ? (
                  <span className={styles.fieldError}>
                    Select at least one user — only they will see this list in Run Templates.
                  </span>
                ) : (
                  <span className={styles.fieldHint}>
                    {sharedUsers.length} user{sharedUsers.length === 1 ? "" : "s"} will be able to
                    pick this DL in To / CC / BCC.
                  </span>
                )}
              </div>
            )}

            <div className={styles.field}>
              <Label>Members ({draft.members.length})</Label>
              <Textarea
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onBlur={() => emailInput && addEmails(emailInput)}
                placeholder={
                  "Paste or type email addresses separated by commas, semicolons, spaces, or new lines.\n" +
                  "e.g. alice@company.com, bob@company.com; carol@company.com"
                }
                rows={4}
              />
              <span className={styles.fieldHint}>
                Emails are parsed when you click outside the box. Invalid entries are ignored.
              </span>
              <div className={styles.memberChips}>
                {draft.members.map((m) => (
                  <span key={m.email} className={styles.memberChip}>
                    {m.email}
                    <button onClick={() => removeMember(m.email)} aria-label={`Remove ${m.email}`}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={draft.visibility === "SHARED" && sharedUsers.length === 0}
            >
              {draft.id ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
