import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app, screen, type BrowserWindow, type Rectangle } from 'electron';

export const DEFAULT_WINDOW = {
  width: 1280,
  height: 800,
  minWidth: 960,
  minHeight: 640,
} as const;

export type WindowState = {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
};

function statePath(): string {
  return join(app.getPath('userData'), 'window-state.json');
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function clampSize(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(DEFAULT_WINDOW.minWidth, Math.round(width)),
    height: Math.max(DEFAULT_WINDOW.minHeight, Math.round(height)),
  };
}

/** 确保坐标落在某块显示器工作区内；越界则回到居中默认尺寸 */
function sanitize(state: WindowState): WindowState {
  const size = clampSize(state.width, state.height);
  if (!isFiniteNumber(state.x) || !isFiniteNumber(state.y)) {
    return { ...size, isMaximized: Boolean(state.isMaximized) };
  }

  const displays = screen.getAllDisplays();
  const visible = displays.some((d) => {
    const b = d.workArea;
    return (
      state.x! + size.width > b.x &&
      state.x! < b.x + b.width &&
      state.y! + size.height > b.y &&
      state.y! < b.y + b.height
    );
  });

  if (!visible) {
    return { ...size, isMaximized: Boolean(state.isMaximized) };
  }

  return {
    ...size,
    x: Math.round(state.x!),
    y: Math.round(state.y!),
    isMaximized: Boolean(state.isMaximized),
  };
}

/** 从未设置过则返回默认大小（无坐标，由系统居中） */
export function loadWindowState(): WindowState {
  try {
    const raw = readFileSync(statePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<WindowState>;
    if (!isFiniteNumber(parsed.width) || !isFiniteNumber(parsed.height)) {
      return { width: DEFAULT_WINDOW.width, height: DEFAULT_WINDOW.height };
    }
    return sanitize({
      width: parsed.width,
      height: parsed.height,
      x: parsed.x,
      y: parsed.y,
      isMaximized: parsed.isMaximized,
    });
  } catch {
    return { width: DEFAULT_WINDOW.width, height: DEFAULT_WINDOW.height };
  }
}

export function saveWindowState(state: WindowState): void {
  const next = sanitize(state);
  const file = statePath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(next), 'utf8');
}

export function captureWindowState(win: BrowserWindow): WindowState {
  const isMaximized = win.isMaximized();
  // 最大化时 getBounds 是全屏工作区，保存 maximize 前的 normal 尺寸
  const bounds: Rectangle = isMaximized ? win.getNormalBounds() : win.getBounds();
  return {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized,
  };
}

/** 监听 resize/move/maximize，防抖写入 userData */
export function trackWindowState(win: BrowserWindow): void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const persist = () => {
    if (win.isDestroyed()) return;
    saveWindowState(captureWindowState(win));
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(persist, 300);
  };

  win.on('resize', schedule);
  win.on('move', schedule);
  win.on('maximize', schedule);
  win.on('unmaximize', schedule);
  win.on('close', () => {
    if (timer) clearTimeout(timer);
    persist();
  });
}
