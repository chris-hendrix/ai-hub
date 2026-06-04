# Researching Web

Methodology for conducting effective web research and synthesizing findings.

## Philosophy

- **Accuracy first** - Verify claims across multiple sources before presenting
- **Always cite** - Every finding must link back to its source
- **Source hierarchy** - Official docs > reputable technical sources > community content
- **Currency awareness** - Note publication dates; flag potentially outdated information
- **Multi-angle coverage** - Explore topics from multiple search angles for completeness

## Critical: Check Current Versions

**LLM knowledge is often outdated.** When researching libraries, frameworks, or tools:

1. **Always search for current version** - Add "2025" or "latest" to queries
2. **Check official docs first** - `site:docs.{library}.com` or `site:{library}.dev`
3. **Look for migration guides** - New versions often have different patterns
4. **Verify best practices** - What was recommended 2 years ago may be deprecated

**Examples of outdated patterns:**
- React: Class components → Hooks → Server Components
- ESLint: `.eslintrc` → Flat config (`eslint.config.js`)
- Node.js: CommonJS (`require`) → ESM (`import`)
- Next.js: Pages Router → App Router

Always include version information in findings and note when patterns have changed.

## Research Types

| Type | Purpose | Tools |
|------|---------|-------|
| **Searching** | Find relevant sources | WebSearch |
| **Synthesizing** | Extract and organize findings | WebFetch |

Choose the appropriate type based on what's needed. They are typically combined: search first, then synthesize from the best results.

## Workflow Overview

1. **Query Analysis** - Deconstruct request, identify key terms, plan multiple search angles
2. **Strategic Searches** - Broad to specific, use site-specific targeting, vary query phrasing
3. **Content Retrieval** - Fetch most promising results, prioritize authoritative sources
4. **Synthesis** - Organize by relevance, cite sources, highlight conflicts, note gaps

## Output Structure

Structure findings by purpose:

| Section | Content |
|---------|---------|
| Summary | 2-3 sentence key takeaways |
| Detailed Findings | Topic sections with source attribution |
| Sources | Links with descriptions |
| Gaps/Limitations | Unresolved questions, outdated info |

Always include source links. Flag conflicting information explicitly.

---

## Query-Type Strategies

Specialized search strategies for common research scenarios.

### API/Library Documentation

**Goal**: Find accurate, version-specific technical details.

**Search Approach:**
1. Start with official docs: `site:docs.{product}.com {feature}`
2. Find changelogs/release notes for version details
3. Locate official code examples from repositories

**Source Priorities:**
1. Official documentation
2. Official GitHub repos/examples
3. API reference pages
4. Official blog posts

**Watch For:**
- Version mismatches (docs may be for different version)
- Deprecated features still appearing in search results
- Beta/experimental features marked as such

### Best Practices Research

**Goal**: Find consensus on recommended approaches.

**Search Approach:**
1. Search for best practices: `{topic} best practices 2025`
2. Search anti-patterns: `{topic} anti-patterns` or `{topic} mistakes to avoid`
3. Cross-reference multiple sources to identify consensus

**Source Priorities:**
1. Official style guides/recommendations
2. Well-known tech blogs (ThoughtWorks, Martin Fowler, etc.)
3. Conference talks/presentations
4. Community consensus (multiple agreeing sources)

**Watch For:**
- Outdated recommendations (tech evolves quickly)
- Context-specific advice presented as universal
- Opinions vs. evidence-based practices

### Technical Solutions

**Goal**: Solve specific problems, debug errors.

**Search Approach:**
1. Use exact error messages in quotes: `"error message here"`
2. Include technology stack: `{error} React TypeScript`
3. Search GitHub issues: `site:github.com {repo} {error}`

**Source Priorities:**
1. GitHub issues (especially closed/resolved)
2. Stack Overflow (high-vote answers)
3. Official troubleshooting guides
4. Technical blog posts with solutions

**Watch For:**
- Solutions that worked for specific versions
- Workarounds vs. proper fixes
- Security implications of suggested solutions

### Comparative Analysis

**Goal**: Compare options, evaluate trade-offs.

**Search Approach:**
1. Direct comparisons: `X vs Y`
2. Migration guides: `migrate from X to Y`
3. Benchmarks: `X Y benchmark performance`

**Source Priorities:**
1. Official migration guides
2. Benchmark studies with methodology
3. Comparison articles from neutral sources
4. Community discussions with real-world experience

**Watch For:**
- Bias (author may prefer one option)
- Outdated comparisons (features change)
- Context mismatch (enterprise vs. startup needs differ)
- Cherry-picked benchmarks

---

## Searching the Web

### Output Format

When conducting web research, return ranked URLs as a numbered list:

```
1. [Title](URL)
   Snippet describing the content...

2. [Title](URL)
   Snippet describing the content...
```

Return top 5-8 most relevant results after deduplication and ranking by relevance and source authority.

### Query Analysis

Before searching, deconstruct the user's request:

1. **Identify core concepts** - What are the key technical terms?
2. **Determine source types** - What kind of sources will have this information?
   - Official documentation
   - Technical blogs/articles
   - Q&A sites (Stack Overflow)
   - GitHub issues/discussions
3. **Plan multiple angles** - How else might this topic be described?
   - Alternative terminology
   - Related concepts
   - Broader/narrower scope

### Strategic Searches

**Search Progression:**
1. **Broad first** - Understand the landscape
2. **Refine** - Add specificity based on initial results
3. **Target** - Use site-specific queries for authoritative sources

**Search Operators:**

| Operator | Purpose | Example |
|----------|---------|---------|
| `"exact phrase"` | Match exact text | `"webhook signature verification"` |
| `site:domain` | Limit to domain | `site:docs.stripe.com` |
| `-term` | Exclude term | `webhook -discord` |
| `filetype:ext` | File type | `filetype:pdf security guide` |

**Site-Specific Targeting:**

| Source Type | Pattern |
|-------------|---------|
| Official docs | `site:docs.{product}.com` |
| GitHub repos | `site:github.com {repo} {topic}` |
| Stack Overflow | `site:stackoverflow.com {topic}` |
| API references | `site:api.{product}.com` or `{product} API reference` |

### Search Efficiency

- Start with 2-3 well-crafted searches before fetching pages
- Review search result snippets to identify most promising links
- If initial searches miss the mark, refine based on terminology found
- Fetch only the most promising 3-5 pages initially

---

## Synthesizing Web Pages

### Prioritizing Sources

From search results, prioritize pages to fetch:

| Priority | Source Type | Rationale |
|----------|-------------|-----------|
| 1 | Official documentation | Authoritative, accurate |
| 2 | Official blogs/announcements | Context, rationale |
| 3 | Reputable tech publications | Quality explanations |
| 4 | Stack Overflow (high votes) | Practical solutions |
| 5 | Community blogs | Varied perspectives |
| 6 | Forums/discussions | Edge cases, gotchas |

### Extraction Focus

When reading fetched content, extract:

1. **Direct answers** - Exactly what the user asked
2. **Code examples** - Working implementations
3. **Caveats/warnings** - Known issues, limitations
4. **Version information** - What version this applies to
5. **Publication date** - When was this written?

### Synthesis

**Organizing Findings** — structure by:
1. **Relevance** - Most directly answering the question first
2. **Authority** - Official sources weighted higher
3. **Recency** - Recent information for evolving topics
4. **Consensus** - Where multiple sources agree

**Citation Format:**

```
According to [Stripe's webhook documentation](https://docs.stripe.com/webhooks):
> "You should verify webhook signatures to ensure..."
```

**Handling Conflicts** — when sources disagree:
1. Identify the conflict
2. Consider authority (official docs usually win)
3. Check dates (newer may supersede older)
4. Present both when conflict is unresolved

### Synthesis Template

```markdown
## Summary
[2-3 sentence overview of key findings]

## Findings

### [Topic 1]
[Information with source attribution]

### [Topic 2]
[Information with source attribution]

## Sources
- [Source Name](url) - Description of what this source covers

## Gaps/Limitations
- [What could not be definitively answered]
```
