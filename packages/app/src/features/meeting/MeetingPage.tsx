import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, Checkbox, Form, Input, Label, TextField, toast } from '@heroui/react';
import {
  getAccessToken,
  useInviteMeeting,
  useMeetingLink,
  useOpenMeeting,
  type MeetingOpenView,
  type UserSearchHit,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';
import { UserMultiPicker, userIdsCsv } from '../common/UserMultiPicker';
import { MeetingRtcPanel } from './MeetingRtcPanel';

/** 在线会议：大厅创建/加入 + 房间（RTC + 搜索选人邀请） */
export function MeetingPage() {
  const { t } = useTranslation('meeting');
  const navigate = useNavigate();
  const { meetingId: routeMeetingId, sharekey } = useParams();
  const loggedIn = Boolean(getAccessToken());

  const openMut = useOpenMeeting();
  const linkMut = useMeetingLink();
  const inviteMut = useInviteMeeting();

  const [session, setSession] = useState<MeetingOpenView | null>(null);
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(false);

  const [createName, setCreateName] = useState('');
  const [createPicked, setCreatePicked] = useState<UserSearchHit[]>([]);
  const [joinId, setJoinId] = useState(routeMeetingId ?? '');
  const [guestName, setGuestName] = useState('');
  const [invitePicked, setInvitePicked] = useState<UserSearchHit[]>([]);

  useEffect(() => {
    if (routeMeetingId) setJoinId(routeMeetingId);
  }, [routeMeetingId]);

  const enterSession = (view: MeetingOpenView) => {
    if (view.endAt) {
      toast.danger(t('error.ended'));
      return;
    }
    setSession(view);
    setCreatePicked([]);
    setInvitePicked([]);
    navigate(`/meeting/${view.meetingId}${sharekey ? `/${sharekey}` : ''}`, {
      replace: true,
    });
  };

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!loggedIn) {
      toast.danger(t('lobby.needLogin'));
      return;
    }
    const userIds = userIdsCsv(createPicked);
    openMut.mutate(
      {
        type: 'create',
        ...(createName.trim() ? { name: createName.trim() } : {}),
        ...(userIds ? { userIds } : {}),
      },
      {
        onSuccess: enterSession,
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    const id = joinId.trim().toUpperCase();
    if (!id) {
      toast.danger(t('lobby.meetingIdPlaceholder'));
      return;
    }
    if (!loggedIn && !sharekey) {
      toast.danger(t('lobby.needLogin'));
      return;
    }
    if (!loggedIn && !guestName.trim()) {
      toast.danger(t('lobby.usernamePlaceholder'));
      return;
    }
    openMut.mutate(
      {
        type: 'join',
        meetingId: id,
        ...(sharekey ? { shareKey: sharekey } : {}),
        ...(!loggedIn && guestName.trim() ? { username: guestName.trim() } : {}),
      },
      {
        onSuccess: enterSession,
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  const onLeave = () => {
    setSession(null);
    navigate('/meeting', { replace: true });
  };

  const onCopyLink = () => {
    if (!session) return;
    linkMut.mutate(
      { meetingId: session.meetingId },
      {
        onSuccess: async (data) => {
          const url =
            data.url || `${window.location.origin}/meeting/${data.meetingId}/${data.shareKey}`;
          try {
            await navigator.clipboard.writeText(url);
            toast.success(t('room.linkCopied'));
          } catch {
            toast.danger(t('error.generic'));
          }
        },
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  const onInvite = (e: FormEvent) => {
    e.preventDefault();
    if (!session || !loggedIn) {
      toast.danger(t('room.guestNoInvite'));
      return;
    }
    const userIds = userIdsCsv(invitePicked);
    if (!userIds) {
      toast.danger(t('room.needInvite'));
      return;
    }
    inviteMut.mutate(
      { meetingId: session.meetingId, userIds },
      {
        onSuccess: () => {
          toast.success(t('room.inviteOk'));
          setInvitePicked([]);
        },
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  if (session) {
    return (
      <div className="bg-background text-foreground mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted text-xs">{t('room.inMeeting')}</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {session.name || session.meetingId}
            </h1>
            <p className="text-muted mt-1 text-sm">
              {t('room.meetingId')}:{' '}
              <span className="text-foreground font-mono">{session.meetingId}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              isDisabled={linkMut.isPending}
              onPress={onCopyLink}
            >
              {t('room.copyLink')}
            </Button>
            <Button variant="danger" onPress={onLeave}>
              {t('room.leave')}
            </Button>
          </div>
        </header>

        <MeetingRtcPanel
          session={session}
          mic={mic}
          camera={camera}
          onMicChange={setMic}
          onCameraChange={setCamera}
          onFatal={(msg) => toast.danger(msg)}
        />

        <section className="border-border bg-surface rounded-xl border p-4">
          <dl className="text-muted grid gap-1 text-sm">
            <div>
              <dt className="inline">{t('room.nickname')}：</dt>
              <dd className="text-foreground inline">{session.nickname || '—'}</dd>
            </div>
            <div>
              <dt className="inline">{t('room.channel')}：</dt>
              <dd className="text-foreground inline font-mono text-xs">{session.channel}</dd>
            </div>
          </dl>
        </section>

        {loggedIn ? (
          <section className="border-border bg-surface rounded-xl border p-4">
            <h2 className="text-sm font-semibold">{t('room.invite')}</h2>
            <Form className="mt-3 flex flex-col gap-3" onSubmit={onInvite}>
              <UserMultiPicker
                picked={invitePicked}
                onChange={setInvitePicked}
                max={20}
                enabled={loggedIn}
              />
              <Button
                type="submit"
                size="sm"
                className="self-start"
                isDisabled={inviteMut.isPending || invitePicked.length === 0}
              >
                {t('room.inviteSubmit')}
              </Button>
            </Form>
          </section>
        ) : (
          <p className="text-muted text-sm">{t('room.guestNoInvite')}</p>
        )}
      </div>
    );
  }

  const isGuestRoute = Boolean(routeMeetingId && sharekey);

  return (
    <div className="bg-background text-foreground mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        {!loggedIn ? (
          <p className="text-muted mt-2 text-sm">
            {t('lobby.needLogin')}{' '}
            <Link className="text-accent underline" to="/login?redirect=/meeting">
              {t('lobby.login')}
            </Link>
          </p>
        ) : null}
      </header>

      {loggedIn ? (
        <section className="border-border bg-surface rounded-xl border p-4">
          <h2 className="text-sm font-semibold">{t('lobby.createTitle')}</h2>
          <Form className="mt-3 flex flex-col gap-3" onSubmit={onCreate}>
            <TextField name="name" value={createName} onChange={setCreateName} className="w-full">
              <Label>{t('lobby.name')}</Label>
              <Input placeholder={t('lobby.namePlaceholder')} />
            </TextField>
            <div>
              <Label className="mb-2 block">{t('lobby.inviteIds')}</Label>
              <UserMultiPicker
                picked={createPicked}
                onChange={setCreatePicked}
                max={20}
                enabled={loggedIn}
              />
            </div>
            <MediaPrefs mic={mic} camera={camera} setMic={setMic} setCamera={setCamera} t={t} />
            <Button type="submit" isDisabled={openMut.isPending}>
              {t('lobby.create')}
            </Button>
          </Form>
        </section>
      ) : null}

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">
          {isGuestRoute ? t('lobby.guestTitle') : t('lobby.joinTitle')}
        </h2>
        <Form className="mt-3 flex flex-col gap-3" onSubmit={onJoin}>
          <TextField
            name="meetingId"
            value={joinId}
            onChange={setJoinId}
            className="w-full"
            isDisabled={Boolean(routeMeetingId)}
          >
            <Label>{t('lobby.meetingId')}</Label>
            <Input placeholder={t('lobby.meetingIdPlaceholder')} />
          </TextField>
          {!loggedIn ? (
            <TextField
              name="username"
              value={guestName}
              onChange={setGuestName}
              className="w-full"
              isRequired
            >
              <Label>{t('lobby.username')}</Label>
              <Input placeholder={t('lobby.usernamePlaceholder')} />
            </TextField>
          ) : null}
          <MediaPrefs mic={mic} camera={camera} setMic={setMic} setCamera={setCamera} t={t} />
          <Button type="submit" isDisabled={openMut.isPending}>
            {t('lobby.join')}
          </Button>
        </Form>
      </section>

      {loggedIn ? (
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onPress={() => navigate('/manage/admin/meeting')}
        >
          {t('lobby.settings')}
        </Button>
      ) : null}
    </div>
  );
}

function MediaPrefs({
  mic,
  camera,
  setMic,
  setCamera,
  t,
}: {
  mic: boolean;
  camera: boolean;
  setMic: (v: boolean) => void;
  setCamera: (v: boolean) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Checkbox isSelected={mic} onChange={setMic}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Label>{t('lobby.mic')}</Label>
        </Checkbox.Content>
      </Checkbox>
      <Checkbox isSelected={camera} onChange={setCamera}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Label>{t('lobby.camera')}</Label>
        </Checkbox.Content>
      </Checkbox>
    </div>
  );
}
