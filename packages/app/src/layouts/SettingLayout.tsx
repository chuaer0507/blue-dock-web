import { Link, NavLink, Outlet } from 'react-router';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../utils/cn';

const SETTING_LINKS = [
  { to: 'personal', key: 'nav.personal' },
  { to: 'tags', key: 'nav.tags' },
  { to: 'password', key: 'nav.password' },
  { to: 'email', key: 'nav.email' },
  { to: 'appearance', key: 'nav.appearance' },
  { to: 'keyboard', key: 'nav.keyboard' },
  { to: 'notifications', key: 'nav.notifications' },
  { to: 'devices', key: 'nav.devices' },
  { to: 'attendance', key: 'nav.attendance' },
  { to: 'annual', key: 'nav.annual' },
  { to: 'version', key: 'nav.version' },
  { to: 'license', key: 'nav.license' },
  { to: 'danger', key: 'nav.danger' },
] as const;

/** 设置双栏：侧栏菜单 + Outlet */
export function SettingLayout() {
  const { t } = useTranslation('setting');

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <aside className="border-separator bg-surface flex w-full shrink-0 flex-col border-b md:w-52 md:border-b-0 md:border-r">
        <div className="px-4 py-4">
          <h1 className="text-lg font-semibold">{t('title')}</h1>
        </div>
        <nav
          className="flex flex-1 gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible md:pb-4"
          aria-label={t('title')}
        >
          {SETTING_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent-soft text-accent-soft-foreground'
                    : 'text-muted hover:bg-default hover:text-foreground',
                )
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="border-separator mt-auto hidden border-t px-4 py-3 md:block">
          <Link
            to="/privacy"
            className="text-muted hover:text-foreground text-xs underline-offset-2 hover:underline"
          >
            {t('privacyLink')}
          </Link>
        </div>
      </aside>
      <section className="min-h-0 min-w-0 flex-1 overflow-auto p-6">
        <Outlet />
      </section>
    </div>
  );
}
