import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';
import { hasId, type Id } from '../common/id';

export type UserBotView = {
  id: Id;
  name: string;
  avatar: string;
  clearDay: number;
  webhookUrl: string;
  webhookEvents: string[];
  systemName: string;
};

export type UserBotEditInput = {
  id?: Id;
  name?: string;
  avatar?: string;
  clearDay?: number;
  webhookUrl?: string;
  webhookEvents?: string[];
};

export const BOT_WEBHOOK_EVENTS = ['message', 'dialogOpen', 'memberJoin', 'memberLeave'] as const;

export const userBotKeys = {
  all: () => ['user-bot'] as const,
  list: () => [...userBotKeys.all(), 'list'] as const,
  info: (id: Id) => [...userBotKeys.all(), 'info', id] as const,
};

function asBot(raw: Record<string, unknown> | undefined): UserBotView {
  const events = raw?.webhookEvents;
  let webhookEvents: string[] = ['message'];
  if (Array.isArray(events)) {
    webhookEvents = events.map((e) => String(e));
  } else if (typeof events === 'string' && events.trim()) {
    try {
      const parsed = JSON.parse(events) as unknown;
      if (Array.isArray(parsed)) webhookEvents = parsed.map((e) => String(e));
    } catch {
      webhookEvents = ['message'];
    }
  }
  return {
    id: hasId(raw?.id) ? (raw?.id as Id) : 0,
    name: String(raw?.name ?? ''),
    avatar: String(raw?.avatar ?? ''),
    clearDay: Number(raw?.clearDay) || 90,
    webhookUrl: String(raw?.webhookUrl ?? ''),
    webhookEvents,
    systemName: String(raw?.systemName ?? ''),
  };
}

export function useUserBotList(enabled = true) {
  return useQuery({
    queryKey: userBotKeys.list(),
    queryFn: async () => {
      const data = await get<{ list?: Record<string, unknown>[] }>('users/userBot/list');
      return (data.list ?? []).map((row) => asBot(row));
    },
    staleTime: 30_000,
    enabled,
  });
}

export function useUserBotInfo(id: Id | undefined, enabled = true) {
  return useQuery({
    queryKey: userBotKeys.info(id ?? 0),
    queryFn: async () => asBot(await get<Record<string, unknown>>('users/userBot/info', { id })),
    staleTime: 30_000,
    enabled: enabled && hasId(id),
  });
}

export function useEditUserBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserBotEditInput) =>
      post<Record<string, unknown>>('users/userBot/edit', input).then(asBot),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userBotKeys.all() });
    },
  });
}

export function useDeleteUserBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: Id; remark: string }) =>
      get<void>('users/userBot/delete', undefined, {
        config: { params: { id: input.id, remark: input.remark } },
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userBotKeys.all() });
    },
  });
}
