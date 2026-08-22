import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Form, Input, Label, TextField, toast } from '@heroui/react';
import { useAttendanceView, useSaveAttendanceProfile, useSystemImageUpload } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';

/** 设置 · 个人签到：状态 / MAC / 人脸登记 */
export function AttendanceSettingPage() {
  const { t } = useTranslation(['setting', 'attendance']);
  const { data, isLoading, isError } = useAttendanceView();
  const save = useSaveAttendanceProfile();
  const imageUpload = useSystemImageUpload();
  const [macText, setMacText] = useState('');
  const faceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data?.macAddresses) {
      setMacText(data.macAddresses.join(', '));
    }
  }, [data?.macAddresses]);

  const onSaveMac = (event: FormEvent) => {
    event.preventDefault();
    if (data?.edit === 'close') {
      toast.danger(t('setting:attendance.editClosed'));
      return;
    }
    const macAddresses = macText
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    save.mutate(
      { macAddresses },
      {
        onSuccess: () => toast.success(t('setting:saved')),
        onError: (err) => {
          toastRequestError(err, t('setting:error'));
        },
      },
    );
  };

  const onPickFace = (files: FileList | null) => {
    const file = files?.[0];
    if (faceInputRef.current) faceInputRef.current.value = '';
    if (!file || !data) return;
    if (!data.facePlugin) {
      toast.danger(t('setting:attendance.facePluginMissing'));
      return;
    }
    if (data.faceUpload === 'close') {
      toast.danger(t('setting:attendance.faceUploadClosed'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.danger(t('setting:attendance.faceTypeInvalid'));
      return;
    }
    imageUpload.mutate(file, {
      onSuccess: (uploaded) => {
        const id = Number(uploaded.id);
        if (!(id > 0)) {
          toast.danger(t('setting:error'));
          return;
        }
        save.mutate(
          { faceUploadObjectId: String(id) },
          {
            onSuccess: () => toast.success(t('setting:attendance.faceSaved')),
            onError: (err) => toastRequestError(err, t('setting:error')),
          },
        );
      },
      onError: (err) => toastRequestError(err, t('setting:error')),
    });
  };

  if (isLoading) {
    return <p className="text-muted text-sm">{t('setting:loading')}</p>;
  }
  if (isError || !data) {
    return <p className="text-danger text-sm">{t('setting:error')}</p>;
  }

  const closed = data.open !== 'open';
  const modes = data.modes ?? [];
  const canEditMac = data.edit !== 'close';
  const canUploadFace = Boolean(data.facePlugin) && data.faceUpload === 'open';
  const faceBusy = imageUpload.isPending || save.isPending;

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">{t('setting:nav.attendance')}</h2>
        <p className="text-muted mt-2 text-sm">{t('setting:attendance.hint')}</p>
      </div>

      {closed ? (
        <p className="text-muted text-sm">{t('setting:attendance.closed')}</p>
      ) : (
        <>
          <dl className="border-border divide-border divide-y rounded-lg border text-sm">
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{t('setting:attendance.status')}</dt>
              <dd className="font-medium">{t('setting:attendance.open')}</dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{t('setting:attendance.modes')}</dt>
              <dd className="font-medium">
                {modes
                  .map((m: string) => t(`attendance:modes.${m}`, { defaultValue: m }))
                  .join(' · ') || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{t('setting:attendance.workTime')}</dt>
              <dd className="font-medium">
                {(data.time ?? []).length >= 2
                  ? t('attendance:workTime', { start: data.time[0], end: data.time[1] })
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{t('setting:attendance.face')}</dt>
              <dd className="font-medium">
                {data.hasFace ? t('setting:attendance.faceYes') : t('setting:attendance.faceNo')}
              </dd>
            </div>
          </dl>

          <section className="border-border flex flex-col gap-3 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">{t('setting:attendance.faceUploadTitle')}</h3>
            {!data.facePlugin ? (
              <p className="text-muted text-sm">{t('setting:attendance.facePluginMissing')}</p>
            ) : data.faceUpload === 'close' ? (
              <p className="text-muted text-sm">{t('setting:attendance.faceUploadClosed')}</p>
            ) : (
              <p className="text-muted text-sm">{t('setting:attendance.faceUploadHint')}</p>
            )}
            <input
              ref={faceInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickFace(e.target.files)}
            />
            <Button
              size="sm"
              className="self-start"
              isDisabled={!canUploadFace || faceBusy}
              onPress={() => faceInputRef.current?.click()}
            >
              {faceBusy
                ? t('setting:attendance.faceUploading')
                : data.hasFace
                  ? t('setting:attendance.faceReplace')
                  : t('setting:attendance.faceUpload')}
            </Button>
          </section>

          <Form className="flex flex-col gap-3" onSubmit={onSaveMac}>
            <TextField
              name="mac"
              className="w-full"
              value={macText}
              onChange={setMacText}
              isDisabled={!canEditMac}
            >
              <Label>{t('setting:attendance.mac')}</Label>
              <Input placeholder={t('setting:attendance.macPlaceholder')} />
            </TextField>
            <p className="text-muted text-sm">
              {canEditMac ? t('setting:attendance.macHint') : t('setting:attendance.editClosed')}
            </p>
            {canEditMac ? (
              <Button
                type="submit"
                variant="primary"
                className="self-start"
                isDisabled={save.isPending}
              >
                {save.isPending ? t('setting:saving') : t('setting:attendance.saveMac')}
              </Button>
            ) : null}
          </Form>
        </>
      )}
    </div>
  );
}
