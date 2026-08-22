import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { parseAssistantMatchResult } from '../../src/domains/assistant';
import {
  handleAssistantOperationFrame,
  setAssistantOperationHandler,
} from '../../src/ws/assistant-operation';
import { realtimeClient } from '../../src/ws/client';

describe('parseAssistantMatchResult', () => {
  it('parses matches and strategy', () => {
    expect(
      parseAssistantMatchResult({
        strategy: 'embedding',
        matches: [
          { element: { id: 'a', name: 'Dashboard' }, similarity: 0.9 },
          { element: { name: '' }, similarity: 0.1 },
          null,
        ],
      }),
    ).toEqual({
      strategy: 'embedding',
      matches: [{ element: { id: 'a', name: 'Dashboard' }, similarity: 0.9 }],
    });
  });
});

describe('handleAssistantOperationFrame', () => {
  beforeEach(() => {
    setAssistantOperationHandler(null);
    vi.spyOn(realtimeClient, 'send').mockImplementation(() => {});
  });

  afterEach(() => {
    setAssistantOperationHandler(null);
    vi.restoreAllMocks();
  });

  it('replies get_page_context', async () => {
    handleAssistantOperationFrame({
      type: 'operation',
      data: { requestId: 'r1', action: 'get_page_context', payload: {} },
    });
    await vi.waitFor(() => {
      expect(realtimeClient.send).toHaveBeenCalled();
    });
    const frame = vi.mocked(realtimeClient.send).mock.calls[0]![0] as {
      type: string;
      data: { requestId: string; success: boolean; result: { path: string } };
    };
    expect(frame.type).toBe('operationResult');
    expect(frame.data.requestId).toBe('r1');
    expect(frame.data.success).toBe(true);
    expect(frame.data.result).toHaveProperty('path');
  });

  it('uses custom navigate handler', async () => {
    const navigate = vi.fn();
    setAssistantOperationHandler((action, payload) => {
      if (action !== 'navigate') throw new Error('bad');
      navigate((payload as { path: string }).path);
      return { ok: true };
    });
    handleAssistantOperationFrame({
      type: 'operation',
      data: { requestId: 'r2', action: 'navigate', payload: { path: '/manage/file' } },
    });
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/manage/file'));
    const frame = vi.mocked(realtimeClient.send).mock.calls.at(-1)![0] as {
      data: { success: boolean };
    };
    expect(frame.data.success).toBe(true);
  });
});
