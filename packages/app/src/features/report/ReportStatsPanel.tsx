import { useMemo } from 'react';
import { Button } from '@heroui/react';
import { useReportMy, useReportReceive, useReportUnread } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import { computeReportStats } from './report-stats';

const STATS_PAGE_SIZE = 100;

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'border-border rounded-xl border px-4 py-3',
        accent && value > 0 ? 'border-accent/40 bg-accent/5' : 'bg-surface',
      )}
    >
      <p className="text-muted text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="text-muted mt-1 text-[11px]">{hint}</p> : null}
    </div>
  );
}

function RatioBar({
  label,
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  label: string;
  left: number;
  right: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const total = left + right;
  const leftPct = total > 0 ? Math.round((left / total) * 100) : 0;
  return (
    <div className="border-border bg-surface rounded-xl border px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted text-xs">
          {leftLabel} {left} · {rightLabel} {right}
        </p>
      </div>
      <div className="bg-default mt-2 flex h-2 overflow-hidden rounded-full">
        <div className="bg-accent h-full" style={{ width: `${leftPct}%` }} />
        <div className="bg-muted/40 h-full flex-1" />
      </div>
    </div>
  );
}

/** 基于最近加载列表的报告统计（无独立 stats API） */
export function ReportStatsPanel() {
  const { t } = useTranslation('report');
  const mine = useReportMy({ page: 1, pageSize: STATS_PAGE_SIZE });
  const receive = useReportReceive({ page: 1, pageSize: STATS_PAGE_SIZE });
  const unread = useReportUnread();

  const stats = useMemo(
    () =>
      computeReportStats(
        mine.data ?? [],
        receive.data ?? [],
        unread.data?.unread ?? 0,
        STATS_PAGE_SIZE,
      ),
    [mine.data, receive.data, unread.data?.unread],
  );

  const loading = mine.isLoading || receive.isLoading;
  const error = mine.isError || receive.isError;

  if (loading) {
    return <p className="text-muted text-sm">{t('loading')}</p>;
  }

  if (error) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-danger text-sm">{t('error.generic')}</p>
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            void mine.refetch();
            void receive.refetch();
            void unread.refetch();
          }}
        >
          {t('list.refresh')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted text-xs">{t('stats.hint', { limit: STATS_PAGE_SIZE })}</p>
      {stats.truncated ? <p className="text-warning text-xs">{t('stats.truncated')}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('stats.sentTotal')} value={stats.sentTotal} />
        <StatCard label={t('stats.sentDaily')} value={stats.sentDaily} />
        <StatCard label={t('stats.sentWeekly')} value={stats.sentWeekly} />
        <StatCard label={t('stats.sentLast7Days')} value={stats.sentLast7Days} accent />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('stats.receivedTotal')} value={stats.receivedTotal} />
        <StatCard
          label={t('stats.unreadApi')}
          value={stats.unreadApi}
          hint={t('stats.unreadApiHint')}
          accent
        />
        <StatCard label={t('stats.receivedUnread')} value={stats.receivedUnread} />
        <StatCard label={t('stats.receivedLast7Days')} value={stats.receivedLast7Days} />
      </section>

      <RatioBar
        label={t('stats.typeMix')}
        left={stats.sentDaily}
        right={stats.sentWeekly}
        leftLabel={t('filter.daily')}
        rightLabel={t('filter.weekly')}
      />
      <RatioBar
        label={t('stats.readMix')}
        left={stats.receivedRead}
        right={stats.receivedUnread}
        leftLabel={t('filter.read')}
        rightLabel={t('filter.unread')}
      />

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            void mine.refetch();
            void receive.refetch();
            void unread.refetch();
          }}
        >
          {t('list.refresh')}
        </Button>
      </div>
    </div>
  );
}
