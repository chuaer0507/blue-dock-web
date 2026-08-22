import { useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Label, Modal, TextArea, TextField, toast, useOverlayState } from '@heroui/react';
import { useSendDialogAnon, type UserSearchHit } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { UserMultiPicker } from '../common/UserMultiPicker';

const MAX_TEXT = 2000;

/** 经 `anon-msg` 机器人向指定用户发匿名文本（`dialog/message/sendAnon`） */
export function AnonMessageModal() {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const sendAnon = useSendDialogAnon();
  const [picked, setPicked] = useState<UserSearchHit[]>([]);
  const [text, setText] = useState('');

  const reset = () => {
    setPicked([]);
    setText('');
  };

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) reset();
  };

  const onSubmit = () => {
    const peer = picked[0];
    const body = text.trim();
    if (!peer) {
      toast.danger(t('anon.needPeer'));
      return;
    }
    if (!body) {
      toast.danger(t('anon.needText'));
      return;
    }
    if (body.length > MAX_TEXT) {
      toast.danger(t('anon.tooLong', { max: MAX_TEXT }));
      return;
    }
    sendAnon.mutate(
      { userId: peer.userId, text: body },
      {
        onSuccess: () => {
          toast.success(t('anon.done'));
          onOpenChange(false);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('anon.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('anon.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted text-sm">{t('anon.hint')}</p>
              <UserMultiPicker
                picked={picked}
                onChange={(next) => setPicked(next.slice(-1))}
                max={1}
                enabled={state.isOpen}
              />
              <TextField name="anonText" value={text} onChange={setText} className="w-full">
                <Label>{t('anon.text')}</Label>
                <TextArea rows={4} placeholder={t('anon.textPlaceholder')} />
              </TextField>
              <p className="text-muted text-xs">
                {text.trim().length}/{MAX_TEXT}
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                isDisabled={sendAnon.isPending}
                onPress={() => onOpenChange(false)}
              >
                {t('anon.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={sendAnon.isPending || picked.length === 0 || !text.trim()}
                onPress={onSubmit}
              >
                {sendAnon.isPending ? t('anon.sending') : t('anon.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
