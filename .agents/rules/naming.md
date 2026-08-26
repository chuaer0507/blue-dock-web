---
description: 命名与契约 — 文件、包、路由、Query Key、attendance、blue-dock-java SSOT
alwaysApply: false
globs:
  - 'packages/**'
  - 'apps/**'
  - 'docs/**'
---

# 命名规范

## 文件命名

| 类型       | 风格                      | 示例                                      |
| ---------- | ------------------------- | ----------------------------------------- |
| React 组件 | PascalCase                | `Button.tsx`、`TaskCard.tsx`              |
| Hook       | camelCase，`use` 前缀     | `useProjectList.ts`、`useTheme.ts`        |
| Zustand    | camelCase，`Store` 后缀   | `shellStore.ts`、`messengerDraftStore.ts` |
| 工具函数   | camelCase                 | `formatDate.ts`、`path.ts`                |
| 域 API     | camelCase，领域名         | `project.ts`、`attendance.ts`             |
| 配置文件   | 约定名称                  | `vite.config.ts`、`tsconfig.json`         |
| 测试文件   | `*.test.ts` / `*.spec.ts` | `http-api-request.test.ts`                |

## 测试目录（强制）

与 **`src/` 同级** 建 **`test/`**，禁止把 `*.test.ts` 堆进 `src/`。

```
packages/<name>/
├── src/
└── test/          # 固定名 test；不用 __tests__ / tests
    └── *.test.ts  # 可按 src 子目录镜像
```

- Vitest `include`: `['test/**/*.{test,spec}.ts']`
- E2E（Playwright）不进各包 `test/`，见 [docs/guide/testing.md](../../docs/guide/testing.md)

## 包命名

- App 壳：`@blue-dock/web` · `@blue-dock/desktop`，目录 `apps/<web|desktop>/`
- Package：`@blue-dock/<name>`，目录 `packages/<name>/`
- Feature：`packages/app/src/features/<id>/`，id 对齐 `docs/` 模块（如 `messenger`、`attendance`）

## 路由

- 以 `docs/guide/routing.md` 为准（含 `/manage/*`、`/single/*`、`/meeting/*`）
- 页面组件 PascalCase；路由条目 `lazy()`

## Query Key

- 工厂模式：`xxxKeys.all()` / `xxxKeys.list()` / `xxxKeys.detail(id)`
- 工厂统一在 `@blue-dock/api` 域模块顶部导出

## 环境变量

- 每个 app：`.env.development` / `.env.production`
- `.env.local` — 本地覆盖，**不进 git**
- 仅 `VITE_*`；密钥不进前端 / 不进仓库

## 领域与契约

- JSON / 类型：camelCase **全词**；对照 java `contract/naming.md`
- 签到统一 **`attendance`**，禁止 `checkin` / `signin` 作路径或 feature id
- API 路径 / 动词以 `blue-dock-java/docs/contract/api-contract.md` 为 SSOT
- 禁止模型 wire 回传 `password` / `passwordHash`（用 `hasPassword` 等）

## i18n Key

- 推荐点号分层：`task.list.title`、`messenger.composer.send`
- 或全仓统一「中文原文即 key」——二选一，见 `docs/guide/i18n-and-theme.md`
- 命名空间按 feature / `common` 组织

详情：`docs/guide/api.md` · `docs/guide/testing.md`。
