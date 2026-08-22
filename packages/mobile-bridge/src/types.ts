/** 原生移动壳注入能力（Web / 无壳用 stub 降级） */

export type MobileOs = 'ios' | 'android';

export type MobileNotifyOptions = {
  title: string;
  body?: string;
  deepLink?: string;
};

export type MobileSafeArea = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type MobileAPI = {
  getPlatform: () => MobileOs;
  notify: (options: MobileNotifyOptions) => Promise<void> | void;
  setBadge: (count: number) => Promise<void> | void;
  /** 外链或应用内深链；壳内应走系统浏览器 / 原生路由 */
  openUrl: (url: string) => Promise<void> | void;
  getSafeArea: () => MobileSafeArea | Promise<MobileSafeArea>;
  /** 注册推送 token；对齐 java app-push */
  registerPush?: () => Promise<string | null> | string | null;
  /** 扫二维码；返回原始字符串，取消/失败为 null */
  scanQr?: () => Promise<string | null> | string | null;
};

declare global {
  interface Window {
    /** 原生壳注入；未注入时走 Web 响应式 */
    blueDockMobile?: MobileAPI;
  }
}

export {};
