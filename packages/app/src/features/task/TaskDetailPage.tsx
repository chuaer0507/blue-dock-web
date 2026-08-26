import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from '@blue-dock/i18n';
import { isId } from '@blue-dock/api';
import { TaskDetail } from './TaskDetail';

/** 独立窗 / 深链任务详情 */
export function TaskDetailPage() {
  const { t } = useTranslation('task');
  const navigate = useNavigate();
  const params = useParams();
  const taskId = useMemo(() => (isId(params.taskId) ? params.taskId : undefined), [params.taskId]);

  if (!taskId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-danger text-sm">{t('notFound')}</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-dvh">
      <div className="p-6">
        <TaskDetail
          taskId={taskId as unknown as number}
          variant="page"
          onClose={() => navigate(-1)}
          onOpenTask={(id) => navigate(`/single/task/${id}`)}
        />
      </div>
    </div>
  );
}
