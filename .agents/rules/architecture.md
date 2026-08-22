---
description: 架构铁律 — 依赖方向、包职责边界、分层约束
alwaysApply: true
---

# 架构铁律

## 铁律（违反即为 Bug）

1. **`@blue-dock/api` 不得包含任何 `.tsx` / JSX / React 组件** — 纯逻辑：`http-api`、Query hooks、WS、鉴权、上传工具
2. **`packages/*` 不得 `import` `apps/*`** — 依赖方向单向向下
3. **业务 HTTP / WS 只经 `@blue-dock/api`** — 禁止页面散落拼 URL 或自造信封解析
4. **Web / Desktop / Mobile 共享 `@blue-dock/app`** — 平台差异只经 `@blue-dock/desktop-bridge` / `@blue-dock/mobile-bridge`
5. **UI 组件库** — 业务 UI 在 `@blue-dock/app` 内直连 **HeroUI**（`@heroui/react`）；图标直连 **Heroicons**（`@heroicons/react`）。禁止自造通用 UI 封装（勿恢复 `@blue-dock/ui` / `@blue-dock/app/ui` / `icons.ts` 桶）。页面级组装可放 `packages/app/src/components/`。**无** `@gravity-ui/icons`。

## 依赖拓扑

```
@blue-dock/api     @blue-dock/i18n     @blue-dock/desktop-bridge
（HTTP/WS/hooks）    （文案 / I18nProvider）  @blue-dock/mobile-bridge
        \               |                        /
         \              |                       /
          ────→  @blue-dock/app  ←─────────────
                 （路由 / features / HeroUI）
                        ↑
           apps/web · apps/desktop · apps/mobile

@blue-dock/config*          仅 devDependency
```

## 分层职责边界

| 层               | 可以做的事                                | 不能做的事                                           |
| ---------------- | ----------------------------------------- | ---------------------------------------------------- |
| `api`            | http-api、hooks、WS、鉴权、上传           | JSX、import app/apps                                 |
| `i18n`           | 语言包、`t()`、`I18nProvider`             | 业务副作用                                           |
| `app`            | 路由、布局、features、HeroUI 组装、业务壳 | 自造 API 路径、直接 `require('electron')` / 原生 SDK |
| `desktop-bridge` | DesktopAPI 类型与 stub                    | 业务规则                                             |
| `mobile-bridge`  | MobileAPI 类型与 stub                     | 业务规则、直调原生 SDK 散落业务层                    |
| `config*`        | vite / eslint / vitest / tailwind base    | 运行时代码                                           |
| `apps/*`         | 挂载、环境、Electron / 移动壳生命周期     | 可共享业务滞留壳层、重复全量 config                  |

## ESLint 强制执行

```js
'import/no-restricted-paths': ['error', {
  zones: [
    { target: './packages/api', from: './apps' },
    { target: './packages', from: './apps' },
  ],
}]
```

循环依赖检测：`bun run lint:circular`（madge --circular）

## 违规修复速查

| 违规现象                        | 根因       | 修复                                 |
| ------------------------------- | ---------- | ------------------------------------ |
| feature 直调 fetch 拼 URL       | 绕过 api   | 经 `@blue-dock/api` hooks/`http-api` |
| `apps/web/utils.ts` 被 app 依赖 | 工具放错层 | 移到 `api` 或 `app/lib`              |
| A ↔ B 循环引用                  | 职责未分离 | 公共类型/逻辑抽独立文件              |
| 路径用 `checkin` / `signin`     | 命名违规   | 统一 `attendance`                    |

详情：`.agents/skills/frontend-spec/references/architecture.md`
