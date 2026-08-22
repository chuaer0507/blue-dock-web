# 编码规范

> 命名、注释、模型 / API、UI / 主题 / i18n、状态错误处理与代码质量。

## 目录

- [1. 命名规范](#1-命名规范)
- [2. 注释规范](#2-注释规范)
- [3. 模型与 API 规范](#3-模型与-api-规范)
- [4. UI、主题与国际化](#4-ui主题与国际化)
- [5. 状态、错误与数据渲染](#5-状态错误与数据渲染)
- [6. 代码质量与可维护性规范](#6-代码质量与可维护性规范)

## 1. 命名规范

### 1.1 文件与包命名

| 类型       | 风格                      | 示例                                      |
| ---------- | ------------------------- | ----------------------------------------- |
| React 组件 | PascalCase                | `Button.tsx`、`TaskCard.tsx`              |
| Hook       | camelCase + `use`         | `useProjectList.ts`、`useTheme.ts`        |
| Zustand    | camelCase + `Store`       | `shellStore.ts`、`messengerDraftStore.ts` |
| 工具函数   | camelCase                 | `formatDate.ts`、`path.ts`                |
| 域 API     | camelCase（领域名）       | `project.ts`、`attendance.ts`             |
| 测试       | `*.test.ts` / `*.spec.ts` | `http-api-request.test.ts`                |
| 配置       | 约定名称                  | `vite.config.ts`                          |

强制规则：

- App 壳：`apps/<web|desktop>/`，包名 `@blue-dock/web` · `@blue-dock/desktop`
- Package：`packages/<name>/`，包名 `@blue-dock/<name>`
- Feature 目录与 `docs/` 模块 id 对齐：`features/messenger`、`features/attendance`（禁止 `checkin`）
- 目录名用小写英文语义词；禁止 `temp` / `misc` / `util2` / `demo`
- 无用目录、占位目录、废弃目录直接删除
- **单元测试目录**：与 `src/` 同级建 **`test/`**（固定名；禁止 `__tests__` / `tests` / `src/**/*.test.ts`）。细则见 [docs/guide/testing.md](../../../../docs/guide/testing.md)

### 1.2 类 / 符号命名

| 类型        | 风格                | 示例                             |
| ----------- | ------------------- | -------------------------------- |
| UI 组件     | PascalCase          | `Button`、`TaskCard`             |
| 页面        | PascalCase          | `ProjectBoard.tsx`、`Dialog.tsx` |
| Hook        | camelCase + `use`   | `useTaskDetail`                  |
| Store       | camelCase + `Store` | `shellStore`                     |
| API / 函数  | camelCase           | `getProjectList`、`get`/`post`   |
| 类型 / 接口 | PascalCase          | `Project`、`DialogMessage`       |
| 枚举        | PascalCase          | `TaskStatus`                     |

### 1.3 路由与环境变量

- 路由以 `docs/guide/routing.md` 为准（如 `/manage/*`、`/single/*`、`/meeting/*`）
- 页面组件：PascalCase；路由条目 `lazy()`
- 环境：各 app `.env.development` / `.env.production`；`.env.local` 不进 git
- 仅 `VITE_*` 暴露给前端；密钥不进前端
- Vite `envDir` 指向 app 自身目录

### 1.4 Query Key

- 工厂模式：`projectKeys.all()` / `projectKeys.list()` / `projectKeys.detail(id)`
- 工厂统一在 `@blue-dock/api` 域模块导出
- **禁止**内联 `['project']` 散落调用处

### 1.5 常量与枚举

- 禁止魔法字符串 / 数字散落业务代码
- WS 事件 `type` 与 java realtime 文档对齐；未知 type 安全忽略
- 禁止新建兜底大杂烩 `Constants` / `CommonConstants` / `AppConst`
- 领域命名对照 java `contract/naming.md`（全词 camelCase；`attendance` 非 `checkin`/`signin`）

### 1.6 ID 与 JSON

- 业务 id 类型按契约（多为 number 或 string，勿混用）
- 自有 API JSON 字段与类型保持 camelCase 全词一致
- 禁止模型 wire 字段回传 `password` / `passwordHash`（用 `hasPassword` 等布尔语义）

### 1.7 i18n key

- 推荐稳定英文 key + 点号分隔：`task.list.title`、`messenger.composer.send`
- 或全仓统一「中文原文即 key」——二选一，见 `docs/guide/i18n-and-theme.md`
- 歧义短词加上下文前缀，如 `[weekday].一`
- Toast / Modal 内部自动翻译时，调用方勿套双层 `t()`

## 2. 注释规范

### 2.1 默认要求

- 注释默认语言为**中文**；服务可维护性与业务可读性，勿写噪音
- 公开 API、复杂 hook、关键业务字段、非显然分支应有中文注释
- 禁止只复述代码字面含义、过期注释、空泛 `TODO 后续处理`、大段注释掉的旧代码
- 修改后必须同步检查注释是否仍正确

### 2.2 应写注释的场景

- 公开业务函数（API、上传、权限）
- 涉及 Token、存储、会议分享、微应用桥、桌面 bridge 的方法
- 可空且清空语义特殊的字段
- WS 降级、Electron 降级分支「为什么」

推荐：

```ts
/** 签到所属年月，格式 YYYY-MM，与 api/users/attendance/list 一致。 */
yearMonth: string;
```

## 3. 模型与 API 规范

### 3.1 模型

强制：

- 请求/响应类型与 blue-dock-java 契约字段对齐；禁止前端私自改名
- 跨包共享类型放在 `api`（或约定的 types 出口），禁止在 feature 内复制一份漂移

### 3.2 API 与 Query hooks

目录约定：`packages/api/src/domains/<domain>.ts`（或等价）

强制：

- HTTP 经统一 `http-api` + 鉴权拦截器
- Query Key 工厂与 `useXxx` hooks 同域文件或邻域模块
- Mutation：**乐观更新 + 回滚 + onSettled 失效**（不适合乐观的写操作至少 onSettled 失效）
- 路径写法与契约一致，例如：
  - `GET api/users/appSort` · `POST api/users/appSort/save`
  - `GET api/search/rebuild/status`
  - `api/system/apps/{catalog,installed,install,update,uninstall}`

### 3.3 Zustand

- Store 放 `packages/app/src/stores/`（或 feature 内私有 store）
- 仅壳层 UI、草稿、偏好；**不**把 HTTP 列表权威数据塞进 Zustand
- persist 白名单最小化；按 `userId` 隔离键名

## 4. UI、主题与国际化

### 4.1 优先直连 HeroUI

- 优先 `@heroui/react` + `@heroicons/react`（按需直连，勿建 `ui.ts` / `icons.ts` 桶）
- **写交互控件前**经 MCP `user-heroui-react`（`list_components` → `get_component_docs`）确认 v3 API；**MCP 不可用则查 [heroui.com](https://heroui.com)**；有等价组件则禁止原生 `<form>` / `<table>` / checkbox / `<select>`
- 必须有基础 a11y（`aria-*`、键盘、`:focus-visible`）
- 禁止自造通用封装（`LabeledInput` / `DialogShell` / `IconButton` 等）；调用点直接用 HeroUI
- 仅页面级组装可放 `packages/app/src/components/`
- 真空地带用手写 UI 时，调用处注释原因
- 详情见 `.agents/rules/components.md`

### 4.2 主题与样式

- Tailwind CSS v4 + `@heroui/styles`；`theme.css` 用 Theme Builder 导出覆盖语义变量（见 `docs/guide/i18n-and-theme.md`）
- 业务类优先：`bg-background` / `bg-surface` / `bg-accent` / `text-muted` / `shadow-surface` / `shadow-overlay` / `outline-focus`
- 禁止自造 `--color-bg` / `--color-primary` 等色桥；禁止业务硬编码难切换色值
- `darkMode`：`.dark` / `data-theme="dark"`；微应用注入 `theme` 并在变更时通知

### 4.3 国际化

- 用户可见文案禁止硬编码，走 `t()`（`@blue-dock/i18n`）
- 动态业务名（项目名、昵称）用后端字段，不进翻译文件
- 推荐 CI 检测硬编码文案

### 4.4 Provider 组装

```
api：纯逻辑（无 Provider 组件）
app：ThemeProvider / ErrorBoundary（HeroUI）
i18n：I18nProvider
apps：组装注入
```

### 4.5 错误兜底

- `ErrorBoundary`：全局捕获，提供重试 / 回登录
- API `code !== 0`：Toast / 表单展示 `message`
- `code === 1001`：清会话 → `/login`

## 5. 状态、错误与数据渲染

### 5.1 三类状态互不重叠

| 来源   | 管道                                |
| ------ | ----------------------------------- |
| HTTP   | TanStack Query                      |
| WS     | 失效 / 补丁 Query（必要时本地缓冲） |
| 客户端 | Zustand                             |

### 5.2 Query 缓存建议

| 数据            | staleTime 建议 | 说明               |
| --------------- | -------------- | ------------------ |
| 项目 / 任务列表 | 短（30s–2min） | 写后主动失效       |
| 对话消息        | 0 + WS 补洞    | 首屏 HTTP，增量 WS |
| 系统设置        | 5–10 min       | 管理端变更后失效   |
| 搜索            | 0              | 按次查询           |

具体以 feature 文档为准；有数据时静默刷新，避免整页骨架闪烁。

### 5.3 WS 降级

```
WS 在线 → 依赖推送 + 必要时手动 invalidate
WS 断线 → 关键列表可设 refetchInterval（如 5s）
WS 恢复 → 重订阅 + 关闭轮询间隔
```

顶栏 / IM 状态条展示连接态；不把内部栈抛给用户。

### 5.4 三态渲染

异步区块须显式处理 loading / error / empty / content。

### 5.5 错误信息

- 统一提取用户可读文案（优先后端 `message`）
- 禁止把 axios 内部栈、token 打进 Toast / UI

## 6. 代码质量与可维护性规范

### 6.1 单一职责与文件体量

- 一个 feature 聚焦一个业务域；页面过肥时拆 `components/`
- 超大文件应拆分；避免单文件堆砌无关 feature

### 6.2 重复模式抽离

| 模式           | 收口位置                    |
| -------------- | --------------------------- |
| UI 基座/业务壳 | HeroUI / `@heroui/react`    |
| HTTP / Query   | `@blue-dock/api`            |
| 文案           | `@blue-dock/i18n`           |
| 业务组装       | `@blue-dock/app`            |
| 桌面能力       | `@blue-dock/desktop-bridge` |
| 构建配置       | `@blue-dock/config*`        |

禁止堆全局 `CommonHelper` / `AppUtils` 大杂烩。

### 6.3 空值与集合

- 列表 / 分页默认空数组，不返回 `null`
- 单对象允许 `null`，由 UI 翻译成空错状态

### 6.4 分析与忽略

- **禁止**用 `eslint-disable` 压制依赖方向 / 架构铁律相关规则（除非有书面理由且局部最小）
- 提交前自检：命名 / 边界 / Query Key / Mutation / i18n / 密码 wire / 契约路径

### 6.5 文档同步

- 改完代码后同步 `docs/` 对应业务文档
- 接口变更先改 **blue-dock-java** 契约，再改本仓消费代码
- 铁律摘要变更改本 skill 与 `.agents/rules/`

### 6.6 可读性与评审性

- 装配保持纯粹：Page 接线，hook 编排，Api 传输，组件展示
- 重要分支必须带「为什么」注释
- AI 生成后按「边界、命名、状态、UI、i18n、安全、契约、文档」自检
