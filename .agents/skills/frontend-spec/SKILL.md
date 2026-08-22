---
name: frontend-spec
description: >-
  Blue Dock Web 前端 monorepo 设计、实现、重构与代码审查的统一规范。在 AI 编码助手需要构建或修改遵循
  「包边界优先」组织、顶层依赖 `api / i18n / desktop-bridge / mobile-bridge ← app（含 HeroUI）← apps/*`（config 仅
  devDependency）、  HTTP→TanStack Query / WS 补洞→Query 失效 / 壳层 UI→Zustand、Tailwind v4 + 主题变量、中英 i18n、
  安全基线（密码 RSA-OAEP / Token / 无硬编码密钥）、对接
  blue-dock-java 契约、Electron 经 desktop-bridge、Mobile 薄壳经 mobile-bridge、可维护性治理，以及功能完成后全量回归的
  React Web / Desktop / Mobile 前端时使用。
---

# Blue Dock Web 前端规范

## 如何应用本规范

> 本文档是 Web 前端的**架构边界与命名基线**——**不能替代工程判断**。应像资深前端工程师一样：先设计再实现，在边界内选择专家级方案。

对每一项非琐碎任务：

1. **架构优先，代码其次。** 先说清归属包（`api` / `i18n` / `desktop-bridge` / `app` / `apps`）、跨越边界、复用还是扩展既有原语。
2. **规则是边界，不是脚本。** 与更清晰的业务表达冲突时，优先清晰表达并显式说明偏离。
3. **扩展架构，勿模仿反模式。** 邻近文件违规时，仍产出符合规范的版本并标出不一致。
4. **选专家级方案，勿堆样板。** 勿过早 `Helper / Util / Manager`；三行相似优于过早抽象。
5. **选定前摆出权衡（2–3 句）。** 再提交最贴合既有状态流 / 平台兼容 / 可观测性的方案。
6. **严谨程度与风险匹配。** 热路径（鉴权 / 会议分享 / 上传 / Token 注入微应用）提高严谨度；系统边界严格执行安全基线。
7. **宁删勿堆。** 删死字段、过时注释、无用包装；勿给自己刚引入的东西留 `TODO`。
8. **显式假设与缺口。** 规范要求的组件 / Query hook / API 不存在时提议创建，勿默默内联。
9. **质疑静默回退。** 空 `catch`、失败当成功、鉴权失败静默跳过等须显式决策。
10. **假设审阅者更聪明。** 分支带意图；一类一责；接口路径与字段以 blue-dock-java 为准。

> 细则条文以 `.agents/rules/*.md` 为准；本 skill 提供统一工作流与渐进披露入口。改规则正文时同步更新本 skill 摘要与 references。  
> 产品与接口事实来源：`docs/`（业务）与 [`blue-dock-java/docs`](../../../../blue-dock-java/docs/README.md)（API SSOT）。

## 规则等级

| 等级                  | 含义                            |
| --------------------- | ------------------------------- |
| `MUST`（必须）        | 新项目与改动区域默认强制        |
| `RECOMMENDED`（推荐） | 优先采用；存量可渐进            |
| `OPTIONAL`（可选）    | 按业务 / 平台 / 团队 / 合规选用 |

## 工作流

1. 先按业务目标拆 feature / 包职责；禁止在 `apps/*` 内堆可共享 Query hooks / 工具；UI 用 HeroUI，勿恢复独立 ui 包。
2. 设计或改代码前，只读相关参考：
   - 架构与边界 → [references/architecture.md](references/architecture.md)
   - 命名 / 注释 / UI / 质量 → [references/coding.md](references/coding.md)
   - 鉴权 / 桌面 / 交付 → [references/security-delivery.md](references/security-delivery.md)
   - 安全基线 → [references/secure-baseline.md](references/secure-baseline.md)
   - 演进与治理 → [references/governance.md](references/governance.md)
   - 清单模板 → [references/checklists.md](references/checklists.md)
   - 示例 → [references/examples.md](references/examples.md)
3. 顶层依赖：`api` / `i18n` / `desktop-bridge` / `mobile-bridge` ← `app`（含 HeroUI）；`apps/web` · `apps/desktop` · `apps/mobile` 为壳层；`config*` 仅 devDependency。
4. 状态：HTTP → TanStack Query；WS 帧 → 失效 / 补丁 Query（或极少量本地草稿）；壳层 UI / 主题 / 草稿 → Zustand。
5. 契约类型与 `http-api` 在 `api`；UI 在 app（HeroUI / `@heroui/react`）；业务页面与 feature hooks 在 `app`。
6. 路由级页面在 `packages/app`（features / routes）；React Router `lazy()`；Web / Desktop / Mobile 共用同一套路由。
7. 样式走 **Tailwind CSS v4** + CSS 变量主题（`@blue-dock/config-tailwind`）；文案走 i18n `t()`。
8. 异步数据 UI 须处理 loading / error / empty；优先直连 HeroUI（`@heroui/react`）；错误用既有错误处理，展示后端 `message`。
9. Mutation 优先乐观更新 + 回滚 + `onSettled` 失效；Query Key **必须**工厂模式。
10. 涉及 Electron 能力前走 `desktop-bridge`；Mobile 能力走 `mobile-bridge`；无壳可降级；禁止直调 Electron / 原生 SDK。
11. 密码字段：先 `GET api/users/key/client`，RSA-OAEP 密文 + `kid` 上送；响应禁止回传 `password`；验密走服务端。
12. API 路径 / 字段 / 信封以 **blue-dock-java** 契约为准；禁止前端自造别名（如 `checkin`/`signin`→`attendance`）。
13. 构建配置 extend `@blue-dock/config*`，禁止 app 内重复造轮子；禁止随意 `eslint-disable` 压制依赖方向。
14. 改完同步 `docs/`；模块完成后对该功能**全量**回归，不只测本次改动。

## 参考导航

| 文件                                                    | 用途                           |
| ------------------------------------------------------- | ------------------------------ |
| [architecture.md](references/architecture.md)           | 包边界与分层职责               |
| [coding.md](references/coding.md)                       | 命名、注释、模型/API、UI、质量 |
| [security-delivery.md](references/security-delivery.md) | 鉴权、桌面 / 移动壳、交付      |
| [secure-baseline.md](references/secure-baseline.md)     | 密钥、敏感数据、输入边界       |
| [governance.md](references/governance.md)               | 兼容、ADR、门禁                |
| [checklists.md](references/checklists.md)               | PR / 评审 / 上线清单           |
| [examples.md](references/examples.md)                   | 示例                           |
| [index.md](references/index.md)                         | 主题导航                       |
