import { useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Checkbox,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import { useSendDialogBot, type UserSearchHit } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { UserMultiPicker } from '../common/UserMultiPicker';

const MAX_TEXT = 2000;

const BOT_TYPES = [
  'system-msg',
  'task-alert',
  'todo-alert',
  'attendance',
  'meeting-alert',
  'okr-alert',
  'approval-alert',
  'bot-manager',
] as const;

type BotType = (typeof BOT_TYPES)[number];

/** 以系统/业务机器人向指定用户发 markdown（`dialog/message/sendBot`） */
export function SendBotMessageModal() {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const sendBot = useSendDialogBot();
  const [picked, setPicked] = useState<UserSearchHit[]>([]);
  const [text, setText] = useState('');
  const [botType, setBotType] = useState<BotType>('system-msg');
  const [silence, setSilence] = useState(false);

  const reset = () => {
    setPicked([]);
    setText('');
    setBotType('system-msg');
    setSilence(false);
  };

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) reset();
  };

  const onSubmit = () => {
    const peer = picked[0];
    const body = text.trim();
    if (!peer) {
      toast.danger(t('sendBot.needPeer'));
      return;
    }
    if (!body) {
      toast.danger(t('sendBot.needText'));
      return;
    }
    if (body.length > MAX_TEXT) {
      toast.danger(t('sendBot.tooLong', { max: MAX_TEXT }));
      return;
    }
    sendBot.mutate(
      {
        userId: peer.userId,
        text: body,
        botType,
        ...(silence ? { silence: 'yes' } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('sendBot.done'));
          onOpenChange(false);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('sendBot.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('sendBot.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted text-sm">{t('sendBot.hint')}</p>
              <UserMultiPicker
                picked={picked}
                onChange={(next) => setPicked(next.slice(-1))}
                max={1}
                enabled={state.isOpen}
              />
              <Select
                selectedKey={botType}
                onSelectionChange={(key) => {
                  if (typeof key === 'string' && (BOT_TYPES as readonly string[]).includes(key)) {
                    setBotType(key as BotType);
                  }
                }}
              >
                <Label>{t('sendBot.botType')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {BOT_TYPES.map((id) => (
                      <ListBox.Item key={id} id={id} textValue={t(`sendBot.types.${id}`)}>
                        {t(`sendBot.types.${id}`)}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <TextField name="botText" value={text} onChange={setText} className="w-full">
                <Label>{t('sendBot.text')}</Label>
                <TextArea rows={4} placeholder={t('sendBot.textPlaceholder')} />
              </TextField>
              <p className="text-muted text-xs">
                {text.trim().length}/{MAX_TEXT}
              </p>
              <Checkbox isSelected={silence} onChange={setSilence}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Label>{t('sendBot.silence')}</Label>
                </Checkbox.Content>
              </Checkbox>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                isDisabled={sendBot.isPending}
                onPress={() => onOpenChange(false)}
              >
                {t('sendBot.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={sendBot.isPending || picked.length === 0 || !text.trim()}
                onPress={onSubmit}
              >
                {sendBot.isPending ? t('sendBot.sending') : t('sendBot.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
