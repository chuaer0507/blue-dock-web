import { Link, useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { useTranslation } from '@blue-dock/i18n';

/** 匿名隐私政策 HTML：`GET /api/privacy`（经代理同源 iframe） */
function privacySrc(): string {
  const base = String(import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');
  return `${base}/privacy`;
}

/** `/privacy`：展示服务端隐私政策 HTML */
export function PrivacyPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <Link to="/" className="text-foreground text-sm font-semibold tracking-tight">
            Blue Dock
          </Link>
          <h1 className="mt-1 text-lg font-semibold">{t('privacy.title')}</h1>
        </div>
        <Button variant="secondary" onPress={() => navigate(-1)}>
          {t('privacy.back')}
        </Button>
      </header>
      <iframe
        title={t('privacy.title')}
        src={privacySrc()}
        className="bg-surface min-h-0 w-full flex-1 border-0"
      />
    </div>
  );
}
