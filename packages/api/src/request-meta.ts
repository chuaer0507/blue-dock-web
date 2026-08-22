const DEVICE_ID_KEY = 'blue-dock:deviceId';

/** 持久化设备 ID（写入头 `X-Device-ID`） */
export function getDeviceId(): string {
  if (typeof localStorage === 'undefined') {
    return 'ssr';
  }
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `dev-${Date.now().toString(36)}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

/** IANA 时区 → `X-Timezone` */
export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
