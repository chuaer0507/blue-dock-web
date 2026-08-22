import { useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import { useSendDialogAiAssistant } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** UI 上限；契约允许更大，避免误贴巨文 */
const MAX_TEXT = 10_000;
const MAX_NICK = 20;

type Props = {
  dialogId: number;
  disabled?: boolean;
};

/** 以 AI 助手机器人向当前会话发 Markdown（`dialog/message/sendAiAssistant`） */
export function SendAiAssistantModal({ dialogId, disabled }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const sendAi = useSendDialogAiAssistant();
  const [text, setText] = useState('');
  const [nickname, setNickname] = useState('');
  const [silence, setSilence] = useState(false);

  const reset = () => {
    setText('');
    setNickname('');
    setSilence(false);
  };

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) reset();
  };

  const onSubmit = () => {
    const body = text.trim();
    if (!body) {
      toast.danger(t('sendAi.needText'));
      return;
    }
    if (body.length > MAX_TEXT) {
      toast.danger(t('sendAi.tooLong', { max: MAX_TEXT }));
      return;
    }
    const nick = nickname.trim();
    if (nick.length > MAX_NICK) {
      toast.danger(t('sendAi.nickTooLong', { max: MAX_NICK }));
      return;
    }
    sendAi.mutate(
      {
        dialogId,
        text: body,
        textType: 'md',
        ...(nick ? { nickname: nick } : {}),
        ...(silence ? { silence: 'yes' } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('sendAi.done'));
          onOpenChange(false);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" isDisabled={disabled} onPress={state.open}>
        {t('sendAi.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('sendAi.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted text-sm">{t('sendAi.hint')}</p>
              <TextField name="aiText" value={text} onChange={setText} className="w-full">
                <Label>{t('sendAi.text')}</Label>
                <TextArea rows={5} placeholder={t('sendAi.textPlaceholder')} />
              </TextField>
              <p className="text-muted text-xs">
                {text.trim().length}/{MAX_TEXT}
              </p>
              <TextField name="aiNick" value={nickname} onChange={setNickname} className="w-full">
                <Label>{t('sendAi.nickname')}</Label>
                <Input placeholder={t('sendAi.nicknamePlaceholder')} />
              </TextField>
              <Checkbox isSelected={silence} onChange={setSilence}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Label>{t('sendAi.silence')}</Label>
                </Checkbox.Content>
              </Checkbox>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                isDisabled={sendAi.isPending}
                onPress={() => onOpenChange(false)}
              >
                {t('sendAi.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={sendAi.isPending || !text.trim()}
                onPress={onSubmit}
              >
                {sendAi.isPending ? t('sendAi.sending') : t('sendAi.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
