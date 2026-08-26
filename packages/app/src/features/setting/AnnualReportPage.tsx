import { useMemo, useState } from 'react';
import { Button, Label, ListBox, Select } from '@heroui/react';
import { useNavigate } from 'react-router';
import { useAnnualReport, type AnnualReportDurationTask } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

function formatDurationMinutes(
  mins: number | undefined,
  labels: {
    minutes: (n: number) => string;
    hours: (n: number) => string;
    hoursMinutes: (h: number, m: number) => string;
  },
) {
  const n = Math.max(0, Math.floor(mins ?? 0));
  if (n < 60) return labels.minutes(n);
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (m === 0) return labels.hours(h);
  return labels.hoursMinutes(h, m);
}

function TaskHighlight({
  title,
  task,
  empty,
}: {
  title: string;
  task: AnnualReportDurationTask;
  empty: string;
}) {
  const { t } = useTranslation('setting');
  if (!task.id) {
    return (
      <div className="border-border rounded-lg border px-4 py-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted mt-1 text-sm">{empty}</p>
      </div>
    );
  }
  return (
    <div className="border-border rounded-lg border px-4 py-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 truncate text-sm font-semibold">{task.taskName}</p>
      <p className="text-muted mt-0.5 truncate text-xs">
        {[task.projectName, task.projectColumnName, task.flowItemName].filter(Boolean).join(' · ')}
      </p>
      <p className="text-muted mt-1 text-xs">
        {formatDurationMinutes(task.duration, {
          minutes: (count) => t('annual.minutes', { count }),
          hours: (count) => t('annual.hours', { count }),
          hoursMinutes: (hours, minutes) => t('annual.hoursMinutes', { hours, minutes }),
        })}
      </p>
    </div>
  );
}

/** 设置 · 个人年度报告 */
export function AnnualReportPage() {
  const { t } = useTranslation('setting');
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= Math.max(2000, currentYear - 5); y -= 1) list.push(y);
    return list;
  }, [currentYear]);
  const [year, setYear] = useState(currentYear);
  const report = useAnnualReport(year);

  const monthMax = useMemo(() => {
    const rows = report.data?.tasks.monthCompletedTask ?? [];
    return Math.max(1, ...rows.map((r) => r.num), 1);
  }, [report.data?.tasks.monthCompletedTask]);

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t('nav.annual')}</h2>
          <p className="text-muted mt-2 text-sm">{t('annual.hint')}</p>
        </div>
        <Select
          className="w-32"
          value={String(year)}
          onChange={(key) => {
            if (key == null) return;
            const n = Number(key);
            if (Number.isFinite(n)) setYear(n);
          }}
        >
          <Label>{t('annual.year')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {years.map((y) => (
                <ListBox.Item key={y} id={String(y)} textValue={String(y)}>
                  {y}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {report.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {report.isError ? (
        <div className="flex items-center gap-2">
          <p className="text-danger text-sm">{t('error')}</p>
          <Button size="sm" variant="secondary" onPress={() => void report.refetch()}>
            {t('annual.retry')}
          </Button>
        </div>
      ) : null}

      {report.data ? (
        <>
          <section className="border-border rounded-xl border p-4">
            <p className="text-lg font-semibold">
              {report.data.user.nickname || report.data.user.email || t('annual.you')}
            </p>
            <p className="text-muted mt-1 text-sm">
              {t('annual.tenure', {
                days: report.data.tenureDays,
                hire: report.data.hireDate || t('annual.unknown'),
              })}
            </p>
            {report.data.latestOnlineTime ? (
              <p className="text-muted mt-1 text-sm">
                {t('annual.latestOnline', { time: report.data.latestOnlineTime })}
              </p>
            ) : null}
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t('annual.files')} value={report.data.fileCreatedNum} />
            <StatCard label={t('annual.aiChats')} value={report.data.chatAiNum} />
            <StatCard
              label={t('annual.longestChat')}
              value={
                report.data.longestChat.dialogId
                  ? t('annual.chatCount', { count: report.data.longestChat.chatNum ?? 0 })
                  : t('annual.empty')
              }
              hint={report.data.longestChat.dialogName || undefined}
              onPress={
                report.data.longestChat.dialogId
                  ? () => navigate(`/manage/messenger/${report.data!.longestChat.dialogId}`)
                  : undefined
              }
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t('annual.tasksTotal')} value={report.data.tasks.total} />
            <StatCard label={t('annual.tasksCompleted')} value={report.data.tasks.completed} />
            <StatCard label={t('annual.tasksOvertime')} value={report.data.tasks.overtime} />
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <TaskHighlight
              title={t('annual.longestTask')}
              task={report.data.tasks.longestTask}
              empty={t('annual.empty')}
            />
            <TaskHighlight
              title={t('annual.fastestTask')}
              task={report.data.tasks.fastestTask}
              empty={t('annual.empty')}
            />
          </section>

          <section className="border-border rounded-xl border p-4">
            <h3 className="text-sm font-semibold">{t('annual.monthCompleted')}</h3>
            {(report.data.tasks.monthCompletedTask?.length ?? 0) === 0 ? (
              <p className="text-muted mt-2 text-sm">{t('annual.empty')}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {report.data.tasks.monthCompletedTask.map((row) => (
                  <li key={row.month} className="flex items-center gap-3 text-sm">
                    <span className="text-muted w-12 shrink-0">
                      {t('annual.month', { month: row.month })}
                    </span>
                    <div className="bg-default h-2 min-w-0 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-accent h-full rounded-full"
                        style={{ width: `${Math.round((row.num / monthMax) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-end font-medium">{row.num}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-border rounded-xl border p-4">
            <h3 className="text-sm font-semibold">
              {t('annual.projects', { count: report.data.projects.length })}
            </h3>
            {report.data.projects.length === 0 ? (
              <p className="text-muted mt-2 text-sm">{t('annual.empty')}</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {report.data.projects.map((p) => (
                  <li key={p.id}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => navigate(`/manage/project/${p.id}`)}
                    >
                      {p.name || `#${p.id}`}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  onPress,
}: {
  label: string;
  value: string | number;
  hint?: string;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <p className="text-muted text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint ? <p className="text-muted mt-0.5 truncate text-xs">{hint}</p> : null}
    </>
  );
  if (onPress) {
    return (
      <Button
        variant="secondary"
        className="border-border h-auto items-start justify-start rounded-xl border px-4 py-3 text-left"
        onPress={onPress}
      >
        <span className="flex w-full flex-col">{inner}</span>
      </Button>
    );
  }
  return <div className="border-border rounded-xl border px-4 py-3">{inner}</div>;
}
