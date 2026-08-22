import type { DialogView } from '@blue-dock/api';

/** 按列表顺序找下一条未读会话（含环绕）；无未读则 undefined */
export function findNextUnreadDialog(
  dialogs: DialogView[],
  currentId: number | undefined,
): DialogView | undefined {
  const n = dialogs.length;
  if (n === 0) return undefined;
  let start = currentId == null ? -1 : dialogs.findIndex((d) => d.id === currentId);
  if (start < 0) start = -1;
  for (let step = 1; step <= n; step++) {
    const d = dialogs[(start + step) % n]!;
    if (d.unreadCount > 0) return d;
  }
  return undefined;
}
