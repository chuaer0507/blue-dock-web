import axios, { type AxiosRequestConfig } from 'axios';
import { http } from './client';
import {
  isResultEnvelope,
  parsePagerModel,
  type ExtraModel,
  type ItemConverter,
  type PagerModel,
  type TipsType,
} from './common';
import {
  ApiCodes,
  ApiError,
  TransportError,
  showFailTips,
  showSuccessTips,
  showTransportFailTips,
} from './errors';
import { ensureRefreshedAccessToken } from './auth/refresh';
import { handleUnauthorized } from './auth/session';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete';

export type HttpOptions = {
  /** 为 true 时跳过 `1001` 跳转（如登录页探测） */
  skipUnauthorizedHandler?: boolean;
  /** 为 true 时不在 `-2` 时尝试 refresh（续期接口自身） */
  skipTokenRefresh?: boolean;
  /**
   * 请求级 UI 副作用（`ExtraModel`）。
   * `showFailTips: false` 时不弹全局失败 tip；`showSuccessTips: true` 弹成功 tip。
   */
  extra?: ExtraModel;
  /** 透传 axios config（headers / signal 等） */
  config?: AxiosRequestConfig;
};

const REFRESH_WHITELIST = [
  'users/login',
  'users/logout',
  'users/token/refresh',
  'users/key/client',
  'users/login/needCode',
  'users/login/codeJson',
];

function isRefreshWhitelisted(url: string): boolean {
  const path = url.replace(/^\//, '').split('?')[0] ?? url;
  return REFRESH_WHITELIST.some((p) => path === p || path.endsWith(`/${p}`));
}

function readTipsType(body: { tipsType?: unknown }): TipsType | undefined {
  const tips = body.tipsType;
  return tips === 'showToast' || tips === 'showDialog' || tips === 'showSnackBar'
    ? tips
    : undefined;
}

async function dispatchRequest(
  url: string,
  params: Record<string, unknown> | FormData | undefined,
  method: HttpMethod,
  options: HttpOptions | undefined,
) {
  const config = {
    ...options?.config,
    bdExtra: options?.extra ?? options?.config?.bdExtra,
  };
  if (method === 'get' || method === 'delete') {
    return http.request({
      ...config,
      url,
      method,
      params: params && !(params instanceof FormData) ? params : config?.params,
    });
  }
  return http.request({ ...config, url, method, data: params });
}

function maybeNotifyHttpFailTips(err: TransportError, options: HttpOptions | undefined) {
  const status = err.httpStatus;
  if (typeof status !== 'number' || status < 400 || status >= 600) return;
  const shown = showTransportFailTips(err.message, options?.extra);
  if (shown) err.markFailTipsShown();
}

function throwBizError(
  code: number,
  message: string,
  body: unknown,
  tipsType: TipsType | undefined,
  options: HttpOptions | undefined,
): never {
  const err = new ApiError(code, message, body, tipsType);
  // -2 / 1001 由 refresh / 登录跳转处理，不弹 tip
  if (code !== ApiCodes.TOKEN_EXPIRED.code && code !== ApiCodes.UNAUTHORIZED.code) {
    if (showFailTips({ message, tipsType }, options?.extra)) {
      err.markFailTipsShown();
    }
  }
  throw err;
}

async function executeRequest<T>(
  url: string,
  params: Record<string, unknown> | FormData | undefined,
  method: HttpMethod,
  options: HttpOptions | undefined,
  isRetry: boolean,
): Promise<T> {
  const res = await dispatchRequest(url, params, method, options);
  const body = res.data as unknown;

  if (!isResultEnvelope(body)) {
    return body as T;
  }

  const tipsType = readTipsType(body);
  const message = body.message || '';

  if (body.code === ApiCodes.TOKEN_EXPIRED.code) {
    const canRefresh = !isRetry && !options?.skipTokenRefresh && !isRefreshWhitelisted(url);

    if (canRefresh) {
      const newToken = await ensureRefreshedAccessToken();
      if (newToken) {
        return executeRequest<T>(url, params, method, options, true);
      }
      if (!options?.skipUnauthorizedHandler) {
        handleUnauthorized();
      }
    }

    throwBizError(body.code, message || 'token expired', body, tipsType, options);
  }

  if (body.code === ApiCodes.UNAUTHORIZED.code) {
    if (!options?.skipUnauthorizedHandler) {
      handleUnauthorized();
    }
    throwBizError(body.code, message || 'unauthorized', body, tipsType, options);
  }

  if (body.code !== ApiCodes.OK.code) {
    throwBizError(body.code, message || 'request failed', body, tipsType, options);
  }

  showSuccessTips({ message, tipsType }, options?.extra);
  return body.data as T;
}

/**
 * 底层请求（一般用 `get` / `post` / `put` / `del`）。
 * 路径相对 `VITE_API_BASE_URL`（默认 `/api`）。
 *
 * - `code === -2`：单飞 refresh 后重试一次
 * - `code === 1001`：清会话并跳转登录
 * - tip：`extra.showFailTips` / `extra.showSuccessTips`；样式用信封 `tipsType`
 */
export async function request<T>(
  url: string,
  params?: Record<string, unknown> | FormData,
  method: HttpMethod = 'get',
  options?: HttpOptions,
): Promise<T> {
  try {
    return await executeRequest<T>(url, params, method, options, false);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof TransportError) {
      maybeNotifyHttpFailTips(err, options);
      throw err;
    }
    if (axios.isAxiosError(err)) {
      const te = TransportError.fromAxios(err);
      maybeNotifyHttpFailTips(te, options);
      throw te;
    }
    throw TransportError.fromUnknown(err);
  }
}

/** GET */
export function get<T>(
  url: string,
  query?: Record<string, unknown>,
  options?: HttpOptions,
): Promise<T> {
  return request<T>(url, query, 'get', options);
}

/** POST */
export function post<T>(
  url: string,
  data?: Record<string, unknown> | FormData,
  options?: HttpOptions,
): Promise<T> {
  return request<T>(url, data, 'post', options);
}

/** PUT */
export function put<T>(
  url: string,
  data?: Record<string, unknown> | FormData,
  options?: HttpOptions,
): Promise<T> {
  return request<T>(url, data, 'put', options);
}

/**
 * DELETE。方法名用 `del`，避免与 JS 保留字 `delete` 冲突。
 */
export function del<T>(
  url: string,
  query?: Record<string, unknown>,
  options?: HttpOptions,
): Promise<T> {
  return request<T>(url, query, 'delete', options);
}

function asItemConverter<T>(converter?: ItemConverter<T>): ItemConverter<T> {
  return converter ?? ((raw) => raw as unknown as T);
}

/**
 * `data` 为数组（或单对象包成一项）。
 */
export async function getList<T>(
  url: string,
  query?: Record<string, unknown>,
  converter?: ItemConverter<T>,
  options?: HttpOptions,
): Promise<T[]> {
  const data = await get<unknown>(url, query, options);
  const map = asItemConverter(converter);
  if (Array.isArray(data)) {
    return data.map((e) => map(e && typeof e === 'object' ? (e as Record<string, unknown>) : {}));
  }
  if (data && typeof data === 'object') {
    return [map(data as Record<string, unknown>)];
  }
  return [];
}

/**
 * `data: { items, meta }` → `PagerModel<T>`。
 */
export async function getPageList<T>(
  url: string,
  query?: Record<string, unknown>,
  converter?: ItemConverter<T>,
  options?: HttpOptions,
): Promise<PagerModel<T>> {
  const data = await get<unknown>(url, query, options);
  return parsePagerModel(data, asItemConverter(converter));
}

export type UploadOptions = HttpOptions & {
  /** FormData 文件字段名，默认 `file`（对齐 `system/imageUpload`） */
  fieldName?: string;
  /** Blob 建议传入；`File` 默认用 `file.name` */
  filename?: string;
  /** 额外表单字段（会 `String()`；布尔写成 `1`/`0`） */
  fields?: Record<string, string | number | boolean>;
  /** 上传进度 0–1 */
  onProgress?: (ratio: number) => void;
};

/**
 * multipart 直传（小图 / 附件等）。
 *
 * @example
 * await upload<SystemImageUploadResult>('system/imageUpload', file)
 * await upload('system/uploads', file, { fields: { category: 'media' } })
 * await upload('dialog/message/sendFile', file, {
 *   fieldName: 'files',
 *   fields: { dialogId: 1 },
 * })
 */
export async function upload<T>(
  url: string,
  file: File | Blob,
  options?: UploadOptions,
): Promise<T> {
  const {
    fieldName = 'file',
    filename,
    fields,
    onProgress,
    config,
    ...httpOptions
  } = options ?? {};

  const form = new FormData();
  const name = filename ?? (file instanceof File && file.name ? file.name : 'blob');
  form.append(fieldName, file, name);

  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    }
  }

  return post<T>(url, form, {
    ...httpOptions,
    config: {
      timeout: 120_000,
      ...config,
      onUploadProgress: (event) => {
        if (onProgress && event.total && event.total > 0) {
          onProgress(Math.min(1, event.loaded / event.total));
        }
        config?.onUploadProgress?.(event);
      },
    },
  });
}
