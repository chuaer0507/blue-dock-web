import type { QueryClient } from '@tanstack/react-query';
import type { FrameHandler, RealtimeFrame } from './types';
import { dialogKeys, type DialogMessageView } from '../domains/dialog';
import { projectKeys } from '../domains/project';
import { taskKeys } from '../domains/task';
import { appsKeys } from '../domains/apps';
import { dashboardKeys } from '../domains/dashboard';
import { presenceKeys, type UserPresenceView } from '../domains/presence';
import { subscribeDialogMessageStream } from './dialog-message-stream';
import { handleAssistantOperationFrame } from './assistant-operation';

/**
 * 默认帧处理：按 type 失效相关 Query（域 key 工厂）。
 * 未知 type 安全忽略。
 */
export function createDefaultFrameHandler(queryClient: QueryClient): FrameHandler {
  return (frame: RealtimeFrame) => {
    const type = frame.type;
    if (type === 'pong') return;

    if (type === 'operation') {
      handleAssistantOperationFrame(frame);
      return;
    }

    if (type === 'dialog.message.withdraw') {
      const data = frame.data as
        { dialogId?: number | string; messageId?: number | string } | undefined;
      const dialogId = data?.dialogId != null ? Number(data.dialogId) : NaN;
      const messageId = data?.messageId != null ? Number(data.messageId) : NaN;
      if (Number.isFinite(dialogId) && Number.isFinite(messageId)) {
        queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(dialogId), (old) =>
          (old ?? []).filter((m) => m.id !== messageId),
        );
      }
      void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      return;
    }

    if (type === 'dialog.message.stream') {
      const data = frame.data as { streamUrl?: string } | undefined;
      const streamUrl = data?.streamUrl?.trim();
      if (streamUrl) {
        subscribeDialogMessageStream(streamUrl, queryClient);
      }
      return;
    }

    if (type.startsWith('dialog.')) {
      const data = frame.data as { dialogId?: number | string } | undefined;
      void queryClient.invalidateQueries({ queryKey: dialogKeys.all() });
      if (data?.dialogId != null) {
        void queryClient.invalidateQueries({
          queryKey: dialogKeys.messages(Number(data.dialogId)),
        });
      }
      return;
    }

    if (type.startsWith('task.') || type.startsWith('column.') || type === 'project.sort') {
      const data = frame.data as { projectId?: number | string } | undefined;
      void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all() });
      if (data?.projectId != null) {
        const projectId = Number(data.projectId);
        void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        void queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) });
        void queryClient.invalidateQueries({ queryKey: projectKeys.columns(projectId) });
      }
      return;
    }

    if (type === 'appBadge') {
      void queryClient.invalidateQueries({ queryKey: appsKeys.all() });
      void queryClient.invalidateQueries({ queryKey: appsKeys.badges() });
      return;
    }

    if (type.startsWith('presence.')) {
      const data = frame.data as { userId?: number | string; online?: boolean } | undefined;
      const userId = data?.userId != null ? Number(data.userId) : NaN;
      if (Number.isFinite(userId) && userId > 0) {
        const online =
          type === 'presence.online' || (type !== 'presence.offline' && data?.online === true);
        queryClient.setQueriesData<UserPresenceView[]>({ queryKey: presenceKeys.all() }, (old) => {
          if (!old) return old;
          let hit = false;
          const next = old.map((item) => {
            if (item.userId !== userId) return item;
            hit = true;
            return {
              ...item,
              online,
              pcActive: online ? item.pcActive : false,
            };
          });
          return hit ? next : old;
        });
      }
      void queryClient.invalidateQueries({ queryKey: presenceKeys.all() });
      return;
    }
  };
}
