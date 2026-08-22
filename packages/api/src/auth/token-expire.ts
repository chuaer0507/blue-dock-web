import { useQuery } from '@tanstack/react-query';
import { get } from '../http-api';

export type AccessTokenExpireView = {
  /** 剩余秒数 */
  ttlSeconds: number;
  /** UTC 毫秒时间戳 */
  expireAt: number;
};

export const tokenExpireKeys = {
  all: () => ['auth', 'tokenExpire'] as const,
};

/** `GET users/token/expire`：当前 access token 剩余有效期 */
export function useAccessTokenExpire(enabled = true) {
  return useQuery({
    queryKey: tokenExpireKeys.all(),
    queryFn: async () => {
      const raw = await get<Record<string, unknown>>('users/token/expire');
      return {
        ttlSeconds: Number(raw.ttlSeconds) || 0,
        expireAt: Number(raw.expireAt) || 0,
      } satisfies AccessTokenExpireView;
    },
    staleTime: 30_000,
    enabled,
  });
}
