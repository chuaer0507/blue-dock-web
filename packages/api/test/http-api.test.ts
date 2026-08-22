import { afterEach, describe, expect, it, vi } from 'vitest';
import { http } from '../src/client';
import { getList, getPageList, upload } from '../src/http-api';
import { clearSession, setUnauthorizedHandler } from '../src/auth/session';
import { resetRefreshInflightForTests } from '../src/auth/refresh';

function mockOk(data: unknown) {
  return vi.spyOn(http, 'request').mockResolvedValue({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as never,
  });
}

describe('http-api list helpers', () => {
  afterEach(() => {
    clearSession();
    setUnauthorizedHandler(null);
    resetRefreshInflightForTests();
    vi.restoreAllMocks();
  });

  it('getList maps array data', async () => {
    mockOk({
      code: 0,
      message: '',
      data: [{ id: 1 }, { id: 2 }],
    });
    const list = await getList('x/list', undefined, (raw) => ({ id: Number(raw.id) }));
    expect(list).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('getPageList parses items + meta', async () => {
    mockOk({
      code: 0,
      message: '',
      data: {
        items: [{ name: 'a' }],
        meta: { page: 1, pageSize: 10, totalSize: 1, totalPage: 1 },
      },
    });
    const page = await getPageList('x/page', { page: 1 }, (raw) => ({
      name: String(raw.name),
    }));
    expect(page.items).toEqual([{ name: 'a' }]);
    expect(page.meta.totalSize).toBe(1);
  });
});

describe('http-api upload', () => {
  afterEach(() => {
    clearSession();
    setUnauthorizedHandler(null);
    resetRefreshInflightForTests();
    vi.restoreAllMocks();
  });

  it('posts multipart FormData with file field and extras', async () => {
    const spy = mockOk({
      code: 0,
      message: '',
      data: { id: 9, url: '/x.png' },
    });
    const file = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' });
    await expect(
      upload<{ id: number; url: string }>('system/imageUpload', file, {
        fields: { category: 'media' },
      }),
    ).resolves.toEqual({ id: 9, url: '/x.png' });

    expect(spy).toHaveBeenCalledOnce();
    const arg = spy.mock.calls[0]![0] as {
      url: string;
      method: string;
      data: FormData;
      timeout?: number;
    };
    expect(arg.url).toBe('system/imageUpload');
    expect(arg.method).toBe('post');
    expect(arg.data).toBeInstanceOf(FormData);
    expect(arg.data.get('file')).toBeInstanceOf(File);
    expect(arg.data.get('category')).toBe('media');
    expect(arg.timeout).toBe(120_000);
  });
});
