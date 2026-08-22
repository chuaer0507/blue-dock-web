import { describe, expect, it } from 'vitest';
import { getMobile, isMobileRuntime, webMobileStub } from '../src/index';

describe('mobile-bridge', () => {
  it('falls back to stub without native injection', () => {
    expect(isMobileRuntime()).toBe(false);
    expect(getMobile()).toBe(webMobileStub);
    expect(webMobileStub.getSafeArea()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('openUrl is safe no-op-ish in node', () => {
    expect(() => webMobileStub.openUrl('https://example.com')).not.toThrow();
  });
});
