# AI Hub

A centralized repository for AI development tooling and configurations.

## Purpose

- **Claude Code Plugins**: Reusable workflow automation plugins for Git and GitHub operations
- **Shared Configurations**: Reusable `.claude` folder contents (commands, prompts, hooks)
- **MCP Server Management**: Centralized Model Context Protocol server configurations (planned)

## Installation

### Dev Plugin

**From GitHub:**
```bash
/plugin install github:chris-hendrix/ai-hub#dev
```

**From Local Clone:**
```bash
/plugin marketplace add /path/to/your/ai-hub
/plugin install dev@ai-hub-dev
```

See the [dev README](./dev/README.md) for detailed documentation.

## Quick Start

```bash
# List open issues
/dev:github:issue:list

# Create a branch for an issue
/dev:github:issue:checkout 42

# Commit and push changes
/dev:git:commit push

# Create a pull request
/dev:github:pr:create draft
```

## Structure

```
ai-hub/
├── .claude-plugin/        # Marketplace configuration
├── dev/                   # Dev plugin for Git/GitHub workflows
│   ├── .claude-plugin/    # Plugin metadata
│   ├── commands/
│   │   ├── git/          # Git workflow commands
│   │   └── github/       # GitHub commands
│   │       ├── issue/    # Issue management
│   │       └── pr/       # PR management
│   ├── templates/        # Issue and PR templates
│   └── README.md
└── mcp/                  # MCP configurations (planned)
```

## Available Commands

**Git Workflows:**
- `/dev:git:commit [push]` - Stage and commit changes
- `/dev:git:checkout-new [branch-name]` - Create new branch
- `/dev:git:checkout-default` - Return to default branch
- `/dev:git:squash` - Squash all commits into one
- `/dev:git:squash-amend` - Squash commits and amend with current changes

**GitHub Issues:**
- `/dev:github:issue:create` - Create issue with template
- `/dev:github:issue:list [open|closed|all]` - List issues
- `/dev:github:issue:checkout [issue-number]` - Create branch for issue
- `/dev:github:issue:plan [issue-number]` - Plan implementation

**GitHub PRs:**
- `/dev:github:pr:create [draft|publish]` - Create pull request
- `/dev:github:pr:update [draft|publish]` - Update PR status
- `/dev:github:pr:merge [pr-number]` - Squash and merge PR

See [dev/README.md](./dev/README.md) for complete documentation.

## License

MIT
