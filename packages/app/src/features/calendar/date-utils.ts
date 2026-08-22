/** 本地日历日期工具（周一为一周起始） */

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseYmd(ymd: string): Date {
  const [y, m, day] = ymd.split('-').map(Number);
  return new Date(y!, m! - 1, day!);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** 周一为一周起始 */
export function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(d, diff));
}

export function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6);
}

/** 月视图 6×7 格子（含跨月） */
export function monthGrid(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor));
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
  return cells;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export type DateRange = { start: string; end: string };

export function rangeForView(view: 'month' | 'week' | 'day', anchor: Date): DateRange {
  if (view === 'day') {
    const ymd = toYmd(anchor);
    return { start: ymd, end: ymd };
  }
  if (view === 'week') {
    return { start: toYmd(startOfWeek(anchor)), end: toYmd(endOfWeek(anchor)) };
  }
  const cells = monthGrid(anchor);
  return { start: toYmd(cells[0]!), end: toYmd(cells[41]!) };
}

export function shiftAnchor(view: 'month' | 'week' | 'day', anchor: Date, dir: -1 | 1): Date {
  if (view === 'day') return addDays(anchor, dir);
  if (view === 'week') return addDays(anchor, dir * 7);
  return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
}

export type TimedItem = {
  startAt: string | null;
  endAt: string | null;
  completeAt?: string | null;
};

/** 任务是否与某日本地日有交集（无时间则不展示） */
export function overlapsDay(item: TimedItem, day: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 86_400_000 - 1;
  const startRaw = item.startAt ?? item.endAt;
  const endRaw = item.endAt ?? item.startAt;
  if (!startRaw && !endRaw) return false;
  const start = startRaw ? new Date(startRaw).getTime() : Number.NaN;
  const end = endRaw ? new Date(endRaw).getTime() : Number.NaN;
  if (Number.isNaN(start) && Number.isNaN(end)) return false;
  const s = Number.isNaN(start) ? end : start;
  const e = Number.isNaN(end) ? start : Math.max(end, start);
  return s <= dayEnd && e >= dayStart;
}

const DAY_MS = 86_400_000;

/**
 * 全天判定（对齐 java calendar overview）：
 * - 跨自然日 → 全天条
 * - 同日且 start≤00:01 且 end≥23:59 → 全天
 */
export function isAllDayOnDay(item: TimedItem, day: Date): boolean {
  if (!overlapsDay(item, day)) return false;
  const startRaw = item.startAt ?? item.endAt;
  const endRaw = item.endAt ?? item.startAt;
  if (!startRaw || !endRaw) return true;
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;
  if (!isSameDay(start, end)) return true;
  const startMins = start.getHours() * 60 + start.getMinutes();
  const endMins = end.getHours() * 60 + end.getMinutes();
  return startMins <= 1 && endMins >= 23 * 60 + 59;
}

export type TimedSlot = {
  /** 距当日 0:00 的顶部百分比 0–100 */
  topPct: number;
  /** 高度百分比，至少约 30 分钟 */
  heightPct: number;
};

/** 定时任务在当日时间轴上的位置；全天返回 null */
export function timedSlotOnDay(item: TimedItem, day: Date): TimedSlot | null {
  if (isAllDayOnDay(item, day)) return null;
  const startRaw = item.startAt ?? item.endAt;
  const endRaw = item.endAt ?? item.startAt;
  if (!startRaw || !endRaw) return null;
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + DAY_MS;
  const start = Math.min(Math.max(new Date(startRaw).getTime(), dayStart), dayEnd);
  const end = Math.min(Math.max(new Date(endRaw).getTime(), dayStart), dayEnd);
  if (!(end > start)) return null;
  const topPct = ((start - dayStart) / DAY_MS) * 100;
  const heightPct = Math.max(((end - start) / DAY_MS) * 100, (30 / (24 * 60)) * 100);
  return { topPct, heightPct: Math.min(heightPct, 100 - topPct) };
}

export function formatHm(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function isOverdue(item: TimedItem, now = Date.now()): boolean {
  if (item.completeAt) return false;
  if (!item.endAt) return false;
  const end = new Date(item.endAt).getTime();
  return !Number.isNaN(end) && end < now;
}

/** 两日之间的整天差（to - from） */
export function dayDiff(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

export function toLocalDateTime(d: Date): string {
  return `${toYmd(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** 将 ISO / 本地时间字符串平移整天，保留时分秒 */
export function shiftIsoByDays(iso: string | null, days: number): string | null {
  if (!iso || days === 0) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return toLocalDateTime(addDays(d, days));
}

/** 任务在日历上的锚点日（优先 startAt） */
export function taskAnchorDay(item: TimedItem): Date | null {
  const raw = item.startAt ?? item.endAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}
