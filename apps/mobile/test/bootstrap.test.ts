import { describe, expect, it } from 'vitest';
import { pathFromDeepLink } from '../src/bootstrap/deep-link';

describe('pathFromDeepLink', () => {
  it('parses https manage paths', () => {
    expect(pathFromDeepLink('https://app.example/manage/dashboard?x=1')).toBe(
      '/manage/dashboard?x=1',
    );
  });

  it('parses custom scheme with host-as-segment', () => {
    // com.bluedock.app://manage/messenger → host=manage, pathname=/messenger
    expect(pathFromDeepLink('com.bluedock.app://manage/messenger')).toBe('/manage/messenger');
  });

  it('returns null for unrelated urls', () => {
    expect(pathFromDeepLink('https://example.com/about')).toBe(null);
  });
});
