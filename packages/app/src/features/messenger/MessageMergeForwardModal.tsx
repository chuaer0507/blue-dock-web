import { useEffect, useMemo, useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Modal, toast, useOverlayState } from '@heroui/react';
import { useMergeForwardDialogMessages, type DialogMessageView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { ShareTargetPicker } from '../common/ShareTargetPicker';

type Props = {
  messages: DialogMessageView[];
  currentDialogId: number;
  onSuccess?: () => void;
};

const MAX_SOURCES = 50;

/** 合并转发：多条消息合成一条，转发到单个目标会话 */
export function MessageMergeForwardModal({ messages, currentDialogId, onSuccess }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const mergeForward = useMergeForwardDialogMessages();
  const [picked, setPicked] = useState<number[]>([]);

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);

  useEffect(() => {
    if (!state.isOpen) setPicked([]);
  }, [state.isOpen]);

  if (messages.length < 2) return null;

  const onSubmit = () => {
    const dialogId = picked[0];
    if (!dialogId) {
      toast.danger(t('mergeForward.needTarget'));
      return;
    }
    if (messageIds.length > MAX_SOURCES) {
      toast.danger(t('mergeForward.maxSources', { max: MAX_SOURCES }));
      return;
    }
    mergeForward.mutate(
      { messageIds, dialogId },
      {
        onSuccess: () => {
          toast.success(t('mergeForward.done'));
          state.close();
          onSuccess?.();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-auto min-h-0 px-1 py-0 text-[10px]"
        onPress={state.open}
      >
        {t('mergeForward.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('mergeForward.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted text-xs">
                {t('mergeForward.sourceCount', { count: messages.length })}
              </p>
              <ShareTargetPicker
                mode="single"
                excludeDialogIds={[currentDialogId]}
                selectedIds={picked}
                onChange={setPicked}
                enabled={state.isOpen}
              />
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onPress={state.close}>
                {t('mergeForward.cancel')}
              </Button>
              <Button
                size="sm"
                isDisabled={mergeForward.isPending || picked.length === 0}
                onPress={onSubmit}
              >
                {t('mergeForward.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
