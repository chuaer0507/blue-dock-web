import { useQuery } from '@tanstack/react-query';
import { get, getPageList } from '../http-api';
import type { PageMeta, PagerModel } from '../common';
import type { ProjectView } from './project';

export type { PageMeta };

export type UserTaskCounts = {
  project: number;
  todo: number;
  done: number;
};

export type UserTaskView = {
  id: number;
  parentId: number;
  projectId: number;
  projectName: string;
  columnId: number;
  name: string;
  color: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  completeAt: string | null;
  visibility: number;
  owner: number;
  today: boolean;
  overdue: boolean;
  departmentReadonly: boolean;
  createdAt: string | null;
};

export type UserTaskPage = PagerModel<UserTaskView>;

export type DashboardTeamStats = {
  uncompleted: number;
  overdue: number;
  soon: number;
  weekCompleted: number;
  memberUserIds: number[];
  projectIds: number[];
  priority: Record<string, number>;
};

export type TeamTaskView = {
  id: number;
  parentId: number;
  projectId: number;
  columnId: number;
  name: string;
  color: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  completeAt: string | null;
  visibility: number;
  priorityLevel: number;
  priorityName: string;
  priorityColor: string;
  flowItemId: number;
  flowItemName: string;
  userId: number;
  createdAt: string | null;
};

export type TeamTasksParams = {
  departmentId?: number;
  type?: 'uncompleted' | 'overdue' | 'soon' | 'hi' | 'noowner' | string;
  memberId?: number;
  level?: number;
  page?: number;
  pageSize?: number;
};

export const dashboardKeys = {
  all: () => ['dashboard'] as const,
  userCounts: (userId: number, owner?: number) =>
    [...dashboardKeys.all(), 'userCounts', userId, owner ?? 'all'] as const,
  userTasks: (userId: number, page: number, owner?: number, keys?: string) =>
    [...dashboardKeys.all(), 'userTasks', userId, page, owner ?? 'all', keys ?? ''] as const,
  userProjects: (userId: number, page: number, archived: string, keys: string) =>
    [...dashboardKeys.all(), 'userProjects', userId, page, archived, keys] as const,
  teamStats: (departmentId?: number) =>
    [...dashboardKeys.all(), 'teamStats', departmentId ?? 'default'] as const,
  teamTasks: (params: TeamTasksParams) =>
    [
      ...dashboardKeys.all(),
      'teamTasks',
      params.departmentId ?? 'default',
      params.type ?? '',
      params.memberId ?? 0,
      params.level ?? '',
      params.page ?? 1,
    ] as const,
};

export type UserTasksParams = {
  userId: number;
  owner?: 0 | 1;
  projectId?: number;
  page?: number;
  pageSize?: number;
  keys?: string;
};

export type UserProjectsParams = {
  userId: number;
  archived?: string;
  keys?: string;
  page?: number;
  pageSize?: number;
};

/** 个人视角计数 `{project,todo,done}` */
export function useDashboardUserCounts(
  userId: number | undefined,
  owner?: 0 | 1,
  wsConnected?: boolean,
) {
  return useQuery({
    queryKey: dashboardKeys.userCounts(userId ?? 0, owner),
    queryFn: () =>
      get<UserTaskCounts>('project/user/counts', {
        userId,
        ...(owner === undefined ? {} : { owner }),
      }),
    enabled: typeof userId === 'number' && userId > 0,
    staleTime: 60_000,
    refetchInterval: wsConnected === false ? 5000 : false,
  });
}

/** 个人视角任务分页 */
export function useDashboardUserTasks(params: UserTasksParams | undefined, wsConnected?: boolean) {
  const userId = params?.userId;
  const page = params?.page ?? 1;
  return useQuery({
    queryKey: dashboardKeys.userTasks(userId ?? 0, page, params?.owner, params?.keys),
    queryFn: () =>
      getPageList<UserTaskView>('project/user/tasks', {
        userId,
        page,
        pageSize: params?.pageSize ?? 20,
        ...(params?.owner === undefined ? {} : { owner: params.owner }),
        ...(params?.projectId == null ? {} : { projectId: params.projectId }),
        ...(params?.keys ? { keys: params.keys } : {}),
      }),
    enabled: typeof userId === 'number' && userId > 0,
    staleTime: 30_000,
    refetchInterval: wsConnected === false ? 5000 : false,
  });
}

/** `GET project/user/projects`：会员参与项目分页（本人/管理员/部门负责人只读） */
export function useDashboardUserProjects(params: UserProjectsParams | undefined, enabled = true) {
  const userId = params?.userId;
  const page = params?.page ?? 1;
  const archived = params?.archived?.trim() || 'no';
  const keys = params?.keys?.trim() || '';
  return useQuery({
    queryKey: dashboardKeys.userProjects(userId ?? 0, page, archived, keys),
    queryFn: () =>
      getPageList<ProjectView>('project/user/projects', {
        userId,
        page,
        pageSize: params?.pageSize ?? 20,
        archived,
        ...(keys ? { keys } : {}),
      }),
    enabled: enabled && typeof userId === 'number' && userId > 0,
    staleTime: 30_000,
  });
}

/** 负责人视角团队统计（可选 departmentId） */
export function useDashboardTeamStats(departmentId?: number, enabled = false) {
  return useQuery({
    queryKey: dashboardKeys.teamStats(departmentId),
    queryFn: () =>
      get<DashboardTeamStats>('dashboard/team/stats', {
        ...(departmentId == null ? {} : { departmentId }),
      }),
    enabled,
    staleTime: 60_000,
  });
}

/** 负责人视角团队任务（type / memberId / level） */
export function useDashboardTeamTasks(params: TeamTasksParams | undefined, enabled = false) {
  return useQuery({
    queryKey: dashboardKeys.teamTasks(params ?? {}),
    queryFn: () =>
      get<TeamTaskView[]>('dashboard/team/tasks', {
        ...(params?.departmentId == null ? {} : { departmentId: params.departmentId }),
        ...(params?.type ? { type: params.type } : {}),
        ...(params?.memberId == null ? {} : { memberId: params.memberId }),
        ...(params?.level == null ? {} : { level: params.level }),
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 30,
      }),
    enabled: enabled && Boolean(params?.type || params?.memberId || params?.level != null),
    staleTime: 30_000,
  });
}
