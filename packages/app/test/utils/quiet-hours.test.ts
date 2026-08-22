import { describe, expect, it } from 'vitest';
import { isInQuietHours, type QuietHoursPref } from '../../src/utils/quiet-hours';

function at(h: number, m: number): Date {
  return new Date(2026, 0, 15, h, m, 0, 0);
}

describe('isInQuietHours', () => {
  it('returns false when disabled', () => {
    const pref: QuietHoursPref = { enabled: false, start: '22:00', end: '08:00' };
    expect(isInQuietHours(at(23, 0), pref)).toBe(false);
  });

  it('handles overnight window', () => {
    const pref: QuietHoursPref = { enabled: true, start: '22:00', end: '08:00' };
    expect(isInQuietHours(at(22, 0), pref)).toBe(true);
    expect(isInQuietHours(at(23, 30), pref)).toBe(true);
    expect(isInQuietHours(at(7, 59), pref)).toBe(true);
    expect(isInQuietHours(at(8, 0), pref)).toBe(false);
    expect(isInQuietHours(at(12, 0), pref)).toBe(false);
  });

  it('handles same-day window', () => {
    const pref: QuietHoursPref = { enabled: true, start: '09:00', end: '18:00' };
    expect(isInQuietHours(at(9, 0), pref)).toBe(true);
    expect(isInQuietHours(at(17, 59), pref)).toBe(true);
    expect(isInQuietHours(at(18, 0), pref)).toBe(false);
    expect(isInQuietHours(at(8, 59), pref)).toBe(false);
  });

  it('treats equal start/end as all day', () => {
    const pref: QuietHoursPref = { enabled: true, start: '12:00', end: '12:00' };
    expect(isInQuietHours(at(0, 0), pref)).toBe(true);
    expect(isInQuietHours(at(23, 59), pref)).toBe(true);
  });
});
