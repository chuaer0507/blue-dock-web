import { describe, expect, it } from 'vitest';
import { dialogBadgeKind, dialogBotKeys, dialogMatchesFilter } from '../../src/domains/dialog-bot';
import type { DialogView } from '../../src/domains/dialog';

function dialog(partial: Partial<DialogView> & Pick<DialogView, 'id'>): DialogView {
  return {
    type: 'group',
    groupType: 'user',
    name: '',
    avatar: '',
    ownerId: 0,
    linkId: 0,
    lastMessage: '',
    lastAt: null,
    unreadCount: 0,
    mentionCount: 0,
    mentionIds: [],
    isTop: 0,
    createdAt: null,
    ...partial,
  };
}

describe('dialogBotKeys', () => {
  it('builds factories', () => {
    expect(dialogBotKeys.userIds()).toEqual(['dialogs', 'bot', 'userIds']);
  });
});

describe('dialogBadgeKind', () => {
  it('marks enriched user dm as bot', () => {
    const d = dialog({ id: 9, type: 'user', groupType: '' });
    expect(dialogBadgeKind(d)).toBe('user');
    expect(dialogBadgeKind(d, new Set([9]))).toBe('bot');
  });

  it('keeps task/project/okr kinds', () => {
    expect(dialogBadgeKind(dialog({ id: 1, type: 'group', groupType: 'task' }))).toBe('task');
    expect(dialogBadgeKind(dialog({ id: 2, type: 'group', groupType: 'project' }))).toBe('project');
    expect(dialogBadgeKind(dialog({ id: 3, type: 'group', groupType: 'okr', linkId: 88 }))).toBe(
      'okr',
    );
  });
});

describe('dialogMatchesFilter', () => {
  it('filters bot vs user with enrichment', () => {
    const human = dialog({ id: 1, type: 'user', groupType: '' });
    const bot = dialog({ id: 2, type: 'user', groupType: '' });
    const bots = new Set([2]);
    expect(dialogMatchesFilter(human, 'user', bots)).toBe(true);
    expect(dialogMatchesFilter(bot, 'user', bots)).toBe(false);
    expect(dialogMatchesFilter(bot, 'bot', bots)).toBe(true);
    expect(dialogMatchesFilter(human, 'bot', bots)).toBe(false);
  });

  it('mention filter uses mentionCount', () => {
    const d = dialog({ id: 3, mentionCount: 2 });
    expect(dialogMatchesFilter(d, 'mention')).toBe(true);
    expect(dialogMatchesFilter(dialog({ id: 4 }), 'mention')).toBe(false);
  });
});
