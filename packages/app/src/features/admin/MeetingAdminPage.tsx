import { useEffect, useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Checkbox, Form, Input, Label, TextField, toast } from '@heroui/react';
import { useMeetingSetting, useSaveMeetingSetting, type MeetingSetting } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';

/** 会议（Agora）设置 */
export function MeetingAdminPage() {
  const { t } = useTranslation('admin');
  const query = useMeetingSetting();
  const save = useSaveMeetingSetting();
  const [form, setForm] = useState<MeetingSetting | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  if (!form) {
    return (
      <AdminPageFrame title={t('meeting.title')}>
        <p className="text-muted text-sm">…</p>
      </AdminPageFrame>
    );
  }

  const patch = <K extends keyof MeetingSetting>(key: K, value: MeetingSetting[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, {
      onSuccess: () => toast.success(t('meeting.saved')),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <AdminPageFrame title={t('meeting.title')} hint={t('meeting.hint')}>
      <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <Checkbox
          isSelected={form.enabled === 'open'}
          onChange={(on) => patch('enabled', on ? 'open' : 'close')}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>{t('meeting.enabled')}</Label>
          </Checkbox.Content>
        </Checkbox>
        {(
          [
            ['appId', 'appId'],
            ['appCertificate', 'appCertificate'],
            ['apiKey', 'apiKey'],
            ['apiSecret', 'apiSecret'],
            ['channelSalt', 'channelSalt'],
            ['shareBaseUrl', 'shareBaseUrl'],
          ] as const
        ).map(([key, label]) => (
          <TextField
            key={key}
            name={key}
            value={form[key]}
            onChange={(v) => patch(key, v)}
            className="w-full"
          >
            <Label>{t(`meeting.${label}`)}</Label>
            <Input
              type={
                key.includes('Secret') || key.includes('Certificate') || key === 'channelSalt'
                  ? 'password'
                  : 'text'
              }
              placeholder={
                key.includes('Secret') || key.includes('Certificate') || key === 'channelSalt'
                  ? t('meeting.secretHint')
                  : undefined
              }
              autoComplete="off"
            />
          </TextField>
        ))}
        <Checkbox
          isSelected={form.allowDevToken === 'open'}
          onChange={(on) => patch('allowDevToken', on ? 'open' : 'close')}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>{t('meeting.allowDevToken')}</Label>
          </Checkbox.Content>
        </Checkbox>
        <Checkbox
          isSelected={form.allowCloseWithoutRest === 'open'}
          onChange={(on) => patch('allowCloseWithoutRest', on ? 'open' : 'close')}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>{t('meeting.allowCloseWithoutRest')}</Label>
          </Checkbox.Content>
        </Checkbox>
        <TextField
          name="idle"
          value={String(form.closeIdleMinutes)}
          onChange={(v) => patch('closeIdleMinutes', Number(v) || 0)}
          className="w-40"
        >
          <Label>{t('meeting.closeIdleMinutes')}</Label>
          <Input type="number" min={0} />
        </TextField>
        <TextField
          name="ttl"
          value={String(form.shareTtlHours)}
          onChange={(v) => patch('shareTtlHours', Number(v) || 0)}
          className="w-40"
        >
          <Label>{t('meeting.shareTtlHours')}</Label>
          <Input type="number" min={0} />
        </TextField>
        <Button type="submit" size="sm" className="self-start" isDisabled={save.isPending}>
          {t('meeting.save')}
        </Button>
      </Form>
    </AdminPageFrame>
  );
}
