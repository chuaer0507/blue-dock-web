---
name: create-app
description: 按项目规范在 apps/ 下创建或补齐壳应用（web / desktop / 稀有新壳）
---

# 创建 / 补齐 App 壳

设计前阅读 [architecture.md](../../rules/architecture.md)、[state.md](../../rules/state.md) 与根 README；涉及 Electron 或 Mobile 安全边界时使用 `security-delivery` 技能。

Blue Dock 当前壳：`apps/web`、`apps/desktop`、`apps/mobile`（Capacitor；见 [docs/clients/mobile.md](../../../../docs/clients/mobile.md)）。业务页面在 `@blue-dock/app`，**不要**为每个业务开新 app。

## 目录结构

```
apps/<name>/
├── src/
│   ├── main.tsx             # 挂载 @blue-dock/app
│   └── vite-env.d.ts
├── .env.development
├── .env.production
├── package.json             # name: @blue-dock/<name>
├── vite.config.ts           # extend @blue-dock/config*
├── vitest.config.ts         # extend（若需要）
└── tsconfig.json            # extend ../../tsconfig.base.json

# desktop 额外：
apps/desktop/src/main/       # Electron main
apps/desktop/src/preload/    # contextBridge → window.desktop

# mobile 额外（规划）：
apps/mobile/                 # Capacitor 或等价；注入 window.blueDockMobile
packages/mobile-bridge/      # MobileAPI 类型 + stub
```

## package.json 模板（web）

```json
{
  "name": "@blue-dock/web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc -b --pretty false",
    "lint": "eslint ."
  },
  "dependencies": {
    "@blue-dock/app": "workspace:*",
    "@blue-dock/api": "workspace:*",
    "@blue-dock/i18n": "workspace:*",
    "@blue-dock/desktop-bridge": "workspace:*"
  },
  "devDependencies": {
    "@blue-dock/config-eslint": "workspace:*"
  }
}
```

## main.tsx 模板

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@blue-dock/api';
import { ThemeProvider, App } from '@blue-dock/app';
import { I18nProvider } from '@blue-dock/i18n';

<QueryClientProvider client={queryClient}>
  <ThemeProvider>
    <I18nProvider>
      <App />
    </I18nProvider>
  </ThemeProvider>
</QueryClientProvider>;
```

## 端口约定

| 壳       | 建议端口                                  |
| -------- | ----------------------------------------- |
| web      | 5173                                      |
| desktop  | （Electron，renderer 可复用 5173 或独立） |
| mobile   | 5175                                      |
| **新壳** | **5176+**                                 |

开发代理：`/api`、`/ws` → blue-dock-java。

## 完成后

- [ ] `bun install`
- [ ] `bun run --filter @blue-dock/<name> dev` 可启动
- [ ] 根 `package.json` 脚本、`README.md`、`AGENTS.md`、`CLAUDE.md` 已同步
- [ ] `.claude/settings.json` 权限按需补充
- [ ] 业务仍放在 `packages/app`，壳保持薄
