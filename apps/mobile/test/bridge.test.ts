import { describe, expect, it, vi } from 'vitest';
import { createMobileApi, resolveMobileOs } from '../src/bridge/create-mobile-api';

describe('resolveMobileOs', () => {
  it('detects from ua when Capacitor reports web', () => {
    expect(resolveMobileOs('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
    expect(resolveMobileOs('Mozilla/5.0 (Linux; Android 14)')).toBe('android');
  });

  it('defaults to ios on desktop preview ua', () => {
    expect(resolveMobileOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('ios');
  });
});

describe('createMobileApi', () => {
  it('exposes MobileAPI surface without throwing', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const api = createMobileApi();
    expect(api.getPlatform()).toMatch(/ios|android/);
    expect(api.getSafeArea()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    await expect(api.notify({ title: 't' })).resolves.toBeUndefined();
    await expect(api.openUrl('https://example.com')).resolves.toBeUndefined();
    await expect(api.registerPush?.()).resolves.toBeNull();
    openSpy.mockRestore();
  });
});
