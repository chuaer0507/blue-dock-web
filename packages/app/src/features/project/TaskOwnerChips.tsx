import { useMemo } from 'react';
import { Avatar } from '@heroui/react';
import { resolveAvatarSrc, useProjectMembers, type ProjectMemberHit } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

type Props = {
  projectId: number;
  ownerUserIds?: number[];
  className?: string;
  /** 最多展示几个，超出 +N */
  max?: number;
};

function labelOf(m: ProjectMemberHit | undefined, userId: number): string {
  if (!m) return `#${userId}`;
  return m.nickname.trim() || m.email.trim() || `#${userId}`;
}

function initialOf(label: string): string {
  const ch = label.replace(/^#/, '').trim().charAt(0);
  return ch ? ch.toUpperCase() : '?';
}

/** 任务负责人头像条（项目成员缓存共享） */
export function TaskOwnerChips({ projectId, ownerUserIds, className, max = 3 }: Props) {
  const { t } = useTranslation('project');
  const members = useProjectMembers(
    projectId,
    1,
    Boolean(projectId) && (ownerUserIds?.length ?? 0) > 0,
  );
  const resolved = useMemo(() => {
    if (!ownerUserIds?.length) return [] as { userId: number; label: string; image: string }[];
    const byId = new Map((members.data?.list ?? []).map((m) => [m.userId, m]));
    return ownerUserIds.map((id) => {
      const m = byId.get(id);
      const label = labelOf(m, id);
      return {
        userId: id,
        label,
        image: resolveAvatarSrc(m?.userImage, label, 64),
      };
    });
  }, [ownerUserIds, members.data]);

  if (resolved.length === 0) return null;

  const shown = resolved.slice(0, max);
  const extra = resolved.length - shown.length;

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={t('owners.aria', { names: resolved.map((r) => r.label).join(', ') })}
    >
      {shown.map((o) => (
        <Avatar key={o.userId} size="sm" className="size-5 text-[9px]" title={o.label}>
          <Avatar.Image alt={o.label} src={o.image} />
          <Avatar.Fallback>{initialOf(o.label)}</Avatar.Fallback>
        </Avatar>
      ))}
      {extra > 0 ? <span className="text-muted text-[10px] leading-none">+{extra}</span> : null}
    </span>
  );
}
