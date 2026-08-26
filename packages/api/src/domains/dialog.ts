import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { get, post, upload } from '../http-api';
import { http } from '../client';
import { ApiError } from '../errors';

export type DialogView = {
  id: number;
  type: string;
  groupType: string;
  name: string;
  avatar: string;
  ownerId: number;
  linkId: number;
  lastMessage: string;
  lastAt: string | null;
  unreadCount: number;
  mentionCount: number;
  mentionIds: number[];
  isTop: number;
  color: string;
  createdAt: string | null;
};

export type DialogMessageView = {
  id: number;
  dialogId: number;
  userId: number;
  type: string;
  body: string;
  replyId: number;
  tagUserId: number;
  createdAt: string | null;
};

export const dialogKeys = {
  all: () => ['dialogs'] as const,
  list: () => [...dialogKeys.all(), 'list'] as const,
  beyond: () => [...dialogKeys.all(), 'beyond'] as const,
  search: (key: string, take: number) => [...dialogKeys.all(), 'search', key, take] as const,
  searchTag: (key: string, take: number) => [...dialogKeys.all(), 'searchTag', key, take] as const,
  common: (targetUserId: number | null, page: number, pageSize: number) =>
    [...dialogKeys.all(), 'common', targetUserId, page, pageSize] as const,
  commonCount: (targetUserId: number | null) =>
    [...dialogKeys.all(), 'commonCount', targetUserId] as const,
  groupSearchUser: (key: string) => [...dialogKeys.all(), 'groupSearchUser', key] as const,
  detail: (dialogId: number) => [...dialogKeys.all(), 'detail', dialogId] as const,
  one: (dialogId: number) => [...dialogKeys.all(), 'one', dialogId] as const,
  messages: (dialogId: number) => [...dialogKeys.all(), 'messages', dialogId] as const,
  todos: (dialogId: number | 'all') => [...dialogKeys.all(), 'todos', dialogId] as const,
  emojiMap: (dialogId: number, idsKey: string) =>
    [...dialogKeys.all(), 'emojiMap', dialogId, idsKey] as const,
  tops: (dialogId: number) => [...dialogKeys.all(), 'tops', dialogId] as const,
  translation: (messageId: number, language: string) =>
    [...dialogKeys.all(), 'translation', messageId, language] as const,
  stickerSearch: (key: string) => [...dialogKeys.all(), 'stickerSearch', key] as const,
  messageBlob: (messageId: number) => [...dialogKeys.all(), 'messageBlob', messageId] as const,
  mergeDetail: (messageId: number) => [...dialogKeys.all(), 'mergeDetail', messageId] as const,
  readList: (messageId: number) => [...dialogKeys.all(), 'readList', messageId] as const,
  unread: () => [...dialogKeys.all(), 'unread'] as const,
  sessions: (dialogId: number) => [...dialogKeys.all(), 'sessions', dialogId] as const,
  messageDetail: (messageId: number) => [...dialogKeys.all(), 'messageDetail', messageId] as const,
};

/** 尝试从消息 body 抽出可读文本 */
export function previewMessageBody(body: string): string {
  if (!body) return '';
  try {
    const parsed = JSON.parse(body) as unknown;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if ('text' in obj) return String(obj.text ?? '');
      if ('notice' in obj) return String(obj.notice ?? '');
      if ('title' in obj && String(obj.title ?? '').trim()) return String(obj.title);
    }
  } catch {
    // plain text
  }
  return body;
}

export function useDialogList(wsConnected?: boolean) {
  return useQuery({
    queryKey: dialogKeys.list(),
    queryFn: () => get<DialogView[]>('dialog/lists'),
    staleTime: 15_000,
    refetchInterval: wsConnected === false ? 5000 : false,
  });
}

/** `GET dialog/one`：单会话详情（含 bot dialogOpen 副作用） */
export function useDialogOne(dialogId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: dialogKeys.one(dialogId ?? 0),
    queryFn: () => get<DialogView>('dialog/one', { dialogId }),
    enabled: enabled && typeof dialogId === 'number' && dialogId > 0,
    staleTime: 30_000,
  });
}

/** `GET dialog/beyond`：已隐藏会话 */
export function useDialogBeyond(enabled = true) {
  return useQuery({
    queryKey: dialogKeys.beyond(),
    queryFn: () => get<DialogView[]>('dialog/beyond'),
    staleTime: 30_000,
    enabled,
  });
}

/** `GET dialog/search`：搜会话名/摘要/单聊对方 */
export function useDialogSearch(key: string, take = 30, enabled = true) {
  const q = key.trim();
  return useQuery({
    queryKey: dialogKeys.search(q, take),
    queryFn: () => get<DialogView[]>('dialog/search', { key: q, take }),
    enabled: enabled && q.length > 0,
    staleTime: 10_000,
  });
}

/** `GET dialog/search/tag`：按个人标签搜会话（空 key=全部有标签） */
export function useDialogSearchTag(key: string, take = 50, enabled = true) {
  const q = key.trim();
  return useQuery({
    queryKey: dialogKeys.searchTag(q, take),
    queryFn: () =>
      get<DialogView[]>('dialog/search/tag', {
        ...(q ? { key: q } : { key: '' }),
        take,
      }),
    enabled,
    staleTime: 10_000,
  });
}

export type DialogCommonListPage = {
  list: DialogView[];
  page: number;
  pageSize: number;
  total: number;
};

function parseDialogCommonList(raw: unknown): DialogCommonListPage {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const listRaw = Array.isArray(body.list) ? body.list : [];
  return {
    list: listRaw.map((item) => {
      const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        id: Number(row.id) || 0,
        type: String(row.type ?? ''),
        groupType: String(row.groupType ?? ''),
        name: String(row.name ?? ''),
        avatar: String(row.avatar ?? ''),
        ownerId: Number(row.ownerId) || 0,
        linkId: Number(row.linkId) || 0,
        lastMessage: String(row.lastMessage ?? ''),
        lastAt: row.lastAt == null ? null : String(row.lastAt),
        unreadCount: Number(row.unreadCount) || 0,
        mentionCount: Number(row.mentionCount) || 0,
        mentionIds: Array.isArray(row.mentionIds)
          ? row.mentionIds.map((id) => Number(id)).filter((n) => Number.isFinite(n))
          : [],
        isTop: Number(row.isTop) || 0,
        color: String(row.color ?? ''),
        createdAt: row.createdAt == null ? null : String(row.createdAt),
      } satisfies DialogView;
    }),
    page: Number(body.page) || 1,
    pageSize: Number(body.pageSize) || 20,
    total: Number(body.total) || 0,
  };
}

/** `GET dialog/common/list`：本人普通个人群；`targetUserId` 有值时为共同群 */
export function useDialogCommonList(
  targetUserId: number | undefined,
  page = 1,
  pageSize = 20,
  enabled = true,
) {
  const target = targetUserId != null && targetUserId > 0 ? targetUserId : null;
  return useQuery({
    queryKey: dialogKeys.common(target, page, pageSize),
    queryFn: async () => {
      const raw = await get<unknown>('dialog/common/list', {
        ...(target != null ? { targetUserId: target } : {}),
        page,
        pageSize,
      });
      return parseDialogCommonList(raw);
    },
    enabled,
    staleTime: 30_000,
  });
}

/** `GET dialog/common/list?onlyCount=yes`：仅返回共同/本人群数量 */
export function useDialogCommonCount(targetUserId: number | undefined, enabled = true) {
  const target = targetUserId != null && targetUserId > 0 ? targetUserId : null;
  return useQuery({
    queryKey: dialogKeys.commonCount(target),
    queryFn: async () => {
      const raw = await get<{ total?: number }>('dialog/common/list', {
        ...(target != null ? { targetUserId: target } : {}),
        onlyCount: 'yes',
      });
      return Number(raw?.total) || 0;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useDialogMessages(dialogId: number | undefined, take = 50, wsConnected?: boolean) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: dialogKeys.messages(dialogId ?? 0),
    queryFn: async () => {
      const latest = await get<DialogMessageView[]>('dialog/message/list', {
        dialogId,
        take,
      });
      const prev =
        typeof dialogId === 'number'
          ? queryClient.getQueryData<DialogMessageView[]>(dialogKeys.messages(dialogId))
          : undefined;
      return mergeDialogMessages(prev, latest);
    },
    enabled: typeof dialogId === 'number' && dialogId > 0,
    staleTime: 10_000,
    refetchInterval: wsConnected === false ? 5000 : false,
  });
}

export type LoadOlderDialogMessagesInput = {
  dialogId: number;
  /** 当前已加载中最小 message id */
  beforeId: number;
  take?: number;
};

/** `GET dialog/message/list` + `beforeId`：向前翻历史，合并进同一 Query 缓存 */
export function useLoadOlderDialogMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoadOlderDialogMessagesInput) =>
      get<DialogMessageView[]>('dialog/message/list', {
        dialogId: input.dialogId,
        beforeId: input.beforeId,
        take: input.take ?? 50,
      }),
    onSuccess: (older, vars) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (prev) =>
        mergeDialogMessages(prev, older),
      );
    },
  });
}

/** `GET dialog/message/latest` 游标：最多 5 会话 */
export type DialogLatestCursor = {
  dialogId: number;
  /** 已有最大 message id；省略则取该会话最近 take 条 */
  latestId?: number;
};

/** `GET dialog/message/latest`：多会话增量（`dialogs` JSON，≤5） */
export async function fetchDialogMessagesLatest(
  dialogs: DialogLatestCursor[],
  take = 25,
): Promise<DialogMessageView[]> {
  const slice = dialogs.filter((d) => d.dialogId > 0).slice(0, 5);
  if (!slice.length) return [];
  const raw = await get<DialogMessageView[]>('dialog/message/latest', {
    dialogs: JSON.stringify(
      slice.map((d) => ({
        dialogId: d.dialogId,
        ...(d.latestId != null && d.latestId > 0 ? { latestId: d.latestId } : {}),
      })),
    ),
    take: Math.min(Math.max(take, 1), 50),
  });
  return Array.isArray(raw) ? raw : [];
}

/**
 * 从 Query 缓存收集最多 `maxDialogs` 个已加载会话的 latest 游标（按 dataUpdatedAt 优先）。
 */
export function collectDialogLatestCursors(
  queryClient: QueryClient,
  maxDialogs = 5,
): DialogLatestCursor[] {
  const limit = Math.min(Math.max(maxDialogs, 1), 5);
  const entries = queryClient.getQueriesData<DialogMessageView[]>({
    queryKey: [...dialogKeys.all(), 'messages'],
  });
  const ranked: Array<DialogLatestCursor & { updatedAt: number }> = [];
  for (const [key, data] of entries) {
    if (!data?.length) continue;
    const dialogId = Number(key[2]);
    if (!Number.isFinite(dialogId) || dialogId <= 0) continue;
    let latestId = 0;
    for (const m of data) {
      if (m.id > latestId) latestId = m.id;
    }
    if (latestId <= 0) continue;
    ranked.push({
      dialogId,
      latestId,
      updatedAt: queryClient.getQueryState(key)?.dataUpdatedAt ?? 0,
    });
  }
  ranked.sort((a, b) => b.updatedAt - a.updatedAt);
  return ranked.slice(0, limit).map(({ dialogId, latestId }) => ({ dialogId, latestId }));
}

/** 将 latest 增量合并进各会话消息缓存；返回写入条数 */
export function applyDialogMessagesLatest(
  queryClient: QueryClient,
  messages: DialogMessageView[],
): number {
  if (!messages.length) return 0;
  const byDialog = new Map<number, DialogMessageView[]>();
  for (const m of messages) {
    const dialogId = Number(m.dialogId) || 0;
    if (dialogId <= 0) continue;
    const list = byDialog.get(dialogId) ?? [];
    list.push(m);
    byDialog.set(dialogId, list);
  }
  let count = 0;
  for (const [dialogId, list] of byDialog) {
    queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(dialogId), (prev) =>
      mergeDialogMessages(prev, list),
    );
    count += list.length;
  }
  return count;
}

/**
 * WS 重连补洞：对缓存中最多 5 个会话调 `message/latest` 并合并。
 * @returns 合并写入的消息条数
 */
export async function syncCachedDialogMessagesLatest(
  queryClient: QueryClient,
  take = 25,
): Promise<number> {
  const cursors = collectDialogLatestCursors(queryClient, 5);
  if (!cursors.length) return 0;
  const msgs = await fetchDialogMessagesLatest(cursors, take);
  return applyDialogMessagesLatest(queryClient, msgs);
}

/** 按 id 合并消息（升序）；用于历史翻页与 refetch 不丢已加载更早消息 */
function mergeDialogMessages(
  prev: DialogMessageView[] | undefined,
  incoming: DialogMessageView[],
): DialogMessageView[] {
  if (!prev?.length) {
    return [...incoming].sort((a, b) => a.id - b.id);
  }
  if (!incoming.length) return prev;
  const byId = new Map<number, DialogMessageView>();
  for (const m of prev) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

/** `GET dialog/user`：会话成员 userId 列表 */
export function useDialogMemberIds(dialogId: number | undefined) {
  return useQuery({
    queryKey: [...dialogKeys.detail(dialogId ?? 0), 'members'] as const,
    queryFn: () => get<number[]>('dialog/user', { dialogId }),
    enabled: typeof dialogId === 'number' && dialogId > 0,
    staleTime: 60_000,
  });
}

/** 批量拉会话成员（列表在线态等；`dialogIds` 建议 ≤40） */
export function useDialogMemberIdsMany(dialogIds: number[], enabled = true) {
  const ids = [...new Set(dialogIds.filter((id) => id > 0))].slice(0, 40);
  return useQueries({
    queries: ids.map((dialogId) => ({
      queryKey: [...dialogKeys.detail(dialogId), 'members'] as const,
      queryFn: () => get<number[]>('dialog/user', { dialogId }),
      enabled: enabled && dialogId > 0,
      staleTime: 60_000,
    })),
  });
}

export type SendTextInput = {
  dialogId: number;
  text: string;
  replyId?: number;
};

export function useSendDialogText() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendTextInput) =>
      post<DialogMessageView>('dialog/message/sendText', undefined, {
        config: {
          params: {
            dialogId: input.dialogId,
            text: input.text,
            ...(input.replyId == null ? {} : { replyId: input.replyId }),
          },
        },
      }),
    onSuccess: (msg, vars) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

export type SendDialogFileInput = {
  dialogId: number;
  file: File;
  replyId?: number;
};

/** `POST dialog/message/sendFile`：multipart 直传文件/图片 */
export function useSendDialogFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogFileInput) =>
      upload<DialogMessageView>('dialog/message/sendFile', input.file, {
        fieldName: 'files',
        fields: {
          dialogId: input.dialogId,
          ...(input.file.name ? { filename: input.file.name } : {}),
          ...(input.replyId != null ? { replyId: input.replyId } : {}),
        },
      }),
    onSuccess: (msg, vars) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

export type SendDialogImage64Input = {
  dialogId: number;
  /** data-URL 或裸 base64 */
  image: string;
  filename?: string;
  replyId?: number;
};

/** `POST dialog/message/image64`：Base64 发图（≤5MB） */
export function useSendDialogImage64() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogImage64Input) => {
      const fd = new FormData();
      fd.append('dialogId', String(input.dialogId));
      fd.append('image', input.image);
      if (input.filename?.trim()) fd.append('filename', input.filename.trim());
      if (input.replyId != null) fd.append('replyId', String(input.replyId));
      return post<DialogMessageView>('dialog/message/image64', fd);
    },
    onSuccess: (msg, vars) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

export type SendDialogFilesInput = {
  /** 目标会话（≤20）；单目标也可只传一项 */
  dialogIds: number[];
  /** 本地文件（≤20） */
  files: File[];
};

/** `POST dialog/message/sendFiles`：多文件 × 多会话群发 */
export function useSendDialogFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogFilesInput) => {
      const ids = [...new Set(input.dialogIds.filter((id) => id > 0))];
      const files = input.files.filter((f) => f && f.size > 0);
      const fd = new FormData();
      if (ids.length === 1) {
        fd.append('dialogId', String(ids[0]));
      } else {
        fd.append('dialogIds', ids.join(','));
      }
      for (const file of files) {
        fd.append('files', file, file.name || 'file');
      }
      return post<DialogMessageView[]>('dialog/message/sendFiles', fd, {
        config: { timeout: 120_000 },
      });
    },
    onSuccess: (msgs, vars) => {
      const byDialog = new Map<number, DialogMessageView[]>();
      for (const msg of msgs ?? []) {
        const list = byDialog.get(msg.dialogId) ?? [];
        list.push(msg);
        byDialog.set(msg.dialogId, list);
      }
      for (const [dialogId, list] of byDialog) {
        queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(dialogId), (old) => {
          if (!old) return list;
          const known = new Set(old.map((m) => m.id));
          const extra = list.filter((m) => !known.has(m.id));
          return extra.length ? [...old, ...extra] : old;
        });
      }
      for (const id of vars.dialogIds) {
        void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(id) });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

export type SendDialogFileIdInput = {
  dialogId: number;
  fileId: number;
  replyId?: number;
};

/** `GET dialog/message/sendFileId`：将本人网盘文件发到会话 */
export function useSendDialogFileId() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogFileIdInput) =>
      get<DialogMessageView>('dialog/message/sendFileId', {
        dialogId: input.dialogId,
        fileId: input.fileId,
        ...(input.replyId != null ? { replyId: input.replyId } : {}),
      }),
    onSuccess: (msg, vars) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

export type SendDialogTaskIdInput = {
  dialogId: number;
  taskId: number;
  /** 附言；契约亦接受 `text` */
  note?: string;
  replyId?: number;
};

/** `GET dialog/message/sendTaskId`：将任务卡片发到会话 */
export function useSendDialogTaskId() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogTaskIdInput) =>
      get<DialogMessageView>('dialog/message/sendTaskId', {
        dialogId: input.dialogId,
        taskId: input.taskId,
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        ...(input.replyId != null ? { replyId: input.replyId } : {}),
      }),
    onSuccess: (msg, vars) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

export type SendDialogRecordInput = {
  dialogId: number;
  /** data-URL：`data:audio/wav;base64,…` 或 mp3 */
  base64: string;
  /** 毫秒，须 ≥600 */
  duration: number;
  replyId?: number;
};

/** `POST dialog/message/sendRecord`：发送语音（FormData，避免超长 query） */
export function useSendDialogRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogRecordInput) => {
      const fd = new FormData();
      fd.append('dialogId', String(input.dialogId));
      fd.append('base64', input.base64);
      fd.append('duration', String(Math.round(input.duration)));
      if (input.replyId != null) fd.append('replyId', String(input.replyId));
      return post<DialogMessageView>('dialog/message/sendRecord', fd);
    },
    onSuccess: (msg, vars) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

export type ConvertDialogRecordInput = {
  base64: string;
  duration: number;
  dialogId?: number;
  /** 目标语言；空则只转写 */
  translate?: string;
};

/** `POST dialog/message/convertRecord`：录音转写（不落消息）→ `{ text }` */
export function useConvertDialogRecord() {
  return useMutation({
    mutationFn: async (input: ConvertDialogRecordInput) => {
      const fd = new FormData();
      fd.append('base64', input.base64);
      fd.append('duration', String(Math.round(input.duration)));
      if (input.dialogId != null) fd.append('dialogId', String(input.dialogId));
      if (input.translate?.trim()) fd.append('translate', input.translate.trim());
      const raw = await post<{ text?: string } | string>('dialog/message/convertRecord', fd);
      if (typeof raw === 'string') return raw.trim();
      return String(raw?.text ?? '').trim();
    },
  });
}

/** `GET dialog/message/voiceToText`：已有语音转写并写回 body.text */
export function useDialogVoiceToText() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: number) =>
      get<DialogMessageView>('dialog/message/voiceToText', { messageId }),
    onSuccess: (msg) => {
      if (msg.dialogId > 0) {
        queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(msg.dialogId), (old) => {
          if (!old) return [msg];
          return old.map((m) => (m.id === msg.id ? msg : m));
        });
      }
    },
    onSettled: (msg, _e, messageId) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messageBlob(messageId) });
      if (msg?.dialogId && msg.dialogId > 0) {
        void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(msg.dialogId) });
      }
    },
  });
}

export type DialogStickerView = {
  name: string;
  src: string;
  height: number;
  width: number;
};

/** `GET dialog/sticker/search`：在线表情搜索 */
export function useDialogStickerSearch(key: string, enabled = true) {
  const q = key.trim();
  return useQuery({
    queryKey: dialogKeys.stickerSearch(q),
    queryFn: async () => {
      const raw = await get<{ list?: DialogStickerView[] }>('dialog/sticker/search', { key: q });
      return Array.isArray(raw?.list) ? raw.list : [];
    },
    enabled: enabled && q.length > 0,
    staleTime: 60_000,
  });
}

export type SendDialogStickerInput = {
  dialogId: number;
  src: string;
  name?: string;
  replyId?: number;
};

/** `POST dialog/message/sendSticker`：服务端拉图后发图片消息 */
export function useSendDialogSticker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogStickerInput) =>
      post<DialogMessageView>('dialog/message/sendSticker', undefined, {
        config: {
          params: {
            dialogId: input.dialogId,
            src: input.src,
            ...(input.name ? { name: input.name } : {}),
            ...(input.replyId == null ? {} : { replyId: input.replyId }),
          },
        },
      }),
    onSuccess: (msg, vars) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

export type SendDialogAnonInput = {
  /** 接收方用户 id */
  userId: number;
  text: string;
};

/** `POST dialog/message/sendAnon`：经匿名机器人向指定用户发文本（受系统 `anonMessage` 开关） */
export function useSendDialogAnon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogAnonInput) =>
      post<DialogMessageView>('dialog/message/sendAnon', undefined, {
        config: {
          params: {
            userId: input.userId,
            text: input.text.trim(),
          },
        },
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

export type SendDialogBotInput = {
  userId: number;
  text: string;
  /** 默认 system-msg；系统前缀或自定义 6–20 字符 → user-auto-* */
  botType?: string;
  botName?: string;
  /** 真值则静默（不推未读等） */
  silence?: string;
};

/** `POST dialog/message/sendBot`：以机器人身份向用户发 markdown 私聊 */
export function useSendDialogBot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogBotInput) => {
      const fd = new FormData();
      fd.append('userId', String(input.userId));
      fd.append('text', input.text.trim());
      if (input.botType?.trim()) fd.append('botType', input.botType.trim());
      if (input.botName?.trim()) fd.append('botName', input.botName.trim());
      if (input.silence?.trim()) fd.append('silence', input.silence.trim());
      return post<DialogMessageView>('dialog/message/sendBot', fd);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

export type AddDialogOkrInput = {
  okrId: number;
  name?: string;
  /** 评论群成员（自动含调用者；会同步踢出未列成员） */
  userIds?: number[];
};

/** `POST dialog/okr/add`：创建/复用 OKR 评论群（`group_type=okr`，自动加入 okr-alert） */
export function useAddDialogOkr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddDialogOkrInput) =>
      post<DialogView>('dialog/okr/add', undefined, {
        config: {
          params: {
            okrId: input.okrId,
            ...(input.name?.trim() ? { name: input.name.trim() } : {}),
            ...(input.userIds?.length ? { userIds: input.userIds.join(',') } : {}),
          },
        },
      }),
    onSuccess: (dialog) => {
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) => {
        if (!old) return [dialog];
        if (old.some((d) => d.id === dialog.id)) {
          return old.map((d) => (d.id === dialog.id ? dialog : d));
        }
        return [dialog, ...old];
      });
      queryClient.setQueryData(dialogKeys.one(dialog.id), dialog);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

export type PushDialogOkrInput = {
  /** 与 okrId 二选一 */
  dialogId?: number;
  okrId?: number;
  text: string;
};

/** `POST dialog/okr/push`：OKR 提醒机器人向评论群发 markdown */
export function usePushDialogOkr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PushDialogOkrInput) =>
      post<DialogMessageView>('dialog/okr/push', undefined, {
        config: {
          params: {
            text: input.text.trim(),
            ...(input.dialogId != null && input.dialogId > 0 ? { dialogId: input.dialogId } : {}),
            ...(input.okrId != null && input.okrId > 0 ? { okrId: input.okrId } : {}),
          },
        },
      }),
    onSuccess: (msg) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(msg.dialogId), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      if (vars.dialogId != null && vars.dialogId > 0) {
        void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
      }
    },
  });
}

export const DIALOG_APPROVE_CARD_TYPES = [
  'approve_reviewer',
  'approve_notifier',
  'approve_submitter',
  'approve_comment_notifier',
] as const;

export type DialogApproveCardType = (typeof DIALOG_APPROVE_CARD_TYPES)[number];

export type SendDialogApproveInput = {
  toUserId: number;
  type: DialogApproveCardType;
  action?: string;
  isFinished?: 0 | 1;
  /** JSON object string，如 `{"approveId":1}` */
  data?: string;
  title?: string;
};

/** `POST dialog/message/sendApprove`：审批助手机器人静默发审批模板卡片 */
export function useSendDialogApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogApproveInput) => {
      const fd = new FormData();
      fd.append('toUserId', String(input.toUserId));
      fd.append('type', input.type);
      if (input.action?.trim()) fd.append('action', input.action.trim());
      if (input.isFinished != null) fd.append('isFinished', String(input.isFinished));
      if (input.data?.trim()) fd.append('data', input.data.trim());
      if (input.title?.trim()) fd.append('title', input.title.trim());
      return post<DialogMessageView>('dialog/message/sendApprove', fd);
    },
    onSuccess: (msg) => {
      if (msg?.dialogId > 0) {
        queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(msg.dialogId), (old) => {
          if (!old) return [msg];
          if (old.some((m) => m.id === msg.id)) return old;
          return [...old, msg];
        });
      }
    },
    onSettled: (msg) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      if (msg?.dialogId && msg.dialogId > 0) {
        void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(msg.dialogId) });
      }
    },
  });
}

export type SendDialogAiAssistantInput = {
  dialogId?: number;
  taskId?: number;
  text: string;
  /** 默认 md */
  textType?: string;
  nickname?: string;
  silence?: string;
};

/** `POST dialog/message/sendAiAssistant`：以 AI 助手机器人发文本到会话或任务群 */
export function useSendDialogAiAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogAiAssistantInput) => {
      const fd = new FormData();
      fd.append('text', input.text.trim());
      if (input.dialogId != null) fd.append('dialogId', String(input.dialogId));
      if (input.taskId != null) fd.append('taskId', String(input.taskId));
      if (input.textType?.trim()) fd.append('textType', input.textType.trim());
      if (input.nickname?.trim()) fd.append('nickname', input.nickname.trim());
      if (input.silence?.trim()) fd.append('silence', input.silence.trim());
      return post<DialogMessageView>('dialog/message/sendAiAssistant', fd);
    },
    onSuccess: (msg) => {
      if (msg?.dialogId > 0) {
        queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(msg.dialogId), (old) => {
          if (!old) return [msg];
          if (old.some((m) => m.id === msg.id)) return old;
          return [...old, msg];
        });
      }
    },
    onSettled: (msg) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      if (msg?.dialogId && msg.dialogId > 0) {
        void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(msg.dialogId) });
      }
    },
  });
}

export type DialogLocationMapType = 'baidu' | 'amap' | 'tencent';

export type SendDialogLocationInput = {
  dialogId: number;
  type: DialogLocationMapType;
  lng: number;
  lat: number;
  title: string;
  distance?: number;
  address?: string;
  thumb?: string;
};

/** `POST dialog/message/sendLocation`：发送位置消息 */
export function useSendDialogLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogLocationInput) =>
      post<DialogMessageView>('dialog/message/sendLocation', undefined, {
        config: {
          params: {
            dialogId: input.dialogId,
            type: input.type,
            lng: input.lng,
            lat: input.lat,
            title: input.title.trim(),
            ...(input.distance != null ? { distance: input.distance } : {}),
            ...(input.address?.trim() ? { address: input.address.trim() } : {}),
            ...(input.thumb?.trim() ? { thumb: input.thumb.trim() } : {}),
          },
        },
      }),
    onSuccess: (msg, vars) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (old) => {
        if (!old) return [msg];
        if (old.some((m) => m.id === msg.id)) return old;
        return [...old, msg];
      });
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

export type SendDialogNoticeInput = {
  dialogId?: number;
  /** 逗号分隔多会话；与 dialogId 二选一或并用 */
  dialogIds?: string;
  notice: string;
  silence?: string;
  source?: string;
};

/** `POST dialog/message/sendNotice`：发送 notice（≤500 字） */
export function useSendDialogNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogNoticeInput) => {
      const fd = new FormData();
      fd.append('notice', input.notice.trim());
      if (input.dialogId != null) fd.append('dialogId', String(input.dialogId));
      if (input.dialogIds?.trim()) fd.append('dialogIds', input.dialogIds.trim());
      if (input.silence?.trim()) fd.append('silence', input.silence.trim());
      if (input.source?.trim()) fd.append('source', input.source.trim());
      return post<DialogMessageView>('dialog/message/sendNotice', fd);
    },
    onSuccess: (msg) => {
      if (msg?.dialogId > 0) {
        queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(msg.dialogId), (old) => {
          if (!old) return [msg];
          if (old.some((m) => m.id === msg.id)) return old;
          return [...old, msg];
        });
      }
    },
    onSettled: (msg) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      if (msg?.dialogId && msg.dialogId > 0) {
        void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(msg.dialogId) });
      }
    },
  });
}

export type DialogTemplateItem = {
  content: string;
  style?: string;
};

export type SendDialogTemplateInput = {
  dialogId?: number;
  dialogIds?: string;
  items: DialogTemplateItem[];
  title?: string;
  silence?: string;
  source?: string;
};

/** `POST dialog/message/sendTemplate`：模板卡片（content JSON 数组） */
export function useSendDialogTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendDialogTemplateInput) => {
      const content = JSON.stringify(
        input.items.map((item) => ({
          content: item.content.trim(),
          style: (item.style ?? '').trim(),
        })),
      );
      const fd = new FormData();
      fd.append('content', content);
      if (input.dialogId != null) fd.append('dialogId', String(input.dialogId));
      if (input.dialogIds?.trim()) fd.append('dialogIds', input.dialogIds.trim());
      if (input.title?.trim()) fd.append('title', input.title.trim());
      if (input.silence?.trim()) fd.append('silence', input.silence.trim());
      if (input.source?.trim()) fd.append('source', input.source.trim());
      return post<DialogMessageView>('dialog/message/sendTemplate', fd);
    },
    onSuccess: (msg) => {
      if (msg?.dialogId > 0) {
        queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(msg.dialogId), (old) => {
          if (!old) return [msg];
          if (old.some((m) => m.id === msg.id)) return old;
          return [...old, msg];
        });
      }
    },
    onSettled: (msg) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      if (msg?.dialogId && msg.dialogId > 0) {
        void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(msg.dialogId) });
      }
    },
  });
}

/** `GET dialog/message/mark`：会话标记已读/未读 */
export function useMarkDialogRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; afterMessageId?: number }) =>
      get<Record<string, unknown>>('dialog/message/mark', {
        dialogId: input.dialogId,
        type: 'read',
        ...(input.afterMessageId != null ? { afterMessageId: input.afterMessageId } : {}),
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: dialogKeys.list() });
      const previous = queryClient.getQueryData<DialogView[]>(dialogKeys.list());
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) =>
        (old ?? []).map((d) =>
          d.id === vars.dialogId ? { ...d, unreadCount: 0, mentionCount: 0 } : d,
        ),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(dialogKeys.list(), ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.unread() });
    },
  });
}

/**
 * `GET dialog/message/read`：已读至 `messageId`（可空=全部）；写入 read 表并清未读。
 * 打开会话 / 跟读最新消息时用；显式「标记已读」仍可用 `useMarkDialogRead`。
 */
export function useReadDialogMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; messageId?: number }) =>
      get<void>('dialog/message/read', {
        dialogId: input.dialogId,
        ...(input.messageId != null && input.messageId > 0 ? { messageId: input.messageId } : {}),
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: dialogKeys.list() });
      const previous = queryClient.getQueryData<DialogView[]>(dialogKeys.list());
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) =>
        (old ?? []).map((d) =>
          d.id === vars.dialogId ? { ...d, unreadCount: 0, mentionCount: 0 } : d,
        ),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(dialogKeys.list(), ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.unread() });
    },
  });
}

export type DialogUnreadItem = {
  dialogId: number;
  unreadCount: number;
  mentionCount: number;
  mentionIds: number[];
  lastReadMessageId: number;
};

/** `GET dialog/message/unread`：未读会话快照（含 lastReadMessageId） */
export function useDialogUnreadList(enabled = true) {
  return useQuery({
    queryKey: dialogKeys.unread(),
    queryFn: async () => {
      const raw = await get<DialogUnreadItem[]>('dialog/message/unread');
      return (Array.isArray(raw) ? raw : []).map((row) => ({
        dialogId: Number(row.dialogId) || 0,
        unreadCount: Number(row.unreadCount) || 0,
        mentionCount: Number(row.mentionCount) || 0,
        mentionIds: Array.isArray(row.mentionIds)
          ? row.mentionIds.map((id) => Number(id)).filter((n) => Number.isFinite(n))
          : [],
        lastReadMessageId: Number(row.lastReadMessageId) || 0,
      }));
    },
    enabled,
    staleTime: 10_000,
  });
}

/** `GET dialog/message/dot`：清除当前用户对消息的红点（语音等轻提示） */
export function useClearDialogMessageDot() {
  return useMutation({
    mutationFn: (messageId: number) =>
      get<{ messageId: number; dot: number }>('dialog/message/dot', { messageId }),
  });
}

/** `POST dialog/message/stream`：通知指定用户监听流式消息（WS `dialog.message.stream`） */
export function useNotifyDialogMessageStream() {
  return useMutation({
    mutationFn: (input: { userId: number; streamUrl: string; source?: string }) =>
      post<void>('dialog/message/stream', undefined, {
        config: {
          params: {
            userId: input.userId,
            streamUrl: input.streamUrl,
            ...(input.source?.trim() ? { source: input.source.trim() } : {}),
          },
        },
      }),
  });
}

/** 对话侧 AI 会话（`dialog/session/*`）；`sessionId` 即后端 session_key */
export type DialogSessionView = {
  dialogId: number;
  sessionId: string;
  title: string;
  isCurrent: number;
  createdAt: string | null;
  updatedAt: string | null;
};

function asDialogSession(raw: Record<string, unknown> | DialogSessionView): DialogSessionView {
  const row = raw as Record<string, unknown>;
  return {
    dialogId: Number(row.dialogId) || 0,
    sessionId: String(row.sessionId ?? ''),
    title: String(row.title ?? ''),
    isCurrent: Number(row.isCurrent) || 0,
    createdAt: row.createdAt != null ? String(row.createdAt) : null,
    updatedAt: row.updatedAt != null ? String(row.updatedAt) : null,
  };
}

/** `GET dialog/session/list`：当前用户在该对话下的 AI 会话列表 */
export function useDialogSessionList(dialogId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: dialogKeys.sessions(dialogId ?? 0),
    queryFn: async () => {
      const raw = await get<DialogSessionView[]>('dialog/session/list', { dialogId });
      return (Array.isArray(raw) ? raw : []).map((row) =>
        asDialogSession(row as unknown as Record<string, unknown>),
      );
    },
    enabled: enabled && typeof dialogId === 'number' && dialogId > 0,
    staleTime: 15_000,
  });
}

/** `GET dialog/session/create`：新建 AI 会话并设为当前 */
export function useCreateDialogSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; title?: string }) =>
      get<DialogSessionView>('dialog/session/create', {
        dialogId: input.dialogId,
        ...(input.title?.trim() ? { title: input.title.trim() } : {}),
      }).then((raw) => asDialogSession(raw as unknown as Record<string, unknown>)),
    onSuccess: (session) => {
      queryClient.setQueryData<DialogSessionView[]>(
        dialogKeys.sessions(session.dialogId),
        (old) => {
          const next = (old ?? []).map((s) => ({ ...s, isCurrent: 0 }));
          return [
            { ...session, isCurrent: 1 },
            ...next.filter((s) => s.sessionId !== session.sessionId),
          ];
        },
      );
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.sessions(vars.dialogId) });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

/** `GET dialog/session/open`：切换当前 AI 会话 */
export function useOpenDialogSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; sessionId: string }) =>
      get<DialogSessionView>('dialog/session/open', {
        dialogId: input.dialogId,
        sessionId: input.sessionId,
      }).then((raw) => asDialogSession(raw as unknown as Record<string, unknown>)),
    onSuccess: (session) => {
      queryClient.setQueryData<DialogSessionView[]>(dialogKeys.sessions(session.dialogId), (old) =>
        (old ?? []).map((s) =>
          s.sessionId === session.sessionId ? { ...session, isCurrent: 1 } : { ...s, isCurrent: 0 },
        ),
      );
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.sessions(vars.dialogId) });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

/** `POST dialog/session/rename`：重命名 AI 会话 */
export function useRenameDialogSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; sessionId: string; title: string }) =>
      post<DialogSessionView>('dialog/session/rename', undefined, {
        config: {
          params: {
            dialogId: input.dialogId,
            sessionId: input.sessionId,
            title: input.title.trim(),
          },
        },
      }).then((raw) => asDialogSession(raw as unknown as Record<string, unknown>)),
    onSuccess: (session) => {
      queryClient.setQueryData<DialogSessionView[]>(dialogKeys.sessions(session.dialogId), (old) =>
        (old ?? []).map((s) => (s.sessionId === session.sessionId ? { ...s, ...session } : s)),
      );
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.sessions(vars.dialogId) });
    },
  });
}

/** `GET dialog/group/add`：新建普通群（userIds 逗号分隔，含自己至少 2 人） */
export function useCreateDialogGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { chatName?: string; userIds: number[]; avatar?: string }) =>
      get<DialogView>('dialog/group/add', {
        userIds: input.userIds.join(','),
        ...(input.chatName?.trim() ? { chatName: input.chatName.trim() } : {}),
        ...(input.avatar?.trim() ? { avatar: input.avatar.trim() } : {}),
      }),
    onSuccess: (dialog) => {
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) => {
        if (!old) return [dialog];
        if (old.some((d) => d.id === dialog.id)) {
          return old.map((d) => (d.id === dialog.id ? dialog : d));
        }
        return [dialog, ...old];
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

function invalidateDialogMembers(queryClient: ReturnType<typeof useQueryClient>, dialogId: number) {
  void queryClient.invalidateQueries({ queryKey: [...dialogKeys.detail(dialogId), 'members'] });
  void queryClient.invalidateQueries({ queryKey: [...dialogKeys.detail(dialogId), 'deputies'] });
  void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
}

/** `GET dialog/group/deputies`：普通群管理员 userId 列表 */
export function useDialogGroupDeputies(dialogId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: [...dialogKeys.detail(dialogId ?? 0), 'deputies'] as const,
    queryFn: () => get<number[]>('dialog/group/deputies', { dialogId }),
    enabled: enabled && typeof dialogId === 'number' && dialogId > 0,
    staleTime: 30_000,
  });
}

/** `GET dialog/group/addDeputy`：任命管理员（仅群主） */
export function useAddDialogGroupDeputy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; userId: number }) =>
      get<number[]>('dialog/group/addDeputy', {
        dialogId: input.dialogId,
        userId: input.userId,
      }),
    onSuccess: (deputies, vars) => {
      queryClient.setQueryData([...dialogKeys.detail(vars.dialogId), 'deputies'], deputies);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({
        queryKey: [...dialogKeys.detail(vars.dialogId), 'deputies'],
      });
    },
  });
}

/** `GET dialog/group/deleteDeputy`：罢免管理员（仅群主） */
export function useDeleteDialogGroupDeputy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; userId: number }) =>
      get<number[]>('dialog/group/deleteDeputy', {
        dialogId: input.dialogId,
        userId: input.userId,
      }),
    onSuccess: (deputies, vars) => {
      queryClient.setQueryData([...dialogKeys.detail(vars.dialogId), 'deputies'], deputies);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({
        queryKey: [...dialogKeys.detail(vars.dialogId), 'deputies'],
      });
    },
  });
}

/** `GET dialog/group/edit`：改名 / 头像（群主或管理员） */
export function useEditDialogGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; chatName?: string; avatar?: string }) =>
      get<DialogView>('dialog/group/edit', {
        dialogId: input.dialogId,
        ...(input.chatName !== undefined ? { chatName: input.chatName } : {}),
        ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
      }),
    onSuccess: (dialog) => {
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) => {
        if (!old) return [dialog];
        return old.map((d) => (d.id === dialog.id ? { ...d, ...dialog } : d));
      });
    },
    onSettled: (_d, _e, vars) => {
      invalidateDialogMembers(queryClient, vars.dialogId);
    },
  });
}

/** `GET dialog/group/addUser`：加人 */
export function useAddDialogGroupUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; userIds: number[] }) =>
      get<number[]>('dialog/group/addUser', {
        dialogId: input.dialogId,
        userIds: input.userIds.join(','),
      }),
    onSuccess: (members, vars) => {
      queryClient.setQueryData([...dialogKeys.detail(vars.dialogId), 'members'], members);
    },
    onSettled: (_d, _e, vars) => {
      invalidateDialogMembers(queryClient, vars.dialogId);
    },
  });
}

/** `GET dialog/group/deleteUser`：踢人，或 `userIds=自己` 退出（群主不可直接退） */
export function useRemoveDialogGroupUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; userIds: number[] }) =>
      get<number[]>('dialog/group/deleteUser', {
        dialogId: input.dialogId,
        userIds: input.userIds.join(','),
      }),
    onSuccess: (members, vars) => {
      queryClient.setQueryData([...dialogKeys.detail(vars.dialogId), 'members'], members);
    },
    onSettled: (_d, _e, vars) => {
      invalidateDialogMembers(queryClient, vars.dialogId);
    },
  });
}

/** `GET dialog/group/transfer`：转让群主 */
export function useTransferDialogGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; userId: number }) =>
      get<DialogView>('dialog/group/transfer', {
        dialogId: input.dialogId,
        userId: input.userId,
      }),
    onSuccess: (dialog) => {
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) => {
        if (!old) return [dialog];
        return old.map((d) => (d.id === dialog.id ? { ...d, ...dialog } : d));
      });
    },
    onSettled: (_d, _e, vars) => {
      invalidateDialogMembers(queryClient, vars.dialogId);
    },
  });
}

/** `GET dialog/group/disband`：解散（仅群主） */
export function useDisbandDialogGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dialogId: number) => get<void>('dialog/group/disband', { dialogId }),
    onSuccess: (_void, dialogId) => {
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) =>
        (old ?? []).filter((d) => d.id !== dialogId),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

/** `GET dialog/group/searchUser`：系统管理员按群名搜普通个人群（最多 20；空 key=最近活跃） */
export function useDialogGroupSearchUser(key: string, enabled = true) {
  const q = key.trim().slice(0, 64);
  return useQuery({
    queryKey: dialogKeys.groupSearchUser(q),
    queryFn: async () => {
      const raw = await get<{ list?: DialogView[] }>('dialog/group/searchUser', {
        ...(q ? { key: q } : {}),
      });
      return Array.isArray(raw?.list) ? raw.list : [];
    },
    enabled,
    staleTime: 15_000,
  });
}

/** `GET dialog/top`：置顶 / 取消置顶 */
export function useToggleDialogTop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; isTop: 0 | 1 }) =>
      get<DialogView>('dialog/top', {
        dialogId: input.dialogId,
        isTop: input.isTop,
      }),
    onSuccess: (dialog) => {
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) => {
        if (!old) return [dialog];
        return old.map((d) => (d.id === dialog.id ? { ...d, ...dialog } : d));
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

export type DialogConfigView = {
  dialogId: number;
  isMuted: number;
  isTop: number;
  isHidden: number;
  tag: string;
  isChatMuted: number;
  color: string;
};

function asDialogConfig(raw: Record<string, unknown>): DialogConfigView {
  return {
    dialogId: Number(raw.dialogId) || 0,
    isMuted: Number(raw.isMuted) || 0,
    isTop: Number(raw.isTop) || 0,
    isHidden: Number(raw.isHidden) || 0,
    tag: String(raw.tag ?? ''),
    isChatMuted: Number(raw.isChatMuted) || 0,
    color: String(raw.color ?? ''),
  };
}

/** `GET dialog/config`：个人免打扰 / 置顶 / 隐藏等 */
export function useDialogConfig(dialogId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: [...dialogKeys.detail(dialogId ?? 0), 'config'] as const,
    queryFn: async () =>
      asDialogConfig(await get<Record<string, unknown>>('dialog/config', { dialogId })),
    enabled: enabled && typeof dialogId === 'number' && dialogId > 0,
    staleTime: 30_000,
  });
}

/** `GET dialog/message/silence`：免打扰开关（isSilent 1/0） */
export function useToggleDialogMute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; isSilent: 0 | 1 }) =>
      get<Record<string, unknown>>('dialog/message/silence', {
        dialogId: input.dialogId,
        isSilent: input.isSilent,
      }).then(asDialogConfig),
    onSuccess: (cfg) => {
      queryClient.setQueryData([...dialogKeys.detail(cfg.dialogId), 'config'], cfg);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({
        queryKey: [...dialogKeys.detail(vars.dialogId), 'config'],
      });
    },
  });
}

/** `POST dialog/config/save`：群禁言（isChatMuted 1/0；仅群主/管理员） */
export function useToggleDialogChatMute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; isChatMuted: 0 | 1 }) =>
      post<Record<string, unknown>>('dialog/config/save', undefined, {
        config: {
          params: {
            dialogId: input.dialogId,
            isChatMuted: input.isChatMuted,
          },
        },
      }).then(asDialogConfig),
    onSuccess: (cfg) => {
      queryClient.setQueryData([...dialogKeys.detail(cfg.dialogId), 'config'], cfg);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({
        queryKey: [...dialogKeys.detail(vars.dialogId), 'config'],
      });
    },
  });
}

/** `POST dialog/config/save`：个人会话标签（空串清除） */
export function useSaveDialogTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; tag: string }) =>
      post<Record<string, unknown>>('dialog/config/save', undefined, {
        config: {
          params: {
            dialogId: input.dialogId,
            tag: input.tag,
          },
        },
      }).then(asDialogConfig),
    onSuccess: (cfg) => {
      queryClient.setQueryData([...dialogKeys.detail(cfg.dialogId), 'config'], cfg);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({
        queryKey: [...dialogKeys.detail(vars.dialogId), 'config'],
      });
      void queryClient.invalidateQueries({ queryKey: [...dialogKeys.all(), 'searchTag'] });
    },
  });
}

/** `GET dialog/message/color`：个人会话色（空串清除） */
export function useSetDialogColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; color: string }) =>
      get<Record<string, unknown>>('dialog/message/color', {
        dialogId: input.dialogId,
        color: input.color,
      }).then(asDialogConfig),
    onSuccess: (cfg) => {
      queryClient.setQueryData([...dialogKeys.detail(cfg.dialogId), 'config'], cfg);
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) =>
        (old ?? []).map((d) => (d.id === cfg.dialogId ? { ...d, color: cfg.color } : d)),
      );
      queryClient.setQueryData<DialogView[]>(dialogKeys.beyond(), (old) =>
        (old ?? []).map((d) => (d.id === cfg.dialogId ? { ...d, color: cfg.color } : d)),
      );
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({
        queryKey: [...dialogKeys.detail(vars.dialogId), 'config'],
      });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

export type DialogMessageTodoView = {
  id: number;
  messageId: number;
  dialogId: number;
  userId: number;
  remindAt: string | null;
  doneAt: string | null;
  createdAt: string | null;
};

export function asDialogMessageTodo(raw: Record<string, unknown>): DialogMessageTodoView {
  return {
    id: Number(raw.id) || 0,
    messageId: Number(raw.messageId) || 0,
    dialogId: Number(raw.dialogId) || 0,
    userId: Number(raw.userId) || 0,
    remindAt: raw.remindAt == null ? null : String(raw.remindAt),
    doneAt: raw.doneAt == null ? null : String(raw.doneAt),
    createdAt: raw.createdAt == null ? null : String(raw.createdAt),
  };
}

function asTodoList(raw: unknown): DialogMessageTodoView[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map(asDialogMessageTodo);
}

/** `GET dialog/message/todoList`：消息待办；`dialogId` 省略=当前用户全部 */
export function useDialogMessageTodos(
  dialogId?: number | null,
  includeDone = false,
  enabled = true,
) {
  const scoped = typeof dialogId === 'number' && dialogId > 0;
  return useQuery({
    queryKey: [...dialogKeys.todos(scoped ? dialogId : 'all'), includeDone ? 1 : 0] as const,
    queryFn: async () =>
      asTodoList(
        await get<unknown>('dialog/message/todoList', {
          ...(scoped ? { dialogId } : {}),
          includeDone: includeDone ? 1 : 0,
        }),
      ),
    enabled,
    staleTime: 15_000,
  });
}

function invalidateMessageTodos(queryClient: QueryClient, dialogId?: number) {
  void queryClient.invalidateQueries({ queryKey: [...dialogKeys.all(), 'todos'] });
  if (dialogId && dialogId > 0) {
    void queryClient.invalidateQueries({ queryKey: dialogKeys.todos(dialogId) });
  }
}

/** `GET dialog/message/todo`：设待办 / 取消（cancel=1） */
export function useToggleDialogMessageTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { messageId: number; dialogId: number; cancel?: boolean }) => {
      const raw = await get<Record<string, unknown> | null>('dialog/message/todo', {
        messageId: input.messageId,
        cancel: input.cancel ? 1 : 0,
      });
      return raw ? asDialogMessageTodo(raw) : null;
    },
    onSettled: (_d, _e, vars) => {
      invalidateMessageTodos(queryClient, vars.dialogId);
    },
  });
}

/** `GET dialog/message/done`：完成待办 */
export function useDoneDialogMessageTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { messageId: number; dialogId: number }) =>
      asDialogMessageTodo(
        await get<Record<string, unknown>>('dialog/message/done', {
          messageId: input.messageId,
        }),
      ),
    onSettled: (_d, _e, vars) => {
      invalidateMessageTodos(queryClient, vars.dialogId);
    },
  });
}

/** `POST dialog/message/todoRemind`：设置/清除提醒（remindAt 空=清除） */
export function useSetDialogMessageTodoRemind() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { messageId: number; dialogId: number; remindAt?: string | null }) =>
      asDialogMessageTodo(
        await post<Record<string, unknown>>('dialog/message/todoRemind', undefined, {
          config: {
            params: {
              messageId: input.messageId,
              ...(input.remindAt ? { remindAt: input.remindAt } : { remindAt: '' }),
            },
          },
        }),
      ),
    onSuccess: (todo, vars) => {
      queryClient.setQueryData<DialogMessageTodoView[]>(
        [...dialogKeys.todos(vars.dialogId), 0],
        (old) => {
          if (!old) return todo.doneAt ? [] : [todo];
          const next = old.filter((t) => t.messageId !== todo.messageId);
          if (todo.doneAt) return next;
          return [...next, todo];
        },
      );
    },
    onSettled: (_d, _e, vars) => {
      invalidateMessageTodos(queryClient, vars.dialogId);
    },
  });
}

/** `GET dialog/hide`：隐藏 / 恢复会话（isHidden 默认 1；0=恢复） */
export function useHideDialog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { dialogId: number; isHidden?: 0 | 1 }) =>
      get<void>('dialog/hide', {
        dialogId: input.dialogId,
        isHidden: input.isHidden ?? 1,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: dialogKeys.list() });
      await queryClient.cancelQueries({ queryKey: dialogKeys.beyond() });
      const previousList = queryClient.getQueryData<DialogView[]>(dialogKeys.list());
      const previousBeyond = queryClient.getQueryData<DialogView[]>(dialogKeys.beyond());
      const hide = (input.isHidden ?? 1) === 1;
      if (hide) {
        queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) =>
          (old ?? []).filter((d) => d.id !== input.dialogId),
        );
      }
      return { previousList, previousBeyond };
    },
    onError: (_e, _input, ctx) => {
      if (ctx?.previousList) queryClient.setQueryData(dialogKeys.list(), ctx.previousList);
      if (ctx?.previousBeyond) queryClient.setQueryData(dialogKeys.beyond(), ctx.previousBeyond);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.beyond() });
    },
  });
}

/** `GET dialog/message/mark` type=unread：标记未读 */
export function useMarkDialogUnread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dialogId: number) =>
      get<Record<string, unknown>>('dialog/message/mark', {
        dialogId,
        type: 'unread',
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

/** `GET dialog/open/user`：打开/创建与对方的单聊 */
export function useOpenDialogUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => get<DialogView>('dialog/open/user', { userId }),
    onSuccess: (dialog) => {
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) => {
        if (!old) return [dialog];
        if (old.some((d) => d.id === dialog.id)) {
          return old.map((d) => (d.id === dialog.id ? { ...d, ...dialog } : d));
        }
        return [dialog, ...old];
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

/**
 * `GET dialog/open/event`：打开会话并触发 bot `dialogOpen` webhook
 *（内部等同 `dialog/one`，含 afterDialogOpen）
 */
export function useOpenDialogEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dialogId: number) => get<DialogView>('dialog/open/event', { dialogId }),
    onSuccess: (dialog) => {
      queryClient.setQueryData<DialogView[]>(dialogKeys.list(), (old) => {
        if (!old) return [dialog];
        if (old.some((d) => d.id === dialog.id)) {
          return old.map((d) => (d.id === dialog.id ? { ...d, ...dialog } : d));
        }
        return [dialog, ...old];
      });
    },
    onSettled: (_d, _e, dialogId) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(dialogId) });
    },
  });
}

export type DialogTelephoneView = {
  telephone: string;
  /** 查看成功后写入会话的 notice（审计） */
  add: DialogMessageView | null;
};

/** `GET dialog/telephone`：查看单聊对方电话（会写入 notice；临时账号不可用） */
export function useDialogTelephone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dialogId: number) => get<DialogTelephoneView>('dialog/telephone', { dialogId }),
    onSuccess: (view, dialogId) => {
      const notice = view?.add;
      if (notice && notice.dialogId > 0) {
        queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(dialogId), (old) => {
          if (!old) return [notice];
          if (old.some((m) => m.id === notice.id)) return old;
          return [...old, notice];
        });
      }
    },
    onSettled: (_d, _e, dialogId) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(dialogId) });
    },
  });
}

function patchDialogMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  dialogId: number,
  msg: DialogMessageView,
) {
  queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(dialogId), (old) => {
    if (!old) return [msg];
    if (old.some((m) => m.id === msg.id)) {
      return old.map((m) => (m.id === msg.id ? msg : m));
    }
    return [...old, msg];
  });
}

export type DialogVoteInput =
  | { action: 'create'; dialogId: number; title: string; options: string[] }
  | { action: 'cast'; messageId: number; dialogId: number; optionIndex: number }
  | { action: 'end'; messageId: number; dialogId: number };

/** `POST dialog/message/vote`：发起 / 投票 / 结束 */
export function useDialogVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DialogVoteInput) => {
      if (input.action === 'create') {
        return post<DialogMessageView>('dialog/message/vote', undefined, {
          config: {
            params: {
              dialogId: input.dialogId,
              title: input.title,
              options: input.options.join(','),
            },
          },
        });
      }
      if (input.action === 'cast') {
        return post<DialogMessageView>('dialog/message/vote', undefined, {
          config: {
            params: {
              messageId: input.messageId,
              option: String(input.optionIndex),
            },
          },
        });
      }
      return post<DialogMessageView>('dialog/message/vote', undefined, {
        config: {
          params: { messageId: input.messageId, end: true },
        },
      });
    },
    onSuccess: (msg) => {
      patchDialogMessage(queryClient, msg.dialogId, msg);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

export type DialogWordChainInput =
  | { action: 'create'; dialogId: number; title: string }
  | { action: 'join'; messageId: number; dialogId: number; text: string }
  | { action: 'stop'; messageId: number; dialogId: number };

/** `POST dialog/message/wordChain`：发起 / 接龙 / 停止 */
export function useDialogWordChain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DialogWordChainInput) => {
      if (input.action === 'create') {
        return post<DialogMessageView>('dialog/message/wordChain', undefined, {
          config: {
            params: { dialogId: input.dialogId, title: input.title },
          },
        });
      }
      if (input.action === 'join') {
        return post<DialogMessageView>('dialog/message/wordChain', undefined, {
          config: {
            params: { messageId: input.messageId, text: input.text },
          },
        });
      }
      return post<DialogMessageView>('dialog/message/wordChain', undefined, {
        config: {
          params: { messageId: input.messageId, stop: true },
        },
      });
    },
    onSuccess: (msg) => {
      patchDialogMessage(queryClient, msg.dialogId, msg);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

/** `GET dialog/message/withdraw`：撤回自己的消息（软删；受系统时限约束） */
export function useWithdrawDialogMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { messageId: number; dialogId: number }) =>
      get<void>('dialog/message/withdraw', { messageId: input.messageId }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
      const previous = queryClient.getQueryData<DialogMessageView[]>(
        dialogKeys.messages(vars.dialogId),
      );
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (old) =>
        (old ?? []).filter((m) => m.id !== vars.messageId),
      );
      return { previous };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(dialogKeys.messages(vars.dialogId), ctx.previous);
      }
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

export type DialogMessageReadListView = {
  messageId: number;
  reads: number[];
  unreads: number[];
};

export type DialogMessageEmojiView = {
  symbol: string;
  userIds: number[];
  firstAt: string | null;
};

export function asDialogMessageEmoji(raw: Record<string, unknown>): DialogMessageEmojiView {
  const userIdsRaw = raw.userIds;
  const userIds = Array.isArray(userIdsRaw)
    ? userIdsRaw.map((x) => Number(x) || 0).filter((n) => n > 0)
    : [];
  return {
    symbol: String(raw.symbol ?? ''),
    userIds,
    firstAt: raw.firstAt == null ? null : String(raw.firstAt),
  };
}

/** `GET dialog/message/emojiMap`：批量表情；→ Map<messageId, emojis> */
export function useDialogMessageEmojiMap(
  dialogId: number | undefined,
  messageIds: number[],
  enabled = true,
) {
  const ids = [...new Set(messageIds.filter((id) => id > 0))].sort((a, b) => a - b);
  const idsKey = ids.join(',');
  return useQuery({
    queryKey: dialogKeys.emojiMap(dialogId ?? 0, idsKey),
    queryFn: async () => {
      const raw = await get<unknown>('dialog/message/emojiMap', { messageIds: idsKey });
      const map = new Map<number, DialogMessageEmojiView[]>();
      if (!Array.isArray(raw)) return map;
      for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const messageId = Number(row.messageId) || 0;
        if (messageId <= 0) continue;
        const emojisRaw = row.emojis;
        const emojis = Array.isArray(emojisRaw)
          ? emojisRaw
              .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
              .map(asDialogMessageEmoji)
              .filter((e) => e.symbol)
          : [];
        map.set(messageId, emojis);
      }
      return map;
    },
    enabled: enabled && typeof dialogId === 'number' && dialogId > 0 && ids.length > 0,
    staleTime: 15_000,
  });
}

/** `GET dialog/message/emoji`：表情回复 / 取消 */
export function useToggleDialogMessageEmoji() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      messageId: number;
      dialogId: number;
      symbol: string;
      cancel?: boolean;
    }) => {
      const raw = await get<unknown>('dialog/message/emoji', {
        messageId: input.messageId,
        symbol: input.symbol,
        cancel: input.cancel ? 1 : 0,
      });
      const emojis = Array.isArray(raw)
        ? raw
            .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
            .map(asDialogMessageEmoji)
            .filter((e) => e.symbol)
        : [];
      return emojis;
    },
    onSuccess: (emojis, vars) => {
      queryClient.setQueriesData<Map<number, DialogMessageEmojiView[]>>(
        { queryKey: [...dialogKeys.all(), 'emojiMap', vars.dialogId] },
        (old) => {
          const next = new Map(old ?? []);
          next.set(vars.messageId, emojis);
          return next;
        },
      );
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({
        queryKey: [...dialogKeys.all(), 'emojiMap', vars.dialogId],
      });
    },
  });
}

/** `GET dialog/message/topInfo`：会话内置顶消息 */
export function useDialogMessageTops(dialogId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: dialogKeys.tops(dialogId ?? 0),
    queryFn: () => get<DialogMessageView[]>('dialog/message/topInfo', { dialogId }),
    enabled: enabled && typeof dialogId === 'number' && dialogId > 0,
    staleTime: 15_000,
  });
}

/** `GET dialog/message/top`：消息置顶 / 取消 */
export function useToggleDialogMessageTop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { messageId: number; dialogId: number; cancel?: boolean }) =>
      get<DialogMessageView[]>('dialog/message/top', {
        messageId: input.messageId,
        cancel: input.cancel ? 1 : 0,
      }),
    onSuccess: (tops, vars) => {
      queryClient.setQueryData(dialogKeys.tops(vars.dialogId), tops);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.tops(vars.dialogId) });
    },
  });
}

/** `GET dialog/message/translation` 响应 */
export type DialogMessageTranslationView = {
  messageId: number;
  language: string;
  content: string;
};

/** `GET dialog/message/translation`：按需拉取（enabled 控制） */
export function useDialogMessageTranslation(
  messageId: number | undefined,
  language: string,
  enabled = false,
) {
  return useQuery({
    queryKey: dialogKeys.translation(messageId ?? 0, language),
    queryFn: () =>
      get<DialogMessageTranslationView>('dialog/message/translation', {
        messageId,
        language,
      }),
    enabled: enabled && typeof messageId === 'number' && messageId > 0 && Boolean(language),
    staleTime: 60_000,
  });
}

/** `GET dialog/message/translation`：翻译 / 强制刷新 */
export function useTranslateDialogMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { messageId: number; language: string; force?: boolean }) =>
      get<DialogMessageTranslationView>('dialog/message/translation', {
        messageId: input.messageId,
        language: input.language,
        force: input.force ? 1 : 0,
      }),
    onSuccess: (data, vars) => {
      queryClient.setQueryData(dialogKeys.translation(vars.messageId, vars.language), data);
    },
  });
}

/** `GET dialog/message/forward`：逐条转发到多个会话 */
export function useForwardDialogMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { messageIds: number[]; dialogIds: number[] }) =>
      get<DialogMessageView[]>('dialog/message/forward', {
        messageIds: input.messageIds.join(','),
        dialogIds: input.dialogIds.join(','),
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      for (const id of vars.dialogIds) {
        void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(id) });
      }
    },
  });
}

/** `GET dialog/message/mergeForward`：多条合并转发到单会话 */
export function useMergeForwardDialogMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { messageIds: number[]; dialogId: number }) =>
      get<DialogMessageView>('dialog/message/mergeForward', {
        messageIds: input.messageIds.join(','),
        dialogId: input.dialogId,
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

/** `GET dialog/message/mergeDetail`：合并转发内嵌消息列表 */
export function useDialogMessageMergeDetail(messageId: number | undefined, enabled = false) {
  return useQuery({
    queryKey: dialogKeys.mergeDetail(messageId ?? 0),
    queryFn: async () => {
      const raw = await get<{ messages?: DialogMessageView[] }>('dialog/message/mergeDetail', {
        messageId,
      });
      return Array.isArray(raw?.messages) ? raw.messages : [];
    },
    enabled: enabled && typeof messageId === 'number' && messageId > 0,
    staleTime: 60_000,
  });
}

export type DialogMessageTagView = {
  messageId: number;
  tag: number;
  add: DialogMessageView | null;
};

function asDialogMessageTagResult(raw: Record<string, unknown>): DialogMessageTagView {
  const addRaw = raw.add;
  return {
    messageId: Number(raw.messageId) || 0,
    tag: Number(raw.tag) || 0,
    add:
      addRaw && typeof addRaw === 'object'
        ? {
            id: Number((addRaw as Record<string, unknown>).id) || 0,
            dialogId: Number((addRaw as Record<string, unknown>).dialogId) || 0,
            userId: Number((addRaw as Record<string, unknown>).userId) || 0,
            type: String((addRaw as Record<string, unknown>).type ?? 'tag'),
            body: String((addRaw as Record<string, unknown>).body ?? ''),
            replyId: Number((addRaw as Record<string, unknown>).replyId) || 0,
            tagUserId: Number((addRaw as Record<string, unknown>).tagUserId) || 0,
            createdAt:
              (addRaw as Record<string, unknown>).createdAt == null
                ? null
                : String((addRaw as Record<string, unknown>).createdAt),
          }
        : null,
  };
}

/** `GET dialog/message/tag`：消息标注切换（tag=标注者 userId，0=取消） */
export function useToggleDialogMessageTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { messageId: number; dialogId: number }) =>
      asDialogMessageTagResult(
        await get<Record<string, unknown>>('dialog/message/tag', {
          messageId: input.messageId,
        }),
      ),
    onSuccess: (result, vars) => {
      queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(vars.dialogId), (old) => {
        let next = (old ?? []).map((m) =>
          m.id === result.messageId ? { ...m, tagUserId: result.tag } : m,
        );
        if (result.add && !next.some((m) => m.id === result.add!.id)) {
          next = [...next, result.add];
        }
        return next;
      });
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
    },
  });
}

export type ToggleDialogMessageCheckedInput = {
  dialogId: number;
  messageId: number;
  index: number;
  checked: 0 | 1;
};

/** `GET dialog/message/checked`：切换本人文本消息中第 index 个 `<li>` 勾选 */
export function useToggleDialogMessageChecked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ToggleDialogMessageCheckedInput) =>
      get<DialogMessageView>('dialog/message/checked', {
        dialogId: input.dialogId,
        messageId: input.messageId,
        index: input.index,
        checked: input.checked,
      }),
    onSuccess: (msg) => {
      patchDialogMessage(queryClient, msg.dialogId, msg);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
    },
  });
}

/** `GET dialog/message/one`：单条消息（含 dialogId） */
export function fetchDialogMessage(messageId: number) {
  return get<DialogMessageView>('dialog/message/one', { messageId });
}

/** `dialog/message/detail` 附带的网盘元数据（type=file/image） */
export type DialogMessageFileMeta = {
  id: number;
  name: string;
  type: string;
  extension: string;
  size: number;
  path: string;
  userId: number;
};

/** `GET dialog/message/detail` 完整响应 */
export type DialogMessageDetailView = {
  id: number;
  dialogId: number;
  userId: number;
  type: string;
  body: string;
  replyId: number;
  createdAt: string | null;
  updatedAt: string | null;
  file: DialogMessageFileMeta | null;
};

function asDialogMessageFileMeta(raw: unknown): DialogMessageFileMeta | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const id = Number(row.id) || 0;
  if (id <= 0) return null;
  return {
    id,
    name: String(row.name ?? ''),
    type: String(row.type ?? ''),
    extension: String(row.extension ?? ''),
    size: Number(row.size) || 0,
    path: String(row.path ?? ''),
    userId: Number(row.userId) || 0,
  };
}

export function asDialogMessageDetail(
  raw: Record<string, unknown> | DialogMessageDetailView,
): DialogMessageDetailView {
  const row = raw as Record<string, unknown>;
  return {
    id: Number(row.id) || 0,
    dialogId: Number(row.dialogId) || 0,
    userId: Number(row.userId) || 0,
    type: String(row.type ?? ''),
    body: String(row.body ?? ''),
    replyId: Number(row.replyId) || 0,
    createdAt: row.createdAt != null ? String(row.createdAt) : null,
    updatedAt: row.updatedAt != null ? String(row.updatedAt) : null,
    file: asDialogMessageFileMeta(row.file),
  };
}

/** `GET dialog/message/detail`：消息详情；file/image 附带网盘元数据 */
export function useDialogMessageDetail(messageId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: dialogKeys.messageDetail(messageId ?? 0),
    queryFn: async () => {
      const raw = await get<Record<string, unknown>>('dialog/message/detail', { messageId });
      return asDialogMessageDetail(raw);
    },
    enabled: enabled && typeof messageId === 'number' && messageId > 0,
    staleTime: 60_000,
  });
}

/**
 * `GET dialog/message/download`：会话成员鉴权拉附件二进制（图片预览）。
 * 无本地流时服务端可能回信封 JSON，此时抛错（勿改用 file/raw：仅文件所有者可读）。
 */
export async function fetchDialogMessageBlob(messageId: number): Promise<Blob> {
  const res = await http.get<Blob>('dialog/message/download', {
    params: { messageId, down: 'yes' },
    responseType: 'blob',
    timeout: 120_000,
  });
  const blob = res.data;
  const headerType = String(res.headers['content-type'] ?? '');
  const looksJson =
    headerType.includes('application/json') ||
    (blob.type.includes('json') && blob.size > 0 && blob.size < 8192);
  if (looksJson) {
    const text = await blob.text();
    let parsed: { code?: number; message?: string } = {};
    try {
      parsed = JSON.parse(text) as { code?: number; message?: string };
    } catch {
      throw new ApiError(-1, 'invalid download response');
    }
    if (typeof parsed.code === 'number' && parsed.code !== 0) {
      throw new ApiError(parsed.code, parsed.message ?? 'download failed', parsed);
    }
    throw new ApiError(-1, parsed.message || 'preview unavailable', parsed);
  }
  return blob;
}

/** 消息附件 blob（按 messageId；会话成员可用） */
export function useDialogMessageBlob(messageId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: dialogKeys.messageBlob(messageId ?? 0),
    queryFn: () => fetchDialogMessageBlob(messageId!),
    enabled: enabled && typeof messageId === 'number' && messageId > 0,
    staleTime: 60_000,
  });
}

/** `GET dialog/message/readList`：单条消息谁已读 / 未读 */
export function useDialogMessageReadList(messageId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: dialogKeys.readList(messageId ?? 0),
    queryFn: () => get<DialogMessageReadListView>('dialog/message/readList', { messageId }),
    enabled: enabled && typeof messageId === 'number' && messageId > 0,
    staleTime: 15_000,
  });
}
