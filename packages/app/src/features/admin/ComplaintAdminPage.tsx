import { useState } from 'react';
import { Button, Label, ListBox, Select, toast } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  COMPLAINT_TYPES,
  useComplaintAction,
  useComplaintList,
  type ComplaintTypeCode,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';

/** 举报管理 */
export function ComplaintAdminPage() {
  const { t } = useTranslation('admin');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const params = {
    page,
    pageSize,
    ...(typeFilter !== 'all' ? { type: Number(typeFilter) } : {}),
    ...(statusFilter !== 'all' ? { status: Number(statusFilter) } : {}),
  };

  const listQuery = useComplaintList(params);
  const action = useComplaintAction();
  const items = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fail = (err: unknown) => toastRequestError(err, t('needAdmin'));

  const run = (id: number, type: 'handle' | 'delete') => {
    if (type === 'delete' && !window.confirm(t('complaint.deleteConfirm'))) return;
    action.mutate(
      { id, type },
      {
        onSuccess: () =>
          toast.success(type === 'handle' ? t('complaint.handle') : t('complaint.delete')),
        onError: fail,
      },
    );
  };

  return (
    <AdminPageFrame title={t('complaint.title')}>
      <div className="flex flex-wrap items-end gap-2">
        <Select
          className="w-44"
          value={typeFilter}
          onChange={(key) => {
            if (key == null) return;
            setTypeFilter(String(key));
            setPage(1);
          }}
        >
          <Label>{t('complaint.filterType')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue={t('complaint.typeAll')}>
                {t('complaint.typeAll')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {COMPLAINT_TYPES.map((code: ComplaintTypeCode) => (
                <ListBox.Item key={code} id={String(code)} textValue={t(`complaint.types.${code}`)}>
                  {t(`complaint.types.${code}`)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          className="w-36"
          value={statusFilter}
          onChange={(key) => {
            if (key == null) return;
            setStatusFilter(String(key));
            setPage(1);
          }}
        >
          <Label>{t('complaint.filterStatus')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue={t('complaint.statusAll')}>
                {t('complaint.statusAll')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="0" textValue={t('complaint.status.0')}>
                {t('complaint.status.0')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="1" textValue={t('complaint.status.1')}>
                {t('complaint.status.1')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          className="w-32"
          value={String(pageSize)}
          onChange={(key) => {
            if (key == null) return;
            setPageSize(Number(key));
            setPage(1);
          }}
        >
          <Label>{t('complaint.pageSize')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {[10, 20, 50].map((n) => (
                <ListBox.Item
                  key={n}
                  id={String(n)}
                  textValue={t('complaint.perPage', { count: n })}
                >
                  {t('complaint.perPage', { count: n })}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
          {t('complaint.refresh')}
        </Button>
      </div>

      {listQuery.isLoading ? (
        <p className="text-muted text-sm">…</p>
      ) : items.length === 0 ? (
        <p className="text-muted text-sm">{t('complaint.empty')}</p>
      ) : (
        <div className="border-border overflow-auto rounded-xl border">
          <table className="min-w-xl w-full text-left text-sm">
            <thead className="bg-default/50 text-muted text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">{t('complaint.cols.id')}</th>
                <th className="px-3 py-2 font-medium">{t('complaint.cols.type')}</th>
                <th className="px-3 py-2 font-medium">{t('complaint.cols.reason')}</th>
                <th className="px-3 py-2 font-medium">{t('complaint.cols.images')}</th>
                <th className="px-3 py-2 font-medium">{t('complaint.cols.user')}</th>
                <th className="px-3 py-2 font-medium">{t('complaint.cols.dialog')}</th>
                <th className="px-3 py-2 font-medium">{t('complaint.cols.status')}</th>
                <th className="px-3 py-2 font-medium">{t('complaint.cols.time')}</th>
                <th className="px-3 py-2 font-medium">{t('complaint.cols.action')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-border border-t">
                  <td className="px-3 py-2">{row.id}</td>
                  <td className="px-3 py-2">
                    {t(`complaint.types.${row.type as ComplaintTypeCode}`, {
                      defaultValue: String(row.type),
                    })}
                  </td>
                  <td className="max-w-48 truncate px-3 py-2" title={row.reason}>
                    {row.reason || '—'}
                  </td>
                  <td className="px-3 py-2">
                    {(row.images ?? []).length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <ul className="flex flex-wrap gap-1">
                        {row.images.map((src, idx) => {
                          const href = src.trim();
                          const isHttp = /^https?:\/\//i.test(href) || href.startsWith('//');
                          return (
                            <li key={`${row.id}-${idx}`}>
                              {isHttp ? (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="border-border block size-10 overflow-hidden rounded border"
                                  title={href}
                                >
                                  <img src={href} alt="" className="size-full object-cover" />
                                </a>
                              ) : (
                                <span
                                  className="bg-default text-muted block max-w-28 truncate rounded px-1.5 py-1 text-[10px]"
                                  title={href}
                                >
                                  {href || t('complaint.imagePath')}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </td>
                  <td className="px-3 py-2">{row.userId}</td>
                  <td className="px-3 py-2">{row.dialogId}</td>
                  <td className="px-3 py-2">
                    {t(`complaint.status.${row.status}`, { defaultValue: String(row.status) })}
                  </td>
                  <td className="text-muted whitespace-nowrap px-3 py-2 text-xs">
                    {row.createdAt || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {row.status === 0 ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={action.isPending}
                          onPress={() => run(row.id, 'handle')}
                        >
                          {t('complaint.handle')}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="danger"
                        isDisabled={action.isPending}
                        onPress={() => run(row.id, 'delete')}
                      >
                        {t('complaint.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted text-xs">{t('complaint.total', { count: total })}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            isDisabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('complaint.prev')}
          </Button>
          <span className="text-muted self-center text-xs">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={page >= totalPages}
            onPress={() => setPage((p) => p + 1)}
          >
            {t('complaint.next')}
          </Button>
        </div>
      </div>
    </AdminPageFrame>
  );
}
