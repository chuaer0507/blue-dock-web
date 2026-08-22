---
description: 优先直连 HeroUI；仅必要时在 app/components 落页面级组装
---

调用 `create-component` 技能。优先直接使用 `@heroui/react` / `@heroicons/react`。

仅当确有跨 feature 页面级组装需求时，才在 `packages/app/src/components/` 下创建 `$ARGUMENTS.tsx`（由调用方直接 import）。**不要**恢复 `packages/app/src/ui.ts` / `@blue-dock/app/ui` 桶导出。
