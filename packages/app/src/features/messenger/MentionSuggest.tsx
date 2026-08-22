import { useEffect, useMemo, useState } from 'react';
import { Button } from '@heroui/react';
import {
  useDialogMemberIds,
  useUserBasic,
  useUserSearch,
  type UserSearchHit,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import {
  detectMentionTrigger,
  formatAllMention,
  formatUserMention,
  insertMentionToken,
} from './mention';

function MemberRow({
  userId,
  query,
  onPick,
}: {
  userId: number;
  query: string;
  onPick: (hit: { userId: number; nickname: string }) => void;
}) {
  const { data } = useUserBasic(userId);
  const nickname = data?.nickname?.trim() || `#${userId}`;
  const q = query.trim().toLowerCase();
  if (q && !nickname.toLowerCase().includes(q) && !String(userId).includes(q)) {
    return null;
  }
  return (
    <li>
      <Button
        size="sm"
        variant="ghost"
        className="h-auto w-full justify-start px-2 py-1.5 text-left text-sm font-normal"
        onPress={() => onPick({ userId, nickname })}
      >
        {nickname}
      </Button>
    </li>
  );
}

type Props = {
  dialogId: number;
  draft: string;
  myUserId?: number;
  /** 群聊才显示 @所有人 */
  allowAll: boolean;
  onChangeDraft: (next: string) => void;
};

/** 输入 `@` 后展示选人 / @所有人 */
export function MentionSuggest({ dialogId, draft, myUserId, allowAll, onChangeDraft }: Props) {
  const { t } = useTranslation('messenger');
  const trigger = useMemo(() => detectMentionTrigger(draft), [draft]);
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    if (!trigger) {
      setDebounced('');
      return;
    }
    const timer = window.setTimeout(() => setDebounced(trigger.query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [trigger]);

  const membersQuery = useDialogMemberIds(trigger ? dialogId : undefined);
  const memberIds = useMemo(() => {
    const ids = membersQuery.data ?? [];
    return ids.filter((id) => id !== myUserId).slice(0, 30);
  }, [membersQuery.data, myUserId]);

  const searchQuery = useUserSearch(debounced, 12, Boolean(trigger) && debounced.length > 0);
  const searchHits = (searchQuery.data?.list ?? []).filter(
    (h: UserSearchHit) => h.userId !== myUserId,
  );

  if (!trigger) return null;

  const apply = (token: string) => {
    onChangeDraft(insertMentionToken(draft, trigger.start, trigger.query, token));
  };

  const pickUser = (hit: { userId: number; nickname: string }) => {
    apply(formatUserMention(hit.userId, hit.nickname));
  };

  const showSearch = debounced.length > 0;
  const loading = showSearch ? searchQuery.isFetching : membersQuery.isLoading;

  return (
    <div
      className={cn(
        'border-border bg-surface absolute inset-x-0 bottom-full z-20 mb-1 max-h-48 overflow-auto rounded-lg border shadow-md',
      )}
      role="listbox"
      aria-label={t('mention.title')}
    >
      {allowAll ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-auto w-full justify-start rounded-none px-3 py-2 text-left text-sm font-medium"
          onPress={() => apply(formatAllMention())}
        >
          {t('mention.all')}
        </Button>
      ) : null}
      {loading ? <p className="text-muted px-3 py-2 text-xs">{t('loading')}</p> : null}
      {!loading && showSearch && searchHits.length === 0 ? (
        <p className="text-muted px-3 py-2 text-xs">{t('mention.empty')}</p>
      ) : null}
      <ul className="py-1">
        {showSearch
          ? searchHits.map((hit) => (
              <li key={hit.userId}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-auto w-full justify-start px-3 py-1.5 text-left text-sm font-normal"
                  onPress={() =>
                    pickUser({
                      userId: hit.userId,
                      nickname: hit.nickname || hit.email || String(hit.userId),
                    })
                  }
                >
                  {hit.nickname || hit.email || `#${hit.userId}`}
                </Button>
              </li>
            ))
          : memberIds.map((id) => (
              <MemberRow key={id} userId={id} query={trigger.query} onPick={pickUser} />
            ))}
      </ul>
    </div>
  );
}
