import { describe, expect, it } from 'vitest';
import { parseExportDownloadRef } from '../../src/domains/data-export';

describe('parseExportDownloadRef', () => {
  it('parses relative and /api paths', () => {
    expect(parseExportDownloadRef('/api/project/task/download?key=abc_1')).toEqual({
      kind: 'task',
      key: 'abc_1',
    });
    expect(parseExportDownloadRef('/system/attendance/download?key=att')).toEqual({
      kind: 'attendance',
      key: 'att',
    });
    expect(parseExportDownloadRef('approve/download?key=appr')).toEqual({
      kind: 'approve',
      key: 'appr',
    });
  });

  it('parses absolute URLs', () => {
    expect(parseExportDownloadRef('https://example.com/api/project/task/download?key=xyz')).toEqual(
      { kind: 'task', key: 'xyz' },
    );
  });

  it('rejects missing key or unknown path', () => {
    expect(parseExportDownloadRef('/api/project/task/download')).toBeNull();
    expect(parseExportDownloadRef('/api/project/task/list?key=x')).toBeNull();
    expect(parseExportDownloadRef('')).toBeNull();
  });
});
