# Custom Smart Distribution Lists — Backend (Spring Boot + MS SQL Server)

Complete server-side implementation for **Custom Smart Distribution Lists (DLs)** used in the Run Templates recipient pickers (To / CC / BCC). DLs coexist with regular email contacts in a single unified autocomplete.

Display convention: every DL is shown with a configurable prefix (default **`DSPCH-`**), e.g. `DSPCH-TeamAlpha`. The prefix is stored separately from the name so it can be re-branded without data migration.

---

## Build Order Mapping

| Step | Section |
|------|---------|
| 1. SQL migration + JPA entities + DTOs | §1, §2, §3 |
| 2. CRUD endpoints + unit tests | §4, §10 |
| 3. `/recipients/search` unified endpoint | §5 |
| 4. DL management page (CRUD UI) | *(frontend — `src/pages/DistributionLists.tsx`)* |
| 5. Extend autocomplete to render DL rows + chips | *(frontend — `UserAutocomplete.tsx`)* |
| 6. Switch RunTemplates to `Recipient[]` model | *(frontend — `RunTemplates.tsx`)* |
| 7. Backend `RecipientResolverService` + send-flow integration | §6, §7 |
| 8. Resend: persist DL ids in payload, re-expand on resend | §8 |

---

## ⚠️ v2 Refactor (canonical — overrides any conflicting detail below)

The following changes are **authoritative**. The legacy sections below (DDL, entity, DTOs, service, repository, validation table, §12 picker, §13 contract notes, §14 frontend types, §15 paged query) have been **merged inline** to match v2 — no `members_raw`, no `SHARED` visibility, no "shared viewers" remain in code blocks. References to v1 still appear only in this banner and in the §16 history note for context.

### 1. Visibility is binary
| Visibility | Visible to |
|------------|------------|
| `PUBLIC`   | Everyone (any authenticated user) |
| `PRIVATE`  | Owner only — **plus any user listed as a manager** |

The `SHARED` enum value is **removed**.

### 2. Management (formerly "sharing") is independent of visibility
`distribution_list_share` rows now represent **managers** — users (besides the owner) who can **edit and delete** the DL. Managers can exist on **any** visibility (PUBLIC *or* PRIVATE). Column names are unchanged for backward compatibility.

### 3. New columns on `distribution_list`
| Column | Type | Purpose |
|--------|------|---------|
| `type` | `NVARCHAR(20) NOT NULL DEFAULT 'CUSTOM'` | Reserved for future system DLs. Currently always `CUSTOM`. CHECK constraint `IN ('CUSTOM')`. |
| `owner_lanid` | `NVARCHAR(50) NULL` | LAN id of the creator, persisted alongside `owner_id` (AD enterprise id). |

### 4. Members split into To / CC / BCC
`members_raw` is **dropped**. Replaced with three verbatim NVARCHAR(MAX) blobs:
- `to_raw`
- `cc_raw`
- `bcc_raw`

All three use the same parsing rules (`, ; : space newline` separators, email regex filter). The `parseMembers()` helper now runs three times — once per bucket.

### 5. Canonical SQL predicates

```sql
-- VISIBLE TO :uid
dl.is_active = 1
 AND ( dl.visibility = 'PUBLIC'
       OR dl.owner_id = :uid
       OR EXISTS (SELECT 1 FROM dbo.distribution_list_share s
                  WHERE s.distribution_list_id = dl.distribution_list_id
                    AND s.user_id = :uid) )

-- CAN MANAGE (edit / delete) by :uid
dl.owner_id = :uid
 OR EXISTS (SELECT 1 FROM dbo.distribution_list_share s
            WHERE s.distribution_list_id = dl.distribution_list_id
              AND s.user_id = :uid)
```

`DistributionListService` MUST use the *manage* predicate (not just `owner_id`) when checking edit/delete permission.

### 6. Run Templates "DL drawer"
The Run Templates page now exposes a "DLs" button next to the **To** field. It opens a right-side drawer listing all DLs visible to the current user (via the predicate above). Clicking a DL **appends** its `to_raw / cc_raw / bcc_raw` parsed emails into the corresponding To / CC / BCC fields of the run template (dedup on lowercase). No backend changes are required — the drawer reuses `GET /api/distribution-lists` and `GET /api/distribution-lists/{id}`.

### 7. Migration notes (existing data)
```sql
-- Add new columns
ALTER TABLE dbo.distribution_list ADD type         NVARCHAR(20)  NOT NULL CONSTRAINT df_dl_type DEFAULT 'CUSTOM';
ALTER TABLE dbo.distribution_list ADD owner_lanid  NVARCHAR(50)  NULL;
ALTER TABLE dbo.distribution_list ADD to_raw       NVARCHAR(MAX) NULL;
ALTER TABLE dbo.distribution_list ADD cc_raw       NVARCHAR(MAX) NULL;
ALTER TABLE dbo.distribution_list ADD bcc_raw      NVARCHAR(MAX) NULL;

-- Backfill existing rows: treat the old single blob as the To bucket
UPDATE dbo.distribution_list SET to_raw = members_raw WHERE members_raw IS NOT NULL;

-- Tighten visibility CHECK (drop SHARED → rewrite as PRIVATE)
UPDATE dbo.distribution_list SET visibility = 'PRIVATE' WHERE visibility = 'SHARED';
ALTER TABLE dbo.distribution_list DROP CONSTRAINT ck_dl_visibility;
ALTER TABLE dbo.distribution_list ADD  CONSTRAINT ck_dl_visibility CHECK (visibility IN ('PUBLIC','PRIVATE'));
ALTER TABLE dbo.distribution_list ADD  CONSTRAINT ck_dl_type       CHECK (type IN ('CUSTOM'));

-- Finally drop the legacy column
ALTER TABLE dbo.distribution_list DROP COLUMN members_raw;
```

### 8. JPA / DTO impact (apply to entity/DTO blocks further below)
- `DistributionListEntity`: drop `membersRaw`; add `type` (enum `Type { CUSTOM }` mapped to `NVARCHAR(20)`), `ownerLanid` (`String`), `toRaw`, `ccRaw`, `bccRaw` (each `@Column(columnDefinition = "NVARCHAR(MAX)")`). Rename collection field `sharedWith` → `managers` (column unchanged).
- `Visibility` enum: `{ PRIVATE, PUBLIC }`.
- `DistributionListDto` / `DistributionListUpsertDto`: replace `membersRaw` with `toRaw`, `ccRaw`, `bccRaw`; add `type`, `ownerLanid`; rename `sharedWith` → `managers`. `@NotBlank` moves from `membersRaw` to a service-level guard requiring **at least one** valid email across the three buckets.
- `DistributionListService`:
  - `applyUpsert` writes the three raw blobs + sets `type = CUSTOM` + persists `ownerLanid` from the authenticated principal.
  - Permission check helper `canManage(dl, uid) = dl.ownerId.equals(uid) || dl.managers.stream().anyMatch(m -> m.userId.equals(uid))` — called by `update` and `delete`. Throws `ForbiddenException` otherwise.
  - Drop the "SHARED requires non-empty sharedWith" validation; managers are optional on every DL.
- `DistributionListRepository.findVisibleTo` / `findVisibleToFiltered`: use the predicate in §5.

### 9. Frontend storage mapping
`src/lib/distributionListStorage.ts` mirrors v2 1:1:
- `DLVisibility = "PRIVATE" | "PUBLIC"`
- `DistributionList.type: "CUSTOM"`, `ownerLanid?: string`
- `toRaw / ccRaw / bccRaw` + derived `toMembers / ccMembers / bccMembers`
- `managers: SharedUserRef[]` (was `sharedWith`)
- Helpers `canViewDL(dl, uid)` and `canManageDL(dl, uid)` match the SQL predicates above.

---




## 1. SQL Migration (MS SQL Server)

`V20260610__create_distribution_lists.sql`

```sql
-- =============================================================
-- Custom Smart Distribution Lists
-- =============================================================

CREATE TABLE dbo.distribution_list (
    distribution_list_id  UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_dl PRIMARY KEY DEFAULT NEWID(),
                                                                    -- JPA maps to `String` via @GenericGenerator("uuid2").
    name                  NVARCHAR(150)    NOT NULL,                -- "TeamAlpha" (no prefix)
    prefix                NVARCHAR(20)     NOT NULL CONSTRAINT df_dl_prefix DEFAULT 'DSPCH-',
    description           NVARCHAR(500)    NULL,
    owner_id              NVARCHAR(100)    NOT NULL,                -- AD enterprise id of creator
    owner_lanid           NVARCHAR(50)     NULL,                    -- LAN id of creator (v2)
    visibility            NVARCHAR(20)     NOT NULL CONSTRAINT df_dl_vis DEFAULT 'PRIVATE',
                                                                    -- v2: PRIVATE | PUBLIC (SHARED removed)
    type                  NVARCHAR(20)     NOT NULL CONSTRAINT df_dl_type DEFAULT 'CUSTOM',
                                                                    -- v2: CUSTOM (reserved for future system DLs)
    -- Verbatim textarea blobs — SINGLE source of truth for recipients.
    -- Parsed on read via parseMembersRaw() using separators , ; : space newline.
    to_raw                NVARCHAR(MAX)    NULL,
    cc_raw                NVARCHAR(MAX)    NULL,
    bcc_raw               NVARCHAR(MAX)    NULL,
    is_active             BIT              NOT NULL CONSTRAINT df_dl_act DEFAULT 1,
    created_at            DATETIME2        NOT NULL CONSTRAINT df_dl_cat DEFAULT SYSUTCDATETIME(),
    updated_at            DATETIME2        NOT NULL CONSTRAINT df_dl_uat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT uq_dl_owner_name UNIQUE (owner_id, name),
    CONSTRAINT ck_dl_visibility CHECK (visibility IN ('PRIVATE','PUBLIC')),
    CONSTRAINT ck_dl_type       CHECK (type IN ('CUSTOM'))
);

CREATE INDEX ix_dl_name      ON dbo.distribution_list(name);
CREATE INDEX ix_dl_active    ON dbo.distribution_list(is_active) INCLUDE (owner_id, visibility);

-- =============================================================
-- v2: distribution_list_share rows now represent MANAGERS — users
-- (besides the owner) authorised to EDIT / DELETE the DL. Managers
-- can be attached to any visibility (PUBLIC or PRIVATE).
-- Snapshot semantics: rows survive even if a user is later removed
-- from AD/SCIM, so audit history stays intact.
-- =============================================================
CREATE TABLE dbo.distribution_list_share (
    distribution_list_share_id  UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_dls PRIMARY KEY DEFAULT NEWID(),
    distribution_list_id        UNIQUEIDENTIFIER NOT NULL,          -- FK → distribution_list.distribution_list_id
    user_id                     NVARCHAR(100)    NOT NULL,          -- internal directory id
    elid                        NVARCHAR(50)     NULL,              -- enterprise / employee id
    lanid                       NVARCHAR(50)     NULL,              -- LAN / network id
    name                        NVARCHAR(150)    NOT NULL,
    emailid                     NVARCHAR(255)    NOT NULL,
    -- v2: `department` column removed. Department is a directory attribute,
    -- not a snapshot field — it is fetched fresh from the user directory
    -- when the picker / drawer needs to display it.
    -- v3 (delegate audit): track WHO added a delegate and WHEN, so we can
    -- answer "who gave Bob edit rights?" — populated by the
    -- POST /api/distribution-lists/{id}/delegates endpoint.
    added_by                    NVARCHAR(100)    NULL,              -- ownerId/lanid of the user who added this delegate
    added_at                    DATETIME2        NULL CONSTRAINT df_dls_added_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT uq_dls_dl_user UNIQUE (distribution_list_id, user_id),  -- one manager row per (DL, user)
    CONSTRAINT fk_dls_dl FOREIGN KEY (distribution_list_id)
        REFERENCES dbo.distribution_list(distribution_list_id) ON DELETE CASCADE
);

CREATE INDEX ix_dls_user  ON dbo.distribution_list_share(user_id);
CREATE INDEX ix_dls_lanid ON dbo.distribution_list_share(lanid);
CREATE INDEX ix_dls_elid  ON dbo.distribution_list_share(elid);
```

---

## 2. JPA Entities

Two entity classes, suffixed `Entity` to clearly separate them from DTOs and
the frontend `DistributionList` TS interface.

```java
// ===== imports (shared by both entity files) =====
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.GenericGenerator;

@Entity @Table(name = "distribution_list")
@Getter @Setter @NoArgsConstructor
public class DistributionListEntity {
    /**
     * Primary key. The DB column is `UNIQUEIDENTIFIER` (UUID), but in JPA we
     * map it to `String` so DTOs / REST paths / JSON payloads stay portable
     * (no UUID (de)serialisation quirks). Hibernate generates a v4 UUID on
     * insert via `@GenericGenerator(strategy = "uuid2")`.
     */
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "distribution_list_id", nullable = false, updatable = false, length = 36)
    private String distributionListId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 20)
    private String prefix = "DSPCH-";

    @Column(length = 500)
    private String description;

    @Column(name = "owner_id", nullable = false, length = 100)
    private String ownerId;

    @Column(name = "owner_lanid", length = 50)
    private String ownerLanid;                              // v2

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Visibility visibility = Visibility.PRIVATE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type = Type.CUSTOM;                        // v2

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    /**
     * v2: Verbatim textarea content split into three buckets (To / CC / BCC).
     * SINGLE source of truth for recipients — no normalised member entity.
     * Parse on read with `DistributionListService.parseMembers`
     * (separators: `, ; : space newline`).
     */
    @Column(name = "to_raw",  columnDefinition = "NVARCHAR(MAX)") private String toRaw;
    @Column(name = "cc_raw",  columnDefinition = "NVARCHAR(MAX)") private String ccRaw;
    @Column(name = "bcc_raw", columnDefinition = "NVARCHAR(MAX)") private String bccRaw;

    /**
     * v2: Managers — users (besides the owner) authorised to edit / delete
     * this DL. Stored as full directory snapshots so the UI never has to
     * round-trip back to AD for rendering, and so audit history survives.
     */
    @OneToMany(mappedBy = "distributionList", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<DistributionListShareEntity> managers = new ArrayList<>();

    @PreUpdate void touch() { this.updatedAt = LocalDateTime.now(); }

    public enum Visibility { PRIVATE, PUBLIC }              // v2: SHARED removed
    public enum Type       { CUSTOM }                       // v2
}

@Entity @Table(
    name = "distribution_list_share",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_dls_dl_user",
        columnNames = {"distribution_list_id", "user_id"}))
@Getter @Setter @NoArgsConstructor
public class DistributionListShareEntity {
    /**
     * Surrogate primary key. DB column is `UNIQUEIDENTIFIER` (UUID); mapped
     * here as `String` for the same portability reasons as {@link DistributionListEntity}.
     * Generated server-side by Hibernate `@GenericGenerator("uuid2")` — never
     * set manually on create.
     */
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(name = "distribution_list_share_id", nullable = false, updatable = false, length = 36)
    private String distributionListShareId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "distribution_list_id", nullable = false)
    private DistributionListEntity distributionList;

    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;                  // internal directory id

    @Column(length = 50)                    private String elid;       // enterprise / employee id
    @Column(length = 50)                    private String lanid;      // LAN / network id
    @Column(nullable = false, length = 150) private String name;
    @Column(nullable = false, length = 255) private String emailid;
    // v2: `department` field removed — see §1 share-table comment.

    // v3 (delegate audit): populated by addDelegates() — see §17 + §4.
    @Column(name = "added_by", length = 100)
    private String addedBy;

    @Column(name = "added_at")
    private LocalDateTime addedAt;
}
```

---

## 3. DTOs

```java
// ===== imports =====
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import com.example.dl.DistributionListEntity.Visibility;  // enum lives on the entity

public record DistributionListDto(
    String distributionListId,
    String prefix,
    String name,
    String displayName,                 // prefix + name -> "DSPCH-TeamAlpha"
    String description,
    String visibility,                  // v2: PRIVATE | PUBLIC
    String type,                        // v2: CUSTOM
    String ownerId,
    String ownerLanid,                  // v2
    int memberCount,                    // derived: sum of parseMembers across to/cc/bcc
    List<String> toEmails,              // v2: derived from toRaw
    List<String> ccEmails,              // v2: derived from ccRaw
    List<String> bccEmails,             // v2: derived from bccRaw
    String toRaw,                       // v2: SOURCE OF TRUTH — verbatim To blob
    String ccRaw,                       // v2: SOURCE OF TRUTH — verbatim CC blob
    String bccRaw,                      // v2: SOURCE OF TRUTH — verbatim BCC blob
    List<SharedUserDto> managers,       // v2: full directory snapshot (was sharedWith)
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}

/** Full snapshot of a manager/delegate. Mirrors `distribution_list_share`. */
public record SharedUserDto(
    String distributionListShareId, // surrogate PK (UUID, server-generated); null on create
    String userId,                  // internal directory id (unique per DL)
    String elid,                    // enterprise / employee id  (nullable)
    String lanid,                   // LAN / network id          (nullable)
    String name,
    String emailid,
    String addedBy,                 // v3 — userId of whoever provisioned this delegate
    String addedAt                  // v3 — ISO-8601 timestamp
    // v2: `department` removed — not persisted on the share row. UIs that
    // need it should fetch from the directory (DirectoryUserDto / §11).
) {}

public record DistributionListUpsertDto(
    @NotBlank @Size(max = 150)
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "Name can only contain letters and numbers — no spaces or special characters.")
    String name,
    @Size(max = 20)             String prefix,        // typically readonly / server-controlled; null -> default DSPCH-
    @Size(max = 500)            String description,
    @NotNull                    Visibility visibility,// v2: PRIVATE | PUBLIC
    /**
     * v2: Verbatim textarea blobs split into three buckets. The service requires
     * at least ONE valid email across the three combined; individual buckets
     * may be blank. `type` defaults to CUSTOM on the server.
     *
     * v3: `managers` is NO LONGER part of the upsert payload. Delegate
     * mutations go through the dedicated endpoints (see §17):
     *   POST   /api/distribution-lists/{id}/delegates
     *   DELETE /api/distribution-lists/{id}/delegates/{userId}
     * The service IGNORES any `managers` field if a v2 client still sends it.
     */
                                String toRaw,
                                String ccRaw,
                                String bccRaw
) {}

/** v3 — body for POST /api/distribution-lists/{id}/delegates */
public record AddDelegatesRequest(
    @NotNull List<SharedUserDto> users   // directory snapshots; addedBy/addedAt may be null (server fills)
) {}

/** Unified result returned by /recipients/search. type=USER | DL. */
public record RecipientSuggestionDto(
    String type,
    String id,              // distributionListId for DL, directory user id for USER
    String email,           // USER only
    String displayName,     // user name OR "DSPCH-TeamAlpha"
    String subtitle,        // user email/department OR "12 members · public"
    Integer memberCount     // DL only
) {}


/** Payload entry sent by frontend in to/cc/bcc lists. */
public record RecipientRefDto(
    String type,            // "USER" | "DL"
    String id,              // distributionListId (for DL)
    String email            // raw email (for USER) — falls back to id for free-typed entries
) {}
```

---

## 4. Repositories, Service, Controller (CRUD)

```java
// ===== imports =====
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DistributionListRepository extends JpaRepository<DistributionListEntity, String> {

    @Query("""
        select dl from DistributionListEntity dl
        where dl.active = true
          and (dl.ownerId = :uid
               or dl.visibility = 'PUBLIC'
               or exists (select 1 from DistributionListShareEntity s
                            where s.distributionList = dl and s.userId = :uid))
        order by dl.name
    """)
    List<DistributionListEntity> findVisibleTo(@Param("uid") String userId);

    /**
     * Used by the unified search. LIKE pattern must be pre-wrapped with %...%.
     * Matches name / prefix+name OR a substring of any of the three verbatim
     * blobs (to_raw / cc_raw / bcc_raw) since there is no per-member row to join on.
     */
    @Query(value = """
        SELECT DISTINCT TOP (:lim) dl.*
        FROM distribution_list dl
        LEFT JOIN distribution_list_share s
          ON s.distribution_list_id = dl.distribution_list_id
        WHERE dl.is_active = 1
          AND (dl.owner_id = :uid OR dl.visibility = 'PUBLIC' OR s.user_id = :uid)
          AND ( LOWER(dl.prefix + dl.name)   LIKE :q
             OR LOWER(dl.name)               LIKE :q
             OR LOWER(dl.to_raw)             LIKE :q
             OR LOWER(dl.cc_raw)             LIKE :q
             OR LOWER(dl.bcc_raw)            LIKE :q )
        ORDER BY dl.name
    """, nativeQuery = true)
    List<DistributionListEntity> searchVisibleTo(@Param("uid") String userId,
                                           @Param("q") String like,
                                           @Param("lim") int limit);

}

/**
 * v3 — companion repository for the share table. Used by the delegate
 * endpoints (§17) to add/remove rows without round-tripping the parent DL.
 */
public interface DistributionListShareRepository
        extends JpaRepository<DistributionListShareEntity, String> {

    boolean existsByDistributionList_DistributionListIdAndUserId(
        String distributionListId, String userId);

    long deleteByDistributionList_DistributionListIdAndUserId(
        String distributionListId, String userId);
}
```

```java
// ===== imports =====
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import com.example.dl.DistributionListEntity.Visibility;

@Service
@RequiredArgsConstructor
public class DistributionListService {

    private final DistributionListRepository repo;
    private final DistributionListShareRepository shareRepo;  // v3
    private final CurrentUserProvider currentUser;

    @Transactional(readOnly = true)
    public List<DistributionListDto> listMine() {
        return repo.findVisibleTo(currentUser.id()).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public DistributionListDto get(String distributionListId) {
        var dl = repo.findById(distributionListId).orElseThrow(() -> new NotFoundException("DL not found"));
        requireReadAccess(dl);
        return toDto(dl);
    }

    @Transactional
    public DistributionListDto create(DistributionListUpsertDto in) {
        var dl = new DistributionListEntity();
        // distributionListId is assigned by Hibernate (@GenericGenerator "uuid2")
        // on flush — do NOT set it manually.
        dl.setOwnerId(currentUser.id());
        applyUpsert(dl, in);
        return toDto(repo.save(dl));
    }

    @Transactional
    public DistributionListDto update(String distributionListId, DistributionListUpsertDto in) {
        var dl = repo.findById(distributionListId).orElseThrow(() -> new NotFoundException("DL not found"));
        requireManage(dl);                          // v2: owner OR manager
        applyUpsert(dl, in);
        return toDto(repo.save(dl));
    }

    @Transactional
    public void delete(String distributionListId) {
        var dl = repo.findById(distributionListId).orElseThrow(() -> new NotFoundException("DL not found"));
        requireManage(dl);                          // v2: owner OR manager
        dl.setActive(false);                        // soft delete preserves audit trail of past sends
        repo.save(dl);
    }

    /* ------------- helpers ------------- */

    /**
     * Loads a DL by id or throws {@link NotFoundException}.
     * Exposed as `public` so the controller can fetch the entity once
     * (for delegate endpoints) and hand it to the service mutators
     * without re-querying. All permission checks still run inside
     * the mutator methods ({@link #addDelegates}, {@link #removeDelegate}).
     */
    @Transactional(readOnly = true)
    public DistributionListEntity loadOrThrow(String distributionListId) {
        return repo.findById(distributionListId)
            .orElseThrow(() -> new NotFoundException("DL not found"));
    }

    /** Exposes the current authenticated user id to controllers (used to stamp `added_by` on delegate rows). */
    public String currentUserId() {
        return currentUser.id();
    }

    /** v2 permission gate: owner or one of the managers. Used for edit/delete content. */
    private void requireManage(DistributionListEntity dl) {
        String uid = currentUser.id();
        boolean ok = dl.getOwnerId().equals(uid)
                  || dl.getManagers().stream().anyMatch(m -> uid.equals(m.getUserId()));
        if (!ok) throw new ForbiddenException("You don't have permission to modify this distribution list.");
    }


    /**
     * v3 (updated): permission gate for delegate add/remove.
     * Allowed for the OWNER or any user already listed as a delegate.
     * Same predicate as {@link #requireManage}, kept as a distinct method
     * so we can tighten it independently in the future without grepping.
     */
    private void requireDelegateManage(DistributionListEntity dl) {
        String uid = currentUser.id();
        boolean ok = dl.getOwnerId().equals(uid)
                  || dl.getManagers().stream().anyMatch(m -> uid.equals(m.getUserId()));
        if (!ok) throw new ForbiddenException("Only the owner or an existing delegate can manage delegates.");
    }

    private void applyUpsert(DistributionListEntity dl, DistributionListUpsertDto in) {
        // Parse + validate members BEFORE persisting so we never store junk.
        List<String> parsed = new java.util.ArrayList<>();
        parsed.addAll(parseMembers(in.toRaw()));
        parsed.addAll(parseMembers(in.ccRaw()));
        parsed.addAll(parseMembers(in.bccRaw()));
        if (parsed.isEmpty()) {
            throw new BadRequestException("At least one valid email across To / CC / BCC is required.");
        }

        dl.setName(in.name().trim());
        dl.setPrefix(StringUtils.hasText(in.prefix()) ? in.prefix() : "DSPCH-");
        dl.setDescription(in.description());
        dl.setVisibility(in.visibility());          // v2: PRIVATE | PUBLIC
        dl.setType(DistributionListEntity.Type.CUSTOM);
        dl.setOwnerLanid(currentUser.lanid());      // v2
        dl.setToRaw(in.toRaw());                    // stored VERBATIM
        dl.setCcRaw(in.ccRaw());
        dl.setBccRaw(in.bccRaw());

        // v3: managers are NOT mutated here. The upsert DTO no longer
        // carries a `managers` field; delegate changes flow through
        // addDelegates() / removeDelegate() (see §17). Existing
        // managers on `dl` are left untouched.
    }

    /* ---------- v3 delegate endpoints (see §17) ---------- */

    @Transactional
    public DistributionListDto addDelegates(DistributionListEntity dl,
                                            List<SharedUserDto> users,
                                            String actorUserId) {
        requireDelegateManage(dl);
        if (users == null) users = List.of();
        String ownerId = dl.getOwnerId();
        var now = LocalDateTime.now();
        for (SharedUserDto s : users) {
            if (s.userId() == null || s.userId().equals(ownerId)) continue;     // owner is implicit
            if (shareRepo.existsByDistributionList_DistributionListIdAndUserId(
                    dl.getDistributionListId(), s.userId())) continue;          // idempotent
            var row = new DistributionListShareEntity();
            row.setDistributionList(dl);
            row.setUserId(s.userId());
            row.setElid(s.elid());
            row.setLanid(s.lanid());
            row.setName(s.name());
            row.setEmailid(s.emailid().toLowerCase().trim());
            row.setAddedBy(actorUserId);
            row.setAddedAt(now);
            dl.getManagers().add(row);
        }
        return toDto(repo.save(dl));
    }

    @Transactional
    public DistributionListDto removeDelegate(DistributionListEntity dl, String userId) {
        requireDelegateManage(dl);
        if (dl.getOwnerId().equals(userId))
            throw new BadRequestException("Owner cannot be removed as a delegate.");
        dl.getManagers().removeIf(m -> userId.equals(m.getUserId()));
        return toDto(repo.save(dl));
    }

    /**
     * Single authoritative parser for any verbatim recipient blob (to/cc/bcc).
     * Splits on `, ; : whitespace newline`, lowercases, dedupes, validates.
     */
    public static List<String> parseMembers(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        return Arrays.stream(raw.split("[,;:\\s\\n]+"))
            .map(String::trim).map(String::toLowerCase)
            .filter(s -> !s.isEmpty())
            .filter(s -> s.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            .distinct()
            .toList();
    }

    private DistributionListDto toDto(DistributionListEntity dl) {
        List<String> to  = parseMembers(dl.getToRaw());
        List<String> cc  = parseMembers(dl.getCcRaw());
        List<String> bcc = parseMembers(dl.getBccRaw());
        return new DistributionListDto(
            dl.getDistributionListId(), dl.getPrefix(), dl.getName(),
            dl.getPrefix() + dl.getName(),
            dl.getDescription(),
            dl.getVisibility().name(),
            dl.getType().name(),
            dl.getOwnerId(),
            dl.getOwnerLanid(),
            to.size() + cc.size() + bcc.size(),
            to, cc, bcc,
            dl.getToRaw(), dl.getCcRaw(), dl.getBccRaw(),
            dl.getManagers().stream()
                .map(s -> new SharedUserDto(
                    s.getDistributionListShareId(),
                    s.getUserId(), s.getElid(), s.getLanid(),
                    s.getName(), s.getEmailid(),
                    s.getAddedBy(),                                                  // v3
                    s.getAddedAt() == null ? null : s.getAddedAt().toString()))      // v3 ISO-8601
                .toList(),
            dl.getCreatedAt(),
            dl.getUpdatedAt()
        );
    }

    /** v2: any logged-in user can READ a PUBLIC list; otherwise must be owner or manager. */
    private void requireReadAccess(DistributionListEntity dl) {
        var uid = currentUser.id();
        if (dl.getVisibility() == Visibility.PUBLIC) return;
        if (dl.getOwnerId().equals(uid)) return;
        if (dl.getManagers().stream().anyMatch(s -> uid.equals(s.getUserId()))) return;
        throw new ForbiddenException();
    }
}
```

```java
// ===== imports =====
import java.util.List;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/distribution-lists")
@RequiredArgsConstructor
public class DistributionListController {
    private final DistributionListService service;

    @GetMapping                          public List<DistributionListDto>  list()                                                              { return service.listMine(); }
    @GetMapping("/{distributionListId}") public DistributionListDto         get(@PathVariable String distributionListId)                       { return service.get(distributionListId); }
    @PostMapping                         public DistributionListDto         create(@Valid @RequestBody DistributionListUpsertDto in)           { return service.create(in); }
    @PutMapping("/{distributionListId}") public DistributionListDto         update(@PathVariable String distributionListId,
                                                                                   @Valid @RequestBody DistributionListUpsertDto in)          { return service.update(distributionListId, in); }
    @DeleteMapping("/{distributionListId}") public void                     delete(@PathVariable String distributionListId)                    { service.delete(distributionListId); }

    /* ---------- v3 delegate endpoints (owner OR existing delegate, see §17) ---------- */

    @PostMapping("/{distributionListId}/delegates")
    public DistributionListDto addDelegates(@PathVariable String distributionListId,
                                            @Valid @RequestBody AddDelegatesRequest req) {
        var dl = service.loadOrThrow(distributionListId);
        return service.addDelegates(dl, req.users(), service.currentUserId());
    }

    @DeleteMapping("/{distributionListId}/delegates/{userId}")
    public DistributionListDto removeDelegate(@PathVariable String distributionListId,
                                              @PathVariable String userId) {
        var dl = service.loadOrThrow(distributionListId);
        return service.removeDelegate(dl, userId);
    }
}
```

---

## 4a. Exception Classes & Global Handler

Place under `com.bank.notifications.distributionlists.exception` (or your shared `com.bank.notifications.common.exception` package if you already have one — keep it consistent across modules).

### `NotFoundException.java`

```java
package com.bank.notifications.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }

    public NotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

### `BadRequestException.java`

```java
package com.bank.notifications.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }

    public BadRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

### `ForbiddenException.java`

```java
package com.bank.notifications.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class ForbiddenException extends RuntimeException {
    public ForbiddenException() {
        super("You are not allowed to perform this action.");
    }

    public ForbiddenException(String message) {
        super(message);
    }

    public ForbiddenException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

### `ConflictException.java` (optional — useful for unique-name / duplicate-share collisions)

```java
package com.bank.notifications.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }

    public ConflictException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

### `GlobalExceptionHandler.java`

Centralises error responses so the React frontend always gets a consistent JSON shape: `{ "status": <int>, "error": <reason>, "message": <human-readable>, "path": <request-uri>, "timestamp": <ISO> }`.

```java
package com.bank.notifications.common.exception;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.dao.DataIntegrityViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NotFoundException ex, HttpServletRequest req) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), req);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(BadRequestException ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), req);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(ForbiddenException ex, HttpServletRequest req) {
        return build(HttpStatus.FORBIDDEN, ex.getMessage(), req);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(ConflictException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), req);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, "Data integrity violation (likely duplicate or constraint).", req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(this::formatFieldError)
                .collect(Collectors.joining("; "));
        return build(HttpStatus.BAD_REQUEST, msg.isBlank() ? "Validation failed." : msg, req);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex, HttpServletRequest req) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error: " + ex.getMessage(), req);
    }

    private String formatFieldError(FieldError fe) {
        return fe.getField() + " " + (fe.getDefaultMessage() == null ? "is invalid" : fe.getDefaultMessage());
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message, HttpServletRequest req) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("path", req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}
```

### Where each exception is thrown

| Exception            | Thrown from                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `NotFoundException`  | `DistributionListService.get/update/delete` when `repo.findById(...)` is empty                       |
| `BadRequestException`| `DistributionListService.create/update` when members list parses to zero valid emails                |
| `ForbiddenException` | `DistributionListService` ownership checks (non-owner trying to update/delete/share)                 |
| `ConflictException`  | Optional — wrap `DataIntegrityViolationException` when DL name collides per owner, or duplicate share|

---

## 5. Unified Recipient Search Endpoint


`GET /api/recipients/search?q=dsp&limit=10` — used by `UserAutocomplete` in To/CC/BCC.

```java
// ===== imports =====
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import lombok.RequiredArgsConstructor;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import com.example.dl.DistributionListEntity.Visibility;

@RestController
@RequestMapping("/api/recipients")
@RequiredArgsConstructor
public class RecipientSearchController {

    private final DistributionListRepository dlRepo;
    private final UserDirectoryService users;     // your AD/SSO directory service
    private final CurrentUserProvider currentUser;

    @GetMapping("/search")
    public List<RecipientSuggestionDto> search(
            @RequestParam("q") String q,
            @RequestParam(value = "limit", defaultValue = "10") int limit) {

        if (!StringUtils.hasText(q)) return List.of();

        String like = "%" + q.toLowerCase().trim() + "%";
        int half = Math.max(1, limit / 2);

        // Parallel directory + DL search
        var dlFuture   = CompletableFuture.supplyAsync(() ->
            dlRepo.searchVisibleTo(currentUser.id(), like, half));
        var userFuture = CompletableFuture.supplyAsync(() ->
            users.searchByNameOrEmail(q, limit));

        var dls   = dlFuture.join();
        var found = userFuture.join();

        List<RecipientSuggestionDto> out = new ArrayList<>(dls.size() + found.size());
        // DLs ranked first so prefix matches surface above identically-named people
        for (var dl : dls) {
            int count = DistributionListService.parseMembers(dl.getToRaw()).size()
                      + DistributionListService.parseMembers(dl.getCcRaw()).size()
                      + DistributionListService.parseMembers(dl.getBccRaw()).size();
            String visBadge = dl.getVisibility() == Visibility.PUBLIC ? " · public" : " · private";
            out.add(new RecipientSuggestionDto(
                "DL", dl.getDistributionListId(), null,
                dl.getPrefix() + dl.getName(),
                count + " members" + visBadge,
                count));
        }
        for (var u : found) {
            out.add(new RecipientSuggestionDto(
                "USER", u.id(), u.email(), u.name(),
                u.email() + (u.department() != null ? " • " + u.department() : ""),
                null));
        }
        return out;
    }
}
```

Frontend contract (mirrored in `UserAutocomplete.tsx`):

```
GET  /api/recipients/search?q=dsp     -> RecipientSuggestionDto[]
```

---

## 6. RecipientResolverService — DL Expansion at Send Time (v2)

**v2 changes:**
- Reads from the three verbatim buckets (`toRaw`, `ccRaw`, `bccRaw`) instead of the removed `membersRaw`.
- Returns a richer `Resolved` record that preserves the bucket split, so callers can append a DL's emails into the **matching** To/CC/BCC bucket on the send payload (mirrors the frontend "DLs" drawer behaviour in Run Templates).
- Visibility check uses the v2 predicate: `PUBLIC` OR owner OR present in `managers` (renamed from `sharedWith`).

```java
// ===== imports =====
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.example.dl.DistributionListEntity.Visibility;

@Service
@RequiredArgsConstructor
public class RecipientResolverService {

    private final DistributionListRepository dlRepo;
    private final CurrentUserProvider currentUser;

    /**
     * Resolved recipients for ONE bucket on the send payload. The three
     * sub-buckets (toEmails / ccEmails / bccEmails) carry the emails that
     * came from any expanded DL split by its own To/CC/BCC, so the caller
     * can merge them into the matching outgoing bucket.
     */
    public record Resolved(
            List<String> toEmails,
            List<String> ccEmails,
            List<String> bccEmails,
            List<String> expandedDlIds,
            List<String> warnings) {}

    /**
     * Expand a mixed list of USER + DL refs.
     *  • USER refs always contribute to `toEmails` of the returned record
     *    (the bucket they were dropped into is decided by the caller — this
     *    method is invoked once per outgoing bucket).
     *  • DL refs contribute their `toRaw` → toEmails, `ccRaw` → ccEmails,
     *    `bccRaw` → bccEmails. Caller is responsible for merging those
     *    sub-buckets into the matching outgoing bucket(s).
     * Silently skips DLs the caller cannot access (logs a warning).
     */
    public Resolved resolve(List<RecipientRefDto> refs) {
        Set<String> to  = new LinkedHashSet<>();
        Set<String> cc  = new LinkedHashSet<>();
        Set<String> bcc = new LinkedHashSet<>();
        List<String> dlIds  = new ArrayList<>();
        List<String> warns  = new ArrayList<>();
        String uid = currentUser.id();

        for (RecipientRefDto r : refs) {
            if ("DL".equalsIgnoreCase(r.type())) {
                String distributionListId = r.id();
                var dl = dlRepo.findById(distributionListId).orElse(null);
                if (dl == null || !dl.isActive()) {
                    warns.add("Distribution list " + distributionListId + " is no longer available — skipped.");
                    continue;
                }
                if (!hasAccess(dl, uid)) {
                    warns.add("You no longer have access to DL '" + dl.getPrefix() + dl.getName() + "' — skipped.");
                    continue;
                }
                var dlTo  = DistributionListService.parseMembers(dl.getToRaw());
                var dlCc  = DistributionListService.parseMembers(dl.getCcRaw());
                var dlBcc = DistributionListService.parseMembers(dl.getBccRaw());
                if (dlTo.isEmpty() && dlCc.isEmpty() && dlBcc.isEmpty()) {
                    warns.add("DL '" + dl.getPrefix() + dl.getName() + "' is empty.");
                    continue;
                }
                to.addAll(dlTo);
                cc.addAll(dlCc);
                bcc.addAll(dlBcc);
                dlIds.add(distributionListId);
            } else {
                if (StringUtils.hasText(r.email())) to.add(r.email().toLowerCase().trim());
            }
        }
        return new Resolved(new ArrayList<>(to), new ArrayList<>(cc), new ArrayList<>(bcc), dlIds, warns);
    }

    /** v2 predicate — PUBLIC, owner, or one of the DL's managers. */
    private boolean hasAccess(DistributionListEntity dl, String uid) {
        return dl.getVisibility() == Visibility.PUBLIC
            || dl.getOwnerId().equals(uid)
            || dl.getManagers().stream().anyMatch(s -> uid.equals(s.getUserId()));
    }
}
```

> **Caller contract (see §7):** the send service invokes `resolve()` **once per outgoing bucket** (To, CC, BCC). For each call it merges the returned `toEmails`/`ccEmails`/`bccEmails` into the matching outgoing bucket — i.e. a DL placed in the outgoing **CC** field still contributes its own `toRaw` to CC, its `ccRaw` to CC, and its `bccRaw` to BCC of the final email (same fan-out behaviour as the frontend drawer). Implementations that want strict 1:1 mapping (DL-To → outgoing To only) can ignore `ccEmails`/`bccEmails` from the resolver result.

---

## 7. Send-Flow Integration

The `/api/templates/{id}/send` payload now accepts **mixed** recipients:

```jsonc
{
  "subjectContent": "...",
  "bodyContent":    "...",
  "to":  [ { "type": "USER", "email": "john@x.com" },
           { "type": "DL",   "id":    "dl-1717999999999-a8b3c2" } ],
  "cc":  [ ... ],
  "bcc": [ ... ],
  "subjectData":          { ... },
  "bodyData":             { ... },
  "globalApiIntegrations": [ ... ]
}
```

Service:

```java
@Transactional
public SentMessageDto send(String templateId, SendRequestDto req) {
    // v2: resolver returns a bucket-split record; fan DL sub-buckets out into
    // the matching outgoing bucket (mirrors the FE "DLs" drawer behaviour).
    var to  = resolver.resolve(req.to());
    var cc  = resolver.resolve(req.cc());
    var bcc = resolver.resolve(req.bcc());

    List<String> outTo  = mergeDistinct(to.toEmails());
    List<String> outCc  = mergeDistinct(to.ccEmails(),  cc.toEmails(), cc.ccEmails());
    List<String> outBcc = mergeDistinct(to.bccEmails(), cc.bccEmails(), bcc.toEmails(), bcc.ccEmails(), bcc.bccEmails());

    mailer.send(SendMail.builder()
        .to(outTo).cc(outCc).bcc(outBcc)
        .subject(req.subjectContent())
        .htmlBody(req.bodyContent())
        .build());

    // Persist BOTH the original refs (for resend re-expansion) AND the resolved emails (for audit).
    var sent = SentMessage.builder()
        .templateId(templateId)
        .toRefs(req.to())   .ccRefs(req.cc())   .bccRefs(req.bcc())
        .toEmails(outTo)    .ccEmails(outCc)    .bccEmails(outBcc)
        .expandedDlIds(union(to.expandedDlIds(), cc.expandedDlIds(), bcc.expandedDlIds()))
        .subjectContent(req.subjectContent())
        .renderedSubject(req.subjectContent())
        .bodyContent(req.bodyContent())
        .subjectData(req.subjectData())
        .bodyData(req.bodyData())
        .globalApiIntegrations(req.globalApiIntegrations())   // already cached in existing flow
        .sentAt(LocalDateTime.now())
        .sentBy(currentUser.id())
        .build();

    sentRepo.save(sent);
    return toDto(sent, union(to.warnings(), cc.warnings(), bcc.warnings()));
}
```

`SentMessage` gains three new JSON columns (use `NVARCHAR(MAX)` / `@JdbcTypeCode(SqlTypes.JSON)`):

```sql
ALTER TABLE dbo.sent_message ADD
    to_refs        NVARCHAR(MAX) NULL,
    cc_refs        NVARCHAR(MAX) NULL,
    bcc_refs       NVARCHAR(MAX) NULL,
    expanded_dl_ids NVARCHAR(MAX) NULL;
```

---

## 8. Resend Flow — Keep DL References Live

Goal: when a user clicks **Resend** on a previously-sent message, DL chips reappear with **current membership**, not the stale snapshot.

`resendDataToTemplate` (already wired in `src/lib/templateApi.ts`) gets two new fields from the persisted message:

```java
public ResendDto resend(String sentMessageId) {
    var msg = sentRepo.findById(sentMessageId).orElseThrow();
    return ResendDto.builder()
        // existing: subject/body/contentData/globalApiIntegrations …
        .toRefs(msg.getToRefs())     // mixed USER+DL refs
        .ccRefs(msg.getCcRefs())
        .bccRefs(msg.getBccRefs())
        .build();
}
```

Frontend then:

1. Reads `toRefs` and rebuilds the chip list. For each `DL` ref it calls `GET /api/distribution-lists/{distributionListId}` to **re-fetch live members** (count badge updates).
2. If the GET 404s / 403s, the chip is rendered in a "broken DL" state and excluded from `Send`.
3. On the next `Send` the resolver re-expands — picking up any new/removed members since the original send.

---

## 9. Validation Rules

| Rule | Where | Behavior |
|------|-------|----------|
| DL name alphanumeric only (letters + numbers, no spaces/special chars) | `@Pattern` on DTO + service pre-check | 400 BAD_REQUEST |
| DL name unique per owner | DB `uq_dl_owner_name` + service pre-check | 409 Conflict, friendly message |
| At least one valid email across `toRaw` / `ccRaw` / `bccRaw` combined | `applyUpsert` service guard | 400 BAD_REQUEST |
| Email format (per token in to/cc/bcc blobs) | `parseMembers()` regex filter — invalid tokens silently dropped | Soft (drop) |
| v2: `visibility ∈ {PRIVATE, PUBLIC}` only (SHARED removed) | DB CHECK + enum | 400 |
| v2: Edit / Delete requires owner OR listed manager | `requireManage` service guard | 403 FORBIDDEN |
| Reserved prefixes (`SYS-`, `ADMIN-`) | Service guard | 400 |
| DL > 500 members | Soft warning returned in response | UI shows confirm dialog before send |
| Cross-DL duplicate emails on send | `RecipientResolverService` LinkedHashSet | Silent dedupe; warning in response |
| Soft-deleted DL referenced in resend | `RecipientResolverService` | Warning + skipped (not failure) |

---

## 10. Unit Tests (JUnit 5 + Mockito + `@DataJpaTest`)

```java
@DataJpaTest
class DistributionListRepositoryTest {

    @Autowired DistributionListRepository repo;

    @Test void findVisibleTo_returnsOwnAndShared() { /* … */ }
    @Test void searchVisibleTo_matchesPrefixedName() {
        var dl = saveDl("TeamAlpha", "DSPCH-", "owner-1", Visibility.PRIVATE,
                        List.of("a@x.com","b@x.com"));
        var hits = repo.searchVisibleTo("owner-1", "%dspch-team%", 10);
        assertThat(hits).extracting(DistributionListEntity::getDistributionListId).contains(dl.getDistributionListId());
    }
    @Test void searchVisibleTo_matchesMemberEmail() { /* … */ }
    @Test void searchVisibleTo_excludesOthersPrivate() { /* … */ }
}

@ExtendWith(MockitoExtension.class)
class DistributionListServiceTest {
    @Mock DistributionListRepository repo;
    @Mock CurrentUserProvider currentUser;
    @InjectMocks DistributionListService svc;

    @Test void create_setsOwner_andDefaultPrefix() { /* … */ }
    @Test void update_otherOwner_throwsForbidden()  { /* … */ }
    @Test void delete_softDeletesOnly()             { /* … */ }
    @Test void parseMembers_acceptsMixedSeparators()  { /* ", ; : space \n" */ }
    @Test void upsert_rejectsBlankMembersRaw()        { /* 400 */ }
}

@ExtendWith(MockitoExtension.class)
class RecipientResolverServiceTest {
    @Mock DistributionListRepository dlRepo;
    @Mock CurrentUserProvider currentUser;
    @InjectMocks RecipientResolverService svc;

    @Test void resolve_splitsDlBucketsAndDedupesUser() {
        // v2: DL contributes to/cc/bcc separately; USER ref lands in toEmails.
        var dl = dlWith(/* toRaw */ "a@x.com,b@x.com", /* ccRaw */ "c@x.com", /* bccRaw */ "");
        when(dlRepo.findById(dl.getDistributionListId())).thenReturn(Optional.of(dl));
        when(currentUser.id()).thenReturn("owner-1");

        var out = svc.resolve(List.of(
            new RecipientRefDto("USER", null, "a@x.com"),
            new RecipientRefDto("DL",   dl.getDistributionListId(), null)));

        assertThat(out.toEmails()).containsExactly("a@x.com","b@x.com");   // user merged + DL toRaw, dedup
        assertThat(out.ccEmails()).containsExactly("c@x.com");
        assertThat(out.bccEmails()).isEmpty();
        assertThat(out.expandedDlIds()).containsExactly(dl.getDistributionListId());
    }

    @Test void resolve_inactiveDl_skipsWithWarning()    { /* … */ }
    @Test void resolve_forbiddenDl_skipsWithWarning()   { /* … */ }
    @Test void resolve_emptyDl_emitsWarning()           { /* … */ }
}

@WebMvcTest(RecipientSearchController.class)
class RecipientSearchControllerTest {
    @Test void search_returnsDlBeforeUser_whenPrefixMatches() { /* … */ }
    @Test void search_returnsEmpty_whenQueryBlank()           { /* … */ }
}
```

---

## 11. Security Checklist

- Every endpoint resolves the **current user from the security context** — never trust an `ownerId` from the request body.
- `/recipients/search` always filters by visibility. Never return DLs the caller can't read; an attacker could otherwise enumerate org structure.
- `RecipientResolverService` **re-validates access on every send** — a user could have lost access between picking the DL and pressing Send.
- Audit log: every DL CRUD and every expanded send writes to the existing `audit_event` table with `actor_id`, `dl_id`, `action`.

---

## 12. User Directory Search for Managers Picker

v2: A DL can optionally have **managers** — users (besides the owner)
authorised to edit / delete it. The picker is available on **any** DL
(public or private). It calls a dedicated endpoint that only returns
directory users (never DLs) and is scoped by AD/SSO membership.

### Endpoint
```
GET /api/users/search?q={query}&limit=8
```
The query matches against name, emailid, ELID, LANID, and department. Returns
the **full directory record** — never a stripped/lite shape — because the
frontend persists every returned field on the DL.

### Response
```json
[
  {
    "id":         "u-12",
    "elid":       "E10042",
    "lanid":      "jsmith",
    "name":       "Jane Smith",
    "email":      "jane.smith@company.com",
    "department": "Design"
  }
]
```

> ℹ️ The wire field is `email` for symmetry with AD/SCIM. The backend stores it
> under the column name `emailid` (see `distribution_list_share.emailid`) and
> exposes it as `emailid` in `SharedUserDto` on subsequent reads.

### Service Sketch
```java
@Service
public class UserDirectoryService {

    private final UserRepository userRepo;   // backed by AD / SCIM sync table

    public List<DirectoryUserDto> search(String q, int limit) {
        if (q == null || q.isBlank()) return List.of();
        String like = "%" + q.toLowerCase() + "%";
        return userRepo
            .findTopByNameOrEmailOrElidOrLanidOrDepartment(like, PageRequest.of(0, limit))
            .stream()
            .map(u -> new DirectoryUserDto(
                u.getId(), u.getElid(), u.getLanid(),
                u.getName(), u.getEmail(), u.getDepartment()))
            .toList();
    }
}

public record DirectoryUserDto(
    String id, String elid, String lanid,
    String name, String email, String department
) {}
```

### How `managers` Is Persisted
1. Frontend sends the **full directory snapshot** for each selected user:
   ```jsonc
   "managers": [
     { "id": "u-12", "elid": "E10042", "lanid": "jsmith",
       "name": "Jane Smith", "emailid": "jane.smith@company.com",
       "department": "Design" }
   ]
   ```
2. `DistributionListService.applyUpsert` clears all `distribution_list_share`
   rows for that `dl_id` and re-inserts the new set (collection-sync pattern,
   orphanRemoval handles deletes).
3. Reads return the same `SharedUserDto` rows in `DistributionListDto.managers`
   so the UI can render names/elids/lanids without an extra directory call.
4. Visibility / management checks (`findVisibleTo`, `requireReadAccess`,
   `requireManage`, `RecipientResolverService.hasAccess`) match against
   `distribution_list_share.user_id`.

### Validation Rules (server)
| Rule | Code | Status |
|------|------|--------|
| Managers are optional on any visibility (PUBLIC or PRIVATE) | — | — |
| Each `managers[].id` must exist in the user directory | `UserDirectoryService.assertExists(ids)` | 400 |
| `managers[].emailid` and `name` are required (NVARCHAR NOT NULL) | DB + DTO `@NotBlank` | 400 |
| Owner is implicit — do **not** include `ownerId` in `managers` | filter on save (skipped silently) | — |

### Frontend Files
- `src/pages/SharedUserPicker.tsx` — autocomplete (org users only). Renders LANID badge + ELID/department in subtitle.
- `src/lib/distributionListStorage.ts` — `DirectoryUser` / `SharedUserRef` types, `searchUsers()`, `toSharedRef()`, `fromSharedRef()` (swap with `fetch('/api/users/search?...')` for real backend).
- `src/pages/DistributionLists.tsx` — renders the picker **always** (independent of visibility); converts picker rows to `SharedUserRef[]` on save.

---

## 13. Frontend-Backend Contract Notes

### Prefix Behaviour
The `prefix` field is **server-controlled and readonly** in the UI. It is shown as a non-editable prefix addon before the name input (e.g. `DSPCH-TeamAlpha`). The frontend strips any user-typed prefix automatically. Backend should reject reserved prefixes (`SYS-`, `ADMIN-`) and fall back to `DSPCH-` when null.

### Name Input Sanitisation
The frontend enforces alphanumeric-only in real time (`/[^A-Za-z0-9]/g` stripped on every keystroke). The backend `@Pattern` validation acts as the authoritative guard.

### Recipients Bulk Import — three buckets (no member table)
v2: The dialog renders **three** `<textarea>`s — **To / CC / BCC** — each
bound to its own verbatim string. There is **no separate
`distribution_list_member` table** — the columns
`distribution_list.to_raw / cc_raw / bcc_raw` (NVARCHAR(MAX)) are the sole
source of truth.

1. The user pastes any list of email addresses separated by **any combination of `, ; : space newline`** in any bucket.
2. Frontend sends exactly three fields to the backend: `toRaw`, `ccRaw`, `bccRaw` (verbatim strings). No `members` array.
3. Both sides parse on read with the same logic (`parseMembersRaw()` in TS / `DistributionListService.parseMembers()` in Java): split on `[,;:\s\n]+`, lowercase, trim, drop tokens that fail a basic email regex, dedupe.
4. The chip list under each textarea is a **live preview** of that parse. Removing a chip strips the matching token from the corresponding raw blob.
5. The DTO returned to clients includes derived `toEmails / ccEmails / bccEmails` arrays and a combined `memberCount`, but the database row only stores the three raw blobs.

### Managers Picker (autocomplete, rich snapshot)
The dialog always renders `SharedUserPicker` (independent of visibility). The frontend stores the **full directory record** for each selection (`id`, `elid`, `lanid`, `name`, `emailid`, `department`) — never just the id — and sends that as `managers: SharedUserDto[]` on save. See §12 for the persistence flow.

### Save Button Guard (frontend)
The **Create / Save** button is disabled until:
- `name` is non-empty, alphanumeric, and unique per owner
- The combined `parseMembersRaw(toRaw|ccRaw|bccRaw)` returns ≥1 valid email


This mirrors the server-side validation rules in §9.

---

## 14. Frontend Code — Real Backend API Calls

This section ports the demo `localStorage` implementation in
`src/lib/distributionListStorage.ts` to **real `fetch` calls** against the
Spring Boot endpoints defined above. Drop these files in as-is once the
backend is deployed; the page components (`DistributionLists.tsx`,
`RunTemplates.tsx`, `SharedUserPicker.tsx`) consume the same exported
function names, so no UI changes are required.

### 14.1 `src/lib/apiClient.ts` — thin fetch wrapper

```ts
/**
 * Shared fetch wrapper for all backend calls.
 * - Prefixes `VITE_API_BASE_URL` (e.g. `https://api.company.com`).
 * - Sends cookies for session auth (`credentials: 'include'`).
 * - Throws an `ApiError` with the server's `{ status, error, message }`
 *   shape produced by `GlobalExceptionHandler` (§4a).
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  payload?: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    const msg =
      (body as { message?: string } | undefined)?.message ??
      `${res.status} ${res.statusText}`;
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}
```

Add to `.env`:

```
VITE_API_BASE_URL=https://api.company.com
```

### 14.2 `src/lib/distributionListStorage.ts` — backend-wired version

Drop-in replacement for the demo file. Public function names
(`listDistributionLists`, `getDistributionList`, `createDistributionList`,
`updateDistributionList`, `deleteDistributionList`, `searchUsers`,
`searchRecipients`, `resolveRecipients`, `parseMembersRaw`, `toSharedRef`,
`fromSharedRef`, `getUsersByIds`) and their type signatures are unchanged
so the existing pages compile without edits — only `localStorage` reads
are swapped for `apiFetch(...)` calls.

```ts
import { apiFetch } from "./apiClient";

/* ---------- Types (mirror backend DTOs) ---------- */

export type DLVisibility = "PRIVATE" | "PUBLIC";   // v2: SHARED removed
export type DLType = "CUSTOM";                     // v2

export interface DLMember {
  email: string;
  displayName?: string;
}

/** Mirrors backend `SharedUserDto` (v2). */
export interface SharedUserRef {
  distributionListShareId?: string; // surrogate PK, server-assigned
  userId: string;
  elid?: string;
  lanid?: string;
  name: string;
  emailid: string;
  // v2: `department` removed — not stored on the share row.
}

/** Mirrors backend `DistributionListDto` (v2). */
export interface DistributionList {
  distributionListId: string;
  prefix: string;
  name: string;
  displayName: string;
  description?: string;
  visibility: DLVisibility;
  type: DLType;
  ownerId: string;
  ownerLanid?: string;
  /** Verbatim blobs — single source of truth. */
  toRaw: string;
  ccRaw: string;
  bccRaw: string;
  /** Derived on read. */
  toMembers: DLMember[];
  ccMembers: DLMember[];
  bccMembers: DLMember[];
  /** Users authorised to edit / delete this DL. */
  managers: SharedUserRef[];
  createdAt: string;        // ISO LocalDateTime
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

export interface DirectoryUser {
  id: string;
  elid?: string;
  lanid?: string;
  name: string;
  email: string;
  department?: string;
}

export interface DLUpsertInput {
  name: string;
  prefix?: string;
  description?: string;
  visibility: DLVisibility;
  toRaw: string;
  ccRaw?: string;
  bccRaw?: string;
  managers?: SharedUserRef[];
}

/* ---------- Shared parser (also used for live chip preview) ---------- */

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

/** Backend returns `toEmails / ccEmails / bccEmails`; hydrate to `{ email }[]` per bucket. */
interface RawDLDto extends Omit<DistributionList, "toMembers" | "ccMembers" | "bccMembers"> {
  toEmails?: string[];
  ccEmails?: string[];
  bccEmails?: string[];
}
function hydrate(dto: RawDLDto): DistributionList {
  const toMembers  = dto.toEmails?.map((email) => ({ email }))  ?? parseMembersRaw(dto.toRaw);
  const ccMembers  = dto.ccEmails?.map((email) => ({ email }))  ?? parseMembersRaw(dto.ccRaw);
  const bccMembers = dto.bccEmails?.map((email) => ({ email })) ?? parseMembersRaw(dto.bccRaw);
  return { ...dto, toMembers, ccMembers, bccMembers };
}

/* ---------- CRUD — REST calls ---------- */

/** GET /api/distribution-lists  (visible to current user) */
export async function listDistributionLists(): Promise<DistributionList[]> {
  const rows = await apiFetch<RawDLDto[]>("/api/distribution-lists");
  return rows.map(hydrate);
}

/** GET /api/distribution-lists/{id} */
export async function getDistributionList(
  id: string,
): Promise<DistributionList | null> {
  try {
    const dto = await apiFetch<RawDLDto>(`/api/distribution-lists/${id}`);
    return hydrate(dto);
  } catch (e) {
    if (e instanceof Error && "status" in e && (e as { status: number }).status === 404) {
      return null;
    }
    throw e;
  }
}

/** POST /api/distribution-lists  body: DistributionListUpsertRequest */
export async function createDistributionList(
  input: DLUpsertInput,
): Promise<DistributionList> {
  const dto = await apiFetch<RawDLDto>("/api/distribution-lists", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return hydrate(dto);
}

/** PUT /api/distribution-lists/{id} */
export async function updateDistributionList(
  id: string,
  input: DLUpsertInput,
): Promise<DistributionList> {
  const dto = await apiFetch<RawDLDto>(`/api/distribution-lists/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return hydrate(dto);
}

/** DELETE /api/distribution-lists/{id} */
export async function deleteDistributionList(id: string): Promise<void> {
  await apiFetch<void>(`/api/distribution-lists/${id}`, { method: "DELETE" });
}

/* ---------- Shared-user picker helpers ---------- */

export function toSharedRef(u: DirectoryUser): SharedUserRef {
  return {
    userId: u.id,
    elid: u.elid,
    lanid: u.lanid,
    name: u.name,
    emailid: u.email,
    // department intentionally NOT copied — not part of the share snapshot in v2.
  };
}

export function fromSharedRef(s: SharedUserRef): DirectoryUser {
  return {
    id: s.userId,
    elid: s.elid,
    lanid: s.lanid,
    name: s.name,
    email: s.emailid,
    // department resolved lazily from the directory if needed.
  };
}

/** GET /api/users/search?q=...&limit=... */
export async function searchUsers(
  query: string,
  limit = 8,
): Promise<DirectoryUser[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({ q, limit: String(limit) });
  return apiFetch<DirectoryUser[]>(`/api/users/search?${params}`);
}

/** GET /api/users?ids=u-1,u-2  (for edit-mode rehydration) */
export async function getUsersByIds(ids: string[]): Promise<DirectoryUser[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams({ ids: ids.join(",") });
  return apiFetch<DirectoryUser[]>(`/api/users?${params}`);
}

/* ---------- Unified recipient search ---------- */

/** GET /api/recipients/search?q=...&limit=... */
export async function searchRecipients(
  query: string,
  limit = 10,
): Promise<RecipientSuggestion[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({ q, limit: String(limit) });
  return apiFetch<RecipientSuggestion[]>(`/api/recipients/search?${params}`);
}

/* ---------- Recipient resolution (send-time DL expansion) ---------- */

export interface RecipientRef {
  type: "USER" | "DL";
  id?: string;
  email?: string;
}

export interface ResolvedRecipients {
  /** v2: split per bucket — see §6 caller contract. */
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  expandedDlIds: string[];
  warnings: string[];
}

/**
 * POST /api/recipients/resolve  body: RecipientRef[]
 * Server-side mirror of `RecipientResolverService` (§6). v2 returns the
 * bucket-split shape so callers can fan DL sub-buckets out into the matching
 * outgoing To / CC / BCC field on the send payload.
 */
export async function resolveRecipients(
  refs: RecipientRef[],
): Promise<ResolvedRecipients> {
  return apiFetch<ResolvedRecipients>("/api/recipients/resolve", {
    method: "POST",
    body: JSON.stringify(refs),
  });
}
```

### 14.3 Page-level adjustments

`resolveRecipients` is now **async** AND returns split buckets. Callers in
`RunTemplates.tsx` (and anywhere else expanding DLs at send-time) must
`await` it and merge the sub-buckets:

```ts
// v2
const r = await resolveRecipients(refs);
const outTo  = r.toEmails;
const outCc  = dedupe([...r.ccEmails]);
const outBcc = dedupe([...r.bccEmails]);
```

All other call sites in `DistributionLists.tsx` and `SharedUserPicker.tsx`
already `await` the storage functions, so no further changes are needed.

### 14.4 Endpoint ↔ Frontend Function Map

| Frontend function                              | HTTP                                           | Backend handler (§)                       |
| ---------------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| `listDistributionLists()`                      | `GET /api/distribution-lists`                  | `DistributionListController.list` (§4)    |
| `getDistributionList(id)`                      | `GET /api/distribution-lists/{id}`             | `DistributionListController.get` (§4)     |
| `createDistributionList(input)`                | `POST /api/distribution-lists`                 | `DistributionListController.create` (§4)  |
| `updateDistributionList(id, input)`            | `PUT /api/distribution-lists/{id}`             | `DistributionListController.update` (§4)  |
| `deleteDistributionList(id)`                   | `DELETE /api/distribution-lists/{id}`          | `DistributionListController.delete` (§4)  |
| `addDelegatesToDL(id, users)`                  | `POST /api/distribution-lists/{id}/delegates`  | `DistributionListController.addDelegates` (§4, §17) |
| `removeDelegateFromDL(id, userId)`             | `DELETE /api/distribution-lists/{id}/delegates/{userId}` | `DistributionListController.removeDelegate` (§4, §17) |
| `searchUsers(q, limit)`                        | `GET /api/users/search?q&limit`                | `RecipientSearchController` (§12)         |
| `getUsersByIds(ids)`                           | `GET /api/users?ids`                           | `RecipientSearchController` (§12)         |
| `searchRecipients(q, limit)`                   | `GET /api/recipients/search?q&limit`           | `RecipientSearchController` (§5)          |
| `resolveRecipients(refs)`                      | `POST /api/recipients/resolve`                 | `RecipientResolverService` (§6)           |

### 14.5 Error Handling Convention

The backend's `GlobalExceptionHandler` (§4a) returns:

```json
{ "status": 404, "error": "NOT_FOUND", "message": "...", "path": "...", "timestamp": "..." }
```

`apiFetch` parses that body and throws `ApiError(status, message, payload)`.
Dialogs surface `err.message` via `toast.error(...)`; the Save button
guards listed in §13 still run client-side first so most validation errors
never reach the network.

---

## 15. Filtering & Pagination

The DL listing page (`/distribution-lists`) supports a visibility filter
and dynamic pagination so the table scales beyond the default 10 cards.

### 15.1 Query Contract

`GET /api/distribution-lists`

| Param | Type | Default | Allowed values | Notes |
|-------|------|---------|----------------|-------|
| `page`       | int    | `1`     | `>= 1`                          | 1-based page index |
| `pageSize`   | int    | `10`    | `5, 10, 25, 50, 100`            | Validate server-side; clamp to `<= 100` |
| `visibility` | string | `ALL`   | `ALL` \| `PUBLIC` \| `PRIVATE`  | v2: `SHARED` removed. Filter applied **on top of** the §0 visibility predicate |
| `search`     | string | `""`    | free-text                       | Matched against `displayName`, `name`, and `to_raw / cc_raw / bcc_raw` (LIKE `%q%`) |

Response shape (matches the frontend `PagedResult<T>` type):

```json
{
  "items": [ { /* DistributionListDto */ } ],
  "total": 137,
  "page": 1,
  "pageSize": 10,
  "totalPages": 14
}
```

> The `ALL` filter still excludes DLs the user cannot see — visibility
> rules from the introductory section are always enforced first.

### 15.2 Repository

```java
// DistributionListRepository.java
@Query("""
   SELECT dl FROM DistributionListEntity dl
   WHERE dl.isActive = true
     AND ( dl.ownerId = :uid
           OR dl.visibility = 'PUBLIC'
           OR EXISTS (SELECT 1 FROM DistributionListShareEntity s
                      WHERE s.distributionListId = dl.distributionListId
                        AND s.userId = :uid) )
     AND ( :visibility = 'ALL' OR dl.visibility = :visibility )
     AND ( :search = ''
           OR LOWER(dl.name)    LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(dl.toRaw)   LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(dl.ccRaw)   LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(dl.bccRaw)  LIKE LOWER(CONCAT('%', :search, '%')) )
""")
""")
Page<DistributionListEntity> findVisibleToFiltered(
    @Param("uid")        String uid,
    @Param("visibility") String visibility,
    @Param("search")     String search,
    Pageable pageable);
```

### 15.3 Service

```java
public PagedResult<DistributionListDto> list(int page, int pageSize,
                                             String visibility, String search) {
    int safeSize = Math.min(Math.max(pageSize, 1), 100);
    int safePage = Math.max(page, 1);
    String v = (visibility == null || visibility.isBlank()) ? "ALL" : visibility.toUpperCase();
    String s = (search == null) ? "" : search.trim();

    Page<DistributionListEntity> p = repo.findVisibleToFiltered(
        currentUser.id(), v, s,
        PageRequest.of(safePage - 1, safeSize, Sort.by(Sort.Direction.DESC, "updatedAt")));

    return new PagedResult<>(
        p.getContent().stream().map(mapper::toDto).toList(),
        p.getTotalElements(),
        safePage,
        safeSize,
        p.getTotalPages());
}
```

### 15.4 Controller

```java
@GetMapping("/api/distribution-lists")
public PagedResult<DistributionListDto> list(
        @RequestParam(defaultValue = "1")    int page,
        @RequestParam(defaultValue = "10")   int pageSize,
        @RequestParam(defaultValue = "ALL")  String visibility,
        @RequestParam(defaultValue = "")     String search) {
    return service.list(page, pageSize, visibility, search);
}
```

### 15.5 DTO

```java
public record PagedResult<T>(
    List<T> items,
    long total,
    int page,
    int pageSize,
    int totalPages
) {}
```

### 15.6 Frontend Wiring

- `src/lib/distributionListStorage.ts` exposes `listDistributionListsPaged(query)` returning `PagedResult<DistributionList>` — mirrors the backend response 1-for-1.
- `src/pages/DistributionLists.tsx` holds `page`, `pageSize`, and `visibilityFilter` state, defaults to `ALL` / `10` / `1`, resets to page 1 whenever the filter, search, or page size changes, and renders a segmented control plus Previous/Next pager.
- When wired to the real backend, replace the local helper with:

  ```ts
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    visibility,
    search,
  });
  return apiFetch<PagedResult<DistributionList>>(`/api/distribution-lists?${params}`);
  ```

---

## 16. Distribution List Card UX — Details Drawer

To keep the listing page scannable when DLs contain hundreds of recipients,
the DL **card preview no longer renders any member emails**. Each card
shows only:

- Display name (`{prefix}{name}`) and visibility chip (Public / Private)
- Optional description
- Aggregate stats: `<total> members · To <n> / CC <n> / BCC <n>`
- Managers badge (count only)
- Edit / Delete action buttons

### Interaction

Clicking anywhere on the card body (or pressing `Enter` / `Space` while
focused) opens a right-side **Details Drawer** (`Sheet` from
`@/components/ui/sheet`) that renders the full DL detail set:

- Header: name + visibility + `type` + `ownerLanid`
- Description (if any)
- Managers list (name, email — LAN id badge from snapshot; department is fetched live from directory only if shown)
- **To** recipients — full list, scrollable
- **CC** recipients — full list, scrollable
- **BCC** recipients — full list, scrollable

Edit / Delete buttons inside the card call `event.stopPropagation()` so
that activating them does not also open the drawer.

### Backend impact — none

The drawer reads from the same `DistributionListDto` already returned by
`GET /api/distribution-lists/{id}` and `GET /api/distribution-lists`
(paged). No new endpoints, DTO fields, or repository methods are
required — the change is purely a frontend rendering optimisation.

### Frontend files touched

| File | Change |
|---|---|
| `src/pages/DistributionLists.tsx` | Card is now a clickable `role="button"`; removed `<ul>` of member emails; added `Sheet`-based details drawer driven by `detailsDL` state. |
| `src/pages/DistributionLists.module.scss` | Added `.detailsSheet`, `.detailsTitle`, `.detailsBody`, `.detailsSection`, `.detailsList`, `.detailsEmpty`; set `.card { cursor: pointer; }`. |


---

## 17. Delegates UX (v3) — Dedicated Add/Remove Endpoints

### Motivation

In v2 the "managers" picker lived inside the DL create/edit dialog.
Editing recipients required round-tripping the entire `managers` array
on every save, multiplying lock contention on `distribution_list_share`.

v3 splits delegate management into its own UX surface and its own pair
of endpoints. Any existing delegate (or the owner) can grow the
delegate set — this matches how shared mailboxes / shared DLs work in
Outlook, where co-owners can co-administer.

### Permission rule (canonical — updated)

```text
canManageDelegates(dl, uid) :=
       dl.owner_id = uid
    OR EXISTS (SELECT 1 FROM distribution_list_share s
                WHERE s.distribution_list_id = dl.distribution_list_id
                  AND s.user_id = uid)
```

This is the **same** predicate as `canManage` (edit/delete content);
delegates are first-class co-managers.

| Action                                | Owner | Delegate | Public viewer |
|---------------------------------------|:-----:|:--------:|:-------------:|
| View DL (if PUBLIC or owner/delegate) | ✓ | ✓ | ✓ (PUBLIC only) |
| Edit name / recipients / visibility   | ✓ | ✓ | – |
| Delete DL                              | ✓ | ✓ | – |
| **Add / remove delegates**             | ✓ | ✓ | – |

A delegate cannot remove the owner (the owner is never present in the
`distribution_list_share` table — they are implicit). A delegate CAN
remove other delegates, including themselves (self-leave).

### New endpoints

```
POST   /api/distribution-lists/{id}/delegates
Body:  { "users": [ SharedUserDto, ... ] }   // full directory snapshots
200:   DistributionListDto                    // refreshed DL with all managers

DELETE /api/distribution-lists/{id}/delegates/{userId}
200:   DistributionListDto                    // refreshed DL after removal
```

Both endpoints:

- Throw `403 Forbidden` unless the caller is `dl.owner_id` OR already
  present in `distribution_list_share` for this DL.
- Reject any attempt to add/remove `dl.owner_id` itself with `400
  BAD_REQUEST` ("Owner cannot be added or removed as a delegate.").
- The `POST` is **idempotent per (dl_id, user_id)** — duplicates are
  silently skipped (the `uq_dls_dl_user` constraint guards the DB).
- Populate `added_by = authPrincipal.userId` and
  `added_at = SYSUTCDATETIME()` on each new row.
- The legacy `PUT /api/distribution-lists/{id}` **ignores** any
  `managers` field in the payload from v3 onward — to mutate delegates
  callers MUST use the dedicated endpoints. (The form no longer sends
  `managers`; see "Frontend impact" below.)

### Spring controller sketch

```java
@PostMapping("/{id}/delegates")
public DistributionListDto addDelegates(@PathVariable String id,
                                        @RequestBody @Valid AddDelegatesRequest req) {
    var dl = service.loadOrThrow(id);
    // requireDelegateManage() inside the service rejects non-owner /
    // non-delegate callers with 403 — see §4 service block.
    return service.addDelegates(dl, req.users(), service.currentUserId());
}

@DeleteMapping("/{id}/delegates/{userId}")
public DistributionListDto removeDelegate(@PathVariable String id,
                                          @PathVariable String userId) {
    var dl = service.loadOrThrow(id);
    return service.removeDelegate(dl, userId);
}
```

The authorization check (`owner OR delegate`) lives in
`DistributionListService.requireDelegateManage(dl)` — the controller
stays a thin pass-through so the rule is testable in one place.
```

### `DistributionListShareEntity` additions

```java
@Column(name = "added_by", length = 100)
private String addedBy;

@Column(name = "added_at")
private OffsetDateTime addedAt;
```

### DTO additions

```java
public record SharedUserDto(
    String  userId,
    String  elid,
    String  lanid,
    String  name,
    String  emailid,
    String  addedBy,        // v3
    String  addedAt         // v3 — ISO-8601
) {}
```

### Frontend impact

| File | Change |
|---|---|
| `src/lib/distributionListStorage.ts` | Added `addDelegatesToDL(id, users)`, `removeDelegateFromDL(id, userId)`, `canManageDelegates(dl)`. `SharedUserRef` gained `addedBy?` / `addedAt?`. `updateDistributionList` no longer overwrites `managers` when `input.managers` is undefined — preserves existing. |
| `src/pages/DistributionLists.tsx` | Removed the "Managers" `SharedUserPicker` section from the create/edit dialog. Added a **Delegates** action button on each card (visible to the owner **and to any existing delegate**) that opens a dedicated dialog with a `SharedUserPicker` + current-delegates list with × remove. The details drawer also renders the delegates section with inline × remove + "Add" button that reopens the same dialog. |
| `src/pages/DistributionLists.module.scss` | Added `.delegateRow`, `.removeDelegateBtn`, `.inlineAddBtn`. |

### TS contract mirror

```ts
// In src/lib/distributionListStorage.ts
export function canManageDelegates(dl: DistributionList, userId?: string): boolean;
export function addDelegatesToDL(id: string, users: DirectoryUser[]): DistributionList;
export function removeDelegateFromDL(id: string, userId: string): DistributionList;

export interface SharedUserRef {
  distributionListShareId?: string;
  userId: string;
  elid?: string;
  lanid?: string;
  name: string;
  emailid: string;
  addedBy?: string;   // v3
  addedAt?: string;   // v3 ISO timestamp
}
```

### Migration note for existing v2 deployments

```sql
ALTER TABLE dbo.distribution_list_share
    ADD added_by NVARCHAR(100) NULL,
        added_at DATETIME2     NULL CONSTRAINT df_dls_added_at DEFAULT SYSUTCDATETIME();

-- Backfill: assume the DL owner provisioned every existing delegate row
UPDATE s
   SET s.added_by = dl.owner_id,
       s.added_at = dl.created_at
  FROM dbo.distribution_list_share s
  JOIN dbo.distribution_list       dl
    ON dl.distribution_list_id = s.distribution_list_id
 WHERE s.added_by IS NULL;
```
