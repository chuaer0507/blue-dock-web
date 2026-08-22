import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createDefaultFrameHandler } from '../../src/ws/handlers';
import { dialogKeys } from '../../src/domains/dialog';
import { projectKeys } from '../../src/domains/project';
import { taskKeys } from '../../src/domains/task';
import { appsKeys } from '../../src/domains/apps';
import { dashboardKeys } from '../../src/domains/dashboard';
import { presenceKeys } from '../../src/domains/presence';

function createClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  return { queryClient, invalidateQueries, handle: createDefaultFrameHandler(queryClient) };
}

describe('createDefaultFrameHandler', () => {
  it('ignores pong', () => {
    const { invalidateQueries, handle } = createClient();
    handle({ type: 'pong' });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('patches messages on withdraw and invalidates dialog list', () => {
    const { queryClient, invalidateQueries, handle } = createClient();
    queryClient.setQueryData(dialogKeys.messages(3), [
      { id: 10, dialogId: 3 },
      { id: 11, dialogId: 3 },
    ]);
    handle({ type: 'dialog.message.withdraw', data: { dialogId: 3, messageId: 10 } });
    expect(queryClient.getQueryData(dialogKeys.messages(3))).toEqual([{ id: 11, dialogId: 3 }]);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: dialogKeys.list() });
  });

  it('invalidates dialog keys on dialog.*', () => {
    const { invalidateQueries, handle } = createClient();
    handle({ type: 'dialog.message', data: { dialogId: 5 } });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: dialogKeys.all() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: dialogKeys.messages(5) });
  });

  it('invalidates project/task/dashboard keys on task.*', () => {
    const { invalidateQueries, handle } = createClient();
    handle({ type: 'task.update', data: { projectId: 9 } });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: projectKeys.all() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: taskKeys.all() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: dashboardKeys.all() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: projectKeys.detail(9) });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: taskKeys.list(9) });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: projectKeys.columns(9) });
  });

  it('invalidates apps keys on appBadge', () => {
    const { invalidateQueries, handle } = createClient();
    handle({ type: 'appBadge' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: appsKeys.all() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: appsKeys.badges() });
  });

  it('patches and invalidates presence on presence.*', () => {
    const { queryClient, invalidateQueries, handle } = createClient();
    queryClient.setQueryData(presenceKeys.users('2'), [
      { userId: 2, online: false, pcActive: false },
    ]);
    handle({ type: 'presence.online', data: { userId: 2, online: true } });
    expect(queryClient.getQueryData(presenceKeys.users('2'))).toEqual([
      { userId: 2, online: true, pcActive: false },
    ]);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: presenceKeys.all() });
  });

  it('ignores operation and unknown types', () => {
    const { invalidateQueries, handle } = createClient();
    handle({ type: 'operation' });
    handle({ type: 'unknown.event' });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
