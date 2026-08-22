import { useMutation } from '@tanstack/react-query';
import { get } from '../http-api';
import { ApiCodes, ApiError } from '../errors';
import { fetchPublicKey } from '../auth/login';
import { clearPublicKeyCache, encryptPassword, getCachedPublicKey } from '../auth/password-cipher';
import { clearSession } from '../auth/session';

export type DeleteAccountWarning = {
  needConfirm: boolean;
  needCode: boolean;
  email: string;
};

export type DeleteAccountResult = {
  ok: boolean;
};

export type DeleteAccountWarningInput = {
  email: string;
  reason: string;
};

export type DeleteAccountConfirmInput = {
  email: string;
  reason: string;
  password?: string;
  code?: string;
};

export async function deleteAccountWarning(
  input: DeleteAccountWarningInput,
): Promise<DeleteAccountWarning> {
  return get<DeleteAccountWarning>(
    'users/delete/account',
    {
      type: 'warning',
      email: input.email,
      reason: input.reason,
    },
    { extra: { showFailTips: false } },
  );
}

async function deleteAccountConfirm(
  input: DeleteAccountConfirmInput,
): Promise<DeleteAccountResult> {
  const base = {
    type: 'confirm',
    email: input.email,
    reason: input.reason,
  };

  if (input.code?.trim()) {
    return get<DeleteAccountResult>(
      'users/delete/account',
      {
        ...base,
        code: input.code.trim(),
      },
      { extra: { showFailTips: false } },
    );
  }

  const password = input.password ?? '';
  const attempt = async (forceRefresh: boolean): Promise<DeleteAccountResult> => {
    const key =
      !forceRefresh && getCachedPublicKey() ? getCachedPublicKey()! : await fetchPublicKey();
    const enc = await encryptPassword(password, key);
    return get<DeleteAccountResult>(
      'users/delete/account',
      {
        ...base,
        password: enc.password,
        keyId: enc.keyId,
      },
      { extra: { showFailTips: false } },
    );
  };

  try {
    return await attempt(false);
  } catch (err) {
    if (err instanceof ApiError && err.code === ApiCodes.PUBLIC_KEY_INVALID.code) {
      clearPublicKeyCache();
      return attempt(true);
    }
    throw err;
  }
}

/** 注销确认；成功后清本地 token */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccountConfirm,
    onSuccess: () => {
      clearSession();
    },
  });
}

export function useDeleteAccountWarning() {
  return useMutation({
    mutationFn: deleteAccountWarning,
  });
}
