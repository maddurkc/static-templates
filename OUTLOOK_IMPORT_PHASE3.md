# Outlook Import — Phase 3 (.msg upload, banner/footer, placeholders, report UI)

**Scope:**
- `.msg` upload via Apache POI HSMF.
- Add `BannerClassifier`, `FooterClassifier`, `ButtonClassifier`, `GifClassifier`, `SeparatorClassifier`, `LineBreakClassifier`, `LabeledContentClassifier`, `MixedContentClassifier`.
- Heuristic placeholder detection (dates, currency, URLs).
- Import Report UI in the frontend.

Depends on Phases 1 & 2.

---

## 1. Dependency (POI HSMF)

```xml
<dependency>
  <groupId>org.apache.poi</groupId>
  <artifactId>poi-scratchpad</artifactId>
  <version>5.3.0</version>
</dependency>
```

---

## 2. MSG Parser — `MsgParser.java`

```java
package com.example.templates.service.outlook.parser;

import org.apache.poi.hsmf.MAPIMessage;
import org.apache.poi.hsmf.datatypes.AttachmentChunks;
import org.springframework.stereotype.Component;
import java.io.InputStream;
import java.util.*;

@Component
public class MsgParser {

    public EmlParser.ParsedEmail parse(InputStream in) throws Exception {
        MAPIMessage msg = new MAPIMessage(in);
        msg.setReturnNullOnMissingChunk(true);

        EmlParser.ParsedEmail out = new EmlParser.ParsedEmail();
        out.subject = msg.getSubject();
        out.html = msg.getHtmlBody();
        if (out.html == null) {
            String rtf = msg.getRtfBody();
            out.html = rtf != null ? rtfToHtml(rtf) : "<p>" + escape(msg.getTextBody()) + "</p>";
        }

        for (AttachmentChunks a : msg.getAttachmentFiles()) {
            if (a.getAttachData() == null) continue;
            String cid = a.getAttachContentId() != null ? a.getAttachContentId().getValue() : null;
            if (cid == null) continue;

            EmlParser.InlineAsset ia = new EmlParser.InlineAsset();
            ia.contentId = cid;
            ia.mimeType  = a.getAttachMimeTag() != null ? a.getAttachMimeTag().getValue() : "application/octet-stream";
            ia.fileName  = a.getAttachFileName() != null ? a.getAttachFileName().getValue() : cid;
            ia.bytes     = a.getAttachData().getValue();
            out.inlineAssets.put(cid, ia);
        }
        return out;
    }

    private String rtfToHtml(String rtf) { /* light RTF→HTML fallback or use jRtf */ return "<pre>" + escape(rtf) + "</pre>"; }
    private String escape(String s) { return s == null ? "" : s.replace("<","&lt;").replace(">","&gt;"); }
}
```

Wire in `OutlookImportService.importFromMsg(...)`, reusing `rewriteCidReferences` + `importFromHtml`.

Controller:

```java
@PostMapping(value = "/import-outlook/msg", consumes = "multipart/form-data")
public ResponseEntity<ImportedTemplateDto> importFromMsg(@RequestParam MultipartFile file) throws Exception {
    try (InputStream in = file.getInputStream()) {
        return ResponseEntity.ok(service.importFromMsg(in));
    }
}
```

---

## 3. Additional classifiers

### 3.1 BannerClassifier

```java
@Component
public class BannerClassifier implements BlockClassifier {
    public int priority() { return 100; }
    public String sectionType() { return "banner"; }
    public boolean matches(Element el) {
        if (el.elementSiblingIndex() != 0) return false;              // must be first
        String style = el.attr("style").toLowerCase();
        boolean bg = style.contains("background") || !el.select("[bgcolor]").isEmpty();
        boolean big = el.text().length() < 200 && !el.select("img").isEmpty();
        return bg && big;
    }
}
```

### 3.2 FooterClassifier

Matches the **last** block that is small font, contains disclaimer/keywords (`unsubscribe`, `confidential`, `©`).

### 3.3 ButtonClassifier

Matches `<a>` with `bgcolor` attr OR inline style with `background-color` + `padding` + `border-radius`, OR class name containing `btn`.

### 3.4 GifClassifier

```java
public boolean matches(Element el) {
    Elements imgs = el.select("img");
    return imgs.size() == 1 && imgs.first().attr("src").toLowerCase().endsWith(".gif");
}
```

### 3.5 SeparatorClassifier / LineBreakClassifier / LabeledContentClassifier / MixedContentClassifier

Straightforward — see priority table in `OUTLOOK_IMPORT.md` §5.

---

## 4. Heuristic placeholder detection

```java
public class PlaceholderHeuristics {

    private static final Pattern DATE     = Pattern.compile("\\b([A-Z][a-z]{2,8})\\s+\\d{1,2},\\s+\\d{4}\\b");
    private static final Pattern CURRENCY = Pattern.compile("\\$\\d{1,3}(,\\d{3})*(\\.\\d{2})?");
    private static final Pattern URL      = Pattern.compile("https?://[\\w./%?=&#-]+");

    public String suggest(String text, Map<String, String> defaults) {
        text = replace(text, DATE,     defaults, "sendDate");
        text = replace(text, CURRENCY, defaults, "amount");
        text = replace(text, URL,      defaults, "link");
        return text;
    }

    private String replace(String text, Pattern p, Map<String,String> defaults, String base) {
        Matcher m = p.matcher(text);
        StringBuilder sb = new StringBuilder(); int i = 1;
        while (m.find()) {
            String key = base + (defaults.containsKey(base) ? i++ : "");
            defaults.putIfAbsent(key, m.group());
            m.appendReplacement(sb, "{{" + key + "}}");
        }
        m.appendTail(sb); return sb.toString();
    }
}
```

Applied by `SectionBuilder` for `paragraph`, `heading`, `mixed-content`, `labeled-content`.

---

## 5. Import Report — frontend

### 5.1 `ImportReportPanel.tsx`

```tsx
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Image as ImageIcon, Hash } from 'lucide-react';

export interface ImportReport {
  mappedCount: number;
  fallbackCount: number;
  imagesUploaded: number;
  placeholdersDetected: number;
  entries: { index: number; chosenType: string; confidence: number; notes?: string }[];
}

export const ImportReportPanel = ({ report, onJumpTo }: {
  report: ImportReport;
  onJumpTo: (index: number) => void;
}) => (
  <div className="space-y-3">
    <div className="flex gap-2 flex-wrap">
      <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />{report.mappedCount} mapped</Badge>
      {report.fallbackCount > 0 && (
        <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{report.fallbackCount} fallback</Badge>
      )}
      <Badge variant="outline"><ImageIcon className="h-3 w-3 mr-1" />{report.imagesUploaded} images</Badge>
      <Badge variant="outline"><Hash className="h-3 w-3 mr-1" />{report.placeholdersDetected} placeholders</Badge>
    </div>
    <ul className="text-sm divide-y">
      {report.entries.map(e => (
        <li key={e.index} className="py-2 flex justify-between items-center">
          <span>#{e.index + 1} · <code>{e.chosenType}</code>{e.notes && <em className="text-muted-foreground"> — {e.notes}</em>}</span>
          <button onClick={() => onJumpTo(e.index)} className="text-primary text-xs">jump →</button>
        </li>
      ))}
    </ul>
  </div>
);
```

### 5.2 Show report after import

In `ImportOutlookDialog`, on success: display `<ImportReportPanel>` before navigating, with a **Open in Editor** button.

---

## 6. Phase 3 acceptance

- `.msg` upload works with inline images.
- Banner and footer are correctly detected on representative emails.
- Buttons, GIFs, separators, and labeled content are typed correctly.
- Dates / currency / URLs surface as `{{sendDate}}`, `{{amount}}`, `{{link}}` variables with the literal as default.
- Import Report shows counts and per-block mapping; **Jump To** scrolls the editor to that section.
