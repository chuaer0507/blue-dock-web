import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Label, ListBox, Select, Tabs, toast } from '@heroui/react';
import {
  useCleanTaskBrowse,
  useDeleteRecent,
  useRecentBrowse,
  useTaskBrowse,
  type RecentItem,
  type TaskBrowseItem,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { openRecentTarget } from './navigate';
import { toastRequestError } from '../../utils/toast-request-error';

const RECENT_FILTERS = [
  { id: 'all', type: '' },
  { id: 'task', type: 'task' },
  { id: 'file', type: 'file' },
  { id: 'task_file', type: 'task_file' },
  { id: 'message_file', type: 'message_file' },
] as const;

/** 最近打开：浏览记录 + 任务浏览 */
export function RecentPage() {
  const { t } = useTranslation('favorite');
  const navigate = useNavigate();
  const [tab, setTab] = useState('recent');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const recentType = useMemo(
    () => RECENT_FILTERS.find((f) => f.id === filter)?.type ?? '',
    [filter],
  );

  const recentQuery = useRecentBrowse(recentType, page, 30);
  const taskBrowseQuery = useTaskBrowse(40, tab === 'taskBrowse');
  const deleteRecent = useDeleteRecent();
  const cleanTasks = useCleanTaskBrowse();

  const recentItems = recentQuery.data?.list ?? [];
  const total = recentQuery.data?.total ?? 0;
  const pageSize = recentQuery.data?.pageSize ?? 30;
  const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
  const taskItems = taskBrowseQuery.data ?? [];

  const onRemoveRecent = (recordId: number) => {
    deleteRecent.mutate(recordId, {
      onError: (err) => toastRequestError(err, t('error.generic')),
    });
  };

  const onCleanTasks = () => {
    if (!window.confirm(t('list.cleanConfirm'))) return;
    cleanTasks.mutate(0, {
      onSuccess: () => toast.success(t('list.clean')),
      onError: () => toast.danger(t('error.generic')),
    });
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('titleRecent')}</h1>
      </header>

      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('titleRecent')}>
            <Tabs.Tab id="recent">
              {t('tabs.recent')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="taskBrowse">
              {t('tabs.taskBrowse')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="recent" className="flex flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="max-w-xs"
              value={filter}
              onChange={(key) => {
                setFilter(String(key ?? 'all'));
                setPage(1);
              }}
            >
              <Label>{t('filter.label')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {RECENT_FILTERS.map((f) => (
                    <ListBox.Item key={f.id} id={f.id} textValue={t(`filter.${f.id}`)}>
                      {t(`filter.${f.id}`)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Button size="sm" variant="secondary" onPress={() => void recentQuery.refetch()}>
              {t('list.refresh')}
            </Button>
          </div>

          {recentQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
          {recentQuery.isError ? <p className="text-danger text-sm">{t('error.generic')}</p> : null}
          {!recentQuery.isLoading && recentItems.length === 0 ? (
            <p className="text-muted text-sm">{t('list.emptyRecent')}</p>
          ) : null}

          {recentItems.length > 0 ? (
            <ul className="border-border bg-surface divide-border divide-y overflow-hidden rounded-xl border">
              {recentItems.map((item: RecentItem) => {
                const subtitle = [
                  item.projectName,
                  item.taskName,
                  item.browsedAt ? new Date(String(item.browsedAt)).toLocaleString() : '',
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={item.recordId} className="flex items-center gap-3 px-4 py-3">
                    <Button
                      variant="ghost"
                      className="h-auto min-w-0 flex-1 items-start justify-start rounded-none px-0 py-0 text-left font-normal"
                      onPress={() => openRecentTarget(navigate, item)}
                    >
                      <span className="min-w-0">
                        <span className="text-muted block text-[11px]">
                          {t(`filter.${item.type}`, { defaultValue: String(item.type) })}
                        </span>
                        <span className="block truncate text-sm font-medium">
                          {item.name ||
                            t('list.refId', {
                              id: Number(item.id ?? item.taskId ?? item.recordId),
                            })}
                        </span>
                        {subtitle ? (
                          <span className="text-muted mt-0.5 block truncate text-xs">
                            {subtitle}
                          </span>
                        ) : null}
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isDisabled={deleteRecent.isPending}
                      onPress={() => onRemoveRecent(item.recordId)}
                    >
                      {t('list.remove')}
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {total > pageSize ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted text-xs">{t('pager.total', { count: total })}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('pager.prev')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={page >= maxPage}
                  onPress={() => setPage((p) => Math.min(maxPage, p + 1))}
                >
                  {t('pager.next')}
                </Button>
              </div>
            </div>
          ) : null}
        </Tabs.Panel>

        <Tabs.Panel id="taskBrowse" className="flex flex-col gap-4 pt-4">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onPress={() => void taskBrowseQuery.refetch()}>
              {t('list.refresh')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isDisabled={cleanTasks.isPending || taskItems.length === 0}
              onPress={onCleanTasks}
            >
              {t('list.clean')}
            </Button>
          </div>

          {taskBrowseQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
          {!taskBrowseQuery.isLoading && taskItems.length === 0 ? (
            <p className="text-muted text-sm">{t('list.emptyRecent')}</p>
          ) : null}

          {taskItems.length > 0 ? (
            <ul className="border-border bg-surface divide-border divide-y overflow-hidden rounded-xl border">
              {taskItems.map((item: TaskBrowseItem) => (
                <li key={item.id}>
                  <Button
                    variant="ghost"
                    className="h-auto w-full items-start justify-start rounded-none px-4 py-3 text-left font-normal"
                    onPress={() => navigate(`/single/task/${item.id}`)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.name}</span>
                      {item.browsedAt ? (
                        <span className="text-muted mt-0.5 block text-xs">
                          {new Date(item.browsedAt).toLocaleString()}
                        </span>
                      ) : null}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
