# 国际化、主题与快捷键

## 国际化

文案全部走 i18n 层（`packages/i18n`）。

1. **键策略二选一（全仓统一）**
   - A. 「中文原文即 key」
   - B. 稳定英文 key + `zh-CN`/`en-US` 资源（推荐长期维护）
2. Toast / Modal **内部**自动翻译，调用方不要套双层 `t()`。
3. 歧义短词用上下文前缀，如 `[weekday].一`、`[task_unit].个`。
4. 微应用：宿主传入 `lang`；插件可自带文案。
5. **运行时 locale**：仅 `zh-CN` | `en-US`（localStorage `i18nextLng`、HeroUI `I18nProvider`、`Accept-Language`、`users.lang` 同值）。资源目录：`locales/zh-CN` · `locales/en-US`。**不接受**短码 `zh`/`en`。

## 主题

> 样式 SSOT：[`packages/config-tailwind`](../../packages/config-tailwind/README.md)（显式 `@heroui/styles`、产品色 + scrollbar）。

- 设置页：`/manage/setting/appearance`（或文档中的 theme section）
- **仅本地持久化**：`localStorage['blue-dock-theme']` = `light` | `dark` | `system`；**不写后端**
- **Tailwind v4** + CSS 变量驱动（亮/暗/跟随系统）；共享包 `@blue-dock/config-tailwind`（**样式 SSOT**）
- CSS 顺序（HeroUI 强制）：`@import "tailwindcss"` → `@import "@heroui/styles"` → Theme Builder / 校准后的 `theme.css`
- `config-tailwind` **须显式依赖** `@heroui/styles`（与 app 的 `@heroui/react` 同 `^3.2.3`）
- Token 用 HeroUI 语义变量；`theme.css` 为 [Theme Builder](https://heroui.com/en/themes) 导出或对照官方变量校准（`background` / `surface` / `accent` / `default` / `muted` / `--scrollbar-*` 等）+ 系统字族；阴影用 `shadow-surface` / `shadow-overlay`；禁止再造 `--color-bg` / `--color-primary` 等自定义桥。详见 [theming](https://heroui.com/en/docs/react/getting-started/theming) · [colors](https://heroui.com/en/docs/react/getting-started/colors)
- 布局表面优先用 HeroUI `Surface` / `Card`（Dashboard / Mail / Chat 气质）
- 根节点 `class="dark"` / `class="light"` **且** `data-theme`（与 HeroUI v3 一致）；禁止业务组件写死难切换色值；内联色用 `var(--accent)` 等语义变量
- HeroUI v3 **不需要**全局 UI Provider；仅 App 内挂 `I18nProvider`（locale）
- 滚动条：主题 `--scrollbar-*`；可选根/`data-scrollbar`；见 HeroUI theming
- 微应用注入 `theme`；变更时 postMessage / 桥 API 通知
- 入口：`import '@blue-dock/config-tailwind/base.css'`；Vite：`blueDockTailwind()` from `@blue-dock/config-tailwind/vite`
- 字体：`theme.css` 的 `--font-sans` / `--font-mono` 用系统 UI 栈（含 PingFang SC / Microsoft YaHei 等）；各壳不拉 Google Fonts

## 语言

- 个人资料 / 设置内切换语言；登录壳也可切
- 切换后：写 `i18nextLng` → 刷新壳层文案 → `editData({ lang })`（已登录）→ 后续请求 `Accept-Language`
- 日期/日历本地化跟语言走

## 快捷键

详见 [shortcut.md](../clients/shortcut.md)。

| 场景     | 示例                       |
| -------- | -------------------------- |
| 全局     | 搜索、新建任务、新建会议等 |
| IM       | 发送、换行、到下一条未读   |
| 任务详情 | 完成、关闭                 |
| Electron | 显示/隐藏窗、托盘相关      |

设置页 `/manage/setting/keyboard` 可查看；冲突检测与平台修饰键（⌘ / Ctrl）按 `desktop` / `web` 分支。

## 移动手势

- 侧滑返回
- 竖屏 Tabbar；横屏可切回侧栏布局
- 看板拖拽在触屏禁用（改列走详情）
