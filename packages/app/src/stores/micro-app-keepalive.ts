import { create } from 'zustand';

const MAX_KEEP_ALIVE = 6;

export type MicroAppKeepAliveEntry = {
  cacheKey: string;
  appId: string;
  menuKey?: string;
  src: string;
  title: string;
  transparent: boolean;
  autoDarkTheme: boolean;
  immersive: boolean;
  lastActiveAt: number;
};

type MicroAppKeepAliveState = {
  entries: Record<string, MicroAppKeepAliveEntry>;
  activeKey: string | null;
  activate: (entry: Omit<MicroAppKeepAliveEntry, 'lastActiveAt'>) => void;
  /** 离开宿主页：仅取消激活，保留 iframe */
  deactivate: (cacheKey: string) => void;
  evict: (cacheKey: string) => void;
  clear: () => void;
};

function prune(
  entries: Record<string, MicroAppKeepAliveEntry>,
  keepKey: string | null,
): Record<string, MicroAppKeepAliveEntry> {
  const list = Object.values(entries).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  if (list.length <= MAX_KEEP_ALIVE) return entries;
  const next = { ...entries };
  for (const item of list.slice(MAX_KEEP_ALIVE)) {
    if (item.cacheKey === keepKey) continue;
    delete next[item.cacheKey];
  }
  // 仍超限则丢掉最旧（含非 active）
  const again = Object.values(next).sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  while (again.length > MAX_KEEP_ALIVE) {
    const drop = again.pop();
    if (!drop) break;
    delete next[drop.cacheKey];
  }
  return next;
}

/** 微应用 keepAlive：路由离开时隐藏不销毁 iframe（壳层状态） */
export const useMicroAppKeepAliveStore = create<MicroAppKeepAliveState>((set, get) => ({
  entries: {},
  activeKey: null,
  activate: (entry) => {
    const now = Date.now();
    const prev = get().entries[entry.cacheKey];
    const nextEntry: MicroAppKeepAliveEntry = {
      ...entry,
      // src 变更时需重建（token / 配置变化）
      src: entry.src,
      lastActiveAt: now,
    };
    // 若 src 变了，用新 entry 覆盖（iframe 会 remount）
    if (prev && prev.src !== entry.src) {
      // ok
    }
    const entries = prune({ ...get().entries, [entry.cacheKey]: nextEntry }, entry.cacheKey);
    set({ entries, activeKey: entry.cacheKey });
  },
  deactivate: (cacheKey) => {
    set((s) => (s.activeKey === cacheKey ? { activeKey: null } : s));
  },
  evict: (cacheKey) => {
    set((s) => {
      const { [cacheKey]: _removed, ...rest } = s.entries;
      return {
        entries: rest,
        activeKey: s.activeKey === cacheKey ? null : s.activeKey,
      };
    });
  },
  clear: () => set({ entries: {}, activeKey: null }),
}));

export function microAppCacheKey(appId: string, menuKey?: string | null): string {
  return `${appId}::${menuKey || ''}`;
}
