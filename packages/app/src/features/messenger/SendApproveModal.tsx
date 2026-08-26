import { useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Checkbox,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import {
  DIALOG_APPROVE_CARD_TYPES,
  useSendDialogApprove,
  type DialogApproveCardType,
  type UserSearchHit,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { UserMultiPicker } from '../common/UserMultiPicker';

const MAX_TITLE = 200;

/** 经 `approval-alert` 向用户发审批模板卡片（`dialog/message/sendApprove`，静默） */
export function SendApproveModal() {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const sendApprove = useSendDialogApprove();
  const [picked, setPicked] = useState<UserSearchHit[]>([]);
  const [cardType, setCardType] = useState<DialogApproveCardType>('approve_reviewer');
  const [title, setTitle] = useState('');
  const [action, setAction] = useState('');
  const [dataJson, setDataJson] = useState('');
  const [finished, setFinished] = useState(false);

  const reset = () => {
    setPicked([]);
    setCardType('approve_reviewer');
    setTitle('');
    setAction('');
    setDataJson('');
    setFinished(false);
  };

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) reset();
  };

  const onSubmit = () => {
    const peer = picked[0];
    if (!peer) {
      toast.danger(t('sendApprove.needPeer'));
      return;
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length > MAX_TITLE) {
      toast.danger(t('sendApprove.titleTooLong', { max: MAX_TITLE }));
      return;
    }
    const rawData = dataJson.trim();
    if (rawData) {
      try {
        const parsed: unknown = JSON.parse(rawData);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          toast.danger(t('sendApprove.dataInvalid'));
          return;
        }
      } catch {
        toast.danger(t('sendApprove.dataInvalid'));
        return;
      }
    }
    sendApprove.mutate(
      {
        toUserId: peer.userId,
        type: cardType,
        ...(action.trim() ? { action: action.trim() } : {}),
        isFinished: finished ? 1 : 0,
        ...(rawData ? { data: rawData } : {}),
        ...(trimmedTitle ? { title: trimmedTitle } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('sendApprove.done'));
          onOpenChange(false);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('sendApprove.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={onOpenChange}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('sendApprove.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted text-sm">{t('sendApprove.hint')}</p>
              <UserMultiPicker
                picked={picked}
                onChange={(next) => setPicked(next.slice(-1))}
                max={1}
                enabled={state.isOpen}
              />
              <Select
                selectedKey={cardType}
                onSelectionChange={(key) => {
                  if (
                    typeof key === 'string' &&
                    (DIALOG_APPROVE_CARD_TYPES as readonly string[]).includes(key)
                  ) {
                    setCardType(key as DialogApproveCardType);
                  }
                }}
              >
                <Label>{t('sendApprove.cardType')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {DIALOG_APPROVE_CARD_TYPES.map((id) => (
                      <ListBox.Item key={id} id={id} textValue={t(`sendApprove.types.${id}`)}>
                        {t(`sendApprove.types.${id}`)}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <TextField name="approveTitle" value={title} onChange={setTitle} className="w-full">
                <Label>{t('sendApprove.cardTitle')}</Label>
                <Input placeholder={t('sendApprove.cardTitlePlaceholder')} />
              </TextField>
              <TextField
                name="approveAction"
                value={action}
                onChange={setAction}
                className="w-full"
              >
                <Label>{t('sendApprove.action')}</Label>
                <Input placeholder={t('sendApprove.actionPlaceholder')} />
              </TextField>
              <TextField
                name="approveData"
                value={dataJson}
                onChange={setDataJson}
                className="w-full"
              >
                <Label>{t('sendApprove.data')}</Label>
                <TextArea rows={3} placeholder={t('sendApprove.dataPlaceholder')} />
              </TextField>
              <Checkbox isSelected={finished} onChange={setFinished}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Label>{t('sendApprove.finished')}</Label>
                </Checkbox.Content>
              </Checkbox>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                isDisabled={sendApprove.isPending}
                onPress={() => onOpenChange(false)}
              >
                {t('sendApprove.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={sendApprove.isPending || picked.length === 0}
                onPress={onSubmit}
              >
                {sendApprove.isPending ? t('sendApprove.sending') : t('sendApprove.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
