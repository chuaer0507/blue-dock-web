import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchUsersPresence, presenceIdsKey } from '../../src/domains/presence';

vi.mock('../../src/http-api', () => ({
  get: vi.fn(),
}));

import { get } from '../../src/http-api';

describe('presenceIdsKey', () => {
  it('dedupes sorts and caps at 100', () => {
    expect(presenceIdsKey([3, 1, 2, 1, 0, -1])).toBe('1,2,3');
    const many = Array.from({ length: 120 }, (_, i) => i + 1);
    expect(presenceIdsKey(many).split(',')).toHaveLength(100);
  });
});

describe('fetchUsersPresence', () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
  });

  it('returns empty without calling API when ids empty', async () => {
    await expect(fetchUsersPresence([])).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('parses items envelope', async () => {
    vi.mocked(get).mockResolvedValue({
      items: [
        { userId: 2, online: true, pcActive: true },
        { userId: 9, online: false, pcActive: false },
      ],
    });
    await expect(fetchUsersPresence([9, 2])).resolves.toEqual([
      { userId: 2, online: true, pcActive: true },
      { userId: 9, online: false, pcActive: false },
    ]);
    expect(get).toHaveBeenCalledWith('users/presence', { userIds: '2,9' });
  });
});
