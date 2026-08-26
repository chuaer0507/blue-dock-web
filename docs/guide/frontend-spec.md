# 前端工程规范（入口）

前端规范已按职责拆分，避免由一个泛化 skill 兜底所有工作。包边界、状态、组件、命名与 i18n 以 [`.agents/rules/`](../../.agents/rules/) 为准；URL、字段与信封以 **blue-dock-java** 契约为准；产品能力以 `docs/` 为准。

| 需求 | 入口 |
| --- | --- |
| 包边界与分层 | [architecture.md](../../.agents/rules/architecture.md) / [architecture.md](./architecture.md) |
| 状态、HTTP、WS | [state.md](../../.agents/rules/state.md) / [state-and-api.md](./state-and-api.md) |
| UI、主题、a11y | [components.md](../../.agents/rules/components.md) / [i18n-and-theme.md](./i18n-and-theme.md) |
| 命名、测试与契约 | [naming.md](../../.agents/rules/naming.md) / [testing.md](./testing.md) / [api.md](./api.md) |
| 代码评审、ADR、质量门禁 | [code-reviewer](../../.agents/skills/code-reviewer/SKILL.md) |
| 鉴权、敏感数据、上传、微应用和跨端交付 | [security-delivery](../../.agents/skills/security-delivery/SKILL.md) |

功能完成后按风险执行 typecheck、lint、循环依赖检测、测试以及需要时的 build / E2E，并完成相关链路的全量回归。
