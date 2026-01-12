# Playwright MCP Usage Guide

**Purpose**: This guide covers local development and testing workflows using Playwright MCP authentication. All techniques described here are intended for local use only.

## Authentication State Files

Playwright MCP uses JSON files to store authentication state, containing:

- **Cookies**: Session cookies, authentication tokens
- **LocalStorage**: Client-side data including auth tokens
- **SessionStorage**: Temporary session data

### Storage State Format

```json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123...",
      "domain": ".example.com",
      "path": "/",
      "expires": 1234567890,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://example.com",
      "localStorage": [
        {
          "name": "auth_token",
          "value": "eyJhbGc..."
        }
      ]
    }
  ]
}
```

## MCP Configuration Options

For complete configuration instructions, see **[how-to-install-mcp.md](./how-to-install-mcp.md)**.

### Option 1: Isolated Context + Storage State (Recommended)

Clean browser environment with only authentication data loaded.

**Characteristics:**
- ✅ Small file size (5-50KB)
- ✅ Clean environment each session
- ✅ Easy to version control
- ✅ Fast startup
- ❌ No browser extensions
- ❌ No browsing history

### Option 2: Persistent User Data Directory

Complete browser profile with all data.

**Characteristics:**
- ✅ Complete browser experience
- ✅ Extensions supported
- ✅ History and bookmarks preserved
- ✅ Auto-saves all changes
- ❌ Large size (50-500MB)
- ❌ Not suitable for version control

### Option 3: Save Session

Automatically save authentication state after each session by adding `--save-session` flag to your MCP configuration.

## Common Workflows

### Initial Authentication Setup

1. Generate auth file using `save-auth-state.js` script
2. Add auth file path to MCP configuration
3. Restart MCP server to load authentication

### Checking Auth Status

```javascript
// Navigate to protected page
await browser_navigate({ url: "https://app.example.com/dashboard" });

// Take snapshot to verify logged-in state
const snapshot = await browser_snapshot();

// Look for user-specific elements
if (snapshot.includes("Sign In") || snapshot.includes("Log In")) {
  // Not authenticated - need to save auth state
} else {
  // Authenticated successfully
}
```

### Refreshing Expired Authentication

When authentication expires:

1. Run `save-auth-state.js` again with same output file
2. Restart MCP server (if not using `--save-session`)
3. New authentication loaded automatically

### Dynamic Session Switching (Advanced)

For scenarios requiring runtime session switching without multiple MCP instances:

```javascript
await browser_run_code({
  code: `async (page) => {
    const fs = require('fs');
    const authState = JSON.parse(
      fs.readFileSync('/path/to/session2-auth.json', 'utf8')
    );

    // Clear current cookies
    await page.context().clearCookies();

    // Load new session's cookies
    await page.context().addCookies(authState.cookies);

    // Load localStorage for each origin
    for (const origin of authState.origins || []) {
      if (origin.localStorage) {
        await page.goto(origin.origin);
        await page.evaluate((items) => {
          items.forEach(({ name, value }) => {
            localStorage.setItem(name, value);
          });
        }, origin.localStorage);
      }
    }

    return 'Authentication switched to new session';
  }`
});

// Refresh page to apply new authentication
await browser_navigate({ url: "https://app.example.com" });
```

## Security Best Practices

**Important**: These authentication files contain real credentials and are intended for local development only. Never commit them to version control or deploy them to any server.

### 1. Git Ignore Configuration

Always exclude authentication files from version control:

```gitignore
# Playwright authentication files
.playwright-auth/
```

### 2. File Permissions

Restrict access to authentication files:

```bash
chmod 700 .playwright-auth
chmod 600 .playwright-auth/*.json
```

### 3. Standardized Directory Structure

Store auth files in the project's `.playwright-auth/` directory using the `{domain}-{user}.json` naming convention:

```
project/
├── .playwright-auth/
│   ├── localhost3000-jack.json
│   ├── localhost3000-alice.json
│   └── github-bob.json
└── .gitignore
```

## Troubleshooting

### Authentication Not Working

1. **Verify auth file exists**: Check file path in configuration
2. **Check file contents**: Ensure cookies array is not empty
3. **Validate cookie domains**: Cookies must match target domain
4. **Check expiration**: Cookies may have expired, regenerate auth file

### Session Expires Quickly

Some websites use short-lived sessions. Solutions:

1. Regenerate auth file before each use
2. Use `--save-session` to auto-update auth state
3. Implement periodic auth refresh in workflow

### Multiple Tabs/Windows

When working with multiple tabs, authentication is shared within the browser context:

```javascript
// All tabs in same context share authentication
await browser_tabs({ action: "new" });  // New tab with same auth
await browser_navigate({ url: "https://app.example.com/page2" });
```

## Related Documentation

- **Multi-session setup**: See `multi-session-setup.md` for configuring multiple session instances
- **Playwright Authentication Docs**: https://playwright.dev/docs/auth
- **MCP Protocol**: https://modelcontextprotocol.io
