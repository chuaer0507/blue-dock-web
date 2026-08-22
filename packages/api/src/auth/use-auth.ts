import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys, loginRequest, logoutRequest, type LoginParams, type LoginResult } from './login';
import {
  registerRequest,
  resetPasswordRequest,
  sendEmailCode,
  verifyEmailCode,
  type EmailCodeType,
  type RegisterParams,
  type RegisterResult,
  type ResetPasswordParams,
  type ResetPasswordResult,
  type SendEmailCodeResult,
} from './register';

/** 登录 Mutation（密码加密在 `loginRequest` 内完成） */
export function useLogin() {
  return useMutation<LoginResult, Error, LoginParams>({
    mutationKey: [...authKeys.all(), 'login'] as const,
    mutationFn: loginRequest,
  });
}

/** 登出 Mutation；结束后清空 Query 缓存 */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationKey: [...authKeys.all(), 'logout'] as const,
    mutationFn: () => logoutRequest(),
    onSettled: () => {
      queryClient.clear();
    },
  });
}

/** 发送邮箱验证码 */
export function useSendEmailCode() {
  return useMutation<SendEmailCodeResult, Error, { email: string; type: EmailCodeType }>({
    mutationKey: [...authKeys.all(), 'emailCode'] as const,
    mutationFn: ({ email, type }) => sendEmailCode(email, type),
  });
}

/** 自助注册（RSA 密码 + 邮箱验证码） */
export function useRegister() {
  return useMutation<RegisterResult, Error, RegisterParams>({
    mutationKey: [...authKeys.all(), 'register'] as const,
    mutationFn: registerRequest,
  });
}

/** 忘记密码重置（校验邮箱码后 RSA 新密码） */
export function useResetPassword() {
  return useMutation<ResetPasswordResult, Error, ResetPasswordParams>({
    mutationKey: [...authKeys.all(), 'resetPassword'] as const,
    mutationFn: resetPasswordRequest,
  });
}

/** 邮箱验证链接确认（匿名） */
export function useVerifyEmail() {
  return useMutation<{ ok?: boolean; email?: string }, Error, string>({
    mutationKey: [...authKeys.all(), 'emailVerification'] as const,
    mutationFn: (code) => verifyEmailCode(code),
  });
}
