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
