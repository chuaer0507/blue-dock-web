import { Capacitor } from '@capacitor/core';

/** 状态栏样式（仅原生）；失败静默 */
export async function setupMobileStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!Capacitor.isPluginAvailable('StatusBar')) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Default });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    // ignore
  }
}
