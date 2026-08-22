import type { ReactNode } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { identityHas, useCurrentUser } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

const ADMIN_NAV = [
  { to: 'system', labelKey: 'system.title' },
  { to: 'storage', labelKey: 'storage.title' },
  { to: 'email', labelKey: 'email.title' },
  { to: 'meeting', labelKey: 'meeting.title' },
  { to: 'ai-bot', labelKey: 'aiBot.title' },
  { to: 'attendance', labelKey: 'attendance.title' },
  { to: 'app-push', labelKey: 'appPush.title' },
  { to: 'ldap', labelKey: 'ldap.title' },
  { to: 'appstore', labelKey: 'appstore.title' },
  { to: 'complaint', labelKey: 'complaint.title' },
  { to: 'user-groups', labelKey: 'userGroups.title' },
  { to: 'uploads', labelKey: 'uploads.title' },
] as const;

/** 管理后台壳：管理员门禁 + 侧栏 */
export function AdminLayout() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const userQuery = useCurrentUser();
  const isAdmin = identityHas(userQuery.data?.identity, 'admin');

  if (userQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted text-sm">…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-muted text-sm">{t('needAdmin')}</p>
        <Button size="sm" variant="secondary" onPress={() => navigate('/manage/application')}>
          {t('close')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="border-separator bg-surface flex w-48 shrink-0 flex-col gap-1 overflow-auto border-r p-3">
        <p className="text-muted mb-2 px-2 text-xs font-medium uppercase tracking-wide">
          {t('navTitle')}
        </p>
        {ADMIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'rounded-lg px-2 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-accent-soft text-accent-soft-foreground'
                  : 'text-muted hover:bg-default hover:text-foreground',
              )
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </aside>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

export function AdminIndexRedirect() {
  return <Navigate to="system" replace />;
}

export function AdminPageFrame({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {hint ? <p className="text-muted mt-1 text-sm">{hint}</p> : null}
      </header>
      {children}
    </div>
  );
}
