/**
 * Custom Smart Distribution Lists — frontend storage layer.
 *
 * Mirrors the Spring Boot backend contract described in
 * DISTRIBUTION_LISTS_BACKEND.md. Persists DLs to localStorage so the demo
 * works without a server; swap the four exported async functions with
 * `fetch('/api/distribution-lists*')` calls when wiring real backend.
 */

export type DLVisibility = "PRIVATE" | "SHARED" | "PUBLIC";

export interface DLMember {
  email: string;
  displayName?: string;
}

/**
 * Rich shared-user record persisted on a DL when visibility = SHARED.
 * We snapshot the full directory record (not just the id) so the UI can
 * render names/emails without an extra round-trip and so audit history
 * survives even if the user is later removed from the org directory.
 */
export interface SharedUserRef {
  id: string;          // internal user id
  elid?: string;       // enterprise id (e.g. AD upn / employee login id)
  lanid?: string;      // LAN / network id
  name: string;
  emailid: string;     // canonical email
  department?: string;
}

/**
 * The DL is persisted as a SINGLE row in `distribution_list`.
 * Member emails live entirely in the `members_raw` NVARCHAR(MAX) column
 * (verbatim free-form text the user pasted). The structured `members`
 * array below is **derived** on read via `parseMembersRaw()` and is
 * never written to storage / the DB.
 */
export interface DistributionList {
  id: string;
  prefix: string;
  name: string;
  displayName: string;
  description?: string;
  visibility: DLVisibility;
  ownerId: string;
  /** Source of truth — the verbatim textarea string. */
  membersRaw: string;
  /** Derived from membersRaw on every read. Not persisted. */
  members: DLMember[];
  sharedWith: SharedUserRef[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipientSuggestion {
  type: "USER" | "DL";
  id: string;
  email?: string;             // USER only
  displayName: string;
  subtitle: string;
  memberCount?: number;       // DL only
}

const STORAGE_KEY = "smart_distribution_lists_v3";
const DEFAULT_PREFIX = "DSPCH-";
const RESERVED_PREFIXES = ["SYS-", "ADMIN-"];
const CURRENT_USER = "me";   // demo placeholder

/* ---------- low-level persistence ---------- */

/**
 * Parse the free-form textarea string into a deduped, validated email list.
 * Accepts `, ; : space newline` (any combination) as separators. Invalid
 * tokens are silently dropped.
 */
export function parseMembersRaw(raw: string | undefined | null): DLMember[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: DLMember[] = [];
  for (const tok of raw.split(/[,;:\s\n]+/)) {
    const e = tok.trim().toLowerCase();
    if (!e) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    out.push({ email: e });
  }
  return out;
}

/** Hydrate a stored row → runtime shape (derives `members` from `membersRaw`). */
function hydrate(row: Omit<DistributionList, "members">): DistributionList {
  return { ...row, members: parseMembersRaw(row.membersRaw) };
}

function readAll(): DistributionList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDemoLists();
      writeAll(seeded);
      return seeded;
    }
    const stored = JSON.parse(raw) as Omit<DistributionList, "members">[];
    return stored.map(hydrate);
  } catch {
    return [];
  }
}

function writeAll(lists: DistributionList[]): void {
  // Strip the derived `members` field — `membersRaw` is the source of truth.
  const stripped = lists.map(({ members, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
}

function seedDemoLists(): DistributionList[] {
  const now = new Date().toISOString();
  const eng = "john.doe@company.com, jane.smith@company.com, mike.brown@company.com, emma.taylor@company.com";
  const ir  = "bob.wilson@company.com; alice.johnson@company.com; sarah.davis@company.com";
  return [
    {
      id: "dl-demo-eng",
      prefix: DEFAULT_PREFIX,
      name: "EngineeringTeam",
      displayName: `${DEFAULT_PREFIX}EngineeringTeam`,
      description: "Core engineering distribution",
      visibility: "SHARED",
      ownerId: CURRENT_USER,
      membersRaw: eng,
      members: parseMembersRaw(eng),
      sharedWith: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "dl-demo-incident",
      prefix: DEFAULT_PREFIX,
      name: "IncidentResponders",
      displayName: `${DEFAULT_PREFIX}IncidentResponders`,
      description: "On-call incident responders",
      visibility: "PRIVATE",
      ownerId: CURRENT_USER,
      membersRaw: ir,
      members: parseMembersRaw(ir),
      sharedWith: [],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/* ---------- CRUD ---------- */

export function listDistributionLists(): DistributionList[] {
  return readAll().filter(
    (dl) =>
      dl.ownerId === CURRENT_USER ||
      dl.visibility === "PUBLIC" ||
      dl.sharedWith.some((s) => s.id === CURRENT_USER),
  );
}

export function getDistributionList(id: string): DistributionList | null {
  return readAll().find((dl) => dl.id === id) ?? null;
}

export interface DLUpsertInput {
  name: string;
  prefix?: string;
  description?: string;
  visibility: DLVisibility;
  /**
   * Verbatim textarea content — the ONLY persisted source of members.
   * Server / storage layer parses this via `parseMembersRaw()`; there is
   * no separate normalised member table.
   */
  membersRaw: string;
  sharedWith?: SharedUserRef[];
}

function validate(input: DLUpsertInput): { error: string | null; members: DLMember[] } {
  const name = input.name.trim();
  if (!name) return { error: "Name is required.", members: [] };
  if (!/^[A-Za-z0-9]+$/.test(name)) {
    return {
      error: "Name can only contain letters and numbers — no spaces or special characters.",
      members: [],
    };
  }
  const members = parseMembersRaw(input.membersRaw);
  if (members.length === 0) {
    return { error: "At least one valid member email is required.", members };
  }
  const prefix = input.prefix ?? DEFAULT_PREFIX;
  if (RESERVED_PREFIXES.some((p) => prefix.toUpperCase().startsWith(p))) {
    return { error: `Prefix '${prefix}' is reserved.`, members };
  }
  if (input.visibility === "SHARED" && (!input.sharedWith || input.sharedWith.length === 0)) {
    return { error: "SHARED visibility requires at least one shared user.", members };
  }
  return { error: null, members };
}


export function createDistributionList(input: DLUpsertInput): DistributionList {
  const { error, members } = validate(input);
  if (error) throw new Error(error);

  const all = readAll();
  const dupe = all.find(
    (d) => d.ownerId === CURRENT_USER && d.name.toLowerCase() === input.name.trim().toLowerCase(),
  );
  if (dupe) throw new Error(`A distribution list named '${input.name}' already exists.`);

  const prefix = input.prefix ?? DEFAULT_PREFIX;
  const name = input.name.trim();
  const now = new Date().toISOString();
  const dl: DistributionList = {
    id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prefix,
    name,
    displayName: `${prefix}${name}`,
    description: input.description?.trim() || undefined,
    visibility: input.visibility,
    ownerId: CURRENT_USER,
    membersRaw: input.membersRaw,
    members,
    sharedWith: input.visibility === "SHARED" ? input.sharedWith ?? [] : [],
    createdAt: now,
    updatedAt: now,
  };
  writeAll([dl, ...all]);
  return dl;
}

export function updateDistributionList(id: string, input: DLUpsertInput): DistributionList {
  const { error, members } = validate(input);
  if (error) throw new Error(error);

  const all = readAll();
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error("Distribution list not found.");
  if (all[idx].ownerId !== CURRENT_USER) throw new Error("You can only edit your own distribution lists.");

  const name = input.name.trim();
  const dupe = all.find(
    (d) => d.id !== id && d.ownerId === CURRENT_USER && d.name.toLowerCase() === name.toLowerCase(),
  );
  if (dupe) throw new Error(`A distribution list named '${name}' already exists.`);

  const prefix = input.prefix ?? all[idx].prefix;

  const updated: DistributionList = {
    ...all[idx],
    prefix,
    name,
    displayName: `${prefix}${name}`,
    description: input.description?.trim() || undefined,
    visibility: input.visibility,
    membersRaw: input.membersRaw,
    members,
    sharedWith: input.visibility === "SHARED" ? input.sharedWith ?? [] : [],
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function deleteDistributionList(id: string): void {
  const all = readAll();
  const filtered = all.filter((d) => d.id !== id);
  writeAll(filtered);
}

/* ---------- unified recipient search ---------- */

const MOCK_USER_DIRECTORY: DirectoryUser[] = [
  { id: "u-1",  elid: "E10001", lanid: "jdoe",      name: "John Doe",        email: "john.doe@company.com",       department: "Engineering" },
  { id: "u-2",  elid: "E10002", lanid: "jsmith",    name: "Jane Smith",      email: "jane.smith@company.com",     department: "Design" },
  { id: "u-3",  elid: "E10003", lanid: "bwilson",   name: "Bob Wilson",      email: "bob.wilson@company.com",     department: "Marketing" },
  { id: "u-4",  elid: "E10004", lanid: "ajohnson",  name: "Alice Johnson",   email: "alice.johnson@company.com",  department: "Sales" },
  { id: "u-5",  elid: "E10005", lanid: "mbrown",    name: "Mike Brown",      email: "mike.brown@company.com",     department: "Engineering" },
  { id: "u-6",  elid: "E10006", lanid: "sdavis",    name: "Sarah Davis",     email: "sarah.davis@company.com",    department: "HR" },
  { id: "u-7",  elid: "E10007", lanid: "tmiller",   name: "Tom Miller",      email: "tom.miller@company.com",     department: "Finance" },
  { id: "u-8",  elid: "E10008", lanid: "etaylor",   name: "Emma Taylor",     email: "emma.taylor@company.com",    department: "Engineering" },
  { id: "u-9",  elid: "E10009", lanid: "canderson", name: "Chris Anderson",  email: "chris.anderson@company.com", department: "Product" },
  { id: "u-10", elid: "E10010", lanid: "lmartinez", name: "Lisa Martinez",   email: "lisa.martinez@company.com",  department: "Legal" },
];

/** Lightweight shape returned by the share-user picker. */
export interface DirectoryUser {
  id: string;
  elid?: string;     // enterprise / employee id
  lanid?: string;    // LAN / network id
  name: string;
  email: string;     // canonical email (mapped to `emailid` when persisted)
  department?: string;
}

/** Convert a directory row → the persistence shape stored on the DL. */
export function toSharedRef(u: DirectoryUser): SharedUserRef {
  return {
    id: u.id,
    elid: u.elid,
    lanid: u.lanid,
    name: u.name,
    emailid: u.email,
    department: u.department,
  };
}

/** Convert a persisted shared-user record back to the directory shape used by the picker. */
export function fromSharedRef(s: SharedUserRef): DirectoryUser {
  return {
    id: s.id,
    elid: s.elid,
    lanid: s.lanid,
    name: s.name,
    email: s.emailid,
    department: s.department,
  };
}

/**
 * Search the org directory for users to share a DL with.
 * Backend equivalent: GET /api/users/search?q=...
 */
export async function searchUsers(query: string, limit = 8): Promise<DirectoryUser[]> {
  await new Promise((r) => setTimeout(r, 120));
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return MOCK_USER_DIRECTORY.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.elid ?? "").toLowerCase().includes(q) ||
      (u.lanid ?? "").toLowerCase().includes(q) ||
      (u.department ?? "").toLowerCase().includes(q),
  ).slice(0, limit);
}

/** Resolve a list of user ids back to directory rows (for edit rehydration). */
export function getUsersByIds(ids: string[]): DirectoryUser[] {
  const set = new Set(ids);
  return MOCK_USER_DIRECTORY.filter((u) => set.has(u.id));
}

/**
 * Unified search across DLs and the user directory.
 * Backend equivalent: GET /api/recipients/search?q=...
 * DLs ranked first so prefix matches surface above identically-named people.
 */
export async function searchRecipients(query: string, limit = 10): Promise<RecipientSuggestion[]> {
  // Simulated network latency
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));

  const q = query.toLowerCase().trim();
  if (!q) return [];

  const out: RecipientSuggestion[] = [];

  // DL matches
  const dls = listDistributionLists().filter((dl) => {
    if (dl.displayName.toLowerCase().includes(q)) return true;
    if (dl.name.toLowerCase().includes(q)) return true;
    if (dl.members.some((m) => m.email.toLowerCase().includes(q))) return true;
    return false;
  });
  for (const dl of dls.slice(0, Math.max(1, Math.floor(limit / 2)))) {
    const visBadge =
      dl.visibility === "SHARED" ? " · shared" : dl.visibility === "PUBLIC" ? " · public" : "";
    out.push({
      type: "DL",
      id: dl.id,
      displayName: dl.displayName,
      subtitle: `${dl.members.length} members${visBadge}`,
      memberCount: dl.members.length,
    });
  }

  // User matches
  const users = MOCK_USER_DIRECTORY.filter(
    (u) =>
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.department ?? "").toLowerCase().includes(q),
  );
  for (const u of users.slice(0, limit - out.length)) {
    out.push({
      type: "USER",
      id: u.id,
      email: u.email,
      displayName: u.name,
      subtitle: u.department ? `${u.email} • ${u.department}` : u.email,
    });
  }

  return out;
}

/**
 * Expand a mixed list of USER+DL recipient refs into a deduplicated email list.
 * Mirrors the backend RecipientResolverService.
 */
export interface RecipientRef {
  type: "USER" | "DL";
  id?: string;       // DL uuid for DL refs
  email?: string;    // raw email for USER refs
}

export interface ResolvedRecipients {
  emails: string[];
  expandedDlIds: string[];
  warnings: string[];
}

export function resolveRecipients(refs: RecipientRef[]): ResolvedRecipients {
  const emails = new Set<string>();
  const expandedDlIds: string[] = [];
  const warnings: string[] = [];

  for (const ref of refs) {
    if (ref.type === "DL") {
      const dl = ref.id ? getDistributionList(ref.id) : null;
      if (!dl) {
        warnings.push(`Distribution list ${ref.id} is no longer available — skipped.`);
        continue;
      }
      if (dl.members.length === 0) {
        warnings.push(`DL '${dl.displayName}' is empty.`);
        continue;
      }
      dl.members.forEach((m) => emails.add(m.email.toLowerCase()));
      expandedDlIds.push(dl.id);
    } else if (ref.email) {
      emails.add(ref.email.toLowerCase().trim());
    }
  }
  return { emails: Array.from(emails), expandedDlIds, warnings };
}
