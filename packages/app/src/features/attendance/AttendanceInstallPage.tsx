import { Button, toast } from '@heroui/react';
import { useAttendanceInstallHint } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { Link } from 'react-router';

/** 匿名页：WiFi 自动打卡安装命令指引（`public/attendance/install`） */
export function AttendanceInstallPage() {
  const { t } = useTranslation('attendance');
  const query = useAttendanceInstallHint(true);
  const cmd = query.data?.installCmd?.trim() ?? '';
  const open = (query.data?.open || '').toLowerCase() === 'open';

  const onCopy = async () => {
    if (!cmd) return;
    try {
      await navigator.clipboard.writeText(cmd);
      toast.success(t('install.copied'));
    } catch {
      toast.danger(t('error'));
    }
  };

  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <div className="border-border bg-surface w-full max-w-lg rounded-2xl border p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">{t('install.title')}</h1>
        <p className="text-muted mt-2 text-sm">{t('install.hint')}</p>

        {query.isLoading ? <p className="text-muted mt-4 text-sm">{t('loading')}</p> : null}
        {query.isError ? (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-danger text-sm">{t('error')}</p>
            <Button size="sm" variant="secondary" onPress={() => void query.refetch()}>
              {t('retry')}
            </Button>
          </div>
        ) : null}

        {!query.isLoading && !query.isError ? (
          <div className="mt-4 flex flex-col gap-3">
            {!open ? <p className="text-muted text-sm">{t('install.closed')}</p> : null}
            {cmd ? (
              <>
                <pre className="bg-default overflow-x-auto whitespace-pre-wrap break-all rounded-lg p-3 text-xs">
                  {cmd}
                </pre>
                <Button size="sm" className="self-start" onPress={() => void onCopy()}>
                  {t('install.copy')}
                </Button>
              </>
            ) : (
              <p className="text-muted text-sm">{t('install.empty')}</p>
            )}
          </div>
        ) : null}

        <p className="text-muted mt-6 text-xs">
          <Link className="text-accent underline" to="/login">
            {t('install.backLogin')}
          </Link>
          {' · '}
          <Link className="text-accent underline" to="/manage/attendance">
            {t('install.toAttendance')}
          </Link>
        </p>
      </div>
    </div>
  );
}
