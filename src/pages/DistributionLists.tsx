import React, { useState, useMemo, useEffect } from "react";
import { Plus, Users, Trash2, Edit3, X, Search, Lock, Globe, ShieldCheck } from "lucide-react";
import {
  listDistributionLists,
  listDistributionListsPaged,
  createDistributionList,
  updateDistributionList,
  deleteDistributionList,
  getUsersByIds,
  toSharedRef,
  parseMembersRaw,
  canManageDL,
  type DistributionList,
  type DLVisibility,
  type DLVisibilityFilter,
  type DLMember,
  type DirectoryUser,
  type SharedUserRef,
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
  distributionListId?: string;
  prefix: string;
  name: string;
  description: string;
  visibility: DLVisibility;
  toRaw: string;
  ccRaw: string;
  bccRaw: string;
  managers: SharedUserRef[];
}

const blankDraft = (): DraftDL => ({
  prefix: DEFAULT_PREFIX,
  name: "",
  description: "",
  visibility: "PRIVATE",
  toRaw: "",
  ccRaw: "",
  bccRaw: "",
  managers: [],
});

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

export default function DistributionLists() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<DLVisibilityFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DraftDL>(blankDraft());
  const [managerUsers, setManagerUsers] = useState<DirectoryUser[]>([]);

  const toMembers   = useMemo<DLMember[]>(() => parseMembersRaw(draft.toRaw),  [draft.toRaw]);
  const ccMembers   = useMemo<DLMember[]>(() => parseMembersRaw(draft.ccRaw),  [draft.ccRaw]);
  const bccMembers  = useMemo<DLMember[]>(() => parseMembersRaw(draft.bccRaw), [draft.bccRaw]);
  const totalMembers = toMembers.length + ccMembers.length + bccMembers.length;

  useEffect(() => {
    setPage(1);
  }, [search, visibilityFilter, pageSize]);

  const paged = useMemo(
    () => listDistributionListsPaged({ page, pageSize, visibility: visibilityFilter, search }),
    [page, pageSize, visibilityFilter, search, refreshKey],
  );
  const lists = paged.items;
  const allLists = useMemo(() => listDistributionLists(), [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const openCreate = () => {
    setDraft(blankDraft());
    setManagerUsers([]);
    setDialogOpen(true);
  };

  const openEdit = (dl: DistributionList) => {
    setDraft({
      distributionListId: dl.distributionListId,
      prefix: dl.prefix,
      name: dl.name,
      description: dl.description ?? "",
      visibility: dl.visibility,
      toRaw: dl.toRaw,
      ccRaw: dl.ccRaw,
      bccRaw: dl.bccRaw,
      managers: [...dl.managers],
    });
    setManagerUsers(getUsersByIds(dl.managers.map((s) => s.userId)));
    setDialogOpen(true);
  };

  const removeFromBucket = (bucket: "toRaw" | "ccRaw" | "bccRaw", email: string) => {
    const next = draft[bucket]
      .split(/([,;:\s\n]+)/)
      .filter((tok) => tok.trim().toLowerCase() !== email)
      .join("")
      .replace(/^[,;:\s\n]+|[,;:\s\n]+$/g, "");
    setDraft({ ...draft, [bucket]: next });
  };

  const save = () => {
    try {
      const payload = {
        name: draft.name,
        prefix: draft.prefix,
        description: draft.description,
        visibility: draft.visibility,
        toRaw: draft.toRaw,
        ccRaw: draft.ccRaw,
        bccRaw: draft.bccRaw,
        managers: managerUsers.map(toSharedRef),
      };
      if (draft.distributionListId) {
        updateDistributionList(draft.distributionListId, payload);
        toast({ title: "Distribution list updated" });
      } else {
        createDistributionList(payload);
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
    try {
      deleteDistributionList(dl.distributionListId);
      refresh();
      toast({ title: "Distribution list deleted" });
    } catch (err) {
      toast({
        title: "Failed to delete",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const visIcon = (v: DLVisibility) =>
    v === "PRIVATE" ? <Lock size={12} /> : <Globe size={12} />;

  const renderChips = (bucket: "toRaw" | "ccRaw" | "bccRaw", members: DLMember[]) => (
    <div className={styles.memberChips}>
      {members.map((m) => (
        <span key={m.email} className={styles.memberChip}>
          {m.email}
          <button onClick={() => removeFromBucket(bucket, m.email)} aria-label={`Remove ${m.email}`}>
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Distribution Lists</h1>
          <p className={styles.subtitle}>
            Create reusable groups of recipients with the{" "}
            <code className={styles.codeChip}>{DEFAULT_PREFIX}</code> prefix. Split members into
            To / CC / BCC and grant edit access to additional managers.
          </p>
        </div>
        <Button onClick={openCreate} className={styles.newBtn}>
          <Plus size={16} /> New Distribution List
        </Button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <Search size={16} className={styles.searchIcon} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, DSPCH- prefix, or member email..."
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterTabs} role="tablist" aria-label="Visibility filter">
          {(["ALL", "PUBLIC", "PRIVATE"] as DLVisibilityFilter[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={visibilityFilter === v}
              className={`${styles.filterTab} ${visibilityFilter === v ? styles.filterTabActive : ""}`}
              onClick={() => setVisibilityFilter(v)}
            >
              {v === "ALL" ? <Users size={12} /> : v === "PUBLIC" ? <Globe size={12} /> : <Lock size={12} />}
              <span>{v.charAt(0) + v.slice(1).toLowerCase()}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.resultsBar}>
        <span className={styles.resultsCount}>
          {paged.total === 0
            ? "No results"
            : `Showing ${(paged.page - 1) * paged.pageSize + 1}–${Math.min(paged.page * paged.pageSize, paged.total)} of ${paged.total}`}
        </span>
      </div>

      <div className={styles.grid}>
        {lists.length === 0 ? (
          <div className={styles.empty}>
            <Users size={32} className={styles.emptyIcon} />
            <p>No distribution lists match your filters.</p>
            <Button variant="outline" onClick={openCreate}>
              Create your first DL
            </Button>
          </div>
        ) : (
          lists.map((dl) => {
            const memberCount = dl.toMembers.length + dl.ccMembers.length + dl.bccMembers.length;
            const canEdit = canManageDL(dl);
            return (
              <div key={dl.distributionListId} className={styles.card}>
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
                  {memberCount} member{memberCount === 1 ? "" : "s"}
                  {" · "}To {dl.toMembers.length}
                  {" / CC "}{dl.ccMembers.length}
                  {" / BCC "}{dl.bccMembers.length}
                </div>

                {dl.managers.length > 0 && (
                  <div className={styles.managerBadge}>
                    <ShieldCheck size={11} /> {dl.managers.length} manager{dl.managers.length === 1 ? "" : "s"}
                  </div>
                )}

                <ul className={styles.memberPreview}>
                  {[...dl.toMembers, ...dl.ccMembers, ...dl.bccMembers].slice(0, 4).map((m) => (
                    <li key={m.email}>{m.email}</li>
                  ))}
                  {memberCount > 4 && <li className={styles.more}>+{memberCount - 4} more</li>}
                </ul>

                <div className={styles.cardActions}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => openEdit(dl)}
                    disabled={!canEdit}
                    title={canEdit ? "" : "Only the owner and managers can edit"}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.danger}`}
                    onClick={() => remove(dl)}
                    disabled={!canEdit}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {paged.total > 0 && (
        <div className={styles.pagination}>
          <div className={styles.pageSizeWrap}>
            <Label className={styles.pageSizeLabel}>Per page</Label>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className={styles.pageSizeTrigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={styles.pageNav}>
            <button
              className={styles.pageBtn}
              disabled={paged.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>
              Page {paged.page} of {paged.totalPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={paged.page >= paged.totalPages}
              onClick={() => setPage((p) => Math.min(paged.totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={styles.dialog}>
          <DialogHeader>
            <DialogTitle>{draft.distributionListId ? "Edit Distribution List" : "New Distribution List"}</DialogTitle>
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
                <span className={styles.previewCount}>{totalMembers} members</span>
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
                    allLists.some(
                      (l) =>
                        l.distributionListId !== draft.distributionListId &&
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
                  <SelectItem value="PRIVATE">Private — only you (and managers) can see / use</SelectItem>
                  <SelectItem value="PUBLIC">Public — visible to everyone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={styles.field}>
              <Label>Managers (optional)</Label>
              <SharedUserPicker
                selected={managerUsers}
                onChange={setManagerUsers}
                placeholder="Search users to add as managers (can edit / delete)..."
              />
              <span className={styles.fieldHint}>
                Managers can edit and delete this list alongside you, regardless of visibility.
              </span>
            </div>

            <div className={styles.field}>
              <Label>To ({toMembers.length})</Label>
              <Textarea
                value={draft.toRaw}
                onChange={(e) => setDraft({ ...draft, toRaw: e.target.value })}
                placeholder="alice@company.com, bob@company.com"
                rows={3}
              />
              {renderChips("toRaw", toMembers)}
            </div>

            <div className={styles.field}>
              <Label>CC ({ccMembers.length})</Label>
              <Textarea
                value={draft.ccRaw}
                onChange={(e) => setDraft({ ...draft, ccRaw: e.target.value })}
                placeholder="carol@company.com"
                rows={2}
              />
              {renderChips("ccRaw", ccMembers)}
            </div>

            <div className={styles.field}>
              <Label>BCC ({bccMembers.length})</Label>
              <Textarea
                value={draft.bccRaw}
                onChange={(e) => setDraft({ ...draft, bccRaw: e.target.value })}
                placeholder="dan@company.com"
                rows={2}
              />
              {renderChips("bccRaw", bccMembers)}
              <span className={styles.fieldHint}>
                Accepts <code>, ; : space newline</code> as separators. Invalid entries are ignored in the chip preview.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={
                !draft.name.trim() ||
                totalMembers === 0 ||
                allLists.some(
                  (l) =>
                    l.distributionListId !== draft.distributionListId &&
                    l.name.toLowerCase() === draft.name.trim().toLowerCase(),
                )
              }
            >
              {draft.distributionListId ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
