import {
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Button, Checkbox, Form, Input, TextField } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import { useSortProjectBoard, type ProjectColumnView, type TaskView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import { TaskTagDots } from './TaskTagDots';
import { TaskOwnerChips } from './TaskOwnerChips';

type Props = {
  projectId: number;
  columns: ProjectColumnView[];
  byColumn: Map<number, TaskView[]>;
  draftByColumn: Record<number, string>;
  setDraftByColumn: Dispatch<SetStateAction<Record<number, string>>>;
  onAddTask: (columnId: number, e: FormEvent) => void;
  onOpenTask: (id: number) => void;
  createPending: boolean;
  /** 无 TASK_ADD 时隐藏快建 */
  canAddTask?: boolean;
  /** 任务拖拽换列/排序（TASK_MOVE；触屏 / Tabbar / 筛选时由父级关掉） */
  taskDragEnabled: boolean;
  /** 列标题拖拽排序（TASK_LIST_SORT） */
  columnDragEnabled: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (taskId: number, selected: boolean) => void;
  batchEnabled?: boolean;
};

type DragPayload =
  { kind: 'task'; taskId: number; fromColumnId: number } | { kind: 'column'; columnId: number };

/** 看板：列卡片 + HTML5 拖拽换列/排序；列标题可重排列 */
export function ProjectBoard({
  projectId,
  columns,
  byColumn,
  draftByColumn,
  setDraftByColumn,
  onAddTask,
  onOpenTask,
  createPending,
  canAddTask = true,
  taskDragEnabled,
  columnDragEnabled: columnDragAllowed,
  selectedIds,
  onToggleSelect,
  batchEnabled,
}: Props) {
  const { t } = useTranslation('project');
  const sortBoard = useSortProjectBoard();
  const [local, setLocal] = useState<Map<number, TaskView[]> | null>(null);
  const [localColumns, setLocalColumns] = useState<ProjectColumnView[] | null>(null);
  const [dropCol, setDropCol] = useState<number | null>(null);
  const [dropColumnInsert, setDropColumnInsert] = useState<number | null>(null);
  const dragRef = useRef<DragPayload | null>(null);

  useEffect(() => {
    setLocalColumns(null);
  }, [columns]);

  const map = local ?? byColumn;
  const cols = localColumns ?? columns;
  const columnDragEnabled = columnDragAllowed && cols.length > 1;

  const persistTasks = (next: Map<number, TaskView[]>, order = cols) => {
    setLocal(next);
    const sort = order.map((col) => ({
      id: col.id,
      task: (next.get(col.id) ?? []).map((task) => task.id),
    }));
    sortBoard.mutate(
      { projectId, sort },
      {
        onError: (err) => {
          setLocal(null);
          toastRequestError(err, t('error'));
        },
        onSettled: () => {
          window.setTimeout(() => setLocal(null), 400);
        },
      },
    );
  };

  const persistColumns = (next: ProjectColumnView[]) => {
    setLocalColumns(next);
    sortBoard.mutate(
      {
        projectId,
        onlyColumn: true,
        sort: next.map((col) => ({ id: col.id, task: [] })),
      },
      {
        onError: (err) => {
          setLocalColumns(null);
          toastRequestError(err, t('error'));
        },
        onSettled: () => {
          window.setTimeout(() => setLocalColumns(null), 400);
        },
      },
    );
  };

  const onTaskDragStart = (taskId: number, fromColumnId: number, e: DragEvent) => {
    if (!taskDragEnabled) return;
    dragRef.current = { kind: 'task', taskId, fromColumnId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `task:${taskId}`);
  };

  const onColumnDragStart = (columnId: number, e: DragEvent) => {
    if (!columnDragEnabled) return;
    e.stopPropagation();
    dragRef.current = { kind: 'column', columnId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `column:${columnId}`);
  };

  const onDropColumnBody = (toColumnId: number, e: DragEvent) => {
    e.preventDefault();
    setDropCol(null);
    setDropColumnInsert(null);
    const payload = dragRef.current;
    dragRef.current = null;
    if (!payload || !taskDragEnabled || payload.kind !== 'task') return;

    const next = new Map<number, TaskView[]>();
    for (const col of cols) {
      next.set(col.id, [...(map.get(col.id) ?? [])]);
    }
    const fromList = next.get(payload.fromColumnId) ?? [];
    const idx = fromList.findIndex((task) => task.id === payload.taskId);
    if (idx < 0) return;
    const [moved] = fromList.splice(idx, 1);
    if (!moved) return;
    const toList = next.get(toColumnId) ?? [];
    toList.push({ ...moved, columnId: toColumnId });
    next.set(payload.fromColumnId, fromList);
    next.set(toColumnId, toList);
    persistTasks(next);
  };

  const onDropBeforeTask = (toColumnId: number, beforeTaskId: number, e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropCol(null);
    setDropColumnInsert(null);
    const payload = dragRef.current;
    dragRef.current = null;
    if (!payload || !taskDragEnabled || payload.kind !== 'task') return;

    const next = new Map<number, TaskView[]>();
    for (const col of cols) {
      next.set(col.id, [...(map.get(col.id) ?? [])]);
    }
    const fromList = next.get(payload.fromColumnId) ?? [];
    const idx = fromList.findIndex((task) => task.id === payload.taskId);
    if (idx < 0) return;
    const [moved] = fromList.splice(idx, 1);
    if (!moved) return;
    next.set(payload.fromColumnId, fromList);

    const toList = next.get(toColumnId) ?? [];
    let insertAt = toList.findIndex((task) => task.id === beforeTaskId);
    if (insertAt < 0) insertAt = toList.length;
    toList.splice(insertAt, 0, { ...moved, columnId: toColumnId });
    next.set(toColumnId, toList);
    persistTasks(next);
  };

  const onDropColumnHeader = (toColumnId: number, e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropCol(null);
    setDropColumnInsert(null);
    const payload = dragRef.current;
    dragRef.current = null;
    if (!payload || payload.kind !== 'column' || !columnDragEnabled) return;
    if (payload.columnId === toColumnId) return;

    const from = cols.findIndex((c) => c.id === payload.columnId);
    const to = cols.findIndex((c) => c.id === toColumnId);
    if (from < 0 || to < 0) return;
    const next = [...cols];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    persistColumns(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {taskDragEnabled || columnDragEnabled ? (
        <p className="text-muted text-xs">{t('board.dragHint')}</p>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {cols.map((col) => {
          const colTasks = map.get(col.id) ?? [];
          return (
            <section
              key={col.id}
              className={cn(
                'border-border bg-surface flex w-72 shrink-0 flex-col rounded-xl border',
                dropCol === col.id && 'ring-accent ring-2',
                dropColumnInsert === col.id && 'outline-accent outline-2 outline-offset-2',
              )}
              onDragOver={(e) => {
                if (!taskDragEnabled) return;
                if (dragRef.current?.kind === 'column') return;
                e.preventDefault();
                setDropCol(col.id);
              }}
              onDragLeave={() => setDropCol((c) => (c === col.id ? null : c))}
              onDrop={(e) => onDropColumnBody(col.id, e)}
            >
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5',
                  columnDragEnabled && 'cursor-grab active:cursor-grabbing',
                )}
                draggable={columnDragEnabled}
                onDragStart={(e) => onColumnDragStart(col.id, e)}
                onDragOver={(e) => {
                  if (!columnDragEnabled || dragRef.current?.kind !== 'column') return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDropColumnInsert(col.id);
                }}
                onDragLeave={() => setDropColumnInsert((c) => (c === col.id ? null : c))}
                onDrop={(e) => onDropColumnHeader(col.id, e)}
                title={columnDragEnabled ? t('board.dragColumn') : undefined}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: col.color || 'var(--color-accent, #3b82f6)' }}
                  aria-hidden
                />
                <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{col.name}</h3>
                <span className="text-muted text-xs">{colTasks.length}</span>
              </div>
              <div className="flex max-h-[calc(100dvh-16rem)] flex-col gap-2 overflow-auto px-2 pb-2">
                {colTasks.length === 0 ? (
                  <p className="text-muted px-1 py-2 text-xs">{t('board.emptyColumn')}</p>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable={taskDragEnabled}
                      onDragStart={(e) => onTaskDragStart(task.id, col.id, e)}
                      onDragOver={(e) => {
                        if (!taskDragEnabled || dragRef.current?.kind === 'column') return;
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => onDropBeforeTask(col.id, task.id, e)}
                      className="flex items-start gap-1"
                    >
                      {batchEnabled && onToggleSelect ? (
                        <Checkbox
                          className="mt-2 shrink-0"
                          isSelected={Boolean(selectedIds?.has(task.id))}
                          onChange={(on) => onToggleSelect(task.id, on)}
                          aria-label={t('batch.selectTask', { name: task.name })}
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      ) : null}
                      <Button
                        variant="secondary"
                        className={cn(
                          'h-auto min-w-0 flex-1 flex-col items-start gap-1 px-3 py-2 text-left',
                          taskDragEnabled && 'cursor-grab active:cursor-grabbing',
                        )}
                        style={
                          task.color
                            ? { borderLeftWidth: 3, borderLeftColor: task.color }
                            : undefined
                        }
                        onPress={() => onOpenTask(task.id)}
                      >
                        <span
                          className={cn(
                            'w-full truncate text-sm font-medium',
                            task.completeAt && 'text-muted line-through',
                          )}
                        >
                          {task.name}
                        </span>
                        <TaskTagDots projectId={projectId} tagIds={task.tagIds} />
                        <TaskOwnerChips projectId={projectId} ownerUserIds={task.ownerUserIds} />
                        {task.priorityName || task.endAt ? (
                          <span className="text-muted w-full truncate text-[11px] font-normal">
                            {task.priorityName || ''}
                            {task.endAt
                              ? `${task.priorityName ? ' · ' : ''}${new Date(task.endAt).toLocaleDateString()}`
                              : ''}
                          </span>
                        ) : null}
                      </Button>
                    </div>
                  ))
                )}
              </div>
              {canAddTask ? (
                <Form className="border-border border-t p-2" onSubmit={(e) => onAddTask(col.id, e)}>
                  <TextField
                    aria-label={t('board.addPlaceholder')}
                    value={draftByColumn[col.id] ?? ''}
                    onChange={(v) => setDraftByColumn((prev) => ({ ...prev, [col.id]: v }))}
                    className="w-full"
                  >
                    <Input placeholder={t('board.addPlaceholder')} />
                  </TextField>
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    className="mt-1 w-full"
                    isDisabled={!(draftByColumn[col.id] ?? '').trim() || createPending}
                  >
                    {t('board.add')}
                  </Button>
                </Form>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
