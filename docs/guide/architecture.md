# 前端架构

## 设计目标

1. **一套业务，六端输出**：Web（Vite）· Electron（mac / win / linux）· Mobile（iOS / Android 薄壳）共用 `packages/app`。
2. **按域拆分**：按业务模块组织代码，避免巨石 store / 巨型页面。
3. **宿主可扩展**：应用中心 + 微应用桥支持插件生态。
4. **实时优先**：IM / 任务 / 未读依赖 WebSocket，HTTP 作引导与补洞。
5. **视口驱动布局**：`useScreen` / `usePlatform`（按宽高与横竖屏切换侧栏 / Tabbar）。

## 包职责

```
apps/web          → 浏览器壳：挂载、Vite 配置、PWA（可选）
apps/desktop      → Electron 主进程 / preload / 窗口生命周期
apps/mobile       → Capacitor 薄壳：Vite 挂载 + `blueDockMobile` 注入；ios/android 本地 cap:add
packages/app      → 路由树、布局、features、HeroUI / Heroicons 直连（`src/components` 仅页面级组装）
packages/api      → get/post/put/del、鉴权头、错误码、WS 客户端
packages/i18n     → 语言包、t()、I18nProvider
packages/desktop-bridge → DesktopAPI 类型与 no-op Web stub
packages/mobile-bridge  → MobileAPI 类型与 Web stub
packages/config-tailwind → Tailwind v4 + `@heroui/styles` + Theme Builder（壳层 Vite 插件）
```

路由表见 [routing.md](./routing.md)。

Mobile 策略见 [mobile.md](../clients/mobile.md)：薄壳 + WebView，不用 RN / Flutter 重写。

## 运行时分层

```
┌─────────────────────────────────────────┐
│  Layout（侧栏 / Tabbar / 顶栏 / 安全区）   │
├─────────────────────────────────────────┤
│  Feature Pages（dashboard / messenger…） │
├─────────────────────────────────────────┤
│  Feature hooks + UI                      │
├──────────────┬──────────────────────────┤
│ TanStack Query│ Zustand（UI / 会话草稿）  │
├──────────────┴──────────────────────────┤
│ packages/api（HTTP + WS）                │
├─────────────────────────────────────────┤
│ Backend / Electron main                  │
└─────────────────────────────────────────┘
```

## 布局与导航

| 区域               | 行为                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| 左侧栏（桌面横屏） | 仪表盘 / 日历 / 消息 / 文件 / 应用 + 项目列表；`useScreen().navMode === 'sidebar'` |
| 移动 / 竖屏 Tabbar | 消息 / 仪表盘 / 应用 / 文件 / 我的；`navMode === 'tabbar'`（竖屏或宽度 ≤576）      |
| 头像菜单           | 个人设置、系统设置（admin）、License、退出等                                       |
| 「+」菜单          | 新任务 / 新项目 / 新群 / 新会议 / 新报告 / 新审批                                  |

路由细节见 [routing.md](./routing.md)。

## 实时与缓存

- **WebSocket**：登录后建立；收任务变更、对话消息、未读、系统通知。
- **HTTP**：经 `http-api` 的 `get` / `post` / `put` / `del`；列表首屏、详情、写操作；写成功后 invalidation 或乐观更新。
- **本地记忆**：仪表盘布局、日历视图、侧栏折叠等存 `localStorage`（按用户隔离）。

## 微应用宿主

| 能力   | 说明                                                     |
| ------ | -------------------------------------------------------- |
| 容器   | iframe（默认）或 micro-app                               |
| 注入   | `user_id` / `user_token` / `theme` / `lang` / `base_url` |
| 桥 API | `getUserInfo`、`openWindow`、选人、请求代理等            |
| 菜单   | `application` / `application/admin` / `main/menu`        |
| 角标   | 聚合到侧栏 / 应用卡片                                    |

## 独立窗 / Single 路由

- `/single/task/:taskId`
- `/single/file/:codeOrFileId`
- `/single/dialog/:dialogId`
- `/single/report/*`
- `/meeting/:meetingId?/:sharekey?`

Desktop 用独立 `BrowserWindow` 加载同一 React 路由。

## 权限门禁

前端门禁只做 UX；最终以后端为准。

## 错误与反馈

- API `code !== 0` → Toast / 业务错误组件
- 网络断开 → 顶栏或 IM 状态条 + 自动重连
- 权限不足 → 只读或空态，并给出明确提示

接口细则见 [api.md](./api.md)。
