import { describe, expect, it } from 'vitest';
import { letterAvatarUrl, resolveAvatarSrc } from '../src/avatar';

describe('letterAvatarUrl', () => {
  it('builds /avatar under default api base', () => {
    expect(letterAvatarUrl('Alice', 64)).toBe('/avatar?name=Alice&size=64');
  });

  it('clamps size', () => {
    expect(letterAvatarUrl('Bob', 8)).toContain('size=16');
    expect(letterAvatarUrl('Bob', 999)).toContain('size=512');
  });
});

describe('resolveAvatarSrc', () => {
  it('prefers explicit image', () => {
    expect(resolveAvatarSrc('https://cdn.example/a.png', 'Alice')).toBe(
      'https://cdn.example/a.png',
    );
  });

  it('falls back to letter avatar', () => {
    expect(resolveAvatarSrc('', 'Alice', 32)).toBe('/avatar?name=Alice&size=32');
  });
});
