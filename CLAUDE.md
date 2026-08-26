# CLAUDE.md

@AGENTS.md

Claude Code 专用入口：通过上方 `@AGENTS.md` 继承跨工具约束与铁律摘要。  
规则正文在 `.agents/rules/`；skills 在 `.agents/skills/`。`.claude/` 为 Claude 兼容层。

## 文档同步（Claude）

- 若本手册（命令 / 架构 / CI）有变：同步 `CLAUDE.md` 与 `README.md`
- 若 agent 铁律摘要有变：改 `AGENTS.md`（勿在本文件重复抄一遍强制规则）

## 项目概览

Blue Dock Web：Bun monorepo + React + Vite + TypeScript + Electron。  
一套 `@blue-dock/app`，六端（Web + Electron mac/win/linux + Mobile iOS/Android 薄壳）；壳层现为 `apps/web` + `apps/desktop`；Mobile 规划见 [docs/clients/mobile.md](docs/clients/mobile.md)；API 对接 **blue-dock-java**。

```
apps/           web（Vite 壳） / desktop（Electron） / mobile（Capacitor 薄壳）
packages/       app（含 HeroUI）/ api / i18n / desktop-bridge / mobile-bridge / config*
docs/           产品与实现规格（按业务分目录）
.agents/        Agent 唯一内容源（rules / skills / commands）
.claude/        Claude 兼容层（symlink → .agents）
```

产品文档入口：[docs/README.md](docs/README.md)  
工程规范入口：[docs/guide/frontend-spec.md](docs/guide/frontend-spec.md)

## 常用命令

```bash
bun install
bun run dev              # Web
bun run dev:desktop      # Electron
bun run dev:mobile       # Capacitor Web 壳（5175）
bun run typecheck
bun run lint
bun run lint:circular
bun run format:check
bun run test
bun run docs:check
bun run e2e:smoke
bun run e2e:auth          # 需 E2E_EMAIL / E2E_PASSWORD
bun run build
bun run build:desktop
```

脚本以根 `package.json` 为准；技术栈见 [docs/guide/tech-stack.md](docs/guide/tech-stack.md)。

## 状态管理速查

| 数据来源   | 用谁管                     | 不要用谁管         |
| ---------- | -------------------------- | ------------------ |
| HTTP 请求  | **TanStack Query**         | 不要放 Zustand     |
| WebSocket  | **失效 / 补丁 Query**      | 勿当唯一真相不补洞 |
| 客户端状态 | **Zustand**（壳层 / 草稿） | 不要放 Query       |

## 技术栈

- 构建：Bun workspaces + Vite + React + TypeScript（均 LTS / 最新稳定）
- 样式：**Tailwind CSS v4** + CSS 变量主题（`@blue-dock/config-tailwind`）
- UI：**HeroUI**（`@heroui/react`）+ **Heroicons**（`@heroicons/react` 直连）
- 路由：React Router `lazy()`；Web / Desktop 共用；视口 `useScreen` · 端 `usePlatform`
- 状态：TanStack Query + Zustand
- HTTP：`get` / `post` / `put` / `del`（`http-api`）+ 信封 `{ code, message, data }`；`-2` → 无感 refresh；`1001` → 登录；tip 由 `extra.showFailTips` / `tipsType` 控制
- 实时：`/ws`，协议对齐 java `architecture/realtime.md`
- 国际化：`@blue-dock/i18n` · `t()`
- 测试：Vitest + Playwright
- 桌面：Electron + `desktop-bridge`，见 `docs/clients/electron.md`
- 移动：`apps/mobile` + `mobile-bridge`；原生工程 `cap:add`；见 `docs/clients/mobile.md`

## 关键约定

- API SSOT：`../blue-dock-java/docs/contract/api-contract.md`
- 签到：`attendance`（禁止 `checkin` / `signin`）
- 密码：`GET users/key/client` → RSA-OAEP + `kid` 上送
- 环境变量：各 app 独立 `.env.*`，`envDir` 指向自身；`.env.local` 不进 git
- 开发代理：`/api`、`/ws` → blue-dock-java

## 改完

- 手册变更同步 `CLAUDE.md` / `README.md` / `docs/`
- 接口变更先改 blue-dock-java，再改本仓消费侧
- 功能完成后对该功能**全量**回归

## Skills / Commands

斜杠命令经 `.claude/commands` → `.agents/commands`：`/check` `/create-app` `/create-component` `/create-hook` `/crud` `/frontend-spec` `/i18n` `/karpathy-guidelines`。

专用 skill：`frontend-spec`、`code-reviewer`、`test-generator` 等（见 `.agents/skills/`）。
