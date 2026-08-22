import { useDialogList, useFile, useProject, useTask, type FavoriteItem } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** 收藏列表标题：按类型补洞名称（后端 favorites 不回 name） */
export function FavoriteTitle({ item }: { item: FavoriteItem }) {
  const { t } = useTranslation('favorite');
  const isTask = item.type === 'task';
  const isProject = item.type === 'project';
  const isFile = item.type === 'file';
  const isMessage = item.type === 'message';

  const task = useTask(isTask ? item.refId : undefined);
  const project = useProject(isProject ? item.refId : undefined, isProject);
  const file = useFile(isFile ? item.refId : undefined);
  const dialogs = useDialogList();

  if (isTask) {
    if (task.isLoading) return <span className="text-muted">{t('loading')}</span>;
    if (task.isError || !task.data) return <>{t('list.deleted')}</>;
    return <>{task.data.name || t('list.refId', { id: item.refId })}</>;
  }
  if (isProject) {
    if (project.isLoading) return <span className="text-muted">{t('loading')}</span>;
    if (project.isError || !project.data) return <>{t('list.deleted')}</>;
    return <>{project.data.name || t('list.refId', { id: item.refId })}</>;
  }
  if (isFile) {
    if (file.isLoading) return <span className="text-muted">{t('loading')}</span>;
    if (file.isError || !file.data) return <>{t('list.deleted')}</>;
    return <>{file.data.name || t('list.refId', { id: item.refId })}</>;
  }
  if (isMessage) {
    const hit = (dialogs.data ?? []).find((d) => d.id === item.refId);
    if (dialogs.isLoading) return <span className="text-muted">{t('loading')}</span>;
    if (!hit) return <>{t('list.refId', { id: item.refId })}</>;
    return <>{hit.name || t('list.refId', { id: item.refId })}</>;
  }

  return <>{t('list.refId', { id: item.refId })}</>;
}
