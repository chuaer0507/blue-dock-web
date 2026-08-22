import type { DesktopAPI } from './types';
import { webDesktopStub } from './stub';

/** 读取 preload 注入的 API；缺省回退 Web stub */
export function getDesktop(): DesktopAPI {
  if (typeof window !== 'undefined' && window.desktop) {
    return window.desktop;
  }
  return webDesktopStub;
}

export function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean(window.desktop);
}
