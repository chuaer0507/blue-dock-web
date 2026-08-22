# `@blue-dock/app`

共享业务壳：路由、布局、features、HeroUI / Heroicons 直连。Web / Desktop / Mobile 共用。

## 目录

```
src/
  App.tsx                 # 根：HeroUI locale + Toast + Router
  index.ts                # 对外导出
  providers/              # ThemeProvider · ErrorBoundary
  utils/                  # theme · platform（useScreen / usePlatform）
  routes/                 # 数据路由 + RequireAuth
  layouts/                # ManageLayout · SettingLayout
  features/
    auth/                 # Login · Token
    setting/              # Personal（语言）· Appearance（主题）
    common/               # Placeholder · NotFound · HomeRedirect
```

## 壳层挂载

```tsx
import { ThemeProvider, App } from '@blue-dock/app';
import { I18nProvider } from '@blue-dock/i18n';
import '@blue-dock/config-tailwind/base.css';
```

## 约定

- HTTP / WS 只经 `@blue-dock/api`
- 文案走 `t()`；主题本地 `blue-dock-theme`
- 业务 feature 按 `docs/` 逐步落地；未实现路由用 `PlaceholderPage`
