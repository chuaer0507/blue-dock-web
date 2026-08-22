import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Label, ListBox, Select } from '@heroui/react';
import {
  normalizeAppLanguage,
  setLanguage,
  useTranslation,
  type AppLanguage,
} from '@blue-dock/i18n';
import { useTheme } from '../../providers/ThemeProvider';
import type { ThemePreference } from '../../utils/theme';

/** 登录 / 注册 / 忘记密码共用壳：语言、主题、品牌区 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t, i18n } = useTranslation('common');
  const { preference, setPreference } = useTheme();
  const lang = normalizeAppLanguage(i18n.language);

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="flex items-center justify-end gap-3 p-4">
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
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="bg-surface shadow-surface border-border w-full max-w-md rounded-xl border p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted mt-2 text-sm">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer}
        </div>
      </main>
    </div>
  );
}

/** 邮箱验证码发送 + 倒计时 */
export function useEmailCodeCountdown(seconds = 60) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);

  return {
    left,
    cooling: left > 0,
    start: () => setLeft(seconds),
  };
}

export function AuthFooterLinks({
  showRegister,
  showLogin,
  showForgot,
}: {
  showRegister?: boolean;
  showLogin?: boolean;
  showForgot?: boolean;
}) {
  const { t } = useTranslation('common');
  return (
    <div className="text-muted mt-6 space-y-2 text-sm">
      {showForgot ? (
        <p>
          <Link className="text-accent underline-offset-2 hover:underline" to="/forgot-password">
            {t('auth.forgotPassword')}
          </Link>
        </p>
      ) : null}
      {showRegister ? (
        <p>
          {t('auth.noAccount')}{' '}
          <Link className="text-accent underline-offset-2 hover:underline" to="/register">
            {t('auth.registerLink')}
          </Link>
        </p>
      ) : null}
      {showLogin ? (
        <p>
          {t('auth.hasAccount')}{' '}
          <Link className="text-accent underline-offset-2 hover:underline" to="/login">
            {t('auth.backToLogin')}
          </Link>
        </p>
      ) : null}
      <p className="text-center">
        <Link className="text-accent underline-offset-2 hover:underline" to="/pro">
          {t('pro.title')}
        </Link>
        {' · '}
        <Link className="text-accent underline-offset-2 hover:underline" to="/privacy">
          {t('privacy.title')}
        </Link>
      </p>
    </div>
  );
}
