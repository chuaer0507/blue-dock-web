import { describe, expect, it } from 'vitest';
import { asImageView } from '../../src/domains/upload-objects';

describe('asImageView', () => {
  it('parses files wire shape', () => {
    const out = asImageView({
      dirs: [],
      files: [
        {
          type: 'file',
          title: 'a.png',
          path: 'media/a.png',
          url: 'https://cdn/a.png',
          thumbnail: 'https://cdn/a.png',
          inode: 1,
          id: 9,
        },
      ],
    });
    expect(out.dirs).toEqual([]);
    expect(out.files).toHaveLength(1);
    expect(out.files[0]).toMatchObject({
      title: 'a.png',
      url: 'https://cdn/a.png',
      id: 9,
    });
  });

  it('tolerates empty payload', () => {
    expect(asImageView(null)).toEqual({ dirs: [], files: [] });
  });
});
