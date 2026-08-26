import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Checkbox, Form, Input, Label, TextField, toast } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import {
  identityHas,
  useAttendanceSetting,
  useCurrentUser,
  useSaveAttendanceSetting,
  type AttendanceSetting,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

const MODE_OPTIONS = ['manual', 'auto', 'locat', 'face'] as const;

function Legend({ className, children }: { className?: string; children: ReactNode }) {
  return <legend className={className}>{children}</legend>;
}

/** 管理端：签到规则 */
export function AdminAttendancePage() {
  const { t } = useTranslation('attendance');
  const navigate = useNavigate();
  const userQuery = useCurrentUser();
  const isAdmin = identityHas(userQuery.data?.identity, 'admin');

  const settingQuery = useAttendanceSetting(isAdmin);
  const save = useSaveAttendanceSetting();

  const [open, setOpen] = useState(false);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [modes, setModes] = useState<string[]>(['manual']);
  const [advance, setAdvance] = useState('60');
  const [delay, setDelay] = useState('60');
  const [remindIn, setRemindIn] = useState('5');
  const [remindExceed, setRemindExceed] = useState('10');
  const [edit, setEdit] = useState(true);
  const [faceUpload, setFaceUpload] = useState(true);
  const [reportKey, setReportKey] = useState('');
  const [installCmd, setInstallCmd] = useState('');
  const [mapProvider, setMapProvider] = useState('');
  const [mapKey, setMapKey] = useState('');
  const [lat, setLat] = useState('0');
  const [lng, setLng] = useState('0');
  const [radius, setRadius] = useState('500');

  useEffect(() => {
    const s = settingQuery.data;
    if (!s) return;
    setOpen(s.open === 'open');
    setStart(s.time[0] ?? '09:00');
    setEnd(s.time[1] ?? '18:00');
    setModes(s.modes.length ? s.modes : ['manual']);
    setAdvance(String(s.advance));
    setDelay(String(s.delay));
    setRemindIn(String(s.remindIn));
    setRemindExceed(String(s.remindExceed));
    setEdit(s.edit === 'open');
    setFaceUpload(s.faceUpload === 'open');
    setReportKey(s.reportKey ?? '');
    setInstallCmd(s.installCmd ?? '');
    setMapProvider(s.mapProvider ?? '');
    setMapKey(s.mapKey ?? '');
    setLat(String(s.locationLatitude ?? 0));
    setLng(String(s.locationLongitude ?? 0));
    setRadius(String(s.locationRadius ?? 500));
  }, [settingQuery.data]);

  if (!isAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-muted text-sm">{t('adminOnly')}</p>
        <Button size="sm" variant="secondary" onPress={() => navigate('/manage/attendance')}>
          {t('title')}
        </Button>
      </div>
    );
  }

  const toggleMode = (mode: string, on: boolean) => {
    setModes((prev) => {
      if (on) return prev.includes(mode) ? prev : [...prev, mode];
      return prev.filter((m) => m !== mode);
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const patch: Partial<AttendanceSetting> = {
      open: open ? 'open' : 'close',
      time: [start, end],
      modes,
      advance: Number(advance) || 0,
      delay: Number(delay) || 0,
      remindIn: Number(remindIn) || 0,
      remindExceed: Number(remindExceed) || 0,
      edit: edit ? 'open' : 'close',
      faceUpload: faceUpload ? 'open' : 'close',
      reportKey,
      installCmd,
      mapProvider,
      mapKey,
      locationLatitude: Number(lat) || 0,
      locationLongitude: Number(lng) || 0,
      locationRadius: Number(radius) || 500,
    };
    save.mutate(patch, {
      onSuccess: () => toast.success(t('adminSaved')),
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const showWifi = modes.includes('auto');
  const showLocat = modes.includes('locat');

  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-col gap-4 p-6">
      <header className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={t('title')}
          onPress={() => navigate('/manage/attendance')}
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">{t('adminTitle')}</h1>
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto"
          onPress={() => navigate('/manage/export')}
        >
          {t('adminExport')}
        </Button>
      </header>

      {settingQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {settingQuery.isError ? <p className="text-danger text-sm">{t('error')}</p> : null}

      <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <Checkbox isSelected={open} onChange={setOpen}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>{t('adminOpen')}</Label>
          </Checkbox.Content>
        </Checkbox>

        <div className="flex gap-3">
          <TextField name="start" value={start} onChange={setStart} className="flex-1">
            <Label>{t('adminStart')}</Label>
            <Input />
          </TextField>
          <TextField name="end" value={end} onChange={setEnd} className="flex-1">
            <Label>{t('adminEnd')}</Label>
            <Input />
          </TextField>
        </div>

        <fieldset className="flex flex-col gap-2">
          <Legend className="text-sm font-medium">{t('adminModes')}</Legend>
          {MODE_OPTIONS.map((mode) => (
            <Checkbox
              key={mode}
              isSelected={modes.includes(mode)}
              onChange={(on) => toggleMode(mode, on)}
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Label>{t(`modes.${mode}`)}</Label>
              </Checkbox.Content>
            </Checkbox>
          ))}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <TextField name="advance" value={advance} onChange={setAdvance}>
            <Label>{t('adminAdvance')}</Label>
            <Input type="number" />
          </TextField>
          <TextField name="delay" value={delay} onChange={setDelay}>
            <Label>{t('adminDelay')}</Label>
            <Input type="number" />
          </TextField>
          <TextField name="remindIn" value={remindIn} onChange={setRemindIn}>
            <Label>{t('adminRemindIn')}</Label>
            <Input type="number" />
          </TextField>
          <TextField name="remindExceed" value={remindExceed} onChange={setRemindExceed}>
            <Label>{t('adminRemindExceed')}</Label>
            <Input type="number" />
          </TextField>
        </div>

        <fieldset className="flex flex-col gap-2">
          <Legend className="text-sm font-medium">{t('adminPermissions')}</Legend>
          <Checkbox isSelected={edit} onChange={setEdit}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label>{t('adminEdit')}</Label>
            </Checkbox.Content>
          </Checkbox>
          <Checkbox isSelected={faceUpload} onChange={setFaceUpload}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label>{t('adminFaceUpload')}</Label>
            </Checkbox.Content>
          </Checkbox>
        </fieldset>

        {showWifi ? (
          <fieldset className="border-border flex flex-col gap-3 rounded-lg border p-3">
            <Legend className="px-1 text-sm font-medium">{t('adminWifi')}</Legend>
            <TextField name="reportKey" value={reportKey} onChange={setReportKey}>
              <Label>{t('adminReportKey')}</Label>
              <Input autoComplete="off" />
            </TextField>
            <TextField name="installCmd" value={installCmd} onChange={setInstallCmd}>
              <Label>{t('adminInstallCmd')}</Label>
              <Input autoComplete="off" />
            </TextField>
            {installCmd ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  className="self-start"
                  onPress={async () => {
                    try {
                      await navigator.clipboard.writeText(installCmd);
                      toast.success(t('adminCopied'));
                    } catch {
                      toast.danger(t('error'));
                    }
                  }}
                >
                  {t('adminCopyCmd')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  className="self-start"
                  onPress={() =>
                    window.open('/attendance/install', '_blank', 'noopener,noreferrer')
                  }
                >
                  {t('adminOpenInstall')}
                </Button>
              </div>
            ) : null}
          </fieldset>
        ) : null}

        {showLocat ? (
          <fieldset className="border-border flex flex-col gap-3 rounded-lg border p-3">
            <Legend className="px-1 text-sm font-medium">{t('adminLocation')}</Legend>
            <TextField name="mapProvider" value={mapProvider} onChange={setMapProvider}>
              <Label>{t('adminMapProvider')}</Label>
              <Input placeholder="amap / google" autoComplete="off" />
            </TextField>
            <TextField name="mapKey" value={mapKey} onChange={setMapKey}>
              <Label>{t('adminMapKey')}</Label>
              <Input type="password" autoComplete="off" />
            </TextField>
            <div className="grid grid-cols-2 gap-3">
              <TextField name="lat" value={lat} onChange={setLat}>
                <Label>{t('adminLat')}</Label>
                <Input type="number" step="any" />
              </TextField>
              <TextField name="lng" value={lng} onChange={setLng}>
                <Label>{t('adminLng')}</Label>
                <Input type="number" step="any" />
              </TextField>
            </div>
            <TextField name="radius" value={radius} onChange={setRadius}>
              <Label>{t('adminRadius')}</Label>
              <Input type="number" />
            </TextField>
          </fieldset>
        ) : null}

        <Button type="submit" isDisabled={save.isPending}>
          {save.isPending ? t('adminSaving') : t('adminSave')}
        </Button>
      </Form>
    </div>
  );
}
