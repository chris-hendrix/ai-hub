# AI Hub MCP Servers

Custom MCP servers for use with Docker MCP Gateway, enabling AI agents to access specialized tools and workflows.

## Overview

This directory contains containerized MCP servers that can be used with AI agents through Docker Desktop's MCP Gateway. Currently includes:

- **Graphite CLI** - Manage stacked pull requests and GitHub workflows

## Quick Start

### Prerequisites

- Docker Desktop with MCP Toolkit enabled
- Git repositories you want to work with

### Installation

1. **Copy secrets template:**
   ```bash
   cp secrets.env.example secrets.env
   ```

2. **Add your secrets to `secrets.env`:**
   ```bash
   # Edit secrets.env and add your tokens
   GRAPHITE_AUTH_TOKEN=your_token_here
   ```

3. **Run the setup script:**
   ```bash
   ./setup.sh
   ```

The script will:
- Build Docker images for each MCP server
- Import the AI Hub catalog into Docker MCP
- Configure secrets securely
- Configure repository access paths
- Enable all servers

### Verify Installation

```bash
# Check enabled servers
docker mcp server ls

# View catalog
docker mcp catalog show ai-hub

# Test gateway
docker mcp gateway run --dry-run

# List available tools
docker mcp tools ls
```

## Available Servers

### Graphite CLI

Enables AI agents to automatically create stacked pull requests and manage GitHub workflows.

**Tools:**
- `run_gt_cmd` - Execute any Graphite command (create, submit, sync, etc.)
- `learn_gt` - Learn about stacking PRs with Graphite

**Authentication:**
Get your token from https://app.graphite.dev/settings/cli

**Repository Access:**
Configure paths in `setup.sh` (default: `$HOME/git`)

## Configuration

### Repository Paths

Edit `setup.sh` to customize which repositories AI agents can access:

```bash
docker mcp config write "graphite:
  paths:
    - /Users/yourusername/git/repo1
    - /Users/yourusername/git/repo2"
```

### Secrets Management

Secrets are stored using Docker Desktop's secure secret storage. To update:

```bash
docker mcp secret set graphite.auth_token
```

## Usage with AI Agents

### Claude Code

Configure your MCP client to connect to Docker MCP Gateway. The gateway exposes all enabled servers and their tools to AI agents.

Once configured, AI agents can:
- Automatically break down large changes into reviewable stacked PRs
- Submit entire PR stacks to GitHub
- Manage PR dependencies and relationships
- Sync and rebase stacks efficiently

## Adding New Servers

1. **Create server directory:**
   ```bash
   mkdir mcp-servers/your-server
   ```

2. **Add Dockerfile:**
   ```bash
   # Build your MCP server image
   ```

3. **Update `ai-hub-catalog.yaml`:**
   ```yaml
   your-server:
     description: Your server description
     title: Your Server
     type: server
     image: your-server:local
     tools:
       - name: your_tool
   ```

4. **Update `setup.sh`:**
   Add build and configuration steps for your new server.

5. **Add secrets to `secrets.env` if needed**

6. **Run setup script:**
   ```bash
   ./setup.sh
   ```

## File Structure

```
mcp-servers/
├── README.md                    # This file
├── .gitignore                   # Excludes secrets.env
├── secrets.env                  # Your secrets (untracked)
├── secrets.env.example          # Template for secrets
├── setup.sh                     # Installation script
├── ai-hub-catalog.yaml          # MCP server catalog definition
└── graphite/
    └── Dockerfile               # Graphite MCP server image
```

## Troubleshooting

### Tools not appearing

```bash
# Re-import catalog
docker mcp catalog rm ai-hub
docker mcp catalog import ./ai-hub-catalog.yaml
docker mcp server enable graphite

# Test gateway
docker mcp gateway run --dry-run
```

### Secret not found

```bash
# Reset secret
echo "your_token" | docker mcp secret set graphite.auth_token
```

### Container fails to start

```bash
# Check container logs
docker logs $(docker ps -a | grep graphite-mcp | awk '{print $1}')

# Rebuild image
cd graphite
docker build -t graphite-mcp:local .
```

## Resources

- [Docker MCP Gateway Documentation](https://docs.docker.com/ai/mcp-gateway/)
- [Graphite CLI Documentation](https://graphite.dev/docs)
- [GT MCP Documentation](https://graphite.dev/docs/gt-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

See individual server directories for licensing information.
