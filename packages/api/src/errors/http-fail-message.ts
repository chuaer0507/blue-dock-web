/** HTTP 区间文案（拦截器内不依赖 React i18n） */
const HTTP_FAIL_TEXTS = {
  'zh-CN': {
    clientError: '请求异常，请检查后重试',
    serverBusy: '服务器繁忙，请稍候再试',
  },
  'en-US': {
    clientError: 'Request error, please check and retry',
    serverBusy: 'Server busy, please try again later',
  },
} as const;

export type TransportLocale = keyof typeof HTTP_FAIL_TEXTS;

/** 读 `i18nextLng`（与 client Accept-Language 一致） */
export function readStoredLocale(): TransportLocale {
  if (typeof localStorage === 'undefined') return 'zh-CN';
  return localStorage.getItem('i18nextLng') === 'en-US' ? 'en-US' : 'zh-CN';
}

/**
 * HTTP 非 2xx：`E404 - 请求异常…` / `E500 - 服务器繁忙…`。
 * 4xx → clientError；5xx → serverBusy；其它 status 不当作 HTTP 区间提示。
 */
export function formatHttpFailMessage(
  status: number,
  locale: TransportLocale = readStoredLocale(),
): string {
  const texts = HTTP_FAIL_TEXTS[locale];
  if (status >= 500 && status < 600) {
    return `E${status} - ${texts.serverBusy}`;
  }
  if (status >= 400 && status < 500) {
    return `E${status} - ${texts.clientError}`;
  }
  return `E${status}`;
}

export function isHttpClientStatus(status: number): boolean {
  return status >= 400 && status < 500;
}

export function isHttpServerStatus(status: number): boolean {
  return status >= 500 && status < 600;
}
