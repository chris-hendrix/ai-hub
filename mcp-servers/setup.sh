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

# Re-enable default Docker MCP catalog servers
echo -e "${YELLOW}Enabling default Docker MCP catalog servers...${NC}"

# Servers that don't require OAuth
BASIC_SERVERS=("database-server" "playwright")

# Servers that require OAuth authorization
OAUTH_SERVERS=("linear" "sentry-remote")

# Enable basic servers
for server in "${BASIC_SERVERS[@]}"; do
    echo "Enabling ${server}..."
    docker mcp server enable "${server}" 2>/dev/null || true
done

# Enable OAuth servers and authorize if needed
for server in "${OAUTH_SERVERS[@]}"; do
    echo "Enabling ${server}..."
    docker mcp server enable "${server}" 2>/dev/null || true

    # Check OAuth status and authorize if needed
    if docker mcp oauth ls | grep "^${server}" | grep -q "not authorized"; then
        echo "  Authorizing ${server} (this will open a browser)..."
        docker mcp oauth authorize "${server}" 2>/dev/null || echo "  ${server} OAuth failed"
    else
        echo "  ${server} already authorized, skipping..."
    fi
done

# Show enabled servers
echo -e "\n${YELLOW}Currently enabled MCP servers:${NC}"
docker mcp server ls

echo -e "\n${GREEN}Setup complete!${NC}"
echo "You can now use all MCP servers through AI agents."
