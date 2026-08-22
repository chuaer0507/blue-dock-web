import { useEffect, useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Form, Input, Label, Radio, RadioGroup, TextField, toast } from '@heroui/react';
import {
  identityHas,
  useCurrentUser,
  useExportApprove,
  useExportAttendance,
  useExportOverdueTasks,
  useExportTaskStats,
  useUserSearch,
  type TaskExportTimeType,
  type UserSearchHit,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function monthRange(which: 'this' | 'last'): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + (which === 'this' ? 0 : -1);
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return { start: toYmd(start), end: toYmd(end) };
}

function MemberPicker({
  selected,
  onChange,
}: {
  selected: UserSearchHit[];
  onChange: (next: UserSearchHit[]) => void;
}) {
  const { t } = useTranslation('export');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  const search = useUserSearch(debounced, 20, debounced.length > 0);
  const hits = search.data?.list ?? [];

  return (
    <div className="flex flex-col gap-2">
      <Label>{t('members.label')}</Label>
      <p className="text-muted text-xs">{t('members.hint')}</p>
      <TextField
        name="memberSearch"
        value={q}
        onChange={setQ}
        className="w-full"
        aria-label={t('members.search')}
      >
        <Input placeholder={t('members.search')} />
      </TextField>
      {hits.length > 0 ? (
        <ul className="border-border max-h-40 overflow-auto rounded-lg border">
          {hits.map((hit: UserSearchHit) => {
            const picked = selected.some((s) => s.userId === hit.userId);
            return (
              <li key={hit.userId}>
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-none px-3 py-2 text-left text-sm font-normal"
                  isDisabled={picked || selected.length >= 100}
                  onPress={() => onChange([...selected, hit])}
                >
                  {hit.nickname || hit.email}
                  <span className="text-muted ms-2 text-xs">#{hit.userId}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {selected.length === 0 ? (
        <p className="text-muted text-xs">{t('members.empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {selected.map((m) => (
            <li key={m.userId}>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => onChange(selected.filter((s) => s.userId !== m.userId))}
              >
                {m.nickname || m.email} ×
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 导出管理（管理员） */
export function ExportPage() {
  const { t } = useTranslation('export');
  const userQuery = useCurrentUser();
  const isAdmin = identityHas(userQuery.data?.identity, 'admin');

  const exportStats = useExportTaskStats();
  const exportOverdue = useExportOverdueTasks();
  const exportAttendance = useExportAttendance();
  const exportApprove = useExportApprove();

  const [members, setMembers] = useState<UserSearchHit[]>([]);
  const [start, setStart] = useState(() => monthRange('this').start);
  const [end, setEnd] = useState(() => monthRange('this').end);
  const [timeType, setTimeType] = useState<TaskExportTimeType>('taskTime');
  const [shift, setShift] = useState('09:00,18:00');
  const [processName, setProcessName] = useState('');
  const [approveStatus, setApproveStatus] = useState('');

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted text-sm">{t('needAdmin')}</p>
      </div>
    );
  }

  const userIds = members.map((m) => m.userId).join(',');
  const range = `${start},${end}`;

  const fail = (err: unknown) => toastRequestError(err, t('error.generic'));

  const onTaskStats = (e: FormEvent) => {
    e.preventDefault();
    if (!userIds) {
      toast.danger(t('error.needMembers'));
      return;
    }
    if (!start || !end) {
      toast.danger(t('error.needRange'));
      return;
    }
    exportStats.mutate(
      { userIds, time: range, type: timeType },
      { onSuccess: () => toast.success(t('success')), onError: fail },
    );
  };

  const onOverdue = () => {
    if (!window.confirm(t('overdue.confirm'))) return;
    exportOverdue.mutate(undefined, {
      onSuccess: () => toast.success(t('success')),
      onError: fail,
    });
  };

  const onAttendance = (e: FormEvent) => {
    e.preventDefault();
    if (!userIds) {
      toast.danger(t('error.needMembers'));
      return;
    }
    if (!start || !end) {
      toast.danger(t('error.needRange'));
      return;
    }
    if (!shift.includes(',')) {
      toast.danger(t('error.needShift'));
      return;
    }
    exportAttendance.mutate(
      { userIds, date: range, time: shift },
      { onSuccess: () => toast.success(t('success')), onError: fail },
    );
  };

  const onApprove = (e: FormEvent) => {
    e.preventDefault();
    if (!processName.trim()) {
      toast.danger(t('error.needProcess'));
      return;
    }
    if (!start || !end) {
      toast.danger(t('error.needRange'));
      return;
    }
    exportApprove.mutate(
      {
        processName: processName.trim(),
        date: range,
        ...(approveStatus.trim() ? { status: approveStatus.trim() } : {}),
      },
      { onSuccess: () => toast.success(t('success')), onError: fail },
    );
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted mt-1 text-sm">{t('hint')}</p>
      </header>

      <MemberPicker selected={members} onChange={setMembers} />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            const r = monthRange('this');
            setStart(r.start);
            setEnd(r.end);
          }}
        >
          {t('time.thisMonth')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            const r = monthRange('last');
            setStart(r.start);
            setEnd(r.end);
          }}
        >
          {t('time.lastMonth')}
        </Button>
      </div>
      <div className="flex gap-3">
        <TextField name="start" value={start} onChange={setStart} className="flex-1">
          <Label>{t('time.start')}</Label>
          <Input type="date" />
        </TextField>
        <TextField name="end" value={end} onChange={setEnd} className="flex-1">
          <Label>{t('time.end')}</Label>
          <Input type="date" />
        </TextField>
      </div>

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">{t('cards.taskStats')}</h2>
        <p className="text-muted mt-1 text-xs">{t('cards.taskStatsDesc')}</p>
        <Form className="mt-3 flex flex-col gap-3" onSubmit={onTaskStats}>
          <RadioGroup
            name="timeType"
            orientation="horizontal"
            value={timeType}
            onChange={(v) => setTimeType(v as TaskExportTimeType)}
          >
            <Label>{t('timeType.label')}</Label>
            <Radio value="taskTime">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t('timeType.taskTime')}
              </Radio.Content>
            </Radio>
            <Radio value="createdTime">
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t('timeType.createdTime')}
              </Radio.Content>
            </Radio>
          </RadioGroup>
          <Button type="submit" size="sm" className="self-start" isDisabled={exportStats.isPending}>
            {t('actions.export')}
          </Button>
        </Form>
      </section>

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">{t('cards.overdue')}</h2>
        <p className="text-muted mt-1 text-xs">{t('cards.overdueDesc')}</p>
        <Button
          size="sm"
          className="mt-3"
          variant="secondary"
          isDisabled={exportOverdue.isPending}
          onPress={onOverdue}
        >
          {t('actions.export')}
        </Button>
      </section>

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">{t('cards.attendance')}</h2>
        <p className="text-muted mt-1 text-xs">{t('cards.attendanceDesc')}</p>
        <Form className="mt-3 flex flex-col gap-3" onSubmit={onAttendance}>
          <TextField name="shift" value={shift} onChange={setShift} className="w-full">
            <Label>{t('attendance.shiftLabel')}</Label>
            <Input placeholder={t('attendance.shiftHint')} />
          </TextField>
          <Button
            type="submit"
            size="sm"
            className="self-start"
            isDisabled={exportAttendance.isPending}
          >
            {t('actions.export')}
          </Button>
        </Form>
      </section>

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">{t('cards.approve')}</h2>
        <p className="text-muted mt-1 text-xs">{t('cards.approveDesc')}</p>
        <Form className="mt-3 flex flex-col gap-3" onSubmit={onApprove}>
          <TextField
            name="process"
            value={processName}
            onChange={setProcessName}
            className="w-full"
            isRequired
          >
            <Label>{t('approve.processName')}</Label>
            <Input placeholder={t('approve.processPlaceholder')} />
          </TextField>
          <TextField
            name="status"
            value={approveStatus}
            onChange={setApproveStatus}
            className="w-full"
          >
            <Label>{t('approve.status')}</Label>
            <Input placeholder={t('approve.statusPlaceholder')} />
          </TextField>
          <Button
            type="submit"
            size="sm"
            className="self-start"
            isDisabled={exportApprove.isPending}
          >
            {t('actions.export')}
          </Button>
        </Form>
      </section>
    </div>
  );
}
