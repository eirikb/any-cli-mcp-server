# any-cli-mcp-server

[![npm version](https://badge.fury.io/js/any-cli-mcp-server.svg)](https://badge.fury.io/js/any-cli-mcp-server)
[![Release](https://github.com/eirikb/any-cli-mcp-server/actions/workflows/release.yml/badge.svg)](https://github.com/eirikb/any-cli-mcp-server/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

Turn any CLI tool into an MCP server.

Uses the `--help` to build MCP tools.

Works with any CLI tool that has `--help` output.

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
      "args": ["-y", "any-cli-mcp-server", "gh"]
    },
    "azure-cli": {
      "command": "npx",
      "args": ["-y", "any-cli-mcp-server", "az"]
    },
    "git-from-cache": {
      "command": "npx",
      "args": ["-y", "any-cli-mcp-server", "git_cache.json"]
    }
  }
}
```

## Faster Startup (Optional, but very recommended)

Build a cache first for better performance:

```bash
# Build cache
npx any-cli-mcp-server --cache-build gh

# Use cache
npx any-cli-mcp-server gh_cache.json
```
