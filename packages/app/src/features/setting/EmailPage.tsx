import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button, FieldError, Form, Input, Label, TextField, toast } from '@heroui/react';
import {
  useCurrentUser,
  useRequestEmailEdit,
  useResendEmailVerification,
  useUserExtra,
  type EmailLinkSendResult,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';

const EMAIL_MAX = 32;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** 设置 · 邮箱：展示 / 重发验证 / 申请改邮 */
export function EmailPage() {
  const { t } = useTranslation('setting');
  const { data: user, isLoading } = useCurrentUser();
  const extra = useUserExtra(user?.userId);
  const resend = useResendEmailVerification();
  const requestEdit = useRequestEmailEdit();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lastDev, setLastDev] = useState<EmailLinkSendResult | null>(null);

  const verified = (extra.data?.emailVerify ?? 0) === 1;
  const busy = resend.isPending || requestEdit.isPending;

  const onSent = (data: EmailLinkSendResult, successKey: string) => {
    toast.success(t(successKey, { email: data.email || '—' }));
    if (data.devCode) {
      setLastDev(data);
      toast.info(t('email.devCode', { code: data.devCode }));
    } else {
      setLastDev(null);
    }
  };

  const onResend = () => {
    resend.mutate(undefined, {
      onSuccess: (data) => onSent(data, 'email.resent'),
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationErrors({});
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') ?? '')
      .trim()
      .toLowerCase();

    if (!email || !EMAIL_RE.test(email) || email.length > EMAIL_MAX) {
      setValidationErrors({ email: t('email.invalid') });
      return;
    }
    if (user?.email && email === user.email.trim().toLowerCase()) {
      setValidationErrors({ email: t('email.same') });
      return;
    }

    requestEdit.mutate(email, {
      onSuccess: (data) => {
        onSent(data, 'email.editSent');
        form.reset();
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">{t('nav.email')}</h2>
        <p className="text-muted mt-2 text-sm">{t('email.hint')}</p>
      </div>

      <div className="border-border bg-default/40 rounded-lg border px-4 py-3">
        <p className="text-muted text-xs">{t('fields.email')}</p>
        <p className="mt-1 text-sm font-medium">{isLoading ? t('loading') : user?.email || '—'}</p>
        {!isLoading && user ? (
          <p className="text-muted mt-2 text-xs">
            {extra.isLoading
              ? t('loading')
              : verified
                ? t('email.verified')
                : t('email.unverified')}
          </p>
        ) : null}
      </div>

      {!verified && user ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm">{t('email.resendHint')}</p>
          <Button variant="secondary" className="self-start" isDisabled={busy} onPress={onResend}>
            {resend.isPending ? t('email.sending') : t('email.resend')}
          </Button>
        </div>
      ) : null}

      <Form className="flex flex-col gap-4" validationErrors={validationErrors} onSubmit={onSubmit}>
        <p className="text-muted text-sm">{t('email.changeHint')}</p>
        <TextField isRequired name="email" type="email" className="w-full" maxLength={EMAIL_MAX}>
          <Label>{t('email.newLabel')}</Label>
          <Input autoComplete="email" placeholder={t('email.newPlaceholder')} />
          <FieldError />
        </TextField>
        <Button type="submit" variant="primary" isDisabled={busy || isLoading}>
          {requestEdit.isPending ? t('email.sending') : t('email.submit')}
        </Button>
      </Form>

      {lastDev?.devCode ? (
        <p className="text-muted text-sm">
          {t('email.devLinkHint')}{' '}
          <Link
            className="text-accent underline-offset-2 hover:underline"
            to={`/single/valid/email?code=${encodeURIComponent(lastDev.devCode)}`}
          >
            {t('email.openVerify')}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
