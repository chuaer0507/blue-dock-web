import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, toast } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import { ChevronLeftIcon, ChevronRightIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import {
  identityHas,
  parseAttendanceTimes,
  useAttendanceMonth,
  useAttendancePunch,
  useAttendanceView,
  useCurrentUser,
  useSystemImageUpload,
  type AttendancePunch,
  type AttendanceRecord,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { monthGrid, pad2, toYmd } from '../calendar/date-utils';
import { cn } from '../../utils/cn';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function yearMonthOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function shiftMonth(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function formatPunchTime(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function PunchList({
  punches,
  t,
}: {
  punches: AttendancePunch[];
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (punches.length === 0) {
    return <p className="text-muted text-sm">{t('noPunchToday')}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {punches.map((p, i) => (
        <li
          key={`${p.at}-${i}`}
          className="border-border bg-default/40 flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
        >
          <span>
            {p.section === 'out' ? t('section.out') : t('section.in')}
            <span className="text-muted ms-2 text-xs">{t(`modes.${p.mode}`)}</span>
          </span>
          <span className="tabular-nums">{formatPunchTime(p.at)}</span>
        </li>
      ))}
    </ul>
  );
}

function readGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
    });
  });
}

/** 签到打卡：今日打卡（手动 / 定位 / 刷脸）+ 月度日历 */
export function AttendancePage() {
  const { t } = useTranslation('attendance');
  const { t: tc } = useTranslation('calendar');
  const navigate = useNavigate();
  const userQuery = useCurrentUser();
  const isAdmin = identityHas(userQuery.data?.identity, 'admin');
  const faceInputRef = useRef<HTMLInputElement>(null);

  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedYmd, setSelectedYmd] = useState(() => toYmd(new Date()));
  const [locating, setLocating] = useState(false);
  const ym = yearMonthOf(anchor);

  const viewQuery = useAttendanceView();
  const monthQuery = useAttendanceMonth(ym);
  const punch = useAttendancePunch();
  const imageUpload = useSystemImageUpload();

  const view = viewQuery.data;
  const closed = view?.open === 'close';
  const modes = view?.modes ?? [];
  const manualOk = modes.includes('manual');
  const locatOk = modes.includes('locat');
  const faceOk = modes.includes('face') && Boolean(view?.facePlugin) && Boolean(view?.hasFace);
  const busy = punch.isPending || imageUpload.isPending || locating;

  const byDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const row of monthQuery.data?.list ?? []) {
      map.set(row.attendanceDate, row);
    }
    return map;
  }, [monthQuery.data?.list]);

  const cells = useMemo(() => monthGrid(anchor), [anchor]);
  const todayPunches = parseAttendanceTimes(view?.today?.times ?? []);
  const selectedRecord = byDate.get(selectedYmd);
  const selectedPunches = selectedRecord ? parseAttendanceTimes(selectedRecord.times) : [];
  const selectedIsToday = selectedYmd === toYmd(new Date());

  const onPunchResult = {
    onSuccess: () => toast.success(t('punchOk')),
    onError: (err: unknown) => toastRequestError(err, t('error')),
  };

  const onPunchManual = () => {
    if (closed) {
      toast.danger(t('closed'));
      return;
    }
    if (!manualOk) {
      toast.danger(t('manualDisabled'));
      return;
    }
    punch.mutate({ kind: 'manual' }, onPunchResult);
  };

  const onPunchLocation = async () => {
    if (closed) {
      toast.danger(t('closed'));
      return;
    }
    if (!locatOk) {
      toast.danger(t('locatDisabled'));
      return;
    }
    setLocating(true);
    try {
      const pos = await readGeolocation();
      punch.mutate(
        {
          kind: 'location',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
        onPunchResult,
      );
    } catch {
      toast.danger(t('locatDenied'));
    } finally {
      setLocating(false);
    }
  };

  const onPickFace = (files: FileList | null) => {
    const file = files?.[0];
    if (faceInputRef.current) faceInputRef.current.value = '';
    if (!file) return;
    if (closed) {
      toast.danger(t('closed'));
      return;
    }
    if (!modes.includes('face')) {
      toast.danger(t('faceDisabled'));
      return;
    }
    if (!view?.facePlugin) {
      toast.danger(t('facePluginMissing'));
      return;
    }
    if (!view?.hasFace) {
      toast.danger(t('faceNeedEnroll'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.danger(t('faceTypeInvalid'));
      return;
    }
    imageUpload.mutate(file, {
      onSuccess: (uploaded) => {
        const id = Number(uploaded.id);
        if (!(id > 0)) {
          toast.danger(t('error'));
          return;
        }
        punch.mutate({ kind: 'face', faceCaptureObjectId: id }, onPunchResult);
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onRefresh = () => {
    void viewQuery.refetch();
    void monthQuery.refetch();
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          {view?.time?.[0] && view.time[1] ? (
            <p className="text-muted mt-1 text-sm">
              {t('workTime', { start: view.time[0], end: view.time[1] })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onPress={onRefresh}>
            {t('refresh')}
          </Button>
          <Button size="sm" variant="ghost" onPress={() => navigate('/manage/setting/attendance')}>
            <Cog6ToothIcon className="size-4" aria-hidden />
            {t('settings')}
          </Button>
          {isAdmin ? (
            <Button size="sm" variant="ghost" onPress={() => navigate('/manage/admin/attendance')}>
              {t('adminRules')}
            </Button>
          ) : null}
        </div>
      </header>

      {viewQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {viewQuery.isError ? (
        <div className="flex items-center gap-3">
          <p className="text-danger text-sm">{t('error')}</p>
          <Button size="sm" variant="secondary" onPress={() => void viewQuery.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : null}

      {closed ? (
        <p className="text-muted text-sm">{t('closed')}</p>
      ) : (
        <section className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">{t('today')}</h2>
            <div className="mt-3">
              <PunchList punches={todayPunches} t={t} />
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <input
              ref={faceInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => onPickFace(e.target.files)}
            />
            {manualOk ? (
              <Button isDisabled={busy} onPress={onPunchManual}>
                {punch.isPending ? t('punching') : t('punch')}
              </Button>
            ) : null}
            {locatOk ? (
              <Button variant="secondary" isDisabled={busy} onPress={() => void onPunchLocation()}>
                {locating ? t('locatPunching') : t('locatPunch')}
              </Button>
            ) : null}
            {modes.includes('face') ? (
              <Button
                variant="secondary"
                isDisabled={busy || (!faceOk && Boolean(view?.hasFace))}
                onPress={() => {
                  if (!view?.facePlugin) {
                    toast.danger(t('facePluginMissing'));
                    return;
                  }
                  if (!view?.hasFace) {
                    toast.danger(t('faceNeedEnroll'));
                    navigate('/manage/setting/attendance');
                    return;
                  }
                  faceInputRef.current?.click();
                }}
              >
                {imageUpload.isPending ? t('facePunching') : t('facePunch')}
              </Button>
            ) : null}
            {!manualOk && !locatOk && !modes.includes('face') ? (
              <p className="text-muted text-xs">{t('noPunchModes')}</p>
            ) : null}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t('month')}</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              isIconOnly
              aria-label={t('prevMonth')}
              onPress={() => setAnchor((d) => shiftMonth(d, -1))}
            >
              <ChevronLeftIcon className="size-4" aria-hidden />
            </Button>
            <span className="text-sm tabular-nums">{ym}</span>
            <Button
              size="sm"
              variant="secondary"
              isIconOnly
              aria-label={t('nextMonth')}
              onPress={() => setAnchor((d) => shiftMonth(d, 1))}
            >
              <ChevronRightIcon className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {monthQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
        {monthQuery.isError ? <p className="text-danger text-sm">{t('error')}</p> : null}

        <div className="border-border bg-surface overflow-hidden rounded-xl border">
          <div className="border-border grid grid-cols-7 border-b">
            {WEEKDAY_KEYS.map((key) => (
              <div key={key} className="text-muted px-1 py-2 text-center text-xs font-medium">
                {tc(`weekday.${key}`)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day) => {
              const ymd = toYmd(day);
              const inMonth = day.getMonth() === anchor.getMonth();
              const rec = byDate.get(ymd);
              const punches = rec ? parseAttendanceTimes(rec.times) : [];
              const isToday = ymd === toYmd(new Date());
              const selected = ymd === selectedYmd;
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => setSelectedYmd(ymd)}
                  className={cn(
                    'border-border hover:bg-default/60 min-h-16 border-e border-t p-1.5 text-left transition-colors',
                    !inMonth && 'bg-default/40 text-muted',
                    isToday && 'bg-accent/5',
                    selected && 'ring-accent ring-2 ring-inset',
                  )}
                >
                  <span
                    className={cn(
                      'mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs',
                      isToday && 'bg-accent text-accent-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {punches.length > 0 ? (
                    <p className="text-accent text-[10px] leading-tight">
                      {punches.length}
                      {punches[0] ? ` · ${formatPunchTime(punches[0].at)}` : ''}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-border bg-surface rounded-xl border p-4">
          <h3 className="text-sm font-semibold">
            {selectedIsToday ? t('today') : t('dayDetail', { date: selectedYmd })}
          </h3>
          <div className="mt-3">
            <PunchList punches={selectedIsToday ? todayPunches : selectedPunches} t={t} />
          </div>
        </div>

        {!monthQuery.isLoading &&
        !monthQuery.isError &&
        (monthQuery.data?.list?.length ?? 0) === 0 ? (
          <p className="text-muted text-sm">{t('emptyMonth')}</p>
        ) : null}
      </section>
    </div>
  );
}
