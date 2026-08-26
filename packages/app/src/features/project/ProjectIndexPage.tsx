import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { useProjectList, useRealtimeStatus } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** `/manage/project`：有项目则进第一个，否则空态创建 */
export function ProjectIndexPage() {
  const { t } = useTranslation('project');
  const navigate = useNavigate();
  const { connected } = useRealtimeStatus();
  const list = useProjectList({ archived: 'no', type: 'all' }, connected);

  useEffect(() => {
    const first = list.data?.[0];
    if (first) navigate(`/manage/project/${first.id}`, { replace: true });
  }, [list.data, navigate]);

  if (list.isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted text-sm">{t('loading')}</p>
      </div>
    );
  }

  if (list.isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-6">
        <p className="text-danger text-sm">{t('error')}</p>
        <Button size="sm" variant="secondary" onPress={() => void list.refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  if ((list.data?.length ?? 0) > 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted text-sm">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <h1 className="text-xl font-semibold">{t('navTitle')}</h1>
      <p className="text-muted text-sm">{t('empty')}</p>
      <Button
        variant="primary"
        onPress={() => window.dispatchEvent(new Event('blue-dock:new-project'))}
      >
        {t('create.open')}
      </Button>
    </div>
  );
}
