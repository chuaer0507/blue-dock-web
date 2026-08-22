import { describe, expect, it } from 'vitest';
import { parseTaskEasyList, taskEasyListKey } from '../../src/domains/task';

describe('taskEasyListKey', () => {
  it('normalizes and sorts user ids', () => {
    expect(
      taskEasyListKey({
        userIds: [3, 1, 1],
        startAt: '2026-01-01T10:00:00',
        endAt: '2026-01-02 18:00:00',
        excludeTaskId: 9,
        limit: 8,
      }),
    ).toBe('1,3|2026-01-01 10:00:00|2026-01-02 18:00:00|9|8');
  });
});

describe('parseTaskEasyList', () => {
  it('parses rows', () => {
    expect(
      parseTaskEasyList([
        {
          id: 5,
          name: 'A',
          projectId: 2,
          projectName: 'P',
          startAt: '2026-01-01T00:00:00',
          endAt: null,
        },
      ]),
    ).toEqual([
      {
        id: 5,
        name: 'A',
        projectId: 2,
        projectName: 'P',
        startAt: '2026-01-01T00:00:00',
        endAt: null,
      },
    ]);
  });
});
