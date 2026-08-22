# 微应用（micro-app）

路由：`/manage/apps/:appId` · `/single/apps/:name` · 优先级：P0 · 前端状态：wip（iframe 宿主 + 简易桥 + keepAlive）

## 能力

- 宿主：iframe（默认）或 `iframe_blank` / `external` 外开。
- 注入：URL 占位 `{user_token}` / `{token}`；`postMessage` 桥 `getUserInfo` / `openWindow` / **`openDialog`** / **`okrAdd`** / **`okrPush`** / **`notifyMessageStream`**（`source: blue-dock-micro` ↔ `blue-dock-host`）；主题/语言变更推送 `hostContext`。
- 角标：打开时按菜单 `badgeClearOnOpen` 乐观清零；「应用」导航聚合全部插件角标。
- 菜单位置：
  - `application` → 应用中心常用
  - `application/admin`（兼容旧值 `admin`）→ 应用中心管理员
  - `main/menu`（兼容旧值 `main`）→ 侧栏主导航一级入口
- **keepAlive**：`ManageLayout` 内缓存层；离开路由隐藏不销毁 iframe（最多 6 个）；`/single` 与外开模式不缓存。
- 宿主选项：`transparent` 背景、`autoDarkTheme`、`immersive` 隐藏顶栏。

## React 要点

- `MicroAppHostPage`：解析菜单；keepAlive 时只 `activate` 缓存。
- `MicroAppKeepAliveLayer` + `MicroAppIframe`：缓存渲染与消息桥。
- `ApplicationPage` / `ManageLayout`：按 `normalizeMicroMenuLocation` 分区渲染。

## API

[modules/micro-app](../../../blue-dock-java/docs/modules/micro-app/)
