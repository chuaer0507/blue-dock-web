import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';

/** `GET users/tags/lists` 单项 */
export type UserTagView = {
  id: number;
  userId: number;
  creatorUserId: number;
  name: string;
  recognizeCount: number;
  recognized: boolean;
};

export type UserTagListView = {
  userId: number;
  list: UserTagView[];
};

export const userTagKeys = {
  all: () => ['userTags'] as const,
  list: (userId: number | 'me') => [...userTagKeys.all(), 'list', userId] as const,
};

function asTag(raw: Record<string, unknown>): UserTagView {
  return {
    id: Number(raw.id) || 0,
    userId: Number(raw.userId) || 0,
    creatorUserId: Number(raw.creatorUserId) || 0,
    name: String(raw.name ?? ''),
    recognizeCount: Number(raw.recognizeCount) || 0,
    recognized: Boolean(raw.recognized),
  };
}

/** 解析 `users/tags/lists` 响应（测试与 hooks 共用） */
export function parseUserTagList(raw: unknown): UserTagListView {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(obj.list)
    ? obj.list
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map(asTag)
        .filter((t) => t.id > 0)
    : [];
  return {
    userId: Number(obj.userId) || 0,
    list,
  };
}

/** `GET users/tags/lists`：个性标签；`userId` 缺省为自己 */
export function useUserTagList(userId?: number, enabled = true) {
  const keyUser = userId != null && userId > 0 ? userId : 'me';
  return useQuery({
    queryKey: userTagKeys.list(keyUser),
    queryFn: async () =>
      parseUserTagList(
        await get<unknown>(
          'users/tags/lists',
          userId != null && userId > 0 ? { userId } : undefined,
        ),
      ),
    staleTime: 30_000,
    enabled,
  });
}

/** `POST users/tags/add` */
export function useAddUserTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; userId?: number }) =>
      post<Record<string, unknown>>('users/tags/add', undefined, {
        config: {
          params: {
            name: input.name.trim(),
            ...(input.userId != null && input.userId > 0 ? { userId: input.userId } : {}),
          },
        },
      }).then(asTag),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: userTagKeys.all() });
      if (vars.userId != null && vars.userId > 0) {
        void queryClient.invalidateQueries({ queryKey: userTagKeys.list(vars.userId) });
      }
    },
  });
}

/** `POST users/tags/update`：仅创建者 */
export function useUpdateUserTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; name: string }) =>
      post<Record<string, unknown>>('users/tags/update', undefined, {
        config: { params: { id: input.id, name: input.name.trim() } },
      }).then(asTag),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userTagKeys.all() });
    },
  });
}

/** `POST users/tags/delete` */
export function useDeleteUserTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number }) =>
      post<{ deleted?: boolean }>('users/tags/delete', undefined, {
        config: { params: { id: input.id } },
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userTagKeys.all() });
    },
  });
}

/** `POST users/tags/recognize`：认可 / 取消 */
export function useRecognizeUserTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number }) => {
      const raw = await post<Record<string, unknown>>('users/tags/recognize', undefined, {
        config: { params: { id: input.id } },
      });
      return {
        id: input.id,
        recognized: Boolean(raw.recognized),
        recognizeCount: Number(raw.recognizeCount) || 0,
      };
    },
    onSuccess: (data) => {
      queryClient.setQueriesData<UserTagListView>({ queryKey: userTagKeys.all() }, (old) => {
        if (!old) return old;
        return {
          ...old,
          list: old.list.map((t) =>
            t.id === data.id
              ? { ...t, recognized: data.recognized, recognizeCount: data.recognizeCount }
              : t,
          ),
        };
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userTagKeys.all() });
    },
  });
}
