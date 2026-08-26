# 安全、集成与交付

> 鉴权、权限、实时、上传、桌面兼容与测试交付。

## 目录

- [1. 鉴权与权限规范](#1-鉴权与权限规范)
- [2. 实时、上传、微应用与桌面](#2-实时上传微应用与桌面)
- [3. 平台兼容规范](#3-平台兼容规范)
- [4. 测试与交付规范](#4-测试与交付规范)
- [5. 团队落地要求](#5-团队落地要求)

## 1. 鉴权与权限规范

### 1.1 Token 体系

- Access Token / Refresh Token 经 `@blue-dock/api` session 管理；请求拦截器注入 `Authorization: Bearer <access>`
- `code === -2`：单飞 `users/token/refresh` 后重试原请求
- `code === 1001`：清会话并跳转 `/login`
- 登出 / 会话失效须清理 access + refresh
- 禁止把 token 打进日志、Toast、微应用明文日志、错误文案

### 1.2 登录与密码（必须）

1. **请求**：先 `GET api/users/key/client`；HTTP JSON 字段 `password` 为 RSA-OAEP 密文 + `keyId`；禁止生产路径明文上送（细则见 java `user-account/auth-wire.md`）
2. **响应**：成功 `data` 不得含 `password` / `passwordHash`；模型用 `hasPassword` 等语义
3. **验密**：改密 / 敏感确认走服务端 API，禁止本地比对
4. **联调**：mock 可有降级；生产不得依赖明文兜底

### 1.3 权限

- 前端用角色 / 权限控制菜单与按钮可见性（admin、部门负责人视角等）
- **不能只靠前端隐藏**：敏感动作仍须后端鉴权；失败给可理解提示
- 负责人视角只读扩大可见范围，不提升项目内编辑权（与 java 一致）

### 1.4 防抖与重复提交

适用：登录、创建项目/任务、发消息、审批提交、签到、设置保存、安装应用。

强制：

- 按钮 loading / disabled 防连点
- 失败、取消、卸载路径必须复位 UI

### 1.5 会话与持久化

- Zustand persist 白名单最小化
- `localStorage` 视为可被同源脚本读取，最小化敏感存放
- 偏好类键名按 `userId` 隔离

## 2. 实时、上传、微应用与桌面

### 2.1 WebSocket

- 登录后连接 `/ws`；握手 token 与 java realtime 文档一致
- 处理 `dialog.*` / `task.*` / `column.*` / `project.sort` / `appBadge` / `presence.*` / `operation` 等
- 断线指数退避；恢复后补洞（invalidate 或增量拉取）
- Electron 可在帧处理中调用 `desktop.notify` / `setBadge`

### 2.2 分片上传

- 走 `api/upload/{init,chunk,merge,cancel}`；业务侧只提交返回的 objectId
- 进度与取消可中断；禁止自造上传路径
- 小文件可走契约允许的便捷入口（如 `system/fileUpload`），仍经 `@blue-dock/api` 封装

### 2.3 微应用宿主

- iframe 注入：`userId` / `token` / `theme` / `lang` / `baseUrl`（字段名与后端/插件约定一致，camelCase）
- 角标：`api/apps/badge/*` + WS `appBadge`
- 安装注册表：`api/system/apps/*`；菜单：`api/system/microAppMenu`
- 禁止把宿主 token 写入插件可任意读取的 `localStorage` 明文长期缓存（按桥协议最小化暴露）

### 2.4 Electron 桌面

- 薄壳在 `apps/desktop`；业务仍在 `@blue-dock/app`
- 能力经 `desktop-bridge`；无桌面环境时降级，禁止崩溃
- 多窗口加载 `/single/*`、`/meeting/*`
- 安全：`contextIsolation` + preload only；外链 `shell.openExternal`；CSP / 域名白名单

### 2.5 Mobile 壳（规划）

- 薄壳在 `apps/mobile`（Capacitor 级 WebView）；业务仍在 `@blue-dock/app`
- 能力经 `mobile-bridge`；无壳时 stub 降级，禁止崩溃
- **不**用 RN / Flutter 重写 UI
- 安全：Token 优先系统钥匙串；外链白名单；详见 `docs/clients/mobile.md`

### 2.6 会议

- 创建/加入/链接/游客/邀请走 `api/users/meeting/*`
- 关房以后端调度与卡片更新为准；无前端臆造 close API
- 分享链接与 `shareKey` 按敏感信息治理（勿打全文日志）

## 3. 平台兼容规范

### 3.1 Web / 桌面 / 移动

| 能力            | Web               | Electron           | Mobile 壳（规划）  |
| --------------- | ----------------- | ------------------ | ------------------ |
| 常规业务 UI     | 完整              | 完整（复用 app）   | 完整（复用 app）   |
| 系统通知 / 角标 | 浏览器能力 / 降级 | native             | APNs / FCM + 角标  |
| 多窗口          | 同页路由 / 降级   | 独立 BrowserWindow | 单 WebView + 深链  |
| 开机启动 / 托盘 | 无                | main 进程          | 无（系统推送唤醒） |

### 3.2 环境

- 开发代理：`/api`、`/ws` → blue-dock-java
- 各 app `.env.development` / `.env.production` 分离；禁止把生产密钥写入开发 env 并提交
- API 契约变更以 java 仓文档为准，前端只消费

### 3.3 响应式

- 桌面横屏侧栏；移动 / 竖屏 Tabbar（见 architecture / shortcut 文档）
- 触屏禁用看板拖拽等约定按产品文档

## 4. 测试与交付规范

建议测试分层：

| 层级 | 范围                                                |
| ---- | --------------------------------------------------- |
| T1   | 包边界、主题、i18n、鉴权接线、信封处理              |
| T2   | feature 主链路（项目、任务、IM、文件、应用、签到…） |
| T3   | 上传、会议、微应用桥、桌面壳、WS 断线               |
| T4   | Web + Desktop 回归 + 发版冒烟                       |

强制规则：

- 功能完成后对该功能相关页面 / hooks / API **全量**回归，不只点本次 diff
- 关键逻辑补 Vitest；主路径可补 Playwright
- 提测前输出功能级回归范围与结果（可复用 `docs/guide/sync-checklist.md`）
- 门禁：`bun run typecheck` / `lint` / `lint:circular` / `test`；涉及时 `build` / `e2e`
- 禁止用 eslint-disable 让依赖方向检查假绿

上线前检查统一使用 [代码评审清单](../../code-reviewer/references/checklists.md)。

## 5. 团队落地要求

1. 新 feature / 大改动先对照本规范与 `docs/`，再写代码。
2. 开发前确认归属包、状态归属、是否需新 hook / 组件 / i18n、接口是否已在 java 契约落地。
3. 交付默认包含：边界、i18n、主题、密码 wire（涉及时）、文档同步。
4. 评审按本规范与 `.agents/rules/` 逐项检查。
5. 功能完成后全量回归；鉴权 / 上传 / 会议 / 微应用等风险链路单独冒烟。
6. 新规则优先更新 `rules/` 与本 skill，不要散落在聊天记录。
