import { get } from '../http-api';
import { setSessionTokens } from './session';

export type QrCreateResult = {
  code: string;
  status: string;
  expire: number;
};

export type QrStatusResult = {
  code: string;
  status: 'waiting' | 'confirmed' | 'success' | string;
  token?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
};

/** 桌面端创建扫码票据 */
export function createQrLogin(): Promise<QrCreateResult> {
  return get<QrCreateResult>(
    'users/login/qrCode',
    { type: 'create' },
    {
      skipUnauthorizedHandler: true,
      skipTokenRefresh: true,
      extra: { showFailTips: false },
    },
  );
}

/** 已登录移动端确认扫码（票据 → confirmed） */
export function confirmQrLogin(code: string): Promise<QrStatusResult> {
  return get<QrStatusResult>(
    'users/login/qrCode',
    { type: 'confirm', code },
    {
      extra: { showFailTips: true },
    },
  );
}

/** 轮询扫码状态；success 时写入 token */
export async function pollQrLogin(code: string): Promise<QrStatusResult> {
  const data = await get<QrStatusResult>(
    'users/login/qrCode',
    { type: 'status', code },
    {
      skipUnauthorizedHandler: true,
      skipTokenRefresh: true,
      extra: { showFailTips: false },
    },
  );
  if (data.status === 'success' && data.token) {
    setSessionTokens(data.token, data.refreshToken);
  }
  return data;
}

export type NeedInviteResult = {
  need: boolean;
};

export function fetchNeedInvite(): Promise<NeedInviteResult> {
  return get<NeedInviteResult>('users/register/needInvite', undefined, {
    skipUnauthorizedHandler: true,
    skipTokenRefresh: true,
    extra: { showFailTips: false },
  });
}
