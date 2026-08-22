import { useState, type FormEvent } from 'react';
import { Button, FieldError, Form, Input, Label, TextField, toast } from '@heroui/react';
import { useEditPassword } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { requestErrorMessage } from '../../utils/toast-request-error';

/** 设置 · 改密：old/new 均 RSA 加密后 `users/editPassword` */
export function PasswordPage() {
  const { t } = useTranslation('setting');
  const editPassword = useEditPassword();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationErrors({});
    const form = event.currentTarget;

    const formData = new FormData(form);
    const oldPassword = String(formData.get('oldPassword') ?? '');
    const password = String(formData.get('password') ?? '');
    const password2 = String(formData.get('password2') ?? '');

    if (password.length < 6 || password.length > 32) {
      setValidationErrors({ password: t('password.length') });
      return;
    }
    if (password !== password2) {
      setValidationErrors({ password2: t('password.mismatch') });
      return;
    }
    if (oldPassword === password) {
      setValidationErrors({ password: t('password.same') });
      return;
    }

    editPassword.mutate(
      { oldPassword, password },
      {
        onSuccess: () => {
          toast.success(t('saved'));
          form.reset();
        },
        onError: (err) => {
          const message = requestErrorMessage(err, t('error'));
          if (message) setValidationErrors({ oldPassword: message });
        },
      },
    );
  };

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">{t('nav.password')}</h2>
        <p className="text-muted mt-2 text-sm">{t('password.hint')}</p>
      </div>

      <Form className="flex flex-col gap-4" validationErrors={validationErrors} onSubmit={onSubmit}>
        <TextField isRequired name="oldPassword" type="password" className="w-full">
          <Label>{t('password.old')}</Label>
          <Input autoComplete="current-password" />
          <FieldError />
        </TextField>

        <TextField isRequired name="password" type="password" className="w-full" minLength={6}>
          <Label>{t('password.new')}</Label>
          <Input autoComplete="new-password" />
          <FieldError />
        </TextField>

        <TextField isRequired name="password2" type="password" className="w-full" minLength={6}>
          <Label>{t('password.confirm')}</Label>
          <Input autoComplete="new-password" />
          <FieldError />
        </TextField>

        <Button type="submit" variant="primary" isDisabled={editPassword.isPending}>
          {editPassword.isPending ? t('saving') : t('password.submit')}
        </Button>
      </Form>
    </div>
  );
}
