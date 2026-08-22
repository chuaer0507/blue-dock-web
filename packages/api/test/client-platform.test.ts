import { afterEach, describe, expect, it } from 'vitest';
import { detectRequestPlatform, getRequestPlatform, setRequestPlatform } from '../src/client';

afterEach(() => {
  setRequestPlatform(null);
  Reflect.deleteProperty(window, 'desktop');
  Reflect.deleteProperty(window, 'blueDockMobile');
});

describe('detectRequestPlatform', () => {
  it('maps Electron platforms', () => {
    Object.defineProperty(window, 'desktop', {
      configurable: true,
      value: { getPlatform: () => 'darwin' },
    });
    expect(detectRequestPlatform()).toBe('mac');

    Object.defineProperty(window, 'desktop', {
      configurable: true,
      value: { getPlatform: () => 'win32' },
    });
    expect(detectRequestPlatform()).toBe('windows');

    Object.defineProperty(window, 'desktop', {
      configurable: true,
      value: { getPlatform: () => 'linux' },
    });
    expect(detectRequestPlatform()).toBe('linux');
  });

  it('maps native mobile bridge', () => {
    Object.defineProperty(window, 'blueDockMobile', {
      configurable: true,
      value: { getPlatform: () => 'ios' },
    });
    expect(detectRequestPlatform()).toBe('ios');
  });

  it('override via setRequestPlatform', () => {
    setRequestPlatform('android');
    expect(getRequestPlatform()).toBe('android');
    setRequestPlatform(null);
    expect(getRequestPlatform()).toBe(detectRequestPlatform());
  });
});
