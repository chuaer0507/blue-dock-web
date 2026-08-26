import type { UserTaskView } from '@blue-dock/api';

export type DashboardTaskGroups = {
  overdue: UserTaskView[];
  today: UserTaskView[];
  todo: UserTaskView[];
  pending: UserTaskView[];
};

/** 按仪表盘个人视角的展示口径分组未完成任务。 */
export function groupDashboardTasks(tasks: UserTaskView[], now = Date.now()): DashboardTaskGroups {
  const overdue: UserTaskView[] = [];
  const today: UserTaskView[] = [];
  const todo: UserTaskView[] = [];
  const pending: UserTaskView[] = [];
  for (const task of tasks) {
    if (task.completeAt) continue;
    const startMs = task.startAt ? new Date(task.startAt).getTime() : Number.NaN;
    if (Number.isFinite(startMs) && startMs > now) {
      pending.push(task);
      continue;
    }
    if (task.overdue) overdue.push(task);
    else if (task.today) today.push(task);
    else todo.push(task);
  }
  return { overdue, today, todo, pending };
}

/** 当前周以周一 00:00 为起点。 */
export function startOfDashboardWeek(date = new Date()): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
}

/** 筛选本周一至下周一之间完成的任务。 */
export function weekDoneTasks(tasks: UserTaskView[], now = new Date()): UserTaskView[] {
  const start = startOfDashboardWeek(now);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  const from = start.getTime();
  const to = end.getTime();
  return tasks.filter((task) => {
    if (!task.completeAt) return false;
    const completedAt = new Date(task.completeAt).getTime();
    return Number.isFinite(completedAt) && completedAt >= from && completedAt < to;
  });
}
