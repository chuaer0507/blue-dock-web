# Blue Dock Web 前端文档

目标栈：**Bun monorepo + React + Vite + TypeScript + Electron**（LTS / 最新稳定）。  
按**业务类型**分目录，作为产品功能与实现规格的单一事实来源。接口契约以 **blue-dock-java** 为准。

## 目录结构

```
docs/
├── README.md                 # 本索引
├── guide/                    # 工程与规范
├── navigation/               # 一级导航
├── collaboration/            # 项目协作
├── apps/                     # 应用与扩展
├── org/                      # 用户与组织
├── admin/                    # 系统管理
└── clients/                  # 终端（Web / Electron / Mobile）
```

## guide — 工程与规范

| 文档                                           | 说明                                                |
| ---------------------------------------------- | --------------------------------------------------- |
| [overview.md](./guide/overview.md)             | 产品范围、模块总览                                  |
| [tech-stack.md](./guide/tech-stack.md)         | Bun monorepo / React / Vite / Electron              |
| [frontend-spec.md](./guide/frontend-spec.md)   | **前端工程规范入口**（包边界 / 编码 / 安全 / 评审） |
| [architecture.md](./guide/architecture.md)     | 包划分、状态、实时、微应用宿主                      |
| [routing.md](./guide/routing.md)               | 前端路由表                                          |
| [api.md](./guide/api.md)                       | **后端接口约定（对接 blue-dock-java）**             |
| [state-and-api.md](./guide/state-and-api.md)   | Query/Store、WebSocket 消费侧                       |
| [testing.md](./guide/testing.md)               | 单元测试目录（`test/` 与 `src/` 同级）              |
| [i18n-and-theme.md](./guide/i18n-and-theme.md) | 国际化、主题                                        |
| [sync-checklist.md](./guide/sync-checklist.md) | 全量功能验收清单                                    |
| [upload.md](./guide/upload.md)                 | 分片上传（横切）                                    |

## navigation — 一级导航

- [仪表盘](./navigation/dashboard.md)
- [日历](./navigation/calendar.md)
- [即时通讯](./navigation/messenger.md)
- [文件](./navigation/file.md)
- [应用中心](./navigation/application.md)
- [全局搜索](./navigation/search.md)

## collaboration — 项目协作

- [项目](./collaboration/project.md)
- [任务](./collaboration/task.md)
- [视图](./collaboration/view.md)
- [会议](./collaboration/meeting.md)
- [工作报告](./collaboration/report.md)
- [签到打卡](./collaboration/attendance.md)

## apps — 应用与扩展

- [系统应用 / 管理员应用](./apps/apps.md)
- [微应用](./apps/micro-app.md)
- [应用市场](./apps/appstore.md)
- [机器人](./apps/bot.md)
- [AI 助手](./apps/ai-assistant.md)

## org — 用户与组织

- [账号与登录](./org/user-account.md)
- [个人设置](./org/user-settings.md)
- [部门组织](./org/org-department.md)
- [角色权限](./org/role-permission.md)
- [收藏与最近](./org/favorite.md)

## admin — 系统管理

- [系统设置](./admin/system-setting.md)
- [通知体系](./admin/notifications.md)
- [数据导出](./admin/data-export.md)
- [LDAP / License / 合规 / 举报](./admin/admin-extras.md)

## clients — 终端

- [多端客户端](./clients/clients.md)
- [Electron 桌面](./clients/electron.md)
- [Mobile iOS / Android 壳](./clients/mobile.md)
- [Mobile 原生工程 runbook](./clients/mobile-native.md)
- [快捷键与手势](./clients/shortcut.md)

## 目标栈一句话

**Bun workspaces** · **React + Vite** · **Electron** · **TypeScript** · API 对接 [blue-dock-java](../../blue-dock-java/docs/README.md)。

落地版本以 `bun.lock` / `package.json` 为准；验收见 [sync-checklist.md](./guide/sync-checklist.md)。
