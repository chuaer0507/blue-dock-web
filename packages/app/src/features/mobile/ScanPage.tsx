import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Input, Label, TextField, toast } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { confirmQrLogin } from '@blue-dock/api';
import { getMobile, isMobileRuntime } from '@blue-dock/mobile-bridge';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';
import { extractQrLoginCode } from './qr-code';

type Detector = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

function getBarcodeDetector(): Detector | null {
  const Ctor = (
    window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => Detector }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

/** 移动壳「扫一扫」：确认桌面登录二维码；支持相机 / 桥 / 手输 */
export function ScanPage() {
  const { t } = useTranslation('application');
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState('');
  const [pending, setPending] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const onConfirm = useCallback(
    async (raw: string) => {
      const code = extractQrLoginCode(raw);
      if (!code) {
        toast.danger(t('scan.invalid'));
        return;
      }
      setPending(true);
      try {
        await confirmQrLogin(code);
        toast.success(t('scan.ok'));
        navigate('/manage/application', { replace: true });
      } catch (err) {
        toastRequestError(err, t('scan.failed'));
      } finally {
        setPending(false);
      }
    },
    [navigate, t],
  );

  useEffect(() => {
    if (!isMobileRuntime()) return;
    let cancelled = false;
    void (async () => {
      const raw = await getMobile().scanQr?.();
      if (cancelled || !raw) return;
      await onConfirm(raw);
    })();
    return () => {
      cancelled = true;
    };
  }, [onConfirm]);

  useEffect(() => {
    const detector = getBarcodeDetector();
    if (!detector || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(true);
      return;
    }
    let alive = true;
    let raf = 0;

    const tick = async () => {
      if (!alive || scanningRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        raf = requestAnimationFrame(() => void tick());
        return;
      }
      scanningRef.current = true;
      try {
        const codes = await detector.detect(video);
        const raw = codes[0]?.rawValue?.trim();
        if (raw) {
          alive = false;
          streamRef.current?.getTracks().forEach((tr) => tr.stop());
          await onConfirm(raw);
          return;
        }
      } catch {
        // keep scanning
      } finally {
        scanningRef.current = false;
      }
      if (alive) raf = requestAnimationFrame(() => void tick());
    };

    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        if (!alive) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          void video.play();
        }
        raf = requestAnimationFrame(() => void tick());
      })
      .catch(() => {
        if (alive) setCameraError(true);
      });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [onConfirm]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={t('scan.back')}
          onPress={() => navigate(-1)}
        >
          <ArrowLeftIcon className="size-5" aria-hidden />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{t('scan.title')}</h1>
          <p className="text-muted text-xs">{t('scan.hint')}</p>
        </div>
      </div>

      {!cameraError ? (
        <div className="border-border bg-surface overflow-hidden rounded-xl border">
          <video ref={videoRef} className="aspect-square w-full object-cover" playsInline muted />
        </div>
      ) : (
        <p className="text-muted text-sm">{t('scan.cameraUnavailable')}</p>
      )}

      <Form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void onConfirm(manual);
        }}
      >
        <TextField value={manual} onChange={setManual} className="w-full">
          <Label>{t('scan.manual')}</Label>
          <Input placeholder={t('scan.manualPlaceholder')} autoComplete="off" />
        </TextField>
        <Button type="submit" variant="primary" isDisabled={pending || !manual.trim()}>
          {pending ? t('scan.confirming') : t('scan.confirm')}
        </Button>
      </Form>
    </div>
  );
}
