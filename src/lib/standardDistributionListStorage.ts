/**
 * Standard Distribution Lists — frontend storage layer (mock).
 *
 * "Standard" / "Smart" DLs are auto-built from the org tree: an admin
 * picks an LOB + CIO Direct, the backend returns the org roster grouped
 * by role buckets (App Mgr, Alt App Mgr, CIO-1/2, Biz Mgr, Alt Biz Mgr,
 * plus any admin-defined roles), and the admin checks who to include.
 *
 * Backend contract (to be implemented Spring Boot side):
 *   GET    /api/org/lobs
 *   GET    /api/org/cio-directs?lob=...
 *   GET    /api/org/roster?lob=...&cio=...
 *   GET    /api/standard-dls
 *   POST   /api/standard-dls
 *   PUT    /api/standard-dls/{id}
 *   DELETE /api/standard-dls/{id}
 *   POST   /api/standard-dls/{id}/refresh   -> diff preview
 *
 * Roles are CONFIGURABLE — stored as data, not hard-coded enum.
 */

/* ---------- types ---------- */

export interface OrgRoleDef {
  code: string;          // e.g. "APP_MANAGER"
  label: string;         // e.g. "App Managers"
  order: number;
}

export interface OrgPerson {
  lanid: string;
  name: string;
  email: string;
  title?: string;
}

export interface RosterByRole {
  [roleCode: string]: OrgPerson[];
}

export type StdBucket = "TO" | "CC" | "BCC";

export interface StandardDLMember extends OrgPerson {
  role: string;          // role code at time of save
  bucket: StdBucket;
}

export type StdVisibility = "PUBLIC" | "PRIVATE";

export interface StandardDistributionList {
  id: string;
  name: string;
  description?: string;
  visibility: StdVisibility;
  lob: string;
  lobLabel: string;
  cioDirectLanid: string;
  cioDirectName: string;
  members: StandardDLMember[];
  ownerLanid: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  lastRefreshedAt?: string;
}

/* ---------- configurable role catalog ---------- */

const ROLES_KEY = "std_dl_roles_v1";

const DEFAULT_ROLES: OrgRoleDef[] = [
  { code: "APP_MANAGER",        label: "App Managers",         order: 1 },
  { code: "ALT_APP_MANAGER",    label: "Alt App Managers",     order: 2 },
  { code: "CIO_1",              label: "CIO-1",                order: 3 },
  { code: "CIO_2",              label: "CIO-2",                order: 4 },
  { code: "BUSINESS_MANAGER",   label: "Business Managers",    order: 5 },
  { code: "ALT_BUSINESS_MANAGER", label: "Alt Business Managers", order: 6 },
];

export function listRoles(): OrgRoleDef[] {
  try {
    const raw = localStorage.getItem(ROLES_KEY);
    if (!raw) {
      localStorage.setItem(ROLES_KEY, JSON.stringify(DEFAULT_ROLES));
      return [...DEFAULT_ROLES];
    }
    return (JSON.parse(raw) as OrgRoleDef[]).sort((a, b) => a.order - b.order);
  } catch {
    return [...DEFAULT_ROLES];
  }
}

export function saveRoles(roles: OrgRoleDef[]): void {
  localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
}

export function roleLabel(code: string): string {
  return listRoles().find((r) => r.code === code)?.label ?? code;
}

/* ---------- mock org data ---------- */

export interface LobDef { code: string; name: string; }
export interface CioDirect { lanid: string; name: string; lob: string; }

const LOBS: LobDef[] = [
  { code: "CCB",  name: "Consumer & Community Banking" },
  { code: "CIB",  name: "Corporate & Investment Bank" },
  { code: "AWM",  name: "Asset & Wealth Management" },
  { code: "CB",   name: "Commercial Banking" },
];

const CIOS: CioDirect[] = [
  { lanid: "jsmith01", name: "John Smith",      lob: "CCB" },
  { lanid: "mlee02",   name: "Mary Lee",        lob: "CCB" },
  { lanid: "rwhite03", name: "Robert White",    lob: "CIB" },
  { lanid: "kchen04",  name: "Karen Chen",      lob: "CIB" },
  { lanid: "dpatel05", name: "Deepa Patel",     lob: "AWM" },
  { lanid: "tgarcia06", name: "Tony Garcia",    lob: "CB"  },
];

export function listLobs(): LobDef[] {
  return [...LOBS];
}

export function listCioDirects(lob: string): CioDirect[] {
  return CIOS.filter((c) => c.lob === lob);
}

/** Mock roster generator — deterministic per (lob, cio). */
export function fetchRoster(lob: string, cioLanid: string): RosterByRole {
  const roles = listRoles();
  const seed = `${lob}-${cioLanid}`;
  const firstNames = ["Alice","Bob","Carol","Dan","Eve","Frank","Grace","Henry","Ivy","Jack","Kate","Liam","Mia","Noah","Olivia","Peter","Quinn","Rita","Sam","Tina","Uma","Vince","Wendy","Xena","Yara","Zane"];
  const lastNames  = ["Anderson","Brown","Clark","Davis","Evans","Foster","Green","Harris","Iyer","Jones","Kim","Lopez","Miller","Nelson","Owens","Parker","Quincy","Reed","Singh","Taylor","Underwood","Vance","Walker","Xu","Young","Zimmer"];
  let n = 0;
  for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n; };

  const out: RosterByRole = {};
  for (const role of roles) {
    const count = 4 + (rand() % 9); // 4-12 people per bucket
    const arr: OrgPerson[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < count; i++) {
      const fn = firstNames[rand() % firstNames.length];
      const ln = lastNames[rand() % lastNames.length];
      const lanid = `${fn[0].toLowerCase()}${ln.toLowerCase()}${(rand() % 900 + 100)}`;
      if (seen.has(lanid)) continue;
      seen.add(lanid);
      arr.push({
        lanid,
        name: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@company.com`,
        title: role.label.replace(/s$/, ""),
      });
    }
    out[role.code] = arr;
  }
  return out;
}

/* ---------- standard DL CRUD (localStorage) ---------- */

const STORAGE_KEY = "standard_distribution_lists_v1";
const CURRENT_USER_LANID = "melanid";
const CURRENT_USER_NAME = "Me";

function readAll(): StandardDistributionList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDemo();
      writeAll(seeded);
      return seeded;
    }
    return JSON.parse(raw) as StandardDistributionList[];
  } catch {
    return [];
  }
}

function writeAll(rows: StandardDistributionList[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function seedDemo(): StandardDistributionList[] {
  const now = new Date().toISOString();
  const lob = LOBS[0];
  const cio = CIOS[0];
  const roster = fetchRoster(lob.code, cio.lanid);
  const members: StandardDLMember[] = [];
  for (const [role, people] of Object.entries(roster)) {
    // Pre-select first 2 of each role into TO bucket.
    people.slice(0, 2).forEach((p) => members.push({ ...p, role, bucket: "TO" }));
  }
  return [{
    id: "std-demo-1",
    name: "CCB Leadership All-Hands",
    description: "All key leaders under John Smith for monthly CCB updates.",
    visibility: "PUBLIC",
    lob: lob.code,
    lobLabel: lob.name,
    cioDirectLanid: cio.lanid,
    cioDirectName: cio.name,
    members,
    ownerLanid: CURRENT_USER_LANID,
    ownerName: CURRENT_USER_NAME,
    createdAt: now,
    updatedAt: now,
    lastRefreshedAt: now,
  }];
}

export function listStandardDLs(): StandardDistributionList[] {
  return readAll();
}

export function getStandardDL(id: string): StandardDistributionList | null {
  return readAll().find((d) => d.id === id) ?? null;
}

export interface StdDLUpsert {
  name: string;
  description?: string;
  visibility: StdVisibility;
  lob: string;
  lobLabel: string;
  cioDirectLanid: string;
  cioDirectName: string;
  members: StandardDLMember[];
}

export function createStandardDL(input: StdDLUpsert): StandardDistributionList {
  if (!input.name.trim()) throw new Error("Name is required.");
  if (input.members.length === 0) throw new Error("Select at least one member.");
  const now = new Date().toISOString();
  const dl: StandardDistributionList = {
    id: `std-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    ownerLanid: CURRENT_USER_LANID,
    ownerName: CURRENT_USER_NAME,
    createdAt: now,
    updatedAt: now,
    lastRefreshedAt: now,
  };
  writeAll([dl, ...readAll()]);
  return dl;
}

export function updateStandardDL(id: string, input: StdDLUpsert): StandardDistributionList {
  const all = readAll();
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error("Standard DL not found.");
  const updated: StandardDistributionList = {
    ...all[idx],
    ...input,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function deleteStandardDL(id: string): void {
  writeAll(readAll().filter((d) => d.id !== id));
}

/* ---------- refresh diff ---------- */

export interface RefreshDiff {
  added: StandardDLMember[];
  removed: StandardDLMember[];
  unchanged: StandardDLMember[];
}

/**
 * Compute the diff between the DL's saved members and the latest roster
 * from the source. Returns added/removed/unchanged keyed by lanid+role.
 */
export function computeRefreshDiff(dl: StandardDistributionList): RefreshDiff {
  const latest = fetchRoster(dl.lob, dl.cioDirectLanid);
  const latestKeys = new Set<string>();
  for (const [role, people] of Object.entries(latest)) {
    for (const p of people) latestKeys.add(`${p.lanid}::${role}`);
  }
  const savedKeys = new Set(dl.members.map((m) => `${m.lanid}::${m.role}`));

  const removed = dl.members.filter((m) => !latestKeys.has(`${m.lanid}::${m.role}`));
  const unchanged = dl.members.filter((m) => latestKeys.has(`${m.lanid}::${m.role}`));

  // "Added" = anyone in latest roster not already saved.
  const added: StandardDLMember[] = [];
  for (const [role, people] of Object.entries(latest)) {
    for (const p of people) {
      if (!savedKeys.has(`${p.lanid}::${role}`)) {
        added.push({ ...p, role, bucket: "TO" });
      }
    }
  }
  return { added, removed, unchanged };
}

export function applyRefresh(
  id: string,
  keepRemoved: boolean,
  addedToApply: StandardDLMember[],
): StandardDistributionList {
  const all = readAll();
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error("Standard DL not found.");
  const diff = computeRefreshDiff(all[idx]);
  const next: StandardDLMember[] = [
    ...diff.unchanged,
    ...(keepRemoved ? diff.removed : []),
    ...addedToApply,
  ];
  all[idx] = {
    ...all[idx],
    members: next,
    updatedAt: new Date().toISOString(),
    lastRefreshedAt: new Date().toISOString(),
  };
  writeAll(all);
  return all[idx];
}
