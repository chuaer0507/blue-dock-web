import { http } from '../client';
import { ApiCodes, ApiError } from '../errors';
import { getRefreshToken, setSessionTokens } from './session';

export type RefreshResult = {
  token: string;
  refreshToken: string;
};

type Envelope<T> = {
  code: number;
  message?: string;
  data?: T;
};

/**
 * 用 refreshToken 换新 access/refresh。
 * 直接走 axios，避免经 `http-api` 再触发 refresh 环。
 */
export async function refreshRequest(refreshToken: string): Promise<RefreshResult> {
  const res = await http.request<Envelope<RefreshResult>>({
    url: 'users/token/refresh',
    method: 'post',
    params: { refreshToken },
  });
  const body = res.data;
  if (!body || typeof body !== 'object' || typeof body.code !== 'number') {
    throw new ApiError(ApiCodes.TOKEN_EXPIRED.code, 'refresh failed: invalid response');
  }
  if (body.code !== ApiCodes.OK.code) {
    throw new ApiError(body.code, body.message ?? 'refresh failed', body);
  }
  const data = body.data;
  if (!data?.token) {
    throw new ApiError(ApiCodes.TOKEN_EXPIRED.code, 'refresh failed: missing token');
  }
  setSessionTokens(data.token, data.refreshToken);
  return data;
}

let inflight: Promise<string | null> | null = null;

/**
 * 单飞续期：并发 `-2` 只打一次 refresh；成功返回新 access，失败返回 null。
 */
export function ensureRefreshedAccessToken(): Promise<string | null> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const refresh = getRefreshToken();
      if (!refresh) return null;
      const data = await refreshRequest(refresh);
      return data.token;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** 测试用：重置单飞状态 */
export function resetRefreshInflightForTests(): void {
  inflight = null;
}
