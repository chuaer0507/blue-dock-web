import type { MobileAPI } from './types';
import { webMobileStub } from './stub';

/** 读取原生壳注入的 API；缺省回退 Web stub */
export function getMobile(): MobileAPI {
  if (typeof window !== 'undefined' && window.blueDockMobile) {
    return window.blueDockMobile;
  }
  return webMobileStub;
}

/** 是否原生移动壳（有 `window.blueDockMobile`） */
export function isMobileRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean(window.blueDockMobile);
}
