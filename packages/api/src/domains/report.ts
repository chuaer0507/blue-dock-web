import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';
import { isId } from '../common/id';

export type ReportType = 'daily' | 'weekly';

export type ReportAnalysisView = {
  text?: string;
  model?: string;
  meta?: unknown;
};

export type ReportView = {
  id: number;
  sign: string;
  title: string;
  type: string;
  userId: number;
  content: string;
  receiveUserIds: number[];
  read?: number | null;
  receiveAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  /** 当前用户对该报告的 AI 解读（详情接口） */
  aiAnalysis?: ReportAnalysisView | null;
};

export type ReportTemplateView = {
  sign: string;
  type: string;
  title: string;
  content: string;
  completedCount?: number;
  incompleteCount?: number;
  nextWeekCount?: number;
};

export type ReportUnreadView = {
  unread: number;
};

export type ReportLastSubmitterView = {
  userId?: number;
};

export type ReportStoreInput = {
  id?: number;
  title: string;
  type: ReportType;
  content: string;
  /** 逗号分隔接收人 userId */
  receive: string;
  offset?: number;
};

export type ReportListParams = {
  type?: ReportType | '';
  status?: 'unread' | 'read' | '';
  page?: number;
  pageSize?: number;
};

export const reportKeys = {
  all: () => ['report'] as const,
  my: (params: ReportListParams) => [...reportKeys.all(), 'my', params] as const,
  receive: (params: ReportListParams) => [...reportKeys.all(), 'receive', params] as const,
  detail: (id: number | string) => [...reportKeys.all(), 'detail', id] as const,
  unread: () => [...reportKeys.all(), 'unread'] as const,
  lastSubmitter: () => [...reportKeys.all(), 'lastSubmitter'] as const,
  template: (type: ReportType, offset?: number) =>
    [...reportKeys.all(), 'template', type, offset ?? 0] as const,
};

export function useReportMy(params: ReportListParams = {}, enabled = true) {
  return useQuery({
    queryKey: reportKeys.my(params),
    queryFn: () =>
      get<ReportView[]>('report/my', {
        ...(params.type ? { type: params.type } : {}),
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      }),
    staleTime: 30_000,
    enabled,
  });
}

export function useReportReceive(params: ReportListParams = {}, enabled = true) {
  return useQuery({
    queryKey: reportKeys.receive(params),
    queryFn: () =>
      get<ReportView[]>('report/receive', {
        ...(params.type ? { type: params.type } : {}),
        ...(params.status ? { status: params.status } : {}),
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      }),
    staleTime: 30_000,
    enabled,
  });
}

export function useReportDetail(idOrCode: number | string | undefined, enabled = true) {
  const raw = idOrCode == null ? '' : String(idOrCode).trim();
  const id = isId(raw) ? (raw as unknown as number) : undefined;
  const code = !id && raw ? raw : undefined;

  return useQuery({
    queryKey: reportKeys.detail(raw || 0),
    queryFn: () =>
      get<ReportView>('report/detail', {
        ...(id != null ? { id } : {}),
        ...(code ? { code } : {}),
      }),
    enabled: enabled && (id != null || Boolean(code)),
    staleTime: 30_000,
  });
}

export function useReportUnread(enabled = true) {
  return useQuery({
    queryKey: reportKeys.unread(),
    queryFn: () => get<ReportUnreadView>('report/unread'),
    staleTime: 30_000,
    enabled,
  });
}

export function useReportLastSubmitter(enabled = true) {
  return useQuery({
    queryKey: reportKeys.lastSubmitter(),
    queryFn: () => get<ReportLastSubmitterView>('report/lastSubmitter'),
    staleTime: 60_000,
    enabled,
  });
}

export function useReportTemplate(type: ReportType, offset = 0, enabled = true) {
  return useQuery({
    queryKey: reportKeys.template(type, offset),
    queryFn: () => fetchReportTemplate(type, offset),
    staleTime: 60_000,
    enabled,
  });
}

export function fetchReportTemplate(type: ReportType, offset = 0): Promise<ReportTemplateView> {
  return get<ReportTemplateView>('report/template', { type, offset });
}

export function useStoreReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReportStoreInput) =>
      get<ReportView>('report/store', {
        title: input.title,
        type: input.type,
        content: input.content,
        receive: input.receive,
        ...(input.id ? { id: input.id } : {}),
        ...(input.offset !== undefined ? { offset: input.offset } : {}),
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: reportKeys.all() });
    },
  });
}

export function useMarkReportRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; read?: 0 | 1 }) =>
      get<void>('report/mark', { id: vars.id, read: vars.read ?? 1 }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: reportKeys.all() });
    },
  });
}

export function useReadReports() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string) => get<void>('report/read', { ids }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: reportKeys.all() });
    },
  });
}

export function useAiGenerateReport() {
  return useMutation({
    mutationFn: (vars: { type: ReportType; content: string }) =>
      post<{ content?: string; text?: string }>('report/aiGenerate', vars),
  });
}

export function useShareReport() {
  return useMutation({
    mutationFn: (vars: { id: number; dialogId: number; refresh?: string }) =>
      get<Record<string, unknown>>('report/share', {
        id: vars.id,
        dialogId: vars.dialogId,
        ...(vars.refresh ? { refresh: vars.refresh } : {}),
      }),
  });
}

/** `POST report/analysisSave`：按查看者保存 AI 解读 */
export function useSaveReportAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; text: string; model?: string }) =>
      post<{ id: number; text: string; model?: string }>('report/analysisSave', {
        id: input.id,
        text: input.text,
        ...(input.model ? { model: input.model } : {}),
      }),
    onSuccess: (data, vars) => {
      const patch = (old: ReportView | undefined) =>
        old
          ? {
              ...old,
              aiAnalysis: {
                text: data.text,
                model: data.model ?? old.aiAnalysis?.model ?? '',
              },
            }
          : old;
      qc.setQueryData<ReportView>(reportKeys.detail(vars.id), patch);
      // 短码打开时 queryKey 可能是 code
      void qc.invalidateQueries({ queryKey: reportKeys.all() });
    },
  });
}
