# Outlook Import — Phase 4 (LLM-assisted classification for low-confidence blocks)

**Scope:** For any block where the rule-based classifier returns low confidence (or falls back to `html-content`), consult the Lovable AI Gateway to pick a `SectionType` and produce a structured `Section`. Rule-based path stays primary — LLM is only a rescue tier so cost stays bounded.

Depends on Phases 1–3.

---

## 1. When to invoke the LLM

Trigger conditions (any):
- Chosen classifier is `HtmlContentFallback`.
- Chosen classifier priority < 40 **and** block text length > 40 chars.
- Block contains mixed structural children the rules couldn't disambiguate.

Never invoke for blocks classified as `banner`, `heading*`, `table`, `image`, `gif`, `button`, `list`, `separator-line`, `line-break`, `program-name`, or `footer` with high confidence.

---

## 2. Gateway call

Reuse the existing Lovable AI Gateway pattern (see project connector docs). One request per template import batches all low-confidence blocks into a single call.

```java
@Service
public class LlmBlockClassifier {

    private final RestClient http;
    private final String gatewayUrl = System.getenv("LOVABLE_AI_GATEWAY_URL");
    private final String apiKey     = System.getenv("LOVABLE_API_KEY");

    public List<LlmDecision> classify(List<CandidateBlock> blocks) {
        var payload = Map.of(
            "model", "google/gemini-2.5-flash",
            "messages", List.of(
                Map.of("role","system","content", SYSTEM_PROMPT),
                Map.of("role","user","content", buildUserPrompt(blocks))
            ),
            "response_format", Map.of("type","json_object")
        );
        var resp = http.post().uri(gatewayUrl + "/chat/completions")
            .header("Authorization", "Bearer " + apiKey)
            .body(payload)
            .retrieve().body(Map.class);
        return parse(resp);
    }
}
```

`CandidateBlock`:

```java
public record CandidateBlock(int index, String tagName, String outerHtmlTrimmed, String textPreview) {}
```

Trim `outerHtml` to a safe size (e.g. 4KB) before sending.

---

## 3. Prompt

**System:**

```
You classify HTML fragments from an Outlook email into one of the allowed section types
for our template editor. Return STRICT JSON: {"decisions":[{"index":N,"type":"...","confidence":0-1,"reason":"..."}]}.
Allowed types: heading1..heading6, paragraph, table, bullet-list-disc, bullet-list-circle,
bullet-list-square, number-list-1, number-list-i, number-list-a, image, gif, button, link,
separator-line, line-break, banner, footer, mixed-content, labeled-content, html-content.
If uncertain, choose html-content with confidence <= 0.4.
```

**User:** JSON array of `{index, tagName, textPreview, outerHtmlTrimmed}`.

---

## 4. Merging LLM decisions

```java
for (LlmDecision d : decisions) {
    if (d.confidence() < 0.5) continue; // keep rule-based fallback
    SectionDto original = sections.get(d.index());
    SectionDto rebuilt  = builder.buildFromType(originalElement, d.type(), d.index());
    sections.set(d.index(), rebuilt);
    report.markLlm(d.index(), d.type(), d.confidence(), d.reason());
}
```

Report entry keeps both `ruleType` and `llmType` so the UI can show `html-content → paragraph (LLM 0.82)`.

---

## 5. Guardrails

- **Hard cap** per import: max 20 LLM-classified blocks. Extras stay as rule-based result.
- **Timeout** 8s total; on failure, keep rule-based results (no user-visible error).
- **Never** send full email HTML — only per-block fragments, already trimmed.
- **Never** trust the LLM to invent variables or content — it only picks a `type`; `SectionBuilder` still constructs the section from the original DOM.
- Track cost via existing gateway logs (`ai_gateway_logs`).

---

## 6. Frontend surfacing

In `ImportReportPanel.tsx`, add a small badge for LLM-rescued blocks:

```tsx
{e.llmType && <Badge variant="secondary" className="ml-2">LLM · {e.llmType} · {(e.llmConfidence*100).toFixed(0)}%</Badge>}
```

Give the user a toggle in `ImportOutlookDialog` — **"Use AI to improve mapping"** (default on). When off, Phase 4 path is skipped entirely.

---

## 7. Phase 4 acceptance

- Blocks that previously fell back to `html-content` are, when appropriate, upgraded to typed sections.
- LLM calls are bounded (cap + timeout) and skipped when the toggle is off.
- Import Report clearly marks LLM-rescued blocks with type + confidence.
- No regressions to Phases 1–3 when the gateway is unreachable — pipeline degrades to rule-based only.
