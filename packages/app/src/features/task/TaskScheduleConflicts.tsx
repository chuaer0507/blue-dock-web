import { Button } from '@heroui/react';
import { useTaskEasyLists } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  userIds: number[];
  startAt: string | null;
  endAt: string | null;
  excludeTaskId?: number;
  onOpenTask?: (taskId: number) => void;
};

/** 负责人在计划时段内的其它未完成任务（冲突提示） */
export function TaskScheduleConflicts({
  userIds,
  startAt,
  endAt,
  excludeTaskId,
  onOpenTask,
}: Props) {
  const { t } = useTranslation('task');
  const ready = userIds.some((id) => id > 0) && Boolean(startAt?.trim()) && Boolean(endAt?.trim());
  const query = useTaskEasyLists(
    ready
      ? {
          userIds,
          startAt: startAt!,
          endAt: endAt!,
          excludeTaskId,
          limit: 8,
        }
      : undefined,
    ready,
  );

  if (!ready) return null;
  if (query.isLoading) {
    return <p className="text-muted text-xs">{t('conflict.loading')}</p>;
  }
  if (query.isError) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-danger text-xs">{t('conflict.error')}</p>
        <Button size="sm" variant="ghost" onPress={() => void query.refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const list = query.data ?? [];
  if (list.length === 0) {
    return <p className="text-muted text-xs">{t('conflict.none')}</p>;
  }

  return (
    <div className="border-warning/40 bg-warning/5 flex flex-col gap-1.5 rounded-lg border px-3 py-2">
      <p className="text-warning text-xs font-medium">{t('conflict.title', { count: list.length })}</p>
      <ul className="flex flex-col gap-1">
        {list.map((row) => (
          <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
            <button
              type="button"
              className="text-foreground min-w-0 truncate text-left underline-offset-2 hover:underline"
              onClick={() => onOpenTask?.(row.id)}
              disabled={!onOpenTask}
            >
              {row.name}
            </button>
            <span className="text-muted shrink-0">
              {row.projectName || '—'}
              {row.startAt || row.endAt
                ? ` · ${(row.startAt ?? '').slice(0, 16)}${row.endAt ? ` → ${row.endAt.slice(0, 16)}` : ''}`
                : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
