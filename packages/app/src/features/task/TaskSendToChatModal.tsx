import { useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Input, Label, Modal, TextField, toast, useOverlayState } from '@heroui/react';
import { useSendDialogTaskId } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { ShareTargetPicker } from '../common/ShareTargetPicker';

type Props = {
  taskId: number;
  taskName: string;
  size?: 'sm' | 'md';
};

/** 将任务卡片发到一个或多个会话（`dialog/message/sendTaskId`） */
export function TaskSendToChatModal({ taskId, taskName, size = 'sm' }: Props) {
  const { t } = useTranslation('task');
  const state = useOverlayState();
  const sendTaskId = useSendDialogTaskId();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) {
      setSelectedIds([]);
      setNote('');
      setSubmitting(false);
    }
  };

  const onSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.danger(t('sendChat.needTarget'));
      return;
    }
    setSubmitting(true);
    const leave = note.trim() || undefined;
    let ok = 0;
    let fail = 0;
    for (const dialogId of selectedIds) {
      try {
        await sendTaskId.mutateAsync({ dialogId, taskId, note: leave });
        ok += 1;
      } catch (err) {
        fail += 1;
        if (ok === 0 && fail === 1 && selectedIds.length === 1) {
          toastRequestError(err, t('error'));
          setSubmitting(false);
          return;
        }
      }
    }
    setSubmitting(false);
    if (ok > 0 && fail === 0) {
      toast.success(t('sendChat.done', { count: ok }));
      onOpenChange(false);
      return;
    }
    if (ok > 0) {
      toast.danger(t('sendChat.partial', { ok, fail }));
      return;
    }
    toast.danger(t('error'));
  };

  return (
    <Modal>
      <Button size={size} variant="secondary" onPress={state.open}>
        {t('sendChat.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('sendChat.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted text-sm">{t('sendChat.hint', { name: taskName })}</p>
              <TextField name="taskSendNote" value={note} onChange={setNote} className="w-full">
                <Label>{t('sendChat.note')}</Label>
                <Input placeholder={t('sendChat.notePlaceholder')} />
              </TextField>
              <ShareTargetPicker
                mode="multiple"
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                enabled={state.isOpen}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                isDisabled={submitting}
                onPress={() => onOpenChange(false)}
              >
                {t('sendChat.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={submitting || selectedIds.length === 0}
                onPress={() => void onSubmit()}
              >
                {submitting ? t('sendChat.sending') : t('sendChat.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
