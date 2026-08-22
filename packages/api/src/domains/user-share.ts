import { useQuery } from '@tanstack/react-query';
import { get } from '../http-api';

export type UserShareListType = 'file' | 'text';

export type UserShareItemExtend = {
  uploadFileId?: number;
  dialogIds?: number | string;
  textType?: string;
  replyId?: number;
  silence?: string;
};

export type UserShareItem = {
  type: 'children' | 'item' | string;
  name: string;
  icon: string;
  url: string;
  sort?: number;
  extend?: UserShareItemExtend;
};

export const userShareKeys = {
  all: () => ['userShare'] as const,
  list: (type: UserShareListType, key: string, parentId: number | null) =>
    [...userShareKeys.all(), 'list', type, key, parentId ?? 'root'] as const,
};

function asNum(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeItem(raw: Record<string, unknown>): UserShareItem {
  const extendRaw =
    raw.extend && typeof raw.extend === 'object'
      ? (raw.extend as Record<string, unknown>)
      : undefined;
  return {
    type: String(raw.type ?? ''),
    name: String(raw.name ?? ''),
    icon: String(raw.icon ?? ''),
    url: String(raw.url ?? ''),
    sort: asNum(raw.sort),
    extend: extendRaw
      ? {
          uploadFileId: asNum(extendRaw.uploadFileId),
          dialogIds:
            extendRaw.dialogIds == null
              ? undefined
              : (typeof extendRaw.dialogIds === 'number'
                  ? extendRaw.dialogIds
                  : String(extendRaw.dialogIds)),
          textType: extendRaw.textType != null ? String(extendRaw.textType) : undefined,
          replyId: asNum(extendRaw.replyId),
          silence: extendRaw.silence != null ? String(extendRaw.silence) : undefined,
        }
      : undefined,
  };
}

/** 从分享项解析目标会话 id */
export function dialogIdFromShareItem(item: UserShareItem): number | null {
  if (item.type !== 'item') return null;
  const raw = item.extend?.dialogIds;
  if (typeof raw === 'number') return raw > 0 ? raw : null;
  if (typeof raw === 'string') {
    const first = raw.split(',')[0]?.trim();
    const n = Number(first);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/** 文件夹下钻 parentId（children 项） */
export function folderIdFromShareItem(item: UserShareItem): number | null {
  if (item.type !== 'children') return null;
  const id = item.extend?.uploadFileId;
  return id != null && id >= 0 ? id : null;
}

export type UserShareListParams = {
  type?: UserShareListType;
  key?: string;
  /** 下钻文件目录；`null` 表示根（会话 + 文件入口） */
  parentId?: number | null;
  enabled?: boolean;
};

/** `GET users/share/list`：分享选择器 */
export function useUserShareList(params: UserShareListParams = {}) {
  const type: UserShareListType = params.type === 'text' ? 'text' : 'file';
  const key = (params.key ?? '').trim();
  const parentId = params.parentId === undefined ? null : params.parentId;
  const enabled = params.enabled !== false;

  return useQuery({
    queryKey: userShareKeys.list(type, key, parentId),
    queryFn: async () => {
      const query: Record<string, string | number> = { type };
      if (key) query.key = key;
      if (parentId != null) query.parentId = parentId;
      const rows = await get<Record<string, unknown>[]>('users/share/list', query);
      return (rows ?? []).map((r) => normalizeItem(r ?? {}));
    },
    staleTime: 15_000,
    enabled,
  });
}
