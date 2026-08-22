import { useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Tabs,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import {
  identityHas,
  useCurrentUser,
  useLicenseConfirm,
  useLicenseLogin,
  useLicenseLogout,
  useLicenseRefresh,
  useLicenseSendEmail,
  useLicenseStatus,
  useLicenseTrial,
  useSaveOfflineLicense,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** 设置 · License（管理员）；在线授权 / 离线粘贴 */
export function LicensePage() {
  const { t } = useTranslation('setting');
  const { data: user } = useCurrentUser();
  const isAdmin = identityHas(user?.identity, 'admin');
  const { data: status, isLoading, isError, refetch } = useLicenseStatus(isAdmin);
  const saveOffline = useSaveOfflineLicense();
  const sendEmail = useLicenseSendEmail();
  const login = useLicenseLogin();
  const confirm = useLicenseConfirm();
  const trial = useLicenseTrial();
  const refresh = useLicenseRefresh();
  const logout = useLicenseLogout();

  const [offlineKey, setOfflineKey] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');

  if (!isAdmin) {
    return (
      <div className="flex max-w-lg flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('nav.license')}</h2>
        <p className="text-muted text-sm">{t('error')}</p>
      </div>
    );
  }

  const onSaveOffline = (event: FormEvent) => {
    event.preventDefault();
    const license = offlineKey.trim();
    if (!license) return;
    saveOffline.mutate(license, {
      onSuccess: () => {
        toast.success(t('license.saved'));
        setOfflineKey('');
      },
      onError: (err) => {
        toastRequestError(err, t('error'));
      },
    });
  };

  const onSendCode = () => {
    if (!email.trim()) return;
    sendEmail.mutate(email.trim(), {
      onSuccess: (data) => {
        if (data.devCode) {
          toast.info(t('license.devCode', { code: data.devCode }));
        } else {
          toast.success(t('license.codeSent'));
        }
      },
      onError: (err) => {
        toastRequestError(err, t('error'));
      },
    });
  };

  const onOnlineLogin = (event: FormEvent) => {
    event.preventDefault();
    login.mutate(
      { email: email.trim(), code: code.trim() },
      {
        onSuccess: (data) => {
          setPendingToken(data.token);
          confirm.mutate(data.token, {
            onSuccess: () => {
              toast.success(t('license.onlineOk'));
              setCode('');
              setPendingToken('');
            },
            onError: (err) => {
              toastRequestError(err, t('error'));
            },
          });
        },
        onError: (err) => {
          toastRequestError(err, t('error'));
        },
      },
    );
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">{t('nav.license')}</h2>
      </div>

      {isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {isError ? (
        <Button size="sm" variant="secondary" className="self-start" onPress={() => void refetch()}>
          {t('error')}
        </Button>
      ) : null}

      {status ? (
        <dl className="border-border divide-border divide-y rounded-lg border text-sm">
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{t('license.people')}</dt>
            <dd>
              {t('license.peopleValue', {
                people: status.info.people,
                used: status.userCount,
              })}
            </dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{t('license.expiredAt')}</dt>
            <dd>{status.info.expiredAt || t('license.forever')}</dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{t('license.sn')}</dt>
            <dd className="truncate">{status.machineSn || status.info.sn || '—'}</dd>
          </div>
          {status.online ? (
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{t('license.email')}</dt>
              <dd>{t('license.onlineAs', { email: status.onlineEmail })}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <Tabs defaultSelectedKey="online" className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('nav.license')}>
            <Tabs.Tab id="online">
              {t('license.tabOnline')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="offline">
              {t('license.tabOffline')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="online" className="flex flex-col gap-4 pt-4">
          <p className="text-muted text-sm">
            {t('license.onlineHint', { mode: status?.onlineMode || '—' })}
          </p>
          <Form className="flex flex-col gap-3" onSubmit={onOnlineLogin}>
            <TextField
              name="email"
              type="email"
              className="w-full"
              value={email}
              onChange={setEmail}
            >
              <Label>{t('license.email')}</Label>
              <Input autoComplete="email" />
            </TextField>
            <div className="flex items-end gap-2">
              <TextField name="code" className="min-w-0 flex-1" value={code} onChange={setCode}>
                <Label>{t('license.code')}</Label>
                <Input autoComplete="one-time-code" />
              </TextField>
              <Button
                type="button"
                variant="secondary"
                isDisabled={!email.trim() || sendEmail.isPending}
                onPress={onSendCode}
              >
                {t('license.sendCode')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="primary"
                isDisabled={login.isPending || confirm.isPending}
              >
                {confirm.isPending || pendingToken ? t('license.confirming') : t('license.submit')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                isDisabled={trial.isPending}
                onPress={() =>
                  trial.mutate(email.trim() || undefined, {
                    onSuccess: () => toast.success(t('license.trialOk')),
                    onError: (err) => toastRequestError(err, t('error')),
                  })
                }
              >
                {t('license.trial')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                isDisabled={refresh.isPending}
                onPress={() =>
                  refresh.mutate(undefined, {
                    onSuccess: () => toast.success(t('license.refreshOk')),
                    onError: (err) => toastRequestError(err, t('error')),
                  })
                }
              >
                {t('license.refresh')}
              </Button>
              <Button
                type="button"
                variant="danger"
                isDisabled={logout.isPending || !status?.online}
                onPress={() =>
                  logout.mutate(undefined, {
                    onSuccess: () => toast.success(t('license.logoutOk')),
                    onError: (err) => toastRequestError(err, t('error')),
                  })
                }
              >
                {t('license.logout')}
              </Button>
            </div>
          </Form>
        </Tabs.Panel>

        <Tabs.Panel id="offline" className="flex flex-col gap-4 pt-4">
          <p className="text-muted text-sm">{t('license.offlineHint')}</p>
          <Form className="flex flex-col gap-3" onSubmit={onSaveOffline}>
            <TextField
              name="license"
              className="w-full"
              value={offlineKey}
              onChange={setOfflineKey}
            >
              <Label>{t('license.key')}</Label>
              <TextArea rows={6} />
              <FieldError />
            </TextField>
            <Button
              type="submit"
              variant="primary"
              className="self-start"
              isDisabled={!offlineKey.trim() || saveOffline.isPending}
            >
              {saveOffline.isPending ? t('saving') : t('license.submit')}
            </Button>
          </Form>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
