import { useEffect, useRef } from 'react';
import { useCurrentUser, useDialogList, useRealtimeStatus } from '@blue-dock/api';
import { getMobile, isMobileRuntime } from '@blue-dock/mobile-bridge';
import { readPushPref, syncMobilePushAlias } from '../../utils/app-push-alias';
import { isInQuietHours } from '../../utils/quiet-hours';

/** 移动壳：未读角标 + 登录后推送 alias 同步（含时段静音边界） */
export function MobileEffects() {
  const me = useCurrentUser(isMobileRuntime());
  const { connected } = useRealtimeStatus();
  const listQuery = useDialogList(isMobileRuntime() ? connected : undefined);
  const quietRef = useRef(isInQuietHours());

  useEffect(() => {
    if (!isMobileRuntime()) return;
    const total = (listQuery.data ?? []).reduce((sum, d) => sum + (d.unreadCount || 0), 0);
    void getMobile().setBadge(total);
  }, [listQuery.data]);

  useEffect(() => {
    if (!isMobileRuntime()) return;
    if (!me.data?.userId) return;
    void syncMobilePushAlias(readPushPref()).catch(() => undefined);
  }, [me.data?.userId]);

  useEffect(() => {
    if (!isMobileRuntime()) return;
    if (!me.data?.userId) return;
    const tick = () => {
      const quiet = isInQuietHours();
      if (quiet === quietRef.current) return;
      quietRef.current = quiet;
      void syncMobilePushAlias(readPushPref()).catch(() => undefined);
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [me.data?.userId]);

  return null;
}
