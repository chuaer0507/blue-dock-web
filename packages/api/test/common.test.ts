import { describe, expect, it } from 'vitest';
import {
  AppException,
  DEFAULT_EXTRA,
  EMPTY_PAGE_META,
  hasNextPage,
  hasPreviousPage,
  isPagerEmpty,
  isResultArray,
  isResultEmpty,
  isResultSuccess,
  parsePageMeta,
  parsePagerModel,
  parseResultModel,
  resolveExtra,
  resultSize,
  resultToArray,
  resultToModel,
} from '../src/common';

describe('PageMeta', () => {
  it('parses and computes page flags', () => {
    const meta = parsePageMeta({ page: 2, pageSize: 20, totalSize: 45, totalPage: 3 });
    expect(meta).toEqual({ page: 2, pageSize: 20, totalSize: 45, totalPage: 3 });
    expect(hasNextPage(meta)).toBe(true);
    expect(hasPreviousPage(meta)).toBe(true);
    expect(hasPreviousPage(EMPTY_PAGE_META)).toBe(false);
  });
});

describe('PagerModel', () => {
  it('parses items with converter', () => {
    const pager = parsePagerModel(
      {
        items: [{ id: 1 }, { id: 2 }],
        meta: { page: 1, pageSize: 10, totalSize: 2, totalPage: 1 },
      },
      (raw) => ({ id: Number(raw.id) }),
    );
    expect(pager.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(pager.meta.totalSize).toBe(2);
    expect(isPagerEmpty(pager)).toBe(false);
  });
});

describe('ResultModel', () => {
  it('parses envelope and helpers', () => {
    const ok = parseResultModel({
      code: 0,
      message: 'ok',
      data: { name: 'a' },
      tipsType: 'showDialog',
    });
    expect(isResultSuccess(ok)).toBe(true);
    expect(ok.tipsType).toBe('showDialog');
    expect(resultToModel(ok, (r) => ({ name: String(r.name) }))).toEqual({ name: 'a' });

    const list = parseResultModel({ code: 0, message: '', data: [{ id: 1 }, { id: 2 }] });
    expect(isResultArray(list)).toBe(true);
    expect(resultSize(list)).toBe(2);
    expect(resultToArray(list, (r) => Number(r.id))).toEqual([1, 2]);

    const empty = parseResultModel({ code: 0, message: '' });
    expect(isResultEmpty(empty)).toBe(true);
  });
});

describe('ExtraModel', () => {
  it('resolves ExtraModel defaults', () => {
    expect(resolveExtra()).toEqual(DEFAULT_EXTRA);
    expect(resolveExtra({ showFailTips: false }).showFailTips).toBe(false);
    expect(resolveExtra({ showSuccessTips: true }).showSuccessTips).toBe(true);
  });
});

describe('AppException', () => {
  it('formats toString', () => {
    const err = new AppException('boom');
    expect(err.message).toBe('boom');
    expect(String(err)).toBe('AppException: boom');
  });
});
