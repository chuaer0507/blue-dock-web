import { get, post } from '../http-api';
import { ApiCodes, ApiError } from '../errors';
import { cachePublicKey, type PublicKeyData } from './password-cipher';
import { clearSession, setSessionTokens } from './session';
import { runEncryptedPassword } from './password-request';

export const authKeys = {
  all: () => ['auth'] as const,
  publicKey: () => [...authKeys.all(), 'publicKey'] as const,
  needCode: () => [...authKeys.all(), 'needCode'] as const,
};

/** 拉取客户端 RSA 公钥并缓存 */
export async function fetchPublicKey(): Promise<PublicKeyData> {
  const data = await get<PublicKeyData>('users/key/client');
  cachePublicKey(data);
  return data;
}

export type LoginParams = {
  email: string;
  password: string;
  captchaKey?: string;
  captchaCode?: string;
};

export type LoginResult = {
  token: string;
  refreshToken?: string;
  user: Record<string, unknown>;
};

/**
 * 登录：RSA-OAEP 加密密码后 `users/login`。
 * `code === -11` 清公钥缓存重试一次。
 */
export async function loginRequest(params: LoginParams): Promise<LoginResult> {
  const result = await runEncryptedPassword(params.password, (enc) =>
    post<LoginResult>(
      'users/login',
      {
        email: params.email,
        password: enc.password,
        keyId: enc.keyId,
        captchaKey: params.captchaKey,
        captchaCode: params.captchaCode,
      },
      {
        skipUnauthorizedHandler: true,
        skipTokenRefresh: true,
        extra: { showFailTips: false },
      },
    ),
  );

  if (!result?.token) {
    throw new ApiError(ApiCodes.AUTH_FAILED.code, 'login failed: missing token');
  }
  setSessionTokens(result.token, result.refreshToken);
  return result;
}

/** 登出：尽力调接口，始终清本地 token */
export async function logoutRequest(): Promise<void> {
  try {
    await get('users/logout', undefined, {
      skipUnauthorizedHandler: true,
      skipTokenRefresh: true,
    });
  } finally {
    clearSession();
  }
}
