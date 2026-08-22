import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Label, ListBox, Select, Tabs, toast } from '@heroui/react';
import {
  useMarkReportRead,
  useReadReports,
  useReportMy,
  useReportReceive,
  useReportUnread,
  type ReportType,
  type ReportView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { ReportComposeForm } from './ReportComposeForm';
import { ReportStatsPanel } from './ReportStatsPanel';
import { cn } from '../../utils/cn';
import { toastRequestError } from '../../utils/toast-request-error';

function typeFilterValue(raw: string): ReportType | '' {
  if (raw === 'daily' || raw === 'weekly') return raw;
  return '';
}

function ReportList({
  items,
  loading,
  error,
  onRefresh,
  onOpen,
  showUnread,
}: {
  items: ReportView[];
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onOpen: (id: number) => void;
  showUnread?: boolean;
}) {
  const { t } = useTranslation('report');

  if (loading) return <p className="text-muted text-sm">{t('loading')}</p>;
  if (error) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-danger text-sm">{t('error.generic')}</p>
        <Button size="sm" variant="secondary" onPress={onRefresh}>
          {t('list.refresh')}
        </Button>
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-muted text-sm">{t('list.empty')}</p>;
  }

  return (
    <ul className="border-border bg-surface divide-border divide-y overflow-hidden rounded-xl border">
      {items.map((item: ReportView) => {
        const unread = showUnread && Number(item.read) === 0;
        return (
          <li key={item.id}>
            <Button
              variant="ghost"
              className="h-auto w-full items-start justify-between gap-3 rounded-none px-4 py-3 text-left font-normal"
              onPress={() => onOpen(item.id)}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {item.title || `#${item.id}`}
                  </span>
                  {unread ? (
                    <span className="bg-accent text-accent-foreground rounded-full px-1.5 text-[10px] leading-4">
                      {t('list.unreadBadge')}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted mt-0.5 block text-xs">
                  {item.type === 'weekly' ? t('filter.weekly') : t('filter.daily')}
                  {item.sign ? ` · ${item.sign}` : ''}
                  {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString()}` : ''}
                </span>
              </span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/** 工作报告：我发送的 / 我收到的 / 写汇报 */
export function ReportPage() {
  const { t } = useTranslation('report');
  const navigate = useNavigate();
  const [tab, setTab] = useState('mine');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('statusAll');

  const listParams = useMemo(
    () => ({
      type: typeFilterValue(typeFilter),
      page: 1,
      pageSize: 30,
    }),
    [typeFilter],
  );

  const receiveParams = useMemo(
    () => ({
      ...listParams,
      status:
        statusFilter === 'unread' || statusFilter === 'read'
          ? (statusFilter as 'unread' | 'read')
          : ('' as const),
    }),
    [listParams, statusFilter],
  );

  const myQuery = useReportMy(listParams, tab === 'mine');
  const receiveQuery = useReportReceive(receiveParams, tab === 'receive');
  const unreadQuery = useReportUnread();
  const markRead = useMarkReportRead();
  const readReports = useReadReports();

  const openDetail = (id: number) => {
    if (tab === 'receive') {
      markRead.mutate(
        { id },
        {
          onError: (err) => toastRequestError(err, t('error.generic')),
        },
      );
    }
    navigate(`/single/report/detail/${id}`);
  };

  const onMarkAllReceivedRead = () => {
    const ids = (receiveQuery.data ?? [])
      .filter((r) => Number(r.read) === 0)
      .map((r) => r.id)
      .filter((id) => id > 0);
    if (ids.length === 0) {
      toast.success(t('list.noUnread'));
      return;
    }
    readReports.mutate(ids.join(','), {
      onSuccess: () => toast.success(t('list.markAllReadDone', { count: ids.length })),
      onError: (err) => toastRequestError(err, t('error.generic')),
    });
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          {(unreadQuery.data?.unread ?? 0) > 0 ? (
            <p className="text-muted mt-1 text-sm">
              {t('unread.count', { count: unreadQuery.data!.unread })}
            </p>
          ) : null}
        </div>
        <Button size="sm" variant="secondary" onPress={() => navigate('/single/report/edit/new')}>
          {t('tabs.compose')}
        </Button>
      </header>

      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('title')}>
            <Tabs.Tab id="mine">
              {t('tabs.mine')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="receive">
              {t('tabs.receive')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="compose">
              {t('tabs.compose')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="stats">
              {t('tabs.stats')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="mine" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <TypeFilter value={typeFilter} onChange={setTypeFilter} />
            <Button size="sm" variant="secondary" onPress={() => void myQuery.refetch()}>
              {t('list.refresh')}
            </Button>
          </div>
          <ReportList
            items={myQuery.data ?? []}
            loading={myQuery.isLoading}
            error={myQuery.isError}
            onRefresh={() => void myQuery.refetch()}
            onOpen={openDetail}
          />
        </Tabs.Panel>

        <Tabs.Panel id="receive" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <TypeFilter value={typeFilter} onChange={setTypeFilter} />
            <Select
              className="w-36"
              value={statusFilter}
              onChange={(key) => {
                if (key == null) return;
                setStatusFilter(String(key));
              }}
              aria-label={t('filter.statusAll')}
            >
              <Label className="sr-only">{t('filter.statusAll')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(['statusAll', 'unread', 'read'] as const).map((id) => (
                    <ListBox.Item key={id} id={id} textValue={t(`filter.${id}`)}>
                      {t(`filter.${id}`)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Button size="sm" variant="secondary" onPress={() => void receiveQuery.refetch()}>
              {t('list.refresh')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isDisabled={readReports.isPending || receiveQuery.isLoading}
              onPress={onMarkAllReceivedRead}
            >
              {readReports.isPending ? t('list.markAllReading') : t('list.markAllRead')}
            </Button>
          </div>
          <ReportList
            items={receiveQuery.data ?? []}
            loading={receiveQuery.isLoading}
            error={receiveQuery.isError}
            onRefresh={() => void receiveQuery.refetch()}
            onOpen={openDetail}
            showUnread
          />
        </Tabs.Panel>

        <Tabs.Panel id="compose" className={cn('pt-4')}>
          <ReportComposeForm onSaved={(r) => navigate(`/single/report/detail/${r.id}`)} />
        </Tabs.Panel>

        <Tabs.Panel id="stats" className="pt-4">
          <ReportStatsPanel />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

function TypeFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation('report');
  return (
    <Select
      className="w-36"
      value={value}
      onChange={(key) => {
        if (key == null) return;
        onChange(String(key));
      }}
      aria-label={t('filter.all')}
    >
      <Label className="sr-only">{t('filter.all')}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {(['all', 'daily', 'weekly'] as const).map((id) => (
            <ListBox.Item key={id} id={id} textValue={t(`filter.${id}`)}>
              {t(`filter.${id}`)}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
