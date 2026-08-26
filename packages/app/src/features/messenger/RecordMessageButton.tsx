import { useEffect, useRef, useState } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';
import { Button, Modal, toast } from '@heroui/react';
import { useConvertDialogRecord, useSendDialogRecord } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';
import { audioBlobToWavDataUrl } from './audio-wav';

const MIN_MS = 600;
const MAX_MS = 60_000;

type PendingClip = {
  dataUrl: string;
  duration: number;
};

type Props = {
  dialogId: number;
  replyId?: number;
  disabled?: boolean;
  onSent?: () => void;
  /** 预转写结果写入输入框（不发语音） */
  onInsertText?: (text: string) => void;
};

/** Composer：录音 → 可选发送语音或 `convertRecord` 填入草稿 */
export function RecordMessageButton({ dialogId, replyId, disabled, onSent, onInsertText }: Props) {
  const { t } = useTranslation('messenger');
  const sendRecord = useSendDialogRecord();
  const convertRecord = useConvertDialogRecord();
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingClip | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const maxTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimerRef.current != null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearTimers();
      const rec = mediaRef.current;
      if (rec && rec.state !== 'inactive') {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
      mediaRef.current?.stream.getTracks().forEach((tr) => tr.stop());
    },
    [],
  );

  const prepareClip = async (blob: Blob, durationHint: number) => {
    setBusy(true);
    try {
      const { dataUrl, durationMs } = await audioBlobToWavDataUrl(blob);
      const duration = Math.max(durationMs, durationHint);
      if (duration < MIN_MS) {
        toast.danger(t('record.tooShort'));
        return;
      }
      setPending({ dataUrl, duration });
    } catch (err) {
      toastRequestError(err, t('error'));
    } finally {
      setBusy(false);
      setRecording(false);
      setElapsedMs(0);
    }
  };

  const stopRecording = () => {
    const rec = mediaRef.current;
    clearTimers();
    if (!rec || rec.state === 'inactive') {
      setRecording(false);
      return;
    }
    rec.stop();
  };

  const startRecording = async () => {
    if (busy || disabled || recording || pending) return;
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.danger(t('record.unsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        mediaRef.current = null;
        const durationHint = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        void prepareClip(blob, durationHint);
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
      setElapsedMs(0);
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);
      maxTimerRef.current = window.setTimeout(() => {
        toast.danger(t('record.maxReached'));
        stopRecording();
      }, MAX_MS);
    } catch {
      toast.danger(t('record.denied'));
    }
  };

  const closePending = () => setPending(null);

  const onSendVoice = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await sendRecord.mutateAsync({
        dialogId,
        base64: pending.dataUrl,
        duration: pending.duration,
        ...(replyId != null ? { replyId } : {}),
      });
      toast.success(t('record.done'));
      setPending(null);
      onSent?.();
    } catch (err) {
      toastRequestError(err, t('error'));
    } finally {
      setBusy(false);
    }
  };

  const onConvertToDraft = async () => {
    if (!pending || !onInsertText) return;
    setBusy(true);
    try {
      const text = await convertRecord.mutateAsync({
        base64: pending.dataUrl,
        duration: pending.duration,
        dialogId,
      });
      if (!text) {
        toast.danger(t('record.convertEmpty'));
        return;
      }
      onInsertText(text);
      toast.success(t('record.convertDone'));
      setPending(null);
    } catch (err) {
      toastRequestError(err, t('error'));
    } finally {
      setBusy(false);
    }
  };

  const onPress = () => {
    if (recording) {
      stopRecording();
      return;
    }
    void startRecording();
  };

  const sec = Math.max(0, Math.round(elapsedMs / 1000));

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={recording ? 'danger' : 'secondary'}
        isIconOnly={!recording}
        aria-label={recording ? t('record.stop') : t('record.open')}
        isDisabled={disabled || busy}
        onPress={onPress}
      >
        {recording ? (
          <span className="flex items-center gap-1 px-1 text-xs">
            <StopIcon className="size-4" aria-hidden />
            {t('record.recording', { sec })}
          </span>
        ) : (
          <MicrophoneIcon className="size-4" aria-hidden />
        )}
      </Button>

      <Modal>
        <Modal.Backdrop
          isOpen={Boolean(pending)}
          onOpenChange={(open) => {
            if (!open && !busy) closePending();
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-sm">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('record.chooseTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-muted text-sm">{t('record.chooseHint')}</p>
              </Modal.Body>
              <Modal.Footer className="flex flex-wrap gap-2">
                <Button variant="secondary" isDisabled={busy} onPress={closePending}>
                  {t('record.discard')}
                </Button>
                {onInsertText ? (
                  <Button
                    variant="secondary"
                    isDisabled={busy}
                    onPress={() => void onConvertToDraft()}
                  >
                    {busy && convertRecord.isPending ? t('record.converting') : t('record.toDraft')}
                  </Button>
                ) : null}
                <Button variant="primary" isDisabled={busy} onPress={() => void onSendVoice()}>
                  {busy && sendRecord.isPending ? t('record.sending') : t('record.sendVoice')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
