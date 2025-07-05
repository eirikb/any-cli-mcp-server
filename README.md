# any-cli-mcp-server

Turn any CLI tool into an MCP server for Claude.

## Quick Start

```bash
# Use with GitHub CLI
npx any-cli-mcp-server gh

# Use with Azure CLI
npx any-cli-mcp-server az

# Use with Git
npx any-cli-mcp-server git
```

## Claude Desktop Setup

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github-cli": {
      "command": "npx",
      "args": ["any-cli-mcp-server", "gh"]
    },
    "azure-cli": {
      "command": "npx",
      "args": ["any-cli-mcp-server", "az"]
    },
    "git-from-cache": {
      "command": "npx",
      "args": ["any-cli-mcp-server", "git_cache.json"]
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
