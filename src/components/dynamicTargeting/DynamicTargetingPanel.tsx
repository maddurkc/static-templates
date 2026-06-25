/**
 * DynamicTargetingPanel — DL drawer · Tab 2
 *
 * Layout (top → bottom, no wasted space):
 *  1. Sticky header strip — "Selected recipients" pills (To/Cc/Bcc counts +
 *     truncated name list). Always visible so the user can see the impact
 *     of every click without scrolling.
 *  2. Three compact selectors on ONE row: LOB · Apps (multi popover) · CIO.
 *  3. Role sections — each row is a single line:
 *        [✓ Role name (n)] [ TO | CC | BCC ] [chevron]
 *     Clicking a bucket pill toggles ALL members of the role into that
 *     bucket (1 click, no separate "select all" checkbox). Clicking again
 *     turns the role OFF. Chevron expands an inline filter + per-user
 *     row for granular control.
 *  4. Sticky footer — Cancel · Apply.
 *
 * Emits the same DynamicTargetingPayload contract documented in
 * DYNAMIC_TARGETING_FRONTEND.md.
 */

import { useEffect, useMemo, useState } from "react";
import {
  DT_ROLES, DTBucket, DTRoleCode, DTRoster, DynamicTargetingPayload,
  fetchDynamicRoster, listAppsForLOB, listCIODirectsForLOB, listLOBs,
  OrgUser,
} from "@/lib/dynamicTargetingData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Search, X,
} from "lucide-react";


export interface DynamicTargetingResolved {
  to:  { email: string; name?: string }[];
  cc:  { email: string; name?: string }[];
  bcc: { email: string; name?: string }[];
}

interface Props {
  initial?: DynamicTargetingPayload | null;
  onApply: (payload: DynamicTargetingPayload, resolved: DynamicTargetingResolved) => void;
  onClose?: () => void;
}

type SectionMode = "OFF" | "ALL" | "FILTERED";

interface SectionState {
  mode: SectionMode;
  bucket: DTBucket;                      // when ALL
  userBuckets: Record<string, DTBucket>; // when FILTERED
  userChecked: Record<string, boolean>;  // when FILTERED
  filter: string;
  expanded: boolean;
}

const emptySection = (): SectionState => ({
  mode: "OFF", bucket: "TO",
  userBuckets: {}, userChecked: {},
  filter: "", expanded: false,
});

const BUCKETS: DTBucket[] = ["TO", "CC", "BCC"];

export default function DynamicTargetingPanel({ initial, onApply, onClose }: Props) {
  const [lob, setLob]             = useState<string>(initial?.lob ?? "");
  const [apps, setApps]           = useState<string[]>(initial?.apps ?? []);
  const [cioDirect, setCioDirect] = useState<string>(initial?.cioDirect ?? "");

  const [sections, setSections] = useState<Record<DTRoleCode, SectionState>>(() => {
    const init: any = {};
    DT_ROLES.forEach(r => init[r.code] = emptySection());
    if (initial?.sections) {
      Object.entries(initial.sections).forEach(([code, sel]) => {
        const s = emptySection();
        if (sel?.mode === "ALL") { s.mode = "ALL"; s.bucket = sel.bucket; }
        else if (sel?.mode === "FILTERED") {
          s.mode = "FILTERED"; s.expanded = true;
          sel.users.forEach(u => {
            s.userChecked[u.email] = true;
            s.userBuckets[u.email] = u.bucket;
          });
        }
        init[code] = s;
      });
    }
    return init;
  });

  const lobs    = useMemo(() => listLOBs(), []);
  const appOpts = useMemo(() => listAppsForLOB(lob), [lob]);
  const cioOpts = useMemo(() => listCIODirectsForLOB(lob), [lob]);

  useEffect(() => {
    if (!lob) return;
    setApps((cur) => cur.filter(a => appOpts.some(o => o.code === a)));
    if (cioDirect && !cioOpts.some(c => c.code === cioDirect)) setCioDirect("");
  }, [lob]); // eslint-disable-line react-hooks/exhaustive-deps

  const roster: DTRoster = useMemo(
    () => lob ? fetchDynamicRoster(lob, apps, cioDirect) : ({} as DTRoster),
    [lob, apps, cioDirect],
  );

  const updateSection = (code: DTRoleCode, mut: (s: SectionState) => SectionState) =>
    setSections(cur => ({ ...cur, [code]: mut(cur[code]) }));

  const toggleApp = (code: string) =>
    setApps(cur => cur.includes(code) ? cur.filter(a => a !== code) : [...cur, code]);

  /** Click a role's TO/CC/BCC pill → ALL members into that bucket; click same again → OFF. */
  const cycleRoleBucket = (code: DTRoleCode, bucket: DTBucket) => {
    updateSection(code, s => {
      if (s.mode === "ALL" && s.bucket === bucket) return { ...s, mode: "OFF" };
      return { ...s, mode: "ALL", bucket };
    });
  };

  /** Remove a single user from a role's selection (works in ALL or FILTERED mode). */
  const removeUser = (code: DTRoleCode, email: string) => {
    updateSection(code, st => {
      const users = roster[code] || [];
      if (st.mode === "ALL") {
        // Convert to FILTERED with everyone checked except this one.
        const userChecked: Record<string, boolean> = {};
        const userBuckets: Record<string, DTBucket> = {};
        users.forEach(u => {
          userChecked[u.email] = u.email !== email;
          userBuckets[u.email] = st.bucket;
        });
        return { ...st, mode: "FILTERED", userChecked, userBuckets };
      }
      if (st.mode === "FILTERED") {
        return {
          ...st,
          userChecked: { ...st.userChecked, [email]: false },
        };
      }
      return st;
    });
  };

  /* live preview & resolved (with role tagging for the summary UI) */
  type ResolvedItem = { email: string; name?: string; roleCode: DTRoleCode; roleLabel: string };
  const grouped = useMemo(() => {
    const out: Record<DTBucket, ResolvedItem[]> = { TO: [], CC: [], BCC: [] };
    const seen = { TO: new Set<string>(), CC: new Set<string>(), BCC: new Set<string>() };
    DT_ROLES.forEach(({ code, label }) => {
      const s = sections[code];
      const users = roster[code] || [];
      const push = (b: DTBucket, u: OrgUser) => {
        const key = u.email.toLowerCase();
        if (seen[b].has(key)) return;
        seen[b].add(key);
        out[b].push({ email: u.email, name: u.name, roleCode: code, roleLabel: label });
      };
      if (s.mode === "ALL") users.forEach(u => push(s.bucket, u));
      else if (s.mode === "FILTERED")
        users.forEach(u => { if (s.userChecked[u.email]) push(s.userBuckets[u.email] || "TO", u); });
    });
    return out;
  }, [sections, roster]);

  const resolved = useMemo<DynamicTargetingResolved>(() => ({
    to:  grouped.TO.map(i  => ({ email: i.email, name: i.name })),
    cc:  grouped.CC.map(i  => ({ email: i.email, name: i.name })),
    bcc: grouped.BCC.map(i => ({ email: i.email, name: i.name })),
  }), [grouped]);

  const buildPayload = (): DynamicTargetingPayload => {
    const out: DynamicTargetingPayload = { lob, apps, cioDirect, sections: {} };
    DT_ROLES.forEach(({ code }) => {
      const s = sections[code];
      const users = roster[code] || [];
      if (s.mode === "ALL" && users.length > 0) {
        out.sections[code] = { mode: "ALL", bucket: s.bucket };
      } else if (s.mode === "FILTERED") {
        const picked = users
          .filter(u => s.userChecked[u.email])
          .map(u => ({ email: u.email, bucket: s.userBuckets[u.email] || "TO" as DTBucket }));
        if (picked.length > 0) out.sections[code] = { mode: "FILTERED", users: picked };
      }
    });
    return out;
  };

  const totalSelected = resolved.to.length + resolved.cc.length + resolved.bcc.length;
  const canApply = !!lob && totalSelected > 0;

  const apply = () => {
    if (!canApply) return;
    onApply(buildPayload(), resolved);
    onClose?.();
  };

  const resetAll = () => {
    const init: any = {};
    DT_ROLES.forEach(r => init[r.code] = emptySection());
    setSections(init);
  };


  /* ---------- render ---------- */
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 1. STICKY top — selected recipients summary */}
      <div className="border border-border rounded-md bg-gradient-to-b from-muted/60 to-muted/20 p-2.5 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Selected recipients
          </div>
          {totalSelected > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
            >
              <X size={10} /> reset
            </button>
          )}
        </div>
        <SummaryRow label="To"  bucket="TO"  items={resolved.to}  />
        <SummaryRow label="Cc"  bucket="CC"  items={resolved.cc}  />
        <SummaryRow label="Bcc" bucket="BCC" items={resolved.bcc} />
      </div>

      {/* 2. Compact selectors row — LOB · Apps · CIO */}
      <div className="grid grid-cols-3 gap-2 mt-3 shrink-0">
        <CompactSelect
          label="LOB"
          value={lob}
          onChange={setLob}
          placeholder="Select"
          options={lobs.map(l => ({ value: l.code, label: l.label }))}
        />
        <AppsMultiSelect
          label="Applications"
          disabled={!lob}
          options={appOpts}
          value={apps}
          onToggle={toggleApp}
        />
        <CompactSelect
          label="CIO Direct"
          value={cioDirect}
          onChange={setCioDirect}
          placeholder="Select"
          disabled={!lob}
          options={cioOpts.map(c => ({ value: c.code, label: c.label }))}
        />
      </div>

      {/* 3. Role sections (scrollable) */}
      <div className="mt-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Roles
          </div>
          <div className="text-[10px] text-muted-foreground">
            click <span className="font-semibold">TO/CC/BCC</span> to assign all · ⌄ to pick individuals
          </div>
        </div>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1.5 pb-2">
            {!lob && (
              <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-md">
                Select a LOB to load the org roster.
              </div>
            )}
            {lob && DT_ROLES.map(({ code, label }) => {
              const s = sections[code];
              const users = roster[code] || [];
              const filtered = s.filter
                ? users.filter(u =>
                    u.name.toLowerCase().includes(s.filter.toLowerCase()) ||
                    u.email.toLowerCase().includes(s.filter.toLowerCase()))
                : users;

              const selectedCount = s.mode === "ALL" ? users.length
                : s.mode === "FILTERED" ? Object.values(s.userChecked).filter(Boolean).length
                : 0;

              return (
                <div
                  key={code}
                  className={`border rounded-md transition-colors ${
                    selectedCount > 0 ? "border-primary/40 bg-primary/[0.03]" : "border-border"
                  }`}
                >
                  {/* row header — single line */}
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => updateSection(code, st => ({ ...st, expanded: !st.expanded }))}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      aria-label="Expand"
                    >
                      {s.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{label}</span>
                      <span className="text-[10px] text-muted-foreground">({users.length})</span>
                      {selectedCount > 0 && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          {selectedCount} selected
                        </Badge>
                      )}
                    </div>
                    {/* one-click bucket pills */}
                    <div className="flex items-center gap-0.5 shrink-0" role="group">
                      {BUCKETS.map(b => {
                        const active = s.mode === "ALL" && s.bucket === b;
                        return (
                          <button
                            key={b}
                            type="button"
                            disabled={users.length === 0}
                            onClick={() => cycleRoleBucket(code, b)}
                            title={active ? `All in ${b} — click to clear` : `Put all in ${b}`}
                            className={`text-[10px] font-bold px-1.5 h-5 rounded border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {b}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* expanded: filter + individual rows */}
                  {s.expanded && (
                    <div className="border-t border-border px-2 py-2 space-y-1.5">
                      <div className="relative">
                        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={s.filter}
                          onChange={(e) => updateSection(code, st => ({ ...st, filter: e.target.value }))}
                          placeholder="Search name or email…"
                          className="h-7 text-xs pl-7"
                        />
                      </div>
                      {filtered.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground py-2 text-center">No users.</div>
                      ) : (
                        <div className="max-h-44 overflow-auto rounded border border-border divide-y divide-border">
                          {filtered.map(u => {
                            const checked = s.mode === "ALL" || !!s.userChecked[u.email];
                            const bucket = s.mode === "ALL"
                              ? s.bucket
                              : (s.userBuckets[u.email] || "TO");
                            const setUserBucket = (b: DTBucket) =>
                              updateSection(code, st => ({
                                ...st,
                                mode: "FILTERED",
                                userChecked: { ...st.userChecked, [u.email]: true },
                                userBuckets: { ...st.userBuckets, [u.email]: b },
                              }));
                            const toggleUser = () =>
                              updateSection(code, st => {
                                // If currently ALL, switching individual moves us to FILTERED
                                // with all users pre-checked except this one toggled.
                                if (st.mode === "ALL") {
                                  const userChecked: Record<string, boolean> = {};
                                  const userBuckets: Record<string, DTBucket> = {};
                                  users.forEach(usr => {
                                    userChecked[usr.email] = usr.email !== u.email;
                                    userBuckets[usr.email] = st.bucket;
                                  });
                                  return { ...st, mode: "FILTERED", userChecked, userBuckets };
                                }
                                const nowChecked = !st.userChecked[u.email];
                                return {
                                  ...st,
                                  mode: "FILTERED",
                                  userChecked: { ...st.userChecked, [u.email]: nowChecked },
                                  userBuckets: { ...st.userBuckets, [u.email]: st.userBuckets[u.email] || "TO" },
                                };
                              });
                            return (
                              <div
                                key={u.lanid}
                                className={`flex items-center gap-2 px-2 py-1 text-xs ${checked ? "bg-primary/[0.04]" : ""}`}
                              >
                                <Checkbox checked={checked} onCheckedChange={toggleUser} className="shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="truncate font-medium">{u.name}</div>
                                  <div className="truncate text-[10px] text-muted-foreground">{u.email}</div>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {BUCKETS.map(b => {
                                    const active = checked && bucket === b;
                                    return (
                                      <button
                                        key={b}
                                        type="button"
                                        onClick={() => setUserBucket(b)}
                                        className={`text-[9px] font-bold w-7 h-5 rounded border transition-colors ${
                                          active
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background hover:bg-muted border-border text-muted-foreground"
                                        }`}
                                      >
                                        {b}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* 4. Sticky footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border shrink-0">
        <div className="text-[11px] text-muted-foreground">
          {totalSelected > 0
            ? <><span className="font-semibold text-foreground">{totalSelected}</span> recipient{totalSelected === 1 ? "" : "s"} ready</>
            : "No recipients selected"}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!canApply} onClick={apply}>Apply</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- small subcomponents ---------- */

const BUCKET_COLOR: Record<string, string> = {
  TO:  "bg-indigo-100 text-indigo-700 border-indigo-200",
  CC:  "bg-amber-100  text-amber-800  border-amber-200",
  BCC: "bg-slate-200  text-slate-700  border-slate-300",
};

function SummaryRow({
  label, bucket, items,
}: { label: string; bucket: DTBucket; items: { email: string; name?: string }[] }) {
  return (
    <div className="flex items-baseline gap-2 text-[11px] min-w-0">
      <span className={`shrink-0 inline-flex items-center justify-center min-w-[28px] h-4 px-1 rounded text-[9px] font-bold border ${BUCKET_COLOR[bucket]}`}>
        {label.toUpperCase()}
      </span>
      <span className="truncate text-foreground/90">
        {items.length === 0
          ? <span className="text-muted-foreground italic">none</span>
          : items.map(i => i.name || i.email).join(", ")}
      </span>
      {items.length > 0 && (
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground font-medium">{items.length}</span>
      )}
    </div>
  );
}

function CompactSelect({
  label, value, onChange, placeholder, options, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div className="min-w-0">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs mt-0.5">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AppsMultiSelect({
  label, options, value, onToggle, disabled,
}: {
  label: string;
  options: { code: string; label: string }[];
  value: string[];
  onToggle: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const summary = value.length === 0
    ? "All / none"
    : value.length === 1
      ? options.find(o => o.code === value[0])?.label ?? "1 app"
      : `${value.length} apps`;
  return (
    <div className="min-w-0">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8 w-full justify-between text-xs font-normal mt-0.5 px-2"
          >
            <span className="truncate">{disabled ? "Pick LOB first" : summary}</span>
            <ChevronDown size={12} className="shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1" align="start">
          {options.length === 0 ? (
            <div className="text-[11px] text-muted-foreground p-2">No apps.</div>
          ) : (
            <div className="max-h-56 overflow-auto">
              {options.map(o => (
                <label
                  key={o.code}
                  className="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-muted cursor-pointer"
                >
                  <Checkbox checked={value.includes(o.code)} onCheckedChange={() => onToggle(o.code)} />
                  <span className="truncate">{o.label}</span>
                </label>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
