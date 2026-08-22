import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, toast } from '@heroui/react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import QRCode from 'qrcode';
import { createQrLogin, pollQrLogin } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { bindPersistAfterLogin } from '../../stores/persist';
import { requestErrorMessage } from '../../utils/toast-request-error';

function userIdFromLogin(user: Record<string, unknown> | undefined): number | null {
  if (!user) return null;
  const raw = user.userId ?? user.id;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 登录页扫码区：create + 轮询；成功后写 token 并跳转 */
export function LoginQrPanel({ redirectTo }: { redirectTo: string }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [status, setStatus] = useState<'loading' | 'waiting' | 'confirmed' | 'error'>('loading');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError('');
    setDataUrl('');
    try {
      const created = await createQrLogin();
      setCode(created.code);
      const url = await QRCode.toDataURL(created.code, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: 'M',
      });
      setDataUrl(url);
      setStatus('waiting');
    } catch (err) {
      setStatus('error');
      setError(requestErrorMessage(err, t('auth.qrFailed')) || t('auth.qrFailed'));
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!code || status === 'loading' || status === 'error') return;
    let stopped = false;
    const timer = window.setInterval(() => {
      void (async () => {
        if (stopped) return;
        try {
          const res = await pollQrLogin(code);
          if (stopped) return;
          if (res.status === 'confirmed') {
            setStatus('confirmed');
            return;
          }
          if (res.status === 'success' && res.token) {
            stopped = true;
            const uid = userIdFromLogin(res.user);
            if (uid) bindPersistAfterLogin(uid);
            toast.success(t('auth.qrSuccess'));
            navigate(redirectTo, { replace: true });
          }
        } catch (err) {
          stopped = true;
          setStatus('error');
          setError(requestErrorMessage(err, t('auth.qrExpired')) || t('auth.qrExpired'));
        }
      })();
    }, 1500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [code, navigate, redirectTo, status, t]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-muted text-center text-sm">{t('auth.qrHint')}</p>
      {dataUrl ? (
        <img src={dataUrl} alt={t('auth.qrAlt')} className="border-border rounded-xl border bg-white p-2" />
      ) : (
        <div className="border-border bg-surface flex size-[220px] items-center justify-center rounded-xl border">
          <span className="text-muted text-sm">
            {status === 'error' ? t('auth.qrFailed') : t('auth.qrLoading')}
          </span>
        </div>
      )}
      {status === 'confirmed' ? (
        <p className="text-success text-sm">{t('auth.qrConfirmed')}</p>
      ) : null}
      {error ? <p className="text-danger text-center text-sm">{error}</p> : null}
      <Button size="sm" variant="secondary" onPress={() => void refresh()}>
        <ArrowPathIcon className="size-4" aria-hidden />
        {t('auth.qrRefresh')}
      </Button>
    </div>
  );
}
