import { describe, expect, it } from 'vitest';
import { dashboardKeys } from '../../src/domains/dashboard';
import { userKeys } from '../../src/domains/user-types';

describe('dashboardKeys', () => {
  it('builds stable factories', () => {
    expect(dashboardKeys.userCounts(7)).toEqual(['dashboard', 'userCounts', 7, 'all']);
    expect(dashboardKeys.userTasks(7, 2, 1)).toEqual(['dashboard', 'userTasks', 7, 2, 1, '']);
  });
});

describe('userKeys', () => {
  it('builds me key', () => {
    expect(userKeys.me()).toEqual(['users', 'me']);
  });
});
