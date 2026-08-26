import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Label, TextField, toast } from '@heroui/react';
import { useCurrentUser, useUserSearch, type UserSearchHit } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  picked: UserSearchHit[];
  onChange: (picked: UserSearchHit[]) => void;
  max?: number;
  excludeUserIds?: number[];
  enabled?: boolean;
};

/** 基于 `users/search` 的多选联系人（会议邀请 / 建群等） */
export function UserMultiPicker({
  picked,
  onChange,
  max = 20,
  excludeUserIds = [],
  enabled = true,
}: Props) {
  const { t } = useTranslation('common');
  const me = useCurrentUser();
  const myId = me.data?.userId ?? 0;
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const exclude = useMemo(() => {
    const set = new Set(excludeUserIds);
    if (myId > 0) set.add(myId);
    for (const p of picked) set.add(p.userId);
    return set;
  }, [excludeUserIds, myId, picked]);

  const searchQuery = useUserSearch(debounced, 20, enabled && debounced.length > 0);
  const hits = (searchQuery.data?.list ?? []).filter((h) => !exclude.has(h.userId));

  const add = (hit: UserSearchHit) => {
    if (picked.length >= max) {
      toast.danger(t('userPicker.maxMembers', { max }));
      return;
    }
    onChange([...picked, hit]);
    setSearch('');
  };

  return (
    <div className="flex flex-col gap-3">
      <TextField name="userPickerSearch" value={search} onChange={setSearch} className="w-full">
        <Label>{t('userPicker.search')}</Label>
        <Input placeholder={t('userPicker.search')} />
      </TextField>
      <p className="text-muted text-xs">{t('userPicker.hint', { max })}</p>

      {searchQuery.isLoading && debounced ? (
        <p className="text-muted text-xs">{t('userPicker.loading')}</p>
      ) : null}
      {debounced && !searchQuery.isLoading && hits.length === 0 ? (
        <p className="text-muted text-xs">{t('userPicker.searchEmpty')}</p>
      ) : null}
      {hits.length > 0 ? (
        <ul className="border-border max-h-36 overflow-auto rounded-lg border">
          {hits.map((hit) => (
            <li
              key={hit.userId}
              className="border-border flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
            >
              <span className="min-w-0 truncate text-sm">{hit.nickname || hit.email}</span>
              <Button size="sm" variant="secondary" onPress={() => add(hit)}>
                {t('userPicker.add')}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <h3 className="text-sm font-medium">{t('userPicker.members')}</h3>
        {picked.length === 0 ? (
          <p className="text-muted mt-2 text-xs">{t('userPicker.empty')}</p>
        ) : (
          <ul className="divide-border mt-2 divide-y">
            {picked.map((p) => (
              <li key={p.userId} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate text-sm">{p.nickname || p.email}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => onChange(picked.filter((x) => x.userId !== p.userId))}
                >
                  {t('userPicker.remove')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** 将已选用户序列化为契约 `userIds` 逗号串 */
export function userIdsCsv(picked: UserSearchHit[]): string {
  return [...new Set(picked.map((p) => p.userId).filter((id) => id > 0))].join(',');
}
