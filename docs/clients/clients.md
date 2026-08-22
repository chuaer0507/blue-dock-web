# 多端客户端（clients）

一套 `@blue-dock/app`，六端输出。

| 端      | 壳             | 说明                                        |
| ------- | -------------- | ------------------------------------------- |
| Web     | `apps/web`     | Vite；代理 `/api` `/ws`                     |
| Desktop | `apps/desktop` | Electron；见 [electron.md](./electron.md)   |
| Mobile  | `apps/mobile`  | Capacitor 薄壳；见 [mobile.md](./mobile.md) |

## 运行时探测

- `usePlatform()`：`web` | `desktop` | `mobile`
- `useScreen()`：`navMode` = `sidebar` | `tabbar`（竖屏或宽度 ≤576）

## 挂载

```tsx
import { ThemeProvider, App } from '@blue-dock/app';
import { I18nProvider } from '@blue-dock/i18n';
import '@blue-dock/config-tailwind/base.css';
```

平台差异只经 `desktop-bridge` / `mobile-bridge`。
