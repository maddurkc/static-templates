import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  listLobs, listCioDirects, listRoles, fetchRoster,
  createStandardDL, updateStandardDL,
  type RosterByRole, type StandardDistributionList, type StandardDLMember, type StdVisibility, type StdBucket,
} from "@/lib/standardDistributionListStorage";
import styles from "./StandardDLWizard.module.scss";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: StandardDistributionList | null;
}

type Step = 1 | 2 | 3;

export function StandardDLWizard({ open, onClose, onSaved, initial }: Props) {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<StdVisibility>("PUBLIC");

  // Step 2
  const [lob, setLob] = useState<string>("");
  const [cio, setCio] = useState<string>("");
  const [roster, setRoster] = useState<RosterByRole | null>(null);

  // Step 3
  const [selected, setSelected] = useState<Record<string, StdBucket>>({}); // key: `${lanid}::${role}` -> bucket
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const lobs = listLobs();
  const roles = listRoles();
  const cios = useMemo(() => (lob ? listCioDirects(lob) : []), [lob]);

  // Hydrate from initial when editing
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setStep(1);
      setName(initial.name);
      setDescription(initial.description ?? "");
      setVisibility(initial.visibility);
      setLob(initial.lob);
      setCio(initial.cioDirectLanid);
      const fresh = fetchRoster(initial.lob, initial.cioDirectLanid);
      setRoster(fresh);
      const sel: Record<string, StdBucket> = {};
      initial.members.forEach((m) => { sel[`${m.lanid}::${m.role}`] = m.bucket; });
      setSelected(sel);
    } else {
      setStep(1);
      setName(""); setDescription(""); setVisibility("PUBLIC");
      setLob(""); setCio(""); setRoster(null);
      setSelected({}); setCollapsed({});
    }
  }, [open, initial]);

  const loadRoster = () => {
    if (!lob || !cio) return;
    setRoster(fetchRoster(lob, cio));
  };

  const toggleMember = (key: string) => {
    setSelected((s) => {
      const next = { ...s };
      if (next[key]) delete next[key];
      else next[key] = "TO";
      return next;
    });
  };

  const setBucket = (key: string, bucket: StdBucket) => {
    setSelected((s) => ({ ...s, [key]: bucket }));
  };

  const toggleAllInRole = (roleCode: string, people: { lanid: string }[], on: boolean) => {
    setSelected((s) => {
      const next = { ...s };
      for (const p of people) {
        const k = `${p.lanid}::${roleCode}`;
        if (on) next[k] = next[k] ?? "TO";
        else delete next[k];
      }
      return next;
    });
  };

  const selectedCount = Object.keys(selected).length;

  const canNext1 = name.trim().length > 0;
  const canNext2 = !!lob && !!cio && !!roster;

  const save = () => {
    if (!roster) return;
    const lobLabel = lobs.find((l) => l.code === lob)?.name ?? lob;
    const cioName = cios.find((c) => c.lanid === cio)?.name ?? cio;
    const members: StandardDLMember[] = [];
    for (const role of roles) {
      const people = roster[role.code] ?? [];
      for (const p of people) {
        const key = `${p.lanid}::${role.code}`;
        const bucket = selected[key];
        if (bucket) members.push({ ...p, role: role.code, bucket });
      }
    }
    if (members.length === 0) {
      toast({ title: "Select at least one member", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        name, description, visibility,
        lob, lobLabel, cioDirectLanid: cio, cioDirectName: cioName,
        members,
      };
      if (initial) updateStandardDL(initial.id, payload);
      else createStandardDL(payload);
      toast({ title: initial ? "Standard DL updated" : "Standard DL created" });
      onSaved();
      onClose();
    } catch (e: unknown) {
      toast({ title: "Failed to save", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Standard DL" : "New Standard DL"}</DialogTitle>
          <div className={styles.stepper}>
            {[1, 2, 3].map((n) => (
              <div key={n} className={`${styles.step} ${step === n ? styles.stepActive : ""} ${step > n ? styles.stepDone : ""}`}>
                <span className={styles.stepNum}>{n}</span>
                <span className={styles.stepLabel}>
                  {n === 1 ? "Basics" : n === 2 ? "Org Selection" : "Members"}
                </span>
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className={styles.body}>
          {step === 1 && (
            <div className={styles.form}>
              <label className={styles.field}>
                <span>Name <em>*</em></span>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CCB-Risk-Leadership" />
              </label>
              <label className={styles.field}>
                <span>Description</span>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this DL used for?" />
              </label>
              <label className={styles.field}>
                <span>Visibility</span>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as StdVisibility)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Public — anyone can use</SelectItem>
                    <SelectItem value="PRIVATE">Private — only you & delegates</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className={styles.form}>
              <label className={styles.field}>
                <span>Line of Business <em>*</em></span>
                <Select value={lob} onValueChange={(v) => { setLob(v); setCio(""); setRoster(null); }}>
                  <SelectTrigger><SelectValue placeholder="Select LOB…" /></SelectTrigger>
                  <SelectContent>
                    {lobs.map((l) => <SelectItem key={l.code} value={l.code}>{l.code} — {l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className={styles.field}>
                <span>CIO Direct <em>*</em></span>
                <Select value={cio} onValueChange={(v) => { setCio(v); setRoster(null); }} disabled={!lob}>
                  <SelectTrigger><SelectValue placeholder={lob ? "Select CIO Direct…" : "Pick LOB first"} /></SelectTrigger>
                  <SelectContent>
                    {cios.map((c) => <SelectItem key={c.lanid} value={c.lanid}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <div className={styles.loadRow}>
                <Button onClick={loadRoster} disabled={!lob || !cio} variant="secondary">
                  <Users className="h-4 w-4 mr-1" /> Load Members
                </Button>
                {roster && (
                  <span className={styles.loadedHint}>
                    Loaded {Object.values(roster).reduce((a, b) => a + b.length, 0)} people across {Object.keys(roster).length} roles.
                  </span>
                )}
              </div>
            </div>
          )}

          {step === 3 && roster && (
            <div className={styles.rosterWrap}>
              <div className={styles.rosterHead}>
                <span>{selectedCount} selected</span>
                <div className={styles.legend}>
                  <Badge variant="secondary">TO</Badge>
                  <Badge variant="outline">CC</Badge>
                  <Badge variant="outline">BCC</Badge>
                </div>
              </div>
              {roles.map((role) => {
                const people = roster[role.code] ?? [];
                const allSelected = people.length > 0 && people.every((p) => selected[`${p.lanid}::${role.code}`]);
                const someSelected = people.some((p) => selected[`${p.lanid}::${role.code}`]);
                const isCollapsed = collapsed[role.code];
                return (
                  <div key={role.code} className={styles.roleBlock}>
                    <div className={styles.roleHead}>
                      <button
                        type="button"
                        className={styles.roleToggle}
                        onClick={() => setCollapsed((c) => ({ ...c, [role.code]: !c[role.code] }))}
                      >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span>{role.label}</span>
                        <Badge variant="outline" className="ml-1">{people.length}</Badge>
                      </button>
                      <label className={styles.selectAll}>
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={(v) => toggleAllInRole(role.code, people, !!v)}
                        />
                        Select all
                      </label>
                    </div>
                    {!isCollapsed && (
                      <ul className={styles.personList}>
                        {people.map((p) => {
                          const key = `${p.lanid}::${role.code}`;
                          const bucket = selected[key];
                          return (
                            <li key={key} className={styles.personRow}>
                              <Checkbox checked={!!bucket} onCheckedChange={() => toggleMember(key)} />
                              <div className={styles.personInfo}>
                                <div className={styles.personName}>{p.name}</div>
                                <div className={styles.personMeta}>{p.email} · <code>{p.lanid}</code></div>
                              </div>
                              {bucket && (
                                <div className={styles.bucketPicker}>
                                  {(["TO", "CC", "BCC"] as StdBucket[]).map((b) => (
                                    <button
                                      key={b}
                                      type="button"
                                      className={`${styles.bucketBtn} ${bucket === b ? styles.bucketBtnActive : ""}`}
                                      onClick={() => setBucket(key, b)}
                                    >{b}</button>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className={styles.footer}>
          {step > 1 && <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as Step)}>Back</Button>}
          <div className={styles.spacer} />
          {step < 3 && (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
            >Next</Button>
          )}
          {step === 3 && (
            <Button onClick={save} disabled={selectedCount === 0}>
              {initial ? "Save changes" : "Create Standard DL"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
