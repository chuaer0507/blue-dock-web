import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';
import { hasId } from '../common';
import { dialogKeys, type DialogMessageView } from './dialog';

export type TaskView = {
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
  visibilityUserIds: number[];
  priorityLevel: number;
  priorityName: string;
  priorityColor: string;
  flowItemId: number;
  flowItemName: string;
  tagIds: number[];
  /** 负责人 userId（owner=1） */
  ownerUserIds: number[];
  /** 协助人 userId（owner=0） */
  assistUserIds: number[];
  sort: number;
  loop: number;
  loopAt: string | null;
  userId: number;
  dialogId?: number | null;
  createdAt: string | null;
};

export const taskKeys = {
  all: () => ['tasks'] as const,
  list: (projectId: number) => [...taskKeys.all(), 'list', projectId] as const,
  detail: (taskId: number) => [...taskKeys.all(), 'detail', taskId] as const,
  flow: (taskId: number) => [...taskKeys.all(), 'flow', taskId] as const,
  subtasks: (taskId: number) => [...taskKeys.all(), 'subtasks', taskId] as const,
  files: (taskId: number) => [...taskKeys.all(), 'files', taskId] as const,
  calendar: (start: string, end: string) => [...taskKeys.all(), 'calendar', start, end] as const,
  easyLists: (key: string) => [...taskKeys.all(), 'easyLists', key] as const,
};

export const taskContentKeys = {
  all: (taskId: number) => [...taskKeys.all(), 'content', taskId] as const,
  latest: (taskId: number) => [...taskContentKeys.all(taskId), 'latest'] as const,
  one: (taskId: number, historyId: number) =>
    [...taskContentKeys.all(taskId), 'one', historyId] as const,
  history: (taskId: number, page: number) =>
    [...taskContentKeys.all(taskId), 'history', page] as const,
};

export type TaskListParams = {
  projectId: number;
  columnId?: number;
  includeArchived?: boolean;
};

/** 项目主任务列表（看板用） */
export function useTaskList(params: TaskListParams | undefined, wsConnected?: boolean) {
  const projectId = params?.projectId;
  return useQuery({
    queryKey: taskKeys.list(projectId ?? 0),
    queryFn: () =>
      get<TaskView[]>('project/task/lists', {
        projectId,
        ...(params?.columnId == null ? {} : { columnId: params.columnId }),
        includeArchived: params?.includeArchived ?? false,
      }),
    enabled: typeof projectId === 'number' && projectId > 0,
    staleTime: 30_000,
    refetchInterval: wsConnected === false ? 5000 : false,
  });
}

/** 日历时间窗任务：`start`/`end` 为 `yyyy-MM-dd` 或带时间 */
export function useTaskCalendar(start: string, end: string, enabled = true) {
  return useQuery({
    queryKey: taskKeys.calendar(start, end),
    queryFn: () => get<TaskView[]>('project/task/calendar', { start, end }),
    enabled: enabled && Boolean(start && end),
    staleTime: 30_000,
  });
}

export type CreateTaskInput = {
  projectId: number;
  name: string;
  columnId?: number;
  description?: string;
  /** 0=关 · 1=天 · 2=周 · 3=月 · 4=年；>0 须 endAt */
  loop?: number;
  startAt?: string | null;
  endAt?: string | null;
  templateId?: number;
};

/** 快建任务（POST RequestParam） */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      post<TaskView>('project/task/add', undefined, {
        config: {
          params: {
            projectId: input.projectId,
            name: input.name,
            ...(input.columnId == null ? {} : { columnId: input.columnId }),
            ...(input.description ? { description: input.description } : {}),
            ...(input.loop == null ? {} : { loop: input.loop }),
            ...(input.startAt === undefined ? {} : { startAt: input.startAt ?? '' }),
            ...(input.endAt === undefined ? {} : { endAt: input.endAt ?? '' }),
            ...(input.templateId == null ? {} : { templateId: input.templateId }),
          },
        },
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: [...taskKeys.all(), 'calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export type UpdateTaskDatesInput = {
  taskId: number;
  startAt?: string | null;
  endAt?: string | null;
  projectId?: number;
};

/** 改期（日历拖拽等；POST RequestParam） */
export function useUpdateTaskDates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskDatesInput) =>
      post<TaskView>('project/task/update', undefined, {
        config: {
          params: {
            taskId: input.taskId,
            ...(input.startAt === undefined ? {} : { startAt: input.startAt ?? '' }),
            ...(input.endAt === undefined ? {} : { endAt: input.endAt ?? '' }),
          },
        },
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: [...taskKeys.all(), 'calendar'] });
      if (vars.projectId) {
        void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
      }
    },
  });
}

/** `GET project/task/easyLists` 单项（计划冲突简表） */
export type TaskEasyListItem = {
  id: number;
  name: string;
  projectId: number;
  projectName: string;
  startAt: string | null;
  endAt: string | null;
};

export type TaskEasyListParams = {
  userIds: number[];
  /** `yyyy-MM-dd HH:mm:ss` 或 ISO；成对传入 */
  startAt: string;
  endAt: string;
  excludeTaskId?: number;
  limit?: number;
};

function normalizeEasyDt(raw: string): string {
  return raw.trim().replace('T', ' ');
}

export function taskEasyListKey(params: TaskEasyListParams): string {
  const ids = [...new Set(params.userIds.filter((id) => id > 0))].sort((a, b) => a - b);
  return [
    ids.join(','),
    normalizeEasyDt(params.startAt),
    normalizeEasyDt(params.endAt),
    params.excludeTaskId ?? 0,
    params.limit ?? 10,
  ].join('|');
}

export function parseTaskEasyList(raw: unknown): TaskEasyListItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      id: Number(row.id) || 0,
      name: String(row.name ?? ''),
      projectId: Number(row.projectId) || 0,
      projectName: String(row.projectName ?? ''),
      startAt: row.startAt == null ? null : String(row.startAt),
      endAt: row.endAt == null ? null : String(row.endAt),
    }))
    .filter((row) => row.id > 0);
}

/** `GET project/task/easyLists`：负责人在时段内的未完成任务（计划冲突） */
export async function fetchTaskEasyLists(params: TaskEasyListParams): Promise<TaskEasyListItem[]> {
  const ids = [...new Set(params.userIds.filter((id) => id > 0))];
  if (ids.length === 0) return [];
  const start = normalizeEasyDt(params.startAt);
  const end = normalizeEasyDt(params.endAt);
  if (!start || !end) return [];
  return parseTaskEasyList(
    await get<unknown>('project/task/easyLists', {
      userIds: ids.join(','),
      timeRange: `${start},${end}`,
      ...(params.excludeTaskId != null && params.excludeTaskId > 0
        ? { excludeTaskId: params.excludeTaskId }
        : {}),
      limit: Math.min(200, Math.max(1, params.limit ?? 10)),
    }),
  );
}

export function useTaskEasyLists(params: TaskEasyListParams | undefined, enabled = true) {
  const key = params ? taskEasyListKey(params) : '';
  const ready =
    Boolean(params) &&
    (params?.userIds.some((id) => id > 0) ?? false) &&
    Boolean(params?.startAt?.trim()) &&
    Boolean(params?.endAt?.trim());
  return useQuery({
    queryKey: taskKeys.easyLists(key),
    queryFn: () => fetchTaskEasyLists(params!),
    enabled: enabled && ready,
    staleTime: 15_000,
  });
}

function invalidateTaskRelated(queryClient: ReturnType<typeof useQueryClient>, task: TaskView) {
  void queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) });
  void queryClient.invalidateQueries({ queryKey: taskKeys.list(task.projectId) });
  void queryClient.invalidateQueries({ queryKey: taskKeys.flow(task.id) });
  void queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(task.id) });
  void queryClient.invalidateQueries({ queryKey: [...taskKeys.all(), 'calendar'] });
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  void queryClient.invalidateQueries({ queryKey: ['projectLogs'] });
}

/** 任务详情；打开时会记浏览 */
export function useTask(taskId: number | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(taskId ?? 0),
    queryFn: () => get<TaskView>('project/task/one', { taskId }),
    enabled: hasId(taskId),
    staleTime: 15_000,
  });
}

export type TaskFlowTurn = {
  id: number;
  name: string;
  status: string;
  color: string;
};

export type TaskFlowView = {
  taskId: number;
  flowItemId: number;
  flowItemName: string;
  completeAt: string | null;
  status?: string;
  color?: string;
  turns: TaskFlowTurn[];
};

/** 工作流节点与可流转列表 */
export function useTaskFlow(taskId: number | undefined) {
  return useQuery({
    queryKey: taskKeys.flow(taskId ?? 0),
    queryFn: () => get<TaskFlowView>('project/task/flow', { taskId }),
    enabled: hasId(taskId),
    staleTime: 15_000,
  });
}

/** 流转到指定节点 */
export function useChangeTaskFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: number; flowItemId: number }) =>
      get<TaskFlowView>('project/task/flow', {
        taskId: input.taskId,
        flowItemId: input.flowItemId,
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.flow(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['projectLogs'] });
    },
  });
}

/** 动态 `record.flow` 是否可按日志恢复工作流 */
export function isProjectLogFlowResettable(
  record: Record<string, unknown> | null | undefined,
): boolean {
  if (!record || typeof record !== 'object') return false;
  const flow = record.flow;
  return Boolean(
    flow && typeof flow === 'object' && !Array.isArray(flow) && Object.keys(flow).length > 0,
  );
}

/** `GET project/task/resetFromLog`：按状态变更日志快照恢复工作流 */
export function useResetTaskFromLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { logId: number; taskId: number; projectId?: number }) =>
      get<TaskView>('project/task/resetFromLog', { id: input.logId }),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.flow(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['projectLogs'] });
      if (vars.projectId) {
        void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
      }
    },
  });
}

export type UpdateTaskInput = {
  taskId: number;
  projectId?: number;
  name?: string;
  description?: string;
  /** 富文本详情；写入 contentHistory（仅主任务） */
  content?: string;
  complete?: 0 | 1;
  owner?: string;
  assist?: string;
  /** 卡片颜色 */
  color?: string;
  /** 1=项目成员 · 2=任务人员 · 3=指定成员（主任务） */
  visibility?: number;
  /** vis=3 时逗号分隔 userId；全量替换 */
  visibilityUserIds?: number[];
  priorityLevel?: number;
  priorityName?: string;
  priorityColor?: string;
  flowItemId?: number;
  startAt?: string | null;
  endAt?: string | null;
  /** 0=关 · 1=天 · 2=周 · 3=月 · 4=年；>0 须 endAt */
  loop?: number;
  /** 全量替换项目标签；空数组清空；单任务 ≤10 */
  tagIds?: number[];
};

/** 修改任务字段 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput) =>
      post<TaskView>('project/task/update', undefined, {
        config: {
          params: {
            taskId: input.taskId,
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.content !== undefined ? { content: input.content } : {}),
            ...(input.complete !== undefined ? { complete: input.complete } : {}),
            ...(input.owner !== undefined ? { owner: input.owner } : {}),
            ...(input.assist !== undefined ? { assist: input.assist } : {}),
            ...(input.color !== undefined ? { color: input.color } : {}),
            ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
            ...(input.visibilityUserIds !== undefined
              ? { visibilityUserIds: input.visibilityUserIds.join(',') }
              : {}),
            ...(input.priorityLevel !== undefined ? { priorityLevel: input.priorityLevel } : {}),
            ...(input.priorityName !== undefined ? { priorityName: input.priorityName } : {}),
            ...(input.priorityColor !== undefined ? { priorityColor: input.priorityColor } : {}),
            ...(input.flowItemId !== undefined ? { flowItemId: input.flowItemId } : {}),
            ...(input.startAt === undefined ? {} : { startAt: input.startAt ?? '' }),
            ...(input.endAt === undefined ? {} : { endAt: input.endAt ?? '' }),
            ...(input.loop !== undefined ? { loop: input.loop } : {}),
            ...(input.tagIds !== undefined ? { tagIds: input.tagIds.join(',') } : {}),
          },
        },
      }),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
    onSettled: (task, _e, vars) => {
      if (task) invalidateTaskRelated(queryClient, task);
      else if (vars.projectId) {
        void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
        void queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) });
      }
      if (vars.content !== undefined) {
        void queryClient.invalidateQueries({ queryKey: taskContentKeys.all(vars.taskId) });
      }
    },
  });
}

/** 子任务列表 */
export function useTaskSubtasks(taskId: number | undefined) {
  return useQuery({
    queryKey: taskKeys.subtasks(taskId ?? 0),
    queryFn: () => get<TaskView[]>('project/task/subtaskData', { taskId }),
    enabled: hasId(taskId),
    staleTime: 15_000,
  });
}

export type AddSubtaskInput = {
  taskId: number;
  name: string;
  description?: string;
};

export function useAddSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddSubtaskInput) =>
      get<TaskView>('project/task/addSubtask', {
        taskId: input.taskId,
        name: input.name.trim(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
    },
  });
}

export type TaskFileView = {
  id: number;
  projectId: number;
  taskId: number;
  name: string;
  size: number;
  extension: string;
  path: string;
  thumbnail: string;
  userId: number;
  downloadCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export function useTaskFiles(taskId: number | undefined) {
  return useQuery({
    queryKey: taskKeys.files(taskId ?? 0),
    queryFn: () => get<TaskFileView[]>('project/task/files', { taskId }),
    enabled: hasId(taskId),
    staleTime: 30_000,
  });
}

/** 确保任务讨论群存在（按需创建） */
export function useEnsureTaskDialog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => get<TaskView>('project/task/dialog', { taskId }),
    onSettled: (_d, _e, taskId) => {
      void queryClient.invalidateQueries({ queryKey: ['dialogs'] });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: number; follow?: boolean }) =>
      get<TaskView>('project/task/archived', {
        taskId: input.taskId,
        follow: input.follow ?? false,
      }),
    onSettled: (task) => {
      if (task) invalidateTaskRelated(queryClient, task);
      else void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
    },
  });
}

/** 软删任务（主任务级联子任务） */
export function useRemoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: number; projectId?: number; parentId?: number }) =>
      get<void>('project/task/remove', { taskId: input.taskId }),
    onSettled: (_d, _e, vars) => {
      void queryClient.removeQueries({ queryKey: taskKeys.detail(vars.taskId) });
      if (vars.projectId) {
        void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
      } else {
        void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
      }
      if (vars.parentId && vars.parentId > 0) {
        void queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(vars.parentId) });
        void queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.parentId) });
      }
      void queryClient.invalidateQueries({ queryKey: [...taskKeys.all(), 'calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['projectLogs'] });
    },
  });
}

/** 软删任务附件 */
export function useDeleteTaskFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fileId: number; taskId: number }) =>
      get<Record<string, unknown>>('project/task/fileDelete', { fileId: input.fileId }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.files(vars.taskId) });
    },
  });
}

export type TaskFileDownloadView = {
  id: number;
  taskId: number;
  name: string;
  path: string;
  url: string;
  downloadCount: number;
};

/** `GET project/task/fileDetail`：附件详情并写入最近访问 `task_file` */
export async function touchTaskFileRecent(fileId: number): Promise<void> {
  if (fileId <= 0) return;
  await get<unknown>('project/task/fileDetail', { fileId });
}

/** 附件下载元数据（含 url）；调用方自行打开链接 */
export function useDownloadTaskFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { fileId: number; taskId: number }) => {
      void touchTaskFileRecent(input.fileId).catch(() => {});
      const raw = await get<Record<string, unknown>>('project/task/fileDownload', {
        fileId: input.fileId,
      });
      return {
        id: Number(raw.id) || input.fileId,
        taskId: Number(raw.taskId) || input.taskId,
        name: String(raw.name ?? ''),
        path: String(raw.path ?? ''),
        url: String(raw.url ?? raw.path ?? ''),
        downloadCount: Number(raw.downloadCount) || 0,
      } satisfies TaskFileDownloadView;
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.files(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: ['favorite'] });
    },
  });
}

/** 子任务升级为主任务 */
export function useUpgradeTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: number; parentId?: number }) =>
      get<TaskView>('project/task/upgrade', { taskId: input.taskId }),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
    onSettled: (task, _e, vars) => {
      if (task) invalidateTaskRelated(queryClient, task);
      else void queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) });
      if (vars.parentId && vars.parentId > 0) {
        void queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(vars.parentId) });
        void queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.parentId) });
      }
    },
  });
}

export type MoveTaskInput = {
  taskId: number;
  projectId: number;
  columnId: number;
  completed?: 0 | 1;
  /** 源项目；跨项目移动时用于失效原看板缓存 */
  fromProjectId?: number;
};

/** 换列 / 跨项目移动主任务（含子任务） */
export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveTaskInput) =>
      get<TaskView[]>('project/task/move', {
        taskId: input.taskId,
        projectId: input.projectId,
        columnId: input.columnId,
        ...(input.completed === undefined ? {} : { completed: input.completed }),
      }),
    onSuccess: (list) => {
      const main = list?.[0];
      if (main) queryClient.setQueryData(taskKeys.detail(main.id), main);
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
      if (vars.fromProjectId && vars.fromProjectId !== vars.projectId) {
        void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.fromProjectId) });
      }
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: [...taskKeys.all(), 'calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['projectLogs'] });
    },
  });
}

export type CopyTaskInput = {
  taskId: number;
  projectId: number;
  columnId: number;
  ownerUserId?: number;
  completed?: 0 | 1;
};

/** 复制主任务（含子任务与附件元数据） */
export function useCopyTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CopyTaskInput) =>
      post<TaskView>('project/task/copy', undefined, {
        config: {
          params: {
            taskId: input.taskId,
            projectId: input.projectId,
            columnId: input.columnId,
            ...(input.ownerUserId == null ? {} : { ownerUserId: input.ownerUserId }),
            ...(input.completed === undefined ? {} : { completed: input.completed }),
          },
        },
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(vars.projectId) });
      void queryClient.invalidateQueries({ queryKey: [...taskKeys.all(), 'calendar'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export type TaskRelatedBrief = {
  id: number;
  name: string;
  projectId: number;
  projectName: string;
  columnId: number;
  columnName: string;
  completeAt: string | null;
  archivedAt: string | null;
};

export type TaskRelatedItem = {
  relatedTaskId: number;
  mention: boolean;
  mentionedBy: boolean;
  latestAt: string | null;
  latestMessageId: number;
  task: TaskRelatedBrief;
};

export type TaskRelatedListView = {
  taskId: number;
  items: TaskRelatedItem[];
};

export const taskRelatedKeys = {
  all: (taskId: number) => [...taskKeys.all(), 'related', taskId] as const,
};

function asRelatedBrief(raw: Record<string, unknown> | null | undefined): TaskRelatedBrief | null {
  if (!raw) return null;
  const id = Number(raw.id) || 0;
  if (id <= 0) return null;
  return {
    id,
    name: String(raw.name ?? ''),
    projectId: Number(raw.projectId) || 0,
    projectName: String(raw.projectName ?? ''),
    columnId: Number(raw.columnId) || 0,
    columnName: String(raw.columnName ?? ''),
    completeAt: raw.completeAt == null ? null : String(raw.completeAt),
    archivedAt: raw.archivedAt == null ? null : String(raw.archivedAt),
  };
}

function asRelatedList(raw: Record<string, unknown> | undefined): TaskRelatedListView {
  const taskId = Number(raw?.taskId) || 0;
  const listRaw = raw?.items;
  const items: TaskRelatedItem[] = [];
  if (Array.isArray(listRaw)) {
    for (const row of listRaw) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const relatedTaskId = Number(r.relatedTaskId) || 0;
      const brief = asRelatedBrief(
        r.task && typeof r.task === 'object' ? (r.task as Record<string, unknown>) : null,
      );
      if (relatedTaskId <= 0 || !brief) continue;
      items.push({
        relatedTaskId,
        mention: Boolean(r.mention),
        mentionedBy: Boolean(r.mentionedBy),
        latestAt: r.latestAt == null ? null : String(r.latestAt),
        latestMessageId: Number(r.latestMessageId) || 0,
        task: brief,
      });
    }
  }
  return { taskId, items };
}

/** 任务双向关联列表 */
export function useTaskRelated(taskId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: taskRelatedKeys.all(taskId ?? 0),
    queryFn: async () =>
      asRelatedList(await get<Record<string, unknown>>('project/task/related', { taskId })),
    enabled: enabled && hasId(taskId),
    staleTime: 15_000,
  });
}

/** 手动建立双向关联 */
export function useAddTaskRelated() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: number; relatedTaskId: number }) =>
      post<{ taskId: number; relatedTaskId: number }>('project/task/related', undefined, {
        config: {
          params: { taskId: input.taskId, relatedTaskId: input.relatedTaskId },
        },
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskRelatedKeys.all(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskRelatedKeys.all(vars.relatedTaskId) });
    },
  });
}

/** 删除双向关联 */
export function useDeleteTaskRelated() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: number; relatedTaskId: number }) =>
      post<void>('project/task/related/delete', undefined, {
        config: {
          params: { taskId: input.taskId, relatedTaskId: input.relatedTaskId },
        },
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskRelatedKeys.all(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskRelatedKeys.all(vars.relatedTaskId) });
    },
  });
}

export type TaskTemplateView = {
  id: number;
  projectId: number;
  projectName?: string;
  name: string;
  title: string;
  content: string;
  sort?: number;
  isDefault?: number | boolean | null;
  useCount?: number | null;
  lastUsedAt?: string | null;
  userName?: string;
};

export const taskTemplateKeys = {
  all: () => [...taskKeys.all(), 'templates'] as const,
  list: (projectId: number) => [...taskTemplateKeys.all(), 'list', projectId] as const,
  visible: (currentProjectId: number) =>
    [...taskTemplateKeys.all(), 'visible', currentProjectId] as const,
  search: (currentProjectId: number, keyword: string, page: number) =>
    [...taskTemplateKeys.all(), 'search', currentProjectId, keyword, page] as const,
};

/** 项目内任务模板列表 */
export function useTaskTemplateList(projectId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: taskTemplateKeys.list(projectId ?? 0),
    queryFn: () => get<TaskTemplateView[]>('project/task/templateList', { projectId }),
    enabled: enabled && typeof projectId === 'number' && projectId > 0,
    staleTime: 60_000,
  });
}

/** 当前用户可见的跨项目模板（受目标项目 taskTemplateShare 约束） */
export function useTaskTemplateVisible(currentProjectId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: taskTemplateKeys.visible(currentProjectId ?? 0),
    queryFn: () =>
      get<TaskTemplateView[]>('project/task/templateVisible', {
        ...(currentProjectId && currentProjectId > 0 ? { currentProjectId } : {}),
      }),
    enabled: enabled && typeof currentProjectId === 'number' && currentProjectId > 0,
    staleTime: 60_000,
  });
}

export type TaskTemplateSearchPage = {
  items: TaskTemplateView[];
  meta: {
    page: number;
    pageSize: number;
    totalSize: number;
    totalPage: number;
  };
};

function asTemplateSearchPage(raw: Record<string, unknown> | undefined): TaskTemplateSearchPage {
  const itemsRaw = Array.isArray(raw?.items) ? (raw.items as TaskTemplateView[]) : [];
  const meta = (raw?.meta ?? {}) as Record<string, unknown>;
  return {
    items: itemsRaw,
    meta: {
      page: Number(meta.page) || 1,
      pageSize: Number(meta.pageSize) || 20,
      totalSize: Number(meta.totalSize) || 0,
      totalPage: Number(meta.totalPage) || 0,
    },
  };
}

/** 跨项目模板关键字搜索分页 */
export function useTaskTemplateSearch(
  keyword: string,
  currentProjectId: number | undefined,
  page = 1,
  enabled = true,
) {
  const key = keyword.trim();
  return useQuery({
    queryKey: taskTemplateKeys.search(currentProjectId ?? 0, key, page),
    queryFn: async () =>
      asTemplateSearchPage(
        await get<Record<string, unknown>>('project/task/templateSearch', {
          keyword: key,
          ...(currentProjectId && currentProjectId > 0 ? { currentProjectId } : {}),
          page,
          pageSize: 20,
        }),
      ),
    enabled: enabled && key.length > 0,
    staleTime: 15_000,
  });
}

export type SaveTaskTemplateInput = {
  projectId: number;
  id?: number;
  name: string;
  title?: string;
  content?: string;
};

/** 新建/更新任务模板（须管理权限） */
export function useSaveTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveTaskTemplateInput) =>
      post<TaskTemplateView>('project/task/templateSave', undefined, {
        config: {
          params: {
            projectId: input.projectId,
            name: input.name.trim(),
            ...(input.id == null ? {} : { id: input.id }),
            ...(input.title?.trim() ? { title: input.title.trim() } : {}),
            ...(input.content?.trim() ? { content: input.content.trim() } : {}),
          },
        },
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskTemplateKeys.list(vars.projectId) });
    },
  });
}

/** 删除任务模板（须管理权限） */
export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; projectId: number }) =>
      get<void>('project/task/templateDelete', { id: input.id }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskTemplateKeys.list(vars.projectId) });
    },
  });
}

/** 切换默认模板（须管理权限；同项目仅一个默认） */
export function useToggleTaskTemplateDefault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; projectId: number }) =>
      get<{ id: number; isDefault: number }>('project/task/templateDefault', {
        id: input.id,
        projectId: input.projectId,
      }),
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskTemplateKeys.list(vars.projectId) });
    },
  });
}

/** 重排项目内模板（须管理权限）；`list` 为模板 id 全序 */
export function useSortTaskTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: number; list: number[] }) =>
      post<void>(
        'project/task/templateSort',
        { list: input.list },
        { config: { params: { projectId: input.projectId } } },
      ),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: taskTemplateKeys.list(vars.projectId) });
      const previous = queryClient.getQueryData<TaskTemplateView[]>(
        taskTemplateKeys.list(vars.projectId),
      );
      if (previous) {
        const byId = new Map(previous.map((t) => [t.id, t]));
        const next = vars.list
          .map((id) => byId.get(id))
          .filter((t): t is TaskTemplateView => Boolean(t));
        for (const t of previous) {
          if (!vars.list.includes(t.id)) next.push(t);
        }
        queryClient.setQueryData(taskTemplateKeys.list(vars.projectId), next);
      }
      return { previous };
    },
    onError: (_e, vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(taskTemplateKeys.list(vars.projectId), ctx.previous);
      }
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskTemplateKeys.list(vars.projectId) });
    },
  });
}

export type TaskContentView = {
  id: number;
  projectId: number;
  taskId: number;
  userId: number;
  description: string;
  content: string;
  name: string;
  createdAt: string | null;
};

export type TaskContentHistoryItem = {
  id: number;
  taskId: number;
  userId: number;
  description: string;
  createdAt: string | null;
};

export type TaskContentHistoryPage = {
  items: TaskContentHistoryItem[];
  meta: {
    page: number;
    pageSize: number;
    totalSize: number;
    totalPage: number;
  };
};

function asTaskContentView(raw: unknown): TaskContentView | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = Number(row.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    projectId: Number(row.projectId) || 0,
    taskId: Number(row.taskId) || 0,
    userId: Number(row.userId) || 0,
    description: String(row.description ?? ''),
    content: String(row.content ?? ''),
    name: String(row.name ?? ''),
    createdAt: row.createdAt == null ? null : String(row.createdAt),
  };
}

/** 最新或指定历史富文本详情；无内容时为 null */
export function useTaskContent(
  taskId: number | undefined,
  historyId?: number | null,
  enabled = true,
) {
  const hid = historyId != null && historyId > 0 ? historyId : undefined;
  return useQuery({
    queryKey: hid ? taskContentKeys.one(taskId ?? 0, hid) : taskContentKeys.latest(taskId ?? 0),
    queryFn: async () =>
      asTaskContentView(
        await get<unknown>('project/task/content', {
          taskId,
          ...(hid ? { historyId: hid } : {}),
        }),
      ),
    enabled: enabled && hasId(taskId),
    staleTime: 15_000,
  });
}

/** 内容历史摘要分页 */
export function useTaskContentHistory(
  taskId: number | undefined,
  page = 1,
  pageSize = 20,
  enabled = true,
) {
  return useQuery({
    queryKey: taskContentKeys.history(taskId ?? 0, page),
    queryFn: () =>
      get<TaskContentHistoryPage>('project/task/contentHistory', {
        taskId,
        page,
        pageSize,
      }),
    enabled: enabled && hasId(taskId),
    staleTime: 15_000,
  });
}

export type TaskAiSuggestionType = 'description' | 'subtasks' | 'assignee' | 'similar';

export type TaskAiGenerateResult = {
  taskId: number;
  messageId: number;
  suggestions: Record<string, unknown>[];
  events: Record<string, unknown>[];
  skipped?: string;
};

export type TaskAiApplyInput = {
  taskId: number;
  messageId: number;
  type: TaskAiSuggestionType | string;
  /** 任务群会话，用于补丁消息缓存 */
  dialogId?: number;
  userId?: number;
  related?: number;
};

export type TaskAiActionResult = {
  type?: string;
  taskId?: number;
  result?: Record<string, unknown>;
  message?: DialogMessageView | null;
  eventId?: number;
  userId?: number;
  related?: number;
};

/** 手动生成 AI 建议（主任务；写入任务群 Markdown 卡片） */
export function useTaskAiGenerate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) =>
      post<TaskAiGenerateResult>('project/task/aiGenerate', undefined, {
        config: { params: { taskId } },
      }),
    onSettled: (_d, _e, taskId) => {
      void queryClient.invalidateQueries({ queryKey: dialogKeys.all() });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(taskId) });
    },
  });
}

/** 采纳 AI 建议；similar 由后端写关联，其余由 UI 按 result 补洞 */
export function useTaskAiApply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskAiApplyInput) =>
      post<TaskAiActionResult>('project/task/aiApply', undefined, {
        config: {
          params: {
            taskId: input.taskId,
            messageId: input.messageId,
            type: input.type,
            ...(input.userId != null && input.userId > 0 ? { userId: input.userId } : {}),
            ...(input.related != null && input.related > 0 ? { related: input.related } : {}),
          },
        },
      }),
    onSuccess: (data, vars) => {
      const msg = data.message;
      const dialogId = msg?.dialogId || vars.dialogId;
      if (msg && dialogId) {
        queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(dialogId), (old) => {
          if (!old) return [msg];
          if (old.some((m) => m.id === msg.id)) {
            return old.map((m) => (m.id === msg.id ? msg : m));
          }
          return [...old, msg];
        });
      }
    },
    onSettled: (_d, _e, vars) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all() });
      if (vars.dialogId) {
        void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
      }
      void queryClient.invalidateQueries({ queryKey: dialogKeys.all() });
    },
  });
}

/** 忽略 AI 建议 */
export function useTaskAiDismiss() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskAiApplyInput) =>
      post<TaskAiActionResult>('project/task/aiDismiss', undefined, {
        config: {
          params: {
            taskId: input.taskId,
            messageId: input.messageId,
            type: input.type,
            ...(input.userId != null && input.userId > 0 ? { userId: input.userId } : {}),
            ...(input.related != null && input.related > 0 ? { related: input.related } : {}),
          },
        },
      }),
    onSuccess: (data, vars) => {
      const msg = data.message;
      const dialogId = msg?.dialogId || vars.dialogId;
      if (msg && dialogId) {
        queryClient.setQueryData<DialogMessageView[]>(dialogKeys.messages(dialogId), (old) => {
          if (!old) return [msg];
          if (old.some((m) => m.id === msg.id)) {
            return old.map((m) => (m.id === msg.id ? msg : m));
          }
          return [...old, msg];
        });
      }
    },
    onSettled: (_d, _e, vars) => {
      if (vars.dialogId) {
        void queryClient.invalidateQueries({ queryKey: dialogKeys.messages(vars.dialogId) });
      }
      void queryClient.invalidateQueries({ queryKey: dialogKeys.all() });
    },
  });
}
