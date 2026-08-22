import { useMemo } from 'react';
import { useProjectTagList, type ProjectTagView } from '@blue-dock/api';
import { cn } from '../../utils/cn';

type Props = {
  projectId: number;
  tagIds?: number[];
  className?: string;
  /** 最多展示几个色点，超出用 +N */
  max?: number;
};

/** 任务标签色点（项目标签缓存共享） */
export function TaskTagDots({ projectId, tagIds, className, max = 5 }: Props) {
  const tags = useProjectTagList(projectId, Boolean(projectId) && (tagIds?.length ?? 0) > 0);
  const resolved = useMemo(() => {
    if (!tagIds?.length) return [] as ProjectTagView[];
    const byId = new Map((tags.data ?? []).map((t) => [t.id, t]));
    return tagIds.map((id) => byId.get(id)).filter((t): t is ProjectTagView => Boolean(t));
  }, [tagIds, tags.data]);

  if (resolved.length === 0) return null;

  const shown = resolved.slice(0, max);
  const extra = resolved.length - shown.length;

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-hidden>
      {shown.map((tag) => (
        <span
          key={tag.id}
          className="size-2 rounded-full"
          style={{ backgroundColor: tag.color || '#909399' }}
          title={tag.name}
        />
      ))}
      {extra > 0 ? <span className="text-muted text-[10px] leading-none">+{extra}</span> : null}
    </span>
  );
}
