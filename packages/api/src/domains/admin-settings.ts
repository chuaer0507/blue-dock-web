import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';

export type LdapSetting = {
  ldapOpen: string;
  ldapHost: string;
  ldapPort: string;
  ldapUserDn: string;
  ldapPassword: string;
  ldapBaseDn: string;
  ldapLoginAttr: string;
  ldapSyncLocal: string;
};

export type EmailSetting = {
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
  smtpSsl: string;
  fromAlias: string;
  fromAddress: string;
  ignoreAddr: string;
  regVerify: string;
  noticeMessage: string;
  messageUnreadTimeRanges?: string[][];
  messageUnreadUserMinute?: number;
  messageUnreadGroupMinute?: number;
};

export type EmailCheckResult = {
  ok: boolean;
  to: string;
};

export type LdapTestResult = {
  ok: boolean;
  url: string;
};

export type AppPushSetting = {
  open: string;
  iosKey: string;
  iosSecret: string;
  androidKey: string;
  androidSecret: string;
  aliasType: string;
  productionMode: string;
};

export type SystemGeneralSetting = {
  passwordType: string;
  reg: string;
  inviteCode: string;
  messageRecallLimit: number;
  messageEditLimit: number;
  userPrivateChatMute: string;
  userGroupChatMute: string;
  allGroupMute: string;
  autoArchive: string;
  autoArchiveDay: number;
  todoPermission: string;
  e2e: string;
  taskAiAutoAnalyze: string;
  unclaimedTaskReminder: string;
  unclaimedTaskReminderTime: string;
  departmentOwnerProjectView: string;
  anonMessage: string;
  writable?: boolean;
};

export type MeetingSetting = {
  enabled: string;
  appId: string;
  appCertificate: string;
  apiKey: string;
  apiSecret: string;
  allowDevToken: string;
  allowCloseWithoutRest: string;
  closeIdleMinutes: number;
  channelSalt: string;
  shareBaseUrl: string;
  shareTtlHours: number;
};

export type AiBotModelRef = {
  id: string;
  name?: string;
  provider?: string;
};

export type AiBotSetting = {
  open: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** 管理端结构化模型列表（aiBotModels） */
  models: AiBotModelRef[];
  systemPrompt: string;
  embeddingModel: string;
  openaiKey: string;
  claudeKey: string;
  deepseekKey: string;
  aiGatewayKey: string;
  /** 对各供应商暴露给客户端的模型 id（assistant/models） */
  openaiModels: string[];
  claudeModels: string[];
  deepseekModels: string[];
};

export type FileSetting = {
  uploadMaxMb: string;
  packPermission: string;
  packUserIds: string;
  imageOptimize: string;
  saveInternetImage: string;
  videoTranscode: string;
};

export type OssCloudKeys = {
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  secretId?: string;
  storagePath?: string;
};

export type OssSetting = {
  provider: string;
  nameType: string;
  linkType: string;
  allowExtensions: string;
  protocol: string;
  domain: string;
  publicBaseUrl?: string;
  local?: OssCloudKeys;
  huawei?: OssCloudKeys;
  aliyun?: OssCloudKeys;
  tencent?: OssCloudKeys;
  qiniu?: OssCloudKeys;
};

export type OssCheckResult = {
  ok: boolean;
  provider: string;
  key: string;
  url: string;
};

export type TaskPriorityItem = {
  name: string;
  color: string;
  days: number;
  priority: number;
  isDefault: number;
};

export type ColumnTemplateItem = {
  name: string;
  columns: string[];
};

export const adminSettingKeys = {
  all: () => ['admin-setting'] as const,
  ldap: () => [...adminSettingKeys.all(), 'ldap'] as const,
  email: () => [...adminSettingKeys.all(), 'email'] as const,
  appPush: () => [...adminSettingKeys.all(), 'appPush'] as const,
  general: () => [...adminSettingKeys.all(), 'general'] as const,
  meeting: () => [...adminSettingKeys.all(), 'meeting'] as const,
  aiBot: () => [...adminSettingKeys.all(), 'aiBot'] as const,
  aiBotModels: () => [...adminSettingKeys.all(), 'aiBotModels'] as const,
  aiBotDefaultModels: () => [...adminSettingKeys.all(), 'aiBotDefaultModels'] as const,
  file: () => [...adminSettingKeys.all(), 'file'] as const,
  oss: () => [...adminSettingKeys.all(), 'oss'] as const,
  priority: () => [...adminSettingKeys.all(), 'priority'] as const,
  columnTemplate: () => [...adminSettingKeys.all(), 'columnTemplate'] as const,
};

const LDAP_DEFAULTS: LdapSetting = {
  ldapOpen: 'close',
  ldapHost: '',
  ldapPort: '389',
  ldapUserDn: '',
  ldapPassword: '',
  ldapBaseDn: '',
  ldapLoginAttr: 'cn',
  ldapSyncLocal: 'close',
};

const EMAIL_DEFAULTS: EmailSetting = {
  smtpHost: '',
  smtpPort: '465',
  smtpUsername: '',
  smtpPassword: '',
  smtpSsl: 'open',
  fromAlias: '',
  fromAddress: '',
  ignoreAddr: '',
  regVerify: 'close',
  noticeMessage: 'close',
  messageUnreadTimeRanges: [
    ['00:00', '09:00'],
    ['18:00', '23:59'],
  ],
  messageUnreadUserMinute: 30,
  messageUnreadGroupMinute: 60,
};

const APP_PUSH_DEFAULTS: AppPushSetting = {
  open: 'close',
  iosKey: '',
  iosSecret: '',
  androidKey: '',
  androidSecret: '',
  aliasType: 'bluedock',
  productionMode: 'true',
};

const GENERAL_DEFAULTS: SystemGeneralSetting = {
  passwordType: 'simple',
  reg: 'invite',
  inviteCode: '',
  messageRecallLimit: 0,
  messageEditLimit: 0,
  userPrivateChatMute: 'open',
  userGroupChatMute: 'open',
  allGroupMute: 'close',
  autoArchive: 'close',
  autoArchiveDay: 30,
  todoPermission: 'allow',
  e2e: 'close',
  taskAiAutoAnalyze: 'open',
  unclaimedTaskReminder: 'close',
  unclaimedTaskReminderTime: '09:00',
  departmentOwnerProjectView: 'open',
  anonMessage: 'open',
  writable: true,
};

const MEETING_DEFAULTS: MeetingSetting = {
  enabled: 'open',
  appId: '',
  appCertificate: '',
  apiKey: '',
  apiSecret: '',
  allowDevToken: 'open',
  allowCloseWithoutRest: 'close',
  closeIdleMinutes: 10,
  channelSalt: '',
  shareBaseUrl: '',
  shareTtlHours: 6,
};

const AI_BOT_DEFAULTS: AiBotSetting = {
  open: 'close',
  provider: '',
  apiKey: '',
  baseUrl: '',
  model: '',
  models: [],
  systemPrompt: '',
  embeddingModel: 'text-embedding-3-small',
  openaiKey: '',
  claudeKey: '',
  deepseekKey: '',
  aiGatewayKey: '',
  openaiModels: [],
  claudeModels: [],
  deepseekModels: [],
};

const FILE_DEFAULTS: FileSetting = {
  uploadMaxMb: '',
  packPermission: 'all',
  packUserIds: '',
  imageOptimize: 'close',
  saveInternetImage: 'close',
  videoTranscode: 'close',
};

const OSS_DEFAULTS: OssSetting = {
  provider: 'local',
  nameType: 'dateRandom',
  linkType: 'simple',
  allowExtensions: 'png,jpg,jpeg,gif,webp,zip,pdf,doc,docx,xls,xlsx,ppt,pptx,mp4,txt',
  protocol: 'https',
  domain: '',
  publicBaseUrl: '',
  local: { storagePath: '' },
  huawei: { endpoint: '', accessKey: '', secretKey: '', bucket: '' },
  aliyun: { endpoint: '', accessKeyId: '', accessKeySecret: '', bucket: '' },
  tencent: { region: '', secretId: '', secretKey: '', bucket: '' },
  qiniu: { accessKey: '', secretKey: '', bucket: '', region: 'z0' },
};

function asLdap(raw: Record<string, unknown> | undefined): LdapSetting {
  return { ...LDAP_DEFAULTS, ...(raw as Partial<LdapSetting>) };
}

function asUnreadRanges(raw: unknown): string[][] {
  if (!Array.isArray(raw)) return EMAIL_DEFAULTS.messageUnreadTimeRanges ?? [];
  const out: string[][] = [];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const start = String(row[0] ?? '').trim();
    const end = String(row[1] ?? '').trim();
    if (!start || !end) continue;
    out.push([start, end]);
  }
  return out;
}

function asEmail(raw: Record<string, unknown> | undefined): EmailSetting {
  const merged = { ...EMAIL_DEFAULTS, ...(raw as Partial<EmailSetting>) };
  const userMin = Number(merged.messageUnreadUserMinute);
  const groupMin = Number(merged.messageUnreadGroupMinute);
  merged.messageUnreadUserMinute = Number.isFinite(userMin) ? userMin : 30;
  merged.messageUnreadGroupMinute = Number.isFinite(groupMin) ? groupMin : 60;
  merged.messageUnreadTimeRanges = asUnreadRanges(
    (raw as { messageUnreadTimeRanges?: unknown } | undefined)?.messageUnreadTimeRanges ??
      merged.messageUnreadTimeRanges,
  );
  return merged;
}

function asAppPush(raw: Record<string, unknown> | undefined): AppPushSetting {
  return { ...APP_PUSH_DEFAULTS, ...(raw as Partial<AppPushSetting>) };
}

function asGeneral(raw: Record<string, unknown> | undefined): SystemGeneralSetting {
  const merged = { ...GENERAL_DEFAULTS, ...(raw as Partial<SystemGeneralSetting>) };
  merged.messageRecallLimit = Number(merged.messageRecallLimit) || 0;
  merged.messageEditLimit = Number(merged.messageEditLimit) || 0;
  merged.autoArchiveDay = Number(merged.autoArchiveDay) || 30;
  return merged;
}

function asMeeting(raw: Record<string, unknown> | undefined): MeetingSetting {
  const merged = { ...MEETING_DEFAULTS, ...(raw as Partial<MeetingSetting>) };
  merged.closeIdleMinutes = Number(merged.closeIdleMinutes) || 10;
  merged.shareTtlHours = Number(merged.shareTtlHours) || 6;
  return merged;
}

function asStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      out.push(item.trim());
      continue;
    }
    if (item && typeof item === 'object' && 'id' in item) {
      const id = String((item as { id: unknown }).id ?? '').trim();
      if (id) out.push(id);
    }
  }
  return out;
}

function asAiBotModels(raw: unknown): AiBotModelRef[] {
  if (!Array.isArray(raw)) return [];
  const out: AiBotModelRef[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ id: item.trim(), name: item.trim() });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as { id?: unknown; name?: unknown; provider?: unknown };
    const id = String(row.id ?? '').trim();
    if (!id) continue;
    out.push({
      id,
      name: row.name != null ? String(row.name) : id,
      provider: row.provider != null ? String(row.provider) : undefined,
    });
  }
  return out;
}

function asAiBot(raw: Record<string, unknown> | undefined): AiBotSetting {
  const merged = { ...AI_BOT_DEFAULTS, ...(raw as Partial<AiBotSetting>) };
  merged.models = asAiBotModels(raw?.models ?? merged.models);
  merged.openaiModels = asStringList(raw?.openaiModels ?? merged.openaiModels);
  merged.claudeModels = asStringList(raw?.claudeModels ?? merged.claudeModels);
  merged.deepseekModels = asStringList(raw?.deepseekModels ?? merged.deepseekModels);
  return merged;
}

function asFile(raw: Record<string, unknown> | undefined): FileSetting {
  return { ...FILE_DEFAULTS, ...(raw as Partial<FileSetting>) };
}

function asOss(raw: Record<string, unknown> | undefined): OssSetting {
  const merged = { ...OSS_DEFAULTS, ...(raw as Partial<OssSetting>) };
  merged.local = { ...OSS_DEFAULTS.local, ...(raw?.local as OssCloudKeys | undefined) };
  merged.huawei = { ...OSS_DEFAULTS.huawei, ...(raw?.huawei as OssCloudKeys | undefined) };
  merged.aliyun = { ...OSS_DEFAULTS.aliyun, ...(raw?.aliyun as OssCloudKeys | undefined) };
  merged.tencent = { ...OSS_DEFAULTS.tencent, ...(raw?.tencent as OssCloudKeys | undefined) };
  merged.qiniu = { ...OSS_DEFAULTS.qiniu, ...(raw?.qiniu as OssCloudKeys | undefined) };
  return merged;
}

function asPriorityList(raw: unknown): TaskPriorityItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, i) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const isDef = r.isDefault === 1 || r.isDefault === true || r.isDefault === '1';
    return {
      name: String(r.name ?? ''),
      color: String(r.color ?? '#2D8CF0'),
      days: Number(r.days) || 0,
      priority: Number(r.priority) || i + 1,
      isDefault: isDef ? 1 : 0,
    };
  });
}

function asColumnTemplates(raw: unknown): ColumnTemplateItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const cols = r.columns;
    let columns: string[] = [];
    if (Array.isArray(cols)) {
      columns = cols.map((c) => String(c).trim()).filter(Boolean);
    } else if (typeof cols === 'string') {
      columns = cols
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
    }
    return { name: String(r.name ?? ''), columns };
  });
}

export function useLdapSetting(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.ldap(),
    queryFn: async () => asLdap(await get<Record<string, unknown>>('system/setting/thirdAccess')),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveLdapSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<LdapSetting>) =>
      post<Record<string, unknown>>('system/setting/thirdAccess', input).then(asLdap),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingKeys.ldap(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.ldap() });
    },
  });
}

export function useTestLdap() {
  return useMutation({
    mutationFn: () => get<LdapTestResult>('system/setting/thirdAccess/testLdap'),
  });
}

export function useEmailSetting(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.email(),
    queryFn: async () => asEmail(await get<Record<string, unknown>>('system/setting/email')),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveEmailSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<EmailSetting>) =>
      post<Record<string, unknown>>('system/setting/email', input).then(asEmail),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingKeys.email(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.email() });
    },
  });
}

export function useEmailCheck() {
  return useMutation({
    mutationFn: (email: string) =>
      get<EmailCheckResult>('system/email/check', { email: email.trim() }),
  });
}

export function useAppPushSetting(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.appPush(),
    queryFn: async () => asAppPush(await get<Record<string, unknown>>('system/setting/appPush')),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveAppPushSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AppPushSetting>) =>
      post<Record<string, unknown>>('system/setting/appPush', input).then(asAppPush),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingKeys.appPush(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.appPush() });
    },
  });
}

export function useSystemGeneralSetting(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.general(),
    queryFn: async () => asGeneral(await get<Record<string, unknown>>('system/setting')),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveSystemGeneralSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<SystemGeneralSetting>) =>
      post<Record<string, unknown>>('system/setting', input).then(asGeneral),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingKeys.general(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.general() });
    },
  });
}

export function useMeetingSetting(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.meeting(),
    queryFn: async () => asMeeting(await get<Record<string, unknown>>('system/setting/meeting')),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveMeetingSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<MeetingSetting>) =>
      post<Record<string, unknown>>('system/setting/meeting', input).then(asMeeting),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingKeys.meeting(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.meeting() });
    },
  });
}

export function useAiBotSetting(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.aiBot(),
    queryFn: async () => asAiBot(await get<Record<string, unknown>>('system/setting/aiBot')),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveAiBotSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AiBotSetting>) =>
      post<Record<string, unknown>>('system/setting/aiBot', input).then(asAiBot),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingKeys.aiBot(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.aiBot() });
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.aiBotModels() });
      void queryClient.invalidateQueries({ queryKey: ['assistant', 'models'] });
    },
  });
}

/** 管理端：当前结构化 models 列表 */
export function useAiBotModelsList(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.aiBotModels(),
    queryFn: () => get<AiBotModelRef[]>('system/setting/aiBotModels'),
    staleTime: 30_000,
    enabled,
  });
}

/** 管理端：内置推荐模型 */
export function useAiBotDefaultModels(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.aiBotDefaultModels(),
    queryFn: () => get<AiBotModelRef[]>('system/setting/aiBotDefaultModels'),
    staleTime: 300_000,
    enabled,
  });
}

export function useFileSetting(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.file(),
    queryFn: async () => asFile(await get<Record<string, unknown>>('system/setting/file')),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveFileSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<FileSetting>) =>
      post<Record<string, unknown>>('system/setting/file', input).then(asFile),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingKeys.file(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.file() });
    },
  });
}

export function useOssSetting(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.oss(),
    queryFn: async () => asOss(await get<Record<string, unknown>>('system/setting/oss')),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveOssSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<OssSetting>) =>
      post<Record<string, unknown>>('system/setting/oss', input).then(asOss),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingKeys.oss(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.oss() });
    },
  });
}

export function useOssCheck() {
  return useMutation({
    mutationFn: () => get<OssCheckResult>('system/oss/check'),
  });
}

export function useTaskPriorities(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.priority(),
    queryFn: async () => asPriorityList(await post<unknown>('system/priority', { type: 'get' })),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveTaskPriorities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (list: TaskPriorityItem[]) =>
      post<unknown>('system/priority', { type: 'save', list }).then(asPriorityList),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingKeys.priority(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.priority() });
    },
  });
}

export function useColumnTemplates(enabled = true) {
  return useQuery({
    queryKey: adminSettingKeys.columnTemplate(),
    queryFn: async () =>
      asColumnTemplates(await post<unknown>('system/column/template', { type: 'get' })),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveColumnTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (list: ColumnTemplateItem[]) =>
      post<unknown>('system/column/template', { type: 'save', list }).then(asColumnTemplates),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSettingKeys.columnTemplate(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminSettingKeys.columnTemplate() });
    },
  });
}
