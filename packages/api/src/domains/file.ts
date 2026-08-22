import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '../http-api';
import { http } from '../client';
import { ApiError } from '../errors';

export type FileView = {
  id: number;
  parentId: number;
  name: string;
  type: string;
  extension: string;
  size: number;
  hash: string;
  userId: number;
  createdUserId: number;
  isShared: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export const fileKeys = {
  all: () => ['files'] as const,
  list: (parentId: number | null) => [...fileKeys.all(), 'list', parentId ?? 0] as const,
  detail: (id: number) => [...fileKeys.all(), 'detail', id] as const,
  search: (key: string) => [...fileKeys.all(), 'search', key] as const,
  trash: () => [...fileKeys.all(), 'trash'] as const,
};

export function isFolderEntry(file: FileView): boolean {
  return file.type === 'folder' || file.type === 'dir';
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

/** 目录列表；`parentId` 缺省为根 */
export function useFileList(parentId: number | null | undefined) {
  const pid = parentId == null || parentId === 0 ? null : parentId;
  return useQuery({
    queryKey: fileKeys.list(pid),
    queryFn: () =>
      get<FileView[]>('file/lists', {
        ...(pid == null ? {} : { parentId: pid }),
      }),
    staleTime: 30_000,
  });
}

export function useFile(id: number | undefined) {
  return useQuery({
    queryKey: fileKeys.detail(id ?? 0),
    queryFn: () => get<FileView>('file/one', { id }),
    enabled: typeof id === 'number' && id > 0,
    staleTime: 60_000,
  });
}

/** 按名称搜索（含自己的文件与共享根） */
export function useFileSearch(key: string, take = 50) {
  const q = key.trim();
  return useQuery({
    queryKey: fileKeys.search(q),
    queryFn: () => get<FileView[]>('file/search', { key: q, take }),
    enabled: q.length > 0,
    staleTime: 15_000,
  });
}

export type CreateFolderInput = {
  name: string;
  parentId?: number | null;
};

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFolderInput) =>
      get<FileView>('file/add', {
        name: input.name,
        type: 'folder',
        ...(input.parentId == null || input.parentId === 0 ? {} : { parentId: input.parentId }),
      }),
    onSettled: (_d, _e, vars) => {
      const pid = vars.parentId == null || vars.parentId === 0 ? null : vars.parentId;
      void queryClient.invalidateQueries({ queryKey: fileKeys.list(pid) });
    },
  });
}

export type RenameFileInput = {
  id: number;
  name: string;
  /** add 接口仅允许 folder|document；重命名时类型不被写入，用 folder 占位即可 */
  parentId?: number | null;
};

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameFileInput) =>
      get<FileView>('file/add', {
        id: input.id,
        name: input.name,
        type: 'folder',
      }),
    onSettled: (_d, _e, vars) => {
      const pid = vars.parentId == null || vars.parentId === 0 ? null : vars.parentId;
      void queryClient.invalidateQueries({ queryKey: fileKeys.list(pid) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.detail(vars.id) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
    },
  });
}

export function useRemoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; parentId: number | null }) =>
      get<void>('file/remove', { id: input.id }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: fileKeys.list(vars.parentId) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.detail(vars.id) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
    },
  });
}

export type MoveFileInput = {
  id: number;
  /** 目标父目录；0 / null 表示根 */
  parentId: number | null;
  fromParentId: number | null;
};

export function useMoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveFileInput) =>
      get<FileView>('file/move', {
        id: input.id,
        parentId: input.parentId == null || input.parentId === 0 ? 0 : input.parentId,
      }),
    onSettled: (_d, _e, vars) => {
      const to = vars.parentId == null || vars.parentId === 0 ? null : vars.parentId;
      void queryClient.invalidateQueries({ queryKey: fileKeys.list(vars.fromParentId) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.list(to) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.detail(vars.id) });
    },
  });
}

export type CopyFileInput = {
  id: number;
  parentId?: number | null;
  fromParentId: number | null;
};

export function useCopyFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CopyFileInput) =>
      get<FileView>('file/copy', {
        id: input.id,
        ...(input.parentId == null || input.parentId === 0 ? {} : { parentId: input.parentId }),
      }),
    onSettled: (_d, _e, vars) => {
      const to = vars.parentId == null || vars.parentId === 0 ? vars.fromParentId : vars.parentId;
      void queryClient.invalidateQueries({ queryKey: fileKeys.list(vars.fromParentId) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.list(to) });
    },
  });
}

export type FileLinkView = {
  id: number;
  fileId: number;
  code: string;
  permission: number;
  allowGuest: number;
  userId: number;
  createdAt?: string | null;
};

export type FileShareMemberView = {
  userId: number;
  email?: string;
  nickname?: string;
  permission?: number;
};

export type FileShareView = {
  id: number;
  isShared: number;
  members: FileShareMemberView[];
  link: FileLinkView | null;
};

export type FileContentView = {
  id: number;
  fileId: number;
  content: string;
  text: string;
  size: number;
  userId: number;
  createdAt?: string | null;
};

export const fileShareKeys = {
  all: () => [...fileKeys.all(), 'share'] as const,
  one: (id: number) => [...fileShareKeys.all(), id] as const,
  link: (code: string) => [...fileKeys.all(), 'link', code] as const,
  content: (id: number) => [...fileKeys.all(), 'content', id] as const,
  contentHistory: (id: number) => [...fileKeys.all(), 'contentHistory', id] as const,
};

/** 按分享码解析外链（访客链路可匿名） */
export function useFileLinkByCode(code: string | undefined, enabled = true) {
  const c = code?.trim() ?? '';
  return useQuery({
    queryKey: fileShareKeys.link(c),
    queryFn: () =>
      get<FileLinkView>(
        'file/link',
        { code: c },
        {
          skipUnauthorizedHandler: true,
        },
      ),
    enabled: enabled && c.length > 0,
    staleTime: 30_000,
  });
}

/** 获取或刷新文件公开链接 */
export function useFileLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: number;
      refresh?: boolean;
      permission?: number;
      allowGuest?: number;
    }) =>
      get<FileLinkView>('file/link', {
        id: input.id,
        ...(input.refresh ? { refresh: true } : {}),
        ...(input.permission != null ? { permission: input.permission } : {}),
        ...(input.allowGuest != null ? { allowGuest: input.allowGuest } : {}),
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: fileShareKeys.one(vars.id) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.detail(vars.id) });
    },
  });
}

export function useFileShare(id: number | undefined, enabled = true) {
  return useQuery({
    queryKey: fileShareKeys.one(id ?? 0),
    queryFn: () => get<FileShareView>('file/share', { id }),
    enabled: enabled && typeof id === 'number' && id > 0,
    staleTime: 30_000,
  });
}

export type UpdateFileShareInput = {
  id: number;
  userIds?: number[];
  removeUserIds?: number[];
  /** 0 只读 · 1 可写 */
  permission?: 0 | 1;
};

export function useUpdateFileShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFileShareInput) =>
      get<FileShareView>('file/share/update', {
        id: input.id,
        ...(input.userIds?.length ? { userIds: input.userIds.join(',') } : {}),
        ...(input.removeUserIds?.length ? { removeUserIds: input.removeUserIds.join(',') } : {}),
        ...(input.permission != null ? { permission: input.permission } : {}),
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: fileShareKeys.one(vars.id) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.detail(vars.id) });
    },
  });
}

/** 退出共享（被分享方） */
export function useShareOutFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => get<void>('file/share/out', { id }),
    onSettled: (_d, _e, id) => {
      void queryClient.invalidateQueries({ queryKey: fileShareKeys.one(id) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.all() });
    },
  });
}

/** 在线文档 / 文本内容 */
export function useFileContent(id: number | undefined, enabled = true) {
  return useQuery({
    queryKey: fileShareKeys.content(id ?? 0),
    queryFn: () => get<FileContentView>('file/content', { id }),
    enabled: enabled && typeof id === 'number' && id > 0,
    staleTime: 15_000,
  });
}

export type FileContentHistoryItem = {
  id: number;
  size: number;
  userId: number;
  createdAt: string | null;
};

/** 文本/在线文档内容版本历史 */
export function useFileContentHistory(id: number | undefined, take = 50, enabled = true) {
  return useQuery({
    queryKey: fileShareKeys.contentHistory(id ?? 0),
    queryFn: () =>
      get<FileContentHistoryItem[]>('file/content/history', {
        id,
        take,
      }),
    enabled: enabled && typeof id === 'number' && id > 0,
    staleTime: 15_000,
  });
}

/** 将历史内容版本恢复为最新（再插入一版） */
export function useRestoreFileContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; contentId: number }) =>
      get<FileContentView>('file/content/restore', {
        id: input.id,
        contentId: input.contentId,
      }),
    onSuccess: (view, vars) => {
      queryClient.setQueryData(fileShareKeys.content(vars.id), view);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: fileShareKeys.content(vars.id) });
      void queryClient.invalidateQueries({ queryKey: fileShareKeys.contentHistory(vars.id) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.detail(vars.id) });
    },
  });
}

/** `GET file/content/save`：保存文本内容（新版本） */
export function useSaveFileContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; content: string }) =>
      get<FileContentView>('file/content/save', {
        id: input.id,
        content: input.content,
      }),
    onSuccess: (view, vars) => {
      queryClient.setQueryData(fileShareKeys.content(vars.id), view);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: fileShareKeys.content(vars.id) });
      void queryClient.invalidateQueries({ queryKey: fileShareKeys.contentHistory(vars.id) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.detail(vars.id) });
    },
  });
}

/** `GET file/fetch`：按 id 或 path 读取文本（有大小上限） */
export async function fetchFileText(input: { id?: number; path?: string }): Promise<string> {
  const raw = await get<unknown>('file/fetch', {
    ...(input.id != null && input.id > 0 ? { id: input.id } : {}),
    ...(input.path?.trim() ? { path: input.path.trim() } : {}),
  });
  return typeof raw === 'string' ? raw : String(raw ?? '');
}

/** `GET file/content/upload`：分片上传完成后覆盖文件内容版本 */
export function useSaveFileContentFromUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; uploadId: string }) =>
      get<FileContentView>('file/content/upload', {
        id: input.id,
        uploadId: input.uploadId,
      }),
    onSuccess: (view, vars) => {
      queryClient.setQueryData(fileShareKeys.content(vars.id), view);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: fileShareKeys.content(vars.id) });
      void queryClient.invalidateQueries({ queryKey: fileShareKeys.contentHistory(vars.id) });
      void queryClient.invalidateQueries({ queryKey: fileKeys.detail(vars.id) });
    },
  });
}

export function isTextLikeFile(file: Pick<FileView, 'type' | 'extension'>): boolean {
  const type = (file.type || '').toLowerCase();
  const ext = (file.extension || '').toLowerCase().replace(/^\./, '');
  if (['txt', 'code', 'document', 'markdown', 'md'].includes(type)) return true;
  return ['txt', 'md', 'markdown', 'json', 'csv', 'log', 'xml', 'html', 'css', 'js', 'ts'].includes(
    ext,
  );
}

export function isImageFile(file: Pick<FileView, 'type' | 'extension'>): boolean {
  const type = (file.type || '').toLowerCase();
  const ext = (file.extension || '').toLowerCase().replace(/^\./, '');
  if (type === 'picture' || type === 'image') return true;
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
}

export function isPdfFile(file: Pick<FileView, 'type' | 'extension'>): boolean {
  const type = (file.type || '').toLowerCase();
  const ext = (file.extension || '').toLowerCase().replace(/^\./, '');
  return type === 'pdf' || ext === 'pdf';
}

/** 鉴权拉取文件二进制（`file/raw`，非信封） */
export async function fetchFileRawBlob(id: number): Promise<Blob> {
  const res = await http.get<Blob>('file/raw', {
    params: { id },
    responseType: 'blob',
    timeout: 120_000,
  });
  return res.data;
}

export function useFileRawBlob(id: number | undefined, enabled = true) {
  return useQuery({
    queryKey: [...fileKeys.all(), 'raw', id ?? 0] as const,
    queryFn: () => fetchFileRawBlob(id!),
    enabled: enabled && typeof id === 'number' && id > 0,
    staleTime: 60_000,
  });
}

export function isOfficeFile(file: Pick<FileView, 'type' | 'extension'>): boolean {
  const type = (file.type || '').toLowerCase();
  const ext = (file.extension || '').toLowerCase().replace(/^\./, '');
  if (['word', 'excel', 'ppt', 'docx', 'xlsx', 'pptx'].includes(type)) return true;
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext);
}

export type OfficeTokenView = {
  token: string;
  documentKey: string;
  mode: string;
  fileType: string;
  documentType: string;
  documentUrl: string;
  callbackUrl: string;
  documentServerUrl: string;
  filename: string;
  jwt: string;
  expiresIn: number;
};

export function useFileTrash(enabled = true) {
  return useQuery({
    queryKey: fileKeys.trash(),
    queryFn: () => get<FileView[]>('file/trash'),
    staleTime: 15_000,
    enabled,
  });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => get<FileView>('file/restore', { id }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: fileKeys.all() });
    },
  });
}

export function useOfficeToken(
  id: number | undefined,
  mode: 'view' | 'edit' = 'view',
  enabled = true,
) {
  return useQuery({
    queryKey: [...fileKeys.all(), 'office', id ?? 0, mode] as const,
    queryFn: () => get<OfficeTokenView>('file/office/token', { id, mode }),
    enabled: enabled && typeof id === 'number' && id > 0,
    staleTime: 60_000,
  });
}

export type FilePackView = {
  packId: string;
  name: string;
  path: string;
  size: number;
};

function asFilePack(raw: Record<string, unknown> | undefined): FilePackView {
  return {
    packId: String(raw?.packId ?? ''),
    name: String(raw?.name ?? 'pack.zip'),
    path: String(raw?.path ?? ''),
    size: Number(raw?.size) || 0,
  };
}

async function assertFileBlobNotEnvelope(blob: Blob, headerType: string): Promise<Blob> {
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

/** `GET file/download/pack?ids=`：创建 zip，返回 pack 元数据 */
export async function createFilePack(ids: number[]): Promise<FilePackView> {
  const unique = [...new Set(ids.filter((id) => id > 0))];
  if (unique.length === 0) {
    throw new ApiError(-1, 'ids required');
  }
  return asFilePack(
    await get<Record<string, unknown>>('file/download/pack', { ids: unique.join(',') }),
  );
}

/** `GET file/download/pack?packId=&download=1`：鉴权拉 zip 二进制 */
export async function downloadFilePackBlob(packId: string): Promise<Blob> {
  const res = await http.get<Blob>('file/download/pack', {
    params: { packId, download: 1 },
    responseType: 'blob',
    timeout: 300_000,
  });
  return assertFileBlobNotEnvelope(res.data, String(res.headers['content-type'] ?? ''));
}

/** 打包所选文件/文件夹并下载 zip */
export function usePackAndDownloadFiles() {
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const meta = await createFilePack(ids);
      if (!meta.packId) {
        throw new ApiError(-1, 'packId missing');
      }
      const blob = await downloadFilePackBlob(meta.packId);
      const name = meta.name.endsWith('.zip') ? meta.name : `${meta.name || 'pack'}.zip`;
      return { blob, name, packId: meta.packId, size: meta.size };
    },
  });
}
