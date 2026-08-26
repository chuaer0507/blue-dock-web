import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  applyDialogMessagesLatest,
  asDialogMessageDetail,
  collectDialogLatestCursors,
  dialogKeys,
  previewMessageBody,
  type DialogMessageView,
} from '../../src/domains/dialog';

describe('dialogKeys', () => {
  it('builds factories', () => {
    expect(dialogKeys.list()).toEqual(['dialogs', 'list']);
    expect(dialogKeys.beyond()).toEqual(['dialogs', 'beyond']);
    expect(dialogKeys.search('hi', 10)).toEqual(['dialogs', 'search', 'hi', 10]);
    expect(dialogKeys.messages(8)).toEqual(['dialogs', 'messages', 8]);
    expect(dialogKeys.one(4)).toEqual(['dialogs', 'one', 4]);
    expect(dialogKeys.translation(9, 'zh-CN')).toEqual(['dialogs', 'translation', 9, 'zh-CN']);
    expect(dialogKeys.messageBlob(11)).toEqual(['dialogs', 'messageBlob', 11]);
    expect(dialogKeys.mergeDetail(12)).toEqual(['dialogs', 'mergeDetail', 12]);
    expect(dialogKeys.unread()).toEqual(['dialogs', 'unread']);
    expect(dialogKeys.sessions(3)).toEqual(['dialogs', 'sessions', 3]);
    expect(dialogKeys.messageDetail(15)).toEqual(['dialogs', 'messageDetail', 15]);
  });
});

describe('previewMessageBody', () => {
  it('reads text from JSON body', () => {
    expect(previewMessageBody('{"text":"hello"}')).toBe('hello');
    expect(previewMessageBody('plain')).toBe('plain');
  });

  it('reads notice from JSON body', () => {
    expect(previewMessageBody('{"notice":"announcement","source":"web"}')).toBe('announcement');
  });

  it('reads title from template JSON body', () => {
    expect(previewMessageBody('{"type":"content","title":"Card","content":[]}')).toBe('Card');
  });
});

function msg(
  partial: Partial<DialogMessageView> & { id: number; dialogId: number },
): DialogMessageView {
  return {
    userId: 1,
    type: 'text',
    body: '',
    replyId: 0,
    tagUserId: 0,
    createdAt: null,
    ...partial,
  };
}

describe('collectDialogLatestCursors / applyDialogMessagesLatest', () => {
  it('collects up to 5 cursors by max message id', () => {
    const qc = new QueryClient();
    qc.setQueryData(dialogKeys.messages(1), [
      msg({ id: 10, dialogId: 1 }),
      msg({ id: 12, dialogId: 1 }),
    ]);
    qc.setQueryData(dialogKeys.messages(2), [msg({ id: 5, dialogId: 2 })]);
    qc.setQueryData(dialogKeys.messages(3), []);

    const cursors = collectDialogLatestCursors(qc, 5);
    expect(cursors).toEqual(
      expect.arrayContaining([
        { dialogId: 1, latestId: 12 },
        { dialogId: 2, latestId: 5 },
      ]),
    );
    expect(cursors).toHaveLength(2);
  });

  it('merges latest messages into per-dialog caches', () => {
    const qc = new QueryClient();
    qc.setQueryData(dialogKeys.messages(1), [msg({ id: 10, dialogId: 1 })]);
    const n = applyDialogMessagesLatest(qc, [
      msg({ id: 11, dialogId: 1, body: 'a' }),
      msg({ id: 20, dialogId: 2, body: 'b' }),
    ]);
    expect(n).toBe(2);
    expect(qc.getQueryData<DialogMessageView[]>(dialogKeys.messages(1))?.map((m) => m.id)).toEqual([
      10, 11,
    ]);
    expect(qc.getQueryData<DialogMessageView[]>(dialogKeys.messages(2))?.map((m) => m.id)).toEqual([
      20,
    ]);
  });
});

describe('asDialogMessageDetail', () => {
  it('maps file meta for attachments', () => {
    expect(
      asDialogMessageDetail({
        id: 5,
        dialogId: 9,
        userId: 1,
        type: 'file',
        body: '{}',
        replyId: 0,
        createdAt: '2026-08-14T00:00:00',
        updatedAt: '2026-08-14T00:01:00',
        file: {
          id: 77,
          name: 'a.pdf',
          type: 'file',
          extension: 'pdf',
          size: 1024,
          path: '/a.pdf',
          userId: 1,
        },
      }),
    ).toMatchObject({
      id: 5,
      dialogId: 9,
      type: 'file',
      file: { id: 77, name: 'a.pdf', extension: 'pdf', size: 1024 },
    });
  });

  it('nulls invalid file', () => {
    expect(asDialogMessageDetail({ id: 1, file: { id: 0 } }).file).toBeNull();
  });
});
