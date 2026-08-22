# 产品总览

Blue Dock Web：**Bun monorepo + React + Vite + TypeScript + Electron**（均 LTS / 最新稳定）。`packages/app` 共享业务 UI；六端输出 Web · Electron（mac / win / linux）· Mobile（iOS / Android 薄壳）。壳层：`apps/web` · `apps/desktop` · `apps/mobile`。

## 产品定位

协作平台，核心能力：

- 项目管理与任务协作（看板 / 列表 / 甘特 / 工作流）
- 即时通讯（单聊 / 群聊 / 项目群 / 任务群；含投票、接龙、待办等）
- 在线文件、日历、会议、工作报告、签到
- 应用中心 + 微应用 / 应用市场
- AI 助手、机器人、审批等扩展
- Web / 桌面 / 移动薄壳

## 实现阶段（前端）

| 阶段       | 内容                                                                            |
| ---------- | ------------------------------------------------------------------------------- |
| 框架已落地 | 路由树、主题、登录（密码）/ Token 桥、Manage 壳                                 |
| 进行中     | 多数业务页已接（`wip`）；按规格补缺口并收口至 `done`（对接 **blue-dock-java**） |
| 仍占位     | （无；`/pro` · `/preload` 已接真页）                                              |
| Pro 介绍   | `/pro`（`ProPage`：容量 / 管理 / 支持要点 + 登录或进工作台 / 联系销售）           |
| 预加载壳   | `/preload`（闪屏 + 等桌面桥；冷启动入口；可 `?redirect=`）                         |

验收状态见 [sync-checklist.md](./sync-checklist.md)。

## 模块总览

### 一级导航

| ID          | 名称     | 优先级 | 规格                                           |
| ----------- | -------- | ------ | ---------------------------------------------- |
| dashboard   | 仪表盘   | P0     | [dashboard.md](../navigation/dashboard.md)     |
| calendar    | 日历     | P0     | [calendar.md](../navigation/calendar.md)       |
| messenger   | 即时通讯 | P0     | [messenger.md](../navigation/messenger.md)     |
| file        | 文件     | P0     | [file.md](../navigation/file.md)               |
| application | 应用中心 | P0     | [application.md](../navigation/application.md) |
| search      | 全局搜索 | P0     | [search.md](../navigation/search.md)           |

### 项目协作

| ID         | 名称     | 优先级 | 规格                                            |
| ---------- | -------- | ------ | ----------------------------------------------- |
| project    | 项目     | P0     | [project.md](../collaboration/project.md)       |
| task       | 任务     | P0     | [task.md](../collaboration/task.md)             |
| view       | 视图     | P0     | [view.md](../collaboration/view.md)             |
| meeting    | 会议     | P0     | [meeting.md](../collaboration/meeting.md)       |
| report     | 工作报告 | P0     | [report.md](../collaboration/report.md)         |
| attendance | 签到打卡 | P1     | [attendance.md](../collaboration/attendance.md) |

### 应用与扩展

| ID           | 名称       | 优先级 | 规格                                       |
| ------------ | ---------- | ------ | ------------------------------------------ |
| app-system   | 系统应用   | P0     | [apps.md](../apps/apps.md)                 |
| app-admin    | 管理员应用 | P0     | [apps.md](../apps/apps.md)                 |
| micro-app    | 微应用     | P0     | [micro-app.md](../apps/micro-app.md)       |
| appstore     | 应用市场   | P0     | [appstore.md](../apps/appstore.md)         |
| bot          | 机器人     | P0     | [bot.md](../apps/bot.md)                   |
| ai-assistant | AI 助手    | P0     | [ai-assistant.md](../apps/ai-assistant.md) |

### 用户与组织

| ID              | 名称       | 优先级 | 规格                                            |
| --------------- | ---------- | ------ | ----------------------------------------------- |
| user-account    | 账号       | P0     | [user-account.md](../org/user-account.md)       |
| user-settings   | 个人设置   | P0     | [user-settings.md](../org/user-settings.md)     |
| org-department  | 部门       | P0     | [org-department.md](../org/org-department.md)   |
| role-permission | 角色权限   | P0     | [role-permission.md](../org/role-permission.md) |
| favorite        | 收藏与最近 | P0     | [favorite.md](../org/favorite.md)               |

### 系统管理

| ID             | 名称     | 优先级 | 规格                                            |
| -------------- | -------- | ------ | ----------------------------------------------- |
| system-setting | 系统设置 | P1     | [system-setting.md](../admin/system-setting.md) |
| notifications  | 通知体系 | P1     | [notifications.md](../admin/notifications.md)   |
| data-export    | 数据导出 | P1     | [data-export.md](../admin/data-export.md)       |
| admin-extras   | 扩展管理 | P1–P2  | [admin-extras.md](../admin/admin-extras.md)     |

### 终端

| ID       | 名称     | 规格                                  |
| -------- | -------- | ------------------------------------- |
| clients  | 多端总览 | [clients.md](../clients/clients.md)   |
| electron | 桌面     | [electron.md](../clients/electron.md) |
| mobile   | 移动壳   | [mobile.md](../clients/mobile.md)     |
| shortcut | 快捷键   | [shortcut.md](../clients/shortcut.md) |

## 工程入口

- 架构：[architecture.md](./architecture.md)
- 路由：[routing.md](./routing.md)
- 技术栈：[tech-stack.md](./tech-stack.md)
- API：[api.md](./api.md) → [blue-dock-java](../../../blue-dock-java/docs/README.md)
