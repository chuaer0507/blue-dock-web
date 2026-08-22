import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../http-api';

/** 个人应用排序：`base` 常用区 / `admin` 管理员区，值为应用 id 列表 */
export type AppSortGroups = {
  base: string[];
  admin: string[];
};

export type AppSortView = {
  sorts: AppSortGroups;
};

export type MicroAppMenuItem = {
  location: string;
  label: string;
  icon: string;
  url: string;
  type: string;
  keepAlive: boolean;
  disableScopeCss: boolean;
  autoDarkTheme: boolean;
  transparent: boolean;
  /** 沉浸式：隐藏宿主顶栏 */
  immersive?: boolean;
  key: string;
  badgeClearOnOpen: boolean;
};

export type MicroAppEntry = {
  id: string;
  name: string;
  version: string;
  menuItems: MicroAppMenuItem[];
  visibleTo?: string[];
};

export type AppBadgeEntry = {
  count: number;
  dot: boolean;
};

/** appId → menuKey → badge */
export type AppBadgeMap = Record<string, Record<string, AppBadgeEntry>>;

export type AppCatalogItem = {
  id: string;
  name: string;
  description: string;
  version: string;
  installed: boolean;
};

export type InstalledAppItem = {
  id: string;
  name: string;
  status: string;
  version: string;
};

export const appsKeys = {
  all: () => ['apps'] as const,
  sort: () => [...appsKeys.all(), 'sort'] as const,
  microMenu: () => [...appsKeys.all(), 'microMenu'] as const,
  badges: () => [...appsKeys.all(), 'badges'] as const,
  catalog: () => [...appsKeys.all(), 'catalog'] as const,
  installed: () => [...appsKeys.all(), 'installed'] as const,
};

export function useAppSort(enabled = true) {
  return useQuery({
    queryKey: appsKeys.sort(),
    queryFn: () => get<AppSortView>('users/appSort'),
    staleTime: 60_000,
    enabled,
  });
}

export function useSaveAppSort() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sorts: AppSortGroups) => post<AppSortView>('users/appSort/save', { sorts }),
    onSuccess: (data) => {
      queryClient.setQueryData(appsKeys.sort(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: appsKeys.sort() });
    },
  });
}

/** `POST system/microAppMenu`；默认 type=get 拉取可见菜单 */
export function useMicroAppMenu(enabled = true) {
  return useQuery({
    queryKey: appsKeys.microMenu(),
    queryFn: (): Promise<MicroAppEntry[]> =>
      post<MicroAppEntry[]>('system/microAppMenu', undefined, {
        config: { params: { type: 'get' } },
      }),
    staleTime: 60_000,
    enabled,
  });
}

export function useSaveMicroAppMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (list: MicroAppEntry[]) =>
      post<MicroAppEntry[]>('system/microAppMenu', { type: 'save', list }),
    onSuccess: (data) => {
      queryClient.setQueryData(appsKeys.microMenu(), data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: appsKeys.microMenu() });
    },
  });
}

export function useAppCatalog(enabled = true) {
  return useQuery({
    queryKey: appsKeys.catalog(),
    queryFn: async (): Promise<AppCatalogItem[]> => {
      const raw = await get<Record<string, unknown>[]>('system/apps/catalog');
      return (Array.isArray(raw) ? raw : []).map((row) => ({
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        description: String(row.description ?? ''),
        version: String(row.version ?? '1.0.0'),
        installed: Boolean(row.installed),
      }));
    },
    staleTime: 30_000,
    enabled,
  });
}

export function useInstalledApps(enabled = true) {
  return useQuery({
    queryKey: appsKeys.installed(),
    queryFn: async (): Promise<InstalledAppItem[]> => {
      const raw = await get<Record<string, unknown>[]>('system/apps/installed');
      return (Array.isArray(raw) ? raw : []).map((row) => ({
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        status: String(row.status ?? 'installed'),
        version: String(row.version ?? '1.0.0'),
      }));
    },
    staleTime: 30_000,
    enabled,
  });
}

function invalidateAppRegistry(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: appsKeys.catalog() });
  void queryClient.invalidateQueries({ queryKey: appsKeys.installed() });
  void queryClient.invalidateQueries({ queryKey: appsKeys.microMenu() });
}

export function useInstallApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name?: string; version?: string }) =>
      post<Record<string, unknown>>('system/apps/install', input),
    onSettled: () => invalidateAppRegistry(queryClient),
  });
}

export type UpdateAppInput = {
  id: string;
  name?: string;
  secret?: string;
  version?: string;
  menus?: unknown;
};

/** 更新已安装应用元数据 / 版本（刷新 microAppMenu） */
export function useUpdateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAppInput) =>
      post<Record<string, unknown>>('system/apps/update', input),
    onSettled: () => invalidateAppRegistry(queryClient),
  });
}

export function useUninstallApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<Record<string, unknown>>('system/apps/uninstall', { id }),
    onSettled: () => invalidateAppRegistry(queryClient),
  });
}

export function useAppBadges(enabled = true) {
  return useQuery({
    queryKey: appsKeys.badges(),
    queryFn: () => get<AppBadgeMap>('apps/badge/list'),
    staleTime: 30_000,
    enabled,
  });
}

export function useClearAppBadge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { appId: string; menuKey?: string }) =>
      post<Record<string, unknown>>('apps/badge/clear', {
        appId: input.appId,
        ...(input.menuKey ? { menuKey: input.menuKey } : {}),
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: appsKeys.badges() });
      const prev = queryClient.getQueryData<AppBadgeMap>(appsKeys.badges());
      if (prev) {
        const next: AppBadgeMap = { ...prev };
        const menus = next[input.appId];
        if (menus) {
          if (input.menuKey) {
            const { [input.menuKey]: _removed, ...rest } = menus;
            if (Object.keys(rest).length === 0) {
              const { [input.appId]: _app, ...appsRest } = next;
              queryClient.setQueryData(appsKeys.badges(), appsRest);
            } else {
              next[input.appId] = rest;
              queryClient.setQueryData(appsKeys.badges(), next);
            }
          } else {
            const { [input.appId]: _app, ...appsRest } = next;
            queryClient.setQueryData(appsKeys.badges(), appsRest);
          }
        }
      }
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(appsKeys.badges(), ctx.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: appsKeys.badges() });
    },
  });
}

/** 契约菜单位置（兼容旧值 admin / main） */
export type MicroMenuSection = 'application' | 'application/admin' | 'main/menu';

export function normalizeMicroMenuLocation(raw: string | undefined | null): MicroMenuSection {
  const v = (raw ?? 'application').trim().toLowerCase();
  if (v === 'admin' || v === 'application/admin') return 'application/admin';
  if (v === 'main' || v === 'main/menu') return 'main/menu';
  return 'application';
}

export function isMicroMenuInSection(
  location: string | undefined | null,
  section: MicroMenuSection,
): boolean {
  return normalizeMicroMenuLocation(location) === section;
}

/** 取应用在指定分区的首个菜单项 */
export function firstMicroMenuInSection(
  app: MicroAppEntry,
  section: MicroMenuSection,
): MicroAppMenuItem | null {
  for (const menu of app.menuItems ?? []) {
    if (isMicroMenuInSection(menu.location, section)) return menu;
  }
  return null;
}

/** 汇总全部应用角标（主导航「应用」聚合） */
export function sumAppBadges(badges: AppBadgeMap | undefined): AppBadgeEntry {
  const empty: AppBadgeEntry = { count: 0, dot: false };
  if (!badges) return empty;
  let count = 0;
  let dot = false;
  for (const menus of Object.values(badges)) {
    for (const entry of Object.values(menus)) {
      count += Number(entry.count) || 0;
      if (entry.dot) dot = true;
    }
  }
  return { count, dot };
}

/** 解析微应用 URL：替换 `{user_token}` / `{token}` 占位 */
export function resolveMicroAppUrl(raw: string, token: string | null | undefined): string {
  let url = raw.trim();
  if (!url) return '';
  const enc = token ? encodeURIComponent(token) : '';
  url = url.replaceAll('{user_token}', enc).replaceAll('{token}', enc);
  return url;
}

export function isMicroAppBlankType(type: string | undefined): boolean {
  const t = (type ?? 'iframe').toLowerCase();
  return t === 'iframe_blank' || t === 'external' || t === 'inline_blank';
}

export function findMicroAppMenu(
  apps: MicroAppEntry[] | undefined,
  appId: string,
  menuKey?: string | null,
): { app: MicroAppEntry; menu: MicroAppMenuItem } | null {
  if (!apps?.length || !appId) return null;
  const app = apps.find((a) => a.id === appId);
  if (!app) return null;
  const menus = app.menuItems ?? [];
  if (!menus.length) return null;
  if (menuKey) {
    const hit = menus.find((m) => m.key === menuKey || m.url === menuKey);
    if (hit) return { app, menu: hit };
  }
  return { app, menu: menus[0]! };
}

/** 应用中心内嵌宿主路径 */
export function microAppHostPath(appId: string, menuKey?: string | null): string {
  const base = `/manage/apps/${encodeURIComponent(appId)}`;
  if (menuKey) return `${base}?key=${encodeURIComponent(menuKey)}`;
  return base;
}

/** 独立窗路径 */
export function microAppSinglePath(appId: string, menuKey?: string | null): string {
  const base = `/single/apps/${encodeURIComponent(appId)}`;
  if (menuKey) return `${base}?key=${encodeURIComponent(menuKey)}`;
  return base;
}

/** 按排序 id 列表重排，未出现的 id 追加到末尾 */
export function orderBySortIds<T extends { id: string }>(items: T[], sortIds: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const out: T[] = [];
  const seen = new Set<string>();
  for (const id of sortIds) {
    const hit = byId.get(id);
    if (hit) {
      out.push(hit);
      seen.add(id);
    }
  }
  for (const item of items) {
    if (!seen.has(item.id)) out.push(item);
  }
  return out;
}

/** 汇总某应用角标（可选 menuKey；缺省累加全部 menu） */
export function resolveAppBadge(
  badges: AppBadgeMap | undefined,
  appId: string,
  menuKey?: string,
): AppBadgeEntry {
  const empty: AppBadgeEntry = { count: 0, dot: false };
  if (!badges) return empty;
  const menus = badges[appId];
  if (!menus) return empty;
  if (menuKey) {
    const entry = menus[menuKey];
    return entry ? { count: Number(entry.count) || 0, dot: Boolean(entry.dot) } : empty;
  }
  let count = 0;
  let dot = false;
  for (const entry of Object.values(menus)) {
    count += Number(entry.count) || 0;
    if (entry.dot) dot = true;
  }
  return { count, dot };
}
