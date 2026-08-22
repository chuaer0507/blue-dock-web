import { useRef, useState } from 'react';
import { Button, Input, Label, ListBox, Select, TextField, toast } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  formatFileSize,
  useDeleteUploadObject,
  useUploadObject,
  useUploadObjectList,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';

const CATEGORIES = ['media', 'files', 'other'] as const;

/** 系统上传库 */
export function UploadsAdminPage() {
  const { t } = useTranslation('admin');
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [qApplied, setQApplied] = useState('');
  const [category, setCategory] = useState('all');
  const [uploadCategory, setUploadCategory] = useState<string>('files');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const listQuery = useUploadObjectList({
    page,
    pageSize,
    ...(category !== 'all' ? { category } : {}),
    ...(qApplied ? { q: qApplied } : {}),
  });
  const upload = useUploadObject();
  const remove = useDeleteUploadObject();

  const items = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fail = (err: unknown) => toastRequestError(err, t('needAdmin'));

  const onPick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    upload.mutate(
      { file, category: uploadCategory },
      {
        onSuccess: () => toast.success(t('uploads.upload')),
        onError: fail,
      },
    );
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <AdminPageFrame title={t('uploads.title')} hint={t('uploads.hint')}>
      <div className="flex flex-wrap items-end gap-2">
        <TextField name="q" value={q} onChange={setQ} className="min-w-48 flex-1">
          <Label>{t('uploads.search')}</Label>
          <Input
            placeholder={t('uploads.search')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQApplied(q.trim());
                setPage(1);
              }
            }}
          />
        </TextField>
        <Select
          className="w-36"
          value={category}
          onChange={(key) => {
            if (key == null) return;
            setCategory(String(key));
            setPage(1);
          }}
        >
          <Label>{t('uploads.category')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all" textValue={t('uploads.categoryAll')}>
                {t('uploads.categoryAll')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {CATEGORIES.map((id) => (
                <ListBox.Item key={id} id={id} textValue={t(`uploads.categories.${id}`)}>
                  {t(`uploads.categories.${id}`)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            setQApplied(q.trim());
            setPage(1);
          }}
        >
          {t('uploads.filter')}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          className="w-36"
          value={uploadCategory}
          onChange={(key) => {
            if (key != null) setUploadCategory(String(key));
          }}
        >
          <Label>{t('uploads.uploadCategory')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {CATEGORIES.map((id) => (
                <ListBox.Item key={id} id={id} textValue={t(`uploads.categories.${id}`)}>
                  {t(`uploads.categories.${id}`)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
        <Button size="sm" isDisabled={upload.isPending} onPress={() => fileRef.current?.click()}>
          {t('uploads.upload')}
        </Button>
      </div>

      {listQuery.isLoading ? (
        <p className="text-muted text-sm">…</p>
      ) : items.length === 0 ? (
        <p className="text-muted text-sm">{t('uploads.empty')}</p>
      ) : (
        <div className="border-border overflow-auto rounded-xl border">
          <table className="min-w-xl w-full text-left text-sm">
            <thead className="bg-default/50 text-muted text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">{t('uploads.cols.name')}</th>
                <th className="px-3 py-2 font-medium">{t('uploads.cols.category')}</th>
                <th className="px-3 py-2 font-medium">{t('uploads.cols.size')}</th>
                <th className="px-3 py-2 font-medium">{t('uploads.cols.provider')}</th>
                <th className="px-3 py-2 font-medium">{t('uploads.cols.time')}</th>
                <th className="px-3 py-2 font-medium">{t('uploads.cols.action')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-border border-t">
                  <td className="px-3 py-2">
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        {row.originalName || row.objectKey}
                      </a>
                    ) : (
                      row.originalName || row.objectKey
                    )}
                  </td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="px-3 py-2">{formatFileSize(row.sizeBytes)}</td>
                  <td className="px-3 py-2">{row.provider}</td>
                  <td className="text-muted whitespace-nowrap px-3 py-2 text-xs">
                    {row.createdAt}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="danger"
                      isDisabled={remove.isPending}
                      onPress={() => {
                        if (!window.confirm(t('uploads.deleteConfirm'))) return;
                        remove.mutate(row.id, {
                          onSuccess: () => toast.success(t('uploads.delete')),
                          onError: fail,
                        });
                      }}
                    >
                      {t('uploads.delete')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted text-xs">{t('uploads.total', { count: total })}</p>
        <div className="flex items-center gap-2">
          <Select
            className="w-32"
            value={String(pageSize)}
            onChange={(key) => {
              if (key == null) return;
              setPageSize(Number(key));
              setPage(1);
            }}
            aria-label={t('uploads.pageSize')}
          >
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
                    textValue={t('uploads.perPage', { count: n })}
                  >
                    {t('uploads.perPage', { count: n })}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('uploads.prev')}
          </Button>
          <span className="text-muted text-xs">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={page >= totalPages}
            onPress={() => setPage((p) => p + 1)}
          >
            {t('uploads.next')}
          </Button>
        </div>
      </div>
    </AdminPageFrame>
  );
}
