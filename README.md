# any-cli-mcp-server

Turn any CLI tool into an MCP server.

Uses the `--help` to build MCP tools.

## Quick Start

```bash
# Use with GitHub CLI
npx any-cli-mcp-server gh

# Use with Azure CLI
npx any-cli-mcp-server az

# Use with Git
npx any-cli-mcp-server git
```

## Setup

```json
{
  "mcpServers": {
    "github-cli": {
      "command": "npx",
      "args": [
        "-y",
        "any-cli-mcp-server",
        "gh"
      ]
    },
    "azure-cli": {
      "command": "npx",
      "args": [
        "-y",
        "any-cli-mcp-server",
        "az"
      ]
    },
    "git-from-cache": {
      "command": "npx",
      "args": [
        "-y",
        "any-cli-mcp-server",
        "git_cache.json"
      ]
    }
  }
}
```

## Faster Startup (Optional)

Build a cache first for better performance:

```bash
# Build cache
npx any-cli-mcp-server --cache-build gh

# Use cache
npx any-cli-mcp-server gh_cache.json
```

Works with any CLI tool that has `--help` output.
