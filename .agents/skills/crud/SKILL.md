---
name: crud
description: 为新业务实体生成完整 CRUD（api hooks → app feature 页面 → 路由）
---

# 生成 CRUD

你是 Blue Dock monorepo 的 CRUD 脚手架专家。用户提供实体名（如 `Report`），可选字段列表，按项目规则生成完整增删改查代码。

**先确认** blue-dock-java 契约已有对应 REST；没有则先补后端文档/接口，再生成前端。

## 流程概览

```
api/domains/<entity>.ts  →  app/features/<entity>/  →  routes 注册  →  docs/ 同步
```

## 步骤 1：Query Hooks

按 `create-hook` 技能在 `packages/api/src/domains/<entity>.ts` 中创建：

- `use<Entity>List()` — 分页列表
- `use<Entity>(id)` — 单条详情
- `useCreate<Entity>()` — 创建
- `useUpdate<Entity>()` — 更新
- `useDelete<Entity>()` — 删除

每个 mutation 含乐观更新 + 回滚（适用时）。从 `@blue-dock/api` 导出。

## 步骤 2：Feature 页面

```tsx
// packages/app/src/features/<entity>/pages/<Entity>List.tsx
import { use<Entity>List, useCreate<Entity>, useUpdate<Entity>, useDelete<Entity> } from '@blue-dock/api';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@heroui/react';

export function <Entity>ListPage() {
  const { t } = useTranslation('<entity>');
  const { data, isLoading, isError, refetch } = use<Entity>List();
  // loading / error / empty / content
  // 列表 + Modal 表单 + 删除确认
}
```

## 步骤 3：路由

在 `packages/app` 路由树按 `docs/guide/routing.md` 注册 `lazy()` 页面。

## 约定

- Feature id 与 `docs/` 模块对齐；签到用 `attendance`
- 表单控件优先 HeroUI（`@heroui/react`）；提交用 `Form`
- 所有文案走 `t()`，不用硬编码

## 遵守的规则（审查清单）

- [architecture.md](../../rules/architecture.md) — hooks 在 api，页面在 app，UI 直连 HeroUI
- [state.md](../../rules/state.md) — 服务端状态用 TanStack Query，不塞 Zustand
- [components.md](../../rules/components.md) — 优先 HeroUI，禁止自造封装
- [naming.md](../../rules/naming.md) — 命名与契约
- [i18n.md](../../rules/i18n.md) — 文案走 t()
