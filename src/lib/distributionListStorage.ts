/**
 * Custom Smart Distribution Lists — frontend storage layer (v2).
 *
 * v2 changes (mirrors the updated Spring Boot contract in
 * DISTRIBUTION_LISTS_BACKEND.md):
 *   • Visibility is binary: PRIVATE | PUBLIC (no SHARED).
 *   • `distribution_list_share` rows now represent **MANAGERS** (can
 *     edit / delete) and can exist on ANY visibility.
 *   • New column `type` (always `CUSTOM` for now).
 *   • New column `owner_lanid` stored alongside `owner_id` (AD ent id).
 *   • Members are stored as THREE verbatim blobs: `to_raw`, `cc_raw`,
 *     `bcc_raw` (instead of a single `members_raw`).
 */

export type DLVisibility = "PRIVATE" | "PUBLIC";
export type DLType = "CUSTOM";

export interface DLMember {
  email: string;
  displayName?: string;
}

/**
 * Manager record — a user (besides the owner) authorised to edit / delete
 * this DL. Mirrors a `distribution_list_share` row (the column names are
 * unchanged for backward compatibility; semantics shifted from "viewer"
 * to "manager" in v2).
 */
export interface SharedUserRef {
  distributionListShareId?: string;
  userId: string;
  elid?: string;
  lanid?: string;
  name: string;
  emailid: string;
  // v2: `department` removed — not stored on distribution_list_share.
  // UIs that need it look it up live from the directory.
  // v3 (delegates UX): audit who added the delegate and when.
  addedBy?: string;   // owner_id / lanid of the user who added this delegate
  addedAt?: string;   // ISO timestamp
}

export interface DistributionList {
  distributionListId: string;
  prefix: string;
  name: string;
  displayName: string;
  description?: string;
  visibility: DLVisibility;
  type: DLType;
  ownerId: string;        // AD enterprise id of creator
  ownerLanid?: string;    // LAN id of creator
  /** Verbatim textarea blobs — single source of truth. */
  toRaw: string;
  ccRaw: string;
  bccRaw: string;
  /** Derived on read; not persisted. */
  toMembers: DLMember[];
  ccMembers: DLMember[];
  bccMembers: DLMember[];
  /** Managers (can edit/delete alongside the owner). */
  managers: SharedUserRef[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipientSuggestion {
  type: "USER" | "DL";
  id: string;
  email?: string;
  displayName: string;
  subtitle: string;
  memberCount?: number;
}

const STORAGE_KEY = "smart_distribution_lists_v4";
const DEFAULT_PREFIX = "DSPCH-";
const RESERVED_PREFIXES = ["SYS-", "ADMIN-"];
const CURRENT_USER = "me";
const CURRENT_USER_LANID = "melanid";

/* ---------- parsing / hydration ---------- */

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

type StoredRow = Omit<DistributionList, "toMembers" | "ccMembers" | "bccMembers">;

function hydrate(row: StoredRow): DistributionList {
  return {
    ...row,
    toMembers: parseMembersRaw(row.toRaw),
    ccMembers: parseMembersRaw(row.ccRaw),
    bccMembers: parseMembersRaw(row.bccRaw),
  };
}

function readAll(): DistributionList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDemoLists();
      writeAll(seeded);
      return seeded;
    }
    const stored = JSON.parse(raw) as StoredRow[];
    return stored.map(hydrate);
  } catch {
    return [];
  }
}

function writeAll(lists: DistributionList[]): void {
  const stripped = lists.map(({ toMembers, ccMembers, bccMembers, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
}

function seedDemoLists(): DistributionList[] {
  const now = new Date().toISOString();
  const mk = (
    id: string,
    name: string,
    desc: string,
    visibility: DLVisibility,
    toRaw: string,
    ccRaw: string,
    bccRaw: string,
    managers: SharedUserRef[] = [],
  ): DistributionList => ({
    distributionListId: id,
    prefix: DEFAULT_PREFIX,
    name,
    displayName: `${DEFAULT_PREFIX}${name}`,
    description: desc,
    visibility,
    type: "CUSTOM",
    ownerId: CURRENT_USER,
    ownerLanid: CURRENT_USER_LANID,
    toRaw,
    ccRaw,
    bccRaw,
    toMembers: parseMembersRaw(toRaw),
    ccMembers: parseMembersRaw(ccRaw),
    bccMembers: parseMembersRaw(bccRaw),
    managers,
    createdAt: now,
    updatedAt: now,
  });
  return [
    mk(
      "dl-demo-eng",
      "EngineeringTeam",
      "Core engineering distribution",
      "PUBLIC",
      "john.doe@company.com, jane.smith@company.com, mike.brown@company.com",
      "emma.taylor@company.com",
      "",
    ),
    mk(
      "dl-demo-incident",
      "IncidentResponders",
      "On-call incident responders",
      "PRIVATE",
      "bob.wilson@company.com; alice.johnson@company.com",
      "",
      "sarah.davis@company.com",
    ),
  ];
}

/* ---------- permission helpers ---------- */

/** True if user is the owner OR listed as a manager (delegate). */
export function canManageDL(dl: DistributionList, userId: string = CURRENT_USER): boolean {
  return dl.ownerId === userId || dl.managers.some((m) => m.userId === userId);
}

/**
 * Owner OR any existing delegate can add/remove delegates. Mirrors the
 * backend `requireDelegateManage` gate in DistributionListService (§4).
 * Delegates may add more delegates, remove other delegates, or self-leave;
 * the owner can never be added or removed via this path.
 */
export function canManageDelegates(dl: DistributionList, userId: string = CURRENT_USER): boolean {
  return canManageDL(dl, userId);
}

/** True if the user can see the DL on the listing page / drawer. */
export function canViewDL(dl: DistributionList, userId: string = CURRENT_USER): boolean {
  return dl.visibility === "PUBLIC" || canManageDL(dl, userId);
}

/* ---------- CRUD ---------- */

export function listDistributionLists(): DistributionList[] {
  return readAll().filter((dl) => canViewDL(dl));
}

export type DLVisibilityFilter = "ALL" | DLVisibility;

export interface ListDLsQuery {
  page?: number;
  pageSize?: number;
  visibility?: DLVisibilityFilter;
  search?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function listDistributionListsPaged(q: ListDLsQuery = {}): PagedResult<DistributionList> {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.max(1, q.pageSize ?? 10);
  const visibility = q.visibility ?? "ALL";
  const search = (q.search ?? "").trim().toLowerCase();

  let rows = listDistributionLists();
  if (visibility !== "ALL") rows = rows.filter((dl) => dl.visibility === visibility);
  if (search) {
    rows = rows.filter(
      (dl) =>
        dl.displayName.toLowerCase().includes(search) ||
        dl.name.toLowerCase().includes(search) ||
        [...dl.toMembers, ...dl.ccMembers, ...dl.bccMembers].some((m) =>
          m.email.toLowerCase().includes(search),
        ),
    );
  }
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function getDistributionList(id: string): DistributionList | null {
  return readAll().find((dl) => dl.distributionListId === id) ?? null;
}

export interface DLUpsertInput {
  name: string;
  prefix?: string;
  description?: string;
  visibility: DLVisibility;
  toRaw: string;
  ccRaw?: string;
  bccRaw?: string;
  /** Managers — users authorised to edit / delete alongside the owner. */
  managers?: SharedUserRef[];
}

function validate(input: DLUpsertInput): { error: string | null } {
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  if (!/^[A-Za-z0-9]+$/.test(name)) {
    return { error: "Name can only contain letters and numbers — no spaces or special characters." };
  }
  const total =
    parseMembersRaw(input.toRaw).length +
    parseMembersRaw(input.ccRaw).length +
    parseMembersRaw(input.bccRaw).length;
  if (total === 0) {
    return { error: "At least one valid email across To / CC / BCC is required." };
  }
  const prefix = input.prefix ?? DEFAULT_PREFIX;
  if (RESERVED_PREFIXES.some((p) => prefix.toUpperCase().startsWith(p))) {
    return { error: `Prefix '${prefix}' is reserved.` };
  }
  return { error: null };
}

export function createDistributionList(input: DLUpsertInput): DistributionList {
  const { error } = validate(input);
  if (error) throw new Error(error);

  const all = readAll();
  const dupe = all.find(
    (d) => d.ownerId === CURRENT_USER && d.name.toLowerCase() === input.name.trim().toLowerCase(),
  );
  if (dupe) throw new Error(`A distribution list named '${input.name}' already exists.`);

  const prefix = input.prefix ?? DEFAULT_PREFIX;
  const name = input.name.trim();
  const now = new Date().toISOString();
  const toRaw = input.toRaw ?? "";
  const ccRaw = input.ccRaw ?? "";
  const bccRaw = input.bccRaw ?? "";
  const dl: DistributionList = {
    distributionListId: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prefix,
    name,
    displayName: `${prefix}${name}`,
    description: input.description?.trim() || undefined,
    visibility: input.visibility,
    type: "CUSTOM",
    ownerId: CURRENT_USER,
    ownerLanid: CURRENT_USER_LANID,
    toRaw,
    ccRaw,
    bccRaw,
    toMembers: parseMembersRaw(toRaw),
    ccMembers: parseMembersRaw(ccRaw),
    bccMembers: parseMembersRaw(bccRaw),
    managers: input.managers ?? [],
    createdAt: now,
    updatedAt: now,
  };
  writeAll([dl, ...all]);
  return dl;
}

export function updateDistributionList(id: string, input: DLUpsertInput): DistributionList {
  const { error } = validate(input);
  if (error) throw new Error(error);

  const all = readAll();
  const idx = all.findIndex((d) => d.distributionListId === id);
  if (idx === -1) throw new Error("Distribution list not found.");
  if (!canManageDL(all[idx])) {
    throw new Error("You don't have permission to edit this distribution list.");
  }

  const name = input.name.trim();
  const dupe = all.find(
    (d) =>
      d.distributionListId !== id &&
      d.ownerId === all[idx].ownerId &&
      d.name.toLowerCase() === name.toLowerCase(),
  );
  if (dupe) throw new Error(`A distribution list named '${name}' already exists.`);

  const prefix = input.prefix ?? all[idx].prefix;
  const toRaw = input.toRaw ?? "";
  const ccRaw = input.ccRaw ?? "";
  const bccRaw = input.bccRaw ?? "";

  const updated: DistributionList = {
    ...all[idx],
    prefix,
    name,
    displayName: `${prefix}${name}`,
    description: input.description?.trim() || undefined,
    visibility: input.visibility,
    toRaw,
    ccRaw,
    bccRaw,
    toMembers: parseMembersRaw(toRaw),
    ccMembers: parseMembersRaw(ccRaw),
    bccMembers: parseMembersRaw(bccRaw),
    // Managers are managed via the dedicated delegates dialog/endpoints —
    // preserve existing unless explicitly provided.
    managers: input.managers ?? all[idx].managers,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

/* ---------- delegates (managers) ---------- */

/**
 * Add one or more delegates to a DL. Owner-only. De-duplicates by userId.
 * Mirrors backend `POST /api/distribution-lists/{id}/delegates`.
 */
export function addDelegatesToDL(id: string, users: DirectoryUser[]): DistributionList {
  const all = readAll();
  const idx = all.findIndex((d) => d.distributionListId === id);
  if (idx === -1) throw new Error("Distribution list not found.");
  if (!canManageDelegates(all[idx])) {
    throw new Error("Only the owner can manage delegates.");
  }
  const existing = new Set(all[idx].managers.map((m) => m.userId));
  const now = new Date().toISOString();
  const fresh = users
    .filter((u) => !existing.has(u.id))
    .map<SharedUserRef>((u) => ({
      ...toSharedRef(u),
      addedBy: CURRENT_USER,
      addedAt: now,
    }));
  if (fresh.length === 0) return all[idx];
  const updated: DistributionList = {
    ...all[idx],
    managers: [...all[idx].managers, ...fresh],
    updatedAt: now,
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

/**
 * Remove a single delegate by userId. Owner-only.
 * Mirrors backend `DELETE /api/distribution-lists/{id}/delegates/{userId}`.
 */
export function removeDelegateFromDL(id: string, userId: string): DistributionList {
  const all = readAll();
  const idx = all.findIndex((d) => d.distributionListId === id);
  if (idx === -1) throw new Error("Distribution list not found.");
  if (!canManageDelegates(all[idx])) {
    throw new Error("Only the owner can manage delegates.");
  }
  const updated: DistributionList = {
    ...all[idx],
    managers: all[idx].managers.filter((m) => m.userId !== userId),
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

/**
 * Get the delegate (manager) list for a DL.
 * Mirrors backend `GET /api/distribution-lists/{id}/delegates`.
 * Throws if the DL does not exist or the caller cannot view it.
 */
export function getDelegatesForDL(id: string): SharedUserRef[] {
  const dl = getDistributionList(id);
  if (!dl) throw new Error("Distribution list not found.");
  if (!canViewDL(dl)) {
    throw new Error("You don't have permission to view this distribution list.");
  }
  return dl.managers;
}

export function deleteDistributionList(id: string): void {
  const all = readAll();
  const target = all.find((d) => d.distributionListId === id);
  if (target && !canManageDL(target)) {
    throw new Error("You don't have permission to delete this distribution list.");
  }
  writeAll(all.filter((d) => d.distributionListId !== id));
}

/* ---------- directory ---------- */

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

export interface DirectoryUser {
  id: string;
  elid?: string;
  lanid?: string;
  name: string;
  email: string;
  department?: string;
}

export function toSharedRef(u: DirectoryUser): SharedUserRef {
  return {
    userId: u.id,
    elid: u.elid,
    lanid: u.lanid,
    name: u.name,
    emailid: u.email,
    // v2: department not part of the share snapshot.
  };
}

export function fromSharedRef(s: SharedUserRef): DirectoryUser {
  return {
    id: s.userId,
    elid: s.elid,
    lanid: s.lanid,
    name: s.name,
    email: s.emailid,
  };
}

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

export function getUsersByIds(ids: string[]): DirectoryUser[] {
  const set = new Set(ids);
  return MOCK_USER_DIRECTORY.filter((u) => set.has(u.id));
}

export async function searchRecipients(query: string, limit = 10): Promise<RecipientSuggestion[]> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const out: RecipientSuggestion[] = [];

  const dls = listDistributionLists().filter((dl) => {
    const all = [...dl.toMembers, ...dl.ccMembers, ...dl.bccMembers];
    if (dl.displayName.toLowerCase().includes(q)) return true;
    if (dl.name.toLowerCase().includes(q)) return true;
    if (all.some((m) => m.email.toLowerCase().includes(q))) return true;
    return false;
  });
  for (const dl of dls.slice(0, Math.max(1, Math.floor(limit / 2)))) {
    const memberCount = dl.toMembers.length + dl.ccMembers.length + dl.bccMembers.length;
    out.push({
      type: "DL",
      id: dl.distributionListId,
      displayName: dl.displayName,
      subtitle: `${memberCount} members · ${dl.visibility.toLowerCase()}`,
      memberCount,
    });
  }

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

export interface RecipientRef {
  type: "USER" | "DL";
  id?: string;
  email?: string;
}

export interface ResolvedRecipients {
  emails: string[];
  expandedDlIds: string[];
  warnings: string[];
}

/**
 * Backwards-compatible resolver. For v2 DLs this only expands the TO bucket
 * (CC/BCC are handled separately by the run-template flow when a DL is
 * applied via the drawer).
 */
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
      const all = [...dl.toMembers, ...dl.ccMembers, ...dl.bccMembers];
      if (all.length === 0) {
        warnings.push(`DL '${dl.displayName}' is empty.`);
        continue;
      }
      all.forEach((m) => emails.add(m.email.toLowerCase()));
      expandedDlIds.push(dl.distributionListId);
    } else if (ref.email) {
      emails.add(ref.email.toLowerCase().trim());
    }
  }
  return { emails: Array.from(emails), expandedDlIds, warnings };
}
