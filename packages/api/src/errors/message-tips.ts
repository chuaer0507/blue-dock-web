import type { ExtraModel, ResultModel, TipsType } from '../common';
import { resolveExtra } from '../common';

/** MessageTips 分发载荷 */
export type MessageTipsPayload = {
  message: string;
  tipsType: TipsType;
  success: boolean;
};

export type MessageTipsHandler = (payload: MessageTipsPayload) => void;

let tipsHandler: MessageTipsHandler | null = null;

/**
 * 注册成功/失败提示 UI。
 * 壳层注入 toast / dialog；未注册时静默。
 */
export function setMessageTipsHandler(handler: MessageTipsHandler | null): void {
  tipsHandler = handler;
}

function dispatch(message: string, tipsType: TipsType, success: boolean): void {
  const text = message.trim();
  if (!text) return;
  tipsHandler?.({ message: text, tipsType, success });
}

/** 成功 tip：受 `extra.showSuccessTips` 控制；样式用信封 `tipsType`（默认 toast） */
export function showSuccessTips(
  result: Pick<ResultModel, 'message' | 'tipsType'>,
  extra?: ExtraModel | null,
): void {
  const resolved = resolveExtra(extra);
  if (!resolved.showSuccessTips) return;
  const message = result.message ?? '';
  if (!message.trim()) return;
  dispatch(message, result.tipsType ?? 'showToast', true);
}

/**
 * 业务失败 tip：仅受 `extra.showFailTips` 控制；样式用信封 `tipsType`（默认 toast）。
 * 返回是否已弹出（供 `ApiError.markFailTipsShown`）。
 */
export function showFailTips(
  result: Pick<ResultModel, 'message' | 'tipsType'>,
  extra?: ExtraModel | null,
): boolean {
  const message = result.message ?? '';
  if (!message.trim()) return false;
  if (!resolveExtra(extra).showFailTips) return false;
  dispatch(message, result.tipsType ?? 'showToast', false);
  return true;
}

/** HTTP 4xx/5xx：受 `extra.showFailTips` 控制；固定 toast */
export function showTransportFailTips(message: string, extra?: ExtraModel | null): boolean {
  if (!resolveExtra(extra).showFailTips) return false;
  if (!message.trim()) return false;
  dispatch(message, 'showToast', false);
  return true;
}
