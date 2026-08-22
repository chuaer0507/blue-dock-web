import { useEffect, useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Checkbox, Form, Input, Label, TextField, toast } from '@heroui/react';
import { useLdapSetting, useSaveLdapSetting, useTestLdap, type LdapSetting } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';

/** LDAP 目录登录 */
export function LdapAdminPage() {
  const { t } = useTranslation('admin');
  const query = useLdapSetting();
  const save = useSaveLdapSetting();
  const test = useTestLdap();
  const [form, setForm] = useState<LdapSetting | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  if (!form) {
    return (
      <AdminPageFrame title={t('ldap.title')}>
        <p className="text-muted text-sm">…</p>
      </AdminPageFrame>
    );
  }

  const patch = <K extends keyof LdapSetting>(key: K, value: LdapSetting[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, {
      onSuccess: () => toast.success(t('ldap.saved')),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  const onTest = () => {
    test.mutate(undefined, {
      onSuccess: (res) => toast.success(t('ldap.testOk', { url: res.url || '' })),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <AdminPageFrame title={t('ldap.title')} hint={t('ldap.hint')}>
      <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <Checkbox
          isSelected={form.ldapOpen === 'open'}
          onChange={(on) => patch('ldapOpen', on ? 'open' : 'close')}
        >
          {t('ldap.open')}
        </Checkbox>
        <TextField
          name="host"
          value={form.ldapHost}
          onChange={(v) => patch('ldapHost', v)}
          className="w-full"
        >
          <Label>{t('ldap.host')}</Label>
          <Input />
        </TextField>
        <TextField
          name="port"
          value={form.ldapPort}
          onChange={(v) => patch('ldapPort', v)}
          className="w-32"
        >
          <Label>{t('ldap.port')}</Label>
          <Input />
        </TextField>
        <TextField
          name="userDn"
          value={form.ldapUserDn}
          onChange={(v) => patch('ldapUserDn', v)}
          className="w-full"
        >
          <Label>{t('ldap.userDn')}</Label>
          <Input />
        </TextField>
        <TextField
          name="password"
          value={form.ldapPassword}
          onChange={(v) => patch('ldapPassword', v)}
          className="w-full"
        >
          <Label>{t('ldap.password')}</Label>
          <Input type="password" autoComplete="new-password" />
        </TextField>
        <TextField
          name="baseDn"
          value={form.ldapBaseDn}
          onChange={(v) => patch('ldapBaseDn', v)}
          className="w-full"
        >
          <Label>{t('ldap.baseDn')}</Label>
          <Input />
        </TextField>
        <TextField
          name="loginAttr"
          value={form.ldapLoginAttr}
          onChange={(v) => patch('ldapLoginAttr', v)}
          className="w-40"
        >
          <Label>{t('ldap.loginAttr')}</Label>
          <Input />
        </TextField>
        <Checkbox
          isSelected={form.ldapSyncLocal === 'open'}
          onChange={(on) => patch('ldapSyncLocal', on ? 'open' : 'close')}
        >
          {t('ldap.syncLocal')}
        </Checkbox>
        <div className="flex gap-2">
          <Button type="submit" size="sm" isDisabled={save.isPending}>
            {t('ldap.save')}
          </Button>
          <Button size="sm" variant="secondary" isDisabled={test.isPending} onPress={onTest}>
            {t('ldap.test')}
          </Button>
        </div>
      </Form>
    </AdminPageFrame>
  );
}
