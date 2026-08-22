import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';

export type FavoriteType = 'task' | 'project' | 'file' | 'message';

export type FavoriteItem = {
  id: number;
  type: FavoriteType | string;
  refId: number;
  remark: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FavoriteListView = {
  list: FavoriteItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type FavoriteToggleResult = {
  favorited: boolean;
  type: string;
  id: number;
};

export type RecentType = 'task' | 'file' | 'task_file' | 'message_file' | string;

export type RecentItem = {
  recordId: number;
  type: RecentType;
  id?: number;
  name?: string;
  projectId?: number;
  projectName?: string;
  taskName?: string;
  folderId?: number;
  dialogId?: number;
  taskId?: number;
  browsedAt?: string | null;
  sourceType?: string;
  sourceId?: number;
  [key: string]: unknown;
};

export type RecentListView = {
  list: RecentItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type TaskBrowseItem = {
  id: number;
  name: string;
  projectId: number;
  columnId?: number;
  parentId?: number;
  completeAt?: string | null;
  browsedAt?: string | null;
};

export const favoriteKeys = {
  all: () => ['favorite'] as const,
  list: (type: string, page: number, pageSize: number) =>
    [...favoriteKeys.all(), 'list', type, page, pageSize] as const,
  check: (type: string, id: number) => [...favoriteKeys.all(), 'check', type, id] as const,
  recent: (type: string, page: number) => [...favoriteKeys.all(), 'recent', type, page] as const,
  taskBrowse: (limit: number) => [...favoriteKeys.all(), 'taskBrowse', limit] as const,
};

export function useFavoriteList(type: FavoriteType | '' = '', page = 1, pageSize = 20) {
  return useQuery({
    queryKey: favoriteKeys.list(type || 'all', page, pageSize),
    queryFn: () =>
      get<FavoriteListView>('users/favorites', {
        ...(type ? { type } : {}),
        page,
        pageSize,
      }),
    staleTime: 30_000,
  });
}

export function useFavoriteCheck(type: FavoriteType, id: number, enabled = true) {
  return useQuery({
    queryKey: favoriteKeys.check(type, id),
    queryFn: () =>
      get<{ favorited: boolean; type: string; id: number }>('users/favorite/check', {
        type,
        id,
      }),
    enabled: enabled && id > 0,
    staleTime: 30_000,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { type: FavoriteType; id: number }) =>
      post<FavoriteToggleResult>('users/favorite/toggle', undefined, {
        config: { params: { type: vars.type, id: vars.id } },
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: favoriteKeys.all() });
    },
  });
}

export function useFavoriteRemark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { type: FavoriteType; id: number; remark: string }) =>
      post<{ remark: string }>('users/favorite/remark', undefined, {
        config: { params: { type: vars.type, id: vars.id, remark: vars.remark } },
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: favoriteKeys.all() });
    },
  });
}

export function useCleanFavorites() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type?: FavoriteType | '') =>
      post<{ deletedCount: number }>('users/favorites/clean', undefined, {
        config: { params: type ? { type } : {} },
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: favoriteKeys.all() });
    },
  });
}

export function useRecentBrowse(type: RecentType | '' = '', page = 1, pageSize = 30) {
  return useQuery({
    queryKey: favoriteKeys.recent(type || 'all', page),
    queryFn: () =>
      get<RecentListView>('users/recent/browse', {
        ...(type ? { type } : {}),
        page,
        pageSize,
      }),
    staleTime: 30_000,
  });
}

export function useDeleteRecent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      post<Record<string, unknown>>('users/recent/delete', undefined, {
        config: { params: { id } },
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: favoriteKeys.all() });
    },
  });
}

export function useTaskBrowse(limit = 30, enabled = true) {
  return useQuery({
    queryKey: favoriteKeys.taskBrowse(limit),
    queryFn: () => get<TaskBrowseItem[]>('users/task/browse', { limit }),
    staleTime: 30_000,
    enabled,
  });
}

/** `GET users/task/browseSave`：显式记录任务浏览（缓存命中未打 one 时仍写入最近） */
export function useSaveTaskBrowse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => get<unknown>('users/task/browseSave', { taskId }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: [...favoriteKeys.all(), 'taskBrowse'] });
      void qc.invalidateQueries({ queryKey: [...favoriteKeys.all(), 'recent'] });
    },
  });
}

export function useCleanTaskBrowse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keepCount?: number) =>
      post<{ deletedCount: number }>('users/task/browseClean', undefined, {
        config: { params: { keepCount: keepCount ?? 0 } },
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: favoriteKeys.all() });
    },
  });
}
