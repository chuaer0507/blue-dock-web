import { useState, type FormEvent } from 'react';
import { Button, Form, Input, Label, TextField, toast } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import { useDeviceList, useEditDevice, useLogoutDevice, type UserDeviceView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

function deviceLabel(device: UserDeviceView, unnamed: string): string {
  const d = device.detail ?? {};
  return (
    d.deviceName?.trim() ||
    [d.appBrand, d.appModel].filter(Boolean).join(' ') ||
    d.userAgent?.slice(0, 48) ||
    unnamed
  );
}

/** 设置 · 登录设备：列表、改本机名、踢下线 */
export function DevicesPage() {
  const { t } = useTranslation('setting');
  const { data, isLoading, isError } = useDeviceList();
  const logoutDevice = useLogoutDevice();
  const editDevice = useEditDevice();
  const [name, setName] = useState('');

  const list: UserDeviceView[] = data?.list ?? [];
  const current = list.find((d: UserDeviceView) => d.isCurrent === 1);

  const onRename = (event: FormEvent) => {
    event.preventDefault();
    const deviceName = name.trim();
    if (!deviceName) return;
    editDevice.mutate(
      { deviceName },
      {
        onSuccess: () => {
          toast.success(t('saved'));
          setName('');
        },
        onError: (err) => {
          toastRequestError(err, t('error'));
        },
      },
    );
  };

  const onLogout = (id: number) => {
    if (!window.confirm(t('devices.confirmLogout'))) return;
    logoutDevice.mutate(id, {
      onSuccess: () => toast.success(t('saved')),
      onError: (err) => {
        toastRequestError(err, t('error'));
      },
    });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">{t('nav.devices')}</h2>
      </div>

      <Form className="flex flex-col gap-3" onSubmit={onRename}>
        <TextField name="deviceName" className="w-full" value={name} onChange={setName}>
          <Label>{t('devices.name')}</Label>
          <Input
            placeholder={
              current ? deviceLabel(current, t('devices.unnamed')) : t('devices.namePlaceholder')
            }
          />
        </TextField>
        <p className="text-muted text-sm">{t('devices.renameHint')}</p>
        <Button
          type="submit"
          variant="secondary"
          className="self-start"
          isDisabled={!name.trim() || editDevice.isPending}
        >
          {editDevice.isPending ? t('saving') : t('save')}
        </Button>
      </Form>

      {isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {isError ? <p className="text-danger text-sm">{t('error')}</p> : null}
      {!isLoading && !isError && list.length === 0 ? (
        <p className="text-muted text-sm">{t('devices.empty')}</p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {list.map((device: UserDeviceView) => (
          <li
            key={device.id}
            className="border-border flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {deviceLabel(device, t('devices.unnamed'))}
                {device.isCurrent === 1 ? (
                  <span className="text-accent ms-2 text-xs font-normal">
                    {t('devices.current')}
                  </span>
                ) : null}
              </p>
              <p className="text-muted mt-1 truncate text-xs">
                {[device.detail?.ip, device.detail?.appOs, device.updatedAt || device.createdAt]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {device.isCurrent === 1 ? null : (
              <Button
                type="button"
                size="sm"
                variant="danger"
                isDisabled={logoutDevice.isPending}
                onPress={() => onLogout(device.id)}
              >
                {t('devices.logout')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
