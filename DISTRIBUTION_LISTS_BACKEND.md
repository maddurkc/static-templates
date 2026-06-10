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

## 1. SQL Migration (MS SQL Server)

`V20260610__create_distribution_lists.sql`

```sql
-- =============================================================
-- Custom Smart Distribution Lists
-- =============================================================

CREATE TABLE dbo.distribution_list (
    distribution_list_id  NVARCHAR(64)     NOT NULL CONSTRAINT pk_dl PRIMARY KEY,
                                                                    -- application-generated string id (e.g. "dl-<ts>-<rand>")
    name                  NVARCHAR(150)    NOT NULL,                -- "TeamAlpha" (no prefix)
    prefix                NVARCHAR(20)     NOT NULL CONSTRAINT df_dl_prefix DEFAULT 'DSPCH-',
    description           NVARCHAR(500)    NULL,
    owner_id              NVARCHAR(100)    NOT NULL,                -- AD/SSO user id of creator
    visibility            NVARCHAR(20)     NOT NULL CONSTRAINT df_dl_vis DEFAULT 'PRIVATE',
                                                                    -- PRIVATE | SHARED | PUBLIC
    -- Verbatim textarea blob the user pasted. SINGLE source of truth for members —
    -- there is intentionally NO separate `distribution_list_member` table. The app
    -- parses this string on read via `parseMembersRaw()` (frontend) / the matching
    -- service helper (backend) using separators: , ; : space newline.
    members_raw           NVARCHAR(MAX)    NULL,
    is_active             BIT              NOT NULL CONSTRAINT df_dl_act DEFAULT 1,
    created_at            DATETIME2        NOT NULL CONSTRAINT df_dl_cat DEFAULT SYSUTCDATETIME(),
    updated_at            DATETIME2        NOT NULL CONSTRAINT df_dl_uat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT uq_dl_owner_name UNIQUE (owner_id, name),
    CONSTRAINT ck_dl_visibility CHECK (visibility IN ('PRIVATE','SHARED','PUBLIC'))
);

CREATE INDEX ix_dl_name      ON dbo.distribution_list(name);
CREATE INDEX ix_dl_active    ON dbo.distribution_list(is_active) INCLUDE (owner_id, visibility);

-- =============================================================
-- SHARED visibility: snapshot the FULL directory record for every
-- shared user (user_id, elid, lanid, name, emailid, department).
-- Snapshot semantics: rows survive even if a user is later removed
-- from AD/SCIM, so audit history stays intact.
-- =============================================================
CREATE TABLE dbo.distribution_list_share (
    distribution_list_id  NVARCHAR(64)     NOT NULL,
    user_id               NVARCHAR(100)    NOT NULL,   -- internal directory id
    elid                  NVARCHAR(50)     NULL,       -- enterprise / employee id
    lanid                 NVARCHAR(50)     NULL,       -- LAN / network id
    name                  NVARCHAR(150)    NOT NULL,
    emailid               NVARCHAR(255)    NOT NULL,
    department            NVARCHAR(150)    NULL,
    CONSTRAINT pk_dls PRIMARY KEY (distribution_list_id, user_id),
    CONSTRAINT fk_dls_dl FOREIGN KEY (distribution_list_id)
        REFERENCES dbo.distribution_list(distribution_list_id) ON DELETE CASCADE
);

CREATE INDEX ix_dls_user  ON dbo.distribution_list_share(user_id);
CREATE INDEX ix_dls_lanid ON dbo.distribution_list_share(lanid);
CREATE INDEX ix_dls_elid  ON dbo.distribution_list_share(elid);
```

---

## 2. JPA Entities

```java
@Entity @Table(name = "distribution_list")
@Getter @Setter @NoArgsConstructor
public class DistributionList {
    /**
     * Application-generated string id (e.g. `"dl-<timestamp>-<rand>"`).
     * Intentionally NOT `@GeneratedValue` — the frontend generates the id
     * on create so optimistic UI / offline flows work without a DB round-trip.
     */
    @Id
    @Column(name = "distribution_list_id", nullable = false, length = 64)
    private String distributionListId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 20)
    private String prefix = "DSPCH-";

    @Column(length = 500)
    private String description;

    @Column(name = "owner_id", nullable = false, length = 100)
    private String ownerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Visibility visibility = Visibility.PRIVATE;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    /**
     * Verbatim textarea content the user pasted. SINGLE source of truth for
     * members — there is intentionally NO normalised `DistributionListMember`
     * entity. Parse this string on read with `DistributionListService.parseMembers`
     * (separators: `, ; : space newline`).
     */
    @Column(name = "members_raw", columnDefinition = "NVARCHAR(MAX)")
    private String membersRaw;

    /**
     * Snapshot of every directory user the owner shared this DL with.
     * Stored as full rows (user_id, elid, lanid, name, emailid, department)
     * so the UI never has to round-trip back to AD for rendering, and so
     * audit history survives if the user is later removed from the directory.
     */
    @OneToMany(mappedBy = "distributionList", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<DistributionListShare> sharedWith = new ArrayList<>();

    @PreUpdate void touch() { this.updatedAt = LocalDateTime.now(); }

    public enum Visibility { PRIVATE, SHARED, PUBLIC }
}

@Entity @Table(name = "distribution_list_share")
@IdClass(DistributionListShare.PK.class)
@Getter @Setter @NoArgsConstructor
public class DistributionListShare {
    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "distribution_list_id", nullable = false)
    private DistributionList distributionList;

    @Id
    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;                  // internal directory id

    @Column(length = 50)                    private String elid;       // enterprise / employee id
    @Column(length = 50)                    private String lanid;      // LAN / network id
    @Column(nullable = false, length = 150) private String name;
    @Column(nullable = false, length = 255) private String emailid;
    @Column(length = 150)                   private String department;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class PK implements Serializable {
        private String distributionList;    // matches DistributionList#distributionListId
        private String userId;
    }
}
```

---

## 3. DTOs

```java
public record DistributionListDto(
    String distributionListId,
    String prefix,
    String name,
    String displayName,                 // prefix + name -> "DSPCH-TeamAlpha"
    String description,
    String visibility,
    String ownerId,
    int memberCount,                    // derived: parseMembers(membersRaw).size()
    List<String> memberEmails,          // derived: parsed, deduped, validated emails
    String membersRaw,                  // SOURCE OF TRUTH — verbatim textarea blob
    List<SharedUserDto> sharedWith,     // FULL directory snapshot
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}

/** Full directory snapshot stored on a SHARED DL. Mirrors `distribution_list_share`. */
public record SharedUserDto(
    String userId,        // internal directory id (== user_id PK column)
    String elid,          // enterprise / employee id  (nullable)
    String lanid,         // LAN / network id          (nullable)
    String name,
    String emailid,
    String department     // nullable
) {}

public record DistributionListUpsertDto(
    @NotBlank @Size(max = 150)
    @Pattern(regexp = "^[A-Za-z0-9]+$", message = "Name can only contain letters and numbers — no spaces or special characters.")
    String name,
    @Size(max = 20)             String prefix,        // typically readonly / server-controlled; null -> default DSPCH-
    @Size(max = 500)            String description,
    @NotNull                    Visibility visibility,
    /**
     * Verbatim textarea blob — the ONLY accepted form of members on upsert.
     * Server parses with `parseMembers()` and rejects when the parsed list is empty.
     */
    @NotBlank                   String membersRaw,
    List<SharedUserDto>         sharedWith            // ignored unless visibility=SHARED; full rows required
) {}

/** Unified result returned by /recipients/search. type=USER | DL. */
public record RecipientSuggestionDto(
    String type,
    String id,              // distributionListId for DL, directory user id for USER
    String email,           // USER only
    String displayName,     // user name OR "DSPCH-TeamAlpha"
    String subtitle,        // user email/department OR "12 members · shared"
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
public interface DistributionListRepository extends JpaRepository<DistributionList, String> {

    @Query("""
        select dl from DistributionList dl
        where dl.active = true
          and (dl.ownerId = :uid
               or dl.visibility = 'PUBLIC'
               or exists (select 1 from DistributionListShare s
                            where s.distributionList = dl and s.userId = :uid))
        order by dl.name
    """)
    List<DistributionList> findVisibleTo(@Param("uid") String userId);

    /**
     * Used by the unified search. LIKE pattern must be pre-wrapped with %...%.
     * Matches name / prefix+name OR a substring of the verbatim members_raw blob
     * (since there is no per-member row to join on).
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
             OR LOWER(dl.members_raw)        LIKE :q )
        ORDER BY dl.name
    """, nativeQuery = true)
    List<DistributionList> searchVisibleTo(@Param("uid") String userId,
                                           @Param("q") String like,
                                           @Param("lim") int limit);
}
```

```java
@Service
@RequiredArgsConstructor
public class DistributionListService {

    private final DistributionListRepository repo;
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
        var dl = new DistributionList();
        // Application-generated id (matches frontend `dl-<ts>-<rand>` pattern).
        dl.setDistributionListId("dl-" + System.currentTimeMillis() + "-"
            + Long.toString((long)(Math.random() * 0xffffff), 36));
        dl.setOwnerId(currentUser.id());
        applyUpsert(dl, in);
        return toDto(repo.save(dl));
    }

    @Transactional
    public DistributionListDto update(String distributionListId, DistributionListUpsertDto in) {
        var dl = repo.findById(distributionListId).orElseThrow(() -> new NotFoundException("DL not found"));
        requireOwner(dl);
        applyUpsert(dl, in);
        return toDto(repo.save(dl));
    }

    @Transactional
    public void delete(String distributionListId) {
        var dl = repo.findById(distributionListId).orElseThrow(() -> new NotFoundException("DL not found"));
        requireOwner(dl);
        dl.setActive(false);                 // soft delete preserves audit trail of past sends
        repo.save(dl);
    }

    /* ------------- helpers ------------- */

    private void applyUpsert(DistributionList dl, DistributionListUpsertDto in) {
        // Parse + validate members BEFORE persisting so we never store junk.
        List<String> parsed = parseMembers(in.membersRaw());
        if (parsed.isEmpty()) {
            throw new BadRequestException("At least one valid member email is required.");
        }

        dl.setName(in.name().trim());
        dl.setPrefix(StringUtils.hasText(in.prefix()) ? in.prefix() : "DSPCH-");
        dl.setDescription(in.description());
        dl.setVisibility(in.visibility());
        dl.setMembersRaw(in.membersRaw());      // stored VERBATIM — no normalisation

        // ---- sharedWith: clear/addAll sync; orphanRemoval drops detached rows ----
        dl.getSharedWith().clear();
        if (in.visibility() == Visibility.SHARED && in.sharedWith() != null) {
            String ownerId = dl.getOwnerId();
            for (SharedUserDto s : in.sharedWith()) {
                if (s.userId() == null || s.userId().equals(ownerId)) continue;  // owner is implicit
                var row = new DistributionListShare();
                row.setDistributionList(dl);
                row.setUserId(s.userId());
                row.setElid(s.elid());
                row.setLanid(s.lanid());
                row.setName(s.name());
                row.setEmailid(s.emailid().toLowerCase().trim());
                row.setDepartment(s.department());
                dl.getSharedWith().add(row);
            }
        }
    }

    /**
     * Single authoritative parser for the verbatim members_raw blob.
     * Splits on `, ; : whitespace newline`, lowercases, dedupes, validates.
     * Used by both `applyUpsert` (validation) and `toDto` (read projection).
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

    private DistributionListDto toDto(DistributionList dl) {
        List<String> emails = parseMembers(dl.getMembersRaw());
        return new DistributionListDto(
            dl.getDistributionListId(), dl.getPrefix(), dl.getName(),
            dl.getPrefix() + dl.getName(),
            dl.getDescription(), dl.getVisibility().name(), dl.getOwnerId(),
            emails.size(),
            emails,
            dl.getMembersRaw(),
            dl.getSharedWith().stream()
                .map(s -> new SharedUserDto(
                    s.getUserId(), s.getElid(), s.getLanid(),
                    s.getName(), s.getEmailid(), s.getDepartment()))
                .toList(),
            dl.getCreatedAt(),
            dl.getUpdatedAt()
        );
    }

    private void requireOwner(DistributionList dl) {
        if (!dl.getOwnerId().equals(currentUser.id())) throw new ForbiddenException();
    }
    private void requireReadAccess(DistributionList dl) {
        var uid = currentUser.id();
        if (!dl.getOwnerId().equals(uid)
            && dl.getVisibility() != Visibility.PUBLIC
            && dl.getSharedWith().stream().noneMatch(s -> uid.equals(s.getUserId())))
            throw new ForbiddenException();
    }
}
```

```java
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
}
```

---

## 5. Unified Recipient Search Endpoint

`GET /api/recipients/search?q=dsp&limit=10` — used by `UserAutocomplete` in To/CC/BCC.

```java
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
            int count = DistributionListService.parseMembers(dl.getMembersRaw()).size();
            String visBadge = dl.getVisibility() == Visibility.SHARED ? " · shared"
                            : dl.getVisibility() == Visibility.PUBLIC ? " · public" : "";
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

## 6. RecipientResolverService — DL Expansion at Send Time

```java
@Service
@RequiredArgsConstructor
public class RecipientResolverService {

    private final DistributionListRepository dlRepo;
    private final CurrentUserProvider currentUser;

    public record Resolved(List<String> emails, List<String> expandedDlIds, List<String> warnings) {}

    /**
     * Expand a mixed list of USER + DL refs into a deduplicated, validated email list.
     * Silently skips DLs the caller cannot access (logs a warning).
     */
    public Resolved resolve(List<RecipientRefDto> refs) {
        Set<String> emails  = new LinkedHashSet<>();
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
                List<String> memberEmails = DistributionListService.parseMembers(dl.getMembersRaw());
                if (memberEmails.isEmpty()) {
                    warns.add("DL '" + dl.getPrefix() + dl.getName() + "' is empty.");
                    continue;
                }
                emails.addAll(memberEmails);
                dlIds.add(distributionListId);
            } else {
                if (StringUtils.hasText(r.email())) emails.add(r.email().toLowerCase().trim());
            }
        }
        return new Resolved(new ArrayList<>(emails), dlIds, warns);
    }

    private boolean hasAccess(DistributionList dl, String uid) {
        return dl.getOwnerId().equals(uid)
            || dl.getVisibility() == Visibility.PUBLIC
            || dl.getSharedWith().stream().anyMatch(s -> uid.equals(s.getUserId()));
    }
}
```

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
    var to  = resolver.resolve(req.to());
    var cc  = resolver.resolve(req.cc());
    var bcc = resolver.resolve(req.bcc());

    mailer.send(SendMail.builder()
        .to(to.emails()).cc(cc.emails()).bcc(bcc.emails())
        .subject(req.subjectContent())
        .htmlBody(req.bodyContent())
        .build());

    // Persist BOTH the original refs (for resend re-expansion) AND the resolved emails (for audit).
    var sent = SentMessage.builder()
        .templateId(templateId)
        .toRefs(req.to())      .ccRefs(req.cc())   .bccRefs(req.bcc())
        .toEmails(to.emails()) .ccEmails(cc.emails()).bccEmails(bcc.emails())
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
| `membersRaw` non-blank AND `parseMembers(raw)` returns ≥1 valid email | `@NotBlank` on DTO + `applyUpsert` guard | 400 BAD_REQUEST |
| Email format (per token in `members_raw`) | `parseMembers()` regex filter — invalid tokens silently dropped | Soft (drop) |
| `visibility=SHARED` ⇒ `sharedWith` non-empty | Service guard | 400 |
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
        assertThat(hits).extracting(DistributionList::getId).contains(dl.getId());
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

    @Test void resolve_dedupesAcrossDlAndUser() {
        var dl = dlWith("a@x.com","b@x.com");
        when(dlRepo.findById(dl.getId())).thenReturn(Optional.of(dl));
        when(currentUser.id()).thenReturn("owner-1");

        var out = svc.resolve(List.of(
            new RecipientRefDto("USER", null, "a@x.com"),
            new RecipientRefDto("DL",   dl.getId().toString(), null)));

        assertThat(out.emails()).containsExactly("a@x.com","b@x.com");  // dedup
        assertThat(out.expandedDlIds()).containsExactly(dl.getId());
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

## 12. User Directory Search for SHARED Picker

When a user creates/edits a DL with `visibility = SHARED`, the UI shows a
second autocomplete to select **which org users** can see and use this DL.
The picker calls a dedicated endpoint that only returns directory users
(never DLs) and is scoped by AD/SSO membership.

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

### How `sharedWith` Is Persisted
1. Frontend sends the **full directory snapshot** for each selected user:
   ```jsonc
   "sharedWith": [
     { "id": "u-12", "elid": "E10042", "lanid": "jsmith",
       "name": "Jane Smith", "emailid": "jane.smith@company.com",
       "department": "Design" }
   ]
   ```
2. `DistributionListService.applyUpsert` clears all `distribution_list_share`
   rows for that `dl_id` and re-inserts the new set (collection-sync pattern,
   orphanRemoval handles deletes).
3. Reads return the same `SharedUserDto` rows in `DistributionListDto.sharedWith`
   so the UI can render names/elids/lanids without an extra directory call.
4. Visibility checks (`findVisibleTo`, `requireReadAccess`, `RecipientResolverService.hasAccess`)
   match against `distribution_list_share.user_id`.

### Validation Rules (server)
| Rule | Code | Status |
|------|------|--------|
| `visibility = SHARED` requires non-empty `sharedWith` | `DistributionListService.validate` | 400 |
| Each `sharedWith[].id` must exist in the user directory | `UserDirectoryService.assertExists(ids)` | 400 |
| `sharedWith[].emailid` and `name` are required (NVARCHAR NOT NULL) | DB + DTO `@NotBlank` | 400 |
| Owner is implicit — do **not** include `ownerId` in `sharedWith` | filter on save (skipped silently) | — |

### Frontend Files
- `src/pages/SharedUserPicker.tsx` — autocomplete (org users only). Renders LANID badge + ELID/department in subtitle.
- `src/lib/distributionListStorage.ts` — `DirectoryUser` / `SharedUserRef` types, `searchUsers()`, `toSharedRef()`, `fromSharedRef()` (swap with `fetch('/api/users/search?...')` for real backend).
- `src/pages/DistributionLists.tsx` — renders the picker only when `visibility === 'SHARED'`, converts picker rows to `SharedUserRef[]` on save, and disables Save until at least one user is selected.

---

## 13. Frontend-Backend Contract Notes

### Prefix Behaviour
The `prefix` field is **server-controlled and readonly** in the UI. It is shown as a non-editable prefix addon before the name input (e.g. `DSPCH-TeamAlpha`). The frontend strips any user-typed prefix automatically. Backend should reject reserved prefixes (`SYS-`, `ADMIN-`) and fall back to `DSPCH-` when null.

### Name Input Sanitisation
The frontend enforces alphanumeric-only in real time (`/[^A-Za-z0-9]/g` stripped on every keystroke). The backend `@Pattern` validation acts as the authoritative guard.

### Members Bulk Import (textarea, free-form, no member table)
The Members field is a **`<textarea>`** bound directly to a single string. There
is **no separate `distribution_list_member` table** — `distribution_list.members_raw`
(NVARCHAR(MAX)) is the sole source of truth.

1. The user pastes any list of email addresses separated by **any combination of `, ; : space newline`**.
2. Frontend sends exactly **one field** to the backend: `membersRaw` (the verbatim string). No `members` array, no `MemberDto` list.
3. Both sides parse on read with the same logic (`parseMembersRaw()` in TS / `DistributionListService.parseMembers()` in Java): split on `[,;:\s\n]+`, lowercase, trim, drop tokens that fail a basic email regex, dedupe.
4. The chip list under the textarea is a **live preview** of that parse — useful for spotting typos. Removing a chip strips the matching token (and its trailing separator) from `membersRaw`.
5. The DTO returned to clients includes a derived `memberEmails: string[]` and `memberCount: int` for convenience, but the database row only stores `members_raw`.

### Shared Users Picker (autocomplete, rich snapshot)
When `visibility === 'SHARED'`, the dialog renders `SharedUserPicker`, an autocomplete that queries `GET /api/users/search?q=...`. The frontend stores the **full directory record** for each selection (`id`, `elid`, `lanid`, `name`, `emailid`, `department`) — never just the id — and sends that as `sharedWith: SharedUserDto[]` on save. See §12 for the persistence flow.

### Save Button Guard (frontend)
The **Create / Save** button is disabled until:
- `name` is non-empty, alphanumeric, and unique per owner
- `parseMembersRaw(membersRaw)` returns ≥1 valid email
- `visibility === 'SHARED'` ⇒ `sharedWith` has ≥1 selected user

This mirrors the server-side validation rules in §9.
