import { get } from '../http-api';
import { ApiCodes, ApiError } from '../errors';
import {
  cachePublicKey,
  clearPublicKeyCache,
  encryptPassword,
  getCachedPublicKey,
  type PublicKeyData,
} from './password-cipher';

/** 拉取客户端 RSA 公钥并缓存 */
export async function fetchPublicKey(): Promise<PublicKeyData> {
  const data = await get<PublicKeyData>('users/key/client');
  cachePublicKey(data);
  return data;
}

/**
 * 用当前公钥加密明文密码；`code === -11` 时清缓存重拉公钥再试一次。
 */
export async function runEncryptedPassword<T>(
  plainPassword: string,
  run: (enc: { password: string; keyId: string }) => Promise<T>,
): Promise<T> {
  const attempt = async (forceRefresh: boolean): Promise<T> => {
    const key =
      !forceRefresh && getCachedPublicKey() ? getCachedPublicKey()! : await fetchPublicKey();
    const enc = await encryptPassword(plainPassword, key);
    return run(enc);
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
