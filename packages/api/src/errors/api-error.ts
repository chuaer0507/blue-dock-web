import axios, { type AxiosError } from 'axios';
import type { TipsType } from '../common';
import { findApiCode } from './api-code';
import {
  formatHttpFailMessage,
  isHttpClientStatus,
  isHttpServerStatus,
  readStoredLocale,
} from './http-fail-message';
import { TransportErrorCodes, type TransportErrorDef } from './transport-error-code';

/** 业务信封错误（HTTP 常为 200，`code !== 0`） */
export class ApiError extends Error {
  readonly code: number;
  readonly i18nKey: string | undefined;
  readonly data: unknown;
  readonly tipsType: TipsType | undefined;
  private _failTipsShown = false;

  constructor(code: number, message: string, data?: unknown, tipsType?: TipsType | null) {
    super(message || `api error ${code}`);
    this.name = 'ApiError';
    this.code = code;
    this.i18nKey = findApiCode(code)?.i18nKey;
    this.data = data;
    this.tipsType = tipsType ?? undefined;
  }

  /** 是否已由全局 MessageTips 弹过 */
  get failTipsShown(): boolean {
    return this._failTipsShown;
  }

  /** @internal */
  markFailTipsShown(): void {
    this._failTipsShown = true;
  }
}

/** axios / 网络层错误 */
export class TransportError extends Error {
  readonly kind: string;
  readonly i18nKey: string;
  readonly cause: unknown;
  readonly httpStatus: number | undefined;
  private _failTipsShown = false;

  constructor(def: TransportErrorDef, message: string, cause?: unknown, httpStatus?: number) {
    super(message);
    this.name = 'TransportError';
    this.kind = def.kind;
    this.i18nKey = def.i18nKey;
    this.cause = cause;
    this.httpStatus = httpStatus;
  }

  /** 是否已由全局 fail tips 弹过（4xx/5xx） */
  get failTipsShown(): boolean {
    return this._failTipsShown;
  }

  /** @internal 弹出全局 tip 后标记，供 UI 跳过二次 toast */
  markFailTipsShown(): void {
    this._failTipsShown = true;
  }

  static fromAxios(error: AxiosError): TransportError {
    if (error.code === 'ERR_CANCELED' || error.message === 'canceled') {
      return new TransportError(TransportErrorCodes.CANCELED, error.message, error);
    }
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      error.message.toLowerCase().includes('timeout')
    ) {
      return new TransportError(TransportErrorCodes.TIMEOUT, error.message, error);
    }
    if (!error.response) {
      return new TransportError(TransportErrorCodes.NETWORK, error.message, error);
    }
    const status = error.response.status;
    const locale = readStoredLocale();
    if (isHttpServerStatus(status)) {
      return new TransportError(
        TransportErrorCodes.HTTP_SERVER,
        formatHttpFailMessage(status, locale),
        error,
        status,
      );
    }
    if (isHttpClientStatus(status)) {
      return new TransportError(
        TransportErrorCodes.HTTP_CLIENT,
        formatHttpFailMessage(status, locale),
        error,
        status,
      );
    }
    return new TransportError(
      TransportErrorCodes.HTTP,
      formatHttpFailMessage(status, locale),
      error,
      status,
    );
  }

  static fromUnknown(error: unknown): TransportError {
    if (axios.isAxiosError(error)) return TransportError.fromAxios(error);
    const message = error instanceof Error ? error.message : 'unknown error';
    return new TransportError(TransportErrorCodes.UNKNOWN, message, error);
  }
}
