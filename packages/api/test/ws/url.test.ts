import { describe, expect, it } from 'vitest';
import { buildRealtimeUrl, nextBackoffMs } from '../../src/ws/url';
import { parseFrame } from '../../src/ws/client';

describe('buildRealtimeUrl', () => {
  it('derives same-origin /ws from relative /api', () => {
    const url = buildRealtimeUrl('tok', 'web', '/api', {
      protocol: 'http:',
      host: 'localhost:5173',
    });
    expect(url).toBe('ws://localhost:5173/ws?token=tok&client=web&platform=web');
  });

  it('converts absolute http API base to ws /ws', () => {
    const url = buildRealtimeUrl('abc', 'desktop', 'http://127.0.0.1:8080/api');
    expect(url).toBe('ws://127.0.0.1:8080/ws?token=abc&client=desktop&platform=desktop');
  });
});

describe('nextBackoffMs', () => {
  it('doubles until cap', () => {
    expect(nextBackoffMs(0)).toBe(1000);
    expect(nextBackoffMs(1)).toBe(2000);
    expect(nextBackoffMs(2)).toBe(4000);
    expect(nextBackoffMs(10)).toBe(30_000);
  });
});

describe('parseFrame', () => {
  it('parses JSON frames', () => {
    expect(parseFrame('{"type":"pong"}')).toEqual({ type: 'pong' });
    expect(parseFrame('{"type":"dialog.message","data":{"dialogId":1}}')).toMatchObject({
      type: 'dialog.message',
      data: { dialogId: 1 },
    });
  });

  it('accepts bare ping/pong text', () => {
    expect(parseFrame('ping')).toEqual({ type: 'ping' });
  });

  it('returns null for garbage', () => {
    expect(parseFrame('not-json')).toBeNull();
    expect(parseFrame('{}')).toBeNull();
  });
});
