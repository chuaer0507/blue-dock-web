import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Label, ListBox, Radio, RadioGroup, Select, toast } from '@heroui/react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import {
  useCurrentUser,
  useDashboardTeamStats,
  useDashboardTeamTasks,
  useDashboardUserCounts,
  useDashboardUserProjects,
  useDashboardUserTasks,
  useManagedDepartments,
  useRealtimeStatus,
  useSystemGeneralSetting,
  type DepartmentBrief,
  type ProjectView,
  type TeamTaskView,
  type UserTaskView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { useDashboardUiStore, type DashboardGroupKey } from '../../stores/dashboard';
import { bindPersistAfterLogin } from '../../stores/persist';
import { cn } from '../../utils/cn';
import { TaskModal } from '../task/TaskModal';
import { groupDashboardTasks, weekDoneTasks } from './dashboard-utils';

function greetingKey(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function formatDeadline(
  endAt: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!endAt) return t('deadline.none');
  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) return t('deadline.none');
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffDays = Math.round(
    (startOfEnd.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays < 0) return t('deadline.overdueDays', { days: Math.abs(diffDays) });
  if (diffDays === 0) return t('deadline.today');
  if (diffDays === 1) return t('deadline.tomorrow');
  return end.toLocaleDateString();
}

function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: number;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        'border-border rounded-xl border px-4 py-3',
        accent && value > 0 ? 'border-danger/40 bg-danger/5' : 'bg-surface',
      )}
    >
      <p className="text-muted text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="text-muted mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}

function TaskRow({
  task,
  onOpen,
  t,
}: {
  task: UserTaskView;
  onOpen: (id: number) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <Button
      variant="ghost"
      className="hover:bg-default border-border h-auto w-full items-start justify-between gap-3 rounded-none border-b px-3 py-3 text-left font-normal last:border-b-0"
      onPress={() => onOpen(task.id)}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{task.name}</span>
        <span className="text-muted mt-0.5 block truncate text-xs">{task.projectName || '—'}</span>
      </span>
      <span className={cn('shrink-0 text-xs', task.overdue ? 'text-danger' : 'text-muted')}>
        {formatDeadline(task.endAt, t)}
      </span>
    </Button>
  );
}

function TaskGroup({
  title,
  tasks,
  groupKey,
  collapsed,
  onToggle,
  onOpen,
  t,
}: {
  title: string;
  tasks: UserTaskView[];
  groupKey: DashboardGroupKey;
  collapsed?: boolean;
  onToggle: (key: DashboardGroupKey) => void;
  onOpen: (id: number) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (tasks.length === 0) return null;
  return (
    <section className="border-border bg-surface overflow-hidden rounded-xl border">
      <Button
        variant="ghost"
        className="hover:bg-default h-auto w-full justify-between rounded-none px-4 py-3 text-left font-normal"
        onPress={() => onToggle(groupKey)}
      >
        <h3 className="text-sm font-semibold">
          {title}
          <span className="text-muted ms-2 font-normal">{tasks.length}</span>
        </h3>
        <span className="text-muted text-xs">{collapsed ? '▸' : '▾'}</span>
      </Button>
      {collapsed ? null : (
        <div>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onOpen={onOpen} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}

/** 仪表盘：个人任务聚合 + 可选部门负责人视角 */
export function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { connected } = useRealtimeStatus();
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const perspective = useDashboardUiStore((s) => s.perspective);
  const layout = useDashboardUiStore((s) => s.layout);
  const departmentId = useDashboardUiStore((s) => s.departmentId);
  const collapsed = useDashboardUiStore((s) => s.collapsed);
  const setPerspective = useDashboardUiStore((s) => s.setPerspective);
  const setLayout = useDashboardUiStore((s) => s.setLayout);
  const setDepartmentId = useDashboardUiStore((s) => s.setDepartmentId);
  const toggleCollapsed = useDashboardUiStore((s) => s.toggleCollapsed);

  const userId = user?.userId;
  useEffect(() => {
    if (userId) bindPersistAfterLogin(userId);
  }, [userId]);

  const managed = useManagedDepartments(Boolean(userId));
  const generalSetting = useSystemGeneralSetting(Boolean(userId));
  const ownerViewOpen =
    (generalSetting.data?.departmentOwnerProjectView || 'open').toLowerCase() === 'open';
  const canTeam = ownerViewOpen && (managed.data?.length ?? 0) > 0;

  useEffect(() => {
    if (!canTeam && perspective === 'team') setPerspective('personal');
  }, [canTeam, perspective, setPerspective]);

  useEffect(() => {
    if (canTeam && departmentId == null && managed.data?.[0]) {
      setDepartmentId(managed.data[0].id);
    }
  }, [canTeam, departmentId, managed.data, setDepartmentId]);

  const countsMine = useDashboardUserCounts(userId, 1, connected);
  const countsAssist = useDashboardUserCounts(userId, 0, connected);
  const tasksMine = useDashboardUserTasks(
    userId
      ? {
          userId,
          owner: 1,
          page: 1,
          pageSize: 50,
          keys: JSON.stringify({ status: 'uncompleted' }),
        }
      : undefined,
    connected,
  );
  const tasksMineDone = useDashboardUserTasks(
    userId
      ? {
          userId,
          owner: 1,
          page: 1,
          pageSize: 50,
          keys: JSON.stringify({ status: 'completed' }),
        }
      : undefined,
    connected,
  );
  const tasksAssist = useDashboardUserTasks(
    userId
      ? {
          userId,
          owner: 0,
          page: 1,
          pageSize: 30,
          keys: JSON.stringify({ status: 'uncompleted' }),
        }
      : undefined,
    connected,
  );

  const teamEnabled = perspective === 'team' && canTeam && departmentId != null;
  const teamStats = useDashboardTeamStats(departmentId ?? undefined, teamEnabled);
  const teamOverdue = useDashboardTeamTasks(
    { departmentId: departmentId ?? undefined, type: 'overdue', pageSize: 20 },
    teamEnabled,
  );
  const teamSoon = useDashboardTeamTasks(
    { departmentId: departmentId ?? undefined, type: 'soon', pageSize: 20 },
    teamEnabled,
  );
  const teamHi = useDashboardTeamTasks(
    { departmentId: departmentId ?? undefined, type: 'hi', pageSize: 20 },
    teamEnabled,
  );
  const [memberFilter, setMemberFilter] = useState<number | null>(null);
  const teamByMember = useDashboardTeamTasks(
    memberFilter != null
      ? { departmentId: departmentId ?? undefined, memberId: memberFilter, pageSize: 30 }
      : undefined,
    teamEnabled && memberFilter != null,
  );
  const memberProjects = useDashboardUserProjects(
    memberFilter != null ? { userId: memberFilter, pageSize: 20 } : undefined,
    teamEnabled && memberFilter != null,
  );

  useEffect(() => {
    setMemberFilter(null);
  }, [departmentId]);

  const mineGroups = useMemo(
    () => groupDashboardTasks(tasksMine.data?.items ?? []),
    [tasksMine.data?.items],
  );
  const weekDoneItems = useMemo(
    () => weekDoneTasks(tasksMineDone.data?.items ?? []),
    [tasksMineDone.data?.items],
  );
  const assistItems = useMemo(
    () => (tasksAssist.data?.items ?? []).filter((x: UserTaskView) => !x.completeAt),
    [tasksAssist.data?.items],
  );
  const priorityEntries = useMemo((): Array<[string, number]> => {
    const raw = teamStats.data?.priority ?? {};
    return Object.entries(raw)
      .map(([key, count]): [string, number] => [key, Number(count) || 0])
      .sort((a, b) => b[1] - a[1]);
  }, [teamStats.data?.priority]);

  const priorityLabel = (key: string) => {
    if (!key || key === '0' || key === 'unset' || key === 'null') {
      return t('team.priorityUnset');
    }
    if (/^\d+$/.test(key)) return t('team.priorityN', { n: key });
    return key;
  };

  const overdueCount = mineGroups.overdue.length;
  const todayCount = mineGroups.today.length;
  const pendingCount = mineGroups.pending.length;
  const openFallback = overdueCount + todayCount + mineGroups.todo.length + pendingCount;
  const todoCount = countsMine.data?.todo ?? openFallback;
  const assistCount = countsAssist.data?.todo ?? assistItems.length;

  const onOpenTask = (id: number) => {
    setOpenTaskId(id);
  };

  const onRefresh = () => {
    void Promise.all([
      countsMine.refetch(),
      countsAssist.refetch(),
      tasksMine.refetch(),
      tasksMineDone.refetch(),
      tasksAssist.refetch(),
      teamEnabled ? teamStats.refetch() : Promise.resolve(),
      teamEnabled ? teamOverdue.refetch() : Promise.resolve(),
      teamEnabled ? teamSoon.refetch() : Promise.resolve(),
      teamEnabled ? teamHi.refetch() : Promise.resolve(),
      teamEnabled && memberFilter != null ? teamByMember.refetch() : Promise.resolve(),
      teamEnabled && memberFilter != null ? memberProjects.refetch() : Promise.resolve(),
    ]).then(() => toast.success(t('refresh')));
  };

  const loading =
    countsMine.isLoading || tasksMine.isLoading || (teamEnabled && teamStats.isLoading);
  const errored = countsMine.isError || tasksMine.isError;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted mt-1 text-sm">
            {t(`greeting.${greetingKey()}`)}
            {user?.nickname ? `，${user.nickname}` : ''}
            {' · '}
            {overdueCount > 0
              ? t('greeting.overdueHint', { count: overdueCount })
              : t('greeting.allClear')}
          </p>
        </div>
        <Button variant="secondary" size="sm" onPress={onRefresh} isDisabled={loading}>
          <ArrowPathIcon className="size-4" aria-hidden />
          {t('refresh')}
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        {canTeam ? (
          <RadioGroup
            name="dashboard-perspective"
            orientation="horizontal"
            value={perspective}
            onChange={(v) => setPerspective(v as 'personal' | 'team')}
          >
            <Label className="sr-only">{t('perspective.personal')}</Label>
            <Radio value="personal">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t('perspective.personal')}
              </Radio.Content>
            </Radio>
            <Radio value="team">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t('perspective.team')}
              </Radio.Content>
            </Radio>
          </RadioGroup>
        ) : null}

        {perspective === 'personal' ? (
          <RadioGroup
            name="dashboard-layout"
            orientation="horizontal"
            value={layout}
            onChange={(v) => setLayout(v as 'list' | 'quadrant')}
          >
            <Label className="sr-only">{t('layout.list')}</Label>
            <Radio value="list">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t('layout.list')}
              </Radio.Content>
            </Radio>
            <Radio value="quadrant">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t('layout.quadrant')}
              </Radio.Content>
            </Radio>
          </RadioGroup>
        ) : null}

        {perspective === 'team' && managed.data && managed.data.length > 1 ? (
          <Select
            className="w-48"
            value={departmentId != null ? String(departmentId) : undefined}
            onChange={(key) => {
              if (key == null) return;
              setDepartmentId(Number(key) || null);
            }}
            aria-label={t('department')}
          >
            <Label>{t('department')}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {managed.data.map((d: DepartmentBrief) => (
                  <ListBox.Item key={d.id} id={String(d.id)} textValue={d.name}>
                    {d.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : null}
      </div>

      {loading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {errored ? (
        <div className="flex items-center gap-3">
          <p className="text-danger text-sm">{t('error')}</p>
          <Button size="sm" variant="secondary" onPress={onRefresh}>
            {t('retry')}
          </Button>
        </div>
      ) : null}

      {perspective === 'personal' && !loading && !errored ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label={t('counts.overdue')} value={overdueCount} accent />
            <StatCard label={t('counts.today')} value={todayCount} />
            <StatCard
              label={t('counts.todo')}
              value={todoCount}
              hint={pendingCount > 0 ? t('counts.pendingHint', { count: pendingCount }) : undefined}
            />
            <StatCard label={t('counts.assist')} value={assistCount} />
          </div>

          {layout === 'quadrant' ? (
            <div className="grid gap-4 md:grid-cols-2">
              {(
                [
                  ['overdue', mineGroups.overdue],
                  ['today', mineGroups.today],
                  ['todo', mineGroups.todo],
                  ['assist', assistItems],
                ] as const
              ).map(([key, list]) => (
                <TaskGroup
                  key={key}
                  groupKey={key}
                  title={t(`groups.${key}`)}
                  tasks={list}
                  collapsed={collapsed[key]}
                  onToggle={toggleCollapsed}
                  onOpen={onOpenTask}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <TaskGroup
                groupKey="overdue"
                title={t('groups.overdue')}
                tasks={mineGroups.overdue}
                collapsed={collapsed.overdue}
                onToggle={toggleCollapsed}
                onOpen={onOpenTask}
                t={t}
              />
              <TaskGroup
                groupKey="today"
                title={t('groups.today')}
                tasks={mineGroups.today}
                collapsed={collapsed.today}
                onToggle={toggleCollapsed}
                onOpen={onOpenTask}
                t={t}
              />
              <TaskGroup
                groupKey="todo"
                title={t('groups.todo')}
                tasks={mineGroups.todo}
                collapsed={collapsed.todo}
                onToggle={toggleCollapsed}
                onOpen={onOpenTask}
                t={t}
              />
              <TaskGroup
                groupKey="pending"
                title={t('groups.pending')}
                tasks={mineGroups.pending}
                collapsed={collapsed.pending}
                onToggle={toggleCollapsed}
                onOpen={onOpenTask}
                t={t}
              />
              <TaskGroup
                groupKey="assist"
                title={t('groups.assist')}
                tasks={assistItems}
                collapsed={collapsed.assist}
                onToggle={toggleCollapsed}
                onOpen={onOpenTask}
                t={t}
              />
              <TaskGroup
                groupKey="weekDone"
                title={t('groups.weekDone')}
                tasks={weekDoneItems}
                collapsed={collapsed.weekDone}
                onToggle={toggleCollapsed}
                onOpen={onOpenTask}
                t={t}
              />
              {openFallback + assistItems.length + weekDoneItems.length === 0 ? (
                <p className="text-muted text-sm">{t('empty')}</p>
              ) : null}
            </div>
          )}
        </>
      ) : null}

      {perspective === 'team' && teamEnabled && !teamStats.isLoading ? (
        <>
          <div>
            <h2 className="text-lg font-semibold">{t('teamTitle')}</h2>
            <p className="text-muted mt-1 text-sm">
              {t('teamHint', { overdue: teamStats.data?.overdue ?? 0 })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label={t('counts.uncompleted')} value={teamStats.data?.uncompleted ?? 0} />
            <StatCard label={t('counts.overdue')} value={teamStats.data?.overdue ?? 0} accent />
            <StatCard label={t('counts.soon')} value={teamStats.data?.soon ?? 0} />
            <StatCard label={t('counts.weekDone')} value={teamStats.data?.weekCompleted ?? 0} />
          </div>

          <section className="border-border bg-surface rounded-xl border p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{t('team.members')}</h3>
                <p className="text-muted mt-1 text-xs">
                  {t('team.membersCount', {
                    count: teamStats.data?.memberUserIds?.length ?? 0,
                  })}
                </p>
              </div>
              <Select
                className="min-w-44"
                value={memberFilter == null ? 'all' : String(memberFilter)}
                onChange={(key) => {
                  const v = String(key ?? 'all');
                  setMemberFilter(v === 'all' ? null : Number(v));
                }}
              >
                <Label>{t('team.memberFilter')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="all" textValue={t('team.memberAll')}>
                      {t('team.memberAll')}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {(teamStats.data?.memberUserIds ?? []).map((uid: number) => (
                      <ListBox.Item
                        key={uid}
                        id={String(uid)}
                        textValue={t('team.memberId', { id: uid })}
                      >
                        {t('team.memberId', { id: uid })}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
            {memberFilter != null ? (
              <div className="mt-3 flex flex-col gap-3">
                <div className="border-border overflow-hidden rounded-lg border">
                  <p className="text-muted border-border border-b px-3 py-2 text-xs font-medium">
                    {t('team.memberProjects')}
                  </p>
                  {memberProjects.isLoading ? (
                    <p className="text-muted px-3 py-3 text-sm">{t('loading')}</p>
                  ) : (memberProjects.data?.items ?? []).length === 0 ? (
                    <p className="text-muted px-3 py-3 text-sm">{t('team.memberProjectsEmpty')}</p>
                  ) : (
                    (memberProjects.data?.items ?? []).map((project: ProjectView) => (
                      <Button
                        key={project.id}
                        variant="ghost"
                        className="hover:bg-default border-border h-auto w-full items-start justify-between gap-3 rounded-none border-t px-3 py-2.5 text-left font-normal first:border-t-0"
                        onPress={() => {
                          navigate(`/manage/project/${project.id}`);
                        }}
                      >
                        <span className="min-w-0 truncate text-sm font-medium">{project.name}</span>
                        {project.departmentReadonly ? (
                          <span className="text-muted shrink-0 text-xs">{t('team.readonly')}</span>
                        ) : null}
                      </Button>
                    ))
                  )}
                </div>
                <div className="border-border overflow-hidden rounded-lg border">
                  <p className="text-muted border-border border-b px-3 py-2 text-xs font-medium">
                    {t('team.memberTasks')}
                  </p>
                  {(teamByMember.data ?? []).length === 0 ? (
                    <p className="text-muted px-3 py-3 text-sm">{t('empty')}</p>
                  ) : (
                    (teamByMember.data ?? []).map((task: TeamTaskView) => (
                      <Button
                        key={task.id}
                        variant="ghost"
                        className="hover:bg-default border-border h-auto w-full items-start justify-between gap-3 rounded-none border-t px-3 py-2.5 text-left font-normal first:border-t-0"
                        onPress={() => onOpenTask(task.id)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{task.name}</span>
                          <span className="text-muted mt-0.5 block text-xs">
                            {task.priorityName || task.flowItemName || '—'}
                          </span>
                        </span>
                        <span className="text-muted shrink-0 text-xs">
                          {formatDeadline(task.endAt, t)}
                        </span>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </section>

          {priorityEntries.length > 0 ? (
            <section className="border-border bg-surface rounded-xl border p-4">
              <h3 className="text-sm font-semibold">{t('team.priority')}</h3>
              <p className="text-muted mt-1 text-xs">
                {t('team.priorityHint', { count: teamStats.data?.uncompleted ?? 0 })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {priorityEntries.map(([key, count]) => (
                  <div
                    key={key}
                    className="border-border bg-background rounded-lg border px-3 py-2"
                  >
                    <p className="text-muted truncate text-xs">{priorityLabel(key)}</p>
                    <p className="mt-0.5 text-lg font-semibold">{String(count)}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="border-border bg-surface overflow-hidden rounded-xl border">
            <div className="px-4 py-3">
              <h3 className="text-sm font-semibold">{t('team.focusOverdue')}</h3>
            </div>
            {(teamOverdue.data ?? []).length === 0 ? (
              <p className="text-muted px-4 pb-4 text-sm">{t('empty')}</p>
            ) : (
              (teamOverdue.data ?? []).map((task: TeamTaskView) => (
                <Button
                  key={task.id}
                  variant="ghost"
                  className="hover:bg-default border-border h-auto w-full items-start justify-between gap-3 rounded-none border-t px-4 py-3 text-left font-normal"
                  onPress={() => onOpenTask(task.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{task.name}</span>
                    <span className="text-muted mt-0.5 block text-xs">
                      {task.priorityName || t('table.priority')}
                    </span>
                  </span>
                  <span className="text-danger shrink-0 text-xs">
                    {formatDeadline(task.endAt, t)}
                  </span>
                </Button>
              ))
            )}
          </section>

          <section className="border-border bg-surface overflow-hidden rounded-xl border">
            <div className="px-4 py-3">
              <h3 className="text-sm font-semibold">{t('team.focusSoon')}</h3>
            </div>
            {(teamSoon.data ?? []).length === 0 ? (
              <p className="text-muted px-4 pb-4 text-sm">{t('empty')}</p>
            ) : (
              (teamSoon.data ?? []).map((task: TeamTaskView) => (
                <Button
                  key={task.id}
                  variant="ghost"
                  className="hover:bg-default border-border h-auto w-full items-start justify-between gap-3 rounded-none border-t px-4 py-3 text-left font-normal"
                  onPress={() => onOpenTask(task.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{task.name}</span>
                    <span className="text-muted mt-0.5 block text-xs">
                      {task.flowItemName || task.priorityName || '—'}
                    </span>
                  </span>
                  <span className="text-muted shrink-0 text-xs">
                    {formatDeadline(task.endAt, t)}
                  </span>
                </Button>
              ))
            )}
          </section>

          <section className="border-border bg-surface overflow-hidden rounded-xl border">
            <div className="px-4 py-3">
              <h3 className="text-sm font-semibold">{t('team.focusHi')}</h3>
            </div>
            {(teamHi.data ?? []).length === 0 ? (
              <p className="text-muted px-4 pb-4 text-sm">{t('empty')}</p>
            ) : (
              (teamHi.data ?? []).map((task: TeamTaskView) => (
                <Button
                  key={task.id}
                  variant="ghost"
                  className="hover:bg-default border-border h-auto w-full items-start justify-between gap-3 rounded-none border-t px-4 py-3 text-left font-normal"
                  onPress={() => onOpenTask(task.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{task.name}</span>
                    <span
                      className="mt-0.5 block truncate text-xs"
                      style={task.priorityColor ? { color: task.priorityColor } : undefined}
                    >
                      {task.priorityName || t('table.priority')}
                    </span>
                  </span>
                  <span className="text-muted shrink-0 text-xs">
                    {formatDeadline(task.endAt, t)}
                  </span>
                </Button>
              ))
            )}
          </section>
        </>
      ) : null}
      <TaskModal taskId={openTaskId} onOpenChange={setOpenTaskId} />
    </div>
  );
}
