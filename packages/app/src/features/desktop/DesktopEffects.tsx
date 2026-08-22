import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  previewMessageBody,
  realtimeClient,
  useCurrentUser,
  useDialogList,
  useRealtimeStatus,
  type DialogMessageView,
} from '@blue-dock/api';
import { getDesktop, isDesktopRuntime } from '@blue-dock/desktop-bridge';
import { useTranslation } from '@blue-dock/i18n';
import { useMessengerDraftStore } from '../../stores/messenger';

const DESKTOP_NOTIFY_PREF = 'blue-dock:desktop-notify-enabled';

function desktopNotifyEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(DESKTOP_NOTIFY_PREF) !== '0';
}

function isEventSilent(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  const v = data.isSilent ?? data.silence;
  if (typeof v === 'boolean') return v;
  if (v == null) return false;
  const s = String(v).trim();
  return s === '1' || s.toLowerCase() === 'true' || s.toLowerCase() === 'yes';
}

/** Electron：未读角标 + 后台新消息系统通知 + 主进程导航事件 */
export function DesktopEffects() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const me = useCurrentUser(isDesktopRuntime());
  const { connected } = useRealtimeStatus();
  const listQuery = useDialogList(connected);
  const isDialogMuted = useMessengerDraftStore((s) => s.isDialogMuted);

  useEffect(() => {
    if (!isDesktopRuntime()) return;
    const onNav = (e: Event) => {
      const path = (e as CustomEvent<string>).detail;
      if (typeof path === 'string' && path.startsWith('/')) {
        navigate(path);
      }
    };
    window.addEventListener('blue-dock:navigate', onNav);
    return () => window.removeEventListener('blue-dock:navigate', onNav);
  }, [navigate]);

  useEffect(() => {
    if (!isDesktopRuntime()) return;
    const total = (listQuery.data ?? []).reduce((sum, d) => sum + (d.unreadCount || 0), 0);
    void getDesktop().setBadge(total);
  }, [listQuery.data]);

  useEffect(() => {
    if (!isDesktopRuntime()) return;
    const myId = me.data?.userId ?? 0;
    return realtimeClient.onFrame((frame) => {
      if (frame.type !== 'dialog.message') return;
      if (!desktopNotifyEnabled()) return;
      if (typeof document !== 'undefined' && document.hasFocus() && !document.hidden) return;

      const data = frame.data as
        | {
            dialogId?: number | string;
            message?: DialogMessageView;
            isSilent?: unknown;
            silence?: unknown;
          }
        | undefined;
      if (isEventSilent(data as Record<string, unknown> | undefined)) return;

      const message = data?.message;
      const dialogId = data?.dialogId != null ? Number(data.dialogId) : NaN;
      if (!message || !Number.isFinite(dialogId) || dialogId <= 0) return;
      if (myId > 0 && message.userId === myId) return;
      if (isDialogMuted(dialogId)) return;

      const preview = previewMessageBody(message.body).trim();
      const msgId = Number(message.id) || 0;
      void getDesktop().notify({
        title: t('desktop.notifyTitle'),
        body: preview || t('desktop.notifyFallback'),
        deepLink:
          msgId > 0
            ? `/manage/messenger/${dialogId}?msg=${msgId}`
            : `/manage/messenger/${dialogId}`,
      });
    });
  }, [me.data?.userId, t, isDialogMuted]);

  return null;
}

export { DESKTOP_NOTIFY_PREF };
