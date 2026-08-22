import { describe, expect, it, afterEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { dialogKeys, type DialogMessageView } from '../../src/domains/dialog';
import {
  __resetDialogMessageStreamsForTest,
  applyStreamChunkToBody,
  patchDialogMessageStreamContent,
  resolveDialogStreamUrl,
} from '../../src/ws/dialog-message-stream';
import { createDefaultFrameHandler } from '../../src/ws/handlers';

afterEach(() => {
  __resetDialogMessageStreamsForTest();
});

describe('resolveDialogStreamUrl', () => {
  it('keeps absolute urls', () => {
    expect(resolveDialogStreamUrl('https://x.test/ai/s')).toBe('https://x.test/ai/s');
  });

  it('prefixes origin for relative paths', () => {
    const url = resolveDialogStreamUrl('/ai/stream/x');
    expect(url.endsWith('/ai/stream/x')).toBe(true);
    expect(url.startsWith('http')).toBe(true);
  });
});

describe('applyStreamChunkToBody', () => {
  it('appends into text json', () => {
    expect(applyStreamChunkToBody('{"text":"hi"}', '!', 'append')).toBe('{"text":"hi!"}');
  });

  it('replaces text json', () => {
    expect(applyStreamChunkToBody('{"text":"hi"}', 'yo', 'replace')).toBe('{"text":"yo"}');
  });

  it('appends plain text', () => {
    expect(applyStreamChunkToBody('ab', 'c', 'append')).toBe('abc');
  });
});

describe('patchDialogMessageStreamContent', () => {
  it('patches matching message body', () => {
    const qc = new QueryClient();
    const msg: DialogMessageView = {
      id: 9,
      dialogId: 1,
      userId: 2,
      type: 'text',
      body: '{"text":""}',
      replyId: 0,
      tagUserId: 0,
      createdAt: null,
    };
    qc.setQueryData(dialogKeys.messages(1), [msg]);
    expect(patchDialogMessageStreamContent(qc, 9, 'A', 'append')).toBe(true);
    expect(qc.getQueryData<DialogMessageView[]>(dialogKeys.messages(1))?.[0]?.body).toBe(
      '{"text":"A"}',
    );
  });
});

describe('createDefaultFrameHandler stream', () => {
  it('does not invalidate dialog keys on stream frame', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(qc, 'invalidateQueries');
    const handle = createDefaultFrameHandler(qc);
    handle({ type: 'dialog.message.stream', data: { streamUrl: '' } });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
