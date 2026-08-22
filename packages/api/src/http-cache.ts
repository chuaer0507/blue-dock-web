import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

/** GET 短缓存 TTL（2s） */
export const HTTP_CACHE_TTL_MS = 2000;

type CacheEntry = {
  data: unknown;
  status: number;
  statusText: string;
  headers: AxiosResponse['headers'];
  at: number;
};

const store = new Map<string, CacheEntry>();

/** 路由切换 / 登出时清空（路由切换 / 登出时调用） */
export function clearHttpCache(): void {
  store.clear();
}

/** @internal 单测 */
export function httpCacheSizeForTests(): number {
  return store.size;
}

export function buildHttpCacheKey(config: InternalAxiosRequestConfig): string {
  const method = (config.method ?? 'get').toUpperCase();
  try {
    return `${method} ${axios.getUri(config)}`;
  } catch {
    const url = config.url ?? '';
    const params = config.params ? JSON.stringify(config.params) : '';
    return `${method} ${url}?${params}`;
  }
}

export function readHttpCache(key: string): CacheEntry | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > HTTP_CACHE_TTL_MS) {
    store.delete(key);
    return null;
  }
  return hit;
}

export function writeHttpCache(key: string, response: AxiosResponse): void {
  store.set(key, {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    at: Date.now(),
  });
}

export function cachedResponseAdapter(
  config: InternalAxiosRequestConfig,
  entry: CacheEntry,
): AxiosResponse {
  return {
    data: entry.data,
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
    config,
  };
}
