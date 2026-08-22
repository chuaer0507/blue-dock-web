import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';

export type SearchHitType = 'contact' | 'project' | 'task' | 'file' | 'message';

export type SearchHitView = {
  type: string;
  id: number;
  title: string;
  snippet: string;
  projectId: number;
};

export type SearchRebuildStatus = {
  state?: string;
  [key: string]: unknown;
};

export const searchKeys = {
  all: () => ['search'] as const,
  hits: (kind: SearchHitType, key: string, take: number) =>
    [...searchKeys.all(), kind, key, take] as const,
  bundle: (key: string, take: number) => [...searchKeys.all(), 'bundle', key, take] as const,
  rebuildStatus: () => [...searchKeys.all(), 'rebuildStatus'] as const,
};

const KINDS: SearchHitType[] = ['contact', 'project', 'task', 'file', 'message'];

export function searchByKind(
  kind: SearchHitType,
  key: string,
  take = 20,
): Promise<SearchHitView[]> {
  return get<SearchHitView[]>(`search/${kind}`, { key, take });
}

/** 五类并行搜索；单类失败不影响其他 */
export async function searchAll(
  key: string,
  take = 12,
): Promise<Record<SearchHitType, SearchHitView[]>> {
  const settled = await Promise.allSettled(KINDS.map((kind) => searchByKind(kind, key, take)));
  const out = {} as Record<SearchHitType, SearchHitView[]>;
  KINDS.forEach((kind, i) => {
    const r = settled[i];
    out[kind] = r.status === 'fulfilled' ? r.value : [];
  });
  return out;
}

export function useSearchKind(kind: SearchHitType, key: string, take = 20, enabled = true) {
  const q = key.trim();
  return useQuery({
    queryKey: searchKeys.hits(kind, q, take),
    queryFn: () => searchByKind(kind, q, take),
    enabled: enabled && q.length > 0,
    staleTime: 0,
  });
}

export function useSearchAll(key: string, take = 12, enabled = true) {
  const q = key.trim();
  return useQuery({
    queryKey: searchKeys.bundle(q, take),
    queryFn: () => searchAll(q, take),
    enabled: enabled && q.length > 0,
    staleTime: 0,
  });
}

export function useSearchRebuildStatus(enabled = false) {
  return useQuery({
    queryKey: searchKeys.rebuildStatus(),
    queryFn: () => get<SearchRebuildStatus>('search/rebuild/status'),
    enabled,
    staleTime: 5_000,
    refetchInterval: enabled ? 5_000 : false,
  });
}

export function useSearchRebuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (types?: string) =>
      post<Record<string, unknown>>('search/rebuild', undefined, {
        config: { params: types ? { types } : {} },
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: searchKeys.rebuildStatus() });
    },
  });
}

export { KINDS as SEARCH_KINDS };
