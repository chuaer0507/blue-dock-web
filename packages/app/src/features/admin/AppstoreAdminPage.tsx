import { useEffect, useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Checkbox, Input, Label, ListBox, Select, Tabs, TextField, toast } from '@heroui/react';
import {
  normalizeMicroMenuLocation,
  useAppCatalog,
  useInstallApp,
  useInstalledApps,
  useMicroAppMenu,
  useSaveMicroAppMenu,
  useUninstallApp,
  useUpdateApp,
  type AppCatalogItem,
  type InstalledAppItem,
  type MicroAppEntry,
  type MicroAppMenuItem,
  type MicroMenuSection,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';

const MENU_LOCATIONS: { id: MicroMenuSection; labelKey: string }[] = [
  { id: 'application', labelKey: 'application' },
  { id: 'application/admin', labelKey: 'applicationAdmin' },
  { id: 'main/menu', labelKey: 'mainMenu' },
];

function emptyMenuItem(): MicroAppMenuItem {
  return {
    location: 'application',
    label: '',
    icon: '',
    url: '',
    type: 'iframe',
    keepAlive: false,
    disableScopeCss: false,
    autoDarkTheme: false,
    transparent: false,
    key: `m-${Date.now()}`,
    badgeClearOnOpen: true,
  };
}

function CatalogTab() {
  const { t } = useTranslation('admin');
  const catalog = useAppCatalog();
  const installed = useInstalledApps();
  const install = useInstallApp();
  const update = useUpdateApp();
  const uninstall = useUninstallApp();

  const fail = (err: unknown) => toastRequestError(err, t('needAdmin'));

  const catalogById = new Map((catalog.data ?? []).map((a) => [a.id, a]));

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-sm font-semibold">{t('appstore.catalogTitle')}</h2>
        {(catalog.data ?? []).length === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('appstore.emptyCatalog')}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {(catalog.data ?? []).map((app: AppCatalogItem) => (
              <li
                key={app.id}
                className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{app.name || app.id}</p>
                  <p className="text-muted text-xs">
                    {app.description || t('appstore.noDesc')} · v{app.version}
                  </p>
                </div>
                <Button
                  size="sm"
                  isDisabled={app.installed || install.isPending}
                  onPress={() =>
                    install.mutate(
                      { id: app.id, name: app.name, version: app.version },
                      {
                        onSuccess: () => toast.success(t('appstore.installedOk', { id: app.id })),
                        onError: fail,
                      },
                    )
                  }
                >
                  {t('appstore.install')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold">{t('appstore.installedTitle')}</h2>
        {(installed.data ?? []).length === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('appstore.emptyInstalled')}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {(installed.data ?? []).map((app: InstalledAppItem) => {
              const cat = catalogById.get(app.id);
              const protectedApp = app.id === 'appstore';
              const canUpdate = Boolean(cat);
              const newer =
                cat != null && cat.version && cat.version !== app.version ? cat.version : null;
              return (
                <li
                  key={app.id}
                  className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{app.name || app.id}</p>
                    <p className="text-muted text-xs">
                      {app.status} · v{app.version}
                      {newer ? ` → v${newer}` : ''}
                      {protectedApp ? ` · ${t('appstore.protected')}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canUpdate ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={update.isPending}
                        onPress={() =>
                          update.mutate(
                            {
                              id: app.id,
                              name: cat?.name || app.name,
                              version: cat?.version || app.version,
                            },
                            {
                              onSuccess: () =>
                                toast.success(t('appstore.updatedOk', { id: app.id })),
                              onError: fail,
                            },
                          )
                        }
                      >
                        {update.isPending ? t('appstore.updating') : t('appstore.update')}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="danger"
                      isDisabled={protectedApp || uninstall.isPending}
                      onPress={() => {
                        if (protectedApp) return;
                        if (!window.confirm(t('appstore.uninstallConfirm', { id: app.id }))) {
                          return;
                        }
                        uninstall.mutate(app.id, {
                          onSuccess: () =>
                            toast.success(t('appstore.uninstalledOk', { id: app.id })),
                          onError: fail,
                        });
                      }}
                    >
                      {t('appstore.uninstall')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function MenuTab() {
  const { t } = useTranslation('admin');
  const menuQuery = useMicroAppMenu(true);
  const save = useSaveMicroAppMenu();
  const [list, setList] = useState<MicroAppEntry[]>([]);

  useEffect(() => {
    if (menuQuery.data) {
      setList(
        menuQuery.data.map((app: MicroAppEntry) => ({
          ...app,
          menuItems: app.menuItems.map((m: MicroAppMenuItem) => ({ ...m })),
          visibleTo: app.visibleTo ? [...app.visibleTo] : undefined,
        })),
      );
    }
  }, [menuQuery.data]);

  const onSave = () => {
    save.mutate(list, {
      onSuccess: () => toast.success(t('appstore.menuSaved')),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted text-xs">{t('appstore.menuHint')}</p>
      {list.map((app, appIdx) => (
        <div
          key={app.id || appIdx}
          className="border-border flex flex-col gap-2 rounded-lg border p-3"
        >
          <div className="flex flex-wrap gap-2">
            <TextField
              name={`id-${appIdx}`}
              value={app.id}
              onChange={(v) =>
                setList((prev) => prev.map((row, i) => (i === appIdx ? { ...row, id: v } : row)))
              }
              className="min-w-28 flex-1"
            >
              <Label>{t('appstore.appId')}</Label>
              <Input />
            </TextField>
            <TextField
              name={`name-${appIdx}`}
              value={app.name}
              onChange={(v) =>
                setList((prev) => prev.map((row, i) => (i === appIdx ? { ...row, name: v } : row)))
              }
              className="min-w-28 flex-1"
            >
              <Label>{t('appstore.appName')}</Label>
              <Input />
            </TextField>
            <Select
              className="w-40"
              value={(app.visibleTo ?? []).includes('admin') ? 'admin' : 'all'}
              onChange={(key) => {
                if (key == null) return;
                setList((prev) =>
                  prev.map((row, i) =>
                    i === appIdx
                      ? { ...row, visibleTo: String(key) === 'admin' ? ['admin'] : undefined }
                      : row,
                  ),
                );
              }}
            >
              <Label>{t('appstore.visibleTo')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue={t('appstore.visibleAll')}>
                    {t('appstore.visibleAll')}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="admin" textValue={t('appstore.visibleAdmin')}>
                    {t('appstore.visibleAdmin')}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {(app.menuItems ?? []).map((menu, menuIdx) => (
            <div
              key={menu.key || menuIdx}
              className="bg-default/40 flex flex-wrap gap-2 rounded-md p-2"
            >
              <TextField
                name={`label-${appIdx}-${menuIdx}`}
                value={menu.label}
                onChange={(v) =>
                  setList((prev) =>
                    prev.map((row, i) =>
                      i === appIdx
                        ? {
                            ...row,
                            menuItems: row.menuItems.map((m, j) =>
                              j === menuIdx ? { ...m, label: v } : m,
                            ),
                          }
                        : row,
                    ),
                  )
                }
                className="min-w-28 flex-1"
              >
                <Label>{t('appstore.label')}</Label>
                <Input />
              </TextField>
              <TextField
                name={`url-${appIdx}-${menuIdx}`}
                value={menu.url}
                onChange={(v) =>
                  setList((prev) =>
                    prev.map((row, i) =>
                      i === appIdx
                        ? {
                            ...row,
                            menuItems: row.menuItems.map((m, j) =>
                              j === menuIdx ? { ...m, url: v } : m,
                            ),
                          }
                        : row,
                    ),
                  )
                }
                className="flex-2 min-w-40"
              >
                <Label>{t('appstore.url')}</Label>
                <Input />
              </TextField>
              <Select
                className="w-44"
                value={normalizeMicroMenuLocation(menu.location)}
                onChange={(key) => {
                  if (key == null) return;
                  setList((prev) =>
                    prev.map((row, i) =>
                      i === appIdx
                        ? {
                            ...row,
                            menuItems: row.menuItems.map((m, j) =>
                              j === menuIdx
                                ? { ...m, location: normalizeMicroMenuLocation(String(key)) }
                                : m,
                            ),
                          }
                        : row,
                    ),
                  );
                }}
              >
                <Label>{t('appstore.location')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {MENU_LOCATIONS.map(({ id, labelKey }) => (
                      <ListBox.Item
                        key={id}
                        id={id}
                        textValue={t(`appstore.locations.${labelKey}`)}
                      >
                        {t(`appstore.locations.${labelKey}`)}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Select
                className="w-44"
                value={menu.type || 'iframe'}
                onChange={(key) => {
                  if (key == null) return;
                  setList((prev) =>
                    prev.map((row, i) =>
                      i === appIdx
                        ? {
                            ...row,
                            menuItems: row.menuItems.map((m, j) =>
                              j === menuIdx ? { ...m, type: String(key) } : m,
                            ),
                          }
                        : row,
                    ),
                  );
                }}
              >
                <Label>{t('appstore.type')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {(
                      [
                        ['iframe', 'types.iframe'],
                        ['iframe_blank', 'types.iframeBlank'],
                        ['external', 'types.external'],
                      ] as const
                    ).map(([id, labelKey]) => (
                      <ListBox.Item
                        key={id}
                        id={id}
                        textValue={t(`appstore.${labelKey}`)}
                      >
                        {t(`appstore.${labelKey}`)}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Checkbox
                isSelected={Boolean(menu.keepAlive)}
                onChange={(on) =>
                  setList((prev) =>
                    prev.map((row, i) =>
                      i === appIdx
                        ? {
                            ...row,
                            menuItems: row.menuItems.map((m, j) =>
                              j === menuIdx ? { ...m, keepAlive: on } : m,
                            ),
                          }
                        : row,
                    ),
                  )
                }
              >
                {t('appstore.keepAlive')}
              </Checkbox>
              <Checkbox
                isSelected={Boolean(menu.badgeClearOnOpen)}
                onChange={(on) =>
                  setList((prev) =>
                    prev.map((row, i) =>
                      i === appIdx
                        ? {
                            ...row,
                            menuItems: row.menuItems.map((m, j) =>
                              j === menuIdx ? { ...m, badgeClearOnOpen: on } : m,
                            ),
                          }
                        : row,
                    ),
                  )
                }
              >
                {t('appstore.badgeClearOnOpen')}
              </Checkbox>
              <Button
                size="sm"
                variant="danger"
                onPress={() =>
                  setList((prev) =>
                    prev.map((row, i) =>
                      i === appIdx
                        ? { ...row, menuItems: row.menuItems.filter((_, j) => j !== menuIdx) }
                        : row,
                    ),
                  )
                }
              >
                {t('appstore.remove')}
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={() =>
                setList((prev) =>
                  prev.map((row, i) =>
                    i === appIdx ? { ...row, menuItems: [...row.menuItems, emptyMenuItem()] } : row,
                  ),
                )
              }
            >
              {t('appstore.add')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onPress={() => setList((prev) => prev.filter((_, i) => i !== appIdx))}
            >
              {t('appstore.remove')}
            </Button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onPress={() =>
            setList((prev) => [
              ...prev,
              {
                id: `custom-${Date.now()}`,
                name: '',
                version: '1.0.0',
                menuItems: [emptyMenuItem()],
              },
            ])
          }
        >
          {t('appstore.add')}
        </Button>
        <Button size="sm" onPress={onSave} isDisabled={save.isPending}>
          {t('appstore.saveMenu')}
        </Button>
      </div>
    </div>
  );
}

/** 应用市场：安装 / 更新 / 卸载 / 自定义菜单 */
export function AppstoreAdminPage() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('catalog');

  return (
    <AdminPageFrame title={t('appstore.title')} hint={t('appstore.hint')}>
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('appstore.title')}>
            <Tabs.Tab id="catalog">
              {t('appstore.tabCatalog')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="menu">
              {t('appstore.tabMenu')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="catalog" className="pt-4">
          <CatalogTab />
        </Tabs.Panel>
        <Tabs.Panel id="menu" className="pt-4">
          <MenuTab />
        </Tabs.Panel>
      </Tabs>
    </AdminPageFrame>
  );
}
