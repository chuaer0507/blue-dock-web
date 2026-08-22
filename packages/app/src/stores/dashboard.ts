import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { scopedPersistOptions } from './persist';

export type DashboardPerspective = 'personal' | 'team';
export type DashboardLayout = 'list' | 'quadrant';
export type DashboardGroupKey = 'overdue' | 'today' | 'todo' | 'pending' | 'assist' | 'weekDone';

type DashboardUiPersisted = {
  perspective: DashboardPerspective;
  layout: DashboardLayout;
  departmentId: number | null;
  collapsed: Partial<Record<DashboardGroupKey, boolean>>;
};

type DashboardUiState = DashboardUiPersisted & {
  setPerspective: (v: DashboardPerspective) => void;
  setLayout: (v: DashboardLayout) => void;
  setDepartmentId: (id: number | null) => void;
  toggleCollapsed: (key: DashboardGroupKey) => void;
};

/** 仪表盘壳层偏好（视角 / 布局 / 分组收起），按用户 persist */
export const useDashboardUiStore = create<DashboardUiState>()(
  persist(
    (set, get) => ({
      perspective: 'personal',
      layout: 'list',
      departmentId: null,
      collapsed: {},
      setPerspective: (perspective) => set({ perspective }),
      setLayout: (layout) => set({ layout }),
      setDepartmentId: (departmentId) => set({ departmentId }),
      toggleCollapsed: (key) => {
        const collapsed = { ...get().collapsed };
        collapsed[key] = !collapsed[key];
        set({ collapsed });
      },
    }),
    {
      ...scopedPersistOptions('dashboard-ui'),
      partialize: (s): DashboardUiPersisted => ({
        perspective: s.perspective,
        layout: s.layout,
        departmentId: s.departmentId,
        collapsed: s.collapsed,
      }),
    },
  ),
);
