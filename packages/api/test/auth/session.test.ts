import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  handleUnauthorized,
  setAccessToken,
  setRefreshToken,
  setSessionTokens,
  setUnauthorizedHandler,
} from '../../src/auth/session';

describe('session', () => {
  afterEach(() => {
    clearSession();
    setUnauthorizedHandler(null);
  });

  it('stores and clears access token', () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken('t1');
    expect(getAccessToken()).toBe('t1');
    clearSession();
    expect(getAccessToken()).toBeNull();
  });

  it('stores session pair', () => {
    setSessionTokens('a1', 'r1');
    expect(getAccessToken()).toBe('a1');
    expect(getRefreshToken()).toBe('r1');
  });

  it('handleUnauthorized clears both tokens and calls handler', () => {
    setAccessToken('t1');
    setRefreshToken('r1');
    let called = false;
    setUnauthorizedHandler(() => {
      called = true;
    });
    handleUnauthorized();
    expect(called).toBe(true);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
