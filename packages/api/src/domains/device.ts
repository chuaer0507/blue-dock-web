import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from '../http-api';

export type DeviceDetail = {
  ip?: string;
  userAgent?: string;
  type?: string;
  deviceName?: string;
  appBrand?: string;
  appModel?: string;
  appOs?: string;
};

export type UserDeviceView = {
  id: number;
  userId: number;
  detail: DeviceDetail;
  expiredAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isCurrent: number;
};

export type DeviceListView = {
  list: UserDeviceView[];
};

export const deviceKeys = {
  all: () => ['devices'] as const,
  list: () => [...deviceKeys.all(), 'list'] as const,
};

export function useDeviceList(enabled = true) {
  return useQuery({
    queryKey: deviceKeys.list(),
    queryFn: () => get<DeviceListView>('users/device/list'),
    staleTime: 30_000,
    enabled,
  });
}

/** 踢下线某设备会话 */
export function useLogoutDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => get<void>('users/device/logout', { id }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}

export type EditDeviceInput = {
  deviceName?: string;
  appBrand?: string;
  appModel?: string;
  appOs?: string;
};

/** 改当前设备展示信息 */
export function useEditDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EditDeviceInput) => get<void>('users/device/edit', input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: deviceKeys.list() });
    },
  });
}
