import type { QueryClient } from '@tanstack/react-query';
import { getAccessToken } from '../auth/session';
import { dialogKeys, type DialogMessageView } from '../domains/dialog';

const MAX_ACTIVE_STREAMS = 10;

const activeByUrl = new Map<string, AbortController>();

/** 将相对 streamUrl 解析为可请求的绝对/同源 URL */
export function resolveDialogStreamUrl(streamUrl: string): string {
  const raw = streamUrl.trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

/** 将流式 chunk 写入消息 body（兼容 `{text}` JSON 与纯文本） */
export function applyStreamChunkToBody(
  body: string,
  chunk: string,
  mode: 'append' | 'replace',
): string {
  const text = chunk ?? '';
  try {
    const parsed = JSON.parse(body) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'text' in parsed) {
      const obj = parsed as Record<string, unknown>;
      const prev = String(obj.text ?? '');
      return JSON.stringify({
        ...obj,
        text: mode === 'replace' ? text : prev + text,
      });
    }
  } catch {
    // plain
  }
  return mode === 'replace' ? text : `${body || ''}${text}`;
}

/** 按 messageId 补丁所有已缓存会话消息列表 */
export function patchDialogMessageStreamContent(
  queryClient: QueryClient,
  messageId: number,
  content: string,
  mode: 'append' | 'replace',
): boolean {
  if (!Number.isFinite(messageId) || messageId <= 0) return false;
  let hit = false;
  const entries = queryClient.getQueriesData<DialogMessageView[]>({
    queryKey: [...dialogKeys.all(), 'messages'],
  });
  for (const [key, list] of entries) {
    if (!list?.some((m) => m.id === messageId)) continue;
    hit = true;
    queryClient.setQueryData<DialogMessageView[]>(key, (old) =>
      (old ?? []).map((m) => {
        if (m.id !== messageId) return m;
        return { ...m, body: applyStreamChunkToBody(m.body, content, mode) };
      }),
    );
  }
  return hit;
}

type StreamHandlers = {
  onChunk: (ev: { mode: 'append' | 'replace'; messageId: number; content: string }) => void;
  onDone: (error?: string) => void;
};

/**
 * 消费对话流式 SSE（`append` / `replace` / `done`）。
 * `id` 字段为 messageId；路径可为 `/ai…` 同源或绝对 URL。
 */
export async function consumeDialogMessageStream(
  streamUrl: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const url = resolveDialogStreamUrl(streamUrl);
  if (!url) {
    handlers.onDone('empty streamUrl');
    return;
  }

  const token = getAccessToken();
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  if (!res.ok || !res.body) {
    handlers.onDone(`HTTP ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let eventId = '';
  let finished = false;

  const finish = (error?: string) => {
    if (finished) return;
    finished = true;
    handlers.onDone(error);
  };

  const flushBlock = (block: string) => {
    const lines = block.split('\n');
    const dataLines: string[] = [];
    let ev = eventName;
    let id = eventId;
    for (const line of lines) {
      if (line.startsWith('event:')) {
        ev = line.slice(6).trim();
      } else if (line.startsWith('id:')) {
        id = line.slice(3).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    eventName = 'message';
    eventId = id;

    if (ev === 'done') {
      let err: string | undefined;
      if (dataLines.length) {
        try {
          const parsed = JSON.parse(dataLines.join('\n')) as { error?: string };
          err = parsed.error;
        } catch {
          // ignore
        }
      }
      finish(err);
      return;
    }

    if ((ev !== 'append' && ev !== 'replace') || dataLines.length === 0) return;
    const messageId = Number(id);
    if (!Number.isFinite(messageId) || messageId <= 0) return;

    const data = dataLines.join('\n');
    let content = '';
    try {
      const parsed = JSON.parse(data) as { content?: string };
      content = String(parsed.content ?? '');
    } catch {
      content = data;
    }
    if (!content && ev === 'append') return;
    handlers.onChunk({ mode: ev, messageId, content });
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const block of parts) {
        if (block.trim()) flushBlock(block);
        if (finished) return;
      }
    }
    if (buffer.trim()) flushBlock(buffer);
    finish();
  } catch (err) {
    if (signal?.aborted) {
      finish();
      return;
    }
    finish(err instanceof Error ? err.message : 'stream failed');
  }
}

/**
 * 订阅对话流（去重；最多同时 10 路）。返回取消函数。
 */
export function subscribeDialogMessageStream(
  streamUrl: string,
  queryClient: QueryClient,
): () => void {
  const key = streamUrl.trim();
  if (!key) return () => undefined;

  const existing = activeByUrl.get(key);
  if (existing) {
    return () => {
      existing.abort();
      activeByUrl.delete(key);
    };
  }

  while (activeByUrl.size >= MAX_ACTIVE_STREAMS) {
    const oldest = activeByUrl.keys().next().value;
    if (!oldest) break;
    activeByUrl.get(oldest)?.abort();
    activeByUrl.delete(oldest);
  }

  const ac = new AbortController();
  activeByUrl.set(key, ac);

  void consumeDialogMessageStream(
    key,
    {
      onChunk: ({ mode, messageId, content }) => {
        patchDialogMessageStreamContent(queryClient, messageId, content, mode);
      },
      onDone: () => {
        activeByUrl.delete(key);
      },
    },
    ac.signal,
  ).finally(() => {
    activeByUrl.delete(key);
  });

  return () => {
    ac.abort();
    activeByUrl.delete(key);
  };
}

/** @internal 测试用 */
export function __resetDialogMessageStreamsForTest() {
  for (const ac of activeByUrl.values()) ac.abort();
  activeByUrl.clear();
}
