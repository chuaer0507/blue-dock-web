import { type DragEvent, useRef, useState } from 'react';
import { Checkbox, toast } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import { useChangeTaskFlow, type ProjectFlowItemView, type TaskView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import { TaskTagDots } from './TaskTagDots';
import { TaskOwnerChips } from './TaskOwnerChips';

/** 0 = 未绑定节点 */
const UNSET_FLOW_ID = 0;

type Props = {
  projectId: number;
  items: ProjectFlowItemView[];
  byFlowItem: Map<number, TaskView[]>;
  onOpenTask: (id: number) => void;
  dragEnabled: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (taskId: number, selected: boolean) => void;
  batchEnabled?: boolean;
};

type DragPayload = { taskId: number; fromFlowItemId: number };

/** 工作流视图：按 flowItem 分列，拖拽触发 task/flow 流转 */
export function ProjectWorkflow({
  projectId,
  items,
  byFlowItem,
  onOpenTask,
  dragEnabled,
  selectedIds,
  onToggleSelect,
  batchEnabled,
}: Props) {
  const { t } = useTranslation('project');
  const changeFlow = useChangeTaskFlow();
  const [local, setLocal] = useState<Map<number, TaskView[]> | null>(null);
  const [dropId, setDropId] = useState<number | null>(null);
  const dragRef = useRef<DragPayload | null>(null);

  const map = local ?? byFlowItem;
  const columns: Array<{ id: number; name: string; color: string; status: string }> = [
    ...items.map((it) => ({
      id: it.id,
      name: it.name,
      color: it.color,
      status: it.status,
    })),
    {
      id: UNSET_FLOW_ID,
      name: t('workflow.unset'),
      color: '',
      status: '',
    },
  ];

  const onDragStart = (taskId: number, fromFlowItemId: number, e: DragEvent) => {
    if (!dragEnabled) return;
    dragRef.current = { taskId, fromFlowItemId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(taskId));
  };

  const onDropColumn = (toFlowItemId: number, e: DragEvent) => {
    e.preventDefault();
    setDropId(null);
    const payload = dragRef.current;
    dragRef.current = null;
    if (!payload || !dragEnabled) return;
    if (payload.fromFlowItemId === toFlowItemId) return;
    if (toFlowItemId === UNSET_FLOW_ID) {
      toast.danger(t('workflow.cannotUnset'));
      return;
    }

    const next = new Map<number, TaskView[]>();
    for (const [k, list] of map.entries()) next.set(k, [...list]);
    const fromList = next.get(payload.fromFlowItemId) ?? [];
    const idx = fromList.findIndex((x) => x.id === payload.taskId);
    if (idx < 0) return;
    const [task] = fromList.splice(idx, 1);
    if (!task) return;
    next.set(payload.fromFlowItemId, fromList);
    const toList = next.get(toFlowItemId) ?? [];
    toList.unshift({ ...task, flowItemId: toFlowItemId });
    next.set(toFlowItemId, toList);
    setLocal(next);

    changeFlow.mutate(
      { taskId: payload.taskId, flowItemId: toFlowItemId },
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

  return (
    <div className="flex flex-col gap-3">
      {dragEnabled ? <p className="text-muted text-xs">{t('workflow.dragHint')}</p> : null}
      <div className="flex min-h-80 gap-3 overflow-x-auto pb-2">
        {columns.map((col) => {
          const tasks = map.get(col.id) ?? [];
          const isDrop = dropId === col.id;
          return (
            <section
              key={col.id}
              className={cn(
                'border-border bg-surface flex w-64 shrink-0 flex-col rounded-xl border',
                isDrop && 'border-accent ring-accent/30 ring-2',
              )}
              onDragOver={(e) => {
                if (!dragEnabled) return;
                e.preventDefault();
                setDropId(col.id);
              }}
              onDragLeave={() => setDropId((id) => (id === col.id ? null : id))}
              onDrop={(e) => onDropColumn(col.id, e)}
            >
              <header className="border-border flex items-center gap-2 border-b px-3 py-2">
                {col.color ? (
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: col.color }}
                    aria-hidden
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{col.name}</h3>
                  {col.status ? (
                    <p className="text-muted truncate text-[10px]">{col.status}</p>
                  ) : null}
                </div>
                <span className="text-muted text-xs">{tasks.length}</span>
              </header>
              <ul className="flex min-h-24 flex-col gap-2 p-2">
                {tasks.length === 0 ? (
                  <li className="text-muted px-1 py-4 text-center text-xs">
                    {t('workflow.emptyColumn')}
                  </li>
                ) : (
                  tasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-1">
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
                      <button
                        type="button"
                        draggable={dragEnabled && col.id !== UNSET_FLOW_ID}
                        onDragStart={(e) => onDragStart(task.id, col.id, e)}
                        onClick={() => onOpenTask(task.id)}
                        className={cn(
                          'border-border bg-background hover:bg-default flex min-w-0 flex-1 flex-col gap-1 rounded-lg border px-2.5 py-2 text-left text-sm',
                          dragEnabled &&
                            col.id !== UNSET_FLOW_ID &&
                            'cursor-grab active:cursor-grabbing',
                          task.completeAt && 'text-muted line-through',
                        )}
                      >
                        <span className="truncate">{task.name}</span>
                        <TaskTagDots projectId={projectId} tagIds={task.tagIds} />
                        <TaskOwnerChips projectId={projectId} ownerUserIds={task.ownerUserIds} />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
