# 技术栈：Bun monorepo + React + Vite + TypeScript + Electron

## 版本策略（强制）

全栈统一采用 **LTS / 最新稳定（Latest Stable）**，禁止 alpha / beta / nightly / RC（除非临时验证且不得合入主分支）。

| 组件                                    | 选型口径                   | 说明                                                                                        |
| --------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| **Bun**                                 | 官方最新稳定版             | 无独立 LTS 标签时等同 Latest Stable；用 `bun upgrade` 对齐                                  |
| **React** / **react-dom**               | npm `latest` 稳定线        | 取当前稳定大版本的最新 patch                                                                |
| **Vite** / `@vitejs/plugin-react`       | npm `latest` 稳定线        | 与 React 大版本兼容范围内取最新稳定                                                         |
| **TypeScript**                          | npm `latest` 稳定线        | `strict: true`；不跟 `next` / beta                                                          |
| **Electron**                            | 当前受支持的最新稳定大版本 | Electron 维护最近 3 个稳定 major；本仓库跟**最新一条稳定线**的最新 patch（勿用 beta/alpha） |
| 其他依赖（Router / Query / Zustand 等） | 各自最新稳定               | 同样禁止预发布标签                                                                          |

**落地规则**

1. `package.json` 用兼容范围（如 `^`）锁定在稳定大版本；`bun.lock` 为精确真相。
2. 定期滚动到上游最新稳定 / Electron 最新受支持稳定线；大版本升级前跑 `typecheck` + 关键路径 Playwright。
3. 文档中的具体版本号仅为撰写时快照，以锁文件为准。

## 目标栈（撰写时快照 2026-08）

| 层            | 选型                                                                  | 快照版本                | 说明                                                                                              |
| ------------- | --------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| 包管理 / 脚本 | **Bun** workspaces                                                    | **1.3.x**（现 1.3.14）  | `bun install` / `bun run` / 可选 `bun test`                                                       |
| UI            | **React** + **react-dom**                                             | **19.2.x**（现 19.2.8） | 函数组件；可用 `useEffectEvent` / `startTransition` / `useDeferredValue`                          |
| 构建          | **Vite**                                                              | **8.2.x**（现 8.2.0）   | Web 与 Electron renderer 统一 Vite                                                                |
| React 插件    | `@vitejs/plugin-react`                                                | **6.x**（现 6.0.5）     | 官方稳定插件                                                                                      |
| 语言          | **TypeScript**                                                        | 最新稳定                | `strict: true`                                                                                    |
| 路由          | **React Router**                                                      | **8.x**（现 8.3.x）     | 数据路由 + lazy                                                                                   |
| 桌面          | **Electron**                                                          | **43.x**（现 43.3.0）   | 当前最新稳定大版本；渲染进程复用 `@blue-dock/app`                                                 |
| 服务端状态    | TanStack Query                                                        | 最新稳定                | 列表/详情缓存与失效                                                                               |
| 客户端状态    | Zustand                                                               | 最新稳定                | 窗口态、主题、侧栏、IM 草稿                                                                       |
| 表单          | React Hook Form + Zod                                                 | 最新稳定                | 设置 / 创建类表单                                                                                 |
| UI 基座       | **HeroUI** + **Heroicons** + 项目主题                                 | 最新稳定（HeroUI `^3`） | `@blue-dock/app` 直连 `@heroui/react` / `@heroicons/react`；禁止自造 UI 封装桶                    |
| 样式          | **Tailwind CSS v4** + HeroUI 语义主题（`@blue-dock/config-tailwind`） | 最新稳定                | 产品色校准 `theme.css`；显式 `@heroui/styles` ^3.2.3；见 [i18n-and-theme.md](./i18n-and-theme.md) |
| i18n          | i18next（或等价方案）                                                 | 最新稳定                | 全站文案走翻译层                                                                                  |
| 实时          | WebSocket 客户端                                                      | —                       | 协议对齐后端                                                                                      |
| 微应用        | iframe + 宿主桥                                                       | —                       | 见 architecture                                                                                   |
| 测试          | Vitest + Playwright                                                   | 最新稳定                | 单元放各包 `test/`（与 `src/` 同级）；E2E 见 [testing.md](./testing.md)                           |

## Monorepo 布局（推荐）

```
blue-dock-web/
├── package.json
├── bun.lock
├── tsconfig.base.json
├── docs/
├── apps/
│   ├── web/
│   ├── desktop/
│   └── mobile/          # 规划：iOS / Android 薄壳
└── packages/
    ├── app/             # 含 HeroUI 直连 + features
    ├── api/
    ├── i18n/
    ├── desktop-bridge/
    ├── mobile-bridge/
    ├── config-eslint/
    └── config-tailwind/
```

### Workspace 脚本示例

```json
{
  "name": "blue-dock-web",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "bun run --filter @blue-dock/web dev",
    "dev:desktop": "bun run --filter @blue-dock/desktop dev",
    "build": "bun run --filter @blue-dock/web build",
    "build:desktop": "bun run --filter @blue-dock/desktop build",
    "typecheck": "bun run --filter '*' typecheck",
    "lint": "bun run --filter '*' lint",
    "test": "bun run --filter '*' test",
    "e2e": "bun run --filter @blue-dock/web e2e",
    "e2e:ui": "bun run --filter @blue-dock/web e2e:ui",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

## Vite 约定

- 入口：`apps/web/index.html` → `src/main.tsx`
- 别名：`@` → `packages/app/src`
- 环境变量：仅 `VITE_*`；密钥不进前端
- 代码分割：按路由 `lazy()`，IM / 甘特 / 编辑器等重模块独立 chunk
- 开发代理：`/api`、`/ws` 代理到后端

## 代码组织约定

| 职责              | 位置                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| 页面与业务组件    | `packages/app` routes + features                                      |
| HTTP / WS         | `packages/api` + TanStack Query                                       |
| UI 态             | 按域 Zustand + Query cache                                            |
| 工具与文案        | `packages/app/lib` + `packages/i18n`                                  |
| Electron 主进程   | `apps/desktop/src/main`                                               |
| preload 桥        | `apps/desktop/src/preload` + `desktop-bridge`                         |
| 桌面渲染          | 复用 `packages/app`                                                   |
| Mobile 壳（规划） | `apps/mobile` + `mobile-bridge`；见 [mobile.md](../clients/mobile.md) |

## Electron 技术要点

| 能力                          | 实现位置                                   |
| ----------------------------- | ------------------------------------------ |
| BrowserWindow / 托盘 / 菜单   | `apps/desktop` main                        |
| 安全桥                        | preload `contextBridge` → `window.desktop` |
| 通知 / 角标 / 开机启动 / 代理 | main + renderer 事件                       |
| 会议独立窗 / 文件预览窗       | 多 BrowserWindow，路由用 `/single/*`       |
| 自动更新                      | electron-updater（可选）                   |

渲染进程禁止直接 `require('electron')`；一律经 preload。详见 [electron.md](../clients/electron.md)。

## Mobile 技术要点（规划）

| 能力     | 说明                                                           |
| -------- | -------------------------------------------------------------- |
| 薄壳     | Capacitor 或等价 WebView；加载同一套 `@blue-dock/app` 构建产物 |
| 桥       | `window.blueDockMobile` + `@blue-dock/mobile-bridge` stub      |
| 首期能力 | 平台识别、推送 / 角标、深链、安全区                            |
| 不做     | RN / Flutter 重写；在业务包内直调原生 SDK                      |

详见 [mobile.md](../clients/mobile.md)。当前阶段以手机浏览器响应式为主。

## 编码硬约束

1. 业务请求只走 `packages/api`，组件不散落拼 URL。
2. 新领域开 `packages/app/features/<name>`，禁止向单一 utils 无限堆。
3. 用户可见文案走 i18n；Toast/Modal 内部自动翻译。
4. 不确定字段用 `unknown` + Zod，禁止默默 `any`。
5. 若启用 React Compiler：不要默认堆 `useMemo`/`useCallback`。
6. Web / Desktop /（规划）Mobile 共享 `packages/app`；平台差异只经 `desktop-bridge` / `mobile-bridge` 或 `import.meta.env`。
