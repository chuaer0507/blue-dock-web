/** 本机分片上传会话索引（续传；不跨设备） */

export type UploadScene = 'file_cabinet' | 'project_task';

export type UploadSessionRecord = {
  uploadId: string;
  hash: string;
  size: number;
  name: string;
  scene: UploadScene;
  parentId: number;
  taskId: number;
  chunkSize: number;
  chunkCount: number;
  received: number[];
  updatedAt: number;
};

const STORAGE_KEY = 'blue-dock:upload-sessions';
/** 与服务端会话 TTL 对齐（24h） */
const TTL_MS = 24 * 60 * 60 * 1000;

export function uploadSessionKey(input: {
  hash: string;
  size: number;
  scene: UploadScene;
  parentId?: number | null;
  taskId?: number | null;
}): string {
  const parentId = input.parentId == null || input.parentId === 0 ? 0 : input.parentId;
  const taskId = input.taskId == null || input.taskId === 0 ? 0 : input.taskId;
  return `${input.scene}:${input.hash}:${input.size}:${parentId}:${taskId}`;
}

function readAll(): Record<string, UploadSessionRecord> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, UploadSessionRecord>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, UploadSessionRecord>) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode — 忽略，续传降级
  }
}

export function getUploadSession(key: string): UploadSessionRecord | null {
  const map = readAll();
  const row = map[key];
  if (!row) return null;
  if (Date.now() - row.updatedAt > TTL_MS) {
    delete map[key];
    writeAll(map);
    return null;
  }
  return row;
}

export function putUploadSession(record: UploadSessionRecord): void {
  const key = uploadSessionKey(record);
  const map = readAll();
  map[key] = { ...record, updatedAt: Date.now() };
  writeAll(map);
}

export function clearUploadSession(key: string): void {
  const map = readAll();
  if (!(key in map)) return;
  delete map[key];
  writeAll(map);
}

export function clearUploadSessionById(uploadId: string): void {
  const map = readAll();
  let changed = false;
  for (const [k, v] of Object.entries(map)) {
    if (v.uploadId === uploadId) {
      delete map[k];
      changed = true;
    }
  }
  if (changed) writeAll(map);
}
