import { useState } from 'react';
import { Button, Label, ListBox, Select, toast } from '@heroui/react';
import { useArchiveTask, useMoveTask, useUpdateTask, type ProjectColumnView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  projectId: number;
  selectedIds: number[];
  columns: ProjectColumnView[];
  visibleIds: number[];
  onClear: () => void;
  onSelectVisible: () => void;
  disabled?: boolean;
  /** TASK_STATUS */
  canComplete?: boolean;
  /** TASK_ARCHIVED */
  canArchive?: boolean;
  /** TASK_MOVE */
  canMove?: boolean;
};

async function runSequential(
  ids: number[],
  fn: (id: number) => Promise<unknown>,
): Promise<{ ok: number; fail: number }> {
  let ok = 0;
  let fail = 0;
  for (const id of ids) {
    try {
      await fn(id);
      ok += 1;
    } catch {
      fail += 1;
    }
  }
  return { ok, fail };
}

/** 项目视图批量操作：完成 / 重开 / 归档 / 换列 */
export function ProjectBatchBar({
  projectId,
  selectedIds,
  columns,
  visibleIds,
  onClear,
  onSelectVisible,
  disabled,
  canComplete = true,
  canArchive = true,
  canMove = true,
}: Props) {
  const { t } = useTranslation('project');
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const moveTask = useMoveTask();
  const [columnId, setColumnId] = useState('');
  const [busy, setBusy] = useState(false);

  if (selectedIds.length === 0) return null;

  const report = (ok: number, fail: number) => {
    if (fail === 0) {
      toast.success(t('batch.ok', { count: ok }));
    } else {
      toast.danger(t('batch.partial', { ok, fail }));
    }
    onClear();
  };

  const withBusy = async (fn: () => Promise<void>) => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const onComplete = (complete: 0 | 1) =>
    void withBusy(async () => {
      if (!canComplete) return;
      const { ok, fail } = await runSequential(selectedIds, (taskId) =>
        updateTask.mutateAsync({ taskId, projectId, complete }),
      );
      report(ok, fail);
    });

  const onArchive = () =>
    void withBusy(async () => {
      if (!canArchive) return;
      if (!window.confirm(t('batch.archiveConfirm', { count: selectedIds.length }))) return;
      const { ok, fail } = await runSequential(selectedIds, (taskId) =>
        archiveTask.mutateAsync({ taskId }),
      );
      report(ok, fail);
    });

  const onMove = () =>
    void withBusy(async () => {
      if (!canMove) return;
      const cid = Number(columnId);
      if (!Number.isFinite(cid) || cid <= 0) {
        toast.danger(t('batch.needColumn'));
        return;
      }
      const { ok, fail } = await runSequential(selectedIds, (taskId) =>
        moveTask.mutateAsync({ taskId, projectId, columnId: cid }),
      );
      report(ok, fail);
    });

  return (
    <div
      className="border-border bg-accent-soft text-accent-soft-foreground flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2"
      role="toolbar"
      aria-label={t('batch.title')}
    >
      <p className="text-sm font-medium">{t('batch.selected', { count: selectedIds.length })}</p>
      <Button size="sm" variant="ghost" isDisabled={busy || disabled} onPress={onSelectVisible}>
        {t('batch.selectVisible', { count: visibleIds.length })}
      </Button>
      <Button size="sm" variant="ghost" isDisabled={busy || disabled} onPress={onClear}>
        {t('batch.clear')}
      </Button>
      <span className="bg-border mx-1 hidden h-4 w-px sm:block" aria-hidden />
      {canComplete ? (
        <>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={busy || disabled}
            onPress={() => onComplete(1)}
          >
            {t('batch.complete')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={busy || disabled}
            onPress={() => onComplete(0)}
          >
            {t('batch.reopen')}
          </Button>
        </>
      ) : null}
      {canArchive ? (
        <Button size="sm" variant="danger" isDisabled={busy || disabled} onPress={onArchive}>
          {t('batch.archive')}
        </Button>
      ) : null}
      {canMove ? (
        <div className="flex min-w-40 flex-1 items-end gap-2 sm:max-w-xs">
          <Select
            className="min-w-0 flex-1"
            value={columnId || undefined}
            onChange={(key) => setColumnId(String(key ?? ''))}
            isDisabled={busy || disabled || columns.length === 0}
            aria-label={t('batch.moveColumn')}
          >
            <Label>{t('batch.moveColumn')}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {columns.map((col) => (
                  <ListBox.Item key={col.id} id={String(col.id)} textValue={col.name}>
                    {col.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <Button size="sm" variant="secondary" isDisabled={busy || disabled} onPress={onMove}>
            {t('batch.move')}
          </Button>
        </div>
      ) : null}
      {busy ? <p className="text-muted text-xs">{t('batch.running')}</p> : null}
    </div>
  );
}
