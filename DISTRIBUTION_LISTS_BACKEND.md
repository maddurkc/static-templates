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
    id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_dl PRIMARY KEY DEFAULT NEWID(),
    name          NVARCHAR(150)    NOT NULL,                       -- "TeamAlpha" (no prefix)
    prefix        NVARCHAR(20)     NOT NULL CONSTRAINT df_dl_prefix DEFAULT 'DSPCH-',
    description   NVARCHAR(500)    NULL,
    owner_id      NVARCHAR(100)    NOT NULL,                       -- AD/SSO user id of creator
    visibility    NVARCHAR(20)     NOT NULL CONSTRAINT df_dl_vis DEFAULT 'PRIVATE',
                                                                    -- PRIVATE | SHARED | PUBLIC
    is_active     BIT              NOT NULL CONSTRAINT df_dl_act DEFAULT 1,
    created_at    DATETIME2        NOT NULL CONSTRAINT df_dl_cat DEFAULT SYSUTCDATETIME(),
    updated_at    DATETIME2        NOT NULL CONSTRAINT df_dl_uat DEFAULT SYSUTCDATETIME(),
    CONSTRAINT uq_dl_owner_name UNIQUE (owner_id, name),
    CONSTRAINT ck_dl_visibility CHECK (visibility IN ('PRIVATE','SHARED','PUBLIC'))
);

CREATE INDEX ix_dl_name      ON dbo.distribution_list(name);
CREATE INDEX ix_dl_active    ON dbo.distribution_list(is_active) INCLUDE (owner_id, visibility);

CREATE TABLE dbo.distribution_list_member (
    id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_dlm PRIMARY KEY DEFAULT NEWID(),
    dl_id         UNIQUEIDENTIFIER NOT NULL,
    email         NVARCHAR(255)    NOT NULL,
    display_name  NVARCHAR(150)    NULL,
    CONSTRAINT fk_dlm_dl FOREIGN KEY (dl_id) REFERENCES dbo.distribution_list(id) ON DELETE CASCADE,
    CONSTRAINT uq_dlm_email UNIQUE (dl_id, email)
);

CREATE INDEX ix_dlm_email ON dbo.distribution_list_member(email);
CREATE INDEX ix_dlm_dl    ON dbo.distribution_list_member(dl_id);

CREATE TABLE dbo.distribution_list_share (
    dl_id   UNIQUEIDENTIFIER NOT NULL,
    user_id NVARCHAR(100)    NOT NULL,
    CONSTRAINT pk_dls PRIMARY KEY (dl_id, user_id),
    CONSTRAINT fk_dls_dl FOREIGN KEY (dl_id) REFERENCES dbo.distribution_list(id) ON DELETE CASCADE
);
```

---

## 2. JPA Entities

```java
@Entity @Table(name = "distribution_list")
@Getter @Setter @NoArgsConstructor
public class DistributionList {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

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
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @OneToMany(mappedBy = "distributionList", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<DistributionListMember> members = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "distribution_list_share", joinColumns = @JoinColumn(name = "dl_id"))
    @Column(name = "user_id")
    private Set<String> sharedWith = new HashSet<>();

    @PreUpdate void touch() { this.updatedAt = Instant.now(); }

    public enum Visibility { PRIVATE, SHARED, PUBLIC }
}

@Entity @Table(name = "distribution_list_member")
@Getter @Setter @NoArgsConstructor
public class DistributionListMember {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dl_id", nullable = false)
    private DistributionList distributionList;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "display_name", length = 150)
    private String displayName;
}
```

---

## 3. DTOs

```java
public record DistributionListDto(
    UUID id,
    String prefix,
    String name,
    String displayName,            // prefix + name -> "DSPCH-TeamAlpha"
    String description,
    String visibility,
    String ownerId,
    int memberCount,
    List<MemberDto> members,
    Set<String> sharedWith
) {}

public record MemberDto(String email, String displayName) {}

public record DistributionListUpsertDto(
    @NotBlank @Size(max = 150) String name,
    @Size(max = 20)             String prefix,        // null -> default DSPCH-
    @Size(max = 500)            String description,
    @NotNull                    Visibility visibility,
    @NotNull @Size(min = 1)     List<MemberDto> members,
    Set<String>                 sharedWith            // ignored unless visibility=SHARED
) {}

/** Unified result returned by /recipients/search. type=USER | DL. */
public record RecipientSuggestionDto(
    String type,
    String id,
    String email,           // USER only
    String displayName,     // user name OR "DSPCH-TeamAlpha"
    String subtitle,        // user email/department OR "12 members · shared"
    Integer memberCount     // DL only
) {}

/** Payload entry sent by frontend in to/cc/bcc lists. */
public record RecipientRefDto(
    String type,            // "USER" | "DL"
    String id,              // DL uuid (for DL)
    String email            // raw email (for USER) — falls back to id for free-typed entries
) {}
```

---

## 4. Repositories, Service, Controller (CRUD)

```java
public interface DistributionListRepository extends JpaRepository<DistributionList, UUID> {

    @Query("""
        select dl from DistributionList dl
        where dl.active = true
          and (dl.ownerId = :uid
               or dl.visibility = 'PUBLIC'
               or :uid member of dl.sharedWith)
        order by dl.name
    """)
    List<DistributionList> findVisibleTo(@Param("uid") String userId);

    /** Used by the unified search. LIKE pattern must be pre-wrapped with %...%. */
    @Query(value = """
        SELECT DISTINCT TOP (:lim) dl.*
        FROM distribution_list dl
        LEFT JOIN distribution_list_member m ON m.dl_id = dl.id
        LEFT JOIN distribution_list_share  s ON s.dl_id = dl.id
        WHERE dl.is_active = 1
          AND (dl.owner_id = :uid OR dl.visibility = 'PUBLIC' OR s.user_id = :uid)
          AND ( LOWER(dl.prefix + dl.name) LIKE :q
             OR LOWER(dl.name)             LIKE :q
             OR LOWER(m.email)             LIKE :q )
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
    public DistributionListDto get(UUID id) {
        var dl = repo.findById(id).orElseThrow(() -> new NotFoundException("DL not found"));
        requireReadAccess(dl);
        return toDto(dl);
    }

    @Transactional
    public DistributionListDto create(DistributionListUpsertDto in) {
        var dl = new DistributionList();
        dl.setOwnerId(currentUser.id());
        applyUpsert(dl, in);
        return toDto(repo.save(dl));
    }

    @Transactional
    public DistributionListDto update(UUID id, DistributionListUpsertDto in) {
        var dl = repo.findById(id).orElseThrow(() -> new NotFoundException("DL not found"));
        requireOwner(dl);
        applyUpsert(dl, in);
        return toDto(repo.save(dl));
    }

    @Transactional
    public void delete(UUID id) {
        var dl = repo.findById(id).orElseThrow(() -> new NotFoundException("DL not found"));
        requireOwner(dl);
        dl.setActive(false);                 // soft delete preserves audit trail of past sends
        repo.save(dl);
    }

    /* ------------- helpers ------------- */

    private void applyUpsert(DistributionList dl, DistributionListUpsertDto in) {
        dl.setName(in.name().trim());
        dl.setPrefix(StringUtils.hasText(in.prefix()) ? in.prefix() : "DSPCH-");
        dl.setDescription(in.description());
        dl.setVisibility(in.visibility());
        dl.setSharedWith(in.visibility() == Visibility.SHARED && in.sharedWith() != null
            ? new HashSet<>(in.sharedWith()) : new HashSet<>());

        // clear/addAll sync pattern — orphanRemoval drops detached members
        dl.getMembers().clear();
        for (MemberDto m : in.members()) {
            var entity = new DistributionListMember();
            entity.setDistributionList(dl);
            entity.setEmail(m.email().toLowerCase().trim());
            entity.setDisplayName(m.displayName());
            dl.getMembers().add(entity);
        }
    }

    private DistributionListDto toDto(DistributionList dl) {
        return new DistributionListDto(
            dl.getId(), dl.getPrefix(), dl.getName(),
            dl.getPrefix() + dl.getName(),
            dl.getDescription(), dl.getVisibility().name(), dl.getOwnerId(),
            dl.getMembers().size(),
            dl.getMembers().stream()
                .map(m -> new MemberDto(m.getEmail(), m.getDisplayName())).toList(),
            dl.getSharedWith()
        );
    }

    private void requireOwner(DistributionList dl) {
        if (!dl.getOwnerId().equals(currentUser.id())) throw new ForbiddenException();
    }
    private void requireReadAccess(DistributionList dl) {
        var uid = currentUser.id();
        if (!dl.getOwnerId().equals(uid)
            && dl.getVisibility() != Visibility.PUBLIC
            && !dl.getSharedWith().contains(uid)) throw new ForbiddenException();
    }
}
```

```java
@RestController
@RequestMapping("/api/distribution-lists")
@RequiredArgsConstructor
public class DistributionListController {
    private final DistributionListService service;

    @GetMapping                          public List<DistributionListDto>  list()                                      { return service.listMine(); }
    @GetMapping("/{id}")                 public DistributionListDto         get(@PathVariable UUID id)                  { return service.get(id); }
    @PostMapping                         public DistributionListDto         create(@Valid @RequestBody DistributionListUpsertDto in) { return service.create(in); }
    @PutMapping("/{id}")                 public DistributionListDto         update(@PathVariable UUID id, @Valid @RequestBody DistributionListUpsertDto in) { return service.update(id, in); }
    @DeleteMapping("/{id}")              public void                        delete(@PathVariable UUID id)               { service.delete(id); }
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
            String visBadge = dl.getVisibility() == Visibility.SHARED ? " · shared"
                            : dl.getVisibility() == Visibility.PUBLIC ? " · public" : "";
            out.add(new RecipientSuggestionDto(
                "DL", dl.getId().toString(), null,
                dl.getPrefix() + dl.getName(),
                dl.getMembers().size() + " members" + visBadge,
                dl.getMembers().size()));
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

    public record Resolved(List<String> emails, List<UUID> expandedDlIds, List<String> warnings) {}

    /**
     * Expand a mixed list of USER + DL refs into a deduplicated, validated email list.
     * Silently skips DLs the caller cannot access (logs a warning).
     */
    public Resolved resolve(List<RecipientRefDto> refs) {
        Set<String> emails = new LinkedHashSet<>();
        List<UUID> dlIds   = new ArrayList<>();
        List<String> warns = new ArrayList<>();
        String uid = currentUser.id();

        for (RecipientRefDto r : refs) {
            if ("DL".equalsIgnoreCase(r.type())) {
                UUID id = UUID.fromString(r.id());
                var dl = dlRepo.findById(id).orElse(null);
                if (dl == null || !dl.isActive()) {
                    warns.add("Distribution list " + r.id() + " is no longer available — skipped.");
                    continue;
                }
                if (!hasAccess(dl, uid)) {
                    warns.add("You no longer have access to DL '" + dl.getPrefix() + dl.getName() + "' — skipped.");
                    continue;
                }
                if (dl.getMembers().isEmpty()) {
                    warns.add("DL '" + dl.getPrefix() + dl.getName() + "' is empty.");
                    continue;
                }
                dl.getMembers().forEach(m -> emails.add(m.getEmail().toLowerCase()));
                dlIds.add(id);
            } else {
                if (StringUtils.hasText(r.email())) emails.add(r.email().toLowerCase().trim());
            }
        }
        return new Resolved(new ArrayList<>(emails), dlIds, warns);
    }

    private boolean hasAccess(DistributionList dl, String uid) {
        return dl.getOwnerId().equals(uid)
            || dl.getVisibility() == Visibility.PUBLIC
            || dl.getSharedWith().contains(uid);
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
           { "type": "DL",   "id":    "5c9e...-uuid" } ],
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
public SentMessageDto send(UUID templateId, SendRequestDto req) {
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
        .sentAt(Instant.now())
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
public ResendDto resend(UUID sentMessageId) {
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

1. Reads `toRefs` and rebuilds the chip list. For each `DL` ref it calls `GET /api/distribution-lists/{id}` to **re-fetch live members** (count badge updates).
2. If the GET 404s / 403s, the chip is rendered in a "broken DL" state and excluded from `Send`.
3. On the next `Send` the resolver re-expands — picking up any new/removed members since the original send.

---

## 9. Validation Rules

| Rule | Where | Behavior |
|------|-------|----------|
| DL name unique per owner | DB `uq_dl_owner_name` + service pre-check | 409 Conflict, friendly message |
| Members required (≥1) | `@Size(min=1)` on DTO + service | 400 BAD_REQUEST |
| Email format | `@Email` on `MemberDto.email` | 400 |
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
    @Test void update_clearsAndReaddsMembers()      { /* orphanRemoval verified */ }
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

## 11. User Directory Search for SHARED Picker

When a user creates/edits a DL with `visibility = SHARED`, the UI shows a
second autocomplete to select **which org users** can see and use this DL.
The picker calls a dedicated endpoint that only returns directory users
(never DLs) and is scoped by AD/SSO membership.

### Endpoint
```
GET /api/users/search?q={query}&limit=8
```

### Response
```json
[
  { "id": "u-12", "name": "Jane Smith", "email": "jane.smith@company.com", "department": "Design" },
  ...
]
```

### Service Sketch
```java
@Service
public class UserDirectoryService {

    private final UserRepository userRepo;   // backed by AD / SCIM sync table

    public List<DirectoryUserDto> search(String q, int limit) {
        if (q == null || q.isBlank()) return List.of();
        String like = "%" + q.toLowerCase() + "%";
        return userRepo
            .findTopByNameOrEmailOrDepartment(like, PageRequest.of(0, limit))
            .stream()
            .map(u -> new DirectoryUserDto(u.getId(), u.getName(), u.getEmail(), u.getDepartment()))
            .toList();
    }
}
```

### How `sharedWith` Is Persisted
1. Frontend sends `sharedWith: ["u-12", "u-34", ...]` (array of user ids) inside the DL upsert payload.
2. `DistributionListService.upsert` clears the `distribution_list_share` rows for that `dl_id` and re-inserts the new set (collection-sync pattern).
3. On any subsequent search/list query (§5), the WHERE clause `:uid member of dl.sharedWith` (or the equivalent JOIN on `distribution_list_share`) decides whether the requesting user sees the DL.

### Validation Rules (server)
| Rule | Code | Status |
|------|------|--------|
| `visibility = SHARED` requires non-empty `sharedWith` | `DistributionListService.validate` | 400 |
| Each id in `sharedWith` must exist in user directory | `UserDirectoryService.assertExists(ids)` | 400 |
| Owner is implicit — do **not** include `ownerId` in `sharedWith` | filter on save | — |

### Frontend Files
- `src/pages/SharedUserPicker.tsx` — autocomplete component (org users only).
- `src/lib/distributionListStorage.ts` — `searchUsers()` + `getUsersByIds()` (swap with `fetch('/api/users/search?...')` for real backend).
- `src/pages/DistributionLists.tsx` — renders the picker only when `visibility === 'SHARED'` and disables Save until at least one user is selected.
