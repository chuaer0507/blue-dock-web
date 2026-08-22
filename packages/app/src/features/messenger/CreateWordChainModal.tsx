import { useEffect, useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Form,
  Input,
  Label,
  Modal,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import { useDialogWordChain } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  dialogId: number;
  isDisabled?: boolean;
};

/** 发起接龙 */
export function CreateWordChainModal({ dialogId, isDisabled }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const wordChain = useDialogWordChain();
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!state.isOpen) return;
    setTitle('');
  }, [state.isOpen]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.danger(t('wordChain.needTitle'));
      return;
    }
    wordChain.mutate(
      { action: 'create', dialogId, title: trimmed },
      {
        onSuccess: () => {
          toast.success(t('wordChain.created'));
          state.close();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" isDisabled={isDisabled} onPress={state.open}>
        {t('wordChain.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-sm">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('wordChain.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
                <TextField
                  name="wordChainTitle"
                  isRequired
                  value={title}
                  onChange={setTitle}
                  className="w-full"
                >
                  <Label>{t('wordChain.titleLabel')}</Label>
                  <Input placeholder={t('wordChain.titlePlaceholder')} />
                </TextField>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" onPress={state.close}>
                    {t('wordChain.cancel')}
                  </Button>
                  <Button type="submit" isDisabled={wordChain.isPending || !title.trim()}>
                    {t('wordChain.submit')}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
