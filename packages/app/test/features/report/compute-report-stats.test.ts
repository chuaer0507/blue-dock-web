import { describe, expect, it } from 'vitest';
import type { ReportView } from '@blue-dock/api';
import {
  computeReportStats,
  type ReportStatsSnapshot,
} from '../../../src/features/report/report-stats';

function report(partial: Partial<ReportView> & Pick<ReportView, 'id'>): ReportView {
  return {
    sign: '',
    title: '',
    type: 'daily',
    userId: 1,
    content: '',
    receiveUserIds: [],
    ...partial,
  };
}

describe('computeReportStats', () => {
  it('aggregates sent and received', () => {
    const now = new Date().toISOString();
    const mine = [
      report({ id: 1, type: 'daily', createdAt: now }),
      report({ id: 2, type: 'weekly', createdAt: now }),
      report({ id: 3, type: 'daily', createdAt: '2020-01-01T00:00:00Z' }),
    ];
    const receive = [
      report({ id: 10, type: 'daily', read: 0, createdAt: now }),
      report({ id: 11, type: 'weekly', read: 1, createdAt: now }),
    ];
    const stats: ReportStatsSnapshot = computeReportStats(mine, receive, 5, 100);
    expect(stats.sentTotal).toBe(3);
    expect(stats.sentDaily).toBe(2);
    expect(stats.sentWeekly).toBe(1);
    expect(stats.sentLast7Days).toBe(2);
    expect(stats.receivedTotal).toBe(2);
    expect(stats.receivedUnread).toBe(1);
    expect(stats.receivedRead).toBe(1);
    expect(stats.unreadApi).toBe(5);
    expect(stats.truncated).toBe(false);
  });

  it('marks truncated at page size', () => {
    const mine = Array.from({ length: 100 }, (_, i) => report({ id: i + 1 }));
    const stats = computeReportStats(mine, [], 0, 100);
    expect(stats.truncated).toBe(true);
  });
});
