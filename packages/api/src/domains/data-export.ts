import { useMutation, useQuery } from '@tanstack/react-query';
import { get } from '../http-api';
import { http } from '../client';
import { ApiError } from '../errors';
import { userKeys } from './user-types';

export type ExportAccepted = {
  accepted: boolean;
  eventId: string;
};

export type TaskExportTimeType = 'taskTime' | 'createdTime';

export type ExportTaskStatsInput = {
  /** 逗号分隔用户 ID */
  userIds: string;
  /** `yyyy-MM-dd,yyyy-MM-dd` */
  time: string;
  type?: TaskExportTimeType;
};

export type ExportAttendanceInput = {
  userIds: string;
  /** `yyyy-MM-dd,yyyy-MM-dd` */
  date: string;
  /** `HH:mm,HH:mm` 班次 */
  time: string;
};

export type ExportApproveInput = {
  processName: string;
  status?: string;
  /** `yyyy-MM-dd,yyyy-MM-dd` */
  date: string;
};

export type UserSearchHit = {
  userId: number;
  email: string;
  nickname: string;
  profession: string;
  userImage: string;
  nameAz: string;
};

export type UserSearchPage = {
  list: UserSearchHit[];
  total?: number;
  page?: number;
  pageSize?: number;
};

/** 异步导出完成后的下载通道 */
export type ExportDownloadKind = 'task' | 'attendance' | 'approve';

export type ExportDownloadRef = {
  kind: ExportDownloadKind;
  key: string;
};

const EXPORT_PATH: Record<ExportDownloadKind, string> = {
  task: 'project/task/download',
  attendance: 'system/attendance/download',
  approve: 'approve/download',
};

/** 从通知文案 / Markdown 链接解析导出下载 `kind`+`key` */
export function parseExportDownloadRef(href: string): ExportDownloadRef | null {
  const raw = href.trim();
  if (!raw) return null;
  try {
    const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://local.invalid');
    let path = u.pathname.replace(/\\/g, '/');
    if (path.startsWith('/api/')) path = path.slice(4);
    path = path.replace(/^\//, '');
    const key = (u.searchParams.get('key') ?? '').trim();
    if (!key) return null;
    if (path === 'project/task/download') return { kind: 'task', key };
    if (path === 'system/attendance/download') return { kind: 'attendance', key };
    if (path === 'approve/download') return { kind: 'approve', key };
  } catch {
    return null;
  }
  return null;
}

/** 裸链接正则（机器人通知常为纯文本 URL） */
export const EXPORT_DOWNLOAD_URL_RE =
  /(?:https?:\/\/[^\s<>\]]+)?\/?(?:api\/)?(?:project\/task\/download|system\/attendance\/download|approve\/download)\?key=[A-Za-z0-9_-]+/g;

async function assertBlobNotEnvelope(blob: Blob, headerType: string): Promise<Blob> {
  const looksJson =
    headerType.includes('application/json') ||
    (blob.type.includes('json') && blob.size > 0 && blob.size < 8192);
  if (!looksJson) return blob;
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
  throw new ApiError(-1, parsed.message || 'download unavailable', parsed);
}

/** `GET …/download?key=`：鉴权拉导出 CSV（24h 票） */
export async function downloadExportFile(kind: ExportDownloadKind, key: string): Promise<Blob> {
  const path = EXPORT_PATH[kind];
  const res = await http.get<Blob>(path, {
    params: { key },
    responseType: 'blob',
    timeout: 120_000,
  });
  return assertBlobNotEnvelope(res.data, String(res.headers['content-type'] ?? ''));
}

export function useDownloadExportFile() {
  return useMutation({
    mutationFn: async (input: { kind: ExportDownloadKind; key: string }) => {
      const blob = await downloadExportFile(input.kind, input.key);
      return { blob, kind: input.kind, key: input.key };
    },
  });
}

export const dataExportKeys = {
  all: () => ['data-export'] as const,
};

export const userSearchKeys = {
  all: () => [...userKeys.all(), 'search'] as const,
  query: (key: string, take: number) => [...userSearchKeys.all(), key, take] as const,
  ai: (take: number) => [...userSearchKeys.all(), 'ai', take] as const,
};

/** 搜索会员（选人器用） */
export function useUserSearch(key: string, take = 20, enabled = true) {
  const q = key.trim();
  return useQuery({
    queryKey: userSearchKeys.query(q, take),
    queryFn: async () => {
      const data = await get<UserSearchPage | { list: UserSearchHit[] }>('users/search', {
        key: q,
        take,
        disable: 0,
      });
      return Array.isArray((data as UserSearchPage).list)
        ? (data as UserSearchPage)
        : { list: [] as UserSearchHit[] };
    },
    enabled: enabled && q.length > 0,
    staleTime: 15_000,
  });
}

/** `GET users/search/ai`：AI 系统机器人（`ai-*@bot.system`） */
export function useAiSystemBots(take = 50, enabled = true) {
  const n = Math.min(100, Math.max(1, take));
  return useQuery({
    queryKey: userSearchKeys.ai(n),
    queryFn: async () => {
      const data = await get<{ list?: UserSearchHit[] }>('users/search/ai', { take: n });
      return (data.list ?? []).filter((row) => Number(row.userId) > 0);
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useExportTaskStats() {
  return useMutation({
    mutationFn: (input: ExportTaskStatsInput) =>
      get<ExportAccepted>('project/task/export', {
        userIds: input.userIds,
        time: input.time,
        ...(input.type ? { type: input.type } : {}),
      }),
  });
}

export function useExportOverdueTasks() {
  return useMutation({
    mutationFn: () => get<ExportAccepted>('project/task/exportOverdue'),
  });
}

export function useExportAttendance() {
  return useMutation({
    mutationFn: (input: ExportAttendanceInput) =>
      get<ExportAccepted>('system/attendance/export', {
        userIds: input.userIds,
        date: input.date,
        time: input.time,
      }),
  });
}

export function useExportApprove() {
  return useMutation({
    mutationFn: (input: ExportApproveInput) =>
      get<ExportAccepted>('approve/export', {
        processName: input.processName,
        date: input.date,
        ...(input.status?.trim() ? { status: input.status.trim() } : {}),
      }),
  });
}
