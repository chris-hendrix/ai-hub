# Researching Web

Verify claims across sources; always cite.

## Philosophy

- **Accuracy first** — cross-check across sources before presenting.
- **Always cite** — every finding links to its source.
- **Official docs > reputable sources > community.**
- **Currency matters** — note dates; flag outdated info.
- **Multi-angle** — search from several phrasings for completeness.

## LLM knowledge is often outdated

When researching libraries/frameworks/tools, always verify the current version:

1. Add "2025" or "latest" to queries; check `site:docs.{library}.com`.
2. Look for migration guides and changelogs — new versions often change patterns.
3. Note when a pattern has changed (e.g. React class→hooks→server components).

Include version info in findings.

## Types

| Type | Tools |
|------|-------|
| **Searching** | `web_search` |
| **Synthesizing** | `fetch_content` / `get_search_content` |

Search first, then fetch the 3–5 most promising results. Start with 2–3 well-crafted queries before fetching; refine based on what you learn.

## Output structure

| Section | Content |
|---------|---------|
| Summary | 2–3 sentence takeaways |
| Findings | Topic sections with source attribution |
| Sources | Links + what each covers |
| Gaps | Unresolved questions, outdated info |

Always include source links; flag conflicts explicitly.

## Prioritizing sources

1. Official docs / official repos
2. Official blogs, changelogs
3. Reputable tech publications
4. Stack Overflow (high votes), GitHub issues (closed/resolved)
5. Community blogs, forums — for edge cases

## Synthesis

- **Structure by relevance**, then authority, then recency, then consensus.
- **Cite** as: `According to [Title](url): > "quote…"`
- **Conflicts:** identify it, prefer official/newer sources, present both if unresolved.
- **Extract:** direct answers, working code examples, caveats, version, publication date.

### Template

```markdown
## Summary
[2–3 sentences]

## Findings

### [Topic]
[info with sources]

## Sources
- [Name](url) - what it covers

## Gaps
- [what couldn't be answered]
```
