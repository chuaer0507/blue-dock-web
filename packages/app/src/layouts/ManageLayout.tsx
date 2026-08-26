import { NavLink, Outlet, useNavigate } from 'react-router';
import { useEffect, useMemo } from 'react';
import {
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  FolderIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  Cog6ToothIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@heroui/react';
import { useTranslation } from '@blue-dock/i18n';
import {
  isMicroMenuInSection,
  microAppHostPath,
  resolveAppBadge,
  setAssistantOperationHandler,
  sumAppBadges,
  useAppBadges,
  useMicroAppMenu,
  useRealtime,
  type AppBadgeEntry,
} from '@blue-dock/api';
import { UserMenu } from '../components/UserMenu';
import { AssistantPanel } from '../features/assistant/AssistantPanel';
import { MicroAppKeepAliveLayer } from '../features/application/MicroAppKeepAliveLayer';
import { CreateProjectModal } from '../features/project/CreateProjectModal';
import { CreateGroupModal } from '../features/messenger/CreateGroupModal';
import { usePlatform, useScreen } from '../utils/platform';
import { cn } from '../utils/cn';

const SIDE_LINKS = [
  { to: '/manage/dashboard', key: 'nav.dashboard', icon: HomeIcon },
  { to: '/manage/project', key: 'nav.project', icon: RectangleStackIcon },
  { to: '/manage/calendar', key: 'nav.calendar', icon: CalendarIcon },
  { to: '/manage/messenger', key: 'nav.messenger', icon: ChatBubbleLeftRightIcon },
  { to: '/manage/file', key: 'nav.file', icon: FolderIcon },
  { to: '/manage/application', key: 'nav.application', icon: Squares2X2Icon },
  { to: '/manage/search', key: 'nav.search', icon: MagnifyingGlassIcon },
] as const;

const TAB_LINKS = [
  { to: '/manage/messenger', key: 'nav.messenger', icon: ChatBubbleLeftRightIcon },
  { to: '/manage/dashboard', key: 'nav.dashboard', icon: HomeIcon },
  { to: '/manage/application', key: 'nav.application', icon: Squares2X2Icon },
  { to: '/manage/file', key: 'nav.file', icon: FolderIcon },
] as const;

function NavItem({
  to,
  label,
  icon: Icon,
  compact,
  badge,
}: {
  to: string;
  label: string;
  icon: typeof HomeIcon;
  compact?: boolean;
  badge?: AppBadgeEntry;
}) {
  const showBadge = Boolean(badge && (badge.count > 0 || badge.dot));
  const link = (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          compact && 'flex-col gap-1 px-2 py-1.5 text-xs',
          isActive
            ? 'bg-accent-soft text-accent-soft-foreground'
            : 'text-muted hover:bg-default hover:text-foreground',
        )
      }
    >
      <Icon className={cn('size-5 shrink-0', compact && 'size-5')} aria-hidden />
      <span className={cn(compact && 'truncate')}>{label}</span>
    </NavLink>
  );

  if (!showBadge || !badge) return link;

  return (
    <Badge.Anchor className="w-full">
      {link}
      {badge.count > 0 ? (
        <Badge color="danger" size="sm">
          {badge.count > 99 ? '99+' : badge.count}
        </Badge>
      ) : (
        <Badge color="danger" size="sm" />
      )}
    </Badge.Anchor>
  );
}

/** Manage 主壳：侧栏 / Tabbar + Outlet */
export function ManageLayout() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { navMode } = useScreen();
  const platform = usePlatform();
  useRealtime({ platform });

  useEffect(() => {
    setAssistantOperationHandler((action, payload) => {
      if (action !== 'navigate') {
        throw new Error(`unsupported action: ${action}`);
      }
      const path =
        payload && typeof payload === 'object'
          ? String((payload as { path?: unknown }).path ?? '').trim()
          : '';
      if (!path.startsWith('/') || path.startsWith('//')) {
        throw new Error('invalid path');
      }
      navigate(path);
      return { path };
    });
    return () => setAssistantOperationHandler(null);
  }, [navigate]);

  const menuQuery = useMicroAppMenu();
  const badgesQuery = useAppBadges();

  const applicationBadge = useMemo(() => sumAppBadges(badgesQuery.data), [badgesQuery.data]);

  const mainMicros = useMemo(() => {
    const out: { to: string; label: string; badge: AppBadgeEntry }[] = [];
    for (const app of menuQuery.data ?? []) {
      for (const menu of app.menuItems ?? []) {
        if (!isMicroMenuInSection(menu.location, 'main/menu')) continue;
        out.push({
          to: microAppHostPath(app.id, menu.key || undefined),
          label: menu.label || app.name || app.id,
          badge: resolveAppBadge(badgesQuery.data, app.id, menu.key || undefined),
        });
      }
    }
    return out;
  }, [badgesQuery.data, menuQuery.data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'k' && !e.shiftKey) {
        e.preventDefault();
        navigate('/manage/search');
        return;
      }
      if (key === 'p' && e.shiftKey) {
        e.preventDefault();
        navigate('/manage/project');
        window.setTimeout(() => {
          window.dispatchEvent(new Event('blue-dock:new-project'));
        }, 50);
        return;
      }
      if (key === 'm' && e.shiftKey) {
        e.preventDefault();
        navigate('/meeting');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  if (navMode === 'tabbar') {
    return (
      <div className="bg-background text-foreground flex min-h-dvh flex-col">
        <main className="relative min-h-0 flex-1 overflow-auto pb-[calc(var(--tabbar-height)+var(--safe-area-bottom))]">
          <Outlet />
          <MicroAppKeepAliveLayer />
          <CreateProjectModal hideTrigger onCreated={(p) => navigate(`/manage/project/${p.id}`)} />
          <CreateGroupModal hideTrigger />
        </main>
        <nav
          className="border-separator bg-surface fixed inset-x-0 bottom-0 z-10 flex justify-around border-t px-1 pt-1"
          style={{ paddingBottom: 'var(--safe-area-bottom)' }}
          aria-label="Tab bar"
        >
          <div className="h-(--tabbar-height) flex w-full items-stretch justify-around">
            {TAB_LINKS.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                label={t(item.key)}
                icon={item.icon}
                compact
                badge={item.to === '/manage/application' ? applicationBadge : undefined}
              />
            ))}
            <div className="flex items-center justify-center">
              <UserMenu compact />
            </div>
          </div>
        </nav>
        <AssistantPanel />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground flex min-h-dvh">
      <aside className="border-separator bg-surface flex w-56 shrink-0 flex-col border-r">
        <div className="px-4 py-5">
          <p className="text-lg font-semibold tracking-tight">{t('app.name')}</p>
          <p className="text-muted text-xs">{t('app.tagline')}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2" aria-label="Main">
          {SIDE_LINKS.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={t(item.key)}
              icon={item.icon}
              badge={item.to === '/manage/application' ? applicationBadge : undefined}
            />
          ))}
          {mainMicros.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={Squares2X2Icon}
              badge={item.badge}
            />
          ))}
          <NavItem to="/manage/setting/personal" label={t('nav.settings')} icon={Cog6ToothIcon} />
        </nav>
        <div className="border-separator border-t p-2">
          <UserMenu />
        </div>
      </aside>
      <main className="relative min-h-0 min-w-0 flex-1 overflow-auto">
        <Outlet />
        <MicroAppKeepAliveLayer />
        <CreateProjectModal hideTrigger onCreated={(p) => navigate(`/manage/project/${p.id}`)} />
        <CreateGroupModal hideTrigger />
      </main>
      <AssistantPanel />
    </div>
  );
}
