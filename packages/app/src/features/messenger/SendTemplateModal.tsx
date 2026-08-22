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
import { useSendDialogTemplate } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

const MAX_ITEM = 300;
const MAX_TITLE = 50;
const MAX_LINES = 8;

type Props = {
  dialogId: number;
  disabled?: boolean;
};

/** 向当前会话发送模板卡片（`dialog/message/sendTemplate`） */
export function SendTemplateModal({ dialogId, disabled }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const sendTemplate = useSendDialogTemplate();
  const [title, setTitle] = useState('');
  const [lines, setLines] = useState<string[]>(['']);
  const [silence, setSilence] = useState(false);

  const reset = () => {
    setTitle('');
    setLines(['']);
    setSilence(false);
  };

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) reset();
  };

  const onSubmit = () => {
    const items = lines.map((c) => c.trim()).filter(Boolean);
    if (items.length === 0) {
      toast.danger(t('template.needContent'));
      return;
    }
    if (items.some((c) => c.length > MAX_ITEM)) {
      toast.danger(t('template.itemTooLong', { max: MAX_ITEM }));
      return;
    }
    const heading = title.trim();
    if (heading.length > MAX_TITLE) {
      toast.danger(t('template.titleTooLong', { max: MAX_TITLE }));
      return;
    }
    sendTemplate.mutate(
      {
        dialogId,
        items: items.map((content) => ({ content, style: '' })),
        ...(heading ? { title: heading } : {}),
        source: 'web',
        ...(silence ? { silence: 'yes' } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('template.done'));
          onOpenChange(false);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" isDisabled={disabled} onPress={state.open}>
        {t('template.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('template.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted text-sm">{t('template.hint')}</p>
              <TextField name="templateTitle" value={title} onChange={setTitle} className="w-full">
                <Label>{t('template.heading')}</Label>
                <Input placeholder={t('template.headingPlaceholder')} />
              </TextField>
              <div className="flex flex-col gap-2">
                <Label>{t('template.lines')}</Label>
                {lines.map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <TextField
                      name={`templateLine${i}`}
                      value={line}
                      onChange={(v) =>
                        setLines((prev) => prev.map((x, idx) => (idx === i ? v : x)))
                      }
                      className="min-w-0 flex-1"
                    >
                      <TextArea rows={2} placeholder={t('template.linePlaceholder', { n: i + 1 })} />
                    </TextField>
                    {lines.length > 1 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        {t('template.remove')}
                      </Button>
                    ) : null}
                  </div>
                ))}
                {lines.length < MAX_LINES ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onPress={() => setLines((prev) => [...prev, ''])}
                  >
                    {t('template.addLine')}
                  </Button>
                ) : null}
              </div>
              <Checkbox isSelected={silence} onChange={setSilence}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Label>{t('template.silence')}</Label>
                </Checkbox.Content>
              </Checkbox>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                isDisabled={sendTemplate.isPending}
                onPress={() => onOpenChange(false)}
              >
                {t('template.cancel')}
              </Button>
              <Button
                variant="primary"
                isDisabled={sendTemplate.isPending || !lines.some((l) => l.trim())}
                onPress={onSubmit}
              >
                {sendTemplate.isPending ? t('template.sending') : t('template.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
