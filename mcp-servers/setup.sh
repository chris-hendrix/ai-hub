#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Setting up MCP Servers ===${NC}\n"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if secrets.env exists
if [ ! -f "$SCRIPT_DIR/secrets.env" ]; then
    echo -e "${RED}Error: secrets.env not found${NC}"
    echo "Please copy secrets.env.example to secrets.env and fill in your values"
    exit 1
fi

# Load secrets
source "$SCRIPT_DIR/secrets.env"

# Graphite MCP Server Setup
echo -e "${YELLOW}Setting up Graphite MCP Server...${NC}"

# Build Docker image
echo "Building Docker image..."
cd "$SCRIPT_DIR/graphite"
docker build -t graphite-mcp:local .

# Import complete catalog
echo "Importing AI Hub catalog..."
docker mcp catalog rm ai-hub 2>/dev/null || true
docker mcp catalog import "$SCRIPT_DIR/ai-hub-catalog.yaml"

# Set secrets
echo "Setting authentication token..."
echo "$GRAPHITE_AUTH_TOKEN" | docker mcp secret set graphite.auth_token

# Configure repository paths
echo "Configuring repository paths..."
# TODO: Customize these paths for your repositories
docker mcp config write "graphite:
  paths:
    - $HOME/git"

# Enable the server
echo "Enabling Graphite server..."
docker mcp server enable graphite

echo -e "\n${GREEN}✓ Graphite MCP Server setup complete!${NC}\n"

# Show enabled servers
echo -e "${YELLOW}Currently enabled MCP servers:${NC}"
docker mcp server ls

echo -e "\n${GREEN}Setup complete!${NC}"
echo "You can now use Graphite commands through MCP-enabled AI agents."
