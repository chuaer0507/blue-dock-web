import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';
import { ApiCodes, ApiError } from '../errors';
import { fetchPublicKey } from '../auth/login';
import { clearPublicKeyCache, encryptPassword, getCachedPublicKey } from '../auth/password-cipher';
import { userKeys, type UserExtraView, type UserPublicView } from './user-types';

export { userKeys, type UserExtraView, type UserPublicView } from './user-types';

/** 当前登录用户公开资料 */
export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => get<UserPublicView>('users/info'),
    staleTime: 60_000,
    enabled,
  });
}

/** `GET users/basic`：指定用户公开资料（不含 isBot 等扩展字段） */
export function useUserBasic(userId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: userKeys.basic(userId ?? 0),
    queryFn: () => get<UserPublicView>('users/basic', { userId }),
    staleTime: 60_000,
    enabled: enabled && typeof userId === 'number' && userId > 0,
  });
}

/** `GET users/extra`：指定用户扩展资料（含 isBot） */
export function useUserExtra(userId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: userKeys.extra(userId ?? 0),
    queryFn: () => get<UserExtraView>('users/extra', { userId }),
    staleTime: 60_000,
    enabled: enabled && typeof userId === 'number' && userId > 0,
  });
}

export type EditUserDataInput = {
  nickname?: string;
  userImage?: string;
  profession?: string;
  telephone?: string;
  birthday?: string;
  address?: string;
  introduction?: string;
  lang?: string;
};

/** 修改当前用户资料（历史契约：GET `users/editData`） */
export function useEditUserData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EditUserDataInput) =>
      get<UserPublicView>('users/editData', {
        ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
        ...(input.userImage !== undefined ? { userImage: input.userImage } : {}),
        ...(input.profession !== undefined ? { profession: input.profession } : {}),
        ...(input.telephone !== undefined ? { telephone: input.telephone } : {}),
        ...(input.birthday !== undefined ? { birthday: input.birthday } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.introduction !== undefined ? { introduction: input.introduction } : {}),
        ...(input.lang !== undefined ? { lang: input.lang } : {}),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.me(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}

export type EditPasswordInput = {
  oldPassword: string;
  password: string;
};

async function editPasswordRequest(input: EditPasswordInput): Promise<UserPublicView> {
  const attempt = async (forceRefresh: boolean): Promise<UserPublicView> => {
    const key =
      !forceRefresh && getCachedPublicKey() ? getCachedPublicKey()! : await fetchPublicKey();
    const oldEnc = await encryptPassword(input.oldPassword, key);
    const newEnc = await encryptPassword(input.password, key);
    return post<UserPublicView>(
      'users/editPassword',
      {
        oldPassword: oldEnc.password,
        password: newEnc.password,
        keyId: newEnc.keyId,
      },
      { extra: { showFailTips: false } },
    );
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

/** 修改密码（RSA oldPassword + password + keyId） */
export function useEditPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editPasswordRequest,
    onSuccess: (data) => {
      queryClient.setQueryData(userKeys.me(), data);
    },
  });
}

export type EmailLinkSendResult = {
  sent: boolean;
  email: string;
  /** 无 SMTP 时后端回传，便于联调打开 `/single/valid/email?code=` */
  devCode?: string;
};

function asEmailLinkSend(raw: Record<string, unknown>): EmailLinkSendResult {
  const devCode = typeof raw.devCode === 'string' && raw.devCode ? raw.devCode : undefined;
  return {
    sent: Boolean(raw.sent),
    email: String(raw.email ?? ''),
    ...(devCode ? { devCode } : {}),
  };
}

/** `GET users/email/send`：重发注册邮箱验证链接（已验证则后端报错） */
export function useResendEmailVerification() {
  return useMutation({
    mutationFn: () => get<Record<string, unknown>>('users/email/send').then(asEmailLinkSend),
  });
}

/** `GET users/email/edit`：申请改邮箱（向新地址发验证链接） */
export function useRequestEmailEdit() {
  return useMutation({
    mutationFn: (email: string) =>
      get<Record<string, unknown>>('users/email/edit', { email: email.trim().toLowerCase() }).then(
        asEmailLinkSend,
      ),
  });
}

export type AnnualReportUser = {
  userId: number;
  email: string;
  nickname: string;
  avatar: string;
};

export type AnnualReportChat = {
  dialogId?: number;
  dialogName?: string;
  dialogType?: string;
  dialogGroupType?: string;
  avatar?: string;
  chatNum?: number;
};

export type AnnualReportProject = {
  id: number;
  name: string;
};

export type AnnualReportDurationTask = {
  id?: number;
  flowItemName?: string;
  taskName?: string;
  projectName?: string;
  projectColumnName?: string;
  startAt?: string | null;
  endAt?: string | null;
  completeAt?: string | null;
  createdAt?: string | null;
  duration?: number;
};

export type AnnualReportMonthCompleted = {
  month: number;
  num: number;
};

export type AnnualReportTasks = {
  total: number;
  completed: number;
  overtime: number;
  longestTask: AnnualReportDurationTask;
  fastestTask: AnnualReportDurationTask;
  monthCompletedTask: AnnualReportMonthCompleted[];
};

export type AnnualReportView = {
  year: number;
  user: AnnualReportUser;
  hireDate: string;
  tenureDays: number;
  latestOnlineTime: string;
  longestChat: AnnualReportChat;
  chatAiNum: number;
  fileCreatedNum: number;
  projects: AnnualReportProject[];
  tasks: AnnualReportTasks;
};

function asNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asStr(v: unknown): string {
  return v == null ? '' : String(v);
}

function normalizeDurationTask(raw: unknown): AnnualReportDurationTask {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  return {
    id: o.id != null ? asNum(o.id) : undefined,
    flowItemName: asStr(o.flowItemName),
    taskName: asStr(o.taskName),
    projectName: asStr(o.projectName),
    projectColumnName: asStr(o.projectColumnName),
    startAt: o.startAt == null ? null : asStr(o.startAt),
    endAt: o.endAt == null ? null : asStr(o.endAt),
    completeAt: o.completeAt == null ? null : asStr(o.completeAt),
    createdAt: o.createdAt == null ? null : asStr(o.createdAt),
    duration: asNum(o.duration),
  };
}

function normalizeAnnualReport(raw: Record<string, unknown>): AnnualReportView {
  const userRaw = (raw.user ?? {}) as Record<string, unknown>;
  const chatRaw = (raw.longestChat ?? {}) as Record<string, unknown>;
  const tasksRaw = (raw.tasks ?? {}) as Record<string, unknown>;
  const projectsRaw = Array.isArray(raw.projects) ? raw.projects : [];
  const monthsRaw = Array.isArray(tasksRaw.monthCompletedTask) ? tasksRaw.monthCompletedTask : [];

  return {
    year: asNum(raw.year) || new Date().getFullYear(),
    user: {
      userId: asNum(userRaw.userId),
      email: asStr(userRaw.email),
      nickname: asStr(userRaw.nickname),
      avatar: asStr(userRaw.avatar),
    },
    hireDate: asStr(raw.hireDate),
    tenureDays: asNum(raw.tenureDays),
    latestOnlineTime: asStr(raw.latestOnlineTime),
    longestChat: {
      dialogId: chatRaw.dialogId != null ? asNum(chatRaw.dialogId) : undefined,
      dialogName: asStr(chatRaw.dialogName),
      dialogType: asStr(chatRaw.dialogType),
      dialogGroupType: asStr(chatRaw.dialogGroupType),
      avatar: asStr(chatRaw.avatar),
      chatNum: asNum(chatRaw.chatNum),
    },
    chatAiNum: asNum(raw.chatAiNum),
    fileCreatedNum: asNum(raw.fileCreatedNum),
    projects: projectsRaw.map((p) => {
      const row = (p ?? {}) as Record<string, unknown>;
      return { id: asNum(row.id), name: asStr(row.name) };
    }),
    tasks: {
      total: asNum(tasksRaw.total),
      completed: asNum(tasksRaw.completed),
      overtime: asNum(tasksRaw.overtime),
      longestTask: normalizeDurationTask(tasksRaw.longestTask),
      fastestTask: normalizeDurationTask(tasksRaw.fastestTask),
      monthCompletedTask: monthsRaw.map((m) => {
        const row = (m ?? {}) as Record<string, unknown>;
        return { month: asNum(row.month), num: asNum(row.num) };
      }),
    },
  };
}

/** `GET users/annual/report`：个人年度报告 */
export function useAnnualReport(year?: number, enabled = true) {
  const y = year && year > 0 ? year : new Date().getFullYear();
  return useQuery({
    queryKey: userKeys.annualReport(y),
    queryFn: async () => {
      const raw = await get<Record<string, unknown>>('users/annual/report', { year: y });
      return normalizeAnnualReport(raw ?? {});
    },
    staleTime: 60_000,
    enabled,
  });
}
