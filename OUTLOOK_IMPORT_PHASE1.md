# Outlook Import — Phase 1 (MVP: Paste HTML → Sections)

**Scope:** Paste-HTML tab only. Basic classifiers: heading, paragraph, image, list, table. Everything else falls back to `html-content`. No `.eml`/`.msg` parsing yet, no image hosting.

See `OUTLOOK_IMPORT.md` for the full design.

---

## 1. Backend

### 1.1 DTO — `ImportedTemplateDto.java`

```java
package com.example.templates.dto;

import java.util.List;
import java.util.Map;

public class ImportedTemplateDto {
    private String subject;
    private List<SectionDto> sections;
    private Map<String, Object> variables;
    private ImportReportDto report;
    // getters/setters
}
```

### 1.2 Report DTO — `ImportReportDto.java`

```java
package com.example.templates.dto;

import java.util.List;

public class ImportReportDto {
    public static class Entry {
        public int index;
        public String chosenType;
        public double confidence;
        public String notes;
    }
    private List<Entry> entries;
    private int mappedCount;
    private int fallbackCount;
    // getters/setters
}
```

### 1.3 Controller — `OutlookImportController.java`

```java
package com.example.templates.controller;

import com.example.templates.dto.ImportedTemplateDto;
import com.example.templates.service.outlook.OutlookImportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/templates")
public class OutlookImportController {

    private final OutlookImportService service;

    public OutlookImportController(OutlookImportService service) {
        this.service = service;
    }

    // Phase 1: paste HTML only
    @PostMapping(value = "/import-outlook", consumes = "application/json")
    public ResponseEntity<ImportedTemplateDto> importFromHtml(@RequestBody ImportHtmlRequest req) {
        return ResponseEntity.ok(service.importFromHtml(req.getHtml(), req.getSubject()));
    }

    public static class ImportHtmlRequest {
        private String html;
        private String subject;
        // getters/setters
    }
}
```

### 1.4 Normalizer — `OutlookHtmlNormalizer.java`

```java
package com.example.templates.service.outlook.normalizer;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

@Component
public class OutlookHtmlNormalizer {

    public Document normalize(String rawHtml) {
        Document doc = Jsoup.parse(rawHtml);

        // 1. Strip MSO conditional comments
        doc.getAllElements().forEach(el -> el.childNodes().removeIf(n ->
            n.nodeName().equals("#comment") && n.toString().toLowerCase().contains("[if")
        ));

        // 2. Unwrap layout-only tables
        Elements tables = doc.select("table[role=presentation], table[cellpadding][cellspacing]");
        for (Element t : tables) {
            if (isLayoutOnly(t)) {
                t.unwrap();
            }
        }

        // 3. Collapse whitespace
        doc.body().traverse((node, depth) -> {
            if (node instanceof org.jsoup.nodes.TextNode tn) {
                tn.text(tn.text().replaceAll("\\s+", " "));
            }
        });

        return doc;
    }

    private boolean isLayoutOnly(Element table) {
        if (!table.select("th").isEmpty()) return false;
        Elements rows = table.select("> tbody > tr, > tr");
        if (rows.size() > 1 && table.select("td").size() > 2) return false;
        return true;
    }
}
```

### 1.5 Classifier interface + Phase-1 implementations

```java
package com.example.templates.service.outlook.classifier;

import org.jsoup.nodes.Element;

public interface BlockClassifier {
    boolean matches(Element el);
    int priority();
    String sectionType();
}
```

```java
@Component
public class HeadingClassifier implements BlockClassifier {
    public boolean matches(Element el) { return el.tagName().matches("h[1-6]"); }
    public int priority() { return 80; }
    public String sectionType() { return "heading" + el.tagName().charAt(1); } // set in builder
}
```

Similar minimal beans for **ImageClassifier** (`img`), **TableClassifier** (`table` with `<th>` or >1×>1 cells), **ListClassifier** (`ul`/`ol`), **ParagraphClassifier** (`p`, `div` with text), and **HtmlContentFallback** (priority 0, always matches).

### 1.6 Service — `OutlookImportService.java`

```java
@Service
public class OutlookImportService {

    private final OutlookHtmlNormalizer normalizer;
    private final List<BlockClassifier> classifiers; // Spring injects sorted by priority desc
    private final SectionBuilder builder;

    public OutlookImportService(OutlookHtmlNormalizer normalizer,
                                List<BlockClassifier> classifiers,
                                SectionBuilder builder) {
        this.normalizer = normalizer;
        this.classifiers = classifiers.stream()
            .sorted(Comparator.comparingInt(BlockClassifier::priority).reversed())
            .toList();
        this.builder = builder;
    }

    public ImportedTemplateDto importFromHtml(String rawHtml, String subject) {
        Document doc = normalizer.normalize(rawHtml);
        List<SectionDto> sections = new ArrayList<>();
        ImportReportDto report = new ImportReportDto();
        int idx = 0;

        for (Element el : doc.body().children()) {
            BlockClassifier chosen = classifiers.stream()
                .filter(c -> c.matches(el))
                .findFirst().orElseThrow();
            SectionDto sec = builder.build(el, chosen.sectionType(), idx);
            sections.add(sec);
            report.addEntry(idx, chosen.sectionType(),
                chosen.sectionType().equals("html-content") ? 0.3 : 0.9, null);
            idx++;
        }

        ImportedTemplateDto out = new ImportedTemplateDto();
        out.setSubject(subject);
        out.setSections(sections);
        out.setReport(report);
        return out;
    }
}
```

### 1.7 Section builder — `SectionBuilder.java`

Produces the `SectionDto` matching the frontend `Section` type. For Phase 1 it covers heading / paragraph / image / list / table / fallback. Placeholder normalization is a simple regex pass:

```java
private static final Pattern PH = Pattern.compile("(\\[[A-Z_]+\\])|(\\$\\{[^}]+\\})|(<%=\\s*[^%]+%>)|(%%[^%]+%%)");

private String normalizePlaceholders(String text) {
    return PH.matcher(text).replaceAll(m -> "{{" + m.group().replaceAll("[\\[\\]${}<%=%\\s]", "") + "}}");
}
```

---

## 2. Frontend

### 2.1 API client — add to `src/lib/templateApi.ts`

```ts
export async function importOutlookTemplate(html: string, subject?: string): Promise<Template> {
  const res = await fetch('/api/templates/import-outlook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, subject }),
  });
  if (!res.ok) throw new Error(`Import failed: ${res.status}`);
  const dto = await res.json();
  return {
    id: crypto.randomUUID(),
    name: dto.subject || 'Imported Template',
    subject: dto.subject || '',
    sections: dto.sections,
    createdAt: new Date().toISOString(),
    sectionCount: dto.sections.length,
    html: '',
  };
}
```

### 2.2 Dialog — `src/components/templates/ImportOutlookDialog.tsx`

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { importOutlookTemplate } from '@/lib/templateApi';
import { useToast } from '@/hooks/use-toast';

export const ImportOutlookDialog = ({ open, onOpenChange }: {
  open: boolean; onOpenChange: (o: boolean) => void;
}) => {
  const [html, setHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { toast } = useToast();

  const handleImport = async () => {
    setBusy(true);
    try {
      const tpl = await importOutlookTemplate(html, subject);
      toast({ title: 'Imported', description: `${tpl.sectionCount} sections created.` });
      onOpenChange(false);
      nav('/templates/editor', { state: { template: tpl } });
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Import from Outlook (HTML)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} />
          <Textarea rows={14} placeholder="Paste Outlook email HTML here…"
                    value={html} onChange={e => setHtml(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleImport} disabled={!html.trim() || busy}>
            {busy ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### 2.3 Wire button into `src/pages/Templates.tsx`

Add near the *Create New Static Template* button:

```tsx
<Button size="lg" variant="outline" onClick={() => setShowImport(true)}>
  <Upload className="h-5 w-5 mr-2" /> Import from Outlook
</Button>
<ImportOutlookDialog open={showImport} onOpenChange={setShowImport} />
```

---

## 3. Phase 1 acceptance

- Paste representative Outlook HTML → editor opens with sections populated.
- Headings, paragraphs, images, simple `<ul>`/`<ol>`, and semantic tables map to typed sections.
- Anything else survives as an editable `html-content` block.
- Save and preview flow are unchanged — existing generators produce the preview + Outlook HTML.
