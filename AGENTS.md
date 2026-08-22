# Agents

本文件供 **Cursor**、**Codex**、以及经 `CLAUDE.md` 的 `@AGENTS.md` 导入的 **Claude Code** 在开工前注入。  
**规则正文唯一源**：[`.agents/`](.agents/README.md)。Claude 兼容层：`.claude/`（settings + symlink）。

## 开工前必做

Cursor / Codex **不会**自动注入 `.agents/rules/*.md` 全文。  
**改代码前必须按任务 `Read` 对应规则文件**（路径均在 `.agents/rules/`）。另：凡标 `alwaysApply: true` 的规则（见各文件 YAML frontmatter）在任意改动中均须遵守，下表按任务类型列出优先阅读项。

| 任务类型             | 先读                                            |
| -------------------- | ----------------------------------------------- |
| 任意改动             | `architecture.md`、`behavior.md`                |
| UI / 组件            | `components.md`、`naming.md`、`i18n.md`         |
| 状态 / API           | `state.md`、`naming.md`                         |
| 国际化               | `i18n.md`                                       |
| 设计 / 评审 / 大改造 | skill `frontend-spec`（再按需读 `references/`） |
| 接口路径 / 字段      | `docs/guide/api.md` + blue-dock-java 契约       |

Skills：`.agents/skills/<name>/SKILL.md`（`check` / `create-app` / `create-component` / `create-hook` / `crud` / `frontend-spec` / `i18n` / `karpathy-guidelines` / `code-reviewer` / `test-generator`）。

Commands：`.agents/commands/`（经 `.claude/commands` symlink；亦可直接读该目录或改用 skill）。斜杠入口含 `/check` `/create-app` `/create-component` `/create-hook` `/crud` `/frontend-spec` `/i18n` `/karpathy-guidelines`。

## 沟通

- 所有沟通、注释、文档、规则、skill、回复使用**中文**
- 用户可见文案禁止硬编码，走 i18n `t()`

## 架构铁律（违反即 Bug）

1. `@blue-dock/api` 不得包含任何 React 组件或 JSX — 只允许纯逻辑（http-api / hooks / WS / 工具）
2. `packages/*` 不得 import `apps/*` — 依赖单向向下
3. 业务 HTTP / WS 只经 `@blue-dock/api`；Web / Desktop / Mobile 共享 `@blue-dock/app`；平台差异只经 `desktop-bridge` / `mobile-bridge`
4. UI：在 `@blue-dock/app` 内直连 **HeroUI**（`@heroui/react`）与 **Heroicons**（`@heroicons/react`）；**有 HeroUI 组件则禁止原生表单/表格/开关等**；写 UI 前先 MCP `user-heroui-react`，**连不上则查 [heroui.com](https://heroui.com)**；禁止自造 UI 封装层；**无** `@blue-dock/ui` / `@blue-dock/app/ui` / `@gravity-ui/icons`

依赖：`api` / `i18n` / `desktop-bridge` / `mobile-bridge` ← `app`（含 HeroUI）← `apps/*`；`config*` 仅 devDependency。

## 强制要点（摘要）

- **状态**：HTTP → TanStack Query；WS → 失效 / 补丁 Query；壳层 UI / 草稿 → Zustand
- **Query Key**：工厂模式，禁止内联 `['xxx']`
- **Mutation**：适用时乐观更新 + 回滚 + onSettled 失效
- **契约**：URL / 字段 / 信封以 **blue-dock-java** 为准；签到领域用 `attendance`（禁止 `checkin` / `signin`）
- **鉴权**：密码 RSA-OAEP + `kid`（先 `users/key/client`）；`code === -2` 无感 refresh；`code === 1001` 清会话跳转登录
- **桌面**：渲染进程禁止 `require('electron')`，走 `desktop-bridge`
- **移动**：`apps/mobile` 注入 `blueDockMobile`；能力经 `mobile-bridge`；原生工程本地 `cap:add`；禁止 RN/Flutter 重写业务 UI；详见 `docs/clients/mobile.md`
- **改完**：手册变更同步 `CLAUDE.md` / `README.md` / `docs/`；铁律摘要变更改本文件

完整条文以 `.agents/rules/` 与 skill `frontend-spec` 为准。
