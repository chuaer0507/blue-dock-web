import { useEffect, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { useNavigate, useSearchParams } from 'react-router';
import { ApiError, TransportError, useVerifyEmail } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** 邮箱验证独立页：`/single/valid/email?code=` */
export function ValidEmailPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = (params.get('code') ?? '').trim();
  const verify = useVerifyEmail();
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!code) {
      setStatus('error');
      setMessage(t('single.emailCodeMissing'));
      return;
    }
    verify.mutate(code, {
      onSuccess: () => {
        setStatus('ok');
        setMessage(t('single.emailVerified'));
      },
      onError: (err) => {
        setStatus('error');
        setMessage(
          err instanceof ApiError || err instanceof TransportError
            ? err.message || t('error.bad_request')
            : t('error.bad_request'),
        );
      },
    });
  }, [code, t, verify]);

  return (
    <div className="bg-background text-foreground flex min-h-dvh items-center justify-center p-6">
      <div className="border-border bg-surface w-full max-w-md rounded-2xl border p-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t('app.name')}</h1>
        <p className="text-muted mt-4 text-sm">
          {status === 'idle' || verify.isPending ? t('single.emailVerifying') : message}
        </p>
        {status === 'ok' || status === 'error' ? (
          <div className="mt-6 flex flex-col items-center gap-2">
            <Button onPress={() => navigate('/login')}>{t('auth.login')}</Button>
            <Button variant="ghost" size="sm" onPress={() => navigate('/')}>
              {t('error.backHome')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
