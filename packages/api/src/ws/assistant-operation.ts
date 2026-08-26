import type { RealtimeFrame } from './types';
import { realtimeClient } from './client';

export type AssistantOperationPayload = {
  requestId?: string;
  action?: string;
  payload?: unknown;
  fd?: string;
};

export type AssistantOperationCustomHandler = (
  action: string,
  payload: unknown,
) => Promise<unknown> | unknown;

let customHandler: AssistantOperationCustomHandler | null = null;

/**
 * 注册应用侧自定义操作（如 `navigate`）。
 * 内置已处理 `get_page_context`；未注册且未知 action 时回包失败。
 */
export function setAssistantOperationHandler(
  handler: AssistantOperationCustomHandler | null,
): void {
  customHandler = handler;
}

function pageContext(): Record<string, string> {
  if (typeof window === 'undefined') {
    return { path: '', href: '', title: '' };
  }
  return {
    path: window.location.pathname,
    href: window.location.href,
    title: typeof document !== 'undefined' ? document.title : '',
  };
}

function replyOperationResult(input: {
  requestId: string;
  success: boolean;
  result?: unknown;
  error?: string | null;
}): void {
  realtimeClient.send({
    type: 'operationResult',
    data: {
      requestId: input.requestId,
      success: input.success,
      result: input.result ?? null,
      error: input.error ?? null,
    },
  });
}

async function runAction(action: string, payload: unknown): Promise<unknown> {
  if (action === 'get_page_context') {
    return pageContext();
  }
  if (customHandler) {
    return customHandler(action, payload);
  }
  throw new Error(`unsupported action: ${action}`);
}

/** 处理下行 `operation`：执行本端能力并上行 `operationResult` */
export function handleAssistantOperationFrame(frame: RealtimeFrame): void {
  if (frame.type !== 'operation') return;
  const data = (frame.data ?? {}) as AssistantOperationPayload;
  const requestId = String(data.requestId ?? '').trim();
  const action = String(data.action ?? '').trim();
  if (!requestId || !action) return;

  void (async () => {
    try {
      const result = await runAction(action, data.payload ?? {});
      replyOperationResult({ requestId, success: true, result });
    } catch (err) {
      replyOperationResult({
        requestId,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}
