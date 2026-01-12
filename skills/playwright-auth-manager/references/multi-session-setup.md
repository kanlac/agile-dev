# Multi-Session Setup Guide

## Overview

Configure multiple Playwright MCP Server instances to support different authentication sessions. Each instance uses a separate authentication file, allowing seamless switching between sessions. This is useful when you need to work with multiple accounts (e.g., different projects, personal vs work accounts, testing different user scenarios).

## Configuration Pattern

The MCP server naming convention follows: `playwright-{domain}-{user}`

For detailed configuration examples, see **[how-to-install-mcp.md](./how-to-install-mcp.md)**.

## Complete Example

```json
{
  "mcpServers": {
    "playwright-localhost3000-jack": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=./.playwright-auth/localhost3000-jack.json"
      ]
    },
    "playwright-localhost3000-alice": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=./.playwright-auth/localhost3000-alice.json"
      ]
    },
    "playwright-github-bob": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=./.playwright-auth/github-bob.json"
      ]
    }
  }
}
```

## Tool Naming Convention

When multiple instances are configured, MCP tools are prefixed with the server name:

- `mcp__playwright-localhost3000-jack__browser_navigate` - Jack's session on localhost:3000
- `mcp__playwright-localhost3000-alice__browser_navigate` - Alice's session on localhost:3000
- `mcp__playwright-github-bob__browser_navigate` - Bob's session on GitHub

## Switching Sessions

To switch between sessions, simply use the appropriate MCP server instance:

```javascript
// Use Jack's session on localhost:3000
await mcp__playwright-localhost3000-jack__browser_navigate({ url: "https://localhost:3000" });

// Switch to Alice's session on localhost:3000
await mcp__playwright-localhost3000-alice__browser_navigate({ url: "https://localhost:3000" });

// Use Bob's session on GitHub
await mcp__playwright-github-bob__browser_navigate({ url: "https://github.com" });
```

## Recommended Directory Structure

```
project/
├── .playwright-auth/          # Auth files (add to .gitignore)
│   ├── localhost3000-jack.json
│   ├── localhost3000-alice.json
│   └── github-bob.json
└── .gitignore
```

**Naming Convention**: `{domain}-{user}.json` where:
- `domain`: The target website/service (e.g., `localhost3000`, `github`, `xiaohongshu`)
- `user`: The account identifier (e.g., `jack`, `alice`, `bob`)

## Benefits

- **Isolation**: Each session has a completely separate browser context
- **Reliability**: No runtime state management required
- **Simplicity**: Configuration-based, no custom code needed
- **Scalability**: Support unlimited sessions by adding more instances

## Considerations

- **Resource usage**: Each instance runs a separate browser process
- **Explicit switching**: Must specify which server to use for each operation
- **Client support**: Requires MCP client that supports multiple server instances (most do)

## Alternative: Single Instance with Dynamic Switching

For use cases with many sessions or resource constraints, see the `browser_run_code` approach in usage-guide.md.
