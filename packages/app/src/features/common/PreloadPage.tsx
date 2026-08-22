import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Spinner } from '@heroui/react';
import { fetchSystemPrefetch, getAccessToken } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

const MIN_SPLASH_MS = 420;
const BRIDGE_POLL_MS = 100;
const BRIDGE_MAX_TRIES = 20;

function resolveNextPath(redirect: string | null): string {
  if (redirect?.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/preload')) {
    return redirect;
  }
  return getAccessToken() ? '/manage/dashboard' : '/login';
}

function waitForDesktopBridge(): Promise<void> {
  if (typeof window === 'undefined' || window.desktop) return Promise.resolve();
  return new Promise((resolve) => {
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      if (window.desktop || tries >= BRIDGE_MAX_TRIES) {
        window.clearInterval(id);
        resolve();
      }
    }, BRIDGE_POLL_MS);
  });
}

function warmPrefetchLinks(urls: string[]): void {
  if (typeof document === 'undefined') return;
  for (const href of urls.slice(0, 20)) {
    if (!href.startsWith('/') && !href.startsWith('http')) continue;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }
}

/** `/preload`：客户端启动闪屏；等桌面桥就绪后跳转登录 / 工作台（可带 `?redirect=`） */
export function PreloadPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    void (async () => {
      try {
        const prefetchPromise = fetchSystemPrefetch().catch(() => [] as string[]);
        await waitForDesktopBridge();
        const urls = await prefetchPromise;
        if (!cancelled && urls.length > 0) warmPrefetchLinks(urls);
        const elapsed = Date.now() - started;
        const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
        await new Promise((r) => window.setTimeout(r, wait));
        if (cancelled) return;
        navigate(resolveNextPath(searchParams.get('redirect')), { replace: true });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <p className="text-lg font-semibold tracking-tight">Blue Dock</p>
      {failed ? (
        <>
          <p className="text-danger text-sm">{t('preload.failed')}</p>
          <Button
            size="sm"
            variant="secondary"
            onPress={() =>
              navigate(resolveNextPath(searchParams.get('redirect')), { replace: true })
            }
          >
            {t('preload.continue')}
          </Button>
        </>
      ) : (
        <>
          <Spinner size="lg" color="accent" aria-label={t('preload.loading')} />
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-medium">{t('preload.loading')}</p>
            <p className="text-muted text-xs">{t('preload.hint')}</p>
          </div>
        </>
      )}
    </div>
  );
}
