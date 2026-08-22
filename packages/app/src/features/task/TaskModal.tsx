import { Modal } from '@heroui/react';
import { useTranslation } from '@blue-dock/i18n';
import { TaskDetail } from './TaskDetail';

type Props = {
  taskId: number | null;
  onOpenChange: (taskId: number | null) => void;
};

/** 壳内任务详情弹层；与独立窗共用 TaskDetail */
export function TaskModal({ taskId, onOpenChange }: Props) {
  const { t } = useTranslation('task');
  const isOpen = taskId != null && taskId > 0;

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onOpenChange(null);
        }}
      >
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {taskId != null && taskId > 0 ? (
                <TaskDetail
                  taskId={taskId}
                  variant="modal"
                  onClose={() => onOpenChange(null)}
                  onOpenTask={(id) => onOpenChange(id)}
                />
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
