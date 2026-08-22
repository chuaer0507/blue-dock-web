/** Electron preload 暴露给渲染进程的能力（Web 用 stub 降级） */
export type DesktopPlatform = 'web' | 'darwin' | 'win32' | 'linux';

export type DesktopNotifyOptions = {
  title: string;
  body?: string;
  deepLink?: string;
};

export type DesktopOpenWindowOptions = {
  path: string;
  width?: number;
  height?: number;
};

export type DesktopAPI = {
  getPlatform: () => DesktopPlatform;
  notify: (options: DesktopNotifyOptions) => Promise<void> | void;
  setBadge: (count: number) => Promise<void> | void;
  openWindow: (options: DesktopOpenWindowOptions) => Promise<void> | void;
  getPath?: (name: 'userData' | 'downloads' | 'temp') => Promise<string>;
  setAutoLaunch?: (enabled: boolean) => Promise<void>;
  getAutoLaunch?: () => Promise<boolean>;
};

declare global {
  interface Window {
    desktop?: DesktopAPI;
  }
}

export {};
