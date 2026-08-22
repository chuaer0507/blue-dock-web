/** 轻量 className 合并（框架期无需 clsx 依赖） */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
