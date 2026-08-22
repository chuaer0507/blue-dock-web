import { describe, expect, it } from 'vitest';
import {
  formatHm,
  isAllDayOnDay,
  timedSlotOnDay,
  toYmd,
} from '../../../src/features/calendar/date-utils';

describe('isAllDayOnDay', () => {
  const day = new Date(2026, 7, 11); // Aug 11 local

  it('treats same-day 00:00–23:59 as all-day', () => {
    expect(
      isAllDayOnDay({ startAt: '2026-08-11 00:00:00', endAt: '2026-08-11 23:59:59' }, day),
    ).toBe(true);
  });

  it('treats timed same-day slot as not all-day', () => {
    expect(
      isAllDayOnDay({ startAt: '2026-08-11 09:00:00', endAt: '2026-08-11 10:30:00' }, day),
    ).toBe(false);
  });

  it('treats multi-day span as all-day', () => {
    expect(
      isAllDayOnDay({ startAt: '2026-08-10 12:00:00', endAt: '2026-08-12 12:00:00' }, day),
    ).toBe(true);
  });
});

describe('timedSlotOnDay', () => {
  const day = new Date(2026, 7, 11);

  it('returns null for all-day', () => {
    expect(
      timedSlotOnDay({ startAt: '2026-08-11 00:00:00', endAt: '2026-08-11 23:59:59' }, day),
    ).toBeNull();
  });

  it('places a morning slot near the top third', () => {
    const slot = timedSlotOnDay(
      { startAt: '2026-08-11 09:00:00', endAt: '2026-08-11 10:00:00' },
      day,
    );
    expect(slot).not.toBeNull();
    expect(slot!.topPct).toBeCloseTo((9 / 24) * 100, 5);
    expect(slot!.heightPct).toBeCloseTo((1 / 24) * 100, 5);
  });
});

describe('formatHm', () => {
  it('formats local hours', () => {
    const d = new Date(2026, 7, 11, 14, 5, 0);
    const iso = `${toYmd(d)} 14:05:00`;
    expect(formatHm(iso)).toBe('14:05');
  });
});
