import { useQuery } from '@tanstack/react-query';
import { getPageList } from '../http-api';
import type { PagerModel } from '../common';

export type ProjectLogTime = {
  ymd: string;
  hi: string;
  week: string;
  segment: string;
};

export type ProjectLogTaskBrief = {
  id: number;
  parentId: number;
  name: string;
};

export type ProjectLogView = {
  id: number;
  projectId: number;
  columnId: number;
  taskId: number;
  userId: number;
  detail: string;
  record: Record<string, unknown> | null;
  time: ProjectLogTime | null;
  ymd: string;
  projectTask: ProjectLogTaskBrief | null;
  createdAt: string | null;
};

export type ProjectLogPage = PagerModel<ProjectLogView>;

export const projectLogKeys = {
  all: () => ['projectLogs'] as const,
  list: (params: { projectId?: number; taskId?: number; page: number }) =>
    [
      ...projectLogKeys.all(),
      'list',
      params.taskId ?? 0,
      params.projectId ?? 0,
      params.page,
    ] as const,
};

/** 项目/任务动态；`taskId` 优先于 `projectId` */
export function useProjectLogs(params: {
  projectId?: number;
  taskId?: number;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 30;
  const enabled =
    params.enabled !== false &&
    ((typeof params.taskId === 'number' && params.taskId > 0) ||
      (typeof params.projectId === 'number' && params.projectId > 0));

  return useQuery({
    queryKey: projectLogKeys.list({
      projectId: params.projectId,
      taskId: params.taskId,
      page,
    }),
    queryFn: () =>
      getPageList<ProjectLogView>('project/log/lists', {
        ...(params.taskId ? { taskId: params.taskId } : {}),
        ...(params.projectId && !params.taskId ? { projectId: params.projectId } : {}),
        page,
        pageSize,
      }),
    enabled,
    staleTime: 15_000,
  });
}
