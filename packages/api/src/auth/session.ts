const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/** 读取本地 access token（Bearer） */
export function getAccessToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** 读取本地 refresh token（无感续期） */
export function getRefreshToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** 写入 access token */
export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

/** 写入 refresh token */
export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/** 登录 / 续期成功后写入一对 token */
export function setSessionTokens(accessToken: string, refreshToken?: string | null): void {
  setAccessToken(accessToken);
  if (refreshToken) {
    setRefreshToken(refreshToken);
  }
}

/** 清除本地会话 token */
export function clearAccessToken(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function clearRefreshToken(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** 清 access + refresh */
export function clearSession(): void {
  clearAccessToken();
  clearRefreshToken();
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * 注册未登录处理（`code === 1001`，或 refresh 失败）。
 * 壳层可注入路由跳转；未注册时默认清 token 并硬跳 `/login`。
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/** 清会话并触发未登录处理 */
export function handleUnauthorized(): void {
  clearSession();
  if (unauthorizedHandler) {
    unauthorizedHandler();
    return;
  }
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path !== '/login' && !path.startsWith('/login/')) {
      window.location.assign('/login');
    }
  }
}
