import { describe, expect, it } from 'vitest';
import { asDialogMessageTodo } from '../../src/domains/dialog';

describe('asDialogMessageTodo', () => {
  it('parses todo row', () => {
    expect(
      asDialogMessageTodo({
        id: 1,
        messageId: 9,
        dialogId: 3,
        userId: 2,
        remindAt: null,
        doneAt: null,
        createdAt: '2026-01-01T00:00:00',
      }),
    ).toEqual({
      id: 1,
      messageId: 9,
      dialogId: 3,
      userId: 2,
      remindAt: null,
      doneAt: null,
      createdAt: '2026-01-01T00:00:00',
    });
  });
});
