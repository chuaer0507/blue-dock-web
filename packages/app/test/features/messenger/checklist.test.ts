import { describe, expect, it } from 'vitest';
import {
  parseChecklistSegments,
  insertChecklistItem,
  hasChecklistItems,
} from '../../../src/features/messenger/checklist';

describe('checklist', () => {
  it('parses checked and unchecked items with stable index', () => {
    const text = 'intro<ul><li data-list="unchecked">a</li><li data-list="checked">b</li></ul>tail';
    const segs = parseChecklistSegments(text);
    expect(hasChecklistItems(text)).toBe(true);
    expect(segs).toEqual([
      { kind: 'text', value: 'intro' },
      { kind: 'item', index: 0, checked: false, label: 'a' },
      { kind: 'item', index: 1, checked: true, label: 'b' },
      { kind: 'text', value: 'tail' },
    ]);
  });

  it('inserts unchecked list item around selection', () => {
    const next = insertChecklistItem('hello', 0, 5, 'x');
    expect(next.value).toBe('<ul><li data-list="unchecked">hello</li></ul>');
    expect(next.selectionStart).toBe('<ul><li data-list="unchecked">'.length);
    expect(next.selectionEnd).toBe(next.selectionStart + 'hello'.length);
  });
});
