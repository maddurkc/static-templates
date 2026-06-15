
# Standard Distribution Lists — Feature Plan

A new top-level area, separate from the existing user-created "Distribution Lists". Admin / app users compose a **Standard DL** by selecting an **LOB** and a **CIO Direct**, the system fetches the org roster (App Managers, Alt App Managers, CIO-1, CIO-2, Business Manager, Alt Business Manager, etc.), and the user checks who should be included before saving.

---

## 1. Navigation

Add a new sidebar entry under existing "Distribution Lists":

```text
Sidebar
├── Templates
├── Run Templates
├── Distribution Lists        ← existing (user-owned)
└── Standard Distribution Lists  ← NEW
```

Route: `/standard-distribution-lists`

Access: visible to all signed-in users; **create / edit / delete** gated to admin role (reuse existing role check pattern).

---

## 2. Page Layout

```text
┌──────────────────────────────────────────────────────────────────┐
│  Standard Distribution Lists           [ + New Standard DL ]     │
│  Smart DLs auto-built from LOB + CIO org structure               │
├──────────────────────────────────────────────────────────────────┤
│  🔍 Search   | LOB ▾  | CIO ▾  | Owner ▾                         │
├──────────────────────────────────────────────────────────────────┤
│ • CCB-Risk-Leadership          LOB: CCB    CIO: J. Smith         │
│   42 members · Updated 2d ago · Owner: admin@org                 │
│   Roles: App Mgr (8), Alt App Mgr (6), CIO-1 (4), Biz Mgr (3)…   │
│   [ View ] [ Edit ] [ Refresh from Source ] [ Delete ]           │
│ • …                                                              │
└──────────────────────────────────────────────────────────────────┘
```

List view (consistent with the recently-redesigned DL page — no table headers, card rows).

---

## 3. Create / Edit Wizard (Dialog, 3 steps)

### Step 1 — Basics
- Name (required)
- Description
- Visibility: `PUBLIC` / `PRIVATE`

### Step 2 — Org Selection
- **LOB** dropdown (fetched from `/api/org/lobs`)
- **CIO Direct** dropdown (fetched from `/api/org/cio-directs?lob=…`, depends on LOB)
- "Load Members" button → calls backend with `{lob, cioDirect}`

### Step 3 — Role-based Member Selection

Backend returns grouped roster. Render each role as a collapsible section with a "Select all" checkbox plus per-user checkboxes.

```text
┌───────────────────────────────────────────────────────────┐
│ ▾ App Managers                       [ ☑ Select all (12) ]│
│   ☑ Alice Johnson   alice.j@org    SID: a12345            │
│   ☑ Bob Lee         bob.lee@org    SID: b67890            │
│   ☐ …                                                     │
├───────────────────────────────────────────────────────────┤
│ ▸ Alt App Managers                   [ ☐ Select all (8)  ]│
├───────────────────────────────────────────────────────────┤
│ ▸ CIO-1                              [ ☐ Select all (4)  ]│
│ ▸ CIO-2                                                   │
│ ▸ Business Managers                                       │
│ ▸ Alt Business Managers                                   │
└───────────────────────────────────────────────────────────┘
Footer: Selected: 27 users across 6 roles    [ Back ] [ Save ]
```

Each selected user is tagged internally with the **role** they came from, so later we can show role breakdown and re-resolve on refresh.

---

## 4. Detail / View Drawer

When clicking a Standard DL:
- Header: name, LOB, CIO, owner, last refreshed
- "Refresh from Source" button — re-queries backend; shows diff (added / removed) before applying
- Members grouped by role, expandable; copy-emails button per group
- Used in `N` templates (links to Run Templates)

---

## 5. Integration with Run Templates

In the existing **DL drawer** on Run Templates, add a tab:

```text
[ My DLs ] [ Standard DLs ]
```

Selection behaviour identical to current DLs (chip + auto-populate To/CC/BCC, removal clears only that DL's emails — per `DL_RECIPIENT_REQUIREMENTS.md`). Chip is visually distinct (e.g. badge "STD").

---

## 6. Data Model (frontend mock first, mirrors future backend)

```ts
type OrgRole =
  | "APP_MANAGER" | "ALT_APP_MANAGER"
  | "CIO_1" | "CIO_2"
  | "BUSINESS_MANAGER" | "ALT_BUSINESS_MANAGER";

interface StandardDLMember {
  lanid: string;
  name: string;
  email: string;
  role: OrgRole;          // which bucket they came from
  bucket: "TO"|"CC"|"BCC";// default TO; editable
}

interface StandardDistributionList {
  id: string;
  name: string;
  description?: string;
  visibility: "PUBLIC"|"PRIVATE";
  lob: string;            // e.g. "CCB"
  cioDirectLanid: string; // selected CIO direct
  cioDirectName: string;
  members: StandardDLMember[];
  ownerLanid: string;
  createdAt: string;
  updatedAt: string;
  lastRefreshedAt?: string;
}
```

---

## 7. Backend Contract (to spec for Spring Boot side later)

```text
GET  /api/org/lobs                       -> [{code, name}]
GET  /api/org/cio-directs?lob=CCB        -> [{lanid, name}]
GET  /api/org/roster?lob=CCB&cio=js123   -> {
        appManagers:[...], altAppManagers:[...],
        cio1:[...], cio2:[...],
        businessManagers:[...], altBusinessManagers:[...]
     }

GET    /api/standard-dls
POST   /api/standard-dls
GET    /api/standard-dls/{id}
PUT    /api/standard-dls/{id}
DELETE /api/standard-dls/{id}
POST   /api/standard-dls/{id}/refresh    -> returns diff preview
```

MS SQL Server tables (per project conventions):

```sql
standard_distribution_list (
  id UNIQUEIDENTIFIER PK,
  name NVARCHAR(200), description NVARCHAR(1000),
  visibility NVARCHAR(20), lob NVARCHAR(50),
  cio_direct_lanid NVARCHAR(50), cio_direct_name NVARCHAR(200),
  owner_lanid NVARCHAR(50),
  created_at DATETIME2, updated_at DATETIME2, last_refreshed_at DATETIME2
)
standard_dl_member (
  id UNIQUEIDENTIFIER PK,
  std_dl_id UNIQUEIDENTIFIER FK,
  lanid NVARCHAR(50), name NVARCHAR(200), email NVARCHAR(320),
  role NVARCHAR(40), bucket NVARCHAR(10)
)
```

---

## 8. Frontend Build Steps

1. `src/lib/standardDistributionListStorage.ts` — types, mock LOB / CIO / roster data, CRUD against localStorage (mirrors `distributionListStorage.ts`).
2. `src/pages/StandardDistributionLists.tsx` + `.module.scss` — list view (cards, filters).
3. `src/components/standardDL/StandardDLWizard.tsx` — 3-step dialog (Basics → Org Select → Role Picker).
4. `src/components/standardDL/RoleMemberPicker.tsx` — collapsible role groups w/ select-all.
5. `src/components/standardDL/StandardDLDetail.tsx` — view drawer + refresh diff.
6. Update `AppSidebar.tsx` — add "Standard DLs" entry + icon (`Building2` or `Network`).
7. Update Run Templates DL drawer — add tab; reuse existing chip + removal logic.
8. Update `DL_RECIPIENT_REQUIREMENTS.md` to note Standard DLs follow identical chip-removal rules.

---

## 9. Out of Scope (this iteration)
- Real backend wiring (mock data only; contract documented for backend team).
- Scheduled auto-refresh of rosters (manual "Refresh from Source" only).
- Per-member override notes / exclusions list.

---

### Decisions needed before build
1. Sidebar label: **"Standard DLs"** vs **"Standard Distribution Lists"** vs **"Smart DLs"**?
2. Are the six roles fixed, or should role list be configurable (admin-managed)?
3. On "Refresh from Source", default behaviour: auto-apply diff, or always require confirm?
4. Should non-admin users be able to *use* Standard DLs in Run Templates but not create them? (assumed yes)
