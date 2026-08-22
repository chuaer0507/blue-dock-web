import { beforeEach, describe, expect, it, vi } from 'vitest';
import { touchTaskFileRecent } from '../../src/domains/task';

vi.mock('../../src/http-api', () => ({
  get: vi.fn(),
}));

import { get } from '../../src/http-api';

describe('touchTaskFileRecent', () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
  });

  it('skips non-positive id', async () => {
    await touchTaskFileRecent(0);
    expect(get).not.toHaveBeenCalled();
  });

  it('calls fileDetail', async () => {
    vi.mocked(get).mockResolvedValue({});
    await touchTaskFileRecent(42);
    expect(get).toHaveBeenCalledWith('project/task/fileDetail', { fileId: 42 });
  });
});
