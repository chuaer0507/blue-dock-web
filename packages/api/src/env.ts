/** 类型安全的环境变量读取（Vite `VITE_*`） */
export const env = {
  /** 业务 API 前缀，开发默认走 Vite 代理 `/api` */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api',
  appVersion: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '1.0.0',
  dev: Boolean(import.meta.env.DEV),
  prod: Boolean(import.meta.env.PROD),
} as const;
