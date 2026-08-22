import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Button } from '@heroui/react';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import {
  findMicroAppMenu,
  getAccessToken,
  isMicroAppBlankType,
  resolveMicroAppUrl,
  useClearAppBadge,
  useMicroAppMenu,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { microAppCacheKey, useMicroAppKeepAliveStore } from '../../stores/micro-app-keepalive';
import { MicroAppIframe } from './MicroAppIframe';

/** 微应用 iframe 宿主（`/manage/apps/:appId` · `/single/apps/:name`） */
export function MicroAppHostPage() {
  const { t } = useTranslation('application');
  const navigate = useNavigate();
  const params = useParams();
  const appId = params.appId || params.name || '';
  const [search] = useSearchParams();
  const menuKey = search.get('key');
  const blankOpened = useRef(false);
  const badgeCleared = useRef(false);
  const isSingle = Boolean(params.name) && !params.appId;

  const activate = useMicroAppKeepAliveStore((s) => s.activate);
  const deactivate = useMicroAppKeepAliveStore((s) => s.deactivate);

  const menuQuery = useMicroAppMenu(Boolean(appId));
  const clearBadge = useClearAppBadge();

  const hit = useMemo(
    () => findMicroAppMenu(menuQuery.data, appId, menuKey),
    [appId, menuKey, menuQuery.data],
  );

  const src = useMemo(() => {
    if (!hit) return '';
    return resolveMicroAppUrl(hit.menu.url, getAccessToken());
  }, [hit]);

  const isBlank = Boolean(hit && isMicroAppBlankType(hit.menu.type));
  const title = hit?.menu.label || hit?.app.name || appId;
  const keepAlive = Boolean(hit?.menu.keepAlive) && !isBlank && !isSingle;
  const cacheKey = microAppCacheKey(appId, menuKey);
  const immersive = Boolean(hit?.menu.immersive);

  useEffect(() => {
    if (!hit || !src || badgeCleared.current || !hit.menu.badgeClearOnOpen) return;
    badgeCleared.current = true;
    clearBadge.mutate({
      appId: hit.app.id,
      menuKey: hit.menu.key || undefined,
    });
  }, [clearBadge, hit, src]);

  useEffect(() => {
    if (!hit || !src || !isBlank || blankOpened.current) return;
    blankOpened.current = true;
    window.open(src, '_blank', 'noopener,noreferrer');
  }, [hit, isBlank, src]);

  useEffect(() => {
    if (!keepAlive || !hit || !src) return;
    activate({
      cacheKey,
      appId: hit.app.id,
      menuKey: hit.menu.key || menuKey || undefined,
      src,
      title,
      transparent: Boolean(hit.menu.transparent),
      autoDarkTheme: Boolean(hit.menu.autoDarkTheme),
      immersive,
    });
    return () => deactivate(cacheKey);
  }, [activate, cacheKey, deactivate, hit, immersive, keepAlive, menuKey, src, title]);

  if (!appId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-muted text-sm">{t('micro.missingId')}</p>
        <Button size="sm" variant="secondary" onPress={() => navigate('/manage/application')}>
          {t('micro.back')}
        </Button>
      </div>
    );
  }

  if (menuQuery.isLoading) {
    return (
      <div className="text-muted flex h-full items-center justify-center p-6 text-sm">
        {t('micro.loading')}
      </div>
    );
  }

  if (!hit || !src) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-muted text-sm">{t('micro.notFound')}</p>
        <Button size="sm" variant="secondary" onPress={() => navigate('/manage/application')}>
          {t('micro.back')}
        </Button>
      </div>
    );
  }

  if (isBlank) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-muted text-sm">{t('openExternal')}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onPress={() => navigate('/manage/application')}>
            {t('micro.back')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onPress={() => window.open(src, '_blank', 'noopener,noreferrer')}
          >
            <ArrowTopRightOnSquareIcon className="size-4" aria-hidden />
            {t('micro.openExternal')}
          </Button>
        </div>
      </div>
    );
  }

  // keepAlive：由 ManageLayout 内缓存层渲染 iframe
  if (keepAlive) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!immersive ? (
        <header className="border-border flex shrink-0 items-center gap-2 border-b px-3 py-2">
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label={t('micro.back')}
            onPress={() => navigate('/manage/application')}
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h1>
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label={t('micro.openExternal')}
            onPress={() => window.open(src, '_blank', 'noopener,noreferrer')}
          >
            <ArrowTopRightOnSquareIcon className="size-4" aria-hidden />
          </Button>
        </header>
      ) : null}
      <MicroAppIframe
        src={src}
        title={title}
        transparent={Boolean(hit.menu.transparent)}
        autoDarkTheme={Boolean(hit.menu.autoDarkTheme)}
      />
    </div>
  );
}
