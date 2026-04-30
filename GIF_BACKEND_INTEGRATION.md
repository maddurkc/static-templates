# GIF / Inline Image Section — Backend Integration Guide

This document describes how the Spring Boot backend should handle the new
`gif` section so that uploaded GIFs / images are sent **inline** in the
final email — exactly the way Outlook handles a pasted image
(`untitled_files/image001.gif`).

> **Why CID, not base64?**
> Base64 `<img src="data:...">` works in some clients but is **stripped or
> downloaded-on-demand** in Outlook desktop, Gmail web, and most corporate
> mail systems. The CID (Content-ID) approach attaches the binary as a
> separate inline MIME part and references it from the HTML — this is
> what Outlook itself produces, so deliverability is identical.

---

## 1. Frontend → Backend Payload

When the user clicks **Send**, the frontend posts the existing template
payload plus a new `inlineAttachments` array. Each `gif` section in the
template contributes one entry.

```jsonc
POST /api/templates/{id}/send
{
  "to": ["alice@example.com"],
  "subject": "Weekly digest",
  "body": "<html>... <img src=\"cid:report-abc-1k3-9f@inline\" .../> ...</html>",
  "bodyDataMap": { ... },
  "subjectDataMap": { ... },

  // NEW — produced by the frontend from every `gif` section
  "inlineAttachments": [
    {
      "contentId": "report-abc-1k3-9f@inline",  // matches cid: in body
      "fileName":  "report.gif",
      "mimeType":  "image/gif",
      "dataBase64":"R0lGODlhEAAQAPIAAP///wAAAMLCwk..."
                   // raw base64 (NO `data:image/gif;base64,` prefix)
    }
  ]
}
```

### How the frontend builds it
For every section where `section.type === 'gif'`:

1. Strip the `data:<mime>;base64,` prefix from `variables.gifSrc`.
2. Use `variables.gifContentId` as the `contentId`.
3. Replace the `src` in the rendered HTML from the data URL to
   `cid:<contentId>` (the `renderSectionContent` helper already emits
   `cid:` form when only `gifContentId` is present — the send pipeline
   should call it in **send mode** so the data URL is dropped).

A small helper `buildInlineAttachments(sections)` should be added to
`templateApi.ts` and called from the existing send flow.

---

## 2. DTOs (Java)

### `InlineAttachmentDto`
```java
package com.example.template.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InlineAttachmentDto {
    @NotBlank private String contentId;   // e.g. report-abc@inline
    @NotBlank private String fileName;    // e.g. report.gif
    @NotBlank private String mimeType;    // e.g. image/gif
    @NotBlank private String dataBase64;  // raw base64, no prefix
}
```

### Extend `SendTemplateRequest`
```java
@Data
public class SendTemplateRequest {
    private List<String> to;
    private List<String> cc;
    private List<String> bcc;
    private String subject;
    private String body;
    private Map<String, Object> bodyDataMap;
    private Map<String, Object> subjectDataMap;

    // NEW
    @Valid
    private List<InlineAttachmentDto> inlineAttachments = new ArrayList<>();
}
```

---

## 3. Controller

```java
@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateSendController {

    private final TemplateSendService templateSendService;

    @PostMapping("/{id}/send")
    public ResponseEntity<SendTemplateResponse> send(
            @PathVariable("id") UUID templateId,
            @Valid @RequestBody SendTemplateRequest request) {

        SendTemplateResponse resp = templateSendService.send(templateId, request);
        return ResponseEntity.ok(resp);
    }
}
```

Nothing changes here other than the request DTO now carrying
`inlineAttachments`.

---

## 4. Service — building the MIME message

The service must:

1. Resolve Thymeleaf variables in `body` (existing logic — unchanged).
2. Validate that **every `cid:xxx`** referenced in the rendered HTML has a
   matching `inlineAttachments` entry. Reject otherwise.
3. Build a `MimeMessage` with `multipart/related` so the inline parts are
   linked to the HTML.

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class TemplateSendService {

    private final JavaMailSender mailSender;
    private final TemplateRenderer templateRenderer;   // existing
    private final TemplateRepository templateRepository;

    public SendTemplateResponse send(UUID templateId, SendTemplateRequest req) {

        TemplateEntity tpl = templateRepository.findById(templateId)
                .orElseThrow(() -> new NotFoundException("Template not found"));

        // 1. Render Thymeleaf placeholders (existing call)
        String renderedHtml = templateRenderer.render(req.getBody(), req.getBodyDataMap());
        String renderedSubject = templateRenderer.render(req.getSubject(), req.getSubjectDataMap());

        // 2. Validate referenced CIDs exist
        validateInlineCids(renderedHtml, req.getInlineAttachments());

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            // multipart=true → multipart/mixed; we want related for inline images,
            // so use the (true, "UTF-8") + setText variant and call addInline().
            MimeMessageHelper helper = new MimeMessageHelper(
                    mime,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setTo(req.getTo().toArray(new String[0]));
            if (req.getCc() != null)  helper.setCc(req.getCc().toArray(new String[0]));
            if (req.getBcc() != null) helper.setBcc(req.getBcc().toArray(new String[0]));
            helper.setSubject(renderedSubject);
            helper.setText(renderedHtml, /* html */ true);
            helper.setFrom("no-reply@yourdomain.com");

            // 3. Attach every inline image. The contentId here MUST match the
            //    `cid:` reference in the HTML body (without the `cid:` prefix).
            for (InlineAttachmentDto att : req.getInlineAttachments()) {
                byte[] bytes = Base64.getDecoder().decode(att.getDataBase64());
                ByteArrayResource resource = new ByteArrayResource(bytes) {
                    @Override public String getFilename() { return att.getFileName(); }
                };
                helper.addInline(att.getContentId(), resource, att.getMimeType());
            }

            mailSender.send(mime);
            return SendTemplateResponse.ok();

        } catch (MessagingException e) {
            throw new EmailSendException("Failed to send email", e);
        }
    }

    private static final Pattern CID_PATTERN =
            Pattern.compile("cid:([^\"'\\s>]+)", Pattern.CASE_INSENSITIVE);

    private void validateInlineCids(String html, List<InlineAttachmentDto> attachments) {
        Set<String> referenced = new HashSet<>();
        Matcher m = CID_PATTERN.matcher(html);
        while (m.find()) referenced.add(m.group(1));

        Set<String> provided = attachments.stream()
                .map(InlineAttachmentDto::getContentId)
                .collect(Collectors.toSet());

        Set<String> missing = new HashSet<>(referenced);
        missing.removeAll(provided);
        if (!missing.isEmpty()) {
            throw new BadRequestException(
                "HTML references inline images that were not uploaded: " + missing);
        }
    }
}
```

### Why `MULTIPART_MODE_MIXED_RELATED`?
Spring's `MimeMessageHelper` builds a nested MIME tree:

```
multipart/mixed
└── multipart/related
    ├── text/html             ← your rendered body with cid: refs
    ├── image/gif (inline)    ← addInline() #1
    └── image/png (inline)    ← addInline() #2
```

This is **exactly the structure Outlook produces**. Mail clients see the
images as part of the message body, not as separate attachments.

---

## 5. Persistence (Optional — recommended)

If users should be able to **re-send** a template later without re-uploading
the GIF, persist the binary alongside the section.

### Option A — in the existing `template_sections.variables` JSON
Already works today: the base64 string lives in
`variables.gifSrc`. Pros: zero schema change. Cons: bloats the
`variables` blob.

### Option B — dedicated table (preferred for >100 KB images)
```sql
CREATE TABLE template_inline_assets (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    template_id     UNIQUEIDENTIFIER NOT NULL,
    section_id      NVARCHAR(64)     NOT NULL,
    content_id      NVARCHAR(255)    NOT NULL,
    file_name       NVARCHAR(255)    NOT NULL,
    mime_type       NVARCHAR(100)    NOT NULL,
    data            VARBINARY(MAX)   NOT NULL,
    byte_size       BIGINT           NOT NULL,
    created_at      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_inline_assets_template
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
    CONSTRAINT UQ_inline_assets_section UNIQUE (template_id, section_id, content_id)
);
CREATE INDEX IX_inline_assets_template ON template_inline_assets(template_id);
```

```java
@Entity
@Table(name = "template_inline_assets")
@Data
public class TemplateInlineAssetEntity {
    @Id @GeneratedValue private UUID id;
    private UUID templateId;
    private String sectionId;
    private String contentId;
    private String fileName;
    private String mimeType;
    @Lob private byte[] data;
    private long byteSize;
    private OffsetDateTime createdAt;
}
```

```java
public interface TemplateInlineAssetRepository
        extends JpaRepository<TemplateInlineAssetEntity, UUID> {
    List<TemplateInlineAssetEntity> findByTemplateId(UUID templateId);
    Optional<TemplateInlineAssetEntity>
        findByTemplateIdAndSectionIdAndContentId(UUID t, String s, String c);
}
```

When `Template Save` happens, sync the assets the same way the existing
section/variable collections are synced (clear + addAll pattern documented
in the project memory).

When `Template Send` happens **and** the request omits a CID's binary,
load it from this table instead — that powers re-send and the
"Edit & Resend" flow.

---

## 6. Edge Cases & Hardening

| Concern | Mitigation |
|---|---|
| Huge GIFs blow up the payload | Frontend caps at 5 MB; backend rejects request bodies >10 MB. |
| Unsupported MIME type | Whitelist: `image/gif`, `image/png`, `image/jpeg`, `image/webp`. |
| HTML references a `cid:` not in the request | `validateInlineCids` throws 400. |
| Inline asset uploaded but never referenced | Log warning and skip — don't fail the send. |
| Same image used in multiple sections | Frontend should reuse `gifContentId`; backend de-duplicates by `contentId`. |
| Spam-filter scoring | `Content-Disposition: inline` + `Content-ID` is set automatically by `addInline()`. |
| Outlook-cache filename (`untitled_files/image001.gif`) | This is generated by Outlook itself when the user does **View Source**. Nothing to do server-side — the on-the-wire MIME is identical. |

---

## 7. Testing

```java
@SpringBootTest
class TemplateSendServiceInlineGifTest {

    @Autowired TemplateSendService service;
    @MockBean JavaMailSender mailSender;

    @Captor ArgumentCaptor<MimeMessage> captor;

    @Test
    void sendsInlineImageAsCidPart() throws Exception {
        SendTemplateRequest req = new SendTemplateRequest();
        req.setTo(List.of("a@b.com"));
        req.setSubject("Hi");
        req.setBody("<html><body><img src=\"cid:logo@inline\"/></body></html>");

        InlineAttachmentDto a = new InlineAttachmentDto();
        a.setContentId("logo@inline");
        a.setFileName("logo.gif");
        a.setMimeType("image/gif");
        a.setDataBase64(Base64.getEncoder().encodeToString(new byte[]{1,2,3}));
        req.setInlineAttachments(List.of(a));

        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session)null));
        service.send(UUID.randomUUID(), req);

        verify(mailSender).send(captor.capture());
        MimeMessage sent = captor.getValue();
        // assert multipart/related, html part, image/gif part with Content-ID <logo@inline>
        ...
    }

    @Test
    void rejectsHtmlReferencingMissingCid() {
        SendTemplateRequest req = new SendTemplateRequest();
        req.setTo(List.of("a@b.com"));
        req.setBody("<img src=\"cid:missing@inline\"/>");
        assertThrows(BadRequestException.class,
            () -> service.send(UUID.randomUUID(), req));
    }
}
```

---

## 8. Summary — End-to-End Flow

```
┌──────────────┐  drag/drop GIF  ┌────────────────┐
│   Browser    │ ───────────────►│ GifSection     │
│              │                 │ Editor (React) │
└──────┬───────┘                 └────────┬───────┘
       │ base64 data URL stored in section.variables.gifSrc
       │ unique gifContentId generated client-side
       ▼
   Editor / RunTemplates preview renders <img src="data:..."/>
       │
       │ Click "Send"
       ▼
   buildInlineAttachments(sections) →
   POST /api/templates/{id}/send
       {body: "...<img src='cid:foo@inline'/>...",
        inlineAttachments:[{contentId:'foo@inline', dataBase64:'...'}]}
       │
       ▼
┌──────────────┐
│ Spring Boot  │  TemplateSendService:
│              │   1. render Thymeleaf
│              │   2. validate cid refs
│              │   3. MimeMessageHelper.addInline(contentId, bytes, mime)
│              │   4. mailSender.send(mime)
└──────┬───────┘
       ▼
   SMTP → recipient's mailbox → Outlook shows image inline.
   "View Source" in Outlook reveals untitled_files/image001.gif —
   that filename is purely Outlook's local cache; the wire format is
   the multipart/related + Content-ID we just sent.
```
