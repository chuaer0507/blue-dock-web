import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';
import { env } from '../env';
import { getAccessToken } from '../auth/session';

export type AssistantChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type AssistantModelOption = {
  id: string;
  name: string;
  provider: string;
};

export type AssistantAuthResult = {
  streamKey: string;
};

export type AssistantSessionView = {
  /** 即 sessionId */
  id: string;
  title: string;
  /** 会话消息体（save 时写入的 data） */
  responses?: unknown;
  images?: Record<string, string>;
  sceneKey?: string;
  createdAt?: number | string | null;
  updatedAt?: number | string | null;
};

export const assistantKeys = {
  all: () => ['assistant'] as const,
  models: () => [...assistantKeys.all(), 'models'] as const,
  sessions: (sessionKey: string) => [...assistantKeys.all(), 'sessions', sessionKey] as const,
};

/** 将 `assistant/models` 返回的 `*Models` / `*Model` 展平为选项列表 */
export function flattenAssistantModels(
  raw: Record<string, unknown> | undefined,
): AssistantModelOption[] {
  if (!raw) return [];
  const out: AssistantModelOption[] = [];
  const seen = new Set<string>();

  for (const [key, value] of Object.entries(raw)) {
    if (key.endsWith('Models') && Array.isArray(value)) {
      const provider = key.slice(0, -'Models'.length) || 'default';
      for (const item of value) {
        const id = typeof item === 'string' ? item : String((item as { id?: unknown })?.id ?? '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const name =
          typeof item === 'object' && item && 'name' in item
            ? String((item as { name: unknown }).name || id)
            : id;
        out.push({ id, name, provider });
      }
    } else if (
      key.endsWith('Model') &&
      key !== 'embeddingModel' &&
      typeof value === 'string' &&
      value.trim()
    ) {
      const id = value.trim();
      if (seen.has(id)) continue;
      seen.add(id);
      const provider = key.slice(0, -'Model'.length) || 'default';
      out.push({ id, name: id, provider });
    }
  }

  return out;
}

export function useAssistantModels(enabled = true) {
  return useQuery({
    queryKey: assistantKeys.models(),
    queryFn: () => get<Record<string, unknown>>('assistant/models'),
    staleTime: 60_000,
    enabled,
  });
}

export type AssistantAuthInput = {
  modelName?: string;
  modelType?: string;
  context: AssistantChatMessage[];
  locale?: string;
  sessionId?: string;
};

export function useAssistantAuth() {
  return useMutation({
    mutationFn: (input: AssistantAuthInput) => post<AssistantAuthResult>('assistant/auth', input),
  });
}

export function useAssistantSessions(sessionKey: string, enabled = false) {
  return useQuery({
    queryKey: assistantKeys.sessions(sessionKey),
    queryFn: (): Promise<AssistantSessionView[]> =>
      post<AssistantSessionView[]>('assistant/session/list', { sessionKey }),
    enabled: enabled && Boolean(sessionKey),
    staleTime: 15_000,
  });
}

export type SaveAssistantSessionInput = {
  sessionKey: string;
  sessionId: string;
  title?: string;
  data?: unknown;
  sceneKey?: string;
  /** 新配图：id → dataUrl / base64 / 已有 URL；单次 ≤20 */
  newImages?: Record<string, string>;
};

export function useSaveAssistantSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveAssistantSessionInput) => {
      const { newImages, ...rest } = input;
      return post<Record<string, unknown>>('assistant/session/save', {
        ...rest,
        ...(newImages && Object.keys(newImages).length ? { newImages } : {}),
      });
    },
    onSettled: (_d, _e, vars) => {
      void qc.invalidateQueries({ queryKey: assistantKeys.sessions(vars.sessionKey) });
    },
  });
}

export function useDeleteAssistantSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { sessionKey: string; sessionId?: string; clearAll?: boolean }) =>
      post<void>('assistant/session/delete', input),
    onSettled: (_d, _e, vars) => {
      void qc.invalidateQueries({ queryKey: assistantKeys.sessions(vars.sessionKey) });
    },
  });
}

export type AssistantFeedbackValue = 'like' | 'dislike' | '';

export type AssistantFeedbackInput = {
  sessionKey: string;
  sessionId: string;
  /** 会话内助手回复序号，须 > 0 */
  localId: number;
  /** `like` / `dislike`；空字符串取消 */
  feedback: AssistantFeedbackValue;
  prompt?: string;
  answer?: string;
  model?: string;
  sourceIds?: unknown[];
};

export type AssistantFeedbackResult = {
  feedback: AssistantFeedbackValue;
};

/** `POST assistant/feedback/save`：赞 / 踩 / 取消 */
export function useSaveAssistantFeedback() {
  return useMutation({
    mutationFn: async (input: AssistantFeedbackInput) => {
      const raw = await post<Record<string, unknown>>('assistant/feedback/save', {
        sessionKey: input.sessionKey,
        sessionId: input.sessionId,
        localId: input.localId,
        feedback: input.feedback,
        ...(input.prompt != null ? { prompt: input.prompt } : {}),
        ...(input.answer != null ? { answer: input.answer } : {}),
        ...(input.model != null ? { model: input.model } : {}),
        ...(input.sourceIds != null ? { sourceIds: input.sourceIds } : {}),
      });
      const fb = String(raw.feedback ?? '');
      return {
        feedback: fb === 'like' || fb === 'dislike' ? fb : '',
      } satisfies AssistantFeedbackResult;
    },
  });
}

export type AssistantMatchElement = {
  id?: string | number;
  name: string;
  [key: string]: unknown;
};

export type AssistantMatchHit = {
  element: AssistantMatchElement;
  similarity: number;
};

export type AssistantMatchResult = {
  matches: AssistantMatchHit[];
  strategy: 'embedding' | 'lexical' | string;
};

/** 解析 `assistant/matchElements` 响应 */
export function parseAssistantMatchResult(raw: unknown): AssistantMatchResult {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rows = Array.isArray(obj.matches) ? obj.matches : [];
  const matches: AssistantMatchHit[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const el = r.element;
    if (!el || typeof el !== 'object') continue;
    const element = el as AssistantMatchElement;
    if (!String(element.name ?? '').trim()) continue;
    matches.push({
      element,
      similarity: Number(r.similarity) || 0,
    });
  }
  return {
    matches,
    strategy: String(obj.strategy ?? 'lexical'),
  };
}

/** `POST assistant/matchElements`：页面元素匹配 */
export async function matchAssistantElements(input: {
  query: string;
  elements: AssistantMatchElement[];
  topK?: number;
}): Promise<AssistantMatchResult> {
  return parseAssistantMatchResult(
    await post<unknown>('assistant/matchElements', {
      query: input.query.trim(),
      elements: input.elements,
      ...(input.topK != null ? { topK: input.topK } : {}),
    }),
  );
}

export type AssistantSearchLogInput = {
  query: string;
  locale?: string;
  source?: string;
  contextKey?: string;
  dialogId?: number;
  sourceIds?: unknown[];
  topScore?: number;
  resultCount?: number;
  durationMs?: number;
};

/** `POST assistant/log/search`：知识库 / 匹配检索日志（失败忽略） */
export async function logAssistantSearch(input: AssistantSearchLogInput): Promise<void> {
  await post<void>('assistant/log/search', {
    query: input.query,
    ...(input.locale != null ? { locale: input.locale } : {}),
    ...(input.source != null ? { source: input.source } : {}),
    ...(input.contextKey != null ? { contextKey: input.contextKey } : {}),
    ...(input.dialogId != null ? { dialogId: input.dialogId } : {}),
    ...(input.sourceIds != null ? { sourceIds: input.sourceIds } : {}),
    ...(input.topScore != null ? { topScore: input.topScore } : {}),
    ...(input.resultCount != null ? { resultCount: input.resultCount } : {}),
    ...(input.durationMs != null ? { durationMs: input.durationMs } : {}),
  });
}

export type AssistantOperationDispatchResult = {
  requestId: string;
};

export type AssistantOperationPollResult = {
  status: 'pending' | 'ready' | string;
  success?: boolean;
  result?: unknown;
  error?: string | null;
};

/** `POST assistant/operation/dispatch`：经 WS 向本端派发操作 */
export async function dispatchAssistantOperation(input: {
  action: string;
  payload?: unknown;
  fd?: string;
}): Promise<AssistantOperationDispatchResult> {
  const raw = await post<Record<string, unknown>>('assistant/operation/dispatch', {
    action: input.action.trim(),
    ...(input.payload !== undefined ? { payload: input.payload } : {}),
    ...(input.fd ? { fd: input.fd } : {}),
  });
  return { requestId: String(raw.requestId ?? '') };
}

/** `GET assistant/operation/result`：轮询操作结果（ready 时服务端取走即删） */
export async function fetchAssistantOperationResult(
  requestId: string,
): Promise<AssistantOperationPollResult> {
  const raw = await get<Record<string, unknown>>('assistant/operation/result', { requestId });
  return {
    status: String(raw.status ?? 'pending'),
    success: raw.success == null ? undefined : Boolean(raw.success),
    result: raw.result,
    error: raw.error == null ? null : String(raw.error),
  };
}

/** 轮询直至 ready 或超时 */
export async function pollAssistantOperationResult(
  requestId: string,
  opts?: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal },
): Promise<AssistantOperationPollResult> {
  const intervalMs = opts?.intervalMs ?? 400;
  const timeoutMs = opts?.timeoutMs ?? 15_000;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (opts?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const row = await fetchAssistantOperationResult(requestId);
    if (row.status !== 'pending') return row;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { status: 'pending' };
}

/** 将 session.responses 解析为聊天消息 */
export function parseAssistantResponses(raw: unknown): AssistantChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: AssistantChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = String((item as { role?: unknown }).role ?? '');
    const content = String((item as { content?: unknown }).content ?? '');
    if (role !== 'user' && role !== 'assistant' && role !== 'system') continue;
    if (!content) continue;
    out.push({ role, content });
  }
  return out;
}

export type StreamAssistantHandlers = {
  onAppend: (chunk: string) => void;
  onDone: (error?: string) => void;
  signal?: AbortSignal;
};

/**
 * 消费一次性 streamKey 的 SSE：`append` / `done`。
 * 路径相对站点根：`/api/ai/invoke/stream/{streamKey}`（匿名，靠 key）。
 */
export async function streamAssistantInvoke(
  streamKey: string,
  handlers: StreamAssistantHandlers,
): Promise<void> {
  const base = env.apiBaseUrl.replace(/\/$/, '');
  const url = `${base}/ai/invoke/stream/${encodeURIComponent(streamKey)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      // 部分网关仍校验；契约上可不需要
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
    },
    signal: handlers.signal,
  });

  if (!res.ok || !res.body) {
    handlers.onDone(`HTTP ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
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
    for (const line of lines) {
      if (line.startsWith('event:')) {
        ev = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length === 0) return;
    const data = dataLines.join('\n');
    try {
      const parsed = JSON.parse(data) as { content?: string; error?: string };
      if (ev === 'append' && parsed.content) {
        handlers.onAppend(parsed.content);
      } else if (ev === 'done') {
        finish(parsed.error);
      }
    } catch {
      if (ev === 'append' && data) handlers.onAppend(data);
      if (ev === 'done') finish();
    }
    eventName = 'message';
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const block of parts) {
      if (block.trim()) flushBlock(block);
    }
  }
  if (buffer.trim()) flushBlock(buffer);
  finish();
}
