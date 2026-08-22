import { useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Modal, toast, useOverlayState } from '@heroui/react';
import { useSendDialogFileId } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { ShareTargetPicker } from '../common/ShareTargetPicker';

type Props = {
  fileId: number;
  fileName: string;
  /** 紧凑按钮（列表行） */
  size?: 'sm' | 'md';
};

/** 将本人网盘文件发到一个或多个会话（`dialog/message/sendFileId`） */
export function FileSendToChatModal({ fileId, fileName, size = 'sm' }: Props) {
  const { t } = useTranslation('file');
  const state = useOverlayState();
  const sendFileId = useSendDialogFileId();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) {
      setSelectedIds([]);
      setSubmitting(false);
    }
  };

  const onSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.danger(t('sendChat.needTarget'));
      return;
    }
    setSubmitting(true);
    let ok = 0;
    let fail = 0;
    for (const dialogId of selectedIds) {
      try {
        await sendFileId.mutateAsync({ dialogId, fileId });
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
              <p className="text-muted text-sm">{t('sendChat.hint', { name: fileName })}</p>
              <ShareTargetPicker
                mode="multiple"
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                enabled={state.isOpen}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={submitting} onPress={() => onOpenChange(false)}>
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
