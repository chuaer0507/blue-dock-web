import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';

export type DepartmentView = {
  id: number;
  name: string;
  parentId: number;
  ownerUserId: number;
  dialogId?: number;
  deputyUserIds?: number[];
};

export type DepartmentBrief = {
  id: number;
  name: string;
  ownerUserId: number;
};

export type DepartmentSyncResult = {
  syncedCount?: number;
  alreadyInDeptCount?: number;
  skippedDisabledCount?: number;
  subDepartmentIds?: number[];
};

export type DepartmentSaveInput = {
  id?: number;
  name: string;
  parentId?: number;
  ownerUserId?: number;
};

export const departmentKeys = {
  all: () => ['department'] as const,
  list: () => [...departmentKeys.all(), 'list'] as const,
  mine: () => [...departmentKeys.all(), 'mine'] as const,
  managed: () => [...departmentKeys.all(), 'managed'] as const,
};

/** 将扁平部门列表建成树（按 parentId） */
export function buildDepartmentTree(
  items: DepartmentView[],
): Array<DepartmentView & { children: DepartmentView[] }> {
  const map = new Map<number, DepartmentView & { children: DepartmentView[] }>();
  for (const d of items) {
    map.set(d.id, { ...d, children: [] });
  }
  const roots: Array<DepartmentView & { children: DepartmentView[] }> = [];
  for (const node of map.values()) {
    if (node.parentId > 0 && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function useDepartmentList(enabled = true) {
  return useQuery({
    queryKey: departmentKeys.list(),
    queryFn: () => get<DepartmentView[]>('users/department/list'),
    staleTime: 60_000,
    enabled,
  });
}

export function useMyDepartments(enabled = true) {
  return useQuery({
    queryKey: departmentKeys.mine(),
    queryFn: () => get<DepartmentBrief[]>('users/info/departments'),
    staleTime: 60_000,
    enabled,
  });
}

export function useManagedDepartments(enabled = true) {
  return useQuery({
    queryKey: departmentKeys.managed(),
    queryFn: () => get<DepartmentBrief[]>('users/info/managedDepartments'),
    staleTime: 60_000,
    enabled,
  });
}

export function useSaveDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DepartmentSaveInput) =>
      get<DepartmentView>('users/department/add', {
        name: input.name,
        ...(input.id ? { id: input.id } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.ownerUserId !== undefined ? { ownerUserId: input.ownerUserId } : {}),
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: departmentKeys.all() });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => get<void>('users/department/delete', { id }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: departmentKeys.all() });
    },
  });
}

export function useSyncDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => get<DepartmentSyncResult>('users/department/sync', { id }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: departmentKeys.all() });
    },
  });
}

export function useAddDeputy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; userId: number }) =>
      post<void>('users/department/addDeputy', undefined, {
        config: { params: { id: vars.id, userId: vars.userId } },
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: departmentKeys.all() });
    },
  });
}

export function useDeleteDeputy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; userId: number }) =>
      post<void>('users/department/deleteDeputy', undefined, {
        config: { params: { id: vars.id, userId: vars.userId } },
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: departmentKeys.all() });
    },
  });
}
