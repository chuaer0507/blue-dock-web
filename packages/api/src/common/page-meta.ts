/** 统一分页元数据（JSON camelCase，放在响应 `meta` 内）。 */
export type PageMeta = {
  page: number;
  pageSize: number;
  totalSize: number;
  totalPage: number;
};

export const EMPTY_PAGE_META: PageMeta = {
  page: 1,
  pageSize: 10,
  totalSize: 0,
  totalPage: 0,
};

export function parsePageMeta(raw: unknown): PageMeta {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PAGE_META };
  const m = raw as Record<string, unknown>;
  return {
    page: Number(m.page) || EMPTY_PAGE_META.page,
    pageSize: Number(m.pageSize) || EMPTY_PAGE_META.pageSize,
    totalSize: Number(m.totalSize) || 0,
    totalPage: Number(m.totalPage) || 0,
  };
}

export function hasNextPage(meta: PageMeta): boolean {
  return meta.page < meta.totalPage;
}

export function hasPreviousPage(meta: PageMeta): boolean {
  return meta.page > 1;
}
