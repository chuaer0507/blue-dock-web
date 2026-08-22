import { afterEach, describe, expect, it, vi } from 'vitest';
import { http } from '../src/client';
import { request, get, post, put, del } from '../src/http-api';
import { ApiCodes, ApiError } from '../src/errors';
import {
  clearSession,
  setAccessToken,
  setRefreshToken,
  setUnauthorizedHandler,
} from '../src/auth/session';
import { resetRefreshInflightForTests } from '../src/auth/refresh';

function mockSequence(...bodies: unknown[]) {
  const spy = vi.spyOn(http, 'request');
  for (const body of bodies) {
    spy.mockResolvedValueOnce({
      data: body,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    });
  }
  return spy;
}

function mockOk(data: unknown) {
  return vi.spyOn(http, 'request').mockResolvedValue({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as never,
  });
}

describe('http-api request', () => {
  afterEach(() => {
    clearSession();
    setUnauthorizedHandler(null);
    resetRefreshInflightForTests();
    vi.restoreAllMocks();
  });

  it('returns data when code === 0', async () => {
    mockOk({ code: 0, message: '', data: { id: 1 } });
    await expect(request<{ id: number }>('project/lists')).resolves.toEqual({ id: 1 });
  });

  it('throws ApiError when code !== 0', async () => {
    mockOk({ code: 1100, message: 'auth.failed', data: null });
    await expect(request('users/login', {}, 'post')).rejects.toMatchObject({
      name: 'ApiError',
      code: 1100,
      message: 'auth.failed',
    });
  });

  it('clears session and invokes handler on 1001', async () => {
    setAccessToken('tok');
    setRefreshToken('rt');
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockOk({ code: ApiCodes.UNAUTHORIZED.code, message: 'unauthorized', data: null });

    await expect(request('project/lists')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('skips unauthorized handler when opted out', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockOk({ code: ApiCodes.UNAUTHORIZED.code, message: 'unauthorized', data: null });

    await expect(
      request('users/login', {}, 'post', { skipUnauthorizedHandler: true }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('on -2 refreshes once and retries original request', async () => {
    setAccessToken('old');
    setRefreshToken('rt-old');
    const spy = mockSequence(
      { code: ApiCodes.TOKEN_EXPIRED.code, message: 'expired', data: null },
      { code: 0, message: '', data: { token: 'new-at', refreshToken: 'new-rt' } },
      { code: 0, message: '', data: { ok: true } },
    );

    await expect(request<{ ok: boolean }>('project/lists')).resolves.toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem('accessToken')).toBe('new-at');
    expect(localStorage.getItem('refreshToken')).toBe('new-rt');
  });

  it('on -2 refresh failure clears session', async () => {
    setAccessToken('old');
    setRefreshToken('rt-old');
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockSequence(
      { code: ApiCodes.TOKEN_EXPIRED.code, message: 'expired', data: null },
      { code: ApiCodes.TOKEN_EXPIRED.code, message: 'refresh gone', data: null },
    );

    await expect(request('project/lists')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('sends GET params and POST body', async () => {
    const spy = mockOk({ code: 0, message: '', data: true });

    await request('project/one', { projectId: 1 }, 'get');
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: 'project/one', method: 'get', params: { projectId: 1 } }),
    );

    await request('project/add', { name: 'x' }, 'post');
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: 'project/add', method: 'post', data: { name: 'x' } }),
    );
  });
});

describe('get / post / put / del', () => {
  afterEach(() => {
    clearSession();
    setUnauthorizedHandler(null);
    resetRefreshInflightForTests();
    vi.restoreAllMocks();
  });

  it('maps HTTP verb helpers', async () => {
    const spy = mockOk({ code: 0, message: '', data: { ok: 1 } });

    await expect(get('a', { q: 1 })).resolves.toEqual({ ok: 1 });
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: 'a', method: 'get', params: { q: 1 } }),
    );

    await expect(post('b', { name: 'n' })).resolves.toEqual({ ok: 1 });
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: 'b', method: 'post', data: { name: 'n' } }),
    );

    await expect(put('c', { name: 'm' })).resolves.toEqual({ ok: 1 });
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: 'c', method: 'put', data: { name: 'm' } }),
    );

    await expect(del('d', { id: 9 })).resolves.toEqual({ ok: 1 });
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: 'd', method: 'delete', params: { id: 9 } }),
    );
  });
});
