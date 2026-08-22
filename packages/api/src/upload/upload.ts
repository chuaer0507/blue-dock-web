import { get, post, upload } from '../http-api';
import type { FileView } from '../domains/file';
import { md5Hex } from './md5';
import {
  clearUploadSession,
  clearUploadSessionById,
  getUploadSession,
  putUploadSession,
  uploadSessionKey,
  type UploadScene,
  type UploadSessionRecord,
} from './resume-store';

export type { UploadScene } from './resume-store';

export type UploadInitView = {
  done: boolean;
  uploadId: string;
  chunkSize: number;
  chunkCount: number;
  received: number[];
  file: FileView | null;
};

export type UploadChunkView = {
  uploadId: string;
  received: number[];
};

export type UploadMergeView = {
  scene: UploadScene | string;
  file: FileView | null;
  taskFile: unknown | null;
};

export type UploadCabinetInput = {
  file: File;
  parentId?: number | null;
  /** 并发分片数，默认 3 */
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
  /** 会话 uploadId（可用于取消）；结束时回 null */
  onSession?: (uploadId: string | null) => void;
};

export type UploadTaskInput = UploadCabinetInput & {
  taskId: number;
};

async function initUpload(params: {
  hash: string;
  size: number;
  name: string;
  scene: UploadScene;
  parentId?: number | null;
  taskId?: number;
}): Promise<UploadInitView> {
  return post<UploadInitView>('upload/init', undefined, {
    config: {
      params: {
        hash: params.hash,
        size: params.size,
        name: params.name,
        scene: params.scene,
        ...(params.parentId == null || params.parentId === 0 ? {} : { parentId: params.parentId }),
        ...(params.taskId == null ? {} : { taskId: params.taskId }),
      },
    },
  });
}

async function postChunk(
  uploadId: string,
  index: number,
  blob: Blob,
  signal?: AbortSignal,
): Promise<UploadChunkView> {
  return upload<UploadChunkView>('upload/chunk', blob, {
    fieldName: 'blob',
    fields: { uploadId, index },
    config: { signal, timeout: 120_000 },
  });
}

async function mergeUpload(uploadId: string, signal?: AbortSignal): Promise<UploadMergeView> {
  return post<UploadMergeView>('upload/merge', undefined, {
    config: { params: { uploadId }, signal },
  });
}

export async function cancelUpload(uploadId: string): Promise<void> {
  await post<void>('upload/cancel', undefined, {
    config: { params: { uploadId } },
  });
  clearUploadSessionById(uploadId);
}

async function runPool(
  indexes: number[],
  concurrency: number,
  worker: (index: number) => Promise<void>,
) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, indexes.length) }, async () => {
    while (cursor < indexes.length) {
      const i = cursor;
      cursor += 1;
      await worker(indexes[i]!);
    }
  });
  await Promise.all(runners);
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

/** 仅上传分片、不 merge；供 `file/content/upload` 覆盖已有文件 */
export type UploadSessionResult =
  | { kind: 'instant'; file: FileView | null }
  | { kind: 'session'; uploadId: string };

async function uploadFile(input: {
  file: File;
  scene: UploadScene;
  parentId?: number | null;
  taskId?: number;
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
  onSession?: (uploadId: string | null) => void;
  /** `merge` 走 upload/merge；`session` 停在分片齐备，交给 content/upload */
  finalize?: 'merge' | 'session';
}): Promise<UploadMergeView | UploadSessionResult> {
  const { file, scene, parentId, taskId, signal, onProgress, onSession } = input;
  const finalize = input.finalize ?? 'merge';
  const concurrency = Math.max(1, input.concurrency ?? 3);
  const parent = parentId == null || parentId === 0 ? 0 : parentId;
  const tid = taskId == null || taskId === 0 ? 0 : taskId;

  onProgress?.(0.02);
  const hash = await md5Hex(file);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const key = uploadSessionKey({ hash, size: file.size, scene, parentId: parent, taskId: tid });
  let session = getUploadSession(key);

  onProgress?.(0.08);

  let uploadId: string;
  let chunkSize: number;
  let chunkCount: number;
  let received = new Set<number>();

  if (
    session &&
    session.hash === hash &&
    session.size === file.size &&
    session.chunkCount > 0 &&
    session.chunkSize > 0
  ) {
    uploadId = session.uploadId;
    chunkSize = session.chunkSize;
    chunkCount = session.chunkCount;
    received = new Set(session.received ?? []);
    onSession?.(uploadId);
  } else {
    const init = await initUpload({
      hash,
      size: file.size,
      name: file.name,
      scene,
      parentId: parent,
      taskId: tid || undefined,
    });

    if (init.done) {
      clearUploadSession(key);
      onSession?.(null);
      onProgress?.(1);
      if (finalize === 'session') {
        return { kind: 'instant', file: init.file };
      }
      return { scene: 'file_cabinet', file: init.file, taskFile: null };
    }

    uploadId = init.uploadId;
    chunkSize = init.chunkSize;
    chunkCount = init.chunkCount;
    received = new Set(init.received ?? []);
    onSession?.(uploadId);

    session = {
      uploadId,
      hash,
      size: file.size,
      name: file.name,
      scene,
      parentId: parent,
      taskId: tid,
      chunkSize,
      chunkCount,
      received: [...received],
      updatedAt: Date.now(),
    };
    putUploadSession(session);
  }

  const indexes = Array.from({ length: chunkCount }, (_, i) => i).filter((i) => !received.has(i));
  let completed = received.size;
  onProgress?.(0.08 + (0.9 * completed) / Math.max(chunkCount, 1));

  const persistReceived = (next: Set<number>) => {
    const row: UploadSessionRecord = {
      uploadId,
      hash,
      size: file.size,
      name: file.name,
      scene,
      parentId: parent,
      taskId: tid,
      chunkSize,
      chunkCount,
      received: [...next].sort((a, b) => a - b),
      updatedAt: Date.now(),
    };
    putUploadSession(row);
  };

  try {
    await runPool(indexes, concurrency, async (index) => {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      try {
        const view = await postChunk(uploadId, index, file.slice(start, end), signal);
        for (const r of view.received ?? []) received.add(r);
        received.add(index);
      } catch (err) {
        // 会话过期：清索引后抛出，由上层重试新会话
        if (!isAbortError(err)) {
          clearUploadSession(key);
          onSession?.(null);
        }
        throw err;
      }
      completed = received.size;
      persistReceived(received);
      const ratio = 0.08 + (0.9 * completed) / Math.max(chunkCount, 1);
      onProgress?.(Math.min(0.98, ratio));
    });

    if (finalize === 'session') {
      clearUploadSession(key);
      onProgress?.(1);
      return { kind: 'session', uploadId };
    }

    const merged = await mergeUpload(uploadId, signal);
    clearUploadSession(key);
    onSession?.(null);
    onProgress?.(1);
    return merged;
  } catch (err) {
    if (isAbortError(err)) {
      // 保留索引以便续传；主动 cancel 由 cancelUpload 清索引
      throw err;
    }
    throw err;
  }
}

/** 网盘分片上传（含秒传 / 本机续传） */
export function uploadCabinetFile(input: UploadCabinetInput): Promise<UploadMergeView> {
  return uploadFile({ ...input, scene: 'file_cabinet' }) as Promise<UploadMergeView>;
}

/**
 * 网盘分片上传到齐备会话（不 merge）。
 * 随后应调用 `file/content/upload`（`useSaveFileContentFromUpload`）覆盖目标文件。
 */
export function uploadCabinetSession(input: UploadCabinetInput): Promise<UploadSessionResult> {
  return uploadFile({ ...input, scene: 'file_cabinet', finalize: 'session' }) as Promise<UploadSessionResult>;
}

/** 任务附件分片上传（含本机续传） */
export function uploadTaskFile(input: UploadTaskInput): Promise<UploadMergeView> {
  return uploadFile({ ...input, scene: 'project_task', taskId: input.taskId }) as Promise<UploadMergeView>;
}

export {
  uploadSessionKey,
  getUploadSession,
  clearUploadSession,
  clearUploadSessionById,
} from './resume-store';
