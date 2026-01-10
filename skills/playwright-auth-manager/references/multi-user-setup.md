# Multi-User Setup Guide

## Overview

Configure multiple Playwright MCP Server instances to support different user accounts. Each instance uses a separate authentication file, allowing seamless switching between users.

## Configuration Pattern

```json
{
  "mcpServers": {
    "playwright-<user-id>": {
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
    "playwright-admin": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=${HOME}/.playwright-auth/admin-auth.json"
      ]
    },
    "playwright-user": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=${HOME}/.playwright-auth/user-auth.json"
      ]
    },
    "playwright-guest": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=${HOME}/.playwright-auth/guest-auth.json"
      ]
    }
  }
}
```

## Tool Naming Convention

When multiple instances are configured, MCP tools are prefixed with the server name:

- `mcp__playwright-admin__browser_navigate` - Admin instance
- `mcp__playwright-user__browser_navigate` - User instance
- `mcp__playwright-guest__browser_navigate` - Guest instance

## Switching Users

To switch between users, simply use the appropriate MCP server instance:

```javascript
// Use admin credentials
await mcp__playwright-admin__browser_navigate({ url: "https://app.example.com" });

// Switch to regular user
await mcp__playwright-user__browser_navigate({ url: "https://app.example.com" });
```

## Recommended Directory Structure

```
project/
├── .playwright-auth/          # Auth files (add to .gitignore)
│   ├── admin-auth.json
│   ├── user-auth.json
│   └── guest-auth.json
└── .gitignore
```

Or use a centralized location:

```
~/.playwright-auth/            # Shared across projects
├── project1-admin.json
├── project1-user.json
├── project2-admin.json
└── project2-user.json
```

## Benefits

- **Isolation**: Each user has a completely separate browser context
- **Reliability**: No runtime state management required
- **Simplicity**: Configuration-based, no custom code needed
- **Scalability**: Support unlimited users by adding more instances

## Considerations

- **Resource usage**: Each instance runs a separate browser process
- **Explicit switching**: Must specify which server to use for each operation
- **Client support**: Requires MCP client that supports multiple server instances (most do)

## Alternative: Single Instance with Dynamic Switching

For use cases with many users or resource constraints, see the `browser_run_code` approach in usage-guide.md.
