# How to Install MCP

## Overview

本指南介绍如何在不同 MCP 客户端中配置 Playwright MCP Server。

**核心原则：**
- MCP 建议安装在项目目录下
- 认证文件统一存放在 `.playwright-auth/` 目录
- MCP 服务器命名规范：`playwright-{domain}-{user}`
- 认证文件命名规范：`{domain}-{user}.json`

**不同客户端的配置文件位置和格式不同**，下面提供了常见客户端的配置示例。对于其他客户端，请参考其文档并遵循上述命名规范。

## Claude Code

**配置文件位置：** `{PROJECT_ROOT}/.mcp.json`

### 单会话配置

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
    }
  }
}
```

### 多会话配置

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

### 自动保存会话

添加 `--save-session` 标志以自动保存会话变更：

```json
{
  "mcpServers": {
    "playwright-localhost3000-jack": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=./.playwright-auth/localhost3000-jack.json",
        "--save-session"
      ]
    }
  }
}
```

## OpenCode

**配置文件位置：** `{PROJECT_ROOT}/opencode.json`

### 单会话配置

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "playwright-xiaohongshu-alice": {
      "command": [
        "npx",
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=./.playwright-auth/xiaohongshu-alice.json"
      ],
      "type": "local"
    }
  }
}
```

### 多会话配置

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "playwright-xiaohongshu-alice": {
      "command": [
        "npx",
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=./.playwright-auth/xiaohongshu-alice.json"
      ],
      "type": "local"
    },
    "playwright-xiaohongshu-bob": {
      "command": [
        "npx",
        "@playwright/mcp@latest",
        "--isolated",
        "--storage-state=./.playwright-auth/xiaohongshu-bob.json"
      ],
      "type": "local"
    }
  }
}
```

## 其他客户端

对于其他 MCP 客户端（如 Cline、Continue 等），请参考其文档配置 MCP 服务器。

**关键配置要素：**
1. **命令：** `npx @playwright/mcp@latest`
2. **参数：**
   - `--isolated`: 使用隔离的浏览器上下文
   - `--storage-state=./.playwright-auth/{domain}-{user}.json`: 认证文件路径
   - `--save-session`（可选）: 自动保存会话变更
3. **服务器名称：** `playwright-{domain}-{user}`

## 命名规范详解

### MCP 服务器名称

格式：`playwright-{domain}-{user}`

- **domain**: 目标网站/服务标识符
  - 示例：`localhost3000`（本地开发）、`github`、`xiaohongshu`
  - 建议使用小写字母和数字，不含特殊字符
- **user**: 用户/账户标识符
  - 示例：`jack`、`alice`、`user1`
  - 建议使用小写字母和数字，不含特殊字符

### 认证文件名称

格式：`{domain}-{user}.json`

存放路径：`./.playwright-auth/{domain}-{user}.json`

**示例：**
- `./.playwright-auth/localhost3000-jack.json`
- `./.playwright-auth/github-alice.json`
- `./.playwright-auth/xiaohongshu-bob.json`

## 配置后续步骤

1. **添加到 .gitignore**
   ```bash
   echo ".playwright-auth/" >> .gitignore
   ```

2. **重启 MCP 客户端** 以加载配置

3. **验证配置** 通过访问受保护页面验证认证是否生效

## 常见问题

### Q: 为什么使用 `--isolated` 参数？

A: `--isolated` 创建一个干净的浏览器上下文，只加载认证数据，不包含其他浏览历史或扩展。这样可以：
- 减小文件体积（5-50KB vs 50-500MB）
- 加快启动速度
- 更适合版本控制

### Q: 什么时候使用 `--save-session`？

A: 当你希望会话期间的认证变更（新 cookies、localStorage 更新）自动保存时使用。适用于：
- 频繁过期的会话
- 需要持续更新的认证状态

### Q: 可以在多个项目间共享认证文件吗？

A: 可以。将认证文件存放在用户主目录：
```
~/.playwright-auth/
├── service1-user1.json
└── service2-user2.json
```

然后在配置中使用绝对路径或环境变量：
```json
"--storage-state=${HOME}/.playwright-auth/service1-user1.json"
```

### Q: 如何切换不同的会话？

A: 配置多个 MCP 服务器实例，使用不同的工具前缀：
```javascript
// 使用 Jack 的会话
await mcp__playwright-localhost3000-jack__browser_navigate({ url: "..." });

// 切换到 Alice 的会话
await mcp__playwright-localhost3000-alice__browser_navigate({ url: "..." });
```

## 相关文档

- **[multi-session-setup.md](./multi-session-setup.md)** - 多会话配置详细指南
- **[usage-guide.md](./usage-guide.md)** - Playwright MCP 使用指南
- **[../skill.md](../skill.md)** - Playwright Auth Manager 完整文档