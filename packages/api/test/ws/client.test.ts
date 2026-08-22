import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, setAccessToken, setRefreshToken } from '../../src/auth/session';

const ensureRefreshedAccessToken = vi.fn<() => Promise<string | null>>();

vi.mock('../../src/auth/refresh', () => ({
  ensureRefreshedAccessToken: () => ensureRefreshedAccessToken(),
}));

type Listener = (event?: { data?: string }) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  url: string;
  private listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  send(_data: string): void {}

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.emit('close');
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.emit('open');
  }

  private emit(type: string, event?: { data?: string }): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

describe('RealtimeClient token refresh', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    ensureRefreshedAccessToken.mockReset();
    clearSession();
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearSession();
  });

  async function loadClient() {
    vi.resetModules();
    FakeWebSocket.instances = [];
    const mod = await import('../../src/ws/client');
    return new mod.RealtimeClient();
  }

  it('refreshes when access is missing then opens socket', async () => {
    setRefreshToken('r1');
    ensureRefreshedAccessToken.mockImplementation(async () => {
      setAccessToken('a-new');
      return 'a-new';
    });

    const client = await loadClient();
    client.connect({ platform: 'web' });

    await vi.waitFor(() => expect(ensureRefreshedAccessToken).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));

    expect(FakeWebSocket.instances[0]!.url).toContain('token=a-new');
    FakeWebSocket.instances[0]!.open();
    expect(client.getStatus()).toBe('open');
    client.disconnect();
  });

  it('closes without socket when refresh fails', async () => {
    setRefreshToken('r1');
    ensureRefreshedAccessToken.mockResolvedValue(null);

    const client = await loadClient();
    client.connect({ platform: 'web' });

    await vi.waitFor(() => expect(ensureRefreshedAccessToken).toHaveBeenCalled());
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(client.getStatus()).toBe('closed');
  });

  it('reconnects after close and refreshes if access cleared', async () => {
    setAccessToken('a1');
    const client = await loadClient();
    client.connect({ platform: 'web' });

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    FakeWebSocket.instances[0]!.open();
    expect(client.getStatus()).toBe('open');

    clearSession();
    setRefreshToken('r1');
    ensureRefreshedAccessToken.mockImplementation(async () => {
      setAccessToken('a2');
      return 'a2';
    });

    FakeWebSocket.instances[0]!.close();
    expect(client.getStatus()).toBe('closed');

    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => expect(ensureRefreshedAccessToken).toHaveBeenCalled());
    await vi.waitFor(() => expect(FakeWebSocket.instances.length).toBeGreaterThanOrEqual(2));
    expect(FakeWebSocket.instances.at(-1)!.url).toContain('token=a2');
    client.disconnect();
  });

  it('skips refresh when access already present', async () => {
    setAccessToken('a1');
    const client = await loadClient();
    client.connect({ platform: 'web' });

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    expect(ensureRefreshedAccessToken).not.toHaveBeenCalled();
    client.disconnect();
  });
});
