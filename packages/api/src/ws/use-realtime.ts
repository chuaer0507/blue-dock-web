import { useEffect, useRef, useState } from 'react';
import { getRequestPlatform } from '../client';
import { queryClient } from '../query-client';
import { dialogKeys, syncCachedDialogMessagesLatest } from '../domains/dialog';
import { realtimeClient } from './client';
import { createDefaultFrameHandler } from './handlers';
import type { RealtimeConnectOptions, RealtimeStatus } from './types';

export type UseRealtimeOptions = RealtimeConnectOptions & {
  /** 为 false 时断开；默认 true */
  enabled?: boolean;
  /** 是否挂上默认 Query 失效处理；默认 true */
  defaultInvalidate?: boolean;
};

/** 只读连接状态（不启停 socket；由 `useRealtime` 负责连接） */
export function useRealtimeStatus(): { status: RealtimeStatus; connected: boolean } {
  const [status, setStatus] = useState<RealtimeStatus>(() => realtimeClient.getStatus());
  useEffect(() => realtimeClient.onStatus(setStatus), []);
  return { status, connected: status === 'open' };
}

/**
 * 在已登录壳层挂载：连接 `/ws`，卸载或 enabled=false 时断开。
 * `platform` 缺省时与 HTTP 头一致（`getRequestPlatform()`）。
 * 重连成功后对缓存会话调 `dialog/message/latest` 补洞，并刷新会话列表。
 */
export function useRealtime(options: UseRealtimeOptions = {}): {
  status: RealtimeStatus;
  connected: boolean;
} {
  const {
    enabled = true,
    defaultInvalidate = true,
    platform = getRequestPlatform(),
    url,
  } = options;
  const { status, connected } = useRealtimeStatus();
  const prevStatus = useRef<RealtimeStatus | null>(null);

  useEffect(() => {
    if (!enabled) {
      realtimeClient.disconnect();
      return;
    }

    const unsubs: Array<() => void> = [];
    if (defaultInvalidate) {
      unsubs.push(realtimeClient.onFrame(createDefaultFrameHandler(queryClient)));
    }

    unsubs.push(
      realtimeClient.onStatus((next) => {
        const prev = prevStatus.current;
        prevStatus.current = next;
        if (next !== 'open' || prev === null || prev === 'open') return;
        void syncCachedDialogMessagesLatest(queryClient).catch(() => {
          /* 补洞失败不阻断；后续 WS / 轮询仍可恢复 */
        });
        void queryClient.invalidateQueries({ queryKey: dialogKeys.list() });
      }),
    );

    realtimeClient.connect({ platform, url });

    return () => {
      for (const off of unsubs) off();
      realtimeClient.disconnect();
      prevStatus.current = null;
    };
  }, [enabled, defaultInvalidate, platform, url]);

  return { status, connected };
}
