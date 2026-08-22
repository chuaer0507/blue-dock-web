import { get, post } from '../http-api';
import { setSessionTokens } from './session';
import { runEncryptedPassword } from './password-request';

export type EmailCodeType = 'reg' | 'reset';

export type SendEmailCodeResult = {
  ok?: boolean;
  /** 本地/无 SMTP 时后端可能回传开发验证码 */
  devCode?: string;
};

/** 发送邮箱验证码（注册 / 重置密码） */
export function sendEmailCode(email: string, type: EmailCodeType): Promise<SendEmailCodeResult> {
  return get<SendEmailCodeResult>(
    'users/email/code',
    { email: email.trim(), type },
    {
      skipUnauthorizedHandler: true,
      skipTokenRefresh: true,
      extra: { showFailTips: false },
    },
  );
}

export type RegisterParams = {
  email: string;
  password: string;
  nickname?: string;
  emailCode: string;
  invite?: string;
};

export type RegisterResult = {
  token?: string;
  refreshToken?: string;
  user?: Record<string, unknown>;
  /** 需先验证邮箱再登录时可能返回 */
  requireEmailVerify?: boolean;
};

/** 确认邮箱验证链接（匿名；`code` 30min 一次性） */
export function verifyEmailCode(code: string): Promise<{ ok?: boolean; email?: string }> {
  return get<{ ok?: boolean; email?: string }>(
    'users/email/verification',
    { code: code.trim() },
    {
      skipUnauthorizedHandler: true,
      skipTokenRefresh: true,
      extra: { showFailTips: false },
    },
  );
}

/**
 * 自助注册：密码 RSA 加密后上送；须带邮箱验证码。
 * 成功若带回 token 则写入会话。
 */
export async function registerRequest(params: RegisterParams): Promise<RegisterResult> {
  const result = await runEncryptedPassword(params.password, (enc) =>
    post<RegisterResult>(
      'users/register',
      {
        email: params.email.trim(),
        password: enc.password,
        keyId: enc.keyId,
        emailCode: params.emailCode.trim(),
        ...(params.nickname?.trim() ? { nickname: params.nickname.trim() } : {}),
        ...(params.invite?.trim() ? { invite: params.invite.trim() } : {}),
      },
      {
        skipUnauthorizedHandler: true,
        skipTokenRefresh: true,
        extra: { showFailTips: false },
      },
    ),
  );

  if (result?.token) {
    setSessionTokens(result.token, result.refreshToken);
  }
  return result;
}

export type ResetPasswordParams = {
  email: string;
  emailCode: string;
  password: string;
};

export type ResetPasswordResult = {
  ok?: boolean;
};

/** 忘记密码：校验邮箱验证码后，RSA 加密新密码上送 */
export async function resetPasswordRequest(
  params: ResetPasswordParams,
): Promise<ResetPasswordResult> {
  return runEncryptedPassword(params.password, (enc) =>
    post<ResetPasswordResult>(
      'users/password/reset',
      {
        email: params.email.trim(),
        emailCode: params.emailCode.trim(),
        password: enc.password,
        keyId: enc.keyId,
      },
      {
        skipUnauthorizedHandler: true,
        skipTokenRefresh: true,
        extra: { showFailTips: false },
      },
    ),
  );
}
