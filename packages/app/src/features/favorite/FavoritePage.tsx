import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Input, Label, ListBox, Select, TextField, toast } from '@heroui/react';
import {
  useCleanFavorites,
  useFavoriteList,
  useFavoriteRemark,
  useToggleFavorite,
  type FavoriteItem,
  type FavoriteType,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { openFavoriteTarget } from './navigate';
import { FavoriteTitle } from './FavoriteTitle';
import { toastRequestError } from '../../utils/toast-request-error';

const FILTERS: Array<{ id: string; type: FavoriteType | '' }> = [
  { id: 'all', type: '' },
  { id: 'task', type: 'task' },
  { id: 'project', type: 'project' },
  { id: 'file', type: 'file' },
  { id: 'message', type: 'message' },
];

function FavoriteRemarkField({ item }: { item: FavoriteItem }) {
  const { t } = useTranslation('favorite');
  const remarkMut = useFavoriteRemark();
  const [remark, setRemark] = useState(item.remark ?? '');
  const favType = item.type as FavoriteType;
  const canEdit = ['task', 'project', 'file', 'message'].includes(favType);
  const dirty = remark.trim() !== (item.remark ?? '').trim();

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canEdit || !dirty) return;
    remarkMut.mutate(
      { type: favType, id: item.refId, remark: remark.trim() },
      {
        onSuccess: () => toast.success(t('list.remarkSaved')),
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  return (
    <Form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={onSave}>
      <TextField
        name={`remark-${item.id}`}
        value={remark}
        onChange={setRemark}
        className="min-w-0 flex-1"
        aria-label={t('list.remark')}
        isDisabled={!canEdit || remarkMut.isPending}
      >
        <Input placeholder={t('list.remarkPlaceholder')} />
      </TextField>
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        isDisabled={!canEdit || !dirty || remarkMut.isPending}
      >
        {t('list.saveRemark')}
      </Button>
    </Form>
  );
}

/** 我的收藏列表 */
export function FavoritePage() {
  const { t } = useTranslation('favorite');
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const type = useMemo(() => FILTERS.find((f) => f.id === filter)?.type ?? '', [filter]);

  const listQuery = useFavoriteList(type, page, 20);
  const toggle = useToggleFavorite();
  const clean = useCleanFavorites();

  const items = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const pageSize = listQuery.data?.pageSize ?? 20;
  const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);

  const onUnfavorite = (item: FavoriteItem) => {
    const favType = item.type as FavoriteType;
    if (!['task', 'project', 'file', 'message'].includes(favType)) return;
    toggle.mutate(
      { type: favType, id: item.refId },
      {
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  const onClean = () => {
    if (!window.confirm(t('list.cleanConfirm'))) return;
    clean.mutate(type, {
      onSuccess: () => toast.success(t('list.clean')),
      onError: () => toast.danger(t('error.generic')),
    });
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('titleFavorite')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
            {t('list.refresh')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={clean.isPending || items.length === 0}
            onPress={onClean}
          >
            {t('list.clean')}
          </Button>
        </div>
      </header>

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
            {FILTERS.map((f) => (
              <ListBox.Item key={f.id} id={f.id} textValue={t(`filter.${f.id}`)}>
                {t(`filter.${f.id}`)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {listQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {listQuery.isError ? (
        <div className="flex items-center gap-3">
          <p className="text-danger text-sm">{t('error.generic')}</p>
          <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
            {t('list.refresh')}
          </Button>
        </div>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
        <p className="text-muted text-sm">{t('list.empty')}</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="border-border bg-surface divide-border divide-y overflow-hidden rounded-xl border">
          {items.map((item: FavoriteItem) => (
            <li
              key={`${item.type}-${item.refId}-${item.id}`}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <Button
                  variant="ghost"
                  className="h-auto w-full items-start justify-start rounded-none px-0 py-0 text-left font-normal"
                  onPress={() => openFavoriteTarget(navigate, item.type, item.refId)}
                >
                  <span className="min-w-0">
                    <span className="text-muted block text-[11px]">
                      {t(`filter.${item.type}`, { defaultValue: item.type })}
                    </span>
                    <span className="block truncate text-sm font-medium">
                      <FavoriteTitle item={item} />
                    </span>
                    {item.updatedAt || item.createdAt ? (
                      <span className="text-muted mt-0.5 block text-xs">
                        {new Date(String(item.updatedAt || item.createdAt)).toLocaleString()}
                      </span>
                    ) : null}
                  </span>
                </Button>
                <div className="mt-2">
                  <FavoriteRemarkField key={`${item.id}-${item.remark}`} item={item} />
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 self-end sm:self-center"
                isDisabled={toggle.isPending}
                onPress={() => onUnfavorite(item)}
              >
                {t('list.unfavorite')}
              </Button>
            </li>
          ))}
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
    </div>
  );
}
