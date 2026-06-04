# Researching Codebase

Methodology for investigating and documenting codebases.

## Philosophy

- **Document, don't evaluate** - Describe what exists without suggesting improvements
- **Be precise** - Always include `file:line` references for claims
- **Read thoroughly** - Don't skim; understand before explaining
- **Ground observations** - Every claim should trace to actual code

## Research Types

| Type | Purpose | Focus |
|------|---------|-------|
| **Locating** | Find where code lives | File paths, directory structure |
| **Analyzing** | Understand how code works | Data flow, logic, architecture |
| **Pattern-finding** | Find examples to model after | Similar implementations, conventions |

Choose the appropriate type based on what's needed. They can be combined.

## Locating

Find files without analyzing contents:
- Search by keywords, naming patterns, directory conventions
- Group findings by purpose (implementation, tests, config, types)
- Note directory clusters and naming patterns

## Analyzing

Trace how code actually works:
- Start from entry points, follow the code path
- Map data flow and transformations
- Identify architectural patterns and integration points
- Document error handling and configuration

## Pattern-Finding

Find existing implementations to reference:
- Search for similar features or structures
- Extract concrete code examples with context
- Show multiple variations when they exist
- Include test patterns

## Output Structure

Structure findings by purpose. Common sections:

| Section | Content |
|---------|---------|
| Overview | 2-3 sentence summary |
| File Locations | Paths grouped by type (impl, tests, config) |
| Implementation | Key functions with `file:line` refs |
| Data Flow | How data moves through the system |
| Patterns | Code examples with context |
| Configuration | Config files, env vars, feature flags |

Include sections relevant to the research type. Always include `file:line` references.
