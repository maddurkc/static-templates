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

export interface DistributionList {
  id: string;
  prefix: string;             // "DSPCH-"
  name: string;               // "TeamAlpha"
  displayName: string;        // "DSPCH-TeamAlpha"
  description?: string;
  visibility: DLVisibility;
  ownerId: string;
  members: DLMember[];
  sharedWith: string[];
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

const STORAGE_KEY = "smart_distribution_lists";
const DEFAULT_PREFIX = "DSPCH-";
const RESERVED_PREFIXES = ["SYS-", "ADMIN-"];
const CURRENT_USER = "me";   // demo placeholder

/* ---------- low-level persistence ---------- */

function readAll(): DistributionList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDemoLists();
      writeAll(seeded);
      return seeded;
    }
    return JSON.parse(raw) as DistributionList[];
  } catch {
    return [];
  }
}

function writeAll(lists: DistributionList[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

function seedDemoLists(): DistributionList[] {
  const now = new Date().toISOString();
  return [
    {
      id: "dl-demo-eng",
      prefix: DEFAULT_PREFIX,
      name: "EngineeringTeam",
      displayName: `${DEFAULT_PREFIX}EngineeringTeam`,
      description: "Core engineering distribution",
      visibility: "SHARED",
      ownerId: CURRENT_USER,
      members: [
        { email: "john.doe@company.com", displayName: "John Doe" },
        { email: "jane.smith@company.com", displayName: "Jane Smith" },
        { email: "mike.brown@company.com", displayName: "Mike Brown" },
        { email: "emma.taylor@company.com", displayName: "Emma Taylor" },
      ],
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
      members: [
        { email: "bob.wilson@company.com", displayName: "Bob Wilson" },
        { email: "alice.johnson@company.com", displayName: "Alice Johnson" },
        { email: "sarah.davis@company.com", displayName: "Sarah Davis" },
      ],
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
      dl.sharedWith.includes(CURRENT_USER),
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
  members: DLMember[];
  sharedWith?: string[];
}

function validate(input: DLUpsertInput): string | null {
  const name = input.name.trim();
  if (!name) return "Name is required.";
  if (!/^[A-Za-z0-9]+$/.test(name)) {
    return "Name can only contain letters and numbers — no spaces or special characters.";
  }
  if (input.members.length === 0) return "At least one member email is required.";
  const prefix = input.prefix ?? DEFAULT_PREFIX;
  if (RESERVED_PREFIXES.some((p) => prefix.toUpperCase().startsWith(p))) {
    return `Prefix '${prefix}' is reserved.`;
  }
  for (const m of input.members) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) {
      return `Invalid email: ${m.email}`;
    }
  }
  if (input.visibility === "SHARED" && (!input.sharedWith || input.sharedWith.length === 0)) {
    return "SHARED visibility requires at least one shared user.";
  }
  return null;
}


export function createDistributionList(input: DLUpsertInput): DistributionList {
  const err = validate(input);
  if (err) throw new Error(err);

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
    members: input.members.map((m) => ({ email: m.email.toLowerCase().trim(), displayName: m.displayName })),
    sharedWith: input.visibility === "SHARED" ? input.sharedWith ?? [] : [],
    createdAt: now,
    updatedAt: now,
  };
  writeAll([dl, ...all]);
  return dl;
}

export function updateDistributionList(id: string, input: DLUpsertInput): DistributionList {
  const err = validate(input);
  if (err) throw new Error(err);

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
    members: input.members.map((m) => ({ email: m.email.toLowerCase().trim(), displayName: m.displayName })),
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

const MOCK_USER_DIRECTORY: { id: string; name: string; email: string; department?: string }[] = [
  { id: "u-1", name: "John Doe", email: "john.doe@company.com", department: "Engineering" },
  { id: "u-2", name: "Jane Smith", email: "jane.smith@company.com", department: "Design" },
  { id: "u-3", name: "Bob Wilson", email: "bob.wilson@company.com", department: "Marketing" },
  { id: "u-4", name: "Alice Johnson", email: "alice.johnson@company.com", department: "Sales" },
  { id: "u-5", name: "Mike Brown", email: "mike.brown@company.com", department: "Engineering" },
  { id: "u-6", name: "Sarah Davis", email: "sarah.davis@company.com", department: "HR" },
  { id: "u-7", name: "Tom Miller", email: "tom.miller@company.com", department: "Finance" },
  { id: "u-8", name: "Emma Taylor", email: "emma.taylor@company.com", department: "Engineering" },
  { id: "u-9", name: "Chris Anderson", email: "chris.anderson@company.com", department: "Product" },
  { id: "u-10", name: "Lisa Martinez", email: "lisa.martinez@company.com", department: "Legal" },
];

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
