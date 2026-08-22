import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';

export type ComplaintTypeCode = 10 | 20 | 30 | 40 | 50 | 60 | 70;

export type ComplaintStatusCode = 0 | 1 | 2;

export type ComplaintView = {
  id: number;
  dialogId: number;
  userId: number;
  type: number;
  reason: string;
  images: string[];
  status: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ComplaintListView = {
  list: ComplaintView[];
  page: number;
  pageSize: number;
  total: number;
};

export type ComplaintListParams = {
  type?: number;
  status?: number;
  page?: number;
  pageSize?: number;
};

export type ComplaintActionType = 'handle' | 'delete';

export const complaintKeys = {
  all: () => ['complaint'] as const,
  lists: (params: ComplaintListParams) => [...complaintKeys.all(), 'lists', params] as const,
};

export const COMPLAINT_TYPES: ComplaintTypeCode[] = [10, 20, 30, 40, 50, 60, 70];

export function useComplaintList(params: ComplaintListParams, enabled = true) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const query: ComplaintListParams = {
    page,
    pageSize,
    ...(params.type != null && params.type > 0 ? { type: params.type } : {}),
    ...(params.status != null ? { status: params.status } : {}),
  };

  return useQuery({
    queryKey: complaintKeys.lists(query),
    queryFn: () => get<ComplaintListView>('complaint/lists', query),
    staleTime: 15_000,
    enabled,
  });
}

export function useComplaintAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; type: ComplaintActionType }) =>
      post<{ ok: boolean; status?: number }>('complaint/action', input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: complaintKeys.all() });
    },
  });
}

export type ComplaintSubmitInput = {
  dialogId: number;
  type: ComplaintTypeCode;
  reason: string;
  /** 可选截图 path 列表（已上传对象路径） */
  images?: Array<{ path: string }>;
};

/** `POST complaint/submit`：成员举报会话 */
export function useSubmitComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ComplaintSubmitInput) =>
      post<{ ok?: boolean }>('complaint/submit', {
        dialogId: input.dialogId,
        type: input.type,
        reason: input.reason.trim(),
        ...(input.images?.length ? { images: input.images } : {}),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: complaintKeys.all() });
    },
  });
}
