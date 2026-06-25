/**
 * DynamicTargetingPanel
 *
 * Renders inside the DL drawer's "Dynamic Targeting" tab on the
 * Run Templates page. Lets a user:
 *   1) Pick a LOB (single autocomplete-style select).
 *   2) Pick one or more Applications (multi-select) — list filtered by LOB.
 *   3) Pick a CIO Direct (single) — list filtered by LOB.
 *   4) For each role bucket (TECH_MANAGER, ALT_TECH_MANAGER,
 *      BUSINESS_OWNER, ALT_BUSINESS_OWNER, CIO1, CIO2):
 *        - "Select all in this role" checkbox + role-level To/CC/BCC radio.
 *        - OR expand "Filter / pick individuals" to choose specific
 *          users with per-user To/CC/BCC radio.
 *   5) See a live summary of selected emails grouped by To/CC/BCC.
 *
 * On "Apply":
 *   - Builds the DynamicTargetingPayload JSON.
 *   - Resolves selections to concrete emails and pushes them into the
 *     parent's to/cc/bcc buckets (tagged with sourceDLIds: ["__dt__"]
 *     so the existing chip-removal logic strips them when the dynamic
 *     targeting chip is removed).
 *   - The parent stores the JSON and includes it in the sendTemplate
 *     payload as `dynamicTargeting` (backend persists it to the
 *     `dynamic_targetting` table and re-resolves on send).
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";

export interface DynamicTargetingResolved {
  to:  { email: string; name?: string }[];
  cc:  { email: string; name?: string }[];
  bcc: { email: string; name?: string }[];
}

interface Props {
  /** Pre-existing payload (e.g. when re-opening drawer). */
  initial?: DynamicTargetingPayload | null;
  onApply: (payload: DynamicTargetingPayload, resolved: DynamicTargetingResolved) => void;
  onClose?: () => void;
}

type SectionMode = "OFF" | "ALL" | "FILTERED";

interface SectionState {
  mode: SectionMode;
  bucket: DTBucket;                      // used when mode === ALL
  userBuckets: Record<string, DTBucket>; // email -> bucket (filtered mode)
  userChecked: Record<string, boolean>;  // email -> selected (filtered mode)
  filter: string;
  expanded: boolean;
}

const emptySection = (): SectionState => ({
  mode: "OFF",
  bucket: "TO",
  userBuckets: {},
  userChecked: {},
  filter: "",
  expanded: false,
});

export default function DynamicTargetingPanel({ initial, onApply, onClose }: Props) {
  const [lob, setLob]             = useState<string>(initial?.lob ?? "");
  const [apps, setApps]           = useState<string[]>(initial?.apps ?? []);
  const [cioDirect, setCioDirect] = useState<string>(initial?.cioDirect ?? "");

  const [sections, setSections] = useState<Record<DTRoleCode, SectionState>>(() => {
    const init: any = {};
    DT_ROLES.forEach(r => init[r.code] = emptySection());
    // hydrate from initial
    if (initial?.sections) {
      Object.entries(initial.sections).forEach(([code, sel]) => {
        const s = emptySection();
        if (sel?.mode === "ALL") {
          s.mode = "ALL"; s.bucket = sel.bucket;
        } else if (sel?.mode === "FILTERED") {
          s.mode = "FILTERED";
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

  // Reset apps + cio when LOB changes
  useEffect(() => {
    if (!lob) return;
    setApps((cur) => cur.filter(a => appOpts.some(o => o.code === a)));
    if (cioDirect && !cioOpts.some(c => c.code === cioDirect)) setCioDirect("");
  }, [lob]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load roster when lob ready
  const roster: DTRoster = useMemo(
    () => lob ? fetchDynamicRoster(lob, apps, cioDirect) : ({} as DTRoster),
    [lob, apps, cioDirect],
  );

  /* ---- helpers ---- */
  const updateSection = (code: DTRoleCode, mut: (s: SectionState) => SectionState) =>
    setSections(cur => ({ ...cur, [code]: mut(cur[code]) }));

  const toggleApp = (code: string) =>
    setApps(cur => cur.includes(code) ? cur.filter(a => a !== code) : [...cur, code]);

  /* ---- compute live preview & resolved ---- */
  const resolved = useMemo<DynamicTargetingResolved>(() => {
    const out: DynamicTargetingResolved = { to: [], cc: [], bcc: [] };
    const seen = { TO: new Set<string>(), CC: new Set<string>(), BCC: new Set<string>() };
    const push = (bucket: DTBucket, u: OrgUser) => {
      const key = u.email.toLowerCase();
      if (seen[bucket].has(key)) return;
      seen[bucket].add(key);
      (bucket === "TO" ? out.to : bucket === "CC" ? out.cc : out.bcc)
        .push({ email: u.email, name: u.name });
    };
    DT_ROLES.forEach(({ code }) => {
      const s = sections[code];
      const users = roster[code] || [];
      if (s.mode === "ALL") {
        users.forEach(u => push(s.bucket, u));
      } else if (s.mode === "FILTERED") {
        users.forEach(u => {
          if (s.userChecked[u.email]) {
            push(s.userBuckets[u.email] || "TO", u);
          }
        });
      }
    });
    return out;
  }, [sections, roster]);

  /* ---- apply ---- */
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

  const canApply = lob && (resolved.to.length + resolved.cc.length + resolved.bcc.length) > 0;

  const apply = () => {
    if (!canApply) return;
    onApply(buildPayload(), resolved);
    onClose?.();
  };

  /* ---- render ---- */
  return (
    <div className="flex flex-col h-full">
      {/* live preview */}
      <div className="border border-border rounded-md p-2 mt-3 bg-muted/30 text-xs space-y-1">
        <div className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">
          Selected recipients
        </div>
        <PreviewLine label="To"  items={resolved.to}  />
        <PreviewLine label="Cc"  items={resolved.cc}  />
        <PreviewLine label="Bcc" items={resolved.bcc} />
      </div>

      {/* selectors */}
      <div className="space-y-2 mt-3">
        <div>
          <Label className="text-xs">LOB</Label>
          <Select value={lob} onValueChange={setLob}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Select LOB" /></SelectTrigger>
            <SelectContent>
              {lobs.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Applications (multi)</Label>
          <div className="border border-border rounded-md p-1.5 max-h-24 overflow-auto bg-background">
            {!lob && <div className="text-[11px] text-muted-foreground px-1">Pick a LOB first.</div>}
            {lob && appOpts.length === 0 && (
              <div className="text-[11px] text-muted-foreground px-1">No apps for this LOB.</div>
            )}
            {appOpts.map(a => (
              <label key={a.code} className="flex items-center gap-2 text-xs py-0.5 px-1 cursor-pointer hover:bg-muted rounded">
                <Checkbox
                  checked={apps.includes(a.code)}
                  onCheckedChange={() => toggleApp(a.code)}
                />
                <span>{a.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs">CIO Direct</Label>
          <Select value={cioDirect} onValueChange={setCioDirect} disabled={!lob}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Select CIO Direct" /></SelectTrigger>
            <SelectContent>
              {cioOpts.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* role sections */}
      <ScrollArea className="flex-1 mt-3 -mx-6 px-6">
        <div className="space-y-2 pb-4">
          {DT_ROLES.map(({ code, label }) => {
            const s = sections[code];
            const users = roster[code] || [];
            const filtered = s.filter
              ? users.filter(u =>
                  u.name.toLowerCase().includes(s.filter.toLowerCase()) ||
                  u.email.toLowerCase().includes(s.filter.toLowerCase()))
              : users;
            const allChecked = s.mode === "ALL";
            return (
              <div key={code} className="border border-border rounded-md">
                <div className="flex items-center justify-between gap-2 p-2">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={(v) =>
                        updateSection(code, s => ({
                          ...s,
                          mode: v ? "ALL" : (s.mode === "ALL" ? "OFF" : s.mode),
                        }))
                      }
                    />
                    {label}
                    <span className="text-[11px] text-muted-foreground font-normal">
                      ({users.length})
                    </span>
                  </label>
                  {allChecked && (
                    <RadioGroup
                      value={s.bucket}
                      onValueChange={(v) => updateSection(code, s => ({ ...s, bucket: v as DTBucket }))}
                      className="flex items-center gap-2"
                    >
                      {(["TO", "CC", "BCC"] as DTBucket[]).map(b => (
                        <label key={b} className="flex items-center gap-1 text-[11px] cursor-pointer">
                          <RadioGroupItem value={b} id={`${code}-all-${b}`} className="h-3 w-3" />
                          {b}
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                </div>

                <div className="px-2 pb-2">
                  <button
                    type="button"
                    onClick={() => updateSection(code, s => ({
                      ...s,
                      expanded: !s.expanded,
                      mode: s.mode === "ALL" ? "ALL" : (s.expanded ? "OFF" : "FILTERED"),
                    }))}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {s.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <Filter size={11} /> Filter / pick individuals
                  </button>

                  {s.expanded && (
                    <div className="mt-2 space-y-1">
                      <Input
                        value={s.filter}
                        onChange={(e) => updateSection(code, s => ({ ...s, filter: e.target.value }))}
                        placeholder="Search by name or email"
                        className="h-7 text-xs"
                      />
                      <div className="max-h-44 overflow-auto border border-border rounded-sm">
                        {filtered.length === 0 && (
                          <div className="text-[11px] text-muted-foreground p-2">No users.</div>
                        )}
                        {filtered.map(u => {
                          const checked = !!s.userChecked[u.email];
                          const bucket  = s.userBuckets[u.email] || "TO";
                          return (
                            <div
                              key={u.lanid}
                              className="flex items-center justify-between gap-2 px-2 py-1 text-xs hover:bg-muted"
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <Checkbox
                                  checked={checked}
                                  disabled={allChecked}
                                  onCheckedChange={(v) =>
                                    updateSection(code, s => ({
                                      ...s,
                                      mode: "FILTERED",
                                      userChecked: { ...s.userChecked, [u.email]: !!v },
                                      userBuckets: { ...s.userBuckets, [u.email]: s.userBuckets[u.email] || "TO" },
                                    }))
                                  }
                                />
                                <span className="truncate">
                                  {u.name}{" "}
                                  <span className="text-muted-foreground">&lt;{u.email}&gt;</span>
                                </span>
                              </label>
                              <RadioGroup
                                value={bucket}
                                onValueChange={(v) =>
                                  updateSection(code, s => ({
                                    ...s,
                                    mode: "FILTERED",
                                    userBuckets: { ...s.userBuckets, [u.email]: v as DTBucket },
                                    userChecked: { ...s.userChecked, [u.email]: true },
                                  }))
                                }
                                className="flex items-center gap-1"
                              >
                                {(["TO", "CC", "BCC"] as DTBucket[]).map(b => (
                                  <label key={b} className="flex items-center gap-0.5 text-[10px] cursor-pointer">
                                    <RadioGroupItem
                                      value={b}
                                      id={`${code}-${u.lanid}-${b}`}
                                      className="h-3 w-3"
                                      disabled={allChecked}
                                    />
                                    {b}
                                  </label>
                                ))}
                              </RadioGroup>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" disabled={!canApply} onClick={apply}>Apply</Button>
      </div>
    </div>
  );
}

function PreviewLine({ label, items }: { label: string; items: { email: string; name?: string }[] }) {
  return (
    <div className="flex gap-1.5">
      <span className="font-medium text-muted-foreground shrink-0">{label}:</span>
      <span className="truncate">
        {items.length === 0
          ? <span className="text-muted-foreground">—</span>
          : items.map(i => i.name || i.email).join(", ")}
      </span>
    </div>
  );
}
