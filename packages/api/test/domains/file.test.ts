import { describe, expect, it } from 'vitest';
import { fileKeys, formatFileSize, isFolderEntry, isPdfFile } from '../../src/domains/file';

describe('fileKeys', () => {
  it('builds list factory', () => {
    expect(fileKeys.list(null)).toEqual(['files', 'list', 0]);
    expect(fileKeys.list(12)).toEqual(['files', 'list', 12]);
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});

describe('isFolderEntry', () => {
  it('detects folders', () => {
    expect(isFolderEntry({ type: 'folder' } as never)).toBe(true);
    expect(isFolderEntry({ type: 'file' } as never)).toBe(false);
  });
});

describe('isPdfFile', () => {
  it('detects pdf by type or extension', () => {
    expect(isPdfFile({ type: 'pdf', extension: '' } as never)).toBe(true);
    expect(isPdfFile({ type: 'file', extension: 'pdf' } as never)).toBe(true);
    expect(isPdfFile({ type: 'file', extension: 'txt' } as never)).toBe(false);
  });
});
