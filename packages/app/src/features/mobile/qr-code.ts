/** 从扫码原文提取登录票据（纯 code 或 URL ?code=） */
export function extractQrLoginCode(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  if (text.length >= 32 && !/[\s]/.test(text) && !text.includes('://') && !text.includes('?')) {
    return text;
  }
  try {
    const url = new URL(text);
    const code = url.searchParams.get('code') || url.searchParams.get('qrCode');
    if (code && code.trim().length >= 32) return code.trim();
  } catch {
    // not a URL
  }
  const m = text.match(/(?:^|[?&#])code=([A-Za-z0-9_-]{32,})/);
  if (m?.[1]) return m[1];
  if (text.length >= 32) return text.replace(/\s+/g, '');
  return null;
}
