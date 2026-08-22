import { describe, expect, it } from 'vitest';
import { attendanceKeys, parseAttendanceTimes } from '../../src/domains/attendance';

describe('attendanceKeys', () => {
  it('builds factories', () => {
    expect(attendanceKeys.view()).toEqual(['attendance', 'view']);
    expect(attendanceKeys.month('2026-08')).toEqual(['attendance', 'month', '2026-08']);
  });
});

describe('parseAttendanceTimes', () => {
  it('parses JSON string and arrays', () => {
    expect(parseAttendanceTimes('[{"at":"09:00:00","mode":"manual"}]')).toEqual([
      { at: '09:00:00', mode: 'manual' },
    ]);
    expect(parseAttendanceTimes([{ at: '18:00:00', mode: 'auto', section: 'out' }])).toHaveLength(
      1,
    );
    expect(parseAttendanceTimes('')).toEqual([]);
    expect(parseAttendanceTimes('nope')).toEqual([]);
  });
});
