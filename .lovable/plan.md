# Distribution Lists — Functional Refactor

## Goals

1. **Visibility** is now binary: `PUBLIC` or `PRIVATE` only (drop `SHARED`).
2. **Management/Sharing** is now an independent concept — *any* DL (public or private) can have a list of "shared managers" who can **edit/delete** alongside the owner. Pure viewing of public DLs remains open to everyone.
3. **Type** column added (`CUSTOM` for now; reserved for future system DLs).
4. **Owner LAN ID** stored alongside `owner_id` (AD ent id).
5. Members split into **To / CC / BCC** (three textareas, three raw blobs).
6. In **Run Templates** add a "Distribution Lists" drawer trigger — lists DLs visible to current user; selecting one populates To/CC/BCC fields on the run template.

---

## Data Model Changes

### `distribution_list`
| column | change |
|---|---|
| `visibility` | CHECK now `('PUBLIC','PRIVATE')` only |
| `type` | **NEW** `NVARCHAR(20) NOT NULL DEFAULT 'CUSTOM'`, CHECK `('CUSTOM')` |
| `owner_id` | unchanged (AD ent id) |
| `owner_lanid` | **NEW** `NVARCHAR(50) NULL` |
| `members_raw` | **REMOVED** |
| `to_raw` | **NEW** `NVARCHAR(MAX) NULL` |
| `cc_raw` | **NEW** `NVARCHAR(MAX) NULL` |
| `bcc_raw` | **NEW** `NVARCHAR(MAX) NULL` |

### `distribution_list_share`
Repurposed from "viewers" to **"managers"** (can edit/delete). Columns unchanged: `distribution_list_share_id, distribution_list_id, user_id, elid, lanid, name, emailid, department`.

### Visibility / Management Predicate (canonical)
```sql
-- VISIBLE TO U:
dl.visibility = 'PUBLIC'
 OR dl.owner_id = :uid
 OR EXISTS (SELECT 1 FROM distribution_list_share s
            WHERE s.distribution_list_id = dl.distribution_list_id
              AND s.user_id = :uid)

-- CAN MANAGE (edit/delete) by U:
dl.owner_id = :uid
 OR EXISTS (SELECT 1 FROM distribution_list_share s
            WHERE s.distribution_list_id = dl.distribution_list_id
              AND s.user_id = :uid)
```

---

## Backend (documented in `DISTRIBUTION_LISTS_BACKEND.md`)

- Update §1 SQL migration: add `type`, `owner_lanid`, drop `members_raw`, add `to_raw/cc_raw/bcc_raw`, tighten visibility CHECK.
- Add a separate migration note for existing rows (`UPDATE … SET to_raw = members_raw`).
- Update `DistributionListEntity` (new fields, drop `membersRaw`).
- Update `DistributionListDto` + `DistributionListUpsertDto` (3 raw fields, `type`, `ownerLanid`).
- Update `DistributionListService`: permission check uses `owner OR isManager`; create persists `type='CUSTOM'`, `ownerLanid` from authenticated user.
- Update `DistributionListRepository.findVisibleTo` — new predicate above.
- Update §14 frontend wiring map.
- Remove `SHARED` visibility throughout doc; rename the `SharedUserPicker` concept to "Managers".

---

## Frontend

### `src/lib/distributionListStorage.ts`
- `DLVisibility = "PRIVATE" | "PUBLIC"`.
- Add `type: "CUSTOM"`, `ownerLanid: string`.
- Replace `membersRaw` with `toRaw`, `ccRaw`, `bccRaw`; expose derived `toMembers`, `ccMembers`, `bccMembers` arrays.
- Rename `sharedWith` → `managers` (same `SharedUserRef` shape).
- Update validation: at least one valid email across To/CC/BCC.
- Update `listDistributionLists` predicate (PUBLIC OR owner OR manager).
- `listDistributionListsPaged` visibility filter options: `ALL | PUBLIC | PRIVATE` (drop SHARED tab).
- Re-seed demo data with new shape.

### `src/pages/DistributionLists.tsx`
- Visibility select: Private / Public only.
- "Managers" section always visible (independent of visibility) with the existing user-picker UI; help text: "These users can edit/delete this list".
- Members section becomes **three** textareas (To / CC / BCC) with chip previews per bucket.
- Filter tabs: All / Public / Private.
- Card preview shows To/CC/BCC counts and a "Managers: n" badge.

### `src/pages/RunTemplates.tsx`
- Add a "Distribution Lists" button near the To field that opens a right-side drawer (using `@/components/ui/sheet`).
- Drawer lists DLs from `listDistributionLists()` with search; clicking a DL appends its `toRaw/ccRaw/bccRaw` content into the corresponding run-template To/CC/BCC fields (dedup).

### `src/pages/SharedUserPicker.tsx`
- Keep the component; relabel default placeholder to "Search users to add as managers…". No functional change to picker itself.

---

## Out of Scope
- No actual backend code execution (this project is FE-only); backend changes are documentation-only in the `.md` file.
- No schema migration runs against any DB.
- Existing API contract in §14 updated in-doc; no live network calls change.

After approval I will edit: `DISTRIBUTION_LISTS_BACKEND.md`, `src/lib/distributionListStorage.ts`, `src/pages/DistributionLists.tsx`, `src/pages/DistributionLists.module.scss` (minor additions), `src/pages/SharedUserPicker.tsx` (label only), `src/pages/RunTemplates.tsx` (add drawer trigger + handler).
