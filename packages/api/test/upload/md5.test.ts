import { describe, expect, it } from 'vitest';
import { md5HexOfString } from '../../src/upload/md5';

describe('md5HexOfString', () => {
  it('matches RFC vectors', () => {
    expect(md5HexOfString('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(md5HexOfString('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(md5HexOfString('message digest')).toBe('f96b697d7cb7938d525a2f31aaf161d0');
  });
});
