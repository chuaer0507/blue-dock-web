import { Button } from '@heroui/react';
import {
  detectRequestPlatform,
  useAccessTokenExpire,
  useSystemChinaIp,
  useSystemInfo,
  useSystemUpdateLog,
  useSystemVersion,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { usePlatform } from '../../utils/platform';

function formatExpire(expireAt: number, ttlSeconds: number, locale: string): string {
  if (expireAt > 0) {
    return new Date(expireAt).toLocaleString(locale);
  }
  if (ttlSeconds > 0) {
    const mins = Math.max(1, Math.round(ttlSeconds / 60));
    return `≈ ${mins} min`;
  }
  return '—';
}

/** 设置 · 版本信息（本机壳层 + 服务端 version / 更新日志） */
export function VersionPage() {
  const { t, i18n } = useTranslation('setting');
  const platform = usePlatform();
  const requestPlatform = detectRequestPlatform();
  const clientVersion =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION
      ? String(import.meta.env.VITE_APP_VERSION)
      : '0.0.0';

  const versionQuery = useSystemVersion();
  const logQuery = useSystemUpdateLog(20);
  const chinaIpQuery = useSystemChinaIp();
  const infoQuery = useSystemInfo();
  const tokenExpireQuery = useAccessTokenExpire();
  const server = versionQuery.data;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">{t('nav.version')}</h2>
        <p className="text-muted mt-2 text-sm">{t('version.hint')}</p>
      </div>

      <dl className="border-border divide-border divide-y rounded-lg border text-sm">
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted">{t('version.app')}</dt>
          <dd className="font-medium">{server?.name || 'Blue Dock'}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted">{t('version.server')}</dt>
          <dd className="font-medium">
            {versionQuery.isLoading
              ? t('loading')
              : versionQuery.isError
                ? t('version.serverUnavailable')
                : server?.version || '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted">{t('version.package')}</dt>
          <dd className="font-medium">{clientVersion}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted">{t('version.endpoint')}</dt>
          <dd className="font-medium">{requestPlatform}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted">{t('version.runtime')}</dt>
          <dd className="font-medium">{platform}</dd>
        </div>
        {server && server.deviceCount > 0 ? (
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{t('version.devices')}</dt>
            <dd className="font-medium">{server.deviceCount}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted">{t('version.tokenExpire')}</dt>
          <dd className="font-medium">
            {tokenExpireQuery.isLoading
              ? t('loading')
              : tokenExpireQuery.isError
                ? '—'
                : formatExpire(
                    tokenExpireQuery.data?.expireAt ?? 0,
                    tokenExpireQuery.data?.ttlSeconds ?? 0,
                    i18n.language,
                  )}
          </dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted">{t('version.clientIp')}</dt>
          <dd className="font-medium">
            {chinaIpQuery.isLoading
              ? t('loading')
              : chinaIpQuery.data
                ? `${chinaIpQuery.data.ip || '—'} · ${
                    chinaIpQuery.data.isChina ? t('version.ipChina') : t('version.ipOverseas')
                  }`
                : '—'}
          </dd>
        </div>
        {infoQuery.data?.java ? (
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{t('version.java')}</dt>
            <dd className="font-medium">{infoQuery.data.java}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('version.changelog')}</h3>
          {logQuery.data?.logVersion ? (
            <span className="text-muted text-xs">
              {t('version.logVersion', { version: logQuery.data.logVersion })}
            </span>
          ) : null}
        </div>
        {logQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
        {logQuery.isError ? (
          <div className="flex items-center gap-2">
            <p className="text-danger text-sm">{t('error')}</p>
            <Button size="sm" variant="secondary" onPress={() => void logQuery.refetch()}>
              {t('version.retry')}
            </Button>
          </div>
        ) : null}
        {!logQuery.isLoading && !logQuery.isError ? (
          <pre className="border-border bg-default/30 max-h-80 overflow-auto rounded-lg border p-3 text-xs whitespace-pre-wrap">
            {logQuery.data?.updateLog?.trim() || t('version.changelogEmpty')}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
