import { describe, expect, it, beforeEach } from 'vitest';
import { microAppCacheKey, useMicroAppKeepAliveStore } from '../../src/stores/micro-app-keepalive';

describe('microAppCacheKey', () => {
  it('joins app and menu key', () => {
    expect(microAppCacheKey('okr')).toBe('okr::');
    expect(microAppCacheKey('okr', 'home')).toBe('okr::home');
  });
});

describe('useMicroAppKeepAliveStore', () => {
  beforeEach(() => {
    useMicroAppKeepAliveStore.getState().clear();
  });

  it('activates and deactivates without evicting', () => {
    const entry = {
      cacheKey: 'a::',
      appId: 'a',
      src: 'https://x.test/a',
      title: 'A',
      transparent: false,
      autoDarkTheme: false,
      immersive: false,
    };
    useMicroAppKeepAliveStore.getState().activate(entry);
    expect(useMicroAppKeepAliveStore.getState().activeKey).toBe('a::');
    useMicroAppKeepAliveStore.getState().deactivate('a::');
    expect(useMicroAppKeepAliveStore.getState().activeKey).toBeNull();
    expect(useMicroAppKeepAliveStore.getState().entries['a::']?.src).toBe('https://x.test/a');
  });

  it('prunes to max keep-alive entries', () => {
    for (let i = 0; i < 8; i++) {
      useMicroAppKeepAliveStore.getState().activate({
        cacheKey: `app${i}::`,
        appId: `app${i}`,
        src: `https://x.test/${i}`,
        title: `App ${i}`,
        transparent: false,
        autoDarkTheme: false,
        immersive: false,
      });
    }
    const keys = Object.keys(useMicroAppKeepAliveStore.getState().entries);
    expect(keys.length).toBeLessThanOrEqual(6);
    expect(useMicroAppKeepAliveStore.getState().activeKey).toBe('app7::');
  });
});
