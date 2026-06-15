import { useMemo, useState } from "react";
import { Plus, Search, Network, RefreshCw, Pencil, Trash2, Globe2, Lock, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  listStandardDLs, deleteStandardDL, listRoles, roleLabel,
  computeRefreshDiff, applyRefresh,
  type StandardDistributionList,
} from "@/lib/standardDistributionListStorage";
import { StandardDLWizard } from "@/components/standardDL/StandardDLWizard";
import styles from "./StandardDistributionLists.module.scss";

export default function StandardDistributionListsPage() {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<StandardDistributionList | null>(null);
  const [refreshing, setRefreshing] = useState<StandardDistributionList | null>(null);

  const all = useMemo(() => listStandardDLs(), [tick]);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return all;
    return all.filter((d) =>
      d.name.toLowerCase().includes(s) ||
      d.lobLabel.toLowerCase().includes(s) ||
      d.cioDirectName.toLowerCase().includes(s),
    );
  }, [all, search]);

  const onDelete = (dl: StandardDistributionList) => {
    if (!confirm(`Delete "${dl.name}"?`)) return;
    deleteStandardDL(dl.id);
    toast({ title: "Deleted" });
    refresh();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Network className="h-5 w-5" /> Standard DLs
          </h1>
          <p className={styles.subtitle}>
            Smart distribution lists auto-built from LOB + CIO org structure. Admins pick an LOB and a CIO direct, then choose recipients from the org roster grouped by role.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setWizardOpen(true); }} className={styles.newBtn}>
          <Plus className="h-4 w-4 mr-1" /> New Standard DL
        </Button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <Search className={styles.searchIcon} size={16} />
          <Input
            className={styles.searchInput}
            placeholder="Search by name, LOB, or CIO…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <Network className="h-8 w-8" />
          <div>No Standard DLs yet.</div>
          <Button variant="outline" size="sm" onClick={() => { setEditing(null); setWizardOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Create your first
          </Button>
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map((dl) => {
            const byRole = new Map<string, number>();
            const byBucket = { TO: 0, CC: 0, BCC: 0 };
            for (const m of dl.members) {
              byRole.set(m.role, (byRole.get(m.role) ?? 0) + 1);
              byBucket[m.bucket]++;
            }
            return (
              <li key={dl.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <div className={styles.itemTop}>
                    <span className={styles.dlName}>
                      <Network className={styles.dlIcon} size={16} /> {dl.name}
                    </span>
                    <Badge variant="secondary" className={styles.vis}>
                      {dl.visibility === "PUBLIC" ? <Globe2 size={11} /> : <Lock size={11} />}
                      {dl.visibility.toLowerCase()}
                    </Badge>
                    <span className={styles.org}>
                      <Building2 size={11} /> {dl.lob} · CIO: {dl.cioDirectName}
                    </span>
                  </div>
                  {dl.description && <div className={styles.desc}>{dl.description}</div>}
                  <div className={styles.meta}>
                    <span><strong>{dl.members.length}</strong> members</span>
                    <span>· To {byBucket.TO} / CC {byBucket.CC} / BCC {byBucket.BCC}</span>
                    {dl.lastRefreshedAt && (
                      <span>· Refreshed {new Date(dl.lastRefreshedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className={styles.roleChips}>
                    {listRoles().map((r) => {
                      const n = byRole.get(r.code) ?? 0;
                      if (!n) return null;
                      return <Badge key={r.code} variant="outline" className={styles.roleChip}>{r.label}: {n}</Badge>;
                    })}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <Button size="sm" variant="ghost" onClick={() => setRefreshing(dl)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(dl); setWizardOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className={styles.danger} onClick={() => onDelete(dl)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <StandardDLWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={refresh}
        initial={editing}
      />

      {refreshing && (
        <RefreshDiffDialog
          dl={refreshing}
          onClose={() => setRefreshing(null)}
          onApplied={() => { setRefreshing(null); refresh(); }}
        />
      )}
    </div>
  );
}

/* ---------- Refresh diff confirm dialog ---------- */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

function RefreshDiffDialog({
  dl, onClose, onApplied,
}: { dl: StandardDistributionList; onClose: () => void; onApplied: () => void }) {
  const diff = useMemo(() => computeRefreshDiff(dl), [dl]);
  const [keepRemoved, setKeepRemoved] = useState(false);
  const [addedSelected, setAddedSelected] = useState<Set<string>>(new Set());

  const toggleAdded = (key: string) => {
    setAddedSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const allAddedKeys = diff.added.map((m) => `${m.lanid}::${m.role}`);
  const allAddedOn = allAddedKeys.length > 0 && allAddedKeys.every((k) => addedSelected.has(k));

  const apply = () => {
    const toApply = diff.added.filter((m) => addedSelected.has(`${m.lanid}::${m.role}`));
    applyRefresh(dl.id, keepRemoved, toApply);
    toast({ title: "Refreshed from source" });
    onApplied();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: 640 }}>
        <DialogHeader>
          <DialogTitle>Refresh "{dl.name}" from source</DialogTitle>
        </DialogHeader>
        <div style={{ maxHeight: "55vh", overflowY: "auto", padding: "0.25rem", fontSize: "0.8125rem" }}>
          <p style={{ color: "#475569", marginBottom: "0.75rem" }}>
            Comparing saved members against the latest org roster for <strong>{dl.lob}</strong> / <strong>{dl.cioDirectName}</strong>.
          </p>

          <section style={{ marginBottom: "1rem" }}>
            <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.8125rem", color: "#047857" }}>
              Added in source ({diff.added.length})
            </h4>
            {diff.added.length === 0 ? <em style={{ color: "#94a3b8" }}>None</em> : (
              <>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: "0.75rem" }}>
                  <Checkbox
                    checked={allAddedOn}
                    onCheckedChange={(v) => setAddedSelected(v ? new Set(allAddedKeys) : new Set())}
                  />
                  Select all to add
                </label>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {diff.added.map((m) => {
                    const k = `${m.lanid}::${m.role}`;
                    return (
                      <li key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.25rem 0" }}>
                        <Checkbox checked={addedSelected.has(k)} onCheckedChange={() => toggleAdded(k)} />
                        <span>{m.name}</span>
                        <Badge variant="outline">{roleLabel(m.role)}</Badge>
                        <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>{m.email}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          <section style={{ marginBottom: "1rem" }}>
            <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.8125rem", color: "#b91c1c" }}>
              Removed from source ({diff.removed.length})
            </h4>
            {diff.removed.length === 0 ? <em style={{ color: "#94a3b8" }}>None</em> : (
              <>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: "0.75rem" }}>
                  <Checkbox checked={keepRemoved} onCheckedChange={(v) => setKeepRemoved(!!v)} />
                  Keep these members anyway
                </label>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {diff.removed.map((m) => (
                    <li key={`${m.lanid}::${m.role}`} style={{ padding: "0.2rem 0" }}>
                      {m.name} <Badge variant="outline">{roleLabel(m.role)}</Badge> <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>{m.email}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section>
            <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.8125rem", color: "#475569" }}>
              Unchanged ({diff.unchanged.length})
            </h4>
          </section>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={apply}>Apply changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
