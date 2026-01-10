# Multi-Session Setup Guide

## Overview

Configure multiple Playwright MCP Server instances to support different authentication sessions. Each instance uses a separate authentication file, allowing seamless switching between sessions. This is useful when you need to work with multiple accounts (e.g., different projects, personal vs work accounts, testing different user scenarios).

## Configuration Pattern

```json
{
  "mcpServers": {
    "playwright-<session-name>": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=<path-to-auth-file>"
      ]
    }
  }
}
```

## Complete Example

```json
{
  "mcpServers": {
    "playwright-work": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=${HOME}/.playwright-auth/work-auth.json"
      ]
    },
    "playwright-personal": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=${HOME}/.playwright-auth/personal-auth.json"
      ]
    },
    "playwright-project1": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=${HOME}/.playwright-auth/project1-auth.json"
      ]
    }
  }
}
```

## Tool Naming Convention

When multiple instances are configured, MCP tools are prefixed with the server name:

- `mcp__playwright-work__browser_navigate` - Work account session
- `mcp__playwright-personal__browser_navigate` - Personal account session
- `mcp__playwright-project1__browser_navigate` - Project1 account session

## Switching Sessions

To switch between sessions, simply use the appropriate MCP server instance:

```javascript
// Use work account
await mcp__playwright-work__browser_navigate({ url: "https://app.example.com" });

// Switch to personal account
await mcp__playwright-personal__browser_navigate({ url: "https://app.example.com" });
```

## Recommended Directory Structure

```
project/
├── .playwright-auth/          # Auth files (add to .gitignore)
│   ├── work-auth.json
│   ├── personal-auth.json
│   └── project1-auth.json
└── .gitignore
```

Or use a centralized location:

```
~/.playwright-auth/            # Shared across projects
├── projectA-session1.json
├── projectA-session2.json
├── projectB-session1.json
└── projectB-session2.json
```

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
