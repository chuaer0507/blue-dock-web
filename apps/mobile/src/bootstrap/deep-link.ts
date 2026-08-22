import { Capacitor } from '@capacitor/core';

/**
 * 从自定义 scheme / https 深链取出应用内路径。
 * 例：`com.bluedock.app://manage/messenger` → `/manage/messenger`
 */
export function pathFromDeepLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    const combined = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (
      combined.startsWith('/manage') ||
      combined.startsWith('/login') ||
      combined.startsWith('/meeting')
    ) {
      return combined;
    }
    // scheme 无 host 时 pathname 可能是 //manage/...
    const stripped = combined.replace(/^\/\//, '/');
    if (
      stripped.startsWith('/manage') ||
      stripped.startsWith('/login') ||
      stripped.startsWith('/meeting')
    ) {
      return stripped;
    }
    // host 当路径首段：bluedock.app/manage/...
    if (parsed.host && !parsed.host.includes('.')) {
      const viaHost = `/${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
      if (viaHost.startsWith('/manage') || viaHost.startsWith('/login')) return viaHost;
    }
  } catch {
    return null;
  }
  return null;
}

/** 监听深链并跳转；仅原生 */
export async function setupMobileDeepLinks(): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  if (!Capacitor.isPluginAvailable('App')) return () => undefined;

  try {
    const { App } = await import('@capacitor/app');
    const handle = await App.addListener('appUrlOpen', ({ url }) => {
      const path = pathFromDeepLink(url);
      if (!path) return;
      window.location.assign(path);
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}
