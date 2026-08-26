import { env } from './env';

/**
 * 字母头像 PNG（匿名 `GET /avatar?name=&size=`）。
 * 与 `VITE_API_BASE_URL` 同主机：默认 `/api` → `/avatar`。
 */
export function letterAvatarUrl(name: string, size = 128): string {
  const api = env.apiBaseUrl.replace(/\/+$/, '');
  const origin = /\/api$/i.test(api) ? api.slice(0, -4) : api;
  const q = new URLSearchParams({
    name: name.trim() || 'D',
    size: String(Math.min(512, Math.max(16, size))),
  });
  return `${origin}/avatar?${q.toString()}`;
}

/** 有头像 URL 则用之，否则回退字母头像 */
export function resolveAvatarSrc(
  image: string | undefined | null,
  name: string,
  size = 128,
): string {
  const trimmed = image?.trim();
  if (trimmed) return trimmed;
  return letterAvatarUrl(name, size);
}
