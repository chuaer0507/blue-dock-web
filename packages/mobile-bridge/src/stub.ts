import type { MobileAPI, MobileOs } from './types';

function detectOsFromUa(
  ua = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): MobileOs | null {
  const lower = ua.toLowerCase();
  if (/ipad|iphone|ipod/.test(lower)) return 'ios';
  if (/macintosh/.test(lower) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) {
    return 'ios';
  }
  if (/android/.test(lower)) return 'android';
  return null;
}

/** 浏览器 / 无壳环境 no-op；getPlatform 尽量跟 UA，否则默认 ios（仅 stub） */
export const webMobileStub: MobileAPI = {
  getPlatform: () => detectOsFromUa() ?? 'ios',
  notify: () => undefined,
  setBadge: () => undefined,
  openUrl: (url) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  },
  getSafeArea: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  registerPush: () => null,
  scanQr: () => null,
};
