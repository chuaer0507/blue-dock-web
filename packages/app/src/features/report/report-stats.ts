import type { ReportView } from '@blue-dock/api';

const DAY_MS = 86_400_000;

function inLastDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * DAY_MS;
}

export type ReportStatsSnapshot = {
  sentTotal: number;
  sentDaily: number;
  sentWeekly: number;
  sentLast7Days: number;
  receivedTotal: number;
  receivedUnread: number;
  receivedRead: number;
  receivedLast7Days: number;
  unreadApi: number;
  truncated: boolean;
};

export function computeReportStats(
  mine: ReportView[],
  receive: ReportView[],
  unreadApi: number,
  pageSize: number,
): ReportStatsSnapshot {
  let sentDaily = 0;
  let sentWeekly = 0;
  let sentLast7Days = 0;
  for (const r of mine) {
    if (r.type === 'weekly') sentWeekly += 1;
    else sentDaily += 1;
    if (inLastDays(r.createdAt, 7)) sentLast7Days += 1;
  }

  let receivedUnread = 0;
  let receivedRead = 0;
  let receivedLast7Days = 0;
  for (const r of receive) {
    if (Number(r.read) === 0) receivedUnread += 1;
    else receivedRead += 1;
    if (inLastDays(r.createdAt ?? r.receiveAt, 7)) receivedLast7Days += 1;
  }

  return {
    sentTotal: mine.length,
    sentDaily,
    sentWeekly,
    sentLast7Days,
    receivedTotal: receive.length,
    receivedUnread,
    receivedRead,
    receivedLast7Days,
    unreadApi,
    truncated: mine.length >= pageSize || receive.length >= pageSize,
  };
}
