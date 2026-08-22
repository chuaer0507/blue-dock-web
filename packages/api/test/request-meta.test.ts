import { afterEach, describe, expect, it } from 'vitest';
import { getDeviceId, getTimezone } from '../src/request-meta';
import { http } from '../src/client';
import { get } from '../src/http-api';
import { vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('request-meta', () => {
  it('persists device id', () => {
    localStorage.removeItem('blue-dock:deviceId');
    const a = getDeviceId();
    const b = getDeviceId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(localStorage.getItem('blue-dock:deviceId')).toBe(a);
  });

  it('returns IANA timezone', () => {
    expect(getTimezone()).toMatch(/\w+\/\w+|UTC/);
  });

  it('injects X-Device-ID and X-Timezone on requests', async () => {
    const adapter = vi.fn(async (config: { headers: Record<string, string> }) => ({
      data: { code: 0, message: '', data: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    const prev = http.defaults.adapter;
    http.defaults.adapter = adapter as never;
    try {
      await get('meta/ping');
      const headers = adapter.mock.calls[0]![0].headers as Record<string, string>;
      expect(headers['X-Device-ID']).toBe(getDeviceId());
      expect(headers['X-Timezone']).toBe(getTimezone());
      expect(headers['X-Platform']).toBeTruthy();
    } finally {
      http.defaults.adapter = prev;
    }
  });
});
