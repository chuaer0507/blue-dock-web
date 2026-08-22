import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, upload } from '../http-api';
import { http } from '../client';
import { ApiCodes, ApiError } from '../errors';
import { fetchPublicKey } from '../auth/login';
import { clearPublicKeyCache, encryptPassword, getCachedPublicKey } from '../auth/password-cipher';
import { userKeys, type UserPublicView } from './user-types';

export type UserAdminView = {
  userId: number;
  email: string;
  nickname: string;
  userImage: string;
  identity: string;
  profession: string;
  telephone: string;
  birthday: string;
  address: string;
  introduction: string;
  lang: string;
  isBot: number;
  disableAt?: string | null;
};

export type UserAdminListView = {
  list: UserAdminView[];
  total: number;
  page: number;
  pageSize: number;
};

export type UserAdminListParams = {
  key?: string;
  page?: number;
  pageSize?: number;
  /** 非 0 时含机器人 */
  isBot?: number;
};

export type UserOperationType =
  'setAdmin' | 'clearAdmin' | 'setTemporary' | 'clearTemporary' | 'disable' | 'enable';

export type CreateUserInput = {
  email: string;
  nickname: string;
  password: string;
  profession?: string;
  identity?: string;
};

export type UserImportPreviewRow = {
  line: number;
  email: string;
  nickname: string;
  profession?: string;
  ok: boolean;
  error?: string;
};

export type UserImportPreviewView = {
  rows: UserImportPreviewRow[];
  total: number;
  okCount: number;
};

export type UserImportRowInput = {
  email: string;
  nickname: string;
  password: string;
  profession?: string;
};

export type UserImportResultView = {
  rows: Array<UserImportPreviewRow & { userId?: number }>;
  created: number;
  failed: number;
};

export const userAdminKeys = {
  all: () => [...userKeys.all(), 'admin'] as const,
  lists: (params: UserAdminListParams) => [...userAdminKeys.all(), 'lists', params] as const,
};

/** 解析 identity JSON 数组字符串 */
export function parseIdentityTags(identity: string | undefined | null): string[] {
  if (!identity?.trim()) return [];
  try {
    const parsed = JSON.parse(identity) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* identity 可能是逗号串等历史格式 */
  }
  return identity
    .replace(/[[\]"]/g, '')
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function identityHas(identity: string | undefined | null, tag: string): boolean {
  return parseIdentityTags(identity).includes(tag);
}

export function useUserAdminList(params: UserAdminListParams, enabled = true) {
  const key = params.key?.trim() || undefined;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const isBot = params.isBot;
  const queryParams: UserAdminListParams = {
    ...(key ? { key } : {}),
    page,
    pageSize,
    ...(isBot != null ? { isBot } : {}),
  };

  return useQuery({
    queryKey: userAdminKeys.lists(queryParams),
    queryFn: () => get<UserAdminListView>('users/lists', queryParams),
    staleTime: 30_000,
    enabled,
  });
}

async function createUserRequest(input: CreateUserInput): Promise<UserPublicView> {
  const attempt = async (forceRefresh: boolean): Promise<UserPublicView> => {
    const key =
      !forceRefresh && getCachedPublicKey() ? getCachedPublicKey()! : await fetchPublicKey();
    const enc = await encryptPassword(input.password, key);
    return post<UserPublicView>('users/createUser', {
      email: input.email.trim(),
      nickname: input.nickname.trim(),
      password: enc.password,
      keyId: enc.keyId,
      ...(input.profession?.trim() ? { profession: input.profession.trim() } : {}),
      ...(input.identity?.trim() ? { identity: input.identity.trim() } : {}),
    });
  };

  try {
    return await attempt(false);
  } catch (err) {
    if (err instanceof ApiError && err.code === ApiCodes.PUBLIC_KEY_INVALID.code) {
      clearPublicKeyCache();
      return attempt(true);
    }
    throw err;
  }
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUserRequest,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userAdminKeys.all() });
    },
  });
}

export function useUserOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { type: UserOperationType; userId: number; handoverUserId?: number }) =>
      get<UserAdminView>('users/operation', {
        type: input.type,
        userId: input.userId,
        ...(input.handoverUserId != null ? { handoverUserId: input.handoverUserId } : {}),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userAdminKeys.all() });
    },
  });
}

export function useImportUsersPreview() {
  return useMutation({
    mutationFn: (file: File) => upload<UserImportPreviewView>('users/import/preview', file),
  });
}

async function importUsersRequest(rows: UserImportRowInput[]): Promise<UserImportResultView> {
  const attempt = async (forceRefresh: boolean): Promise<UserImportResultView> => {
    const key =
      !forceRefresh && getCachedPublicKey() ? getCachedPublicKey()! : await fetchPublicKey();
    const encrypted = await Promise.all(
      rows.map(async (row) => {
        const enc = await encryptPassword(row.password, key);
        return {
          email: row.email.trim(),
          nickname: row.nickname.trim(),
          password: enc.password,
          keyId: enc.keyId,
          ...(row.profession?.trim() ? { profession: row.profession.trim() } : {}),
        };
      }),
    );
    return post<UserImportResultView>('users/import', { keyId: key.keyId, rows: encrypted });
  };

  try {
    return await attempt(false);
  } catch (err) {
    if (err instanceof ApiError && err.code === ApiCodes.PUBLIC_KEY_INVALID.code) {
      clearPublicKeyCache();
      return attempt(true);
    }
    throw err;
  }
}

export function useImportUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importUsersRequest,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userAdminKeys.all() });
    },
  });
}

/** 下载批量导入 CSV 模板（非信封） */
export async function downloadUserImportTemplate(): Promise<Blob> {
  const res = await http.get<Blob>('users/import/template', { responseType: 'blob' });
  return res.data;
}

/** 客户端解析 CSV（用于确认导入时保留明文密码） */
export function parseUserImportCsv(text: string): UserImportRowInput[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0]!.toLowerCase();
  const start = header.includes('email') ? 1 : 0;
  const rows: UserImportRowInput[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!);
    const email = (cols[0] ?? '').trim();
    const nickname = (cols[1] ?? '').trim();
    const password = (cols[2] ?? '').trim();
    const profession = (cols[3] ?? '').trim();
    if (!email && !nickname && !password) continue;
    rows.push({
      email,
      nickname,
      password,
      ...(profession ? { profession } : {}),
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}
