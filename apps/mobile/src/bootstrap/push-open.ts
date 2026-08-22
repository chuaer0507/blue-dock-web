import { Capacitor } from '@capacitor/core';
import { pathFromDeepLink } from './deep-link';

type PushPayload = {
  deepLink?: string;
  url?: string;
  path?: string;
  title?: string;
  body?: string;
};

function pathFromPushData(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const raw =
    (typeof data.deepLink === 'string' && data.deepLink) ||
    (typeof data.url === 'string' && data.url) ||
    (typeof data.path === 'string' && data.path) ||
    '';
  if (!raw) return null;
  if (raw.startsWith('/')) return raw;
  return pathFromDeepLink(raw);
}

/** 点击系统推送通知时跳转应用内路径 */
export async function setupPushNotificationOpen(): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  if (!Capacitor.isPluginAvailable('PushNotifications')) return () => undefined;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const handle = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (event) => {
        const data = event.notification.data as PushPayload & Record<string, unknown>;
        const path = pathFromPushData(data);
        if (path) window.location.assign(path);
      },
    );
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}

/**
 * 前台收到推送：用 LocalNotifications / bridge.notify 展示，避免静默丢失。
 */
export async function setupPushNotificationReceived(): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  if (!Capacitor.isPluginAvailable('PushNotifications')) return () => undefined;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const handle = await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        const title = notification.title ?? '';
        const body = notification.body ?? '';
        if (!title && !body) return;
        const data = notification.data as PushPayload & Record<string, unknown>;
        void window.blueDockMobile?.notify({
          title: title || 'Blue Dock',
          body,
          deepLink: pathFromPushData(data) ?? undefined,
        });
      },
    );
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}
