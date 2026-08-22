import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 薄壳配置。
 * 首次生成原生工程：`bun run --filter @blue-dock/mobile cap:add:ios|android`
 * 之后同步 Web 产物：`bun run --filter @blue-dock/mobile cap:sync`
 */
const config: CapacitorConfig = {
  appId: 'com.bluedock.app',
  appName: 'Blue Dock',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Badge: {
      persist: true,
      autoClear: false,
    },
  },
};

export default config;
