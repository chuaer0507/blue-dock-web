import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { scopedPersistOptions } from './persist';

export type ProjectViewMode = 'board' | 'list' | 'gantt' | 'workflow';

/** `all` | `unset`（无优先级）| 数字字符串（priorityLevel） */
export type ProjectPriorityFilter = 'all' | 'unset' | string;

type ProjectPref = {
  view: ProjectViewMode;
  showCompleted: boolean;
  /** 0 = 全部列 */
  columnId: number;
  priority: ProjectPriorityFilter;
};

type ProjectUiPersisted = {
  byProject: Record<string, ProjectPref>;
};

type ProjectUiState = ProjectUiPersisted & {
  getPref: (projectId: number) => ProjectPref;
  setView: (projectId: number, view: ProjectViewMode) => void;
  setShowCompleted: (projectId: number, showCompleted: boolean) => void;
  setColumnFilter: (projectId: number, columnId: number) => void;
  setPriorityFilter: (projectId: number, priority: ProjectPriorityFilter) => void;
};

const DEFAULT_PREF: ProjectPref = {
  view: 'board',
  showCompleted: false,
  columnId: 0,
  priority: 'all',
};

function mergePref(raw: Partial<ProjectPref> | undefined): ProjectPref {
  return {
    ...DEFAULT_PREF,
    ...(raw ?? {}),
    columnId: typeof raw?.columnId === 'number' ? raw.columnId : 0,
    priority: raw?.priority ?? 'all',
  };
}

/** 项目详情壳层偏好（视图 / 完成 / 列 / 优先级），按用户 + 项目 persist */
export const useProjectUiStore = create<ProjectUiState>()(
  persist(
    (set, get) => ({
      byProject: {},
      getPref: (projectId) => mergePref(get().byProject[String(projectId)]),
      setView: (projectId, view) => {
        const key = String(projectId);
        const prev = mergePref(get().byProject[key]);
        set({ byProject: { ...get().byProject, [key]: { ...prev, view } } });
      },
      setShowCompleted: (projectId, showCompleted) => {
        const key = String(projectId);
        const prev = mergePref(get().byProject[key]);
        set({ byProject: { ...get().byProject, [key]: { ...prev, showCompleted } } });
      },
      setColumnFilter: (projectId, columnId) => {
        const key = String(projectId);
        const prev = mergePref(get().byProject[key]);
        set({ byProject: { ...get().byProject, [key]: { ...prev, columnId } } });
      },
      setPriorityFilter: (projectId, priority) => {
        const key = String(projectId);
        const prev = mergePref(get().byProject[key]);
        set({ byProject: { ...get().byProject, [key]: { ...prev, priority } } });
      },
    }),
    {
      ...scopedPersistOptions('project-ui'),
      partialize: (s): ProjectUiPersisted => ({ byProject: s.byProject }),
    },
  ),
);
