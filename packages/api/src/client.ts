import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import {
  isResultEnvelope,
  parseResultModel,
  resolveExtra,
  type ExtraModel,
  type ResultModel,
} from './common';
import { env } from './env';
import { getAccessToken } from './auth/session';
import { getDeviceId, getTimezone } from './request-meta';
import {
  buildHttpCacheKey,
  cachedResponseAdapter,
  readHttpCache,
  writeHttpCache,
} from './http-cache';

export { clearHttpCache, HTTP_CACHE_TTL_MS } from './http-cache';
export { getDeviceId, getTimezone } from './request-meta';

/** 对齐 java realtime：web / mac / windows / linux / ios / android */
export type RequestPlatform = 'web' | 'mac' | 'windows' | 'linux' | 'ios' | 'android';

/** 懒加载蒙层延迟（1s） */
export const LAZY_LOADING_MS = 1000;

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * 请求级 UI 副作用（`ExtraModel`）。
     * 由 `get`/`post`/… 的 `{ extra }` 写入；拦截器内 `resolveExtra`。
     */
    bdExtra?: ExtraModel;
  }

  interface InternalAxiosRequestConfig {
    /** @internal 请求拦截器写入的已 resolve Extra */
    bdResolvedExtra?: Required<ExtraModel>;
    /** @internal GET + useCache 未命中时标记，响应后写入短缓存 */
    bdCacheWrite?: boolean;
  }
}

/** 测试可覆盖；`null` 表示每次请求按设备探测 */
let platformOverride: RequestPlatform | null = null;

type DesktopBridgeLike = { getPlatform?: () => string };
type MobileBridgeLike = { getPlatform?: () => 'ios' | 'android' | string };

function readDesktopBridge(): DesktopBridgeLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { desktop?: DesktopBridgeLike }).desktop;
}

function readMobileBridge(): MobileBridgeLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { blueDockMobile?: MobileBridgeLike }).blueDockMobile;
}

/**
 * 按实际运行设备解析 platform（Electron OS / 原生壳 / 移动浏览器 UA / Web）。
 */
export function detectRequestPlatform(): RequestPlatform {
  const desktop = readDesktopBridge();
  if (desktop?.getPlatform) {
    switch (desktop.getPlatform()) {
      case 'darwin':
        return 'mac';
      case 'win32':
        return 'windows';
      case 'linux':
        return 'linux';
      default:
        break;
    }
  }

  const mobile = readMobileBridge();
  if (mobile?.getPlatform) {
    const p = mobile.getPlatform();
    if (p === 'ios' || p === 'android') return p;
  }

  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/macintosh/.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
    if (/android/.test(ua)) return 'android';
  }

  return 'web';
}

/** 强制覆盖探测结果；传 `null` 恢复自动探测 */
export function setRequestPlatform(platform: RequestPlatform | null): void {
  platformOverride = platform;
}

export function getRequestPlatform(): RequestPlatform {
  return platformOverride ?? detectRequestPlatform();
}

// ─── Loading（ExtraModel.showLoading / showLazyLoading）───

export type LoadingController = {
  show: () => void;
  hide: () => void;
};

let loadingController: LoadingController | null = null;
let lazyLoadingTimer: ReturnType<typeof setTimeout> | null = null;
let loadingVisible = false;

/** 壳层注入全局 loading UI（未注册时 ExtraModel.showLoading 静默） */
export function setLoadingController(controller: LoadingController | null): void {
  loadingController = controller;
}

function cancelLoading(): void {
  if (lazyLoadingTimer != null) {
    clearTimeout(lazyLoadingTimer);
    lazyLoadingTimer = null;
  }
  if (loadingVisible) {
    loadingController?.hide();
    loadingVisible = false;
  }
}

function beginLoading(extra: Required<ExtraModel>): void {
  cancelLoading();
  if (!loadingController) return;
  if (extra.showLoading) {
    loadingController.show();
    loadingVisible = true;
    return;
  }
  if (extra.showLazyLoading) {
    lazyLoadingTimer = setTimeout(() => {
      lazyLoadingTimer = null;
      if (!loadingController) return;
      loadingController.show();
      loadingVisible = true;
    }, LAZY_LOADING_MS);
  }
}

// ─── 请求前后监听（ExtraModel / ResultModel）────────────────────────────────

export type HttpRequestContext = {
  extra: Required<ExtraModel>;
  config: InternalAxiosRequestConfig;
};

export type HttpResponseContext = {
  extra: Required<ExtraModel>;
  /** 信封体；非 `{ code }` 响应为 `null` */
  result: ResultModel | null;
  response: AxiosResponse;
};

export type HttpErrorContext = {
  extra: Required<ExtraModel>;
  error: unknown;
};

export type HttpLifecycleHandlers = {
  onRequest?: (ctx: HttpRequestContext) => void;
  onResponse?: (ctx: HttpResponseContext) => void;
  onError?: (ctx: HttpErrorContext) => void;
};

let lifecycleHandlers: HttpLifecycleHandlers | null = null;

/** 注册请求前 / 响应后 / 错误监听（可与 LoadingController 并存） */
export function setHttpLifecycleHandlers(handlers: HttpLifecycleHandlers | null): void {
  lifecycleHandlers = handlers;
}

function readResolvedExtra(config: InternalAxiosRequestConfig | undefined): Required<ExtraModel> {
  return config?.bdResolvedExtra ?? resolveExtra(config?.bdExtra);
}

/**
 * axios 单例：注入鉴权与公共请求头；拦截器消费 `ExtraModel` / 解析 `ResultModel`。
 * 业务信封解包与 `1001` / MessageTips 仍在 `http-api`（`get`/`post`/…）。
 */
export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['X-Request-ID'] = crypto.randomUUID();
  config.headers['X-App-Version'] = env.appVersion;
  config.headers['X-Platform'] = getRequestPlatform();
  config.headers['X-Device-ID'] = getDeviceId();
  config.headers['X-Timezone'] = getTimezone();
  const storedLng = typeof localStorage !== 'undefined' ? localStorage.getItem('i18nextLng') : null;
  config.headers['Accept-Language'] =
    storedLng === 'zh-CN' || storedLng === 'en-US' ? storedLng : 'zh-CN';

  const extra = resolveExtra(config.bdExtra);
  config.bdResolvedExtra = extra;
  config.bdCacheWrite = false;

  // GET + useCache：内存短缓存
  const method = (config.method ?? 'get').toLowerCase();
  if (method === 'get' && extra.useCache) {
    const key = buildHttpCacheKey(config);
    const hit = readHttpCache(key);
    if (hit) {
      lifecycleHandlers?.onRequest?.({ extra, config });
      config.adapter = async () => cachedResponseAdapter(config, hit);
      return config;
    }
    config.bdCacheWrite = true;
  }

  beginLoading(extra);
  lifecycleHandlers?.onRequest?.({ extra, config });

  return config;
});

http.interceptors.response.use(
  (response) => {
    const extra = readResolvedExtra(response.config);
    cancelLoading();
    if (response.config.bdCacheWrite) {
      writeHttpCache(buildHttpCacheKey(response.config), response);
    }
    const raw = response.data as unknown;
    const result = isResultEnvelope(raw) ? parseResultModel(raw) : null;
    lifecycleHandlers?.onResponse?.({ extra, result, response });
    return response;
  },
  (error: unknown) => {
    const config =
      axios.isAxiosError(error) && error.config
        ? (error.config as InternalAxiosRequestConfig)
        : undefined;
    const extra = readResolvedExtra(config);
    cancelLoading();
    lifecycleHandlers?.onError?.({ extra, error });
    return Promise.reject(error);
  },
);
