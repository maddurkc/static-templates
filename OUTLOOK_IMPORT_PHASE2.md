# Outlook Import — Phase 2 (.eml upload + inline image extraction)

**Scope:** Add `.eml` upload. Parse with Jakarta Mail, extract the `text/html` part and inline `cid:` images, upload images to storage, rewrite `<img src="cid:…">` to hosted URLs, then run the Phase-1 pipeline.

Depends on `OUTLOOK_IMPORT_PHASE1.md`.

---

## 1. Dependency

`pom.xml`:

```xml
<dependency>
  <groupId>jakarta.mail</groupId>
  <artifactId>jakarta.mail-api</artifactId>
  <version>2.1.3</version>
</dependency>
<dependency>
  <groupId>org.eclipse.angus</groupId>
  <artifactId>angus-mail</artifactId>
  <version>2.0.3</version>
</dependency>
```

---

## 2. EML Parser — `EmlParser.java`

```java
package com.example.templates.service.outlook.parser;

import jakarta.mail.*;
import jakarta.mail.internet.*;
import org.springframework.stereotype.Component;
import java.io.*;
import java.util.*;

@Component
public class EmlParser {

    public static class ParsedEmail {
        public String subject;
        public String html;
        public Map<String, InlineAsset> inlineAssets = new HashMap<>(); // cid -> bytes+mime
    }

    public static class InlineAsset {
        public String contentId;
        public String mimeType;
        public byte[] bytes;
        public String fileName;
    }

    public ParsedEmail parse(InputStream in) throws Exception {
        Session s = Session.getDefaultInstance(new Properties());
        MimeMessage msg = new MimeMessage(s, in);

        ParsedEmail out = new ParsedEmail();
        out.subject = msg.getSubject();
        walk(msg, out);
        return out;
    }

    private void walk(Part p, ParsedEmail out) throws Exception {
        if (p.isMimeType("text/html") && out.html == null) {
            out.html = (String) p.getContent();
        } else if (p.isMimeType("multipart/*")) {
            Multipart mp = (Multipart) p.getContent();
            for (int i = 0; i < mp.getCount(); i++) walk(mp.getBodyPart(i), out);
        } else if (p.getContentType() != null && p.getContentType().toLowerCase().startsWith("image/")) {
            String[] cid = p.getHeader("Content-ID");
            if (cid != null && cid.length > 0) {
                InlineAsset a = new InlineAsset();
                a.contentId = cid[0].replaceAll("[<>]", "");
                a.mimeType  = p.getContentType().split(";")[0].trim();
                a.fileName  = p.getFileName();
                try (InputStream is = p.getInputStream(); ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
                    is.transferTo(bos);
                    a.bytes = bos.toByteArray();
                }
                out.inlineAssets.put(a.contentId, a);
            }
        }
    }
}
```

---

## 3. Asset hosting

Reuse the existing `AttachmentUploadService` used by the GIF pipeline (see `GIF_UPLOAD_STRATEGY.md`). Add:

```java
public String uploadInlineAsset(byte[] bytes, String mimeType, String fileName) { … }
// returns hosted URL
```

---

## 4. Wire into `OutlookImportService`

```java
public ImportedTemplateDto importFromEml(InputStream emlStream) throws Exception {
    EmlParser.ParsedEmail email = emlParser.parse(emlStream);
    String html = rewriteCidReferences(email.html, email.inlineAssets);
    return importFromHtml(html, email.subject);
}

private String rewriteCidReferences(String html, Map<String, EmlParser.InlineAsset> assets) {
    Document doc = Jsoup.parse(html);
    for (Element img : doc.select("img[src^=cid:]")) {
        String cid = img.attr("src").substring(4);
        EmlParser.InlineAsset a = assets.get(cid);
        if (a != null) {
            String url = attachmentUploadService.uploadInlineAsset(a.bytes, a.mimeType, a.fileName);
            img.attr("src", url);
        }
    }
    return doc.outerHtml();
}
```

---

## 5. Controller endpoint (multipart)

```java
@PostMapping(value = "/import-outlook/eml", consumes = "multipart/form-data")
public ResponseEntity<ImportedTemplateDto> importFromEml(@RequestParam MultipartFile file) throws Exception {
    try (InputStream in = file.getInputStream()) {
        return ResponseEntity.ok(service.importFromEml(in));
    }
}
```

---

## 6. Frontend

Extend `ImportOutlookDialog.tsx` with **Tabs**: `Paste HTML | Upload .eml`.

```tsx
<Tabs defaultValue="paste">
  <TabsList>
    <TabsTrigger value="paste">Paste HTML</TabsTrigger>
    <TabsTrigger value="eml">Upload .eml</TabsTrigger>
  </TabsList>
  <TabsContent value="paste">{/* existing textarea */}</TabsContent>
  <TabsContent value="eml">
    <Input type="file" accept=".eml" onChange={e => setEmlFile(e.target.files?.[0] ?? null)} />
  </TabsContent>
</Tabs>
```

API client:

```ts
export async function importOutlookEml(file: File): Promise<Template> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/templates/import-outlook/eml', { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`Import failed: ${res.status}`);
  const dto = await res.json();
  return toTemplate(dto);
}
```

---

## 7. Phase 2 acceptance

- `.eml` upload works; the resulting template preserves inline images via hosted URLs (not `cid:`).
- Subject line pre-fills the template name.
- Falls through to the same classifier pipeline as Phase 1.
