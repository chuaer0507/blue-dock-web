import { useMemo, useRef, type ComponentType, type DragEvent, type SVGProps } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Button, toast, useOverlayState } from '@heroui/react';
import {
  BellAlertIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FolderIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  QrCodeIcon,
  QueueListIcon,
  ServerStackIcon,
  Squares2X2Icon,
  UserGroupIcon,
  UsersIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import {
  firstMicroMenuInSection,
  identityHas,
  microAppHostPath,
  orderBySortIds,
  resolveAppBadge,
  useAppBadges,
  useAppSort,
  useClearAppBadge,
  useCurrentUser,
  useMicroAppMenu,
  useSaveAppSort,
  type AppBadgeEntry,
  type MicroAppEntry,
  type MicroAppMenuItem,
  type MicroMenuSection,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { usePlatform, useScreen } from '../../utils/platform';
import { cn } from '../../utils/cn';
import { CreateTaskQuickModal } from '../task/CreateTaskQuickModal';
import {
  ADMIN_APPS,
  DEFAULT_ADMIN_SORT,
  DEFAULT_BASE_SORT,
  SYSTEM_APPS,
  type BuiltinAppDef,
} from './catalog';

type IconComp = ComponentType<SVGProps<SVGSVGElement>>;

const ICONS: Record<string, IconComp> = {
  approve: ClipboardDocumentCheckIcon,
  attendance: ClockIcon,
  report: DocumentTextIcon,
  favorite: HeartIcon,
  recent: QueueListIcon,
  mybot: Squares2X2Icon,
  createGroup: UserGroupIcon,
  meeting: VideoCameraIcon,
  addProject: PlusCircleIcon,
  addTask: PlusCircleIcon,
  exportManage: DocumentTextIcon,
  calendar: CalendarDaysIcon,
  file: FolderIcon,
  setting: Cog6ToothIcon,
  scan: QrCodeIcon,
  ldap: ServerStackIcon,
  mail: EnvelopeIcon,
  appPush: BellAlertIcon,
  complaint: MagnifyingGlassIcon,
  dataExport: DocumentTextIcon,
  allUser: UsersIcon,
  appstore: Squares2X2Icon,
  systemSetting: BuildingOffice2Icon,
};

type GridCard = {
  id: string;
  label: string;
  icon: IconComp;
  badge: AppBadgeEntry;
  onPress: () => void;
};

function microVisible(app: MicroAppEntry, isAdmin: boolean): boolean {
  const tags = app.visibleTo;
  if (!tags?.length) return true;
  if (tags.includes('all')) return true;
  if (tags.includes('admin')) return isAdmin;
  return true;
}

function AppCard({
  card,
  dragEnabled,
  onDragStart,
  onDropBefore,
}: {
  card: GridCard;
  dragEnabled: boolean;
  onDragStart: (id: string, e: DragEvent) => void;
  onDropBefore: (id: string, e: DragEvent) => void;
}) {
  const Icon = card.icon;
  const showBadge = card.badge.count > 0 || card.badge.dot;
  const inner = (
    <div
      draggable={dragEnabled}
      onDragStart={(e) => onDragStart(card.id, e)}
      onDragOver={(e) => {
        if (!dragEnabled) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => onDropBefore(card.id, e)}
      className={cn(dragEnabled && 'cursor-grab active:cursor-grabbing')}
    >
      <Button
        variant="secondary"
        className="border-border bg-surface h-auto w-full flex-col items-center gap-2 rounded-xl border px-3 py-4 font-normal"
        onPress={card.onPress}
      >
        <span className="bg-accent/10 text-accent flex size-10 items-center justify-center rounded-xl">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="line-clamp-2 text-center text-xs leading-snug">{card.label}</span>
      </Button>
    </div>
  );

  if (!showBadge) return inner;

  return (
    <Badge.Anchor className="w-full">
      {inner}
      {card.badge.count > 0 ? (
        <Badge color="danger" size="sm">
          {card.badge.count > 99 ? '99+' : card.badge.count}
        </Badge>
      ) : (
        <Badge color="danger" size="sm" />
      )}
    </Badge.Anchor>
  );
}

function AppGrid({
  title,
  cards,
  dragEnabled,
  onReorder,
  hint,
}: {
  title: string;
  cards: GridCard[];
  dragEnabled: boolean;
  onReorder?: (ids: string[]) => void;
  hint?: string;
}) {
  const dragId = useRef<string | null>(null);
  if (cards.length === 0) return null;

  const onDragStart = (id: string, e: DragEvent) => {
    if (!dragEnabled) return;
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const onDropBefore = (beforeId: string, e: DragEvent) => {
    e.preventDefault();
    if (!dragEnabled || !onReorder) return;
    const fromId = dragId.current || e.dataTransfer.getData('text/plain');
    dragId.current = null;
    if (!fromId || fromId === beforeId) return;
    const ids = cards.map((c) => c.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(beforeId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onReorder(next);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {dragEnabled && hint ? <p className="text-muted text-xs">{hint}</p> : null}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {cards.map((card) => (
          <AppCard
            key={card.id}
            card={card}
            dragEnabled={dragEnabled}
            onDragStart={onDragStart}
            onDropBefore={onDropBefore}
          />
        ))}
      </div>
    </section>
  );
}

/** 应用中心：系统 / 微应用 / 管理员卡片 + 个人排序（可拖拽） */
export function ApplicationPage() {
  const { t } = useTranslation('application');
  const navigate = useNavigate();
  const platform = usePlatform();
  const { navMode } = useScreen();
  const compact = navMode === 'tabbar';
  const isMobile = platform === 'mobile';
  const dragEnabled = navMode !== 'tabbar';

  const userQuery = useCurrentUser();
  const isAdmin = identityHas(userQuery.data?.identity, 'admin');

  const sortQuery = useAppSort();
  const menuQuery = useMicroAppMenu();
  const badgesQuery = useAppBadges();
  const saveSort = useSaveAppSort();
  const clearBadge = useClearAppBadge();
  const createTaskState = useOverlayState();

  // 系统卡片不依赖微应用菜单；菜单请求异常不能阻断常用入口。
  const loading = sortQuery.isLoading;
  const errored = sortQuery.isError;

  const openMicro = (app: MicroAppEntry, menu?: MicroAppMenuItem) => {
    const target = menu ?? app.menuItems?.[0];
    if (!target) {
      toast.danger(t('micro.notFound'));
      return;
    }
    if (target.badgeClearOnOpen) {
      clearBadge.mutate({ appId: app.id, menuKey: target.key || undefined });
    }
    navigate(microAppHostPath(app.id, target.key || undefined));
  };

  const openBuiltin = (app: BuiltinAppDef) => {
    if (app.id === 'addTask') {
      createTaskState.open();
      return;
    }
    if (app.id === 'addProject') {
      window.dispatchEvent(new Event('blue-dock:new-project'));
      return;
    }
    if (app.id === 'createGroup') {
      window.dispatchEvent(new Event('blue-dock:new-group'));
      return;
    }
    if (app.id === 'scan') {
      navigate('/manage/scan');
      return;
    }
    if (app.id === 'approve') {
      const micro = (menuQuery.data ?? []).find(
        (a: MicroAppEntry) => a.id === 'approve' || a.id.toLowerCase().includes('approve'),
      );
      if (micro) {
        openMicro(micro);
        return;
      }
      toast.danger(t('approve.missing'));
      return;
    }
    if (app.path) {
      navigate(app.path);
      return;
    }
    toast.danger(t('comingSoon'));
  };

  const microCards = (section: MicroMenuSection): GridCard[] =>
    (menuQuery.data ?? [])
      .filter((app: MicroAppEntry) => microVisible(app, isAdmin))
      .flatMap((app: MicroAppEntry): GridCard[] => {
        const menu = firstMicroMenuInSection(app, section);
        if (!menu) return [];
        const badge = resolveAppBadge(badgesQuery.data, app.id, menu.key || undefined);
        return [
          {
            id: app.id,
            label: menu.label || app.name || app.id,
            icon: Squares2X2Icon,
            badge,
            onPress: () => openMicro(app, menu),
          },
        ];
      });

  const baseCards = useMemo((): GridCard[] => {
    const builtins = SYSTEM_APPS.filter((app) => {
      if (app.compactOnly && !compact) return false;
      if (app.mobileOnly && !isMobile) return false;
      return true;
    }).map((app): GridCard => ({
      id: app.id,
      label: t(app.labelKey),
      icon: ICONS[app.id] ?? Squares2X2Icon,
      badge: { count: 0, dot: false },
      onPress: () => openBuiltin(app),
    }));

    const mixed = [...builtins, ...microCards('application')];
    const sortIds = sortQuery.data?.sorts.base?.length
      ? sortQuery.data.sorts.base
      : DEFAULT_BASE_SORT;
    return orderBySortIds(mixed, sortIds);
  }, [badgesQuery.data, compact, isAdmin, isMobile, menuQuery.data, sortQuery.data?.sorts.base, t]);

  const adminCards = useMemo((): GridCard[] => {
    if (!isAdmin) return [];
    const builtins = ADMIN_APPS.map((app): GridCard => ({
      id: app.id,
      label: t(app.labelKey),
      icon: ICONS[app.id] ?? Cog6ToothIcon,
      badge: { count: 0, dot: false },
      onPress: () => openBuiltin(app),
    }));
    const mixed = [...builtins, ...microCards('application/admin')];
    const sortIds = sortQuery.data?.sorts.admin?.length
      ? sortQuery.data.sorts.admin
      : DEFAULT_ADMIN_SORT;
    return orderBySortIds(mixed, sortIds);
  }, [badgesQuery.data, isAdmin, menuQuery.data, sortQuery.data?.sorts.admin, t]);

  const persistSort = (section: 'base' | 'admin', ids: string[]) => {
    const current = sortQuery.data?.sorts ?? {
      base: DEFAULT_BASE_SORT,
      admin: DEFAULT_ADMIN_SORT,
    };
    saveSort.mutate(
      {
        base: section === 'base' ? ids : current.base?.length ? current.base : DEFAULT_BASE_SORT,
        admin:
          section === 'admin' ? ids : current.admin?.length ? current.admin : DEFAULT_ADMIN_SORT,
      },
      {
        onSuccess: () => toast.success(t('sortSaved')),
        onError: () => toast.danger(t('error')),
      },
    );
  };

  const onResetSort = () => {
    saveSort.mutate(
      { base: DEFAULT_BASE_SORT, admin: DEFAULT_ADMIN_SORT },
      {
        onSuccess: () => toast.success(t('resetOk')),
        onError: () => toast.danger(t('error')),
      },
    );
  };

  const onRefresh = () => {
    void sortQuery.refetch();
    void menuQuery.refetch();
    void badgesQuery.refetch();
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 p-6">
      <CreateTaskQuickModal state={createTaskState} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onPress={onRefresh}>
            {t('refresh')}
          </Button>
          <Button size="sm" variant="ghost" onPress={onResetSort} isDisabled={saveSort.isPending}>
            {t('resetSort')}
          </Button>
        </div>
      </header>

      {loading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {errored ? (
        <div className="flex items-center gap-3">
          <p className="text-danger text-sm">{t('error')}</p>
          <Button size="sm" variant="secondary" onPress={onRefresh}>
            {t('retry')}
          </Button>
        </div>
      ) : null}

      <>
        <AppGrid
          title={t('section.base')}
          cards={baseCards}
          dragEnabled={dragEnabled}
          hint={t('dragHint')}
          onReorder={(ids) => persistSort('base', ids)}
        />
        {baseCards.length === 0 ? <p className="text-muted text-sm">{t('emptyMicro')}</p> : null}
        <AppGrid
          title={t('section.admin')}
          cards={adminCards}
          dragEnabled={dragEnabled}
          hint={t('dragHint')}
          onReorder={(ids) => persistSort('admin', ids)}
        />
      </>
    </div>
  );
}
