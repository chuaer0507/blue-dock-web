import { useMemo, useState } from 'react';
import { Button, Checkbox } from '@heroui/react';
import type { TaskView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

const DAY_MS = 86_400_000;
const DAYS = 14;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function taskRange(task: TaskView): { start: Date; end: Date } | null {
  const end = task.endAt ? new Date(task.endAt) : null;
  const start = task.startAt ? new Date(task.startAt) : end;
  if (!start || Number.isNaN(start.getTime())) return null;
  const e = end && !Number.isNaN(end.getTime()) ? end : start;
  return { start: startOfDay(start), end: startOfDay(e) };
}

/** 简易甘特：两周时间轴 + 任务条 */
export function ProjectGantt({
  tasks,
  onOpenTask,
  selectedIds,
  onToggleSelect,
  batchEnabled,
}: {
  tasks: TaskView[];
  onOpenTask: (id: number) => void;
  selectedIds?: Set<number>;
  onToggleSelect?: (taskId: number, selected: boolean) => void;
  batchEnabled?: boolean;
}) {
  const { t } = useTranslation('project');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));

  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(anchor, i)), [anchor]);
  const rangeEnd = addDays(anchor, DAYS - 1);

  const rows = useMemo(() => {
    const out: Array<{ task: TaskView; start: Date; end: Date; left: number; width: number }> = [];
    for (const task of tasks) {
      const range = taskRange(task);
      if (!range) continue;
      const s = range.start < anchor ? anchor : range.start;
      const e = range.end > rangeEnd ? rangeEnd : range.end;
      if (e < anchor || s > rangeEnd) continue;
      const left = Math.round(((s.getTime() - anchor.getTime()) / DAY_MS / DAYS) * 1000) / 10;
      const span = Math.max(1, Math.floor((e.getTime() - s.getTime()) / DAY_MS) + 1);
      const width = Math.round((span / DAYS) * 1000) / 10;
      out.push({ task, start: range.start, end: range.end, left, width });
    }
    return out;
  }, [tasks, anchor, rangeEnd]);

  const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

  if (rows.length === 0) {
    return <p className="text-muted text-sm">{t('gantt.empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onPress={() => setAnchor((d) => addDays(d, -7))}>
          {t('gantt.prev')}
        </Button>
        <Button size="sm" variant="secondary" onPress={() => setAnchor(startOfDay(new Date()))}>
          {t('gantt.today')}
        </Button>
        <Button size="sm" variant="secondary" onPress={() => setAnchor((d) => addDays(d, 7))}>
          {t('gantt.next')}
        </Button>
        <span className="text-muted text-xs">
          {anchor.toLocaleDateString()} – {rangeEnd.toLocaleDateString()}
        </span>
      </div>

      <div className="border-border overflow-auto rounded-xl border">
        <div className="min-w-200">
          <div className="bg-default/40 text-muted grid grid-cols-[10rem_1fr] text-xs">
            <div className="border-border border-e px-3 py-2 font-medium">
              {t('gantt.taskName')}
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}
            >
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className="border-border border-e px-1 py-2 text-center last:border-e-0"
                >
                  <div>{t(`gantt.weekday.${weekdayKeys[d.getDay()]!}`)}</div>
                  <div className="text-foreground font-medium">{d.getDate()}</div>
                </div>
              ))}
            </div>
          </div>

          {rows.map(({ task, left, width }) => (
            <div
              key={task.id}
              className="border-border grid grid-cols-[10rem_1fr] border-t text-sm"
            >
              <div className="border-border flex items-center gap-1 border-e px-2 py-2">
                {batchEnabled && onToggleSelect ? (
                  <Checkbox
                    className="shrink-0"
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
                  className="hover:bg-default min-w-0 flex-1 truncate rounded px-1 py-1 text-left"
                  onClick={() => onOpenTask(task.id)}
                >
                  <span className={cn(task.completeAt && 'text-muted line-through')}>
                    {task.name}
                  </span>
                </button>
              </div>
              <div className="relative h-12">
                <div
                  className="bg-accent/80 absolute top-2 h-8 rounded-md px-2 text-[11px] leading-8 text-white"
                  style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
                  title={task.name}
                >
                  <span className="block truncate">{task.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
