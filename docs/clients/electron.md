# Electron 桌面（electron）

壳：`apps/desktop` · 桥：`@blue-dock/desktop-bridge` · 前端状态：done（托盘 / 系统通知 / Dock 角标 / 多窗）

## 能力

- 主进程 / preload；渲染复用 `@blue-dock/app`。
- **托盘**：显示 / 隐藏主窗；macOS 关窗可藏到托盘；托盘菜单退出。
- **系统通知**：`desktop.notify`（IPC）；失焦时新消息提醒；点击跳转 `/manage/messenger/:id?msg=`；`isSilent`/`silence` 与本地免打扰会话跳过；设置页可关。
- **Dock / 角标**：`desktop.setBadge`（会话未读合计）。
- **多窗口**：`desktop.openWindow` — 任务 / 对话独立窗（含附件、粘贴图、跟读已读、翻页）、会议窗；Web stub 降级 `window.open`。
- `/preload` 预加载壳：闪屏 + 等待 `window.desktop` + `system/prefetch`（有清单则 `<link rel=prefetch>`）；主窗冷启动加载此路由，再进登录 / 工作台（支持 `?redirect=`）。
- 渲染进程禁止 `require('electron')`，一律走 bridge。

## 详见

工程约定见 [architecture.md](../guide/architecture.md) · frontend-spec security-delivery。
