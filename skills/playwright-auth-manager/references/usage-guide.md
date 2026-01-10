# Playwright MCP Usage Guide

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

### Option 1: Isolated Context + Storage State (Recommended)

Clean browser environment with only authentication data loaded:

```json
{
  "playwright": {
    "command": "npx",
    "args": [
      "@playwright/mcp@latest",
      "--isolated",
      "--storage-state=/path/to/auth.json"
    ]
  }
}
```

**Characteristics:**
- ✅ Small file size (5-50KB)
- ✅ Clean environment each session
- ✅ Easy to version control
- ✅ Fast startup
- ❌ No browser extensions
- ❌ No browsing history

### Option 2: Persistent User Data Directory

Complete browser profile with all data:

```json
{
  "playwright": {
    "command": "npx",
    "args": [
      "@playwright/mcp@latest",
      "--user-data-dir=/path/to/profile"
    ]
  }
}
```

**Characteristics:**
- ✅ Complete browser experience
- ✅ Extensions supported
- ✅ History and bookmarks preserved
- ✅ Auto-saves all changes
- ❌ Large size (50-500MB)
- ❌ Not suitable for version control

### Option 3: Save Session

Automatically save authentication state after each session:

```json
{
  "playwright": {
    "command": "npx",
    "args": [
      "@playwright/mcp@latest",
      "--isolated",
      "--storage-state=/path/to/auth.json",
      "--save-session"
    ]
  }
}
```

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

### Dynamic Authentication Switching (Advanced)

For scenarios requiring runtime user switching without multiple MCP instances:

```javascript
await browser_run_code({
  code: `async (page) => {
    const fs = require('fs');
    const authState = JSON.parse(
      fs.readFileSync('/path/to/user2-auth.json', 'utf8')
    );

    // Clear current cookies
    await page.context().clearCookies();

    // Load new user's cookies
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

    return 'Authentication switched';
  }`
});

// Refresh page to apply new authentication
await browser_navigate({ url: "https://app.example.com" });
```

## Security Best Practices

### 1. Git Ignore Configuration

Always exclude authentication files from version control:

```gitignore
# Playwright authentication files
*.auth.json
auth.json
.playwright-auth/

# User data directories
playwright-profile/
.playwright-user-data/
```

### 2. File Permissions

Restrict access to authentication files:

```bash
chmod 600 ~/.playwright-auth/*.json
```

### 3. Centralized Storage

Store auth files in a secure, centralized location:

```
~/.playwright-auth/
├── project1-admin.json
├── project1-user.json
└── project2-user.json
```

Reference with absolute paths or environment variables:

```json
{
  "args": [
    "@playwright/mcp@latest",
    "--storage-state=${HOME}/.playwright-auth/admin.json"
  ]
}
```

### 4. Secrets Management

For CI/CD environments, use encrypted secrets:

```bash
# Encrypt auth file
gpg -c admin-auth.json

# In CI, decrypt before use
gpg -d admin-auth.json.gpg > admin-auth.json
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

- **Multi-user setup**: See `multi-user-setup.md` for configuring multiple user instances
- **Playwright Authentication Docs**: https://playwright.dev/docs/auth
- **MCP Protocol**: https://modelcontextprotocol.io
