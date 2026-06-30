# Distribution Lists & Dynamic Targeting — Feature Overview

A single source-of-truth document covering **why** these features exist,
**what** they do, **how** they work, and the **advantages** they bring
to the email-templating platform.

Companion docs (deep-dives):
- `DISTRIBUTION_LISTS_BACKEND.md` — Spring Boot entities, controllers, services, repos, DTOs, SQL.
- `DL_RECIPIENT_REQUIREMENTS.md` — Manual vs DL-sourced recipient rules.
- `DYNAMIC_TARGETING_FRONTEND.md` — Drawer Tab 2 UX, JSON shape, storage strategy, naming.
- `.lovable/plan.md` — Standard (Smart) DL plan.

---

## 1. The Problem

Email programs at the firm fan out to large, **org-structured** audiences:
LOBs, applications, role holders (Tech Managers, Business Owners, CIO-1,
CIO-2, etc.). Today users typing recipients into Outlook face three pains:

1. **Stale lists.** Hand-curated address books drift the moment someone
   changes role; the wrong people get notified, the right ones don't.
2. **No reuse.** Every program manager rebuilds the same "all CCB tech
   managers" list from scratch every send.
3. **Auditability gap.** No record of *why* a person was on a send — was
   it a manual pick, a role membership, or because a DL included them?

The platform solves this with **three complementary recipient mechanisms**,
each suited to a different use case.

| Mechanism                       | Owner       | Audience source           | Best when…                                                  |
| ------------------------------- | ----------- | ------------------------- | ----------------------------------------------------------- |
| Manual selection                | End user    | Free-text autocomplete    | Ad-hoc recipients, exceptions.                              |
| Distribution List (Custom)      | DL owner    | Hand-picked users         | Curated working groups, project teams.                      |
| Standard Distribution List      | Admin       | LOB + CIO Direct roster   | Org-shaped audiences that change slowly.                    |
| Dynamic Targeting               | Sender      | LOB + Apps + CIO + Roles  | Send-time targeting against the live org graph.             |

---

## 2. Distribution Lists (Custom)

User-created, hand-curated recipient bundles with sharing/delegation.

### 2.1 What it solves
- One-click recipient population for recurring sends.
- **Delegation**: an owner can let teammates manage the same DL —
  add/remove members without giving up ownership.
- Permission isolation: shared read access does NOT grant manage access.

### 2.2 Key capabilities
- CRUD on a DL (name, description, visibility PUBLIC/PRIVATE).
- Member buckets per DL (each member tagged TO / CC / BCC).
- Delegates list — owner + any delegate can add/remove delegates and
  manage members (`requireDelegateManage` check on the backend).
- Single `POST /api/distribution-lists/{id}/delegates` sync endpoint:
  client posts the full desired delegate set; server diffs against
  the table and inserts/removes accordingly (no separate add/delete).
- `GET /api/distribution-lists/{id}/delegates` for the delegates drawer.

### 2.3 UX (frontend)
- `src/pages/DistributionLists.tsx` — flat **list view** (no table
  headers, no card grid); each row self-describes member and delegate
  counts.
- Delegates Dialog (`src/components/templates/DelegatesDialog.tsx`)
  loads existing delegates, lets the user search/add/remove, and
  POSTs the consolidated list via `syncDelegatesForDL`.

### 2.4 Advantages
- Reuse across sends and across teammates.
- Safe shared management — no need to share a single owner account.
- Bucket assignment lives with the DL, so populated recipients land
  in the right field automatically.

---

## 3. Standard Distribution Lists (Smart DLs)

Admin-curated DLs whose members are derived from the **org structure**
(LOB + CIO Direct + roles) rather than typed individually.

### 3.1 What it solves
- Eliminates the "all App Managers under CIO X" copy-paste exercise.
- Keeps role-shaped audiences current via a one-click
  **Refresh from Source** that diffs the live roster.

### 3.2 Key capabilities
- 3-step wizard: Basics → Org Selection (LOB + CIO) → Role-based
  member picker (App Mgrs, Alt App Mgrs, CIO-1, CIO-2, Business
  Mgrs, Alt Business Mgrs) with "Select all" per role.
- Per-member bucket (TO/CC/BCC), defaulted to TO.
- "Refresh from Source" shows the **diff** before applying.
- Surfaced in the Run Templates DL drawer as a second tab next to
  user DLs — chips display with an "STD" badge.

### 3.3 Advantages
- Authoritative org data is the source of truth.
- Lower maintenance — refresh, don't rebuild.
- Same chip semantics as custom DLs (removing the chip removes only
  that DL's emails — see §5).

---

## 4. Dynamic Targeting (Send-time, JSON-driven)

A second tab inside the Run Templates DL drawer that builds a JSON
spec describing recipients in **org-graph terms** (LOB → Apps → CIO
Direct → role buckets). The backend persists the spec and re-resolves
it to actual emails at send time.

### 4.1 What it solves
- Send-time freshness — recipients are computed against the live
  roster the moment the email goes out.
- Avoids exploding huge recipient lists into the request payload
  (which would routinely break size limits).
- Captures **intent** ("all Tech Managers under CCB, Card Auth app,
  CIO Priya Raman") rather than a frozen email list.

### 4.2 How it works
1. User opens DL drawer → "Dynamic Targeting" tab.
2. Selects LOB → narrows Apps (multi) and CIO Direct (single).
3. For each of 6 roles (Tech Mgr, Alt Tech Mgr, Biz Owner, Alt Biz
   Owner, CIO-1, CIO-2):
   - **Bulk mode** — one-click `TO|CC|BCC` pill assigns the entire
     role to that bucket (`mode: "ALL"`).
   - **Filtered mode** — expand, search, check individual members
     with per-user bucket (`mode: "FILTERED"`).
4. Sticky header shows:
   - Auto-generated **DL-style name** (`CCB-CardAuth-PriyaRaman-TechMgrs-BizOwners`)
     editable inline, with "use suggested" to snap back.
   - Compact recipient summary with `+N more`, expandable groups,
     individual `×` removal, and an `AlertTriangle` warning when
     total recipients exceed 40.
5. **Apply** pushes the resolved users into To/CC/BCC tagged with
   `sourceDLIds: ["__dt__"]` so the existing chip-removal flow can
   strip them cleanly.
6. The JSON spec rides along on the send payload as
   `dynamicTargeting`; backend stores it in `dynamic_targetting`
   and snapshots the resolved emails into
   `message_dynamic_targetting` for audit.

### 4.3 JSON shape (intent, not emails)
```json
{
  "lob": "CCB",
  "apps": ["CCB-CARD-AUTH", "CCB-MOBILE"],
  "cioDirect": "CCB-CIO-D1",
  "sections": {
    "TECH_MANAGER":   { "mode": "ALL", "bucket": "TO" },
    "BUSINESS_OWNER": { "mode": "FILTERED",
      "users": [
        { "lanid": "u123", "bucket": "CC"  },
        { "lanid": "u456", "bucket": "BCC" }
      ]
    }
  }
}
```

### 4.4 Storage strategy
- `dynamic_targetting` — reusable saved definition (name + intent JSON).
- `message_dynamic_targetting` — per-send snapshot of resolved emails
  for audit. Never re-resolved.
- Send-time resolver dedupes across buckets (TO > CC > BCC) and
  merges with manually-typed recipients.

### 4.5 Advantages
- **Always fresh** — the roster is queried at send.
- **Small payloads** — role labels and `lanid`s instead of hundreds
  of email strings.
- **Auditable** — snapshot table answers "who got this email and why?".
- **Reusable** — saved with a DL-style auto-name so users can re-pick
  the same targeting on the next send.

---

## 5. Recipient Rules (apply to ALL mechanisms)

Documented in `DL_RECIPIENT_REQUIREMENTS.md`; reproduced here so this
file is self-contained.

### 5.1 Two sources
- **Manual** — user types in To/CC/BCC; autocomplete resolves names.
- **DL / Standard DL / Dynamic Targeting** — chip-driven, auto-populates
  the buckets.

### 5.2 Chip-removal semantics
Removing a chip removes **only** the recipients contributed by that
chip. Manual picks and recipients contributed by other DLs/chips are
preserved. Implemented via a `sourceDLIds: string[]` tag on each
recipient object; the `stripDl` reducer in `RunTemplates.tsx` filters
out only the matching source id.

Use cases (all behave the same):
1. Manual users first, then DL added → remove DL chip = manual users stay.
2. DL first plus manual users → remove DL chip = manual users stay.
3. Any combination of multiple DLs + Dynamic Targeting + manual.

### 5.3 Display format
Recipient pills show the user's **name** (first + last), not the raw
email. Email is retained on hover/title. Where no resolved name exists
a name is parsed from the email local-part.

---

## 6. Where each piece lives

| Concern                          | File(s) |
| -------------------------------- | ------- |
| Custom DL UI                     | `src/pages/DistributionLists.tsx`, `src/components/templates/DelegatesDialog.tsx` |
| Custom DL client storage / API   | `src/lib/distributionListStorage.ts` |
| Custom DL backend (spec)         | `DISTRIBUTION_LISTS_BACKEND.md` |
| Standard DL UI                   | `src/pages/StandardDistributionLists.tsx`, `src/components/standardDL/StandardDLWizard.tsx` |
| Standard DL client storage       | `src/lib/standardDistributionListStorage.ts` |
| Standard DL plan / backend spec  | `.lovable/plan.md` |
| Dynamic Targeting panel          | `src/components/dynamicTargeting/DynamicTargetingPanel.tsx` |
| Dynamic Targeting data + types   | `src/lib/dynamicTargetingData.ts` |
| Dynamic Targeting wiring         | `src/pages/RunTemplates.tsx` (state ~117–120, drawer ~2464–2625, chip ~2684–2715, payload ~1747–1759) |
| Recipient rules                  | `DL_RECIPIENT_REQUIREMENTS.md` |

---

## 7. How they compose on the Run Templates page

```text
Run Templates
├── Row 1 — DL button + applied chips (Custom DL · Standard DL · Dynamic Targeting)
├── Row 2 — To   (manual + DL-sourced, name display)
├── Row 3 — Cc
└── Row 4 — Bcc

DL Drawer
├── Tab: Custom Smart DL   (My DLs + Standard DLs)
└── Tab: Dynamic Targeting (LOB / Apps / CIO + 6 roles, live preview)
```

A single send can mix all four sources. Each contribution is tagged
so chip removal stays surgical and audit logs stay coherent.

---

## 8. Summary of Advantages

| Capability                     | Custom DL | Standard DL | Dynamic Targeting |
| ------------------------------ | :-------: | :---------: | :---------------: |
| Curated by humans              | ✅        | ✅ (admin)  | ❌                |
| Auto-tracks org changes        | ❌        | 🔄 refresh  | ✅ at send time   |
| Reusable across sends          | ✅        | ✅          | ✅ (saved spec)   |
| Delegated management           | ✅        | (admin)     | n/a               |
| Small request payload          | ✅        | ✅          | ✅ (intent only)  |
| Per-send audit snapshot        | logs      | logs        | dedicated table   |
| One-click bulk role assignment | ❌        | partial     | ✅                |

Together they cover the full range from "small fixed team" to
"every Tech Manager in CCB right now" without forcing the user to
maintain address books by hand.
