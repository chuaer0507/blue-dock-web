import { useNavigate } from 'react-router';
import type { FavoriteType, RecentItem } from '@blue-dock/api';

/** 收藏条目跳转 */
export function openFavoriteTarget(
  navigate: ReturnType<typeof useNavigate>,
  type: string,
  refId: number,
) {
  if (!(refId > 0)) return;
  switch (type) {
    case 'task':
      navigate(`/single/task/${refId}`);
      return;
    case 'project':
      navigate(`/manage/project/${refId}`);
      return;
    case 'file':
      navigate(`/single/file/${refId}`);
      return;
    case 'task_file':
      navigate(`/single/file/task/${refId}`);
      return;
    case 'message_file':
      navigate(`/single/file/msg/${refId}`);
      return;
    case 'message':
    case 'dialog':
      navigate(`/manage/messenger/${refId}`);
      return;
    default:
      break;
  }
}

/**
 * 最近浏览跳转。
 * 优先打开目标；`sourceType` 仅在缺目标 id 时作回退（如回到项目 / 会话）。
 */
export function openRecentTarget(navigate: ReturnType<typeof useNavigate>, item: RecentItem) {
  const type = String(item.type ?? '');
  const refId = Number(item.id ?? item.taskId ?? 0);

  if (refId > 0) {
    openFavoriteTarget(navigate, type, refId);
    return;
  }

  const sourceType = String(item.sourceType ?? '');
  const sourceId = Number(item.sourceId ?? 0);
  if (!(sourceId > 0)) return;

  switch (sourceType) {
    case 'project':
      navigate(`/manage/project/${sourceId}`);
      return;
    case 'project_task':
      navigate(`/single/task/${sourceId}`);
      return;
    case 'dialog':
      navigate(`/manage/messenger/${sourceId}`);
      return;
    case 'filesystem':
      navigate(`/manage/file/${sourceId}`);
      return;
    default:
      break;
  }
}

export function isFavoriteType(type: string): type is FavoriteType {
  return type === 'task' || type === 'project' || type === 'file' || type === 'message';
}
