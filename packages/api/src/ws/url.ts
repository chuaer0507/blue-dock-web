import { env } from '../env';

/**
 * 由 `VITE_API_BASE_URL` 推导 WebSocket 地址，并附带 `token` / `client` / `platform`。
 * 相对 `/api` → 同源 `/ws`（开发走 Vite 代理）。
 */
export function buildRealtimeUrl(
  token: string,
  platform = 'web',
  apiBaseUrl: string = env.apiBaseUrl,
  locationHost?: { protocol: string; host: string },
): string {
  let wsHref: string;

  if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
    const u = new URL(apiBaseUrl);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/ws';
    u.search = '';
    u.hash = '';
    wsHref = u.toString().replace(/\/$/, '');
  } else {
    const loc =
      locationHost ??
      (typeof window !== 'undefined'
        ? { protocol: window.location.protocol, host: window.location.host }
        : { protocol: 'http:', host: 'localhost' });
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    wsHref = `${protocol}//${loc.host}/ws`;
  }

  const url = new URL(wsHref);
  url.searchParams.set('token', token);
  url.searchParams.set('client', platform);
  url.searchParams.set('platform', platform);
  return url.toString();
}

/** 指数退避：1s → 2s → 4s … 封顶 30s */
export function nextBackoffMs(attempt: number, baseMs = 1000, maxMs = 30_000): number {
  const exp = Math.max(0, attempt);
  return Math.min(maxMs, baseMs * 2 ** exp);
}
