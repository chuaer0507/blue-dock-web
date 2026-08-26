import { describe, expect, it } from 'vitest';
import { dialogIdFromShareItem, folderIdFromShareItem } from '../../src/domains/user-share';

describe('user-share helpers', () => {
  it('parses dialog id from item', () => {
    expect(
      dialogIdFromShareItem({
        type: 'item',
        name: 'a',
        icon: '',
        url: '',
        extend: { dialogIds: 9 },
      }),
    ).toBe(9);
    expect(
      dialogIdFromShareItem({
        type: 'item',
        name: 'a',
        icon: '',
        url: '',
        extend: { dialogIds: '12,13' },
      }),
    ).toBe(12);
    expect(
      dialogIdFromShareItem({
        type: 'children',
        name: 'f',
        icon: '',
        url: '',
        extend: { uploadFileId: 1 },
      }),
    ).toBeNull();
  });

  it('parses folder id', () => {
    expect(
      folderIdFromShareItem({
        type: 'children',
        name: 'Files',
        icon: '',
        url: '',
        extend: { uploadFileId: 0 },
      }),
    ).toBe(0);
  });
});
