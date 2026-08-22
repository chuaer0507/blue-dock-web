import { describe, expect, it } from 'vitest';
import { taskKeys } from '../../src/domains/task';
import { projectKeys } from '../../src/domains/project';

describe('taskKeys', () => {
  it('builds list factory', () => {
    expect(taskKeys.list(3)).toEqual(['tasks', 'list', 3]);
  });
});

describe('projectKeys.columns', () => {
  it('builds columns factory', () => {
    expect(projectKeys.columns(3)).toEqual(['projects', 'columns', 3]);
  });
});
