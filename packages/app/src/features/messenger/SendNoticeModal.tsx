import { useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Checkbox,
  Label,
  Modal,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import { useSendDialogNotice } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

const MAX_LEN = 500;

type Props = {
  dialogId: number;
  disabled?: boolean;
};

/** 向当前会话发送 notice（`dialog/message/sendNotice`） */
export function SendNoticeModal({ dialogId, disabled }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const sendNotice = useSendDialogNotice();
  const [text, setText] = useState('');
  const [silence, setSilence] = useState(false);

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) {
      setText('');
      setSilence(false);
    }
  };

  const onSubmit = () => {
    const notice = text.trim();
    if (!notice) {
      toast.danger(t('notice.needText'));
      return;
    }
    if (notice.length > MAX_LEN) {
      toast.danger(t('notice.tooLong', { max: MAX_LEN }));
      return;
    }
    sendNotice.mutate(
      {
        dialogId,
        notice,
        source: 'web',
        ...(silence ? { silence: 'yes' } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('notice.done'));
          onOpenChange(false);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" isDisabled={disabled} onPress={state.open}>
        {t('notice.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('notice.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted text-sm">{t('notice.hint')}</p>
              <TextField name="noticeText" value={text} onChange={setText} className="w-full">
                <Label>{t('notice.text')}</Label>
                <TextArea rows={4} placeholder={t('notice.textPlaceholder')} />
              </TextField>
              <p className="text-muted text-xs">
                {text.trim().length}/{MAX_LEN}
              </p>
              <Checkbox isSelected={silence} onChange={setSilence}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Label>{t('notice.silence')}</Label>
                </Checkbox.Content>
              </Checkbox>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                isDisabled={sendNotice.isPending}
                onPress={() => onOpenChange(false)}
              >
                {t('notice.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={sendNotice.isPending || !text.trim()}
                onPress={onSubmit}
              >
                {sendNotice.isPending ? t('notice.sending') : t('notice.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
