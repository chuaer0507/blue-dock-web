import { describe, expect, it } from 'vitest';
import type { UserTaskView } from '@blue-dock/api';
import {
  groupDashboardTasks,
  startOfDashboardWeek,
  weekDoneTasks,
} from '../../../src/features/dashboard/dashboard-utils';

function task(id: number, overrides: Partial<UserTaskView> = {}): UserTaskView {
  return {
    id,
    parentId: 0,
    projectId: 1,
    projectName: '项目',
    columnId: 1,
    name: `任务 ${id}`,
    color: '',
    description: '',
    startAt: null,
    endAt: null,
    completeAt: null,
    visibility: 1,
    owner: 1,
    today: false,
    overdue: false,
    departmentReadonly: false,
    createdAt: null,
    ...overrides,
  };
}

describe('groupDashboardTasks', () => {
  it('按待开始、逾期、今日和待完成分组，并排除已完成任务', () => {
    const groups = groupDashboardTasks(
      [
        task(1, { overdue: true }),
        task(2, { today: true }),
        task(3),
        task(4, { startAt: '2026-08-27 09:00:00', overdue: true }),
        task(5, { completeAt: '2026-08-26 10:00:00', overdue: true }),
      ],
      new Date('2026-08-26 12:00:00').getTime(),
    );

    expect(groups.overdue.map((item) => item.id)).toEqual([1]);
    expect(groups.today.map((item) => item.id)).toEqual([2]);
    expect(groups.todo.map((item) => item.id)).toEqual([3]);
    expect(groups.pending.map((item) => item.id)).toEqual([4]);
  });
});

describe('weekDoneTasks', () => {
  it('以周一为起点，并只返回本周完成的任务', () => {
    const now = new Date('2026-08-26 12:00:00');
    expect(startOfDashboardWeek(now)).toEqual(new Date('2026-08-24 00:00:00'));
    expect(
      weekDoneTasks(
        [
          task(1, { completeAt: '2026-08-24 00:00:00' }),
          task(2, { completeAt: '2026-08-30 23:59:59' }),
          task(3, { completeAt: '2026-08-31 00:00:00' }),
          task(4, { completeAt: '2026-08-23 23:59:59' }),
          task(5),
        ],
        now,
      ).map((item) => item.id),
    ).toEqual([1, 2]);
  });
});
