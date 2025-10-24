# Dev Plugin

Claude Code plugin for Git and GitHub workflow automation. Streamlines commit management, PR creation, issue tracking, and branch workflows.

## Installation

**From GitHub:**
```bash
/plugin install github:chris-hendrix/ai-hub#dev
```

**From Local:**
```bash
/plugin marketplace add /path/to/your/ai-hub
/plugin install dev@ai-hub-dev
```

## Commands

### Git Workflows

#### `/dev:git:commit [push]`
Stage and commit changes, optionally push to remote.
- Prevents commits on main/master
- Matches repository commit style
- Excludes secrets

```bash
/dev:git:commit push
```

#### `/dev:git:checkout-new [branch-name]`
Create and checkout a new branch with auto-generated or custom name.
- Generates names from changes: `username/short-description`
- Confirms before creating

```bash
/dev:git:checkout-new
```

#### `/dev:git:checkout-default`
Checkout default branch and pull latest changes.
- Stashes uncommitted changes
- Returns to main/master

```bash
/dev:git:checkout-default
```

#### `/dev:git:squash`
Squash all commits on current branch into one.
- Prevents squashing on main/master
- Auto-generates consolidated commit message
- Optionally force pushes

```bash
/dev:git:squash
```

#### `/dev:git:squash-amend`
Squash all commits and amend with current changes.
- Runs squash first
- Amends with uncommitted changes
- Regenerates commit message from full diff

```bash
/dev:git:squash-amend
```

---

### GitHub Issues

#### `/dev:github:issue:create "description"`
Create issue with template formatting.
- Auto-detects type (bug/enhancement/task)
- Preview before creating
- Applies labels automatically

```bash
/dev:github:issue:create "Add dark mode"
```

#### `/dev:github:issue:list [open|closed|all]`
List issues (default: open, 30 most recent).

```bash
/dev:github:issue:list
```

#### `/dev:github:issue:checkout [issue-number]`
Create branch linked to issue.
- Auto-assigns issue
- Names: `username/123-description`
- Stashes changes automatically

```bash
/dev:github:issue:checkout 42
```

#### `/dev:github:issue:plan [issue-number]`
Create implementation plan for issue.
- Auto-detects from branch
- Breaks down work
- Interactive planning

```bash
/dev:github:issue:plan
```

---

### GitHub Pull Requests

#### `/dev:github:pr:create [draft|publish]`
Create PR with template (default: draft).
- Creates branch from main if needed
- Stages, commits, and pushes
- Uses PR template

```bash
/dev:github:pr:create publish
```

#### `/dev:github:pr:update [draft|publish]`
Update PR and change draft status.
- Finds PR for current branch
- Pushes changes
- Toggles draft/ready

```bash
/dev:github:pr:update publish
```

#### `/dev:github:pr:merge [pr-number]`
Squash and merge PR after confirmation.
- Auto-detects from branch
- Requires confirmation
- Deletes branch after merge

```bash
/dev:github:pr:merge
```

---

## Workflow Examples

### Full Issue Workflow
```bash
/dev:github:issue:list                  # List open issues
/dev:github:issue:checkout 42           # Create branch for issue
/dev:github:issue:plan                  # Plan implementation
# Make changes...
/dev:github:pr:create draft             # Create draft PR
/dev:github:pr:update publish           # Publish when ready
/dev:github:pr:merge                    # Merge when approved
```

### Quick Fix
```bash
/dev:github:issue:create "Fix bug"      # Create issue
/dev:github:issue:checkout              # Create branch
# Make changes...
/dev:github:pr:create publish           # Create and publish PR
/dev:github:pr:merge                    # Merge
```

## MCP Integration

This plugin includes the Playwright MCP server for AI-powered browser automation.

### Playwright MCP

Enables Claude Code to interact with web pages using structured accessibility snapshots instead of screenshots.

**Features:**
- Lightweight, vision-model-independent web automation
- Browser automation via accessibility tree
- Support for Chrome, Firefox, WebKit, Edge
- Deterministic, LLM-friendly page analysis

**Requirements:**
- Node.js 18 or newer

**Configuration:** The `.mcp.json` file at the plugin root automatically configures the Playwright MCP server when the plugin is active.

**Resources:**
- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp)
- [Claude Code MCP Guide](https://docs.claude.com/en/docs/claude-code/mcp)

---

## Requirements

- Claude Code v2.0+
- Git and GitHub CLI (`gh`) authenticated
- GitHub repository with issues/PRs enabled
- Node.js 18+ (for Playwright MCP)

## Templates

**Issue Template** (`templates/issue_template.md`):
- Description, details, acceptance criteria

**PR Template** (`templates/pr_template.md`):
- Description with issue links, changes list

## Structure

```
dev/
├── .claude-plugin/plugin.json
├── .mcp.json
├── commands/
│   ├── git/
│   │   ├── checkout-default.md
│   │   ├── checkout-new.md
│   │   ├── commit.md
│   │   ├── squash.md
│   │   └── squash-amend.md
│   ├── github/
│   │   ├── issue/
│   │   │   ├── checkout.md
│   │   │   ├── create.md
│   │   │   ├── list.md
│   │   │   └── plan.md
│   │   └── pr/
│   │       ├── create.md
│   │       ├── merge.md
│   │       └── update.md
│   └── hello.md
└── templates/
    ├── issue_template.md
    └── pr_template.md
```

## License

MIT
