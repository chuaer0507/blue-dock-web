import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearHttpCache, http, HTTP_CACHE_TTL_MS } from '../src/client';
import { httpCacheSizeForTests } from '../src/http-cache';
import { get } from '../src/http-api';

afterEach(() => {
  clearHttpCache();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('GET useCache short cache', () => {
  it('hits memory cache within TTL for useCache GET', async () => {
    const adapter = vi.fn(async (config: { headers: unknown }) => ({
      data: { code: 0, message: '', data: { n: adapter.mock.calls.length } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    const prev = http.defaults.adapter;
    http.defaults.adapter = adapter as never;

    try {
      const a = await get<{ n: number }>('cache/demo', { id: 1 }, { extra: { useCache: true } });
      const b = await get<{ n: number }>('cache/demo', { id: 1 }, { extra: { useCache: true } });
      expect(a).toEqual({ n: 1 });
      expect(b).toEqual({ n: 1 });
      expect(adapter).toHaveBeenCalledTimes(1);
      expect(httpCacheSizeForTests()).toBe(1);
    } finally {
      http.defaults.adapter = prev;
    }
  });

  it('does not cache when useCache is false', async () => {
    const adapter = vi.fn(async (config: { headers: unknown }) => ({
      data: { code: 0, message: '', data: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    const prev = http.defaults.adapter;
    http.defaults.adapter = adapter as never;

    try {
      await get('cache/off', undefined, { extra: { useCache: false } });
      await get('cache/off', undefined, { extra: { useCache: false } });
      expect(adapter).toHaveBeenCalledTimes(2);
      expect(httpCacheSizeForTests()).toBe(0);
    } finally {
      http.defaults.adapter = prev;
    }
  });

  it('expires after TTL', async () => {
    vi.useFakeTimers();
    const adapter = vi.fn(async (config: { headers: unknown }) => ({
      data: { code: 0, message: '', data: adapter.mock.calls.length },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    const prev = http.defaults.adapter;
    http.defaults.adapter = adapter as never;

    try {
      await get('cache/ttl', undefined, { extra: { useCache: true } });
      await vi.advanceTimersByTimeAsync(HTTP_CACHE_TTL_MS + 1);
      await get('cache/ttl', undefined, { extra: { useCache: true } });
      expect(adapter).toHaveBeenCalledTimes(2);
    } finally {
      http.defaults.adapter = prev;
    }
  });
});
