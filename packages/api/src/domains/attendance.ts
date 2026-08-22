import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';

export type AttendancePunch = {
  at: string;
  mode: string;
  section?: string;
  latitude?: number;
  longitude?: number;
};

export type AttendanceRecord = {
  id: number;
  userId: number;
  attendanceDate: string;
  times: string | AttendancePunch[];
};

export type AttendanceView = {
  open: 'open' | 'close' | string;
  modes: string[];
  time: string[];
  edit: 'open' | 'close' | string;
  faceUpload: 'open' | 'close' | string;
  hasFace: boolean;
  facePlugin: boolean;
  macAddresses: string[];
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  locationRadius?: number | null;
  today: AttendanceRecord | null;
};

export type AttendanceMonthList = {
  from: string;
  to: string;
  list: AttendanceRecord[];
};

export type AttendanceSetting = {
  open: string;
  time: string[];
  advance: number;
  delay: number;
  remindIn: number;
  remindExceed: number;
  modes: string[];
  edit: string;
  faceUpload: string;
  reportKey: string;
  installCmd: string;
  mapProvider: string;
  mapKey: string;
  locationLatitude: number;
  locationLongitude: number;
  locationRadius: number;
};

export const attendanceKeys = {
  all: () => ['attendance'] as const,
  view: () => [...attendanceKeys.all(), 'view'] as const,
  month: (yearMonth: string) => [...attendanceKeys.all(), 'month', yearMonth] as const,
  setting: () => [...attendanceKeys.all(), 'setting'] as const,
};

const ATTENDANCE_SETTING_DEFAULTS: AttendanceSetting = {
  open: 'close',
  time: ['09:00', '18:00'],
  advance: 60,
  delay: 60,
  remindIn: 5,
  remindExceed: 10,
  modes: ['manual', 'auto'],
  edit: 'open',
  faceUpload: 'open',
  reportKey: '',
  installCmd: '',
  mapProvider: '',
  mapKey: '',
  locationLatitude: 0,
  locationLongitude: 0,
  locationRadius: 500,
};

function asAttendanceSetting(raw: Record<string, unknown> | undefined): AttendanceSetting {
  const merged = { ...ATTENDANCE_SETTING_DEFAULTS, ...(raw as Partial<AttendanceSetting>) };
  const time = raw?.time;
  if (Array.isArray(time) && time.length >= 2) {
    merged.time = [String(time[0]), String(time[1])];
  } else {
    merged.time = [...ATTENDANCE_SETTING_DEFAULTS.time];
  }
  const modes = raw?.modes;
  if (Array.isArray(modes)) {
    merged.modes = modes.map((m) => String(m));
  } else if (typeof modes === 'string' && modes.trim()) {
    merged.modes = modes
      .split(/[,|]/)
      .map((m) => m.trim())
      .filter(Boolean);
  } else {
    merged.modes = [...ATTENDANCE_SETTING_DEFAULTS.modes];
  }
  merged.advance = Number(merged.advance) || 0;
  merged.delay = Number(merged.delay) || 0;
  merged.remindIn = Number(merged.remindIn) || 0;
  merged.remindExceed = Number(merged.remindExceed) || 0;
  merged.locationLatitude = Number(merged.locationLatitude) || 0;
  merged.locationLongitude = Number(merged.locationLongitude) || 0;
  merged.locationRadius = Number(merged.locationRadius) || 500;
  return merged;
}

/** 解析记录里的 times（后端可能是 JSON 字符串） */
export function parseAttendanceTimes(times: AttendanceRecord['times']): AttendancePunch[] {
  if (Array.isArray(times)) return times;
  if (typeof times !== 'string' || !times.trim()) return [];
  try {
    const parsed = JSON.parse(times) as unknown;
    return Array.isArray(parsed) ? (parsed as AttendancePunch[]) : [];
  } catch {
    return [];
  }
}

export function useAttendanceView(enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.view(),
    queryFn: () => get<AttendanceView>('users/attendance/get'),
    staleTime: 30_000,
    enabled,
  });
}

export function useAttendanceMonth(yearMonth: string, enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.month(yearMonth),
    queryFn: () =>
      get<AttendanceMonthList>('users/attendance/list', {
        yearMonth,
      }),
    staleTime: 60_000,
    enabled: enabled && /^\d{4}-\d{2}$/.test(yearMonth),
  });
}

/** 手动打卡 `punch=1`；定位传 lat/lng；刷脸传 `faceCaptureObjectId`（互斥，契约优先刷脸→定位→手动） */
export type AttendancePunchInput =
  | { kind: 'manual' }
  | { kind: 'location'; latitude: number; longitude: number }
  | { kind: 'face'; faceCaptureObjectId: string | number };

export function useAttendancePunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AttendancePunchInput = { kind: 'manual' }) => {
      const params: Record<string, unknown> = {};
      if (input.kind === 'location') {
        params.latitude = input.latitude;
        params.longitude = input.longitude;
      } else if (input.kind === 'face') {
        params.faceCaptureObjectId = input.faceCaptureObjectId;
      } else {
        params.punch = 1;
      }
      return post<AttendanceView>('users/attendance/save', undefined, {
        config: { params },
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(attendanceKeys.view(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all() });
    },
  });
}

export type SaveAttendanceProfileInput = {
  /** 逗号分隔或数组均可；空串清空 */
  macAddresses?: string[] | string;
  faceUploadObjectId?: string;
};

/** 保存个人签到资料（MAC / 人脸 objectId） */
export function useSaveAttendanceProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveAttendanceProfileInput) => {
      const params: Record<string, unknown> = {};
      if (input.macAddresses !== undefined) {
        params.macAddresses = Array.isArray(input.macAddresses)
          ? input.macAddresses.join(',')
          : input.macAddresses;
      }
      if (input.faceUploadObjectId != null && String(input.faceUploadObjectId).trim()) {
        params.faceUploadObjectId = String(input.faceUploadObjectId).trim();
      }
      return post<AttendanceView>('users/attendance/save', undefined, {
        config: { params },
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(attendanceKeys.view(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all() });
    },
  });
}

export function useAttendanceSetting(enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.setting(),
    queryFn: async () =>
      asAttendanceSetting(await get<Record<string, unknown>>('system/setting/attendance')),
    staleTime: 30_000,
    enabled,
  });
}

export function useSaveAttendanceSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AttendanceSetting>) =>
      post<Record<string, unknown>>('system/setting/attendance', input).then(asAttendanceSetting),
    onSuccess: (data) => {
      queryClient.setQueryData(attendanceKeys.setting(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all() });
    },
  });
}

export type AttendanceInstallHint = {
  installCmd: string;
  open: string;
};

/** `GET public/attendance/install`：匿名 WiFi 安装指引（无需登录） */
export function useAttendanceInstallHint(enabled = true) {
  return useQuery({
    queryKey: [...attendanceKeys.all(), 'install'] as const,
    queryFn: async () => {
      const raw = await get<Record<string, unknown>>('public/attendance/install', undefined, {
        skipUnauthorizedHandler: true,
        extra: { showFailTips: false },
      });
      return {
        installCmd: String(raw?.installCmd ?? ''),
        open: String(raw?.open ?? 'close'),
      } satisfies AttendanceInstallHint;
    },
    staleTime: 60_000,
    enabled,
  });
}
