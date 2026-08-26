/**
 * 后端 BIGINT 业务标识符的 API wire 形态。
 *
 * 不得转换为 number：雪花 ID 可超过 Number.MAX_SAFE_INTEGER。
 */
/**
 * 迁移期参数类型：服务端响应已固定为 string；现存 UI 状态仍有 number，逐模块收敛。
 */
export type Id = string | number;

export function isId(value: unknown): value is Id {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value);
}

/** 迁移期同时兼容尚未收敛类型的安全整数调用方。 */
export function hasId(value: unknown): boolean {
  return isId(value) || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0);
}
