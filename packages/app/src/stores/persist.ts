import { createJSONStorage, type PersistOptions, type StateStorage } from 'zustand/middleware';

const PREFIX = 'blue-dock';

let scopeUserId: number | null = null;

/** 当前 persist 作用域用户；未登录时用 anonymous */
export function getPersistUserId(): number | null {
  return scopeUserId;
}

/** 登录后绑定用户作用域（后续 store 键按 userId 隔离） */
export function bindPersistAfterLogin(userId: number): void {
  scopeUserId = userId > 0 ? userId : null;
}

/** 登出后清空作用域 */
export function clearPersistAfterLogout(): void {
  scopeUserId = null;
}

function scopedKey(name: string): string {
  const uid = scopeUserId ?? 'anon';
  return `${PREFIX}:u${uid}:${name}`;
}

/** 按用户隔离的 localStorage 适配器 */
export function createScopedStorage(name: string): StateStorage {
  return {
    getItem: () => {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(scopedKey(name));
    },
    setItem: (_key, value) => {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(scopedKey(name), value);
    },
    removeItem: () => {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(scopedKey(name));
    },
  };
}

/** Zustand persist 的 name + 按用户隔离 storage */
export function scopedPersistOptions(
  name: string,
): Pick<PersistOptions<unknown>, 'name' | 'storage'> {
  return {
    name,
    storage: createJSONStorage(() => createScopedStorage(name)),
  };
}
