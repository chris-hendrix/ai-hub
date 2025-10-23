# AI Hub

A centralized repository for AI development tooling and configurations.

## Purpose

This repository serves as a hub for:

- **Claude Code Plugins**: Reusable workflow automation plugins for Git and GitHub operations
- **Shared Claude Code Configurations**: Reusable `.claude` folder contents (commands, prompts, hooks) that can be used across multiple projects
- **MCP Server Management**: Centralized Model Context Protocol (MCP) server configurations using [Docker MCP Toolkit](https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/)

## Getting Started

### Install the Dev Plugin

The Dev plugin provides comprehensive Git and GitHub workflow automation commands.

**From GitHub:**
```bash
/plugin install github:chris-hendrix/ai-hub#dev
```

**From Local Clone:**
```bash
# If you've cloned this repository
/plugin marketplace add /path/to/your/ai-hub
/plugin install dev@ai-hub-dev
```

See the [dev README](./dev/README.md) for detailed documentation on all available commands.

### Quick Start

After installing the plugin, try these commands:

```bash
# List open GitHub issues
/github:list-issues

# Create a branch for an issue
/github:checkout-issue 42

# Plan implementation
/github:plan-issue

# Commit and push changes
/git:commit push

# Create a pull request
/github:create-pr draft
```

## Structure

```
ai-hub/
├── .claude-plugin/        # Marketplace configuration
│   └── marketplace.json   # Local marketplace definition
├── dev/                   # Claude Code plugin for Git/GitHub workflows
│   ├── .claude-plugin/    # Plugin metadata
│   ├── commands/          # Slash commands
│   ├── templates/         # Issue and PR templates
│   └── README.md          # Plugin documentation
├── .claude/               # Local Claude Code configurations
│   └── settings.local.json
└── mcp/                   # MCP server configurations (planned)
```

## Features

### Dev Plugin

The plugin includes these commands:

**Git Commands:**
- `/git:commit [push]` - Stage and commit changes with optional push

**GitHub Commands:**
- `/github:create-issue` - Create issues with template
- `/github:list-issues` - List open/closed issues
- `/github:checkout-issue` - Create branch linked to issue
- `/github:plan-issue` - Plan implementation for issue
- `/github:create-pr` - Create pull request with template
- `/github:update-pr` - Update PR and change draft status
- `/github:merge-pr` - Squash and merge PR

See [dev/README.md](./dev/README.md) for complete documentation.

## License

[Add your license here]
