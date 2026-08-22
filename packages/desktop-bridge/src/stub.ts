import type { DesktopAPI } from './types';

/** 浏览器环境 no-op 实现 */
export const webDesktopStub: DesktopAPI = {
  getPlatform: () => 'web',
  notify: () => undefined,
  setBadge: () => undefined,
  openWindow: ({ path }) => {
    if (typeof window === 'undefined') return;
    const url = /^https?:\/\//i.test(path)
      ? path
      : `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  },
};
