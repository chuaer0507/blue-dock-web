import { useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Radio,
  RadioGroup,
  Select,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import {
  fetchProjectPermission,
  fetchTaskEasyLists,
  projectAllowsPoint,
  projectMemberHasPoint,
  projectPermissionKeys,
  useCreateTask,
  useCurrentUser,
  useProjectList,
  useProjectPermission,
  useTaskCalendar,
  useUpdateTaskDates,
  type ProjectView,
  type TaskView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { useCalendarUiStore, type CalendarViewMode } from '../../stores/calendar';
import { useScreen } from '../../utils/platform';
import { cn } from '../../utils/cn';
import { TaskModal } from '../task/TaskModal';
import {
  dayDiff,
  endOfWeek,
  formatHm,
  isAllDayOnDay,
  isOverdue,
  isToday,
  monthGrid,
  overlapsDay,
  rangeForView,
  shiftAnchor,
  shiftIsoByDays,
  startOfWeek,
  taskAnchorDay,
  timedSlotOnDay,
  toLocalDateTime,
  toYmd,
} from './date-utils';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const MONTH_MAX = 3;
const HOUR_PX = 44;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function tasksOnDay(tasks: TaskView[], day: Date): TaskView[] {
  return tasks.filter((t) => overlapsDay(t, day));
}

function partitionDayTasks(tasks: TaskView[], day: Date) {
  const allDay: TaskView[] = [];
  const timed: TaskView[] = [];
  for (const task of tasksOnDay(tasks, day)) {
    if (isAllDayOnDay(task, day)) allDay.push(task);
    else timed.push(task);
  }
  return { allDay, timed };
}

function TaskChip({
  task,
  onOpen,
  compact,
  dragEnabled,
  timePrefix,
}: {
  task: TaskView;
  onOpen: (id: number) => void;
  compact?: boolean;
  dragEnabled: boolean;
  timePrefix?: string;
}) {
  const overdue = isOverdue(task);
  return (
    <div
      draggable={dragEnabled}
      onDragStart={(e) => {
        if (!dragEnabled) return;
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(dragEnabled && 'cursor-grab active:cursor-grabbing')}
    >
      <Button
        variant="ghost"
        className={cn(
          'h-auto w-full justify-start truncate rounded-md px-1.5 text-left text-xs font-normal',
          compact ? 'py-0.5' : 'py-1',
          overdue ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-foreground hover:bg-accent/20',
          task.completeAt ? 'line-through opacity-50' : '',
        )}
        style={!overdue && task.color ? { borderLeft: `3px solid ${task.color}` } : undefined}
        onPress={() => onOpen(task.id)}
        aria-label={task.name}
      >
        {timePrefix ? `${timePrefix} ` : ''}
        {task.name}
      </Button>
    </div>
  );
}

function DayDropZone({
  day,
  dragEnabled,
  onDropTask,
  className,
  children,
}: {
  day: Date;
  dragEnabled: boolean;
  onDropTask: (taskId: number, day: Date) => void;
  className?: string;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={cn(className, over && dragEnabled && 'ring-accent/40 bg-accent/5 ring-2')}
      onDragOver={(e) => {
        if (!dragEnabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e: DragEvent) => {
        setOver(false);
        if (!dragEnabled) return;
        e.preventDefault();
        const id = Number(e.dataTransfer.getData('text/plain'));
        if (Number.isFinite(id) && id > 0) onDropTask(id, day);
      }}
    >
      {children}
    </div>
  );
}

function TimedBlock({
  task,
  day,
  dragEnabled,
  onOpen,
}: {
  task: TaskView;
  day: Date;
  dragEnabled: boolean;
  onOpen: (id: number) => void;
}) {
  const slot = timedSlotOnDay(task, day);
  if (!slot) return null;
  const overdue = isOverdue(task);
  const label = `${formatHm(task.startAt)}${
    task.endAt ? `–${formatHm(task.endAt)}` : ''
  } ${task.name}`;
  return (
    <div
      draggable={dragEnabled}
      onDragStart={(e) => {
        if (!dragEnabled) return;
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(
        'z-1 absolute inset-x-0.5 overflow-hidden rounded-md border px-1 py-0.5 text-left text-[11px] leading-tight',
        dragEnabled && 'cursor-grab active:cursor-grabbing',
        overdue
          ? 'border-danger/30 bg-danger/15 text-danger'
          : 'border-accent/30 bg-accent/15 text-foreground',
        task.completeAt && 'line-through opacity-50',
      )}
      style={{
        top: `${slot.topPct}%`,
        height: `${slot.heightPct}%`,
        borderLeftWidth: 3,
        borderLeftColor: overdue ? undefined : task.color || undefined,
      }}
    >
      <button
        type="button"
        className="block h-full w-full truncate text-left"
        onClick={() => onOpen(task.id)}
        aria-label={label}
      >
        <span className="font-medium">{formatHm(task.startAt)}</span> {task.name}
      </button>
    </div>
  );
}

type CreateDraft = { day: Date; hour: number } | { day: Date; allDay: true };

/** 日历：任务起止时间日程（月 / 周 / 日）；桌面可拖到其他日改期 */
export function CalendarPage() {
  const { t } = useTranslation('calendar');
  const { navMode } = useScreen();
  const dragEnabled = navMode !== 'tabbar';
  const view = useCalendarUiStore((s) => s.view);
  const setView = useCalendarUiStore((s) => s.setView);
  const [anchor, setAnchor] = useState(() => new Date());
  const [projectFilter, setProjectFilter] = useState('all');
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null);
  const createState = useOverlayState();
  const [createProjectId, setCreateProjectId] = useState('');
  const [createName, setCreateName] = useState('');
  const updateDates = useUpdateTaskDates();
  const createTask = useCreateTask();
  const projects = useProjectList({ archived: 'no', type: 'all' });
  const me = useCurrentUser();
  const myUserId = me.data?.userId ?? 0;
  const queryClient = useQueryClient();
  const createPid = Number(createProjectId) || 0;
  const createProject = (projects.data ?? []).find((p: ProjectView) => p.id === createPid);
  const createMyOwner = createProject?.myOwner ?? 0;
  const createEditOpen = Boolean(
    createProject && !createProject.departmentReadonly && !createProject.archivedAt,
  );
  const createPerm = useProjectPermission(
    createPid > 0 ? createPid : undefined,
    Boolean(createProject) && !createProject?.isPersonal && createMyOwner === 0,
  );
  const canCreate =
    createEditOpen && projectMemberHasPoint(createMyOwner, createPerm.data, 'TASK_ADD');

  const projectById = useMemo(() => {
    const map = new Map<number, ProjectView>();
    for (const p of projects.data ?? []) map.set(p.id, p);
    return map;
  }, [projects.data]);

  const range = useMemo(() => rangeForView(view, anchor), [view, anchor]);
  const { data, isLoading, isError, refetch } = useTaskCalendar(range.start, range.end);

  const allTasks: TaskView[] = data ?? [];
  const tasks = useMemo(() => {
    if (projectFilter === 'all') return allTasks;
    const pid = Number(projectFilter);
    if (!Number.isFinite(pid) || pid <= 0) return allTasks;
    return allTasks.filter((task: TaskView) => task.projectId === pid);
  }, [allTasks, projectFilter]);

  const projectOptions = useMemo(() => {
    const ids = new Set<number>(allTasks.map((t: TaskView) => t.projectId));
    const nameById = new Map<number, string>();
    for (const p of projects.data ?? []) {
      if (ids.has(p.id)) nameById.set(p.id, p.name);
    }
    return [...ids]
      .map((id) => ({ id, name: nameById.get(id) ?? `#${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [allTasks, projects.data]);

  const projectList = projects.data ?? [];

  const taskById = useMemo(() => {
    const map = new Map<number, TaskView>();
    for (const task of allTasks) map.set(task.id, task);
    return map;
  }, [allTasks]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [anchor]);

  const monthCells = useMemo(() => monthGrid(anchor), [anchor]);

  const title = useMemo(() => {
    if (view === 'month') {
      return t('titleMonth', {
        year: anchor.getFullYear(),
        month: anchor.getMonth() + 1,
      });
    }
    if (view === 'week') {
      return t('titleWeek', {
        start: toYmd(startOfWeek(anchor)),
        end: toYmd(endOfWeek(anchor)),
      });
    }
    return toYmd(anchor);
  }, [anchor, t, view]);

  const onOpenTask = (id: number) => {
    setOpenTaskId(id);
  };

  const onSelectDay = (day: Date) => {
    setAnchor(day);
    if (view === 'month') setView('day');
  };

  const openCreate = (draft: CreateDraft) => {
    setCreateDraft(draft);
    setCreateName('');
    if (!createProjectId && projectList[0]) {
      setCreateProjectId(String(projectList[0].id));
    }
    createState.open();
  };

  const onCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!createDraft) return;
    const pid = Number(createProjectId);
    const name = createName.trim();
    if (!Number.isFinite(pid) || pid <= 0 || !name) {
      toast.danger(t('create.required'));
      return;
    }
    if (!canCreate) {
      toast.danger(t('create.denied'));
      return;
    }
    let startAt: string;
    let endAt: string;
    if ('allDay' in createDraft) {
      const d = createDraft.day;
      startAt = toLocalDateTime(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
      endAt = toLocalDateTime(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59));
    } else {
      const d = createDraft.day;
      const h = createDraft.hour;
      startAt = toLocalDateTime(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0));
      endAt =
        h >= 23
          ? toLocalDateTime(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59))
          : toLocalDateTime(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h + 1, 0, 0));
    }
    createTask.mutate(
      { projectId: pid, name, startAt, endAt },
      {
        onSuccess: (task) => {
          toast.success(t('create.ok'));
          createState.close();
          setCreateDraft(null);
          void refetch();
          setOpenTaskId(task.id);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDropTask = (taskId: number, targetDay: Date) => {
    const task = taskById.get(taskId);
    if (!task) return;
    const from = taskAnchorDay(task);
    if (!from) return;
    const delta = dayDiff(from, targetDay);
    if (delta === 0) return;

    const nextStart = task.startAt ? shiftIsoByDays(task.startAt, delta) : undefined;
    const nextEnd = task.endAt ? shiftIsoByDays(task.endAt, delta) : undefined;
    if (nextStart === undefined && nextEnd === undefined) return;

    const commit = () => {
      updateDates.mutate(
        {
          taskId,
          projectId: task.projectId,
          ...(nextStart !== undefined ? { startAt: nextStart } : {}),
          ...(nextEnd !== undefined ? { endAt: nextEnd } : {}),
        },
        {
          onSuccess: () => toast.success(t('reschedule.done')),
          onError: (err) => toastRequestError(err, t('error')),
        },
      );
    };

    const runWithPermission = (allowed: boolean) => {
      if (!allowed) {
        toast.danger(t('reschedule.denied'));
        return;
      }
      const owners = task.ownerUserIds ?? [];
      const rangeStart = nextStart ?? nextEnd;
      const rangeEnd = nextEnd ?? nextStart;
      if (owners.length > 0 && rangeStart && rangeEnd) {
        void fetchTaskEasyLists({
          userIds: owners,
          startAt: rangeStart,
          endAt: rangeEnd,
          excludeTaskId: taskId,
          limit: 5,
        })
          .then((conflicts) => {
            if (conflicts.length > 0) {
              const names = conflicts
                .slice(0, 3)
                .map((c) => c.name)
                .join('、');
              if (
                !window.confirm(
                  t('reschedule.conflictConfirm', {
                    count: conflicts.length,
                    names: conflicts.length > 3 ? `${names}…` : names,
                  }),
                )
              ) {
                return;
              }
            }
            commit();
          })
          .catch(() => commit());
        return;
      }
      commit();
    };

    const project = projectById.get(task.projectId);
    if (!project || project.departmentReadonly || project.archivedAt) {
      toast.danger(t('reschedule.denied'));
      return;
    }
    const myOwner = project.myOwner ?? 0;
    const taskRoles = {
      isTaskLeader: myUserId > 0 && (task.ownerUserIds ?? []).includes(myUserId),
      isTaskAssist: myUserId > 0 && (task.assistUserIds ?? []).includes(myUserId),
    };
    if (myOwner >= 1 || project.isPersonal) {
      runWithPermission(true);
      return;
    }
    void queryClient
      .fetchQuery({
        queryKey: projectPermissionKeys.one(task.projectId),
        queryFn: () => fetchProjectPermission(task.projectId),
        staleTime: 30_000,
      })
      .then((view) => {
        runWithPermission(projectAllowsPoint(myOwner, view, 'TASK_TIME', taskRoles));
      })
      .catch((err) => toastRequestError(err, t('error')));
  };

  const renderTimeColumns = (days: Date[]) => (
    <div className="border-border bg-surface overflow-hidden rounded-xl border">
      <div
        className="border-border grid border-b"
        style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="text-muted px-1 py-2 text-center text-[10px]">{t('allDay')}</div>
        {days.map((day, i) => {
          const { allDay } = partitionDayTasks(tasks, day);
          return (
            <DayDropZone
              key={`all-${toYmd(day)}`}
              day={day}
              dragEnabled={dragEnabled}
              onDropTask={onDropTask}
              className={cn('border-border min-h-14 border-s p-1', isToday(day) && 'bg-accent/5')}
            >
              {days.length > 1 ? (
                <Button
                  variant="ghost"
                  className="mb-1 h-auto w-full justify-between px-0.5 py-0.5 font-normal"
                  onPress={() => {
                    setAnchor(day);
                    setView('day');
                  }}
                >
                  <span className="text-muted text-[10px]">{t(`weekday.${WEEKDAY_KEYS[i]!}`)}</span>
                  <span
                    className={cn(
                      'inline-flex size-5 items-center justify-center rounded-full text-[10px] font-medium',
                      isToday(day) && 'bg-accent text-accent-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>
                </Button>
              ) : null}
              <div className="flex flex-col gap-0.5">
                {allDay.map((task) => (
                  <TaskChip
                    key={task.id}
                    task={task}
                    onOpen={onOpenTask}
                    compact
                    dragEnabled={dragEnabled}
                  />
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted h-auto justify-start px-1 py-0.5 text-[10px] font-normal"
                  onPress={() => openCreate({ day, allDay: true })}
                >
                  <PlusIcon className="size-3" aria-hidden />
                  {t('create.allDay')}
                </Button>
              </div>
            </DayDropZone>
          );
        })}
      </div>

      <div className="max-h-[min(70vh,40rem)] overflow-auto">
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `3rem repeat(${days.length}, minmax(0, 1fr))`,
            height: HOURS.length * HOUR_PX,
          }}
        >
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-border text-muted absolute inset-x-0 border-t px-1 text-[10px]"
                style={{ top: h * HOUR_PX, height: HOUR_PX }}
              >
                {`${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>
          {days.map((day) => {
            const { timed } = partitionDayTasks(tasks, day);
            return (
              <DayDropZone
                key={`grid-${toYmd(day)}`}
                day={day}
                dragEnabled={dragEnabled}
                onDropTask={onDropTask}
                className={cn('border-border relative border-s', isToday(day) && 'bg-accent/5')}
              >
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="border-border hover:bg-default/60 absolute inset-x-0 border-t"
                    style={{ top: h * HOUR_PX, height: HOUR_PX }}
                    aria-label={t('create.atHour', { hour: h })}
                    onClick={() => openCreate({ day, hour: h })}
                  />
                ))}
                {timed.map((task) => (
                  <TimedBlock
                    key={task.id}
                    task={task}
                    day={day}
                    dragEnabled={dragEnabled}
                    onOpen={onOpenTask}
                  />
                ))}
              </DayDropZone>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted mt-1 text-sm">{title}</p>
          {dragEnabled ? <p className="text-muted mt-1 text-xs">{t('reschedule.hint')}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="min-w-40"
            value={projectFilter}
            onChange={(key) => setProjectFilter(String(key ?? 'all'))}
          >
            <Label className="sr-only">{t('filter.project')}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all" textValue={t('filter.all')}>
                  {t('filter.all')}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {projectOptions.map((p) => (
                  <ListBox.Item key={p.id} id={String(p.id)} textValue={p.name}>
                    {p.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <RadioGroup
            name="calendar-view"
            orientation="horizontal"
            value={view}
            onChange={(v) => setView(v as CalendarViewMode)}
          >
            <Label className="sr-only">{t('title')}</Label>
            {(['month', 'week', 'day'] as const).map((mode) => (
              <Radio key={mode} value={mode}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  {t(`view.${mode}`)}
                </Radio.Content>
              </Radio>
            ))}
          </RadioGroup>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setAnchor(shiftAnchor(view, anchor, -1))}
            aria-label={t('prev')}
          >
            <ChevronLeftIcon className="size-4" aria-hidden />
          </Button>
          <Button size="sm" variant="secondary" onPress={() => setAnchor(new Date())}>
            {t('today')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => setAnchor(shiftAnchor(view, anchor, 1))}
            aria-label={t('next')}
          >
            <ChevronRightIcon className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      {isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {isError ? (
        <div className="flex items-center gap-3">
          <p className="text-danger text-sm">{t('error')}</p>
          <Button size="sm" variant="secondary" onPress={() => void refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && tasks.length === 0 ? (
        <p className="text-muted text-sm">{t('empty')}</p>
      ) : null}

      {view === 'month' && !isLoading ? (
        <div className="border-border bg-surface overflow-hidden rounded-xl border">
          <div className="border-border grid grid-cols-7 border-b">
            {WEEKDAY_KEYS.map((key) => (
              <div key={key} className="text-muted px-2 py-2 text-center text-xs font-medium">
                {t(`weekday.${key}`)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map((day) => {
              const inMonth = day.getMonth() === anchor.getMonth();
              const dayTasks = tasksOnDay(tasks, day);
              const shown = dayTasks.slice(0, MONTH_MAX);
              const more = dayTasks.length - shown.length;
              return (
                <DayDropZone
                  key={toYmd(day)}
                  day={day}
                  dragEnabled={dragEnabled}
                  onDropTask={onDropTask}
                  className={cn(
                    'border-border hover:bg-default min-h-24 border-e border-t p-1.5 text-left align-top',
                    !inMonth && 'bg-default/40 text-muted',
                    isToday(day) && 'bg-accent/5',
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    className={cn(
                      'mb-1 size-6 min-w-0 rounded-full p-0 text-xs font-normal',
                      isToday(day) && 'bg-accent text-accent-foreground',
                    )}
                    onPress={() => onSelectDay(day)}
                    aria-label={toYmd(day)}
                  >
                    {day.getDate()}
                  </Button>
                  <div className="flex flex-col gap-0.5">
                    {shown.map((task) => (
                      <TaskChip
                        key={task.id}
                        task={task}
                        onOpen={onOpenTask}
                        compact
                        dragEnabled={dragEnabled}
                        timePrefix={isAllDayOnDay(task, day) ? undefined : formatHm(task.startAt)}
                      />
                    ))}
                    {more > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted h-auto justify-start px-1 py-0 text-[11px] font-normal"
                        onPress={() => onSelectDay(day)}
                      >
                        {t('more', { count: more })}
                      </Button>
                    ) : null}
                  </div>
                </DayDropZone>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === 'week' && !isLoading ? renderTimeColumns(weekDays) : null}
      {view === 'day' && !isLoading ? renderTimeColumns([anchor]) : null}

      <Modal>
        <Modal.Backdrop
          isOpen={createState.isOpen}
          onOpenChange={(open) => {
            createState.setOpen(open);
            if (!open) setCreateDraft(null);
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('create.title')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Form className="flex flex-col gap-4" onSubmit={onCreateSubmit}>
                  <p className="text-muted text-xs">
                    {createDraft && 'allDay' in createDraft
                      ? t('create.hintAllDay', { date: toYmd(createDraft.day) })
                      : createDraft && 'hour' in createDraft
                        ? t('create.hintTimed', {
                            date: toYmd(createDraft.day),
                            hour: String(createDraft.hour).padStart(2, '0'),
                            hourEnd: String(
                              createDraft.hour >= 23 ? 23 : createDraft.hour + 1,
                            ).padStart(2, '0'),
                          })
                        : null}
                  </p>
                  <Select
                    className="w-full"
                    value={createProjectId || undefined}
                    onChange={(key) => setCreateProjectId(String(key ?? ''))}
                    isDisabled={projects.isLoading || projectList.length === 0}
                  >
                    <Label>{t('create.project')}</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {projectList.map((p: ProjectView) => (
                          <ListBox.Item key={p.id} id={String(p.id)} textValue={p.name}>
                            {p.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  {projectList.length === 0 && !projects.isLoading ? (
                    <p className="text-muted text-xs">{t('create.emptyProjects')}</p>
                  ) : null}
                  {createPid > 0 && !canCreate && !createPerm.isLoading ? (
                    <p className="text-danger text-xs">{t('create.denied')}</p>
                  ) : null}
                  <TextField
                    name="taskName"
                    value={createName}
                    onChange={setCreateName}
                    isRequired
                    className="w-full"
                    isDisabled={createPid > 0 && !canCreate}
                  >
                    <Label>{t('create.name')}</Label>
                    <Input placeholder={t('create.namePlaceholder')} />
                  </TextField>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onPress={createState.close}>
                      {t('create.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isDisabled={
                        createTask.isPending ||
                        projectList.length === 0 ||
                        (createPid > 0 && !canCreate) ||
                        createPerm.isLoading
                      }
                    >
                      {createTask.isPending ? t('create.submitting') : t('create.submit')}
                    </Button>
                  </div>
                </Form>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      <TaskModal taskId={openTaskId} onOpenChange={setOpenTaskId} />
    </div>
  );
}
