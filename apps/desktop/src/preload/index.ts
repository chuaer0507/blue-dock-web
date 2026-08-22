import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopAPI } from '@blue-dock/desktop-bridge';

const api: DesktopAPI = {
  getPlatform: () => {
    if (process.platform === 'darwin') return 'darwin';
    if (process.platform === 'win32') return 'win32';
    if (process.platform === 'linux') return 'linux';
    return 'web';
  },
  notify: (options) => ipcRenderer.invoke('desktop:notify', options),
  setBadge: (count) => ipcRenderer.invoke('desktop:setBadge', count),
  openWindow: (options) => ipcRenderer.invoke('desktop:openWindow', options),
};

ipcRenderer.on('desktop:navigate', (_event, path: unknown) => {
  if (typeof path !== 'string' || !path) return;
  window.dispatchEvent(new CustomEvent('blue-dock:navigate', { detail: path }));
});

contextBridge.exposeInMainWorld('desktop', api);
