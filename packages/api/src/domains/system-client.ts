import { useQuery } from '@tanstack/react-query';
import { get } from '../http-api';

export type SystemVersionView = {
  name: string;
  version: string;
  publish: unknown[];
  deviceCount: number;
};

export type SystemUpdateLogView = {
  logVersion: string;
  updateLog: string;
};

export type SystemDemoView = {
  account: string;
  password: string;
};

export const systemClientKeys = {
  all: () => ['systemClient'] as const,
  version: () => [...systemClientKeys.all(), 'version'] as const,
  updateLog: (take: number) => [...systemClientKeys.all(), 'updateLog', take] as const,
  demo: () => [...systemClientKeys.all(), 'demo'] as const,
  chinaIp: () => [...systemClientKeys.all(), 'chinaIp'] as const,
  info: () => [...systemClientKeys.all(), 'info'] as const,
  prefetch: () => [...systemClientKeys.all(), 'prefetch'] as const,
};

const anonGet = {
  skipUnauthorizedHandler: true,
  skipTokenRefresh: true,
  extra: { showFailTips: false },
} as const;

/** 解析 `GET system/version` */
export function parseSystemVersion(raw: unknown): SystemVersionView {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    name: String(obj.name ?? 'BlueDock'),
    version: String(obj.version ?? ''),
    publish: Array.isArray(obj.publish) ? obj.publish : [],
    deviceCount: Number(obj.deviceCount) || 0,
  };
}

/** 解析 `GET system/get/updateLog` */
export function parseSystemUpdateLog(raw: unknown): SystemUpdateLogView {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    logVersion: String(obj.logVersion ?? ''),
    updateLog: String(obj.updateLog ?? ''),
  };
}

/** `GET system/version`：服务端产品名与版本（可匿名；登录后含 deviceCount） */
export function useSystemVersion(enabled = true) {
  return useQuery({
    queryKey: systemClientKeys.version(),
    queryFn: async () =>
      parseSystemVersion(await get<unknown>('system/version', undefined, anonGet)),
    staleTime: 60_000,
    enabled,
  });
}

/** `GET system/get/updateLog`：CHANGELOG 摘要（匿名） */
export function useSystemUpdateLog(take = 20, enabled = true) {
  const n = Math.min(100, Math.max(10, take));
  return useQuery({
    queryKey: systemClientKeys.updateLog(n),
    queryFn: async () =>
      parseSystemUpdateLog(await get<unknown>('system/get/updateLog', { take: n }, anonGet)),
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** `GET system/demo`：演示帐号（未配置时失败，调用方自行忽略） */
export function useSystemDemo(enabled = false) {
  return useQuery({
    queryKey: systemClientKeys.demo(),
    queryFn: async () => {
      const raw = await get<Record<string, unknown>>('system/demo', undefined, anonGet);
      return {
        account: String(raw.account ?? ''),
        password: String(raw.password ?? ''),
      } satisfies SystemDemoView;
    },
    staleTime: 60_000,
    retry: false,
    enabled,
  });
}

export type SystemChinaIpView = {
  ip: string;
  isChina: boolean;
};

export type SystemInfoView = {
  name: string;
  version: string;
  java: string;
  time: string;
};

/** `GET system/get/chinaIp`：客户端 IP 与是否中国（可匿名） */
export function useSystemChinaIp(enabled = true) {
  return useQuery({
    queryKey: systemClientKeys.chinaIp(),
    queryFn: async () => {
      const raw = await get<Record<string, unknown>>('system/get/chinaIp', undefined, anonGet);
      return {
        ip: String(raw.ip ?? ''),
        isChina: Boolean(raw.isChina),
      } satisfies SystemChinaIpView;
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** `GET system/get/info`：服务端运行时摘要（可匿名） */
export function useSystemInfo(enabled = true) {
  return useQuery({
    queryKey: systemClientKeys.info(),
    queryFn: async () => {
      const raw = await get<Record<string, unknown>>('system/get/info', undefined, anonGet);
      return {
        name: String(raw.name ?? ''),
        version: String(raw.version ?? ''),
        java: String(raw.java ?? ''),
        time: String(raw.time ?? ''),
      } satisfies SystemInfoView;
    },
    staleTime: 60_000,
    enabled,
  });
}

/** `GET system/prefetch`：桌面壳预加载资源清单（可匿名；首版常为空） */
export async function fetchSystemPrefetch(): Promise<string[]> {
  const raw = await get<unknown>('system/prefetch', undefined, anonGet);
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
}
