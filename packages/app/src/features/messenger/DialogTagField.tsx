import { useEffect, useState, type FormEvent } from 'react';
import { Button, Form, Input, Label, TextField, toast } from '@heroui/react';
import { useSaveDialogTag } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';

type Props = {
  dialogId: number;
  tag: string;
};

/** 会话个人标签（config.tag；可被 search/tag 检索） */
export function DialogTagField({ dialogId, tag }: Props) {
  const { t } = useTranslation('messenger');
  const saveTag = useSaveDialogTag();
  const [value, setValue] = useState(tag);

  useEffect(() => {
    setValue(tag);
  }, [tag, dialogId]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = value.trim();
    saveTag.mutate(
      { dialogId, tag: next },
      {
        onSuccess: () => toast.success(next ? t('dialogTag.saved') : t('dialogTag.cleared')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Form className="flex min-w-0 flex-1 items-end gap-2" onSubmit={onSubmit}>
      <TextField name="dialog-tag" value={value} onChange={setValue} className="min-w-0 flex-1">
        <Label className="sr-only">{t('dialogTag.label')}</Label>
        <Input placeholder={t('dialogTag.placeholder')} />
      </TextField>
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        isDisabled={saveTag.isPending || value.trim() === tag.trim()}
      >
        {t('dialogTag.save')}
      </Button>
    </Form>
  );
}
