---
description: 创建或补齐壳应用
argument-hint: <name>
---

调用 `create-app` 技能，在 `apps/$ARGUMENTS/` 下创建或补齐壳应用。

按照 [architecture.md](../rules/architecture.md)，新壳需要：

- package.json 命名为 `@blue-dock/$ARGUMENTS`
- 依赖 `@blue-dock/app`、`api`、`i18n`、按需的 bridge
- vite / eslint / tsconfig extend `@blue-dock/config*`
- 业务仍放在 `packages/app`，壳保持薄

设计前阅读 [architecture.md](../rules/architecture.md)；跨端安全边界按 `security-delivery` 技能执行。
