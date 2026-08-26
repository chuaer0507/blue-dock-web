---
description: 在 @blue-dock/api 中创建 TanStack Query hook
argument-hint: <domain>
---

调用 `create-hook` 技能，在 `packages/api/src/domains/` 下创建 `$ARGUMENTS.ts`。

按照 [state.md](../rules/state.md) 生成 Query Key 工厂 + 读 hook + 写 hook（含乐观更新 + 回滚）。

先确认路径已在 blue-dock-java 契约落地。
