import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, FieldError, Form, Input, Label, TextField, TextArea, toast } from '@heroui/react';
import { toastRequestError, requestErrorMessage } from '../../utils/toast-request-error';
import {
  queryClient,
  useCurrentUser,
  useDeleteAccount,
  useDeleteAccountWarning,
  type DeleteAccountWarning,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** 设置 · 注销账号：warning → confirm（邮箱码或 RSA 密码） */
export function DangerPage() {
  const { t } = useTranslation('setting');
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const warn = useDeleteAccountWarning();
  const confirm = useDeleteAccount();
  const [step, setStep] = useState<'warn' | 'confirm'>('warn');
  const [warning, setWarning] = useState<DeleteAccountWarning | null>(null);
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email, email]);

  const onWarn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationErrors({});
    const nextEmail = email.trim();
    const nextReason = reason.trim();
    if (!nextEmail) {
      setValidationErrors({ email: t('danger.emailPlaceholder') });
      return;
    }
    if (!nextReason) {
      setValidationErrors({ reason: t('danger.reasonPlaceholder') });
      return;
    }
    warn.mutate(
      { email: nextEmail, reason: nextReason },
      {
        onSuccess: (data) => {
          setWarning(data);
          setStep('confirm');
        },
        onError: (err) => {
          toastRequestError(err, t('error'));
        },
      },
    );
  };

  const onConfirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationErrors({});
    if (!window.confirm(t('danger.finalConfirm'))) return;

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');
    const code = String(formData.get('code') ?? '').trim();

    if (warning?.needCode && !code) {
      setValidationErrors({ code: t('danger.code') });
      return;
    }
    if (!warning?.needCode && !password) {
      setValidationErrors({ password: t('danger.password') });
      return;
    }

    confirm.mutate(
      {
        email: email.trim(),
        reason: reason.trim(),
        ...(warning?.needCode ? { code } : { password }),
      },
      {
        onSuccess: () => {
          queryClient.clear();
          toast.success(t('saved'));
          navigate('/login', { replace: true });
        },
        onError: (err) => {
          const message = requestErrorMessage(err, t('error'));
          if (message) {
            setValidationErrors(warning?.needCode ? { code: message } : { password: message });
          }
        },
      },
    );
  };

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">{t('nav.danger')}</h2>
        <p className="text-muted mt-2 text-sm">{t('danger.hint')}</p>
      </div>

      {step === 'warn' ? (
        <Form className="flex flex-col gap-4" validationErrors={validationErrors} onSubmit={onWarn}>
          <TextField
            isRequired
            name="email"
            type="email"
            className="w-full"
            value={email}
            onChange={setEmail}
          >
            <Label>{t('danger.email')}</Label>
            <Input placeholder={t('danger.emailPlaceholder')} autoComplete="email" />
            <FieldError />
          </TextField>

          <TextField
            isRequired
            name="reason"
            className="w-full"
            value={reason}
            onChange={setReason}
          >
            <Label>{t('danger.reason')}</Label>
            <TextArea placeholder={t('danger.reasonPlaceholder')} rows={3} />
            <FieldError />
          </TextField>

          <Button type="submit" variant="danger" isDisabled={warn.isPending}>
            {warn.isPending ? t('danger.checking') : t('danger.continue')}
          </Button>
        </Form>
      ) : (
        <Form
          className="flex flex-col gap-4"
          validationErrors={validationErrors}
          onSubmit={onConfirm}
        >
          <p className="text-muted text-sm">{t('danger.confirmHint')}</p>

          {warning?.needCode ? (
            <TextField isRequired name="code" className="w-full">
              <Label>{t('danger.code')}</Label>
              <Input autoComplete="one-time-code" />
              <FieldError />
            </TextField>
          ) : (
            <TextField isRequired name="password" type="password" className="w-full">
              <Label>{t('danger.password')}</Label>
              <Input autoComplete="current-password" />
              <FieldError />
            </TextField>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onPress={() => {
                setStep('warn');
                setWarning(null);
              }}
            >
              {t('danger.back')}
            </Button>
            <Button type="submit" variant="danger" isDisabled={confirm.isPending}>
              {confirm.isPending ? t('danger.deleting') : t('danger.submit')}
            </Button>
          </div>
        </Form>
      )}
    </div>
  );
}
