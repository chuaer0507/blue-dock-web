import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';
import { hasId } from '../common';
import { taskKeys } from './task';

export type ProjectView = {
  id: number;
  name: string;
  description: string;
  userId: number;
  isPersonal: number;
  dialogId: number;
  archiveMethod: string;
  archiveDays: number;
  aiAutoAnalyze: string;
  departmentOwnerView: string;
  taskTemplateShare: string;
  myOwner: number;
  topAt: string | null;
  archivedAt: string | null;
  createdAt: string | null;
  departmentReadonly?: boolean | null;
};

export type ProjectListParams = {
  archived?: 'no' | 'yes' | 'all';
  type?: 'all' | 'team' | 'personal';
  name?: string;
};

export const projectKeys = {
  all: () => ['projects'] as const,
  list: (params?: ProjectListParams) =>
    [
      ...projectKeys.all(),
      'list',
      params?.archived ?? 'no',
      params?.type ?? 'all',
      params?.name ?? '',
    ] as const,
  detail: (projectId: number) => [...projectKeys.all(), 'detail', projectId] as const,
  columns: (projectId: number) => [...projectKeys.all(), 'columns', projectId] as const,
  column: (columnId: number) => [...projectKeys.all(), 'column', columnId] as const,
  flows: (projectId: number) => [...projectKeys.all(), 'flows', projectId] as const,
  tags: (projectId: number) => [...projectKeys.all(), 'tags', projectId] as const,
};

export type ProjectColumnView = {
  id: number;
  projectId: number;
  name: string;
  color: string;
  sort: number;
};

/** 当前用户参与的项目列表 */
export function useProjectList(params?: ProjectListParams, wsConnected?: boolean) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () =>
      get<ProjectView[]>('project/lists', {
        archived: params?.archived ?? 'no',
        type: params?.type ?? 'all',
        ...(params?.name ? { name: params.name } : {}),
      }),
    staleTime: 60_000,
    refetchInterval: wsConnected === false ? 5000 : false,
  });
}

/** 项目详情 */
export function useProject(projectId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: projectKeys.detail(projectId ?? 0),
    queryFn: () => get<ProjectView>('project/one', { projectId }),
    enabled: enabled && hasId(projectId),
    staleTime: 60_000,
  });
}

/** 项目列（看板） */
export function useProjectColumns(projectId: number | undefined, wsConnected?: boolean) {
  return useQuery({
    queryKey: projectKeys.columns(projectId ?? 0),
    queryFn: () => get<ProjectColumnView[]>('project/column/lists', { projectId }),
    enabled: hasId(projectId),
    staleTime: 60_000,
    refetchInterval: wsConnected === false ? 5000 : false,
  });
}

/** `GET project/column/one`：列详情 */
export function useProjectColumn(columnId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: projectKeys.column(columnId ?? 0),
    queryFn: () => get<ProjectColumnView>('project/column/one', { columnId }),
    enabled: enabled && hasId(columnId),
    staleTime: 60_000,
  });
}

export type AddProjectColumnInput = {
  projectId: number;
  name: string;
  color?: string;
};

/** `GET project/column/add`（须 TASK_LIST_ADD） */
export function useAddProjectColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddProjectColumnInput) =>
      get<ProjectColumnView>('project/column/add', {
        projectId: input.projectId,
        name: input.name.trim(),
        ...(input.color?.trim() ? { color: input.color.trim() } : {}),
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.columns(vars.projectId) });
    },
  });
}

export type UpdateProjectColumnInput = {
  columnId: number;
  projectId: number;
  name?: string;
  color?: string;
  sort?: number;
};

/** `GET project/column/update`（须 TASK_LIST_UPDATE） */
export function useUpdateProjectColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectColumnInput) =>
      get<ProjectColumnView>('project/column/update', {
        columnId: input.columnId,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.sort !== undefined ? { sort: input.sort } : {}),
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.columns(vars.projectId) });
    },
  });
}

/** `GET project/column/remove`：软删列并级联任务（至少保留一列） */
export function useRemoveProjectColumn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { columnId: number; projectId: number }) =>
      get<void>('project/column/remove', { columnId: input.columnId }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.columns(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
    },
  });
}

export type ProjectFlowItemView = {
  id: number;
  flowId: number;
  name: string;
  status: string;
  color: string;
  sort: number;
  turns: number[];
  userIds: number[];
  usertype: string;
  columnId: number;
};

export type ProjectFlowView = {
  id: number;
  projectId: number;
  name: string;
  items: ProjectFlowItemView[];
};

/** `GET project/flow/list`：项目工作流（含节点） */
export function useProjectFlowList(projectId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: projectKeys.flows(projectId ?? 0),
    queryFn: () => get<ProjectFlowView[]>('project/flow/list', { projectId }),
    enabled: enabled && hasId(projectId),
    staleTime: 60_000,
  });
}

export type ProjectFlowItemInput = {
  id?: number;
  name: string;
  status?: string;
  color?: string;
  sort?: number;
  /** 目标节点 id，或本批 sort 下标 */
  turns?: number[];
  userIds?: number[];
  usertype?: string;
  columnId?: number;
};

export type SaveProjectFlowInput = {
  projectId: number;
  /** 有则更新，无则新建 */
  id?: number;
  name?: string;
  /** 空数组则套用默认 5 节点 */
  items?: ProjectFlowItemInput[];
};

/** `POST project/flow/save`：新建 / 全量更新节点（须管理；个人项目不可用） */
export function useSaveProjectFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveProjectFlowInput) =>
      post<ProjectFlowView>('project/flow/save', {
        projectId: input.projectId,
        ...(input.id != null && input.id > 0 ? { id: input.id } : {}),
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.items != null ? { items: input.items } : {}),
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.flows(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
    },
  });
}

/** `GET project/flow/delete`：软删工作流及节点（须管理） */
export function useDeleteProjectFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; projectId: number }) =>
      get<void>('project/flow/delete', { id: input.id }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.flows(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
    },
  });
}

export type ProjectTagView = {
  id: number;
  projectId: number;
  name: string;
  color: string;
  sort: number;
};

/** `GET project/tag/list` */
export function useProjectTagList(projectId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: projectKeys.tags(projectId ?? 0),
    queryFn: () => get<ProjectTagView[]>('project/tag/list', { projectId }),
    enabled: enabled && hasId(projectId),
    staleTime: 60_000,
  });
}

export type SaveProjectTagInput = {
  projectId: number;
  id?: number;
  name: string;
  color?: string;
};

/** `POST project/tag/save`：新建 / 改名改色（须管理） */
export function useSaveProjectTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveProjectTagInput) =>
      post<ProjectTagView>('project/tag/save', {
        projectId: input.projectId,
        ...(input.id != null && input.id > 0 ? { id: input.id } : {}),
        name: input.name.trim(),
        ...(input.color != null ? { color: input.color } : {}),
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.tags(vars.projectId) });
    },
  });
}

/** `GET project/tag/delete`：软删并清任务关联（须管理） */
export function useDeleteProjectTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; projectId: number }) =>
      get<void>('project/tag/delete', { id: input.id }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.tags(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
    },
  });
}

/** `POST project/tag/sort`：重排（须管理） */
export function useSortProjectTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: number; list: number[] }) =>
      post<void>('project/tag/sort', {
        projectId: input.projectId,
        list: input.list,
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.tags(vars.projectId) });
    },
  });
}

/** `POST project/sort` 载荷：`[{ id: columnId, task: [taskId,…] }]` */
export type BoardSortColumn = {
  id: number;
  task: number[];
};

export type SortProjectBoardInput = {
  projectId: number;
  sort: BoardSortColumn[];
  onlyColumn?: boolean;
};

/** 看板任务排序 / 换列（或 onlyColumn 排列） */
export function useSortProjectBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SortProjectBoardInput) =>
      post<void>('project/sort', {
        projectId: input.projectId,
        onlyColumn: input.onlyColumn ? 1 : 0,
        sort: input.sort,
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
      if (vars.onlyColumn) {
        void queryClient.invalidateQueries({ queryKey: projectKeys.columns(vars.projectId) });
      }
    },
  });
}

export type ProjectInviteView = {
  code: string;
  projectId: number;
  expiredAt: string | null;
};

/** 获取或创建项目邀请码（须管理权限；个人项目不可用） */
export function useCreateProjectInvite() {
  return useMutation({
    mutationFn: (projectId: number) => get<ProjectInviteView>('project/invite', { projectId }),
  });
}

/** 匿名/登录均可：按 code 查看项目摘要 */
export function useProjectInviteInfo(code: string | undefined) {
  return useQuery({
    queryKey: [...projectKeys.all(), 'invite', code ?? ''] as const,
    queryFn: () => get<ProjectView>('project/invite/info', { code }),
    enabled: Boolean(code && code.trim()),
    staleTime: 30_000,
  });
}

/** 凭邀请码加入项目 */
export function useJoinProjectInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => get<ProjectView>('project/invite/join', { code }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

export type CreateProjectInput = {
  name: string;
  description?: string;
  /** 1 = 个人项目（每用户限一个） */
  isPersonal?: 0 | 1;
  /** 逗号分隔列名；空则后端默认列 */
  columns?: string;
};

/** `GET project/add` 创建项目 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      get<ProjectView>('project/add', {
        name: input.name.trim(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ...(input.isPersonal != null ? { isPersonal: input.isPersonal } : {}),
        ...(input.columns?.trim() ? { columns: input.columns.trim() } : {}),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

export type UpdateProjectInput = {
  projectId: number;
  name?: string;
  description?: string;
  archiveMethod?: 'system' | 'custom';
  archiveDays?: number;
  aiAutoAnalyze?: 'open' | 'close';
  taskTemplateShare?: 'open' | 'close';
  departmentOwnerView?: 'open' | 'close';
};

/** `GET project/update`：改名称 / 描述 / 归档与开关项（须管理） */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) =>
      get<ProjectView>('project/update', {
        projectId: input.projectId,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.archiveMethod !== undefined ? { archiveMethod: input.archiveMethod } : {}),
        ...(input.archiveDays !== undefined ? { archiveDays: input.archiveDays } : {}),
        ...(input.aiAutoAnalyze !== undefined ? { aiAutoAnalyze: input.aiAutoAnalyze } : {}),
        ...(input.taskTemplateShare !== undefined
          ? { taskTemplateShare: input.taskTemplateShare }
          : {}),
        ...(input.departmentOwnerView !== undefined
          ? { departmentOwnerView: input.departmentOwnerView }
          : {}),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(projectKeys.detail(data.id), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

/** `GET project/top`：切换本人置顶 */
export function useToggleProjectTop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) =>
      get<{ id: number; topAt: string | null }>('project/top', { projectId }),
    onSettled: (_d, _e, projectId) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

/** `POST project/user/sort`：本人项目列表拖拽排序 */
export function useSortUserProjects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (list: number[]) =>
      post<void>('project/user/sort', { list: list.filter((id) => id > 0) }),
    onMutate: async (list) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.all() });
      const previous = queryClient.getQueriesData<ProjectView[]>({
        queryKey: [...projectKeys.all(), 'list'],
      });
      for (const [key, data] of previous) {
        if (!data?.length) continue;
        const byId = new Map(data.map((p) => [p.id, p]));
        const ordered: ProjectView[] = [];
        for (const id of list) {
          const row = byId.get(id);
          if (row) ordered.push(row);
        }
        for (const row of data) {
          if (!list.includes(row.id)) ordered.push(row);
        }
        queryClient.setQueryData(key, ordered);
      }
      return { previous };
    },
    onError: (_err, _list, ctx) => {
      ctx?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

/** `GET project/remove`：软删项目（仅拥有者） */
export function useRemoveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => get<void>('project/remove', { projectId }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
    },
  });
}

export const PROJECT_PERMISSION_ROLES = ['project_member', 'task_leader', 'task_assist'] as const;

export type ProjectPermissionRole = (typeof PROJECT_PERMISSION_ROLES)[number];

export type ProjectPermissionMatrix = Record<string, string[]>;

export type ProjectPermissionView = {
  projectId: number;
  isPersonal: number;
  permissions: ProjectPermissionMatrix;
  points: string[];
};

export const projectPermissionKeys = {
  all: () => [...projectKeys.all(), 'permission'] as const,
  one: (projectId: number) => [...projectPermissionKeys.all(), projectId] as const,
};

function asPermissionView(raw: Record<string, unknown> | undefined): ProjectPermissionView {
  const permissions = (raw?.permissions ?? {}) as ProjectPermissionMatrix;
  const pointsRaw = raw?.points;
  const points = Array.isArray(pointsRaw) ? pointsRaw.map((p) => String(p)) : [];
  return {
    projectId: Number(raw?.projectId) || 0,
    isPersonal: Number(raw?.isPersonal) || 0,
    permissions,
    points,
  };
}

export function useProjectPermission(projectId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: projectPermissionKeys.one(projectId ?? 0),
    queryFn: async () => fetchProjectPermission(projectId!),
    staleTime: 30_000,
    enabled: enabled && hasId(projectId),
  });
}

/** 拉取项目权限矩阵（可供 Query fetchQuery / 拖拽落点即时校验） */
export async function fetchProjectPermission(projectId: number): Promise<ProjectPermissionView> {
  return asPermissionView(await get<Record<string, unknown>>('project/permission', { projectId }));
}

/** 拥有者/管理员恒 true；否则看 `project_member` 矩阵是否含该点 */
export function projectMemberHasPoint(
  myOwner: number,
  view: ProjectPermissionView | undefined,
  point: string,
): boolean {
  if (myOwner >= 1) return true;
  const pts = view?.permissions?.project_member ?? [];
  return pts.includes(point);
}

/** 成员是否具备任一权限点；拥有者/管理员恒 true */
export function projectMemberHasAnyPoint(
  myOwner: number,
  view: ProjectPermissionView | undefined,
  points: readonly string[],
): boolean {
  if (myOwner >= 1) return true;
  return points.some((p) => projectMemberHasPoint(0, view, p));
}

/**
 * 对齐 java `ProjectPermissionService.allows`：
 * 拥有者/管理员全开；否则取 `project_member` 与（若适用）`task_leader` / `task_assist` 并集。
 */
export function projectAllowsPoint(
  myOwner: number,
  view: ProjectPermissionView | undefined,
  point: string,
  taskRoles?: { isTaskLeader?: boolean; isTaskAssist?: boolean },
): boolean {
  if (myOwner >= 1) return true;
  const matrix = view?.permissions;
  if (!matrix) return false;
  const roles: string[] = ['project_member'];
  if (taskRoles?.isTaskLeader) roles.push('task_leader');
  if (taskRoles?.isTaskAssist) roles.push('task_assist');
  return roles.some((role) => (matrix[role] ?? []).includes(point));
}

export const PROJECT_COLUMN_PERMISSION_POINTS = [
  'TASK_LIST_ADD',
  'TASK_LIST_UPDATE',
  'TASK_LIST_REMOVE',
  'TASK_LIST_SORT',
] as const;

export function useUpdateProjectPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: number; permissions: ProjectPermissionMatrix }) =>
      get<Record<string, unknown>>('project/permission/update', undefined, {
        config: {
          params: {
            projectId: input.projectId,
            permissions: JSON.stringify(input.permissions),
          },
        },
      }).then(asPermissionView),
    onSuccess: (data) => {
      queryClient.setQueryData(projectPermissionKeys.one(data.projectId), data);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({
        queryKey: projectPermissionKeys.one(vars.projectId),
      });
    },
  });
}

/** 项目角色：0 成员 · 1 拥有者 · 2 管理员（对齐 java ProjectAccessService） */
export type ProjectOwnerLevel = 0 | 1 | 2;

export type ProjectMemberHit = {
  userId: number;
  email: string;
  nickname: string;
  profession: string;
  userImage: string;
};

export type ProjectMemberPage = {
  list: ProjectMemberHit[];
  total?: number;
  page?: number;
  pageSize?: number;
};

export type ProjectMemberChangeView = {
  projectId: number;
  listMemberUserIds: number[];
};

export const projectMemberKeys = {
  all: () => [...projectKeys.all(), 'members'] as const,
  list: (projectId: number, page: number) =>
    [...projectMemberKeys.all(), projectId, 'page', page] as const,
};

function asMemberPage(raw: Record<string, unknown> | undefined): ProjectMemberPage {
  const listRaw = raw?.list;
  const list = Array.isArray(listRaw) ? (listRaw as Record<string, unknown>[]) : [];
  return {
    list: list.map((row) => ({
      userId: Number(row.userId) || 0,
      email: String(row.email ?? ''),
      nickname: String(row.nickname ?? ''),
      profession: String(row.profession ?? ''),
      userImage: String(row.userImage ?? ''),
    })),
    total: raw?.total == null ? undefined : Number(raw.total),
    page: raw?.page == null ? undefined : Number(raw.page),
    pageSize: raw?.pageSize == null ? undefined : Number(raw.pageSize),
  };
}

function asMemberChange(raw: Record<string, unknown> | undefined): ProjectMemberChangeView {
  const idsRaw = raw?.listMemberUserIds;
  const ids = Array.isArray(idsRaw)
    ? idsRaw.map((id) => Number(id) || 0).filter((id) => id > 0)
    : [];
  return {
    projectId: Number(raw?.projectId) || 0,
    listMemberUserIds: ids,
  };
}

/** 项目内成员列表（`users/search?projectId=`；契约无带角色的成员列表接口） */
export function useProjectMembers(projectId: number | undefined, page = 1, enabled = true) {
  return useQuery({
    queryKey: projectMemberKeys.list(projectId ?? 0, page),
    queryFn: async () =>
      asMemberPage(
        await get<Record<string, unknown>>('users/search', {
          key: '',
          projectId,
          disable: 0,
          page,
          pageSize: 50,
        }),
      ),
    staleTime: 15_000,
    enabled: enabled && !!projectId && projectId > 0,
  });
}

function invalidateProjectMembers(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: number,
) {
  void queryClient.invalidateQueries({ queryKey: projectMemberKeys.all() });
  void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
  void queryClient.invalidateQueries({ queryKey: projectKeys.list() });
}

/** `POST project/user` 增减成员（须管理权限；个人项目不可用） */
export function useUpdateProjectMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: number; userIds?: number[]; removeUserIds?: number[] }) =>
      post<Record<string, unknown>>('project/user', undefined, {
        config: {
          params: {
            projectId: input.projectId,
            ...(input.userIds?.length ? { userIds: input.userIds.join(',') } : {}),
            ...(input.removeUserIds?.length
              ? { removeUserIds: input.removeUserIds.join(',') }
              : {}),
          },
        },
      }).then(asMemberChange),
    onSettled: (_d, _e, vars) => {
      invalidateProjectMembers(queryClient, vars.projectId);
    },
  });
}

/** `POST project/addDeputy` 任命管理员（仅拥有者） */
export function useAddProjectDeputy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: number; userId: number }) =>
      post<Record<string, unknown>>('project/addDeputy', undefined, {
        config: { params: { projectId: input.projectId, userId: input.userId } },
      }).then(asMemberChange),
    onSettled: (_d, _e, vars) => {
      invalidateProjectMembers(queryClient, vars.projectId);
    },
  });
}

/** `POST project/deleteDeputy` 罢免管理员（仅拥有者） */
export function useDeleteProjectDeputy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: number; userId: number }) =>
      post<Record<string, unknown>>('project/deleteDeputy', undefined, {
        config: { params: { projectId: input.projectId, userId: input.userId } },
      }).then(asMemberChange),
    onSettled: (_d, _e, vars) => {
      invalidateProjectMembers(queryClient, vars.projectId);
    },
  });
}

/** `GET project/transfer` 移交拥有者（仅拥有者） */
export function useTransferProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: number; userId: number }) =>
      get<ProjectView>('project/transfer', {
        projectId: input.projectId,
        userId: input.userId,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(projectKeys.detail(data.id), data);
    },
    onSettled: (_d, _e, vars) => {
      invalidateProjectMembers(queryClient, vars.projectId);
    },
  });
}

/** `GET project/exit` 退出项目（拥有者须先移交） */
export function useExitProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => get<void>('project/exit', { projectId }),
    onSettled: (_d, _e, projectId) => {
      invalidateProjectMembers(queryClient, projectId);
      void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
    },
  });
}

/** `GET project/archived`：归档 / 恢复（仅拥有者） */
export function useArchiveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: number; type?: 'add' | 'recovery' }) =>
      get<ProjectView>('project/archived', {
        projectId: input.projectId,
        type: input.type ?? 'add',
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(projectKeys.detail(data.id), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
    },
  });
}
