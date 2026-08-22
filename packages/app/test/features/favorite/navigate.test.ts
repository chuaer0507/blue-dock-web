import { describe, expect, it, vi } from 'vitest';
import { openFavoriteTarget, openRecentTarget } from '../../../src/features/favorite/navigate';

describe('openFavoriteTarget', () => {
  it('routes task / project / file variants', () => {
    const navigate = vi.fn();
    openFavoriteTarget(navigate, 'task', 1);
    openFavoriteTarget(navigate, 'project', 2);
    openFavoriteTarget(navigate, 'file', 3);
    openFavoriteTarget(navigate, 'task_file', 4);
    openFavoriteTarget(navigate, 'message_file', 5);
    openFavoriteTarget(navigate, 'message', 6);
    openFavoriteTarget(navigate, 'dialog', 7);

    expect(navigate.mock.calls.map((c) => c[0])).toEqual([
      '/single/task/1',
      '/manage/project/2',
      '/single/file/3',
      '/single/file/task/4',
      '/single/file/msg/5',
      '/manage/messenger/6',
      '/manage/messenger/7',
    ]);
  });

  it('ignores invalid id', () => {
    const navigate = vi.fn();
    openFavoriteTarget(navigate, 'task', 0);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('openRecentTarget', () => {
  it('opens by target id', () => {
    const navigate = vi.fn();
    openRecentTarget(navigate, {
      recordId: 9,
      type: 'task_file',
      id: 44,
      sourceType: 'project_task',
      sourceId: 7,
    });
    expect(navigate).toHaveBeenCalledWith('/single/file/task/44');
  });

  it('opens dialog by target id', () => {
    const navigate = vi.fn();
    openRecentTarget(navigate, {
      recordId: 10,
      type: 'dialog',
      id: 88,
      sourceType: 'dialog',
      sourceId: 88,
    });
    expect(navigate).toHaveBeenCalledWith('/manage/messenger/88');
  });

  it('falls back to source when target id missing', () => {
    const navigate = vi.fn();
    openRecentTarget(navigate, {
      recordId: 9,
      type: 'task_file',
      sourceType: 'project_task',
      sourceId: 7,
    });
    expect(navigate).toHaveBeenCalledWith('/single/task/7');
  });
});
