import { useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Modal, toast, useOverlayState } from '@heroui/react';
import { PhoneIcon } from '@heroicons/react/24/outline';
import { useDialogTelephone } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  dialogId: number;
  disabled?: boolean;
};

/** 查看单聊对方电话（`dialog/telephone`；成功会写入审计 notice） */
export function DialogTelephoneButton({ dialogId, disabled }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const telephone = useDialogTelephone();
  const [number, setNumber] = useState('');

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) setNumber('');
  };

  const onView = () => {
    if (!window.confirm(t('telephone.confirm'))) return;
    telephone.mutate(dialogId, {
      onSuccess: (view) => {
        const phone = (view.telephone || '').trim();
        setNumber(phone);
        state.open();
        toast.success(t('telephone.done'));
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onCopy = async () => {
    if (!number) return;
    try {
      await navigator.clipboard.writeText(number);
      toast.success(t('telephone.copied'));
    } catch {
      toast.danger(t('telephone.copyFailed'));
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        isIconOnly
        aria-label={t('telephone.open')}
        isDisabled={disabled || telephone.isPending}
        onPress={onView}
      >
        <PhoneIcon className="size-4" aria-hidden />
      </Button>
      <Modal>
        <Modal.Backdrop isOpen={state.isOpen} onOpenChange={onOpenChange}>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-sm">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('telephone.title')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-2">
                <p className="text-muted text-xs">{t('telephone.hint')}</p>
                <p className="font-mono text-lg tracking-wide">{number || '—'}</p>
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onPress={() => onOpenChange(false)}>
                  {t('telephone.close')}
                </Button>
                <Button size="sm" isDisabled={!number} onPress={() => void onCopy()}>
                  {t('telephone.copy')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
