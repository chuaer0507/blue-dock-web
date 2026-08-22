import { useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@blue-dock/i18n';
import { microAppCacheKey, useMicroAppKeepAliveStore } from '../../stores/micro-app-keepalive';
import { cn } from '../../utils/cn';
import { MicroAppIframe } from './MicroAppIframe';

/** Manage 主区：keepAlive 微应用缓存层（隐藏不销毁） */
export function MicroAppKeepAliveLayer() {
  const { t } = useTranslation('application');
  const navigate = useNavigate();
  const entries = useMicroAppKeepAliveStore((s) => s.entries);
  const activeKey = useMicroAppKeepAliveStore((s) => s.activeKey);
  const list = Object.values(entries);

  if (list.length === 0) return null;

  return (
    <div
      className={cn(
        'bg-surface z-5 absolute inset-0 flex flex-col',
        !activeKey && 'pointer-events-none invisible',
      )}
      aria-hidden={!activeKey}
    >
      {list.map((entry) => {
        const active = entry.cacheKey === activeKey;
        return (
          <div
            key={entry.cacheKey}
            className={cn('absolute inset-0 flex flex-col', !active && 'hidden')}
            data-micro-cache={microAppCacheKey(entry.appId, entry.menuKey)}
          >
            {!entry.immersive ? (
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
                <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.title}</h1>
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label={t('micro.openExternal')}
                  onPress={() => window.open(entry.src, '_blank', 'noopener,noreferrer')}
                >
                  <ArrowTopRightOnSquareIcon className="size-4" aria-hidden />
                </Button>
              </header>
            ) : null}
            <MicroAppIframe
              src={entry.src}
              title={entry.title}
              transparent={entry.transparent}
              autoDarkTheme={entry.autoDarkTheme}
            />
          </div>
        );
      })}
    </div>
  );
}
