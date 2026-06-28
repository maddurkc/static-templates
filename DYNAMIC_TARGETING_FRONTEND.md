# Dynamic Targeting (DL Drawer · Tab 2)

A second tab inside the Run Templates page's DL drawer that lets the
user build a **JSON spec** describing recipients in terms of the
org graph (LOB → Apps → CIO Direct → role buckets), instead of
picking a pre-curated custom Smart DL.

Backend persists the JSON to a new `dynamic_targetting` table; on
send the resolver re-expands it against the live org roster.

---

## 1. Tabs in the DL Drawer

Drawer is wrapped in `<Tabs>` with two tabs:

| Tab value | Label              | What it does                                       |
| --------- | ------------------ | -------------------------------------------------- |
| `custom`  | Custom Smart DL    | Existing curated DL list (unchanged behaviour).    |
| `dynamic` | Dynamic Targeting  | New panel — builds the targeting JSON.             |

**File:** `src/pages/RunTemplates.tsx`
**Lines:** ~2464–2625 (`<SheetContent>` body, `<Tabs>` wrapper).

---

## 2. New Component — `DynamicTargetingPanel`

**File:** `src/components/dynamicTargeting/DynamicTargetingPanel.tsx`

Props:
```ts
interface Props {
  initial?: DynamicTargetingPayload | null;
  onApply: (payload: DynamicTargetingPayload, resolved: DynamicTargetingResolved) => void;
  onClose?: () => void;
}
```

Renders, top-down:
1. **Live recipient preview** (`To` / `Cc` / `Bcc` rows) — recomputed
   from the current selections every render (`useMemo`, lines 109-130).
2. **3 selectors** (lines 167-205):
   - LOB — `<Select>` (single).
   - Applications — multi-select checkbox list, filtered by LOB.
   - CIO Direct — `<Select>` (single), filtered by LOB.
3. **6 role sections** (lines 208-310), one per code in `DT_ROLES`:
   - Section-level **checkbox** (`Select all in this role`) + To/CC/BCC
     radio. Checking it sets `mode = "ALL"` (lines 218-236).
   - Collapsible **filter + individual picker** (lines 244-308):
     search box, per-user checkbox, per-user To/CC/BCC radio. Picking
     any individual switches the section to `mode = "FILTERED"`.
4. **Apply / Cancel buttons** (lines 312-315).

Cascading LOB reset is handled in a `useEffect` (lines 96-100) that
drops `apps` / `cioDirect` that no longer belong to the chosen LOB.

---

## 3. Role Catalogue

**File:** `src/lib/dynamicTargetingData.ts` (lines 53-68)

```ts
export const DT_ROLES: DTRoleDef[] = [
  { code: "TECH_MANAGER",        label: "Tech Manager"        },
  { code: "ALT_TECH_MANAGER",    label: "Alt Tech Manager"    },
  { code: "BUSINESS_OWNER",      label: "Business Owner"      },
  { code: "ALT_BUSINESS_OWNER",  label: "Alt Business Owner"  },
  { code: "CIO1",                label: "CIO-1"               },
  { code: "CIO2",                label: "CIO-2"               },
];
```

Backed by a mock roster (`MOCK_ROSTERS`, lines 95-180) — swap with
real fetch calls when backend is live.

### Suggested Backend Endpoints (Spring Boot)
```
GET  /api/org/lobs
GET  /api/org/apps?lob={lob}
GET  /api/org/cio-directs?lob={lob}
GET  /api/org/dynamic-roster?lob=&apps=&cio=
```

---

## 4. JSON Payload Shape

**File:** `src/lib/dynamicTargetingData.ts` (lines 197-212)

```jsonc
{
  "lob": "CCB",
  "apps": ["CCB-CARD-AUTH", "CCB-MOBILE"],
  "cioDirect": "CCB-CIO-D1",
  "sections": {
    "TECH_MANAGER": {
      "mode": "ALL",
      "bucket": "TO"
    },
    "BUSINESS_OWNER": {
      "mode": "FILTERED",
      "users": [
        { "email": "megan.liu@firm.com", "bucket": "CC" },
        { "email": "oliver.bryant@firm.com", "bucket": "BCC" }
      ]
    }
  }
}
```

Rules:
- A section is **omitted** if the user left it `OFF` (nothing selected).
- `mode: "ALL"` carries one `bucket` for the whole role.
- `mode: "FILTERED"` carries an explicit per-user `bucket`.

---

## 5. Wiring into `RunTemplates.tsx`

### 5.1 State

**File:** `src/pages/RunTemplates.tsx`
**Lines:** 117-120

```tsx
const [appliedDLs, setAppliedDLs] = useState<DistributionList[]>([]);
// Dynamic Targeting (built in DL drawer's 2nd tab; sent in payload as `dynamicTargeting`).
const [dynamicTargeting, setDynamicTargeting] = useState<DynamicTargetingPayload | null>(null);
const DT_SOURCE_ID = "__dt__";
```

### 5.2 Apply handler (drawer Tab 2)

**File:** `src/pages/RunTemplates.tsx`
**Lines:** ~2603–2638

On `onApply`:
- Each resolved user is injected into `toUsers` / `ccUsers` / `bccUsers`,
  tagged with `sourceDLIds: [DT_SOURCE_ID]` so the existing
  chip-removal cleanup (`stripDl` reducer) safely removes them when
  the user clicks `×` on the "Dynamic Targeting" chip.
- Manually-typed users (no `sourceDLIds`) are never altered.
- The `payload` is stored in `dynamicTargeting` state.

### 5.3 Dynamic Targeting chip

**File:** `src/pages/RunTemplates.tsx`
**Lines:** ~2684–2715

Green chip rendered next to applied DL chips. The chip's `×` strips
the `DT_SOURCE_ID` tag from all three buckets (removing users that
came in only via dynamic targeting) and clears the JSON state.

### 5.4 Send payload

**File:** `src/pages/RunTemplates.tsx`
**Lines:** ~1747–1759

```ts
const payload = {
  templateId: selectedTemplate.id,
  toEmails: toPayload.emails,
  ccEmails: ccPayload.emails,
  bccEmails: bccPayload.emails,
  toRefs:  toPayload.refs,
  ccRefs:  ccPayload.refs,
  bccRefs: bccPayload.refs,
  contentData: { subject_data: subjectData, body_data: bodyData },
  // Dynamic Targeting JSON — backend persists to `dynamic_targetting`
  // table and re-resolves on send so the email reflects current org roster.
  dynamicTargeting: dynamicTargeting ?? null,
  renderedHtml: fullEmailHtml,
};
```

---

## 6. Backend Notes (out of scope here, for follow-up)

### 6.1 New table — `dynamic_targetting`
```sql
CREATE TABLE dynamic_targetting (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  message_id      BIGINT NOT NULL,        -- FK to sent message
  lob             VARCHAR(64),
  cio_direct      VARCHAR(64),
  payload_json    JSON NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dt_message FOREIGN KEY (message_id) REFERENCES message(id)
);
```

### 6.2 Send flow
1. `MessageController.send(...)` accepts the existing payload + new
   `dynamicTargeting` field (`DynamicTargetingDto`).
2. If present, persist a `DynamicTargettingEntity` row.
3. `RecipientResolverService.resolveDynamic(payload)` walks the JSON,
   calls the org service for each role bucket, and returns a
   `Map<Bucket, List<String>>` of emails to merge with the existing
   `toEmails / ccEmails / bccEmails`.

### 6.3 DTO sketch
```java
public record DynamicTargetingDto(
    String lob,
    List<String> apps,
    String cioDirect,
    Map<String, SectionSelection> sections
) {
    public sealed interface SectionSelection permits AllSel, FilteredSel {}
    public record AllSel(String mode, String bucket) implements SectionSelection {}
    public record FilteredSel(String mode, List<UserSel> users) implements SectionSelection {}
    public record UserSel(String email, String bucket) {}
}
```

---

## 7. Files Touched / Added

| Path                                                                | Change |
| ------------------------------------------------------------------- | ------ |
| `src/lib/dynamicTargetingData.ts`                                   | **NEW** — types, role catalogue, mock org data, payload shape. |
| `src/components/dynamicTargeting/DynamicTargetingPanel.tsx`         | **NEW** — the Dynamic Targeting tab UI. |
| `src/pages/RunTemplates.tsx`                                        | Imports (33-37), state (117-120), drawer Tabs (~2464-2625), DT chip (~2684-2715), payload field (~1753). |
| `DYNAMIC_TARGETING_FRONTEND.md`                                     | **NEW** — this document. |

---

## 8. Storage Strategy — Persist Intent, Resolve on Send

The JSON in §4 captures the **selection intent** (LOB / Apps / CIO / role
buckets), NOT a frozen list of email addresses. The backend stores this
intent in a `dynamic_targetting` table and re-expands it against the
live org roster every time a message is sent. This keeps payloads small
(role labels instead of N hundred emails) and keeps recipients fresh as
people join/leave roles.

### 8.1 Tables

```sql
-- The reusable "saved dynamic target" definition.
CREATE TABLE dynamic_targetting (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  name            NVARCHAR(255) NOT NULL,   -- DL-style auto-generated name (see §9)
  lob             NVARCHAR(64),
  cio_direct      NVARCHAR(64),
  apps_csv        NVARCHAR(2000),           -- denormalised for quick filter
  payload_json    NVARCHAR(MAX) NOT NULL,   -- full intent JSON from §4
  created_by      NVARCHAR(64) NOT NULL,
  created_at      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Per-send snapshot — what the JSON actually resolved to at send time.
-- Used for audit / "who got this email?" queries; never re-resolved.
CREATE TABLE message_dynamic_targetting (
  id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
  message_id               BIGINT NOT NULL,
  dynamic_targetting_id    BIGINT NULL,         -- nullable if anonymous one-off
  resolved_to_emails       NVARCHAR(MAX),
  resolved_cc_emails       NVARCHAR(MAX),
  resolved_bcc_emails      NVARCHAR(MAX),
  resolved_at              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT fk_mdt_message FOREIGN KEY (message_id) REFERENCES message(id),
  CONSTRAINT fk_mdt_def     FOREIGN KEY (dynamic_targetting_id) REFERENCES dynamic_targetting(id)
);
```

### 8.2 Send-time flow

1. `MessageController.send(...)` receives `dynamicTargeting` (the §4
   JSON) on the outbound payload.
2. If present and not yet persisted, insert a row into
   `dynamic_targetting`; otherwise reuse the existing id.
3. `DynamicTargetingResolver.resolve(payloadJson)`:
   - Walks each `sections[role]` entry.
   - `mode: "ALL"`  → fetch all roster users for that role within
     `{lob, apps, cioDirect}` and assign to the section's `bucket`.
   - `mode: "FILTERED"` → take the explicit `users[]` list (matched
     by `lanid` against the roster for stability across email changes).
   - Dedupe across buckets: a user that lands in both TO and CC is
     kept in the **highest priority bucket** (TO > CC > BCC).
4. Merge resolved emails with the manually-typed recipients already
   present on the message, then send.
5. Snapshot resolved emails into `message_dynamic_targetting` for
   audit before SMTP submission.

### 8.3 Why not emails in the JSON?

- Payload size — a single LOB can contain hundreds of role-holders;
  inlining emails would routinely break the request size limit.
- Freshness — the org graph changes; resolving at send time always
  reflects the current roster.
- Audit — `message_dynamic_targetting` preserves the historical
  expansion without polluting the reusable definition.

---

## 9. Auto-Generated Record Name (DL-style)

Every Dynamic Targeting record is named **like a distribution list**
(PascalCase tokens joined by `-`) so users can recognise it in lists
and reuse it. The preview updates live as the user changes any
selection in the panel.

### 9.1 Formula

```
{LOB}-{AppsPart}-{CIOPart?}-{RolesPart?}[-Custom]
```

| Token        | Rule |
| ------------ | ---- |
| `LOB`        | The selected LOB code as-is (`CCB`, `CIB`, …). |
| `AppsPart`   | • all apps selected → `AllApps`<br>• 1 app → `AppShort` (LOB prefix stripped, PascalCased: `CCB-CARD-AUTH` → `CardAuth`)<br>• 2 apps → `A+B`<br>• 3+ apps → `A+Nmore`<br>• 0 apps → omitted |
| `CIOPart`    | PascalCased CIO Direct name (`Priya Raman` → `PriyaRaman`); omitted if none. |
| `RolesPart`  | • all 6 roles active → `AllLeadership`<br>• otherwise friendly tokens joined by `-`: `TechMgrs`, `AltTechMgrs`, `BizOwners`, `AltBizOwners`, `CIO1`, `CIO2`.<br>• omitted if no roles active. |
| `-Custom`    | Appended when ANY role is in `FILTERED` mode (individual users picked rather than the whole role). Signals "this is not a clean role-level cut." |

### 9.2 Examples

| Selection                                                                  | Generated name                                    |
| -------------------------------------------------------------------------- | ------------------------------------------------- |
| CCB · 1 app (Card Auth) · CIO Priya Raman · all TMs + all BOs              | `CCB-CardAuth-PriyaRaman-TechMgrs-BizOwners`      |
| CCB · all 4 apps · all 6 roles                                             | `CCB-AllApps-AllLeadership`                       |
| CIB · 2 apps (Trading, Risk) · CIO Sarah Connor · all TMs + CIO1 + 2 of 3 BOs | `CIB-Trading+Risk-SarahConnor-TechMgrs-BizOwners-CIO1-Custom` |
| AWM · 1 app (Advisor Portal) · no CIO · TMs only                           | `AWM-AdvisorPortal-TechMgrs`                      |
| CCB · 5 apps · no CIO · all TMs                                            | `CCB-CardAuth+4more-TechMgrs`                     |

### 9.3 Implementation

**File:** `src/components/dynamicTargeting/DynamicTargetingPanel.tsx`

| Lines     | What |
| --------- | ---- |
| 73–81     | `ROLE_FRIENDLY` map — role code → DL-style token. |
| 83–86     | `toPascal` helper. |
| 88–90     | `shortApp` — strips `{LOB}-` prefix and PascalCases the app code. |
| 92–152    | `generateTargetName(...)` — implements the formula above. |
| (header)  | Sticky header renders the name in an editable `<Input>`; user can override the suggestion or click **"use suggested"** to snap back to the generated value. The `nameEdited` flag stops the auto-name from clobbering a manual edit. |

The name flows into the payload sent to `/api/distribution-targets`
(or in-line with the message) as the `name` field on the
`dynamic_targetting` row.

