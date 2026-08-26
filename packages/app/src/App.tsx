import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import {
  Button,
  I18nProvider as HeroUII18nProvider,
  Modal,
  Toast,
  toast,
  useOverlayState,
} from '@heroui/react';
import {
  clearHttpCache,
  setLoadingController,
  setMessageTipsHandler,
  setUnauthorizedHandler,
} from '@blue-dock/api';
import { i18n, useTranslation, type AppLanguage } from '@blue-dock/i18n';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { router } from './routes';

function UnauthorizedBridge() {
  useEffect(() => {
    setUnauthorizedHandler(() => {
      const path = window.location.pathname + window.location.search;
      const search =
        path && path !== '/login' && !path.startsWith('/login')
          ? `?redirect=${encodeURIComponent(path)}`
          : '';
      void router.navigate(`/login${search}`, { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, []);
  return null;
}

/** 路由变化清空 GET 短缓存 */
function HttpCacheBridge() {
  useEffect(() => {
    clearHttpCache();
    return router.subscribe(() => {
      clearHttpCache();
    });
  }, []);
  return null;
}

/**
 * MessageTips：toast / dialog / snackBar（snackBar 降级 toast）。
 */
function MessageTipsBridge() {
  const { t } = useTranslation('common');
  const dialog = useOverlayState();
  const [dialogMessage, setDialogMessage] = useState('');
  const openDialog = dialog.open;

  useEffect(() => {
    setMessageTipsHandler(({ message, tipsType, success }) => {
      if (tipsType === 'showDialog') {
        setDialogMessage(message);
        openDialog();
        return;
      }
      if (success) toast.success(message);
      else toast.danger(message);
    });
    return () => setMessageTipsHandler(null);
  }, [openDialog]);

  return (
    <Modal.Backdrop isOpen={dialog.isOpen} onOpenChange={dialog.setOpen}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-sm">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t('error.tipsTitle')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="whitespace-pre-wrap text-sm">{dialogMessage}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onPress={dialog.close}>
              {t('error.tipsOk')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

/** LoadingInterceptor：仅 `extra.showLoading` / `showLazyLoading` 时显示 */
function LoadingBridge() {
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setLoadingController({
      show: () => setVisible(true),
      hide: () => setVisible(false),
    });
    return () => setLoadingController(null);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="bg-background/60 z-9999 fixed inset-0 flex items-center justify-center backdrop-blur-[1px]"
      role="status"
      aria-live="polite"
      aria-label={t('error.loading')}
    >
      <div
        className="border-accent h-9 w-9 animate-spin rounded-full border-2 border-t-transparent"
        aria-hidden
      />
    </div>
  );
}

function LocaleSync({ children }: { children: ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();
  const [locale, setLocale] = useState<AppLanguage>(
    () => (i18n.language as AppLanguage) || 'zh-CN',
  );

  useEffect(() => {
    const sync = (lng: string) => {
      setLocale(lng === 'en-US' ? 'en-US' : 'zh-CN');
    };
    sync(i18nInstance.language);
    i18nInstance.on('languageChanged', sync);
    return () => {
      i18nInstance.off('languageChanged', sync);
    };
  }, [i18nInstance]);

  return <HeroUII18nProvider locale={locale}>{children}</HeroUII18nProvider>;
}

function BoundaryShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  return (
    <ErrorBoundary fallbackTitle={t('error.boundaryTitle')} retryLabel={t('error.boundaryRetry')}>
      {children}
    </ErrorBoundary>
  );
}

function RouteFallback() {
  return (
    <div className="bg-background text-foreground flex min-h-dvh items-center justify-center">
      <span className="text-muted text-sm">…</span>
    </div>
  );
}

export function App() {
  return (
    <LocaleSync>
      <BoundaryShell>
        <Toast.Provider placement="top end" />
        <UnauthorizedBridge />
        <HttpCacheBridge />
        <MessageTipsBridge />
        <LoadingBridge />
        <Suspense fallback={<RouteFallback />}>
          <RouterProvider router={router} />
        </Suspense>
      </BoundaryShell>
    </LocaleSync>
  );
}
