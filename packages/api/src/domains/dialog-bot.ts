import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { get } from '../http-api';
import { dialogKeys, type DialogView } from './dialog';
import { useUserBotList } from './user-bot';
import { userKeys } from './user-types';

export type DialogBadgeKind = 'user' | 'group' | 'task' | 'project' | 'department' | 'okr' | 'bot';

export const dialogBotKeys = {
  all: () => [...dialogKeys.all(), 'bot'] as const,
  userIds: () => [...dialogBotKeys.all(), 'userIds'] as const,
};

/** 会话列表徽章 / 筛选类型；`botDialogIds` 为单聊 peer.isBot 富化结果 */
export function dialogBadgeKind(
  dialog: DialogView,
  botDialogIds?: ReadonlySet<number>,
): DialogBadgeKind {
  if (botDialogIds?.has(dialog.id)) return 'bot';
  const t = (dialog.type || '').toLowerCase();
  const g = (dialog.groupType || '').toLowerCase();
  if (g === 'bot' || t === 'bot') return 'bot';
  if (t === 'user' || g === 'user') return 'user';
  if (g === 'task' || t === 'task') return 'task';
  if (g === 'project' || t === 'project') return 'project';
  if (g === 'department' || t === 'department') return 'department';
  if (g === 'okr' || t === 'okr') return 'okr';
  return 'group';
}

export function dialogMatchesFilter(
  dialog: DialogView,
  filter: 'all' | DialogBadgeKind | 'mention',
  botDialogIds?: ReadonlySet<number>,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'mention') return dialog.mentionCount > 0;
  return dialogBadgeKind(dialog, botDialogIds) === filter;
}

type BotSearchPage = { list?: Array<{ userId?: number }> };

/** `users/search?isBot=2`：机器人 userId 集合（含系统 bot；最多 take） */
export function useBotUserIdSet(enabled = true, take = 100) {
  const search = useQuery({
    queryKey: dialogBotKeys.userIds(),
    queryFn: async () => {
      const data = await get<BotSearchPage>('users/search', {
        isBot: 2,
        take,
        disable: 0,
      });
      const ids = (data.list ?? []).map((row) => Number(row.userId) || 0).filter((id) => id > 0);
      return new Set(ids);
    },
    staleTime: 60_000,
    enabled,
  });

  const myBots = useUserBotList(enabled);

  return useMemo(() => {
    const set = new Set<number>(search.data ?? []);
    for (const bot of myBots.data ?? []) {
      const id = Number(bot.id);
      if (Number.isSafeInteger(id) && id > 0) set.add(id);
    }
    return { botUserIds: set, isLoading: search.isLoading || myBots.isLoading };
  }, [search.data, search.isLoading, myBots.data, myBots.isLoading]);
}

/**
 * 单聊会话 → 是否与机器人对话。
 * 契约：`dialog/lists` 的 type=user 不区分真人/机器人，需 `dialog/user` + bot 集合。
 */
export function useDialogBotIdSet(
  dialogs: DialogView[] | undefined,
  myUserId: number | undefined,
  enabled = true,
) {
  const userDialogs = useMemo(
    () =>
      (dialogs ?? []).filter((d) => {
        const t = (d.type || '').toLowerCase();
        const g = (d.groupType || '').toLowerCase();
        return t === 'user' || g === 'user';
      }),
    [dialogs],
  );

  const { botUserIds, isLoading: botsLoading } = useBotUserIdSet(enabled && myUserId != null);

  const memberQueries = useQueries({
    queries: userDialogs.map((d) => ({
      queryKey: [...dialogKeys.detail(d.id), 'members'] as const,
      queryFn: () => get<number[]>('dialog/user', { dialogId: d.id }),
      staleTime: 60_000,
      enabled: enabled && myUserId != null && myUserId > 0,
    })),
  });

  const botDialogIds = useMemo(() => {
    const out = new Set<number>();
    if (myUserId == null || botUserIds.size === 0) return out;
    userDialogs.forEach((d, i) => {
      const members = memberQueries[i]?.data;
      if (!members?.length) return;
      const peer = members.find((id) => id !== myUserId);
      if (peer != null && botUserIds.has(peer)) out.add(d.id);
    });
    return out;
  }, [userDialogs, memberQueries, myUserId, botUserIds]);

  /** 用 users/extra 补洞：不在 bot 搜索结果里的 peer */
  const unresolvedPeers = useMemo(() => {
    if (myUserId == null) return [] as number[];
    const peers: number[] = [];
    userDialogs.forEach((d, i) => {
      if (botDialogIds.has(d.id)) return;
      const members = memberQueries[i]?.data;
      if (!members?.length) return;
      const peer = members.find((id) => id !== myUserId);
      if (peer != null && peer > 0 && !botUserIds.has(peer)) peers.push(peer);
    });
    return [...new Set(peers)];
  }, [userDialogs, memberQueries, myUserId, botDialogIds, botUserIds]);

  const extraQueries = useQueries({
    queries: unresolvedPeers.map((userId) => ({
      queryKey: userKeys.extra(userId),
      queryFn: () => get<{ isBot?: number }>('users/extra', { userId }),
      staleTime: 60_000,
      enabled: enabled && unresolvedPeers.length > 0,
    })),
  });

  return useMemo(() => {
    const out = new Set(botDialogIds);
    unresolvedPeers.forEach((userId, i) => {
      if (extraQueries[i]?.data?.isBot !== 1) return;
      userDialogs.forEach((d, di) => {
        const members = memberQueries[di]?.data;
        if (!members?.includes(userId)) return;
        if (members.some((id) => id === myUserId)) out.add(d.id);
      });
    });
    const membersLoading = memberQueries.some((q) => q.isLoading);
    const extrasLoading = extraQueries.some((q) => q.isLoading);
    return {
      botDialogIds: out,
      isLoading: botsLoading || membersLoading || extrasLoading,
    };
  }, [
    botDialogIds,
    unresolvedPeers,
    extraQueries,
    userDialogs,
    memberQueries,
    myUserId,
    botsLoading,
  ]);
}
