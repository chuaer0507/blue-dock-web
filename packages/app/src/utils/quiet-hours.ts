/** 移动端时段静音（本地偏好；无云端 API；每日循环，可跨午夜） */

export const QUIET_HOURS_KEY = 'blue-dock:quiet-hours';

export type QuietHoursPref = {
  enabled: boolean;
  /** `HH:mm` 开始（含） */
  start: string;
  /** `HH:mm` 结束（不含）；可小于 start（跨午夜） */
  end: string;
};

export const DEFAULT_QUIET_HOURS: QuietHoursPref = {
  enabled: false,
  start: '22:00',
  end: '08:00',
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseHHmm(raw: string): number | null {
  const m = HHMM.exec(raw.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function isValidHHmm(raw: string): boolean {
  return parseHHmm(raw) != null;
}

export function readQuietHoursPref(): QuietHoursPref {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_QUIET_HOURS };
  try {
    const raw = localStorage.getItem(QUIET_HOURS_KEY);
    if (!raw) return { ...DEFAULT_QUIET_HOURS };
    const parsed = JSON.parse(raw) as Partial<QuietHoursPref>;
    const start =
      typeof parsed.start === 'string' && isValidHHmm(parsed.start)
        ? parsed.start
        : DEFAULT_QUIET_HOURS.start;
    const end =
      typeof parsed.end === 'string' && isValidHHmm(parsed.end)
        ? parsed.end
        : DEFAULT_QUIET_HOURS.end;
    return {
      enabled: Boolean(parsed.enabled),
      start,
      end,
    };
  } catch {
    return { ...DEFAULT_QUIET_HOURS };
  }
}

export function writeQuietHoursPref(pref: QuietHoursPref): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    QUIET_HOURS_KEY,
    JSON.stringify({
      enabled: pref.enabled,
      start: pref.start,
      end: pref.end,
    }),
  );
}

/**
 * 是否处于时段静音内。
 * - start === end：全天静音
 * - start < end：同日内 [start, end)
 * - start > end：跨午夜 [start, 24:00) ∪ [00:00, end)
 */
export function isInQuietHours(
  now: Date = new Date(),
  pref: QuietHoursPref = readQuietHoursPref(),
): boolean {
  if (!pref.enabled) return false;
  const start = parseHHmm(pref.start);
  const end = parseHHmm(pref.end);
  if (start == null || end == null) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (start === end) return true;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}
