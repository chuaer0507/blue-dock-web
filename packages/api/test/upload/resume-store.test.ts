import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  clearUploadSession,
  getUploadSession,
  putUploadSession,
  uploadSessionKey,
} from '../../src/upload/resume-store';

describe('uploadSessionKey', () => {
  it('normalizes parent/task ids', () => {
    expect(
      uploadSessionKey({
        hash: 'abc',
        size: 10,
        scene: 'file_cabinet',
        parentId: null,
        taskId: undefined,
      }),
    ).toBe('file_cabinet:abc:10:0:0');
  });
});

describe('resume store', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('round-trips a session', () => {
    const key = uploadSessionKey({
      hash: 'd'.repeat(32),
      size: 100,
      scene: 'project_task',
      taskId: 9,
    });
    putUploadSession({
      uploadId: 'u1',
      hash: 'd'.repeat(32),
      size: 100,
      name: 'a.bin',
      scene: 'project_task',
      parentId: 0,
      taskId: 9,
      chunkSize: 5,
      chunkCount: 20,
      received: [0, 1],
      updatedAt: Date.now(),
    });
    const got = getUploadSession(key);
    expect(got?.uploadId).toBe('u1');
    expect(got?.received).toEqual([0, 1]);
    clearUploadSession(key);
    expect(getUploadSession(key)).toBeNull();
  });
});
