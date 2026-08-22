---
description: 为新实体生成完整 CRUD（api + app feature）
argument-hint: <EntityName>
---

调用 `crud` 技能，为 `$ARGUMENTS` 实体生成完整 CRUD 流程：

1. `packages/api/src/domains/<entity>.ts` — Query hooks
2. `packages/app/src/features/<entity>/` — 页面与组装
3. 路由注册（`docs/guide/routing.md`）
4. 同步 `docs/` 与 i18n

按照 [architecture.md](../rules/architecture.md)、[state.md](../rules/state.md)、[components.md](../rules/components.md) 生成。
