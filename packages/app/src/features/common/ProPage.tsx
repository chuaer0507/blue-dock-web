import { Link, useNavigate } from 'react-router';
import { Button, Label, ListBox, Select } from '@heroui/react';
import { getAccessToken } from '@blue-dock/api';
import {
  normalizeAppLanguage,
  setLanguage,
  useTranslation,
  type AppLanguage,
} from '@blue-dock/i18n';
import { useTheme } from '../../providers/ThemeProvider';
import type { ThemePreference } from '../../utils/theme';

const FEATURE_KEYS = ['capacity', 'admin', 'support'] as const;

/** `/pro`：Blue Dock Pro 介绍（公开页） */
export function ProPage() {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { preference, setPreference } = useTheme();
  const lang = normalizeAppLanguage(i18n.language);
  const loggedIn = Boolean(getAccessToken());

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 p-4">
        <Link
          to={loggedIn ? '/manage' : '/login'}
          className="text-foreground text-sm font-semibold tracking-tight"
        >
          Blue Dock
        </Link>
        <div className="flex items-center gap-3">
          <Select
            className="w-36"
            value={lang}
            onChange={(key) => {
              if (key == null) return;
              void setLanguage(String(key) as AppLanguage);
            }}
            aria-label={t('auth.languageLabel')}
          >
            <Label className="sr-only">{t('auth.languageLabel')}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="zh-CN" textValue="中文">
                  中文
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="en-US" textValue="English">
                  English
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
          <Select
            className="w-36"
            value={preference}
            onChange={(key) => {
              if (key == null) return;
              setPreference(String(key) as ThemePreference);
            }}
            aria-label={t('auth.themeLabel')}
          >
            <Label className="sr-only">{t('auth.themeLabel')}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="system" textValue={t('theme.system')}>
                  {t('theme.system')}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="light" textValue={t('theme.light')}>
                  {t('theme.light')}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="dark" textValue={t('theme.dark')}>
                  {t('theme.dark')}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-10">
        <div className="flex flex-col gap-3">
          <p className="text-accent text-xs font-medium tracking-wide uppercase">{t('pro.eyebrow')}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('pro.title')}</h1>
          <p className="text-muted max-w-xl text-sm leading-relaxed sm:text-base">{t('pro.body')}</p>
        </div>

        <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
          {FEATURE_KEYS.map((key) => (
            <li key={key} className="bg-surface px-4 py-3">
              <p className="text-sm font-medium">{t(`pro.features.${key}.title`)}</p>
              <p className="text-muted mt-1 text-xs leading-relaxed">
                {t(`pro.features.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3">
          {loggedIn ? (
            <Button size="md" onPress={() => navigate('/manage')}>
              {t('pro.ctaApp')}
            </Button>
          ) : (
            <Button size="md" onPress={() => navigate('/login')}>
              {t('pro.ctaLogin')}
            </Button>
          )}
          <Button
            size="md"
            variant="secondary"
            onPress={() => {
              window.location.href = `mailto:${t('pro.salesEmail')}?subject=${encodeURIComponent(t('pro.salesSubject'))}`;
            }}
          >
            {t('pro.ctaContact')}
          </Button>
        </div>

        <p className="text-muted text-xs">
          <Link className="text-accent underline-offset-2 hover:underline" to="/login">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </main>
    </div>
  );
}
