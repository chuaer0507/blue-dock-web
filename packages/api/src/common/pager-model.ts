import { parsePageMeta, type PageMeta } from './page-meta';

/** 分页列表：`data: { items, meta }`。 */
export type PagerModel<T> = {
  items: T[];
  meta: PageMeta;
};

export type ItemConverter<T> = (raw: Record<string, unknown>) => T;

export function parsePagerModel<T>(raw: unknown, converter: ItemConverter<T>): PagerModel<T> {
  const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const itemsJson = Array.isArray(body.items) ? body.items : [];
  return {
    items: itemsJson.map((e) =>
      converter(e && typeof e === 'object' ? (e as Record<string, unknown>) : {}),
    ),
    meta: parsePageMeta(body.meta),
  };
}

export function isPagerEmpty<T>(pager: PagerModel<T>): boolean {
  return pager.items.length === 0;
}
