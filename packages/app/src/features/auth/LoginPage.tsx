import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Button,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import {
  ApiCodes,
  ApiError,
  fetchCaptchaJson,
  fetchNeedCode,
  useLogin,
  useSystemDemo,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AuthFooterLinks, AuthShell } from './AuthShell';
import { LoginQrPanel } from './LoginQrPanel';
import { bindPersistAfterLogin } from '../../stores/persist';
import { requestErrorMessage } from '../../utils/toast-request-error';

function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/manage/dashboard';
  return raw;
}

function userIdFromLogin(user: Record<string, unknown>): number | null {
  const raw = user.userId ?? user.id;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 登录：密码 RSA 加密（api 内）或扫码。
 * 是否出现图形验证码由后端判定：`GET users/login/needCode`，以及登录失败 `code === -3`。
 * 若服务端配置了演示帐号（`GET system/demo`），密码模式显示一键填入。
 */
export function LoginPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useLogin();
  const demo = useSystemDemo(true);
  const [mode, setMode] = useState<'password' | 'qr'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaKey, setCaptchaKey] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const redirectTo = useMemo(() => safeRedirect(params.get('redirect')), [params]);
  const demoReady = Boolean(demo.data?.account && demo.data.password);

  const refreshCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const data = await fetchCaptchaJson();
      setCaptchaKey(data.key);
      setCaptchaImage(data.imageBase64);
    } catch {
      setCaptchaKey('');
      setCaptchaImage('');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  const showCaptchaFromServer = useCallback(async () => {
    setCaptchaRequired(true);
    await refreshCaptcha();
  }, [refreshCaptcha]);

  const syncCaptchaNeed = useCallback(async () => {
    try {
      const res = await fetchNeedCode();
      if (res.need) {
        await showCaptchaFromServer();
      }
    } catch {
      /* 探测失败不阻断登录 */
    }
  }, [showCaptchaFromServer]);

  useEffect(() => {
    void syncCaptchaNeed();
  }, [syncCaptchaNeed]);

  const fillDemo = () => {
    if (!demo.data?.account || !demo.data.password) return;
    setEmail(demo.data.account);
    setPassword(demo.data.password);
    setValidationErrors({});
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationErrors({});

    const formData = new FormData(event.currentTarget);
    const emailValue = String(formData.get('email') ?? '').trim() || email.trim();
    const passwordValue = String(formData.get('password') ?? '') || password;
    const captchaCode = String(formData.get('captchaCode') ?? '').trim();

    if (captchaRequired && !captchaCode) {
      setValidationErrors({ captchaCode: t('auth.captcha_required') });
      return;
    }

    login.mutate(
      {
        email: emailValue,
        password: passwordValue,
        ...(captchaRequired ? { captchaKey, captchaCode } : {}),
      },
      {
        onSuccess: (data) => {
          const uid = userIdFromLogin(data.user ?? {});
          if (uid) bindPersistAfterLogin(uid);
          setCaptchaRequired(false);
          navigate(redirectTo, { replace: true });
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === ApiCodes.CAPTCHA_REQUIRED.code) {
            void showCaptchaFromServer();
            setValidationErrors({ captchaCode: err.message || t('auth.captcha_required') });
            return;
          }
          if (captchaRequired) {
            void refreshCaptcha();
          } else {
            void syncCaptchaNeed();
          }
          const message = requestErrorMessage(err, t('auth.failed'));
          if (message) setValidationErrors({ password: message });
        },
      },
    );
  };

  return (
    <AuthShell
      title={mode === 'qr' ? t('auth.welcomeQr') : t('auth.welcome')}
      subtitle={mode === 'qr' ? t('auth.subtitleQr') : t('auth.subtitle')}
      footer={<AuthFooterLinks showRegister showForgot />}
    >
      <ToggleButtonGroup
        selectionMode="single"
        selectedKeys={new Set([mode])}
        disallowEmptySelection
        fullWidth
        onSelectionChange={(keys) => {
          const v = [...keys][0];
          if (v === 'password' || v === 'qr') setMode(v);
        }}
        className="mb-4"
        aria-label={t('auth.loginMode')}
      >
        <ToggleButton id="password">{t('auth.modePassword')}</ToggleButton>
        <ToggleButton id="qr">
          <ToggleButtonGroup.Separator />
          {t('auth.modeQr')}
        </ToggleButton>
      </ToggleButtonGroup>

      {mode === 'qr' ? (
        <LoginQrPanel redirectTo={redirectTo} />
      ) : (
        <Form
          className="flex flex-col gap-4"
          validationErrors={validationErrors}
          onSubmit={onSubmit}
        >
          <TextField
            isRequired
            name="email"
            type="email"
            className="w-full"
            value={email}
            onChange={setEmail}
          >
            <Label>{t('auth.email')}</Label>
            <Input placeholder={t('auth.emailPlaceholder')} autoComplete="username" />
            <FieldError />
          </TextField>

          <TextField
            isRequired
            name="password"
            type="password"
            className="w-full"
            value={password}
            onChange={setPassword}
          >
            <Label>{t('auth.password')}</Label>
            <Input autoComplete="current-password" />
            <FieldError />
          </TextField>

          {captchaRequired ? (
            <TextField isRequired name="captchaCode" className="w-full">
              <Label>{t('auth.captcha')}</Label>
              <InputGroup className="w-full">
                <InputGroup.Input autoComplete="off" placeholder={t('auth.captchaPlaceholder')} />
                <InputGroup.Suffix className="pe-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 w-24 min-w-0 shrink-0 overflow-hidden px-0"
                    onPress={() => void refreshCaptcha()}
                    aria-label={t('auth.captchaRefresh')}
                  >
                    {captchaLoading || !captchaImage ? (
                      <span className="text-muted text-xs">{t('auth.captchaLoading')}</span>
                    ) : (
                      <img
                        src={captchaImage}
                        alt={t('auth.captcha')}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </Button>
                </InputGroup.Suffix>
              </InputGroup>
              <FieldError />
            </TextField>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {demoReady ? (
              <Button
                type="button"
                variant="secondary"
                isDisabled={login.isPending}
                onPress={fillDemo}
              >
                {t('auth.fillDemo')}
              </Button>
            ) : null}
            <Button type="submit" variant="primary" isDisabled={login.isPending}>
              {login.isPending ? t('auth.loggingIn') : t('auth.submit')}
            </Button>
          </div>
        </Form>
      )}
    </AuthShell>
  );
}
