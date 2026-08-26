import { describe, expect, it } from 'vitest';
import { ADMIN_APPS, DEFAULT_ADMIN_SORT } from '../../../src/features/application/catalog';

describe('管理员应用卡片', () => {
  it('均指向管理端路由，且应用标识不重复', () => {
    expect(ADMIN_APPS).not.toHaveLength(0);
    expect(new Set(ADMIN_APPS.map((app) => app.id)).size).toBe(ADMIN_APPS.length);
    expect(ADMIN_APPS.every((app) => app.path?.startsWith('/manage/'))).toBe(true);
  });

  it('默认排序覆盖全部管理员应用', () => {
    expect(DEFAULT_ADMIN_SORT).toEqual(ADMIN_APPS.map((app) => app.id));
  });
});
