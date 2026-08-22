import { useEffect, useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Form,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import { useDialogVote } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  dialogId: number;
  isDisabled?: boolean;
};

/** 发起会话投票 */
export function CreateVoteModal({ dialogId, isDisabled }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const vote = useDialogVote();
  const [title, setTitle] = useState('');
  const [optionsText, setOptionsText] = useState('');

  useEffect(() => {
    if (!state.isOpen) return;
    setTitle('');
    setOptionsText('');
  }, [state.isOpen]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.danger(t('vote.needTitle'));
      return;
    }
    const options = optionsText
      .split(/[\n,|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 2) {
      toast.danger(t('vote.needOptions'));
      return;
    }
    vote.mutate(
      { action: 'create', dialogId, title: trimmed, options },
      {
        onSuccess: () => {
          toast.success(t('vote.created'));
          state.close();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" isDisabled={isDisabled} onPress={state.open}>
        {t('vote.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('vote.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
                <TextField
                  name="voteTitle"
                  isRequired
                  value={title}
                  onChange={setTitle}
                  className="w-full"
                >
                  <Label>{t('vote.titleLabel')}</Label>
                  <Input />
                </TextField>
                <TextField
                  name="voteOptions"
                  isRequired
                  value={optionsText}
                  onChange={setOptionsText}
                  className="w-full"
                >
                  <Label>{t('vote.optionsLabel')}</Label>
                  <TextArea rows={4} placeholder={t('vote.optionsPlaceholder')} />
                </TextField>
                <p className="text-muted text-xs">{t('vote.hint')}</p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" onPress={state.close}>
                    {t('vote.cancel')}
                  </Button>
                  <Button type="submit" isDisabled={vote.isPending || !title.trim()}>
                    {t('vote.submit')}
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
