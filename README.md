# Blue Dock Web

基于 **Bun monorepo** 的协作平台前端：一套业务（`@blue-dock/app`），**六端**输出（Web + Electron mac/win/linux + Mobile iOS/Android 薄壳）。  
后端接口对接 [blue-dock-java](../blue-dock-java/docs/README.md)。

> 脚手架已落地：`apps/web` · `apps/desktop` · `apps/mobile` 共享 `packages/app`；视口用 `useScreen` / 端用 `usePlatform`。  
> Mobile：`apps/mobile`（Vite + Capacitor）与 `@blue-dock/mobile-bridge` 已落地；原生 `ios/`/`android/` 本地 `cap:add`。详见 [docs/clients/mobile.md](docs/clients/mobile.md)。

## 项目结构

```
blue-dock-web/
├── apps/
│   ├── web/              # 浏览器壳（Vite）
│   ├── desktop/          # Electron 主进程 / preload
│   └── mobile/           # Capacitor 薄壳（Vite + bridge；ios/android 本地生成）
├── packages/
│   ├── app/              # @blue-dock/app — 路由、布局、features、HeroUI
│   ├── api/              # @blue-dock/api — get/post/put/del · Query hooks · WS（无 JSX）
│   ├── i18n/             # @blue-dock/i18n — 文案、t()、I18nProvider
│   ├── desktop-bridge/   # DesktopAPI 类型 + Web stub
│   ├── mobile-bridge/    # MobileAPI 类型 + Web stub
│   ├── config-eslint/    # ESLint / Prettier 基线
│   └── config-tailwind/  # Tailwind v4 主题 + Vite 插件（含 @heroui/styles）
├── docs/                 # 产品与实现规格（按业务分目录）
├── .agents/              # Agent 唯一内容源（rules / skills / commands）
├── AGENTS.md             # Cursor / Codex 启动入口
└── CLAUDE.md             # Claude Code 入口（@AGENTS.md）
```

## 依赖关系

```
@blue-dock/api     @blue-dock/i18n
（HTTP/WS/hooks）    （文案）
        \               |
         \              |
          ────→  @blue-dock/app  ←── desktop-bridge / mobile-bridge
                 （路由 / features / HeroUI）
                        ↑
           apps/web · apps/desktop · apps/mobile
```

## 架构铁律

1. `@blue-dock/api` 不得包含任何 React 组件或 JSX
2. `packages/*` 不得引用 `apps/*`
3. 业务 HTTP / WS 只经 `@blue-dock/api`；Web / Desktop / Mobile 共享 `@blue-dock/app`
4. UI 在 `@blue-dock/app` 内直连 HeroUI + Heroicons；禁止自造 UI 封装层；无独立 `@blue-dock/ui` / `@blue-dock/app/ui` / `@gravity-ui/icons`
5. 平台差异只经 `desktop-bridge` / `mobile-bridge`；渲染侧禁止直调 Electron / 原生 SDK

完整规范：[docs/guide/frontend-spec.md](docs/guide/frontend-spec.md) · [`.agents/rules/`](.agents/rules/)；安全与跨端交付使用 [`.agents/skills/security-delivery`](.agents/skills/security-delivery/SKILL.md)。

## 快速开始

```bash
# 安装依赖
bun install

# 开发
bun run dev              # Web（代理 /api、/ws → blue-dock-java，默认 127.0.0.1:8080）
bun run dev:desktop      # Electron + 同一套 app
bun run dev:mobile       # Capacitor Web 壳（5175）+ 注入 blueDockMobile

# 质量
bun run lint
bun run lint:fix
bun run lint:circular
bun run format
bun run format:check
bun run typecheck
bun run test
bun run docs:check        # 清单、路由与模块规格的状态一致性
bun run e2e:smoke         # 无账号的快速 Playwright 冒烟
bun run e2e:auth          # 真实后端登录态 E2E（需 E2E_EMAIL / E2E_PASSWORD）

# 构建
bun run build
bun run build:desktop
bun run build:mobile
```

脚本以根目录 `package.json` 为准；技术栈口径见 [docs/guide/tech-stack.md](docs/guide/tech-stack.md)。

## 技术栈

| 项目      | 技术                                                                                 |
| --------- | ------------------------------------------------------------------------------------ |
| 包管理    | Bun workspaces（LTS / 最新稳定）                                                     |
| 构建      | Vite + React + TypeScript（均最新稳定）                                              |
| 路由      | React Router（lazy）                                                                 |
| 状态      | TanStack Query（HTTP）+ Zustand（壳层 UI）                                           |
| HTTP / WS | `@blue-dock/api` · `get`/`post`/`put`/`del` · 信封 `{ code, message, data }`         |
| 样式 / UI | **HeroUI** + **Heroicons** + Tailwind v4 主题（`@blue-dock/config-tailwind`）        |
| 国际化    | i18next（或等价）                                                                    |
| 桌面      | Electron（最新稳定大版本）；渲染复用 `@blue-dock/app`                                |
| 移动      | Capacitor 薄壳（`apps/mobile`）；见 [docs/clients/mobile.md](docs/clients/mobile.md) |
| 测试      | Vitest + Playwright                                                                  |
| 质量门禁  | ESLint 9 + Prettier（含 tailwind 类排序）+ Husky / commitlint                        |
| 后端      | [blue-dock-java](../blue-dock-java/docs/README.md)                                   |

版本策略：禁止 alpha / beta / RC 合入主分支；锁文件为精确真相。

## 文档

| 文档                                                       | 说明                        |
| ---------------------------------------------------------- | --------------------------- |
| [docs/README.md](docs/README.md)                           | 业务文档索引                |
| [docs/guide/api.md](docs/guide/api.md)                     | 前端 API 约定（SSOT：java） |
| [docs/guide/architecture.md](docs/guide/architecture.md)   | 前端架构                    |
| [docs/guide/frontend-spec.md](docs/guide/frontend-spec.md) | 工程规范入口                |
| [docs/clients/electron.md](docs/clients/electron.md)       | 桌面端                      |
| [docs/clients/mobile.md](docs/clients/mobile.md)           | 移动壳（规划）              |

## 环境变量

- `apps/web/.env.development` / `.env.production`
- `apps/desktop/.env.development` / `.env.production`
- `apps/mobile/.env.development` / `.env.production`
- `apps/*/.env.local` — 本地覆盖，**不进 git**
- 仅 `VITE_*` 暴露给前端；密钥不进仓库

## Agent

| 入口                            | 用途                             |
| ------------------------------- | -------------------------------- |
| [AGENTS.md](AGENTS.md)          | Cursor / Codex 开工指令          |
| [CLAUDE.md](CLAUDE.md)          | Claude Code（`@AGENTS.md`）      |
| [`.agents/`](.agents/README.md) | rules / skills / commands 唯一源 |
| [`.claude/`](.claude/README.md) | Claude 兼容层（symlink）         |

## 许可证

本项目采用 [GNU Affero General Public License v3.0](LICENSE)（AGPL-3.0），与 [blue-dock-java](../blue-dock-java/LICENSE) 一致。

要点：

- 可自由使用、修改与分发，修改版若再分发须同样以 AGPL-3.0 开源
- 通过网络提供本软件（或其修改版）服务时，须向使用者提供对应完整源码
- 完整条款见仓库根目录 [`LICENSE`](LICENSE)
