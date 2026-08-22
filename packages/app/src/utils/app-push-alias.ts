import { upsertAppPushAlias, removeAppPushAlias, type AppPushPlatform } from '@blue-dock/api';
import { getMobile, isMobileRuntime } from '@blue-dock/mobile-bridge';
import { isInQuietHours } from './quiet-hours';

export const PUSH_PREF_KEY = 'blue-dock:app-push-enabled';
export const PUSH_ALIAS_KEY = 'blue-dock:app-push-alias';

export function readPushPref(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(PUSH_PREF_KEY) !== '0';
}

/** 持久化短 alias（契约 2–64）；勿用超长 FCM token */
export function ensurePushAlias(): string {
  const existing = localStorage.getItem(PUSH_ALIAS_KEY);
  if (existing && existing.length >= 2 && existing.length <= 64) return existing;
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const alias = `bd${rand}`.slice(0, 64);
  localStorage.setItem(PUSH_ALIAS_KEY, alias);
  return alias;
}

export function resolvePushPlatform(): AppPushPlatform {
  if (isMobileRuntime()) {
    return getMobile().getPlatform() === 'android' ? 'android' : 'ios';
  }
  return 'ios';
}

/**
 * 登录后 / 设置开关 / 时段边界：同步别名与通知权限位。
 * 时段静音内即使总开关开着也移除别名（只挡推送；WS 消息仍到）。
 */
export async function syncMobilePushAlias(enabled: boolean): Promise<void> {
  if (!isMobileRuntime()) return;
  const alias = ensurePushAlias();
  const quiet = isInQuietHours();
  if (!enabled || quiet) {
    await removeAppPushAlias({ alias });
    return;
  }
  let isNotified = true;
  try {
    const token = await getMobile().registerPush?.();
    if (token === null && typeof Notification !== 'undefined') {
      isNotified = Notification.permission === 'granted';
    }
  } catch {
    if (typeof Notification !== 'undefined') {
      isNotified = Notification.permission === 'granted';
    }
  }
  await upsertAppPushAlias({
    alias,
    platform: resolvePushPlatform(),
    isNotified,
  });
}
