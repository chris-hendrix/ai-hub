---
description: List GitHub issues with optional filters
argument-hint: [open|closed|all]
allowed-tools: Bash(gh *)
---

# List Issues Command

List GitHub issues in the repository. By default shows open issues, most recent first.

The command accepts an optional argument:
- No argument: Lists open issues (default)
- `open`: Lists open issues
- `closed`: Lists closed issues
- `all`: Lists all issues

Follow these steps:
1. Determine the state filter:
   - If no argument: use `open`
   - If argument provided: use the provided state (`open`, `closed`, or `all`)
2. List issues using:
   ```
   gh issue list --state <state> --limit 30 --search "sort:created-desc"
   ```
3. Display only the issue number and title
   - Format: `#123: Issue title here`
   - Most recent issues first

Important notes:
- Default limit is 30 issues
- Sorted by creation date, most recent first (sort:created-desc)
- Only displays number and title for simplicity
- Useful for finding issue numbers to use with `/github:checkout-issue` or other commands
