# 架构与分层边界

> Bun monorepo 包拓扑、依赖方向、分层职责边界。

## 目录

- [1. 目标](#1-目标)
- [2. 通用技术原则](#2-通用技术原则)
- [3. 使用方式](#3-使用方式)
- [4. 包拓扑与工程结构](#4-包拓扑与工程结构)
- [5. 模块拆分规则](#5-模块拆分规则)
- [6. 分层职责与边界](#6-分层职责与边界)

## 1. 目标

本文档作为 Blue Dock Web 前端 monorepo 的通用规范参考，聚焦包边界、依赖方向、目录组织、状态归属与交付要求。

目标如下：

- 统一包拓扑与依赖方向（三条铁律）
- 统一分层边界与职责
- 统一命名、状态、UI 与 i18n 口径
- 统一对接 blue-dock-java 的消费方式
- 统一代码质量、自检与回归口径

## 2. 通用技术原则

本文档不强制绑定特定 Vite / React 次要版本，优先约束工程规范和实现边界。版本策略见 `docs/guide/tech-stack.md`：**LTS / 最新稳定**，禁止预发布标签合入主分支。

通用原则：

- 优先沿用项目既定栈（Bun workspaces、Vite、React、TypeScript、TanStack Query、Zustand、i18next、Electron）
- 版本以 `bun.lock` 与 CI 为准；不要为了套规范强行升级
- 能通过已有 HeroUI（`@heroui/react`）、`@blue-dock/api` hooks / `http-api` 实现的能力，优先复用
- 状态、HTTP、WebSocket、主题、存储按 `docs/guide/state-and-api.md` 落地，但必须遵守分层与命名约束

编码与资源要求：

- 源码、JSON、Markdown、脚本统一使用 `UTF-8`
- 禁止提交带 BOM 或非 UTF-8 源文件

## 3. 使用方式

- 新 app / 大改造时，先看「包拓扑」「模块拆分」「分层职责」
- 日常开发或重构时，重点看 [coding.md](coding.md)
- 接入鉴权、上传、会议、微应用、桌面壳时，再读 [security-delivery.md](security-delivery.md) / [secure-baseline.md](secure-baseline.md)
- 评审、自测、提测时，看交付章节与 [checklists.md](checklists.md)

## 4. 包拓扑与工程结构

### 4.1 铁律（违反即为 Bug）

1. **`@blue-dock/api` 不得包含任何 `.tsx` / JSX / React 组件** — 只允许 `http-api`、域 API、Query hooks、WS 客户端、鉴权工具
2. **`packages/*` 不得 `import` `apps/*`** — 依赖方向单向向下
3. **UI 在 `@blue-dock/app` 内直连 HeroUI + Heroicons** — **无** `@blue-dock/ui` / `@blue-dock/app/ui` / `@gravity-ui/icons`；禁止自造通用 UI 封装

补充铁律：

4. **业务 HTTP / WS 只经 `@blue-dock/api`** — 页面禁止散落拼 URL 或自造信封解析
5. **Web / Desktop / Mobile 共享 `@blue-dock/app`** — 平台差异只经 `@blue-dock/desktop-bridge` / `@blue-dock/mobile-bridge` 或明确的 `import.meta.env`

### 4.2 依赖拓扑

```text
@blue-dock/api          @blue-dock/i18n
（HTTP/WS/hooks）         （文案 / I18nProvider）
        \                    /
         \                  /
          ─────→  @blue-dock/app  ←──── desktop-bridge / mobile-bridge
                 （路由 / features / HeroUI）
                           ↑
              apps/web · apps/desktop · apps/mobile

@blue-dock/desktop-bridge   app 与壳共用类型 / Web stub
@blue-dock/mobile-bridge    对标 desktop-bridge；见 docs/clients/mobile.md
@blue-dock/config*          仅 devDependency，不参与运行时
```

标准仓库结构：

```text
blue-dock-web/
├─ packages/
│  ├─ api/
│  ├─ i18n/
│  ├─ app/             # HeroUI 直连 + features
│  ├─ desktop-bridge/
│  ├─ mobile-bridge/
│  └─ config-eslint/   # 及 vite / tailwind 等共享 config
├─ apps/
│  ├─ web/             # Vite 浏览器壳
│  ├─ desktop/         # Electron main / preload
│  └─ mobile/          # Capacitor 薄壳
├─ docs/
├─ scripts/
└─ .agents/
```

补充规则：

- `api` / `i18n` / `desktop-bridge` / `mobile-bridge` 互不循环；类型可放在 `api` 旁路模块或独立 types 子路径
- **无**独立 `@blue-dock/ui`；UI 在 app 内用 HeroUI
- `config*` 仅构建期共享
- 禁止在 `apps/*` 定义可跨端共享的 Query hooks / 业务工具（应下沉 `api` / `app`）
- Desktop / Mobile 渲染侧加载与 Web 同一套 `@blue-dock/app`

### 4.3 App 层目录（`packages/app`）

| 目录                 | 用途                            |
| -------------------- | ------------------------------- |
| `src/routes/`        | 路由树与 lazy 页面入口          |
| `src/features/<id>/` | 按业务域（与 `docs/` 模块对齐） |
| `src/layouts/`       | 侧栏 / Tabbar / 壳布局          |
| `src/components/`    | 跨 feature 复用的组装型组件     |
| `src/stores/`        | Zustand stores（壳层 / 草稿）   |

`apps/web`、`apps/desktop`、（规划）`apps/mobile` 仅挂载、环境、壳生命周期；不堆业务页面。

## 5. 模块拆分规则

模块默认按「业务 feature」拆分（对齐 `docs/navigation|collaboration|apps|org|admin`），再在包内按职责落目录。

强制规则：

- 共享 HTTP / Query / WS → `@blue-dock/api`
- UI 基座 → HeroUI（`@heroui/react`）+ Heroicons（`@heroicons/react`）；页面级组装 → `packages/app/src/components/`（禁止通用 UI 封装桶）
- ThemeProvider / ErrorBoundary → `@blue-dock/app`；I18nProvider → `@blue-dock/i18n`
- 文案 → `@blue-dock/i18n`
- 业务页面与 feature hooks → `@blue-dock/app/features/<name>`
- 构建配置 → `@blue-dock/config*`（含 `config-eslint`：ESLint flat + Prettier 共享配置）
- 终端壳 → `apps/web` · `apps/desktop` · `apps/mobile`
- 新需求若多端复用，必须下沉；仅壳层差异可留在对应 `apps/*`
- 禁止把无关能力塞进同一个大杂烩 store / hook 或超大页面
- 禁止在 `api` 写 JSX；禁止再引入独立 `@blue-dock/ui` / `@blue-dock/app/ui` 包或桶
- 禁止在 app 壳内重复 vite / eslint / tailwind 全量配置

### 5.1 目录治理与清理

- 目录要有明确职责，不能只为「以后可能会用」而预留
- 无用目录、废弃目录、一次性调试目录应直接删除
- 禁止保留空目录、占位目录（`temp`、`tmp`、`demo`、`misc`、`backup`）
- `common` / `shared` / `utils` 只有在职责边界稳定时才允许存在
- 代码迁移后原目录不再承载职责时同步清理

## 6. 分层职责与边界

### 6.1 api 层职责

负责传输与服务端状态原语：

- 统一 `get` / `post` / `put` / `del`；信封 `{ code, message, data }`（`code === 0` 成功，`1001` 未登录）
- 域 API 与 TanStack Query hooks / Query Key 工厂
- WebSocket 客户端与帧分发（对接 java `architecture/realtime.md`）
- Token 注入、刷新/失效处理、密码加密（RSA-OAEP + `kid`）
- 上传分片协议封装（`api/upload/*`）

推荐目录：

```text
packages/api/src/
├─ client.ts           # axios / fetch + 拦截器
├─ http-api.ts
├─ auth/
├─ ws/
├─ upload/
├─ domains/            # project / task / dialog / attendance …
└─ queryKeys/
```

禁止：任何 `.tsx` / JSX；import `apps/*`；自造与契约不符的路径别名。

### 6.2 UI（在 app 内）

- **无**独立 `@blue-dock/ui` 包
- 优先直接用 `@heroui/react`；图标用 `@heroicons/react`（经 `@heroicons/react`）
- 多 feature 复用的薄壳放 `packages/app/src/components/`，经 `@heroui/react` 导出
- `ThemeProvider` / `ErrorBoundary` 在 app；`I18nProvider` 在 i18n
- Tailwind / CSS 变量主题经 `@blue-dock/config-tailwind`（含 `@heroui/styles`）

### 6.3 i18n 层职责

- 语言包与 `t()` 封装；中英（或既定语言）同步；导出 `I18nProvider`
- 禁止业务包硬编码用户可见文案绕过本层

### 6.4 app 层职责

负责业务组装：

- 路由、布局、features
- 调用 api hooks / Zustand，将数据 props 下传给 ui
- 微应用宿主桥（iframe 注入、角标聚合）
- 权限门禁（仅 UX；最终以后端为准）

禁止：在壳 `apps/*` 复制整套 feature；绕过 api 直连后端。

### 6.5 apps 壳层职责

- `apps/web`：挂载、Vite、开发代理 `/api` `/ws`、可选 PWA
- `apps/desktop`：main / preload / 多窗口；渲染复用 `@blue-dock/app`
- `apps/mobile`：（规划）薄 WebView 壳；渲染复用 `@blue-dock/app`；见 `docs/clients/mobile.md`
- 各端 `.env.*`；`envDir` 指向自身

### 6.6 desktop-bridge / mobile-bridge

- `desktop-bridge`：定义 `DesktopAPI` 类型；Web 提供 no-op / 降级 stub；禁止 `require('electron')`
- `mobile-bridge`：（规划）定义 `MobileAPI`；Web / 无壳 stub；注入 `window.blueDockMobile`；禁止业务直调原生 SDK
- Mobile **不**用 RN / Flutter 重写 UI

### 6.7 边界强制规则

| 层               | 可以                      | 禁止                                  |
| ---------------- | ------------------------- | ------------------------------------- |
| `api`            | http-api、hooks、WS、工具 | JSX、import ui/app/apps               |
| `ui`             | 组件、Provider、Storybook | import api/app、HTTP、Token           |
| `i18n`           | 文案资源与 t              | 业务副作用                            |
| `app`            | 页面、feature、组装       | 自造 API 路径、壳层 Electron/原生 API |
| `desktop-bridge` | 类型与 stub               | 业务规则                              |
| `mobile-bridge`  | （规划）类型与 stub       | 业务规则                              |
| `config*`        | 构建配置                  | 运行时代码                            |
| `apps/*`         | 挂载、环境、壳生命周期    | 可共享业务滞留壳层                    |

状态归属：

- HTTP → TanStack Query（禁止把服务端列表权威数据塞进 Zustand）
- WS 推送 → 失效 / 补丁 Query；必要时极少量本地缓冲
- 壳层 UI / 主题 / 语言 / IM 草稿 / 侧栏折叠 → Zustand（可 persist，按用户隔离）

### 6.8 违规修复速查

| 违规现象                         | 根因        | 修复                            |
| -------------------------------- | ----------- | ------------------------------- |
| `ui` import 了 `useProjectList`  | UI 耦合业务 | hook 提升到 feature，props 下传 |
| `apps/web/utils.ts` 被 app 依赖  | 工具放错层  | 移到 `api` 或 `app/lib`         |
| A ↔ B 循环引用                   | 职责未分离  | 公共类型 / 逻辑抽独立文件       |
| app 内重复 vite 全量配置         | 配置漂移    | extend `@blue-dock/config*`     |
| 页面内硬编码 `/api/project/...`  | 绕过 api    | 下沉 `packages/api`             |
| 使用 `checkin` / `signin` 作路径 | 命名违规    | 统一 `attendance`               |

### 6.9 ESLint 与循环依赖

```js
'import/no-restricted-paths': ['error', {
  zones: [
    { target: './packages/api', from: './apps' },
    { target: './packages', from: './apps' },
  ],
}]
```

循环依赖：`bun run lint:circular`（madge 或等价）。

### 6.10 桌面 / 移动壳边界

- Electron 生命周期在 `apps/desktop`；业务在 `@blue-dock/app`
- 能力经 `@blue-dock/desktop-bridge`；浏览器环境可降级、禁止崩溃
- 详见 `docs/clients/electron.md`
- Mobile 薄壳（规划）在 `apps/mobile`；能力经 `@blue-dock/mobile-bridge`；**不用** RN / Flutter 重写
- 详见 `docs/clients/mobile.md`
