import { useEffect, useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Checkbox, Form, Input, Label, TextField, toast } from '@heroui/react';
import {
  useEmailCheck,
  useEmailSetting,
  useSaveEmailSetting,
  type EmailSetting,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';

function parseMinute(raw: string, fallback: number): number {
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : fallback;
}

/** 邮件通知设置 */
export function EmailAdminPage() {
  const { t } = useTranslation('admin');
  const query = useEmailSetting();
  const save = useSaveEmailSetting();
  const check = useEmailCheck();
  const [form, setForm] = useState<EmailSetting | null>(null);
  const [testTo, setTestTo] = useState('');

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  if (!form) {
    return (
      <AdminPageFrame title={t('email.title')}>
        <p className="text-muted text-sm">…</p>
      </AdminPageFrame>
    );
  }

  const patch = <K extends keyof EmailSetting>(key: K, value: EmailSetting[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const ranges = form.messageUnreadTimeRanges ?? [];

  const patchRange = (index: number, side: 0 | 1, value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const next = (prev.messageUnreadTimeRanges ?? []).map((row, i) =>
        i === index ? ([side === 0 ? value : row[0], side === 1 ? value : row[1]] as string[]) : row,
      );
      return { ...prev, messageUnreadTimeRanges: next };
    });
  };

  const addRange = () => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            messageUnreadTimeRanges: [...(prev.messageUnreadTimeRanges ?? []), ['09:00', '18:00']],
          }
        : prev,
    );
  };

  const removeRange = (index: number) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            messageUnreadTimeRanges: (prev.messageUnreadTimeRanges ?? []).filter((_, i) => i !== index),
          }
        : prev,
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        ...form,
        messageUnreadTimeRanges: ranges
          .map(([a, b]) => [String(a ?? '').trim(), String(b ?? '').trim()] as string[])
          .filter(([a, b]) => a.length > 0 && b.length > 0),
        messageUnreadUserMinute: Number(form.messageUnreadUserMinute ?? 30),
        messageUnreadGroupMinute: Number(form.messageUnreadGroupMinute ?? 60),
      },
      {
        onSuccess: () => toast.success(t('email.saved')),
        onError: (err) => toastRequestError(err, t('needAdmin')),
      },
    );
  };

  const onTest = () => {
    const to = testTo.trim();
    if (!to) return;
    check.mutate(to, {
      onSuccess: (res) => toast.success(t('email.checkOk', { to: res.to || to })),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <AdminPageFrame title={t('email.title')} hint={t('email.hint')}>
      <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <TextField
          name="host"
          value={form.smtpHost}
          onChange={(v) => patch('smtpHost', v)}
          className="w-full"
        >
          <Label>{t('email.host')}</Label>
          <Input />
        </TextField>
        <TextField
          name="port"
          value={form.smtpPort}
          onChange={(v) => patch('smtpPort', v)}
          className="w-40"
        >
          <Label>{t('email.port')}</Label>
          <Input />
        </TextField>
        <TextField
          name="user"
          value={form.smtpUsername}
          onChange={(v) => patch('smtpUsername', v)}
          className="w-full"
        >
          <Label>{t('email.username')}</Label>
          <Input />
        </TextField>
        <TextField
          name="pass"
          value={form.smtpPassword}
          onChange={(v) => patch('smtpPassword', v)}
          className="w-full"
        >
          <Label>{t('email.password')}</Label>
          <Input
            type="password"
            placeholder={t('email.passwordHint')}
            autoComplete="new-password"
          />
        </TextField>
        <Checkbox
          isSelected={form.smtpSsl === 'open'}
          onChange={(on) => patch('smtpSsl', on ? 'open' : 'close')}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>{t('email.ssl')}</Label>
          </Checkbox.Content>
        </Checkbox>
        <TextField
          name="alias"
          value={form.fromAlias}
          onChange={(v) => patch('fromAlias', v)}
          className="w-full"
        >
          <Label>{t('email.fromAlias')}</Label>
          <Input />
        </TextField>
        <TextField
          name="from"
          value={form.fromAddress}
          onChange={(v) => patch('fromAddress', v)}
          className="w-full"
        >
          <Label>{t('email.fromAddress')}</Label>
          <Input />
        </TextField>
        <TextField
          name="ignore"
          value={form.ignoreAddr}
          onChange={(v) => patch('ignoreAddr', v)}
          className="w-full"
        >
          <Label>{t('email.ignoreAddr')}</Label>
          <Input />
        </TextField>
        <Checkbox
          isSelected={form.regVerify === 'open'}
          onChange={(on) => patch('regVerify', on ? 'open' : 'close')}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>{t('email.regVerify')}</Label>
          </Checkbox.Content>
        </Checkbox>
        <Checkbox
          isSelected={form.noticeMessage === 'open'}
          onChange={(on) => patch('noticeMessage', on ? 'open' : 'close')}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>{t('email.noticeMessage')}</Label>
          </Checkbox.Content>
        </Checkbox>

        <div className="border-border flex flex-col gap-3 rounded-xl border p-4">
          <div>
            <p className="text-sm font-medium">{t('email.unreadSchedule')}</p>
            <p className="text-muted mt-1 text-xs">{t('email.unreadScheduleHint')}</p>
          </div>
          <div className="flex flex-col gap-2">
            {ranges.map((row, i) => (
              <div key={`range-${i}`} className="flex flex-wrap items-end gap-2">
                <TextField
                  name={`range-start-${i}`}
                  value={row[0] ?? ''}
                  onChange={(v) => patchRange(i, 0, v)}
                  className="w-28"
                >
                  <Label>{t('email.rangeStart')}</Label>
                  <Input placeholder="00:00" />
                </TextField>
                <span className="text-muted pb-2 text-sm">–</span>
                <TextField
                  name={`range-end-${i}`}
                  value={row[1] ?? ''}
                  onChange={(v) => patchRange(i, 1, v)}
                  className="w-28"
                >
                  <Label>{t('email.rangeEnd')}</Label>
                  <Input placeholder="09:00" />
                </TextField>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mb-0.5"
                  onPress={() => removeRange(i)}
                >
                  {t('email.rangeRemove')}
                </Button>
              </div>
            ))}
            {ranges.length === 0 ? (
              <p className="text-muted text-xs">{t('email.rangesEmpty')}</p>
            ) : null}
            <Button size="sm" variant="secondary" className="self-start" onPress={addRange}>
              {t('email.rangeAdd')}
            </Button>
          </div>
          <TextField
            name="userMinute"
            value={String(form.messageUnreadUserMinute ?? 30)}
            onChange={(v) => patch('messageUnreadUserMinute', parseMinute(v, 30))}
            className="w-40"
          >
            <Label>{t('email.userMinute')}</Label>
            <Input type="number" />
          </TextField>
          <TextField
            name="groupMinute"
            value={String(form.messageUnreadGroupMinute ?? 60)}
            onChange={(v) => patch('messageUnreadGroupMinute', parseMinute(v, 60))}
            className="w-40"
          >
            <Label>{t('email.groupMinute')}</Label>
            <Input type="number" />
          </TextField>
          <p className="text-muted text-xs">{t('email.minuteHint')}</p>
        </div>

        <Button type="submit" size="sm" className="self-start" isDisabled={save.isPending}>
          {t('email.save')}
        </Button>
      </Form>

      <div className="border-border mt-2 flex flex-col gap-2 rounded-xl border p-4">
        <p className="text-sm font-medium">{t('email.testTitle')}</p>
        <TextField name="testTo" value={testTo} onChange={setTestTo} className="w-full max-w-md">
          <Label>{t('email.testTo')}</Label>
          <Input type="email" />
        </TextField>
        <Button
          size="sm"
          variant="secondary"
          className="self-start"
          isDisabled={check.isPending}
          onPress={onTest}
        >
          {t('email.testSend')}
        </Button>
      </div>
    </AdminPageFrame>
  );
}
