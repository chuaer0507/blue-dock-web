import { useEffect, useMemo, useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Label, Modal, toast, useOverlayState } from '@heroui/react';
import {
  previewMessageBody,
  useForwardDialogMessages,
  type DialogMessageView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { ShareTargetPicker } from '../common/ShareTargetPicker';

type Props = {
  messages: DialogMessageView[];
  /** 当前会话，转发列表中排除 */
  currentDialogId: number;
  onSuccess?: () => void;
};

const MAX_TARGETS = 20;

/** 逐条转发：分享选择器多选目标（支持搜用户开单聊） */
export function MessageForwardModal({ messages, currentDialogId, onSuccess }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const forward = useForwardDialogMessages();
  const [picked, setPicked] = useState<number[]>([]);

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const preview = useMemo(() => {
    if (messages.length === 0) return '';
    if (messages.length === 1) {
      return previewMessageBody(messages[0]!.body) || t('reply.fallback');
    }
    return t('forward.sourceCount', { count: messages.length });
  }, [messages, t]);

  useEffect(() => {
    if (!state.isOpen) setPicked([]);
  }, [state.isOpen]);

  if (messages.length === 0) return null;

  const onSubmit = () => {
    if (picked.length === 0) {
      toast.danger(t('forward.needTarget'));
      return;
    }
    forward.mutate(
      { messageIds, dialogIds: picked },
      {
        onSuccess: () => {
          toast.success(t('forward.done', { count: picked.length }));
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
        {messages.length > 1 ? t('forward.openBatch') : t('forward.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('forward.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted truncate text-xs">{preview}</p>
              <ShareTargetPicker
                mode="multiple"
                excludeDialogIds={[currentDialogId]}
                selectedIds={picked}
                onChange={setPicked}
                maxTargets={MAX_TARGETS}
                enabled={state.isOpen}
              />
              <Label className="text-muted text-xs">
                {t('forward.picked', { count: picked.length, max: MAX_TARGETS })}
              </Label>
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onPress={state.close}>
                {t('forward.cancel')}
              </Button>
              <Button
                size="sm"
                isDisabled={forward.isPending || picked.length === 0}
                onPress={onSubmit}
              >
                {t('forward.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
