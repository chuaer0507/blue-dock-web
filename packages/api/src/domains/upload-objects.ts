import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, upload } from '../http-api';

export type UploadObjectView = {
  id: number;
  objectKey: string;
  url: string;
  category: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  provider: string;
  uploaderId: number | null;
  createdAt: string;
};

export type UploadObjectPage = {
  list: UploadObjectView[];
  page: number;
  pageSize: number;
  total: number;
};

export type UploadObjectListParams = {
  category?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export const uploadObjectKeys = {
  all: () => ['upload-objects'] as const,
  list: (params: UploadObjectListParams) => [...uploadObjectKeys.all(), 'list', params] as const,
};

function asPage(raw: Record<string, unknown> | undefined): UploadObjectPage {
  const list = Array.isArray(raw?.list) ? (raw.list as UploadObjectView[]) : [];
  return {
    list,
    page: Number(raw?.page) || 1,
    pageSize: Number(raw?.pageSize) || 20,
    total: Number(raw?.total) || 0,
  };
}

export function useUploadObjectList(params: UploadObjectListParams, enabled = true) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const category = params.category?.trim() || undefined;
  const q = params.q?.trim() || undefined;
  return useQuery({
    queryKey: uploadObjectKeys.list({ category, q, page, pageSize }),
    queryFn: async () =>
      asPage(
        await get<Record<string, unknown>>('system/uploads', {
          ...(category ? { category } : {}),
          ...(q ? { q } : {}),
          page,
          pageSize,
        }),
      ),
    staleTime: 15_000,
    enabled,
  });
}

export function useUploadObject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, category }: { file: File; category?: string }) =>
      upload<UploadObjectView>('system/uploads', file, {
        ...(category ? { fields: { category } } : {}),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: uploadObjectKeys.all() });
    },
  });
}

/** 登录用户直传图片（写库 category=media；返回含 id，可供人脸登记等） */
export type SystemImageUploadResult = {
  id: number;
  url: string;
  path: string;
  name: string;
  size: number;
  extension: string;
  category?: string;
  provider?: string;
};

export function useSystemImageUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => upload<SystemImageUploadResult>('system/imageUpload', file),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: uploadObjectKeys.all() });
    },
  });
}

/** 登录用户直传通用文件（写库 category=files） */
export type SystemFileUploadResult = SystemImageUploadResult;

export function useSystemFileUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => upload<SystemFileUploadResult>('system/fileUpload', file),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: uploadObjectKeys.all() });
    },
  });
}

/** `GET system/imageView`：本人 media 图片空间 */
export type ImageViewFile = {
  type: string;
  title: string;
  path: string;
  url: string;
  thumbnail: string;
  inode: number;
  id: number;
};

export type ImageViewResult = {
  dirs: unknown[];
  files: ImageViewFile[];
};

export function asImageView(raw: unknown): ImageViewResult {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const filesRaw = Array.isArray(obj.files) ? obj.files : [];
  const files: ImageViewFile[] = filesRaw.map((item) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const url = String(row.url ?? '');
    return {
      type: String(row.type ?? 'file'),
      title: String(row.title ?? ''),
      path: String(row.path ?? ''),
      url,
      thumbnail: String(row.thumbnail ?? url),
      inode: Number(row.inode) || 0,
      id: Number(row.id) || 0,
    };
  });
  return {
    dirs: Array.isArray(obj.dirs) ? obj.dirs : [],
    files,
  };
}

export function useSystemImageView(path?: string, enabled = true) {
  const prefix = path?.trim() || '';
  return useQuery({
    queryKey: [...uploadObjectKeys.all(), 'imageView', prefix] as const,
    queryFn: async () =>
      asImageView(
        await get<unknown>('system/imageView', {
          ...(prefix ? { path: prefix } : {}),
        }),
      ),
    staleTime: 15_000,
    enabled,
  });
}

export function useDeleteUploadObject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      del<{ ok: boolean }>('system/uploads', undefined, {
        config: { params: { id } },
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: uploadObjectKeys.all() });
    },
  });
}
