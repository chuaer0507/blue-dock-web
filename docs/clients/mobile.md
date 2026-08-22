# Mobile 薄壳（mobile）

壳：`apps/mobile` · 桥：`@blue-dock/mobile-bridge` · 前端状态：wip（角标 / 推送 alias / 扫一扫）

## 策略

- Capacitor（或等价）WebView 加载同一套 `@blue-dock/app`。
- 禁止用 RN / Flutter 重写业务 UI。
- 原生 `ios/` / `android/` 本地 `cap:add`（不强制进 git）。
- 安全区、Tabbar、侧滑返回；竖屏 Tabbar。
- **推送**：登录后自动 `users/appPush/alias`；设置 → 通知可关；`MobileEffects` 同步未读角标。
- **时段静音**：设置 → 通知（仅移动）；本地 `HH:mm` 每日循环（可跨午夜）；静音内移除本机推送别名，应用内消息仍到；每分钟检测边界并重同步。
- **扫一扫**：应用中心入口 → `/manage/scan`；确认桌面登录二维码（`login/qrCode?type=confirm`）；`BarcodeDetector` / 手输。

## 相关

- [mobile-native.md](./mobile-native.md) — 原生工程 runbook
- [clients.md](./clients.md)
