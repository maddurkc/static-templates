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

## Visibility Rules (Card listing on `/distribution-lists`)

A user `U` sees a DL card if and only if **one** of these is true:

| Visibility | Visible to |
|------------|------------|
| `PUBLIC`   | Everyone (any authenticated user) |
| `PRIVATE`  | **Only** the creator (`owner_id = U`) |
| `SHARED`   | The creator **and** every user listed in `distribution_list_share` (`owner_id = U` OR `share.user_id = U`) |

Edit / delete remain owner-only regardless of visibility (enforced in `DistributionListService` via `ForbiddenException`).

**Single source of truth for filtering:**
- Backend: `DistributionListRepository.findVisibleTo(:uid)` — see §6.
- Frontend: `listDistributionLists()` in `src/lib/distributionListStorage.ts` — mirrors the same predicate for the local/demo store and simply renders whatever `GET /api/distribution-lists` returns when wired to the backend (§14).

The SQL predicate is canonical:

```sql
WHERE dl.is_active = 1
  AND ( dl.owner_id = :uid
        OR dl.visibility = 'PUBLIC'
        OR EXISTS (SELECT 1 FROM dbo.distribution_list_share s
                   WHERE s.distribution_list_id = dl.distribution_list_id
                     AND s.user_id = :uid) )
```

---


## 1. SQL Migration (MS SQL Server)

`V20260610__create_distribution_lists.sql`

```sql
-- =============================================================
-- Custom Smart Distribution Lists
-- =============================================================

CREATE TABLE dbo.distribution_list (
    distribution_list_id  UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_dl PRIMARY KEY DEFAULT NEWID(),
                                                                    -- DB column type is UNIQUEIDENTIFIER (UUID); the JPA
                                                                    -- entity maps it to `String` via @GenericGenerator("uuid2").
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
    distribution_list_share_id  UNIQUEIDENTIFIER NOT NULL CONSTRAINT pk_dls PRIMARY KEY DEFAULT NEWID(),
                                                                    -- Surrogate PK. DB type UNIQUEIDENTIFIER (UUID);
                                                                    -- JPA maps to `String` via @GenericGenerator("uuid2").
    distribution_list_id        UNIQUEIDENTIFIER NOT NULL,          -- FK → distribution_list.distribution_list_id (UUID column)
    user_id                     NVARCHAR(100)    NOT NULL,          -- internal directory id
    elid                        NVARCHAR(50)     NULL,              -- enterprise / employee id
    lanid                       NVARCHAR(50)     NULL,              -- LAN / network id
    name                        NVARCHAR(150)    NOT NULL,
    emailid                     NVARCHAR(255)    NOT NULL,
    department                  NVARCHAR(150)    NULL,
    CONSTRAINT uq_dls_dl_user UNIQUE (distribution_list_id, user_id),  -- one share row per (DL, user)
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
    private List<DistributionListShareEntity> sharedWith = new ArrayList<>();

    @PreUpdate void touch() { this.updatedAt = LocalDateTime.now(); }

    public enum Visibility { PRIVATE, SHARED, PUBLIC }
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
    @Column(length = 150)                   private String department;
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
    String distributionListShareId, // surrogate PK (UUID, server-generated); null on create
    String userId,                  // internal directory id (unique per DL)
    String elid,                    // enterprise / employee id  (nullable)
    String lanid,                   // LAN / network id          (nullable)
    String name,
    String emailid,
    String department               // nullable
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
    List<DistributionListEntity> searchVisibleTo(@Param("uid") String userId,
                                           @Param("q") String like,
                                           @Param("lim") int limit);
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

    private void applyUpsert(DistributionListEntity dl, DistributionListUpsertDto in) {
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
                var row = new DistributionListShareEntity();
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

    private DistributionListDto toDto(DistributionListEntity dl) {
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
                    s.getDistributionListShareId(),
                    s.getUserId(), s.getElid(), s.getLanid(),
                    s.getName(), s.getEmailid(), s.getDepartment()))
                .toList(),
            dl.getCreatedAt(),
            dl.getUpdatedAt()
        );
    }

    private void requireOwner(DistributionListEntity dl) {
        if (!dl.getOwnerId().equals(currentUser.id())) throw new ForbiddenException();
    }
    private void requireReadAccess(DistributionListEntity dl) {
        var uid = currentUser.id();
        if (!dl.getOwnerId().equals(uid)
            && dl.getVisibility() != Visibility.PUBLIC
            && dl.getSharedWith().stream().noneMatch(s -> uid.equals(s.getUserId())))
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

    private boolean hasAccess(DistributionListEntity dl, String uid) {
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

    @Test void resolve_dedupesAcrossDlAndUser() {
        var dl = dlWith("a@x.com","b@x.com");
        when(dlRepo.findById(dl.getDistributionListId())).thenReturn(Optional.of(dl));
        when(currentUser.id()).thenReturn("owner-1");

        var out = svc.resolve(List.of(
            new RecipientRefDto("USER", null, "a@x.com"),
            new RecipientRefDto("DL",   dl.getDistributionListId(), null)));

        assertThat(out.emails()).containsExactly("a@x.com","b@x.com");  // dedup
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

export type DLVisibility = "PRIVATE" | "SHARED" | "PUBLIC";

export interface DLMember {
  email: string;
  displayName?: string;
}

/** Mirrors backend `SharedUserDto`. */
export interface SharedUserRef {
  distributionListShareId?: string; // surrogate PK, server-assigned
  userId: string;
  elid?: string;
  lanid?: string;
  name: string;
  emailid: string;
  department?: string;
}

/** Mirrors backend `DistributionListDto`. */
export interface DistributionList {
  distributionListId: string;
  prefix: string;
  name: string;
  displayName: string;
  description?: string;
  visibility: DLVisibility;
  ownerId: string;
  membersRaw: string;
  members: DLMember[];      // derived from membersRaw
  sharedWith: SharedUserRef[];
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
  membersRaw: string;
  sharedWith?: SharedUserRef[];
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

/** Backend returns `memberEmails: string[]`; hydrate to `{ email }[]`. */
interface RawDLDto extends Omit<DistributionList, "members"> {
  memberEmails?: string[];
}
function hydrate(dto: RawDLDto): DistributionList {
  const members =
    dto.memberEmails?.map((email) => ({ email })) ?? parseMembersRaw(dto.membersRaw);
  return { ...dto, members };
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
    department: u.department,
  };
}

export function fromSharedRef(s: SharedUserRef): DirectoryUser {
  return {
    id: s.userId,
    elid: s.elid,
    lanid: s.lanid,
    name: s.name,
    email: s.emailid,
    department: s.department,
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
  emails: string[];
  expandedDlIds: string[];
  warnings: string[];
}

/**
 * POST /api/recipients/resolve  body: RecipientRef[]
 * Server-side mirror of `RecipientResolverService` (§6).
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

`resolveRecipients` is now **async**. Callers in `RunTemplates.tsx` (and
anywhere else expanding DLs at send-time) must `await` it:

```ts
// before (demo, sync)
const { emails, warnings } = resolveRecipients(refs);

// after (real backend)
const { emails, warnings } = await resolveRecipients(refs);
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
| `visibility` | string | `ALL`   | `ALL` \| `PUBLIC` \| `PRIVATE` \| `SHARED` | Additional filter applied **on top of** the §0 visibility predicate |
| `search`     | string | `""`    | free-text                       | Matched against `displayName`, `name`, and `members_raw` (LIKE `%q%`) |

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
           OR LOWER(dl.name)        LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(dl.membersRaw)  LIKE LOWER(CONCAT('%', :search, '%')) )
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
