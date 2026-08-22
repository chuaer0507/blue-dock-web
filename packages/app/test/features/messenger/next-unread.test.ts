import { describe, expect, it } from 'vitest';
import type { DialogView } from '@blue-dock/api';
import { findNextUnreadDialog } from '../../../src/features/messenger/next-unread';

function dialog(id: number, unreadCount: number): DialogView {
  return {
    id,
    type: 'user',
    groupType: '',
    name: `d${id}`,
    avatar: '',
    ownerId: 0,
    linkId: 0,
    lastMessage: '',
    lastAt: null,
    unreadCount,
    mentionCount: 0,
    mentionIds: [],
    isTop: 0,
    createdAt: null,
  };
}

describe('findNextUnreadDialog', () => {
  it('returns undefined when none unread', () => {
    expect(findNextUnreadDialog([dialog(1, 0), dialog(2, 0)], 1)).toBeUndefined();
  });

  it('picks first unread when no current', () => {
    expect(findNextUnreadDialog([dialog(1, 0), dialog(2, 3)], undefined)?.id).toBe(2);
  });

  it('skips ahead then wraps', () => {
    const list = [dialog(1, 2), dialog(2, 0), dialog(3, 1)];
    expect(findNextUnreadDialog(list, 1)?.id).toBe(3);
    expect(findNextUnreadDialog(list, 3)?.id).toBe(1);
  });

  it('lands on sole unread even if current', () => {
    expect(findNextUnreadDialog([dialog(1, 0), dialog(2, 5)], 2)?.id).toBe(2);
  });
});
