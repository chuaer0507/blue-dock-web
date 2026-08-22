import { useState } from 'react';
import { Description, Input, Label, Switch, TextField, toast } from '@heroui/react';
import { useTranslation } from '@blue-dock/i18n';
import { DESKTOP_NOTIFY_PREF } from '../desktop/DesktopEffects';
import { usePlatform } from '../../utils/platform';
import {
  PUSH_PREF_KEY,
  readPushPref,
  syncMobilePushAlias,
} from '../../utils/app-push-alias';
import {
  isValidHHmm,
  readQuietHoursPref,
  writeQuietHoursPref,
  type QuietHoursPref,
} from '../../utils/quiet-hours';
import { toastRequestError } from '../../utils/toast-request-error';

function readDesktopNotify(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(DESKTOP_NOTIFY_PREF) !== '0';
}

/** 设置 · 通知：移动推送 alias；桌面系统通知；移动时段静音 */
export function NotificationsPage() {
  const { t } = useTranslation('setting');
  const platform = usePlatform();
  const [enabled, setEnabled] = useState(readPushPref);
  const [desktopNotify, setDesktopNotify] = useState(readDesktopNotify);
  const [quiet, setQuiet] = useState<QuietHoursPref>(readQuietHoursPref);
  const [pending, setPending] = useState(false);

  const persistQuiet = (next: QuietHoursPref) => {
    setQuiet(next);
    writeQuietHoursPref(next);
    if (platform !== 'mobile') {
      toast.success(t('saved'));
      return;
    }
    setPending(true);
    void syncMobilePushAlias(readPushPref())
      .then(() => toast.success(t('saved')))
      .catch((err) => toastRequestError(err, t('error')))
      .finally(() => setPending(false));
  };

  const onToggle = (next: boolean) => {
    setEnabled(next);
    localStorage.setItem(PUSH_PREF_KEY, next ? '1' : '0');
    if (platform !== 'mobile') {
      toast.success(t('saved'));
      return;
    }
    setPending(true);
    void syncMobilePushAlias(next)
      .then(() => toast.success(t('saved')))
      .catch((err) => toastRequestError(err, t('error')))
      .finally(() => setPending(false));
  };

  const onDesktopNotify = (next: boolean) => {
    setDesktopNotify(next);
    localStorage.setItem(DESKTOP_NOTIFY_PREF, next ? '1' : '0');
    toast.success(t('saved'));
  };

  const onQuietToggle = (next: boolean) => {
    persistQuiet({ ...quiet, enabled: next });
  };

  const onQuietTime = (key: 'start' | 'end', raw: string) => {
    const value = raw.trim();
    setQuiet((prev) => ({ ...prev, [key]: value }));
    if (!isValidHHmm(value)) return;
    const next = { ...quiet, [key]: value };
    writeQuietHoursPref(next);
    setQuiet(next);
    if (platform === 'mobile' && quiet.enabled) {
      setPending(true);
      void syncMobilePushAlias(readPushPref())
        .then(() => toast.success(t('saved')))
        .catch((err) => toastRequestError(err, t('error')))
        .finally(() => setPending(false));
    } else {
      toast.success(t('saved'));
    }
  };

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">{t('nav.notifications')}</h2>
        <p className="text-muted mt-2 text-sm">{t('notifications.hint')}</p>
      </div>

      <Switch isSelected={enabled} onChange={onToggle} isDisabled={pending}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <div className="flex flex-col gap-0.5">
            <Label>{t('notifications.push')}</Label>
            <Description>
              {platform === 'mobile'
                ? t('notificationsLocal.mobileHint')
                : t('notificationsLocal.browserHint')}
            </Description>
          </div>
        </Switch.Content>
      </Switch>

      {platform === 'desktop' ? (
        <Switch isSelected={desktopNotify} onChange={onDesktopNotify}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <div className="flex flex-col gap-0.5">
              <Label>{t('notifications.desktop')}</Label>
              <Description>{t('notificationsLocal.desktopHint')}</Description>
            </div>
          </Switch.Content>
        </Switch>
      ) : null}

      {platform === 'mobile' ? (
        <div className="border-border flex flex-col gap-3 rounded-xl border p-3">
          <Switch isSelected={quiet.enabled} onChange={onQuietToggle} isDisabled={pending}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <div className="flex flex-col gap-0.5">
                <Label>{t('notifications.quietHours')}</Label>
                <Description>{t('notificationsLocal.quietHint')}</Description>
              </div>
            </Switch.Content>
          </Switch>
          <div className="flex flex-wrap gap-3">
            <TextField
              name="quietStart"
              value={quiet.start}
              onChange={(v) => onQuietTime('start', v)}
              isDisabled={!quiet.enabled || pending}
              className="w-28"
            >
              <Label>{t('notifications.quietStart')}</Label>
              <Input placeholder="22:00" />
            </TextField>
            <TextField
              name="quietEnd"
              value={quiet.end}
              onChange={(v) => onQuietTime('end', v)}
              isDisabled={!quiet.enabled || pending}
              className="w-28"
            >
              <Label>{t('notifications.quietEnd')}</Label>
              <Input placeholder="08:00" />
            </TextField>
          </div>
          {!isValidHHmm(quiet.start) || !isValidHHmm(quiet.end) ? (
            <p className="text-danger text-xs">{t('notifications.quietInvalid')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
