import { useEffect, useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Checkbox, Form, Input, Label, TextField, toast } from '@heroui/react';
import { useAppPushSetting, useSaveAppPushSetting, type AppPushSetting } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';

/** APP 推送（友盟）设置 */
export function AppPushAdminPage() {
  const { t } = useTranslation('admin');
  const query = useAppPushSetting();
  const save = useSaveAppPushSetting();
  const [form, setForm] = useState<AppPushSetting | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  if (!form) {
    return (
      <AdminPageFrame title={t('appPush.title')}>
        <p className="text-muted text-sm">…</p>
      </AdminPageFrame>
    );
  }

  const patch = <K extends keyof AppPushSetting>(key: K, value: AppPushSetting[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, {
      onSuccess: () => toast.success(t('appPush.saved')),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <AdminPageFrame title={t('appPush.title')} hint={t('appPush.hint')}>
      <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <Checkbox
          isSelected={form.open === 'open'}
          onChange={(on) => patch('open', on ? 'open' : 'close')}
        >
          {t('appPush.open')}
        </Checkbox>
        <Checkbox
          isSelected={form.productionMode === 'open'}
          onChange={(on) => patch('productionMode', on ? 'open' : 'close')}
        >
          {t('appPush.productionMode')}
        </Checkbox>
        <TextField
          name="alias"
          value={form.aliasType}
          onChange={(v) => patch('aliasType', v)}
          className="w-full max-w-md"
        >
          <Label>{t('appPush.aliasType')}</Label>
          <Input />
        </TextField>
        {(
          [
            ['iosKey', false],
            ['iosSecret', true],
            ['androidKey', false],
            ['androidSecret', true],
          ] as const
        ).map(([key, secret]) => (
          <TextField
            key={key}
            name={key}
            value={form[key]}
            onChange={(v) => patch(key, v)}
            className="w-full"
          >
            <Label>{t(`appPush.${key}`)}</Label>
            <Input
              type={secret ? 'password' : 'text'}
              placeholder={secret ? t('appPush.secretHint') : undefined}
              autoComplete="off"
            />
          </TextField>
        ))}
        <Button type="submit" size="sm" className="self-start" isDisabled={save.isPending}>
          {t('appPush.save')}
        </Button>
      </Form>
    </AdminPageFrame>
  );
}
