import { ApiError, TransportError } from '@blue-dock/api';
import { toast } from '@heroui/react';

/**
 * 请求失败 toast：已由全局 MessageTips 弹过的错误跳过，避免双 toast。
 */
export function toastRequestError(err: unknown, fallback: string): void {
  if (err instanceof TransportError && err.failTipsShown) return;
  if (err instanceof ApiError && err.failTipsShown) return;
  if (err instanceof ApiError || err instanceof TransportError) {
    toast.danger(err.message || fallback);
    return;
  }
  toast.danger(fallback);
}

/**
 * 表单字段错误文案；全局 tip 已弹时返回 `undefined`（勿再写入字段）。
 */
export function requestErrorMessage(err: unknown, fallback: string): string | undefined {
  if (err instanceof TransportError && err.failTipsShown) return undefined;
  if (err instanceof ApiError && err.failTipsShown) return undefined;
  if (err instanceof ApiError || err instanceof TransportError) {
    return err.message || fallback;
  }
  return fallback;
}
