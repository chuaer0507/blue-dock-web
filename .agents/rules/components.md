---
description: 组件开发规范 — HeroUI 优先、MCP/官网查文档、页面组装标准
alwaysApply: false
globs:
  - 'packages/app/**'
  - '**/*.tsx'
---

# 组件开发规范

## UI（`@blue-dock/app` + HeroUI）

**硬约束：**

- **优先直连** `@heroui/react`（`Button` / `Form` / `TextField` / `Input` / `Select` / `Switch` / `Checkbox` / `Table` / `Modal` / `Tabs` / `Dropdown` / `ListBox`…）
- **原生 HTML 仅作兜底**：HeroUI 有等价组件时，禁止写原生 `<form>` / `<table>` / `<input type="checkbox">` / `<select>` / 裸交互 `<button>`（布局用 `div`/`section`/`p`/`h*` 除外）
- 图标直连 `@heroicons/react`（如 `24/outline`）——**不要**再导出 `icons.ts` / `@blue-dock/app/ui` 桶
- 禁止自造通用封装（如 `LabeledInput` / `DialogShell` / `ListboxField` / `SettingSwitch` / `IconButton`）；调用点直接用 HeroUI
- 样式走全仓 **Tailwind CSS v4** + HeroUI 语义 token（`@blue-dock/config-tailwind` 含 `@heroui/styles`）；优先 `bg-background` / `bg-surface` / `bg-accent` / `text-muted` / `shadow-surface` / `shadow-overlay` / `outline-focus`，禁止自造 `--color-*` 色桥
- 必须有基础无障碍：`aria-label` / `role` / 焦点可见（`:focus-visible`）
- **不再使用** `@blue-dock/ui` / `@gravity-ui/icons`

### 写 UI 前查 HeroUI 文档（v3）

本仓对接 **HeroUI React v3**。实现或改交互控件前，**勿凭记忆猜 props**，按顺序：

1. **优先 MCP**：服务器 `user-heroui-react` → `GetMcpTools` → `list_components` → `get_component_docs`（按需 `get_component_source_code` / `get_theme_variables`）
2. **MCP 连不上 / 报错 / 超时**：改查官网 [heroui.com](https://heroui.com)（组件文档、Getting Started、Theming）；可用 `WebFetch` 拉取对应文档页
3. **仅当**文档确认无合适组件时，才允许原生标签或轻量自定义（调用处可简短注释原因）

### 常见替换

| 需求     | 用 HeroUI                         | 不要用                  |
| -------- | --------------------------------- | ----------------------- |
| 提交表单 | `Form` + `TextField`              | `<form>` + 裸 input     |
| 开关     | `Switch`                          | `<input type=checkbox>` |
| 勾选     | `Checkbox`                        | 同上                    |
| 表格     | `Table` + `Table.Content`…        | `<table>`               |
| 单选组   | `RadioGroup` + `Radio`            | 自造 radio              |
| 对话框   | `Modal` + `useOverlayState`       | 自造 overlay            |
| 下拉     | `Dropdown` / `Select` + `ListBox` | 自造 menu               |

**表单：**

- 提交容器用 HeroUI `Form`（勿用原生 `<form>`）
- 带标签字段：`TextField` + `Label` + `Input` / `TextArea`
- 开关：`Switch` + `Switch.Control` + `Switch.Thumb`
- 选择：`Select` + `ListBox`

**弹层 / 菜单：**

- 对话框：`Modal` + `useOverlayState`
- 下拉：`Dropdown` 复合组件
- 页签：`Tabs` 复合组件

## Provider

- `ThemeProvider` / `ErrorBoundary` → `packages/app/src/providers/`（`@blue-dock/app` 导出）
- `I18nProvider` → `@blue-dock/i18n`；HeroUI 语言用 `I18nProvider`（`@heroui/react`）在 `App.tsx` 对齐
- 壳层 `apps/*` 组装注入；`api` 只暴露纯逻辑

## 页面与 Feature（`@blue-dock/app`）

- 文件位于 `packages/app/src/features/<id>/` 与 `routes/`
- 通过 TanStack Query hooks / Zustand 获取数据
- UI：直连 `@heroui/react` + `@heroicons/react`（先查文档再写）
- React Router `lazy()` 懒加载
- `apps/web` · `apps/desktop` · `apps/mobile` 仅挂载，不堆业务页面

## 错误兜底

- `ErrorBoundary`：全局捕获 → 重试 / 回登录
- API `code !== 0`：Toast / 表单展示后端 `message`
- `code === 1001`：清会话 → `/login`
- 网络断开：顶栏 / IM 状态条 + WS 自动重连

## 无障碍（a11y）

- 语义化 HTML，交互控件具备可访问名称
- 键盘全可操作，`:focus-visible` 清晰指示
- 色比达标；主题亮/暗均可读

详情：`docs/guide/i18n-and-theme.md`。
