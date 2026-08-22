/** `GET users/key/client` 响应（SSOT：blue-dock-java auth-wire） */
export type PublicKeyData = {
  keyId: string;
  publicKey: string;
  algorithm?: string;
};

let cachedKey: PublicKeyData | null = null;

/** 将 PEM / SPKI base64 转为 CryptoKey（RSA-OAEP-SHA256） */
async function importPublicKey(pemOrBase64: string): Promise<CryptoKey> {
  let b64 = pemOrBase64.trim();
  if (b64.includes('BEGIN PUBLIC KEY')) {
    b64 = b64
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s+/g, '');
  }
  const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('spki', binary, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, [
    'encrypt',
  ]);
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

/**
 * RSA-OAEP-SHA256 加密密码。
 * 失败直接抛错——禁止明文回退。
 */
export async function encryptPassword(
  password: string,
  keyData: PublicKeyData,
): Promise<{ password: string; keyId: string }> {
  const key = await importPublicKey(keyData.publicKey);
  const encoded = new TextEncoder().encode(password);
  const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded);
  return { password: bufToBase64(cipher), keyId: keyData.keyId };
}

export function cachePublicKey(data: PublicKeyData): void {
  cachedKey = data;
}

export function getCachedPublicKey(): PublicKeyData | null {
  return cachedKey;
}

export function clearPublicKeyCache(): void {
  cachedKey = null;
}
