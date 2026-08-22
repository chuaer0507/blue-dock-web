import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  http,
  LAZY_LOADING_MS,
  setHttpLifecycleHandlers,
  setLoadingController,
} from '../src/client';
import { DEFAULT_EXTRA } from '../src/common';
import { request } from '../src/http-api';

afterEach(() => {
  setHttpLifecycleHandlers(null);
  setLoadingController(null);
  vi.restoreAllMocks();
});

describe('http interceptors + ExtraModel / ResultModel', () => {
  it('resolves ExtraModel on request and parses ResultModel on response', async () => {
    const onRequest = vi.fn();
    const onResponse = vi.fn();
    setHttpLifecycleHandlers({ onRequest, onResponse });

    const show = vi.fn();
    const hide = vi.fn();
    setLoadingController({ show, hide });

    const adapter = vi.fn(async (config: { bdResolvedExtra?: unknown; headers: unknown }) => ({
      data: { code: 0, message: 'saved', data: true, tipsType: 'showDialog' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));

    const prev = http.defaults.adapter;
    http.defaults.adapter = adapter as never;

    try {
      const res = await http.request({
        url: '/ping',
        method: 'get',
        bdExtra: { showLoading: true, showFailTips: false },
      });

      expect(onRequest).toHaveBeenCalledOnce();
      const reqCtx = onRequest.mock.calls[0]![0];
      expect(reqCtx.extra).toMatchObject({
        showLoading: true,
        showFailTips: false,
        showLazyLoading: DEFAULT_EXTRA.showLazyLoading,
      });
      expect(show).toHaveBeenCalledOnce();

      expect(onResponse).toHaveBeenCalledOnce();
      const resCtx = onResponse.mock.calls[0]![0];
      expect(resCtx.result).toEqual({
        code: 0,
        message: 'saved',
        data: true,
        tipsType: 'showDialog',
      });
      expect(hide).toHaveBeenCalledOnce();
      expect(res.data).toEqual({ code: 0, message: 'saved', data: true, tipsType: 'showDialog' });
    } finally {
      http.defaults.adapter = prev;
    }
  });

  it('request() forwards options.extra as bdExtra', async () => {
    const onRequest = vi.fn();
    setHttpLifecycleHandlers({ onRequest });

    const adapter = vi.fn(async (config: { bdExtra?: unknown; headers: unknown }) => ({
      data: { code: 0, message: '', data: { ok: true } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    const prev = http.defaults.adapter;
    http.defaults.adapter = adapter as never;

    try {
      await request('x', undefined, 'get', {
        extra: { showSuccessTips: true, showFailTips: false },
      });
      expect(onRequest.mock.calls[0]![0].extra.showSuccessTips).toBe(true);
      expect(onRequest.mock.calls[0]![0].extra.showFailTips).toBe(false);
    } finally {
      http.defaults.adapter = prev;
    }
  });

  it('lazy loading shows after delay', async () => {
    vi.useFakeTimers();
    const show = vi.fn();
    const hide = vi.fn();
    setLoadingController({ show, hide });

    let resolveAdapter!: (v: unknown) => void;
    const adapter = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveAdapter = resolve;
        }),
    );
    const prev = http.defaults.adapter;
    http.defaults.adapter = adapter as never;

    try {
      const pending = http.request({
        url: '/slow',
        method: 'get',
        bdExtra: { showLazyLoading: true },
      });
      expect(show).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(LAZY_LOADING_MS);
      expect(show).toHaveBeenCalledOnce();

      resolveAdapter!({
        data: { code: 0, message: '', data: null },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: adapter.mock.calls[0]?.[0],
      });
      await pending;
      expect(hide).toHaveBeenCalledOnce();
    } finally {
      http.defaults.adapter = prev;
      vi.useRealTimers();
    }
  });
});
