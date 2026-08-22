import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar, Button, SearchField } from '@heroui/react';
import { useDialogGroupSearchUser } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';

/** 系统管理员搜索普通个人群（`dialog/group/searchUser`） */
export function UserGroupsAdminPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const listQuery = useDialogGroupSearchUser(debounced, true);
  const items = listQuery.data ?? [];

  return (
    <AdminPageFrame title={t('userGroups.title')} hint={t('userGroups.hint')}>
      <SearchField
        aria-label={t('userGroups.search')}
        value={query}
        onChange={setQuery}
        className="w-full"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={t('userGroups.searchPlaceholder')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {listQuery.isLoading ? <p className="text-muted text-sm">{t('userGroups.loading')}</p> : null}
      {listQuery.isError ? (
        <div className="flex items-center gap-2">
          <p className="text-danger text-sm">{t('userGroups.error')}</p>
          <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
            {t('userGroups.retry')}
          </Button>
        </div>
      ) : null}

      {!listQuery.isLoading && items.length === 0 ? (
        <p className="text-muted text-sm">{t('userGroups.empty')}</p>
      ) : (
        <ul className="border-border divide-border divide-y overflow-hidden rounded-lg border">
          {items.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                className="hover:bg-surface flex w-full items-center gap-3 px-3 py-2.5 text-start"
                onClick={() => navigate(`/manage/messenger/${d.id}`)}
              >
                <Avatar size="sm" className="shrink-0">
                  {d.avatar ? <Avatar.Image alt="" src={d.avatar} /> : null}
                  <Avatar.Fallback>{(d.name || '?').slice(0, 1)}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name || `#${d.id}`}</p>
                  <p className="text-muted truncate text-xs">
                    {t('userGroups.meta', { id: d.id, ownerId: d.ownerId })}
                    {d.lastMessage ? ` · ${d.lastMessage}` : ''}
                  </p>
                </div>
                <span className="text-muted shrink-0 text-xs">{t('userGroups.open')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!listQuery.isLoading && items.length > 0 ? (
        <p className="text-muted text-xs">{t('userGroups.cap', { count: items.length })}</p>
      ) : null}
    </AdminPageFrame>
  );
}
