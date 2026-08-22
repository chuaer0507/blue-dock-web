import { describe, expect, it } from 'vitest';
import { projectKeys } from '../../src/domains/project';

describe('projectKeys', () => {
  it('builds list and detail factories', () => {
    expect(projectKeys.list()).toEqual(['projects', 'list', 'no', 'all', '']);
    expect(projectKeys.list({ archived: 'yes', type: 'team', name: 'a' })).toEqual([
      'projects',
      'list',
      'yes',
      'team',
      'a',
    ]);
    expect(projectKeys.detail(9)).toEqual(['projects', 'detail', 9]);
  });
});
