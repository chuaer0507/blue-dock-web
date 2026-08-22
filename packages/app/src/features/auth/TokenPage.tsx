import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { clearAccessToken, setAccessToken, useCurrentUser } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/manage/dashboard';
  return raw;
}

/** `/token?token=`：写入 Bearer 后校验 users/info，再跳 redirect */
export function TokenPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const redirectTo = useMemo(() => safeRedirect(params.get('redirect')), [params]);
  const applied = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (applied.current) return;
    applied.current = true;
    setAccessToken(token);
  }, [token]);

  const enabled = Boolean(token);
  const { isSuccess, isError, isLoading } = useCurrentUser(enabled);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    if (isSuccess) {
      navigate(redirectTo, { replace: true });
    }
    if (isError) {
      clearAccessToken();
      navigate('/login', { replace: true });
    }
  }, [token, isSuccess, isError, navigate, redirectTo]);

  if (!token) {
    return (
      <div className="bg-background text-foreground flex min-h-dvh items-center justify-center p-6">
        <p className="text-muted text-sm">{t('auth.tokenMissing')}</p>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground flex min-h-dvh items-center justify-center p-6">
      <p className="text-muted text-sm">
        {isLoading || (!isSuccess && !isError) ? t('auth.tokenLoading') : t('auth.loggingIn')}
      </p>
    </div>
  );
}
