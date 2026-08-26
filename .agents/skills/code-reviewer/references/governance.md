# 演进与治理

> 兼容性、废弃策略、文档 / ADR、质量门禁与评审。

## 目录

- [1. 规则等级说明](#1-规则等级说明)
- [2. 兼容性与演进策略](#2-兼容性与演进策略)
- [3. Feature 文档与 ADR](#3-feature-文档与-adr)
- [4. 静态检查与自动化门禁](#4-静态检查与自动化门禁)
- [5. 评审与规范治理](#5-评审与规范治理)

## 1. 规则等级说明

- `必须`：默认要求，尤其适用于共享包、对外契约变更、鉴权与高风险改动
- `推荐`：优先采用，存量可结合成本逐步补齐
- `可选`：仅在复杂度、合规或协作成本达到阈值时启用

## 2. 兼容性与演进策略

### 2.1 对外契约稳定性

- 与 **blue-dock-java** 约定的 URL、JSON 字段、WS `type`、环境变量名、Storage key 均视为契约
- 修改 API 前先改 java 仓文档与实现，再改本仓
- 能追加字段解决的问题，不要优先破坏式改名或改语义
- 删除字段、改枚举语义时，必须先做兼容方案

### 2.2 废弃策略

- 需要下线的路由、hook、组件、i18n key、Storage key 先标记废弃再移除
- 废弃至少说明：原因、替代方案、预计移除时间
- 兼容期内旧逻辑与新逻辑边界清晰
- 命名废弃示例：`checkin` / `signin` → `attendance`

### 2.3 双端演进

- 共享包变更必须考虑 Web + Desktop 编译与行为
- 持久化结构变更须有读写兼容或清理策略
- Electron 大版本滚动遵循 `docs/guide/tech-stack.md`（最新稳定线）

## 3. Feature 文档与 ADR

### 3.1 docs 同步（必须）

- 代码改完后同步 `docs/` 对应业务文档
- 重要业务 feature `必须` 在 `docs/` 有对应说明
- 文档至少覆盖：目标、主流程、关键 API（链到 java）、风险点

可复用 [checklists.md](checklists.md) 中的模板。

### 3.2 ADR

以下场景 `必须` 补 ADR（可放在 `docs/guide/adr/`）：

- 包边界 / 依赖方向调整
- 状态管理范式切换（Query vs Zustand、WS 策略）
- 微应用宿主 / 桌面 bridge 架构调整
- 核心第三方库选型（状态库、桌面桥等）
- 破坏性契约消费变更

ADR 至少说明：背景、决策、备选、取舍、影响范围、后续约束。

普通局部重构、命名微调、无跨包影响的实现替换，`可选` ADR。

## 4. 静态检查与自动化门禁

### 4.1 最低门禁（必须）

```bash
bun run typecheck
bun run lint
bun run lint:circular
bun run test
```

涉及时额外：

```bash
bun run build
bun run e2e
```

### 4.2 推荐检查项

- 禁止 `api` 含 JSX；禁止 `packages` import `apps`；禁止恢复独立 `@blue-dock/ui` 包
- 禁止新增无障碍的硬编码用户文案（须 `t()`）
- 禁止内联 Query Key；禁止可乐观的 Mutation 缺回滚 / 失效
- 禁止用 eslint-disable 压制依赖方向
- 禁止密码明文上送 / 模型含 wire password（生产路径）
- 禁止使用已废弃领域名 `checkin` / `signin` 作为 API 路径或 feature id

### 4.3 自动化校验思路

- PR / main CI：typecheck → lint → circular → test → build（+ e2e 按需）
- 可对依赖方向、i18n 硬编码、敏感日志关键字做规则扫描
- 对 docs / ADR / 回归清单按适用范围做「是否存在」门禁

### 4.4 仓库卫生与 GitIgnore

- 维护与 Bun / Vite / Electron / IDE 匹配的 `.gitignore`
- 默认不得提交：`node_modules/`、`dist/`、`.env.local`、真密钥、IDE 本地文件、`.DS_Store`、覆盖率临时物、抓包原文
- 无用目录应直接删除，不要依赖 ignore 长期留历史垃圾

## 5. 评审与规范治理

### 5.1 评审关注点

代码评审 `必须` 至少检查：

1. 包边界与依赖方向是否清晰。
2. 命名、路由、领域 id 是否符合规范（含 attendance）。
3. 状态归属（Query / Zustand / WS）是否正确。
4. UI：组件复用、主题、a11y、空错状态。
5. i18n 是否同步。
6. 安全：密码、Token、敏感日志、微应用桥。
7. 是否对齐 blue-dock-java 契约；文档是否同步。
8. 是否引入兼容性或桌面降级风险。

### 5.2 规范维护方式

- 新规则优先更新 `.agents/rules/`，并同步本 skill 摘要 / references
- 同一问题多次返工时，抽象成明确规则写入文档
- 文档变更后，评审清单与 CI 尽量同步

### 5.3 AI 协作治理

- AI 生成代码后，`必须` 按「边界、命名、状态、UI、i18n、安全、契约、文档」自检
- 修改已有代码时，`必须` 判断是否更新 docs / i18n / 回归范围
- 高风险链路 `推荐` 附带关键约束说明
- 可直接复用 [checklists.md](checklists.md) 的 PR 与评审清单
- 行为方式遵守 `rules/behavior.md`
