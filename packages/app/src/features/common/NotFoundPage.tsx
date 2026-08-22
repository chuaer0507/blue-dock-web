import { useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { useTranslation } from '@blue-dock/i18n';

export function NotFoundPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t('error.notFound')}</h1>
      <p className="text-muted text-sm">{t('error.notFoundHint')}</p>
      <Button variant="primary" onPress={() => navigate('/')}>
        {t('error.backHome')}
      </Button>
    </div>
  );
}
