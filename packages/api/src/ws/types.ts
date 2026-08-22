/** 对齐 blue-dock-java `architecture/realtime.md` 的下行帧 */
export type RealtimeFrameType =
  | 'pong'
  | 'dialog.message'
  | 'dialog.message.update'
  | 'dialog.message.withdraw'
  | 'dialog.message.stream'
  | 'operation'
  | 'operationResult'
  | 'appBadge'
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'column.created'
  | 'column.updated'
  | 'column.deleted'
  | 'project.sort'
  | 'presence.online'
  | 'presence.offline'
  | (string & {});

export type RealtimeFrame = {
  type: RealtimeFrameType;
  eventId?: string;
  data?: unknown;
};

export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'closed';

export type RealtimeConnectOptions = {
  /** 对齐 HTTP `X-Platform`；缺省用 `getRequestPlatform()` */
  platform?: string;
  /** 覆盖默认 `/ws` 解析 */
  url?: string;
};

export type FrameHandler = (frame: RealtimeFrame) => void;
export type StatusHandler = (status: RealtimeStatus) => void;
