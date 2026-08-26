import { useQuery } from '@tanstack/react-query';
import { get } from '../http-api';

/** `GET users/presence` 单项 */
export type UserPresenceView = {
  userId: number;
  online: boolean;
  pcActive: boolean;
};

export const presenceKeys = {
  all: () => ['presence'] as const,
  users: (idsKey: string) => [...presenceKeys.all(), 'users', idsKey] as const,
};

/** 稳定化 userIds 查询键（去重、排序、≤100） */
export function presenceIdsKey(userIds: number[]): string {
  return normalizePresenceIds(userIds).join(',');
}

function normalizePresenceIds(userIds: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of userIds) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 100) break;
  }
  return out.sort((a, b) => a - b);
}

function asPresenceItem(raw: Record<string, unknown>): UserPresenceView {
  return {
    userId: Number(raw.userId) || 0,
    online: Boolean(raw.online),
    pcActive: Boolean(raw.pcActive),
  };
}

function asPresenceList(raw: unknown): UserPresenceView[] {
  const items =
    raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : Array.isArray(raw)
        ? raw
        : [];
  return items
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map(asPresenceItem)
    .filter((x) => x.userId > 0);
}

/** `GET users/presence`：批量在线态（userIds 逗号分隔，≤100） */
export function fetchUsersPresence(userIds: number[]): Promise<UserPresenceView[]> {
  const ids = normalizePresenceIds(userIds);
  if (ids.length === 0) return Promise.resolve([]);
  return get<unknown>('users/presence', { userIds: ids.join(',') }).then(asPresenceList);
}

/** 批量查询在线态；WS `presence.*` 会失效 `presenceKeys.all()` */
export function useUsersPresence(userIds: number[] | undefined, enabled = true) {
  const ids = normalizePresenceIds(userIds ?? []);
  const idsKey = ids.join(',');
  return useQuery({
    queryKey: presenceKeys.users(idsKey),
    queryFn: () => fetchUsersPresence(ids),
    enabled: enabled && ids.length > 0,
    staleTime: 30_000,
  });
}

/** 单个用户在线态（复用批量 hook） */
export function useUserPresence(userId: number | undefined, enabled = true) {
  const query = useUsersPresence(
    typeof userId === 'number' && userId > 0 ? [userId] : undefined,
    enabled && typeof userId === 'number' && userId > 0,
  );
  const data =
    typeof userId === 'number'
      ? (query.data ?? []).find((item) => item.userId === userId)
      : undefined;
  return { ...query, data };
}
