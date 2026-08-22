/**
 * 传输层错误（超时 / 断网 / HTTP / 解析等）。
 * 与业务 `ApiCodes` 解耦；仅描述 axios / 网络 / 解析失败。
 */
export type TransportErrorDef = {
  readonly kind: string;
  readonly i18nKey: string;
};

export const TransportErrorCodes = {
  TIMEOUT: { kind: 'timeout', i18nKey: 'error.network.timeout' },
  NETWORK: { kind: 'network', i18nKey: 'error.network.connection' },
  CANCELED: { kind: 'canceled', i18nKey: 'error.network.canceled' },
  /** HTTP 4xx */
  HTTP_CLIENT: { kind: 'http_client', i18nKey: 'error.network.client' },
  /** HTTP 5xx */
  HTTP_SERVER: { kind: 'http_server', i18nKey: 'error.network.server' },
  /** 其它非 2xx HTTP */
  HTTP: { kind: 'http', i18nKey: 'error.network.http' },
  PARSE: { kind: 'parse', i18nKey: 'error.network.parse' },
  UNKNOWN: { kind: 'unknown', i18nKey: 'error.network.unknown' },
} as const satisfies Record<string, TransportErrorDef>;

export type TransportErrorName = keyof typeof TransportErrorCodes;
