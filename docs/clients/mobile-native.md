# Mobile 原生工程（cap:add）

本仓库 **不提交** `apps/mobile/ios` / `android`（见 `.gitignore`）。首次在本机生成并同步。

## 前置

- macOS + Xcode（iOS）
- Android Studio + SDK（Android）
- 已 `bun install`；CocoaPods（iOS）按 Capacitor 文档安装

## 首次生成

```bash
bun run build:mobile
bun run --filter @blue-dock/mobile cap:add:ios
bun run --filter @blue-dock/mobile cap:add:android
```

之后每次 Web 变更要进壳：

```bash
bun run --filter @blue-dock/mobile cap:sync
# 或分别
bun run --filter @blue-dock/mobile cap:open:ios
bun run --filter @blue-dock/mobile cap:open:android
```

## 推送 / 角标

1. 管理端配置 App Push（`iosKey` / `androidKey` 等）
2. iOS：Apple Developer 推送证书 / Capability
3. Android：FCM（按友盟 / 厂商文档）
4. 登录后自动 `users/appPush/alias`；设置 → 通知可关
5. 角标：会话未读合计 → `@capawesome/capacitor-badge`（经 `mobile-bridge.setBadge`）

## 深链

- 自定义 scheme：`com.bluedock.app`（见 `capacitor.config.ts` `appId`）
- 示例：`com.bluedock.app://manage/messenger`
- 推送 payload 可带 `deepLink` / `url` / `path`

## 开发预览（无需原生）

```bash
bun run dev:mobile   # http://localhost:5175 ，注入 blueDockMobile
```

详见 [mobile.md](./mobile.md)。
