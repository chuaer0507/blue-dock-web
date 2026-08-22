import { getDesktop, isDesktopRuntime } from '@blue-dock/desktop-bridge';

/** 打开应用内路径：桌面走独立窗，其它端用新标签 */
export function openAppPath(
  path: string,
  opts?: { width?: number; height?: number },
): void {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (isDesktopRuntime()) {
    void getDesktop().openWindow({
      path: normalized,
      width: opts?.width,
      height: opts?.height,
    });
    return;
  }
  const url = `${window.location.origin}${normalized}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
