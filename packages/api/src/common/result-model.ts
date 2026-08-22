/**
 * 后端指定提示样式（信封 `tipsType`）。
 * 未传时前端默认 toast。
 */
export type TipsType = 'showToast' | 'showDialog' | 'showSnackBar';

/**
 * 业务信封。`code` 为数字（见 `ApiCodes`）；成功条件 `code === 0`。
 */
export type ResultModel<T = unknown> = {
  code: number;
  message: string;
  data?: T;
  /** null / undefined → 默认 toast */
  tipsType?: TipsType | null;
};

export type ResultConverter<T> = (raw: Record<string, unknown>) => T;

export function isResultSuccess(result: ResultModel): boolean {
  return result.code === 0;
}

export function isResultEmpty(result: ResultModel): boolean {
  return result.data == null;
}

export function isResultArray(result: ResultModel): boolean {
  return !isResultEmpty(result) && Array.isArray(result.data);
}

export function resultSize(result: ResultModel): number {
  if (isResultEmpty(result)) return 0;
  if (isResultArray(result)) return (result.data as unknown[]).length;
  return 1;
}

export function resultToModel<T>(result: ResultModel, converter: ResultConverter<T>): T {
  return converter(result.data as Record<string, unknown>);
}

export function resultToArray<T>(result: ResultModel, converter: ResultConverter<T>): T[] {
  if (isResultEmpty(result)) return [];
  if (isResultArray(result)) {
    return (result.data as unknown[]).map((e) =>
      converter(e && typeof e === 'object' ? (e as Record<string, unknown>) : {}),
    );
  }
  return [converter(result.data as Record<string, unknown>)];
}

export function parseResultModel(raw: unknown): ResultModel {
  if (!raw || typeof raw !== 'object') {
    return { code: -1, message: '', data: undefined };
  }
  const body = raw as Record<string, unknown>;
  const tips = body.tipsType;
  return {
    code: typeof body.code === 'number' ? body.code : -1,
    message: typeof body.message === 'string' ? body.message : '',
    data: body.data,
    tipsType:
      tips === 'showToast' || tips === 'showDialog' || tips === 'showSnackBar' ? tips : undefined,
  };
}

export function isResultEnvelope(body: unknown): body is ResultModel {
  return (
    !!body &&
    typeof body === 'object' &&
    'code' in body &&
    typeof (body as { code: unknown }).code === 'number'
  );
}
