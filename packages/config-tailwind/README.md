# `@blue-dock/config-tailwind`

Tailwind CSS v4 + HeroUI styles 的样式 SSOT。

## 用法

```ts
// vite.config.ts
import { blueDockTailwind } from '@blue-dock/config-tailwind/vite';

plugins: [blueDockTailwind(), react()];
```

```ts
// main.tsx
import '@blue-dock/config-tailwind/base.css';
```

## 顺序

`tailwindcss` → `@heroui/styles` → `theme.css`（产品 accent / 字族 / scrollbar）

## 主题

根节点 `class="light|dark"` 且 `data-theme`；持久化键 `blue-dock-theme`（`light` | `dark` | `system`）由 `@blue-dock/app` 的 `ThemeProvider` 管理。
