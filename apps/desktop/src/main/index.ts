import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  ipcMain,
  nativeImage,
  shell,
  type BrowserWindowConstructorOptions,
} from 'electron';
import { join } from 'node:path';
import { DEFAULT_WINDOW, loadWindowState, trackWindowState } from './window-state';

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow: BrowserWindow | null = null;
const childWindows = new Set<BrowserWindow>();
let tray: Tray | null = null;
let quitting = false;

/** 16×16 占位（无外部图标资源） */
const TRAY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALElEQVQ4T2NkYGD4z0AEYBxVMFRg1AAGA0YGBgYGRgYGhv8MDAz/GRgYGBgYGACZGAPd1uY0OwAAAABJRU5ErkJggg==';

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function windowOpts(size?: {
  width?: number;
  height?: number;
}): BrowserWindowConstructorOptions {
  return {
    width: size?.width ?? 960,
    height: size?.height ?? 720,
    minWidth: 640,
    minHeight: 480,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };
}

function loadInto(win: BrowserWindow, path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(new URL(normalized, process.env.ELECTRON_RENDERER_URL).toString());
    return;
  }
  const filePath = join(__dirname, '../renderer/index.html');
  void win.loadFile(filePath).then(() => {
    if (normalized !== '/') {
      win.webContents.send('desktop:navigate', normalized);
    }
  });
}

function createMainWindow() {
  const saved = loadWindowState();

  const win = new BrowserWindow({
    ...windowOpts({
      width: saved.width,
      height: saved.height,
    }),
    ...(isFiniteNumber(saved.x) && isFiniteNumber(saved.y) ? { x: saved.x, y: saved.y } : {}),
    minWidth: DEFAULT_WINDOW.minWidth,
    minHeight: DEFAULT_WINDOW.minHeight,
  });

  if (saved.isMaximized) win.maximize();
  trackWindowState(win);

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('close', (e) => {
    if (quitting || process.platform !== 'darwin') return;
    e.preventDefault();
    win.hide();
  });

  loadInto(win, '/preload');
  mainWindow = win;
  return win;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_PNG_BASE64}`);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('Blue Dock');
  tray.on('click', () => showMainWindow());
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => showMainWindow(),
      },
      {
        label: 'Hide',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function openChildWindow(path: string, size?: { width?: number; height?: number }) {
  const win = new BrowserWindow(windowOpts(size));
  childWindows.add(win);
  win.on('closed', () => childWindows.delete(win));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  loadInto(win, path);
  return win;
}

function registerIpc() {
  ipcMain.handle('desktop:notify', (_e, options: { title: string; body?: string; deepLink?: string }) => {
    if (!Notification.isSupported()) return;
    const n = new Notification({
      title: options.title,
      body: options.body ?? '',
    });
    n.on('click', () => {
      if (options.deepLink) {
        showMainWindow();
        mainWindow?.webContents.send('desktop:navigate', options.deepLink);
      } else {
        showMainWindow();
      }
    });
    n.show();
  });

  ipcMain.handle('desktop:setBadge', (_e, count: number) => {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setBadge(n > 0 ? String(n > 99 ? '99+' : n) : '');
    }
    if (typeof app.setBadgeCount === 'function') {
      app.setBadgeCount(n);
    }
  });

  ipcMain.handle(
    'desktop:openWindow',
    (_e, options: { path: string; width?: number; height?: number }) => {
      openChildWindow(options.path, { width: options.width, height: options.height });
    },
  );
}

app.whenReady().then(() => {
  registerIpc();
  createMainWindow();
  createTray();

  app.on('activate', () => {
    showMainWindow();
  });
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
