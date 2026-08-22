/**
 * 业务信封码 — SSOT: blue-dock-java `ErrorCodes` + `I18nKeys`（`code` + `i18nKey`）。
 * 网络/传输错误见 `transport-error-code.ts`，勿混入本表。
 */
export type ApiCodeDef = {
  readonly code: number;
  readonly i18nKey: string;
};

export const ApiCodes = {
  OK: { code: 0, i18nKey: 'error.success' },
  BAD_REQUEST: { code: 1000, i18nKey: 'error.bad_request' },
  UNAUTHORIZED: { code: 1001, i18nKey: 'error.unauthorized' },
  FORBIDDEN: { code: 1002, i18nKey: 'error.forbidden' },
  NOT_FOUND: { code: 1003, i18nKey: 'error.not_found' },
  AUTH_FAILED: { code: 1100, i18nKey: 'auth.failed' },
  /** Access 过期；客户端用 refreshToken 无感续期 */
  TOKEN_EXPIRED: { code: -2, i18nKey: 'error.unauthorized_expired' },
  CAPTCHA_REQUIRED: { code: -3, i18nKey: 'auth.captcha_required' },
  PUBLIC_KEY_INVALID: { code: -11, i18nKey: 'auth.public_key_invalid' },
  PROJECT_DENIED: { code: 1200, i18nKey: 'error.forbidden' },
  TASK_DENIED: { code: 1300, i18nKey: 'error.forbidden' },
  DIALOG_DENIED: { code: 1400, i18nKey: 'error.forbidden' },
  FILE_DENIED: { code: 1500, i18nKey: 'error.forbidden' },
  REPORT_DENIED: { code: 1600, i18nKey: 'error.forbidden' },
  ASSISTANT_DENIED: { code: 1700, i18nKey: 'error.forbidden' },
} as const satisfies Record<string, ApiCodeDef>;

export type ApiCodeName = keyof typeof ApiCodes;

const BY_CODE = new Map<number, ApiCodeDef>(Object.values(ApiCodes).map((def) => [def.code, def]));

/** 按信封数字码反查定义；未知码返回 undefined（展示 API message） */
export function findApiCode(code: number): ApiCodeDef | undefined {
  return BY_CODE.get(code);
}

export function isApiCode(code: number, def: ApiCodeDef): boolean {
  return code === def.code;
}
