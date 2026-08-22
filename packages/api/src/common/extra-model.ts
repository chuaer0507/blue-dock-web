/**
 * 请求级 UI 副作用开关（经 `get`/`post`/… `{ extra }` / axios `bdExtra` 传入）。
 *
 * - 只决定**要不要**提示 / loading / 缓存
 * - **提示样式**由后端信封 `tipsType` 指定（见 `ResultModel`）
 */
export type ExtraModel = {
  showLoading?: boolean;
  showLazyLoading?: boolean;
  showSuccessTips?: boolean;
  /** 默认 true；`false` 时不弹全局失败 tip（含业务失败与 HTTP 4xx/5xx） */
  showFailTips?: boolean;
  /**
   * 默认 false 不缓存；仅显式 `true` 的 GET 才走短缓存。
   * 列表数据优先用 TanStack Query `staleTime`。
   */
  useCache?: boolean;
};

export const DEFAULT_EXTRA: Readonly<Required<ExtraModel>> = {
  showLoading: false,
  /**
   * Web 默认 false：TanStack Query 已有页面级 loading；全局懒加载易闪屏。
   * 需阻塞蒙层时显式 `extra: { showLoading: true }` 或 `showLazyLoading: true`。
   */
  showLazyLoading: false,
  showSuccessTips: false,
  showFailTips: true,
  useCache: false,
};

export function resolveExtra(extra?: ExtraModel | null): Required<ExtraModel> {
  return {
    showLoading: extra?.showLoading ?? DEFAULT_EXTRA.showLoading,
    showLazyLoading: extra?.showLazyLoading ?? DEFAULT_EXTRA.showLazyLoading,
    showSuccessTips: extra?.showSuccessTips ?? DEFAULT_EXTRA.showSuccessTips,
    showFailTips: extra?.showFailTips ?? DEFAULT_EXTRA.showFailTips,
    useCache: extra?.useCache ?? DEFAULT_EXTRA.useCache,
  };
}
