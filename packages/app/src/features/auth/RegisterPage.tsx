import { useEffect, useState, type FormEvent } from 'react';
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
import { fetchNeedInvite, useRegister, useSendEmailCode } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { requestErrorMessage, toastRequestError } from '../../utils/toast-request-error';
import { AuthFooterLinks, AuthShell, useEmailCodeCountdown } from './AuthShell';

/** 注册：邮箱旁发码按钮；邮箱验证码输入框常显；密码 RSA 加密上送 */
export function RegisterPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const register = useRegister();
  const sendCode = useSendEmailCode();
  const countdown = useEmailCodeCountdown(60);
  const [needInvite, setNeedInvite] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');

  useEffect(() => {
    void fetchNeedInvite()
      .then((res) => setNeedInvite(res.need))
      .catch(() => setNeedInvite(false));
  }, []);

  const onSendCode = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setValidationErrors({ email: t('auth.emailRequired') });
      return;
    }
    sendCode.mutate(
      { email: trimmed, type: 'reg' },
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
    const password = String(formData.get('password') ?? '');
    const password2 = String(formData.get('password2') ?? '');
    const emailCode = String(formData.get('emailCode') ?? '').trim();
    const nickname = String(formData.get('nickname') ?? '').trim();
    const invite = String(formData.get('invite') ?? '').trim();

    if (password !== password2) {
      setValidationErrors({ password2: t('auth.passwordMismatch') });
      return;
    }
    if (!emailCode) {
      setValidationErrors({ emailCode: t('auth.emailCodeRequired') });
      return;
    }
    if (needInvite && !invite) {
      setValidationErrors({ invite: t('auth.inviteRequired') });
      return;
    }

    register.mutate(
      {
        email: nextEmail,
        password,
        emailCode,
        ...(nickname ? { nickname } : {}),
        ...(needInvite ? { invite } : {}),
      },
      {
        onSuccess: (data) => {
          if (data.requireEmailVerify) {
            toast.info(t('auth.registerVerifyEmail'));
            navigate('/login', { replace: true });
            return;
          }
          if (data.token) {
            navigate('/manage/dashboard', { replace: true });
            return;
          }
          toast.success(t('auth.registerOk'));
          navigate('/login', { replace: true });
        },
        onError: (err) => {
          const message = requestErrorMessage(err, t('auth.registerFailed'));
          if (message) setValidationErrors({ emailCode: message });
        },
      },
    );
  };

  return (
    <AuthShell
      title={t('auth.welcomeRegister')}
      subtitle={t('auth.subtitleRegister')}
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

        <TextField name="nickname" className="w-full">
          <Label>{t('auth.nickname')}</Label>
          <Input autoComplete="nickname" />
          <FieldError />
        </TextField>

        <TextField isRequired name="password" type="password" className="w-full" minLength={6}>
          <Label>{t('auth.password')}</Label>
          <Input autoComplete="new-password" />
          <FieldError />
        </TextField>

        <TextField isRequired name="password2" type="password" className="w-full" minLength={6}>
          <Label>{t('auth.confirmPassword')}</Label>
          <Input autoComplete="new-password" />
          <FieldError />
        </TextField>

        {needInvite ? (
          <TextField isRequired name="invite" className="w-full">
            <Label>{t('auth.inviteCode')}</Label>
            <Input autoComplete="off" />
            <FieldError />
          </TextField>
        ) : null}

        <Button type="submit" variant="primary" isDisabled={register.isPending}>
          {register.isPending ? t('auth.registering') : t('auth.registerSubmit')}
        </Button>
      </Form>
    </AuthShell>
  );
}
