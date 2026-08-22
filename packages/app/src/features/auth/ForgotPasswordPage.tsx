import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  TextField,
  toast,
} from '@heroui/react';
import { useResetPassword, useSendEmailCode } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { requestErrorMessage, toastRequestError } from '../../utils/toast-request-error';
import { AuthFooterLinks, AuthShell, useEmailCodeCountdown } from './AuthShell';

/**
 * 忘记密码：先发/填邮箱验证码，校验通过后提交 RSA 加密的新密码。
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const sendCode = useSendEmailCode();
  const resetPassword = useResetPassword();
  const countdown = useEmailCodeCountdown(60);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');

  const onSendCode = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setValidationErrors({ email: t('auth.emailRequired') });
      return;
    }
    sendCode.mutate(
      { email: trimmed, type: 'reset' },
      {
        onSuccess: (data) => {
          countdown.start();
          if (data.devCode) {
            toast.info(`${t('auth.devCode')}: ${data.devCode}`);
          } else {
            toast.success(t('auth.codeSent'));
          }
        },
        onError: (err) => toastRequestError(err, t('auth.codeSendFailed')),
      },
    );
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationErrors({});

    const formData = new FormData(event.currentTarget);
    const nextEmail = String(formData.get('email') ?? '').trim();
    const emailCode = String(formData.get('emailCode') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const password2 = String(formData.get('password2') ?? '');

    if (!emailCode) {
      setValidationErrors({ emailCode: t('auth.emailCodeRequired') });
      return;
    }
    if (password !== password2) {
      setValidationErrors({ password2: t('auth.passwordMismatch') });
      return;
    }

    resetPassword.mutate(
      { email: nextEmail, emailCode, password },
      {
        onSuccess: () => {
          toast.success(t('auth.resetOk'));
          navigate('/login', { replace: true });
        },
        onError: (err) => {
          const message = requestErrorMessage(err, t('auth.resetFailed'));
          if (message) setValidationErrors({ emailCode: message });
        },
      },
    );
  };

  return (
    <AuthShell
      title={t('auth.resetPassword')}
      subtitle={t('auth.subtitleReset')}
      footer={<AuthFooterLinks showLogin />}
    >
      <Form className="flex flex-col gap-4" validationErrors={validationErrors} onSubmit={onSubmit}>
        <TextField
          isRequired
          name="email"
          type="email"
          className="w-full"
          value={email}
          onChange={setEmail}
        >
          <Label>{t('auth.email')}</Label>
          <InputGroup className="w-full">
            <InputGroup.Input placeholder={t('auth.emailPlaceholder')} autoComplete="email" />
            <InputGroup.Suffix className="pe-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                isDisabled={countdown.cooling || sendCode.isPending}
                onPress={onSendCode}
              >
                {countdown.cooling
                  ? t('auth.codeRetryIn', { seconds: countdown.left })
                  : t('auth.sendCode')}
              </Button>
            </InputGroup.Suffix>
          </InputGroup>
          <FieldError />
        </TextField>

        <TextField isRequired name="emailCode" className="w-full">
          <Label>{t('auth.emailCode')}</Label>
          <Input autoComplete="one-time-code" placeholder={t('auth.emailCodePlaceholder')} />
          <FieldError />
        </TextField>

        <TextField isRequired name="password" type="password" className="w-full" minLength={6}>
          <Label>{t('auth.newPassword')}</Label>
          <Input autoComplete="new-password" />
          <FieldError />
        </TextField>

        <TextField isRequired name="password2" type="password" className="w-full" minLength={6}>
          <Label>{t('auth.confirmPassword')}</Label>
          <Input autoComplete="new-password" />
          <FieldError />
        </TextField>

        <Button type="submit" variant="primary" isDisabled={resetPassword.isPending}>
          {resetPassword.isPending ? t('auth.resetting') : t('auth.resetSubmit')}
        </Button>
      </Form>
    </AuthShell>
  );
}
