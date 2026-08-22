import { describe, expect, it } from 'vitest';
import { parseInlineMarkdown, wrapTextRange } from '../../../src/features/messenger/markdown';

describe('wrapTextRange', () => {
  it('wraps selection', () => {
    const r = wrapTextRange('hello world', 6, 11, '**', '**', 'x');
    expect(r.value).toBe('hello **world**');
    expect(r.selectionStart).toBe(8);
    expect(r.selectionEnd).toBe(13);
  });

  it('inserts placeholder when empty selection', () => {
    const r = wrapTextRange('ab', 2, 2, '`', '`', 'code');
    expect(r.value).toBe('ab`code`');
    expect(r.selectionStart).toBe(3);
    expect(r.selectionEnd).toBe(7);
  });
});

describe('parseInlineMarkdown', () => {
  it('parses bold italic code and link', () => {
    const nodes = parseInlineMarkdown('**a** *b* `c` [d](https://e.test)');
    expect(nodes).toEqual([
      { kind: 'bold', value: 'a' },
      { kind: 'text', value: ' ' },
      { kind: 'italic', value: 'b' },
      { kind: 'text', value: ' ' },
      { kind: 'code', value: 'c' },
      { kind: 'text', value: ' ' },
      { kind: 'link', label: 'd', href: 'https://e.test' },
    ]);
  });

  it('keeps plain text', () => {
    expect(parseInlineMarkdown('plain')).toEqual([{ kind: 'text', value: 'plain' }]);
  });
});
