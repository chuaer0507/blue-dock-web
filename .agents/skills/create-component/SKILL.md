---
name: create-component
description: 说明何时直接用 HeroUI；仅在确有跨 feature 页面组装需求时才在 app/components 落文件
---

# 创建 UI 组件

设计前可先扫 [frontend-spec](../frontend-spec/SKILL.md) 与 `rules/components.md`。

## 何时新建

- **优先**：直接用 `@heroui/react`（Button / Modal / Form / TextField / Select / Table / Switch…）与 `@heroicons/react`（如 `24/outline`）
- **写 UI 前**：用 HeroUI MCP（`user-heroui-react` → `list_components` / `get_component_docs`）确认组件与 API；**MCP 连不上则查 [heroui.com](https://heroui.com)**；有则直连，无合适组件才原生
- **不要**再建 `ui.ts` / `icons.ts` 桶，也不要写通用薄包装（`LabeledInput` / `DialogShell` / `IconButton`）
- **仅当**：确有跨 feature 的页面级组装且无法用 HeroUI 原语表达时，才在 `packages/app/src/components/` 增加文件（由 feature 直接 import，不经桶导出）

## 检查清单

- [ ] 是否本可直接用 HeroUI / Heroicons？（能则不要新建）
- [ ] 是否已用 MCP（或 heroui.com）核对组件存在与用法？
- [ ] 若新建：数据通过 props？回调用 `onXxx`？
- [ ] 有无障碍属性？
- [ ] **未**恢复 `@blue-dock/app/ui` / `ui.ts`

## 文件位置（仅必要时）

```
packages/app/src/components/<ComponentName>.tsx
```

## 完成后

1. `bun run --filter @blue-dock/app typecheck`
2. `bun run --filter @blue-dock/app lint`
