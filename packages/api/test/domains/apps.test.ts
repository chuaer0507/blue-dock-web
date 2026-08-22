import { describe, expect, it } from 'vitest';
import { appsKeys, orderBySortIds, resolveAppBadge } from '../../src/domains/apps';

describe('appsKeys', () => {
  it('builds factories', () => {
    expect(appsKeys.sort()).toEqual(['apps', 'sort']);
    expect(appsKeys.microMenu()).toEqual(['apps', 'microMenu']);
    expect(appsKeys.badges()).toEqual(['apps', 'badges']);
  });
});

describe('orderBySortIds', () => {
  it('orders known ids then appends rest', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(orderBySortIds(items, ['c', 'a']).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('resolveAppBadge', () => {
  it('sums menus when menuKey omitted', () => {
    const badges = {
      approve: {
        inbox: { count: 2, dot: false },
        other: { count: 1, dot: true },
      },
    };
    expect(resolveAppBadge(badges, 'approve')).toEqual({ count: 3, dot: true });
    expect(resolveAppBadge(badges, 'approve', 'inbox')).toEqual({ count: 2, dot: false });
    expect(resolveAppBadge(badges, 'missing')).toEqual({ count: 0, dot: false });
  });
});
