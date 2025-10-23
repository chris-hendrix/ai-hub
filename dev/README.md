# Dev Plugin

A comprehensive Claude Code plugin that provides Git and GitHub workflow automation commands. Streamline your development process with intelligent commit management, PR creation, issue tracking, and branch workflows.

## Features

- **Git Workflows**: Automated commit and push operations
- **GitHub Integration**: Complete issue and PR management
- **Smart Branch Management**: Issue-linked branch creation
- **Template Support**: Consistent PR and issue formatting
- **Interactive Workflows**: Step-by-step guidance for complex operations

## Installation

### From GitHub Repository

```bash
/plugin install github:chris-hendrix/ai-hub#dev
```

### From Local Clone

If you've cloned this repository locally:

```bash
/plugin marketplace add /path/to/your/ai-hub
/plugin install dev@ai-hub-dev
```

## Available Commands

### Git Commands

#### `/git:commit [push]`

Stage changes and create a commit, with optional push to remote.

**Arguments:**
- No argument: Stage and commit only
- `push`: Stage, commit, and push to remote

**Features:**
- Prevents commits on main/master branches
- Analyzes git history to match commit message style
- Ensures proper formatting with HEREDOC
- Excludes files with secrets

**Example:**
```bash
/git:commit push
```

---

### GitHub Commands

#### `/github:create-issue "description"`

Create a GitHub issue with a well-formatted title and description based on the issue template.

**Arguments:**
- `description`: Brief description of the issue (required)

**Features:**
- Uses issue template for consistent formatting
- Auto-detects issue type (bug, enhancement, task, documentation)
- Preview before creating
- Automatic label application

**Example:**
```bash
/github:create-issue "Add dark mode toggle to settings"
```

---

#### `/github:create-pr [draft|publish]`

Automate the workflow to push changes and create a pull request.

**Arguments:**
- `draft` (default): Creates a draft PR
- `publish`: Creates a published/ready-for-review PR

**Features:**
- Creates branch from main if needed
- Stages, commits, and pushes changes automatically
- Uses PR template for consistent formatting
- Auto-generates branch names from changes

**Example:**
```bash
/github:create-pr publish
```

---

#### `/github:update-pr [draft|publish]`

Update the PR for the current branch and optionally change draft status.

**Arguments:**
- No argument: Push changes only
- `draft`: Mark PR as draft
- `publish`: Mark PR as ready for review

**Features:**
- Automatically finds PR for current branch
- Pushes latest changes
- Toggles draft/ready status

**Example:**
```bash
/github:update-pr publish
```

---

#### `/github:list-issues [open|closed|all]`

List GitHub issues in the repository with optional filters.

**Arguments:**
- No argument: Lists open issues (default)
- `open`: Lists open issues
- `closed`: Lists closed issues
- `all`: Lists all issues

**Features:**
- Shows 30 most recent issues
- Sorted by creation date (newest first)
- Clean format: `#123: Issue title`

**Example:**
```bash
/github:list-issues open
```

---

#### `/github:checkout-issue [issue-number]`

Create and checkout a branch linked to a GitHub issue.

**Arguments:**
- `issue-number` (optional): Issue number to create branch for

**Features:**
- Auto-assigns issue to you
- Creates branch from current branch
- Auto-generated branch names: `username/123-short-description`
- Stashes/pops changes automatically
- Interactive issue selection if no number provided

**Example:**
```bash
/github:checkout-issue 42
```

---

#### `/github:plan-issue [issue-number]`

Create an implementation plan for a GitHub issue.

**Arguments:**
- `issue-number` (optional): Issue number to plan for

**Features:**
- Auto-detects issue from branch name
- Breaks down work into logical steps
- Identifies files to modify
- Notes dependencies and challenges
- Interactive planning session

**Example:**
```bash
/github:plan-issue
```

---

#### `/github:merge-pr [pr-number]`

Squash and merge a pull request after confirmation.

**Arguments:**
- `pr-number` (optional): PR number to merge

**Features:**
- Auto-detects PR from current branch
- Requires confirmation before merging
- Squash merge by default
- Deletes branch after merge

**Example:**
```bash
/github:merge-pr
```

---

### Hello Command

#### `/hello [language]`

Verification command to test plugin installation.

**Arguments:**
- `language` (optional): Language for greeting

**Example:**
```bash
/hello spanish
```

---

## Templates

The plugin includes two templates for consistent formatting:

### Issue Template

Located at `templates/issue_template.md`, includes:
- Description section
- Details (for bugs or features)
- Acceptance criteria checklist
- Additional context

### PR Template

Located at `templates/pr_template.md`, includes:
- Description with optional issue links
- Changes list (circle bullet format)

Commands automatically use these templates via `${CLAUDE_PLUGIN_ROOT}/templates/`.

## Workflow Examples

### Starting Work on a New Issue

```bash
# 1. List open issues
/github:list-issues

# 2. Checkout issue and create branch
/github:checkout-issue 42

# 3. Plan the implementation
/github:plan-issue

# 4. Make your changes, then create PR
/github:create-pr draft

# 5. Update PR as you work
/github:update-pr

# 6. Publish when ready
/github:update-pr publish

# 7. Merge when approved
/github:merge-pr
```

### Quick Fix Workflow

```bash
# 1. Create issue
/github:create-issue "Fix broken link in footer"

# 2. Checkout and fix
/github:checkout-issue

# 3. Create and publish PR
/github:create-pr publish

# 4. Merge
/github:merge-pr
```

## Requirements

- Claude Code v2.0+
- Git installed and configured
- GitHub CLI (`gh`) installed and authenticated
- GitHub repository with issues and PRs enabled

## Plugin Structure

```
dev/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── commands/
│   ├── git/
│   │   └── commit.md        # Git commit command
│   ├── github/
│   │   ├── checkout-issue.md
│   │   ├── create-issue.md
│   │   ├── create-pr.md
│   │   ├── list-issues.md
│   │   ├── merge-pr.md
│   │   ├── plan-issue.md
│   │   └── update-pr.md
│   └── hello.md             # Test command
├── templates/
│   ├── issue_template.md    # Issue template
│   └── pr_template.md       # PR template
└── README.md                # This file
```

## Configuration

The plugin works out of the box with no additional configuration required. Commands use standard Git and GitHub CLI settings from your environment.

### Optional: Permissions

If you want to pre-approve certain commands, add to your `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(gh *)"
    ]
  }
}
```

## Contributing

To contribute improvements or report issues:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Author

chris-hendrix
https://github.com/chris-hendrix

## Version History

### 1.0.0 (2025-01-21)
- Initial release
- Git commit and push workflows
- Complete GitHub issue and PR management
- Issue-linked branch creation
- Template support for consistent formatting
- Interactive planning and execution
