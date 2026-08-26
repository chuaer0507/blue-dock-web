import { Avatar, Button, Dropdown, Header, Label, Separator, toast } from '@heroui/react';
import {
  ArrowRightOnRectangleIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  HeartIcon,
  KeyIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  identityHas,
  queryClient,
  resolveAvatarSrc,
  useCurrentUser,
  useLogout,
  useTaskBrowse,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { useNavigate } from 'react-router';
import { clearPersistAfterLogout } from '../stores/persist';

function initials(name: string | undefined, email: string | undefined): string {
  const raw = (name || email || '?').trim();
  if (!raw) return '?';
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase();
}

/** Manage 壳头像菜单：最近任务 / 收藏 / 设置 / 清缓存 / 退出 */
export function UserMenu({ compact }: { compact?: boolean }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: recentTasks = [] } = useTaskBrowse(5);
  const logout = useLogout();
  const isAdmin = identityHas(user?.identity, 'admin');

  const displayName = user?.nickname || user?.email || t('app.name');

  const onAction = (key: string | number) => {
    const id = String(key);
    if (id.startsWith('task:')) {
      const taskId = Number(id.slice(5));
      if (taskId > 0) {
        navigate(`/single/task/${taskId}`);
      }
      return;
    }

    switch (id) {
      case 'favorites':
        navigate('/manage/favorite');
        break;
      case 'recent':
        navigate('/manage/recent');
        break;
      case 'annual':
        navigate('/manage/setting/annual');
        break;
      case 'settings':
        navigate('/manage/setting/personal');
        break;
      case 'system':
        navigate('/manage/admin/system');
        break;
      case 'license':
        navigate('/manage/setting/license');
        break;
      case 'clear-cache':
        if (!window.confirm(t('userMenu.clearCacheConfirm'))) return;
        queryClient.clear();
        toast.success(t('userMenu.cacheCleared'));
        break;
      case 'logout':
        if (!window.confirm(t('userMenu.logoutConfirm'))) return;
        logout.mutate(undefined, {
          onSettled: () => {
            clearPersistAfterLogout();
            navigate('/login', { replace: true });
          },
        });
        break;
      default:
        break;
    }
  };

  return (
    <Dropdown>
      <Button
        variant="ghost"
        className={
          compact
            ? 'h-auto min-w-0 flex-col gap-1 px-2 py-1.5'
            : 'h-auto w-full justify-start gap-3 px-2 py-2'
        }
        aria-label={displayName}
        isDisabled={logout.isPending}
      >
        <Avatar size={compact ? 'sm' : 'md'} className="shrink-0">
          <Avatar.Image alt={displayName} src={resolveAvatarSrc(user?.userImage, displayName)} />
          <Avatar.Fallback>{initials(user?.nickname, user?.email)}</Avatar.Fallback>
        </Avatar>
        {compact ? (
          <span className="text-muted max-w-14 truncate text-xs">{t('nav.mine')}</span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
            {displayName}
          </span>
        )}
      </Button>

      <Dropdown.Popover className="min-w-56">
        <Dropdown.Menu onAction={onAction}>
          <Dropdown.Section>
            <Header>{t('userMenu.recentTasks')}</Header>
            {recentTasks.length === 0 ? (
              <Dropdown.Item id="recent-empty" textValue={t('userMenu.recentEmpty')} isDisabled>
                <Label className="text-muted">{t('userMenu.recentEmpty')}</Label>
              </Dropdown.Item>
            ) : (
              recentTasks.map((task) => (
                <Dropdown.Item key={task.id} id={`task:${task.id}`} textValue={task.name}>
                  <Label className="truncate">{task.name}</Label>
                </Dropdown.Item>
              ))
            )}
          </Dropdown.Section>

          <Separator />

          <Dropdown.Item id="favorites" textValue={t('userMenu.favorites')}>
            <HeartIcon className="text-muted size-4 shrink-0" aria-hidden />
            <Label>{t('userMenu.favorites')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="recent" textValue={t('userMenu.recent')}>
            <ClockIcon className="text-muted size-4 shrink-0" aria-hidden />
            <Label>{t('userMenu.recent')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="annual" textValue={t('userMenu.annual')}>
            <ChartBarIcon className="text-muted size-4 shrink-0" aria-hidden />
            <Label>{t('userMenu.annual')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="settings" textValue={t('userMenu.personalSettings')}>
            <Cog6ToothIcon className="text-muted size-4 shrink-0" aria-hidden />
            <Label>{t('userMenu.personalSettings')}</Label>
          </Dropdown.Item>
          {isAdmin ? (
            <Dropdown.Item id="system" textValue={t('userMenu.systemSettings')}>
              <BuildingOffice2Icon className="text-muted size-4 shrink-0" aria-hidden />
              <Label>{t('userMenu.systemSettings')}</Label>
            </Dropdown.Item>
          ) : null}
          {isAdmin ? (
            <Dropdown.Item id="license" textValue={t('userMenu.license')}>
              <KeyIcon className="text-muted size-4 shrink-0" aria-hidden />
              <Label>{t('userMenu.license')}</Label>
            </Dropdown.Item>
          ) : null}

          <Separator />

          <Dropdown.Item id="clear-cache" textValue={t('userMenu.clearCache')}>
            <TrashIcon className="text-muted size-4 shrink-0" aria-hidden />
            <Label>{t('userMenu.clearCache')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="logout" textValue={t('nav.logout')} variant="danger">
            <ArrowRightOnRectangleIcon className="size-4 shrink-0" aria-hidden />
            <Label>{t('nav.logout')}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
