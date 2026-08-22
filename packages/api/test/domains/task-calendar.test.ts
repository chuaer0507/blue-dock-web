import { describe, expect, it } from 'vitest';
import { taskKeys } from '../../src/domains/task';

describe('taskKeys.calendar', () => {
  it('builds range key', () => {
    expect(taskKeys.calendar('2026-08-01', '2026-08-31')).toEqual([
      'tasks',
      'calendar',
      '2026-08-01',
      '2026-08-31',
    ]);
  });
});
