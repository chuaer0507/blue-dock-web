import { describe, expect, it } from 'vitest';
import {
  ApiCodes,
  ApiError,
  TransportError,
  TransportErrorCodes,
  findApiCode,
  formatHttpFailMessage,
  isApiCode,
  isHttpClientStatus,
  isHttpServerStatus,
} from '../src/errors';

describe('ApiCodes', () => {
  it('aligns with java ErrorCodes numbers', () => {
    expect(ApiCodes.OK.code).toBe(0);
    expect(ApiCodes.BAD_REQUEST.code).toBe(1000);
    expect(ApiCodes.UNAUTHORIZED.code).toBe(1001);
    expect(ApiCodes.FORBIDDEN.code).toBe(1002);
    expect(ApiCodes.NOT_FOUND.code).toBe(1003);
    expect(ApiCodes.AUTH_FAILED.code).toBe(1100);
    expect(ApiCodes.TOKEN_EXPIRED.code).toBe(-2);
    expect(ApiCodes.CAPTCHA_REQUIRED.code).toBe(-3);
    expect(ApiCodes.PUBLIC_KEY_INVALID.code).toBe(-11);
  });

  it('findApiCode resolves known codes and i18nKey', () => {
    expect(findApiCode(1001)).toEqual(ApiCodes.UNAUTHORIZED);
    expect(findApiCode(1001)?.i18nKey).toBe('error.unauthorized');
    expect(findApiCode(9999)).toBeUndefined();
  });

  it('isApiCode compares by numeric code', () => {
    expect(isApiCode(1001, ApiCodes.UNAUTHORIZED)).toBe(true);
    expect(isApiCode(0, ApiCodes.UNAUTHORIZED)).toBe(false);
  });

  it('ApiError attaches i18nKey for known codes', () => {
    const err = new ApiError(ApiCodes.CAPTCHA_REQUIRED.code, 'need captcha');
    expect(err.i18nKey).toBe('auth.captcha_required');
    expect(err.code).toBe(-3);
  });
});

describe('TransportError', () => {
  it('maps timeout axios shape', () => {
    const err = TransportError.fromAxios({
      isAxiosError: true,
      name: 'AxiosError',
      message: 'timeout of 30000ms exceeded',
      code: 'ECONNABORTED',
      toJSON: () => ({}),
    } as never);
    expect(err.kind).toBe(TransportErrorCodes.TIMEOUT.kind);
    expect(err.i18nKey).toBe('error.network.timeout');
  });

  it('maps network failure without response', () => {
    const err = TransportError.fromAxios({
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Network Error',
      toJSON: () => ({}),
    } as never);
    expect(err.kind).toBe(TransportErrorCodes.NETWORK.kind);
  });

  it('maps HTTP 4xx to HTTP_CLIENT with E{status} message', () => {
    const err = TransportError.fromAxios({
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Request failed with status code 404',
      response: { status: 404, data: {}, statusText: 'Not Found', headers: {}, config: {} },
      toJSON: () => ({}),
    } as never);
    expect(err.kind).toBe(TransportErrorCodes.HTTP_CLIENT.kind);
    expect(err.httpStatus).toBe(404);
    expect(err.message).toMatch(/^E404 -/);
    expect(err.failTipsShown).toBe(false);
    err.markFailTipsShown();
    expect(err.failTipsShown).toBe(true);
  });

  it('maps HTTP 5xx to HTTP_SERVER with E{status} message', () => {
    const err = TransportError.fromAxios({
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Request failed with status code 503',
      response: {
        status: 503,
        data: {},
        statusText: 'Service Unavailable',
        headers: {},
        config: {},
      },
      toJSON: () => ({}),
    } as never);
    expect(err.kind).toBe(TransportErrorCodes.HTTP_SERVER.kind);
    expect(err.httpStatus).toBe(503);
    expect(err.message).toBe(formatHttpFailMessage(503, 'zh-CN'));
  });
});

describe('formatHttpFailMessage', () => {
  it('uses clientError for 4xx and serverBusy for 5xx', () => {
    expect(formatHttpFailMessage(400, 'zh-CN')).toBe('E400 - 请求异常，请检查后重试');
    expect(formatHttpFailMessage(500, 'en-US')).toBe('E500 - Server busy, please try again later');
    expect(isHttpClientStatus(404)).toBe(true);
    expect(isHttpServerStatus(502)).toBe(true);
  });
});
