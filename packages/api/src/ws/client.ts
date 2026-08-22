import { getAccessToken } from '../auth/session';
import { ensureRefreshedAccessToken } from '../auth/refresh';
import { getRequestPlatform } from '../client';
import { buildRealtimeUrl, nextBackoffMs } from './url';
import type {
  FrameHandler,
  RealtimeConnectOptions,
  RealtimeFrame,
  RealtimeStatus,
  StatusHandler,
} from './types';

const PING_INTERVAL_MS = 30_000;

function parseFrame(raw: string): RealtimeFrame | null {
  if (raw === 'ping' || raw === 'pong') {
    return { type: raw };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const type = (parsed as { type?: unknown }).type;
    if (typeof type !== 'string' || !type) return null;
    return parsed as RealtimeFrame;
  } catch {
    return null;
  }
}

/**
 * 单例实时客户端：握手带 token、心跳 ping、断线指数退避。
 * 无 access 时会单飞 `ensureRefreshedAccessToken` 再连。
 * 不依赖 React；壳层用 `useRealtime` 启停。
 */
export class RealtimeClient {
  private socket: WebSocket | null = null;
  private status: RealtimeStatus = 'idle';
  private intentionalClose = false;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private connectOptions: RealtimeConnectOptions = {};
  /** 取消进行中的开连（含 await refresh） */
  private openGeneration = 0;
  private readonly frameHandlers = new Set<FrameHandler>();
  private readonly statusHandlers = new Set<StatusHandler>();

  getStatus(): RealtimeStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'open' && this.socket?.readyState === WebSocket.OPEN;
  }

  onFrame(handler: FrameHandler): () => void {
    this.frameHandlers.add(handler);
    return () => this.frameHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  connect(options: RealtimeConnectOptions = {}): void {
    this.connectOptions = { ...this.connectOptions, ...options };
    this.intentionalClose = false;
    void this.openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.openGeneration += 1;
    this.clearReconnect();
    this.clearPing();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('closed');
  }

  send(payload: RealtimeFrame | string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.socket.send(data);
  }

  private async openSocket(): Promise<void> {
    const generation = ++this.openGeneration;

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.clearReconnect();
    this.setStatus('connecting');

    let token = getAccessToken();
    if (!token) {
      token = (await ensureRefreshedAccessToken()) ?? null;
    }

    if (generation !== this.openGeneration || this.intentionalClose) return;

    if (!token) {
      this.setStatus('closed');
      return;
    }

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const url =
      this.connectOptions.url ??
      buildRealtimeUrl(token, this.connectOptions.platform ?? getRequestPlatform());

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      if (generation !== this.openGeneration || this.intentionalClose) {
        socket.close();
        return;
      }
      this.attempt = 0;
      this.setStatus('open');
      this.startPing();
    });

    socket.addEventListener('message', (event) => {
      const raw = typeof event.data === 'string' ? event.data : String(event.data);
      const frame = parseFrame(raw);
      if (!frame) return;
      if (frame.type === 'ping') {
        this.send({ type: 'pong' });
        return;
      }
      for (const handler of this.frameHandlers) {
        try {
          handler(frame);
        } catch (err) {
          console.error('[realtime] frame handler error', err);
        }
      }
    });

    socket.addEventListener('close', () => {
      if (this.socket === socket) this.socket = null;
      this.clearPing();
      if (generation !== this.openGeneration) return;
      this.setStatus('closed');
      if (!this.intentionalClose) this.scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      // close 事件会接着触发；此处不重复排程
    });
  }

  private scheduleReconnect(): void {
    this.clearReconnect();
    const delay = nextBackoffMs(this.attempt);
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // 无 access 时 openSocket 内会尝试 refresh；勿在此提前 return
      if (!this.intentionalClose) void this.openSocket();
    }, delay);
  }

  private startPing(): void {
    this.clearPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, PING_INTERVAL_MS);
  }

  private clearPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(status: RealtimeStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const handler of this.statusHandlers) {
      try {
        handler(status);
      } catch (err) {
        console.error('[realtime] status handler error', err);
      }
    }
  }
}

export const realtimeClient = new RealtimeClient();

/** @internal 测试用 */
export { parseFrame };
