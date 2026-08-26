import { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { Button } from '@heroui/react';
import { useMeetingTourist, type MeetingOpenView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

type Props = {
  session: MeetingOpenView;
  mic: boolean;
  camera: boolean;
  onMicChange: (v: boolean) => void;
  onCameraChange: (v: boolean) => void;
  onFatal?: (message: string) => void;
};

function RemoteLabel({ uid }: { uid: string }) {
  const { t } = useTranslation('meeting');
  const tourist = useMeetingTourist(uid, Boolean(uid));
  const name = String(tourist.data?.nickname ?? '').trim();
  return (
    <span className="bg-background/70 inset-s-2 absolute bottom-2 rounded px-1.5 py-0.5 text-xs">
      {name || t('room.remoteFallback', { id: uid })}
    </span>
  );
}

/** Agora 音视频面板：join / publish / 远端订阅 */
export function MeetingRtcPanel({
  session,
  mic,
  camera,
  onMicChange,
  onCameraChange,
  onFatal,
}: Props) {
  const { t } = useTranslation('meeting');
  const localVideoRef = useRef<HTMLDivElement>(null);
  const [remoteIds, setRemoteIds] = useState<string[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);
  const remoteContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    const onUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);
      const uid = String(user.uid);
      setRemoteIds((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
      if (mediaType === 'video') {
        requestAnimationFrame(() => {
          const el = remoteContainerRefs.current.get(uid);
          if (el && user.videoTrack) user.videoTrack.play(el);
        });
      }
      if (mediaType === 'audio' && user.audioTrack) user.audioTrack.play();
    };

    const onUserUnpublished = (user: IAgoraRTCRemoteUser) => {
      const uid = String(user.uid);
      if (!user.hasAudio && !user.hasVideo) {
        setRemoteIds((prev) => prev.filter((id) => id !== uid));
      }
    };

    const onUserLeft = (user: IAgoraRTCRemoteUser) => {
      setRemoteIds((prev) => prev.filter((id) => id !== String(user.uid)));
    };

    client.on('user-published', onUserPublished);
    client.on('user-unpublished', onUserUnpublished);
    client.on('user-left', onUserLeft);

    (async () => {
      try {
        if (!session.appId || !session.channel || !session.token) {
          throw new Error(t('room.rtcMissingCreds'));
        }
        await client.join(session.appId, session.channel, session.token, session.agoraUserId);
        if (cancelled) return;

        const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
          {},
          { encoderConfig: '720p_1' },
        );
        if (cancelled) {
          micTrack.close();
          camTrack.close();
          return;
        }
        micTrackRef.current = micTrack;
        camTrackRef.current = camTrack;
        await micTrack.setEnabled(mic);
        await camTrack.setEnabled(camera);
        if (localVideoRef.current) camTrack.play(localVideoRef.current);
        await client.publish([micTrack, camTrack]);
        setJoined(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : t('error.generic');
        setError(msg);
        onFatal?.(msg);
      }
    })();

    return () => {
      cancelled = true;
      client.off('user-published', onUserPublished);
      client.off('user-unpublished', onUserUnpublished);
      client.off('user-left', onUserLeft);
      void (async () => {
        micTrackRef.current?.close();
        camTrackRef.current?.close();
        micTrackRef.current = null;
        camTrackRef.current = null;
        try {
          await client.leave();
        } catch {
          /* ignore */
        }
        clientRef.current = null;
      })();
    };
    // 仅在入会凭证变化时重建客户端
  }, [session.appId, session.channel, session.token, session.agoraUserId]);

  useEffect(() => {
    void micTrackRef.current?.setEnabled(mic);
  }, [mic]);

  useEffect(() => {
    void camTrackRef.current?.setEnabled(camera);
  }, [camera]);

  return (
    <section className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {joined ? t('room.rtcConnected') : error ? t('room.rtcFailed') : t('room.rtcConnecting')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={mic ? 'primary' : 'secondary'}
            onPress={() => onMicChange(!mic)}
          >
            {mic ? t('room.micOn') : t('room.micOff')}
          </Button>
          <Button
            size="sm"
            variant={camera ? 'primary' : 'secondary'}
            onPress={() => onCameraChange(!camera)}
          >
            {camera ? t('room.camOn') : t('room.camOff')}
          </Button>
        </div>
      </div>

      {error ? <p className="text-danger text-xs">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-default relative aspect-video overflow-hidden rounded-lg">
          <div ref={localVideoRef} className="size-full" />
          <span className="bg-background/70 inset-s-2 absolute bottom-2 rounded px-1.5 py-0.5 text-xs">
            {session.nickname || t('room.nickname')}
          </span>
        </div>
        {remoteIds.map((uid) => (
          <div
            key={uid}
            className={cn('bg-default relative aspect-video overflow-hidden rounded-lg')}
          >
            <div
              className="size-full"
              ref={(el) => {
                if (el) remoteContainerRefs.current.set(uid, el);
                else remoteContainerRefs.current.delete(uid);
              }}
            />
            <RemoteLabel uid={uid} />
          </div>
        ))}
      </div>
    </section>
  );
}
