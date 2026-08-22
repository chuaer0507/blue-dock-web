import { Capacitor } from '@capacitor/core';
import type { MobileAPI, MobileOs, MobileSafeArea } from '@blue-dock/mobile-bridge';

/** 解析壳 OS：原生 Capacitor → UA → 默认 ios（本包为移动壳预览） */
export function resolveMobileOs(
  ua = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): MobileOs {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios' || platform === 'android') return platform;

  const lower = ua.toLowerCase();
  if (/ipad|iphone|ipod/.test(lower)) return 'ios';
  if (/macintosh/.test(lower) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) {
    return 'ios';
  }
  if (/android/.test(lower)) return 'android';
  return 'ios';
}

function readCssSafeArea(): MobileSafeArea {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const probe = (side: 'top' | 'right' | 'bottom' | 'left') => {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.visibility = 'hidden';
    el.style.padding = `env(safe-area-inset-${side})`;
    document.body.appendChild(el);
    const value = Number.parseFloat(getComputedStyle(el).padding);
    el.remove();
    return Number.isFinite(value) ? value : 0;
  };
  return {
    top: probe('top'),
    right: probe('right'),
    bottom: probe('bottom'),
    left: probe('left'),
  };
}

/**
 * 实现 `MobileAPI`：优先 Capacitor 插件，缺失时降级（禁止抛错）。
 * 本壳启动时注入 `window.blueDockMobile`，使 `isMobileRuntime()` 为 true。
 */
export function createMobileApi(): MobileAPI {
  return {
    getPlatform: () => resolveMobileOs(),

    async notify({ title, body }) {
      if (!Capacitor.isPluginAvailable('LocalNotifications')) return;
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permission = await LocalNotifications.checkPermissions();
        if (permission.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') return;
        }
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now() % 2_147_483_647,
              title,
              body: body ?? '',
            },
          ],
        });
      } catch {
        // 插件不可用或权限拒绝时静默降级
      }
    },

    async setBadge(count) {
      if (!Capacitor.isNativePlatform()) return;
      const n = Math.max(0, Math.min(99, Math.floor(count)));
      try {
        const { Badge } = await import('@capawesome/capacitor-badge');
        if (n <= 0) {
          await Badge.clear();
        } else {
          await Badge.set({ count: n });
        }
      } catch {
        // 插件未装或权限不足时忽略
      }
    },

    async openUrl(url) {
      if (Capacitor.isPluginAvailable('Browser')) {
        try {
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ url });
          return;
        } catch {
          // fall through
        }
      }
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },

    getSafeArea(): MobileSafeArea {
      return readCssSafeArea();
    },

    async registerPush() {
      if (!Capacitor.isPluginAvailable('PushNotifications')) return null;
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const permission = await PushNotifications.checkPermissions();
        if (permission.receive !== 'granted') {
          const req = await PushNotifications.requestPermissions();
          if (req.receive !== 'granted') return null;
        }
        await PushNotifications.register();
        return await new Promise<string | null>((resolve) => {
          const handle = PushNotifications.addListener('registration', (token) => {
            void handle.then((h) => h.remove());
            resolve(token.value);
          });
          PushNotifications.addListener('registrationError', () => {
            resolve(null);
          });
          // 原生未回调时超时
          setTimeout(() => resolve(null), 8_000);
        });
      } catch {
        return null;
      }
    },

    async scanQr() {
      // 原生扫码插件可选；默认由应用内 ScanPage（BarcodeDetector / 手输）处理
      return null;
    },
  };
}

/** 注入桥；幂等 */
export function injectMobileBridge(api: MobileAPI = createMobileApi()): MobileAPI {
  if (typeof window !== 'undefined') {
    window.blueDockMobile = api;
  }
  return api;
}
