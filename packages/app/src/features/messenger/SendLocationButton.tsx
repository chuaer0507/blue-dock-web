import { useState } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { Button, toast } from '@heroui/react';
import { useSendDialogLocation } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';

type Props = {
  dialogId: number;
  disabled?: boolean;
};

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

/** Composer：定位并发送当前位置（`dialog/message/sendLocation`，默认 amap） */
export function SendLocationButton({ dialogId, disabled }: Props) {
  const { t } = useTranslation('messenger');
  const sendLocation = useSendDialogLocation();
  const [locating, setLocating] = useState(false);

  const busy = locating || sendLocation.isPending;

  const onPress = async () => {
    if (busy || disabled) return;
    setLocating(true);
    try {
      const pos = await readGeolocation();
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        toast.danger(t('location.coordsInvalid'));
        return;
      }
      const distance =
        Number.isFinite(accuracy) && accuracy > 0 ? Math.round(accuracy) : undefined;
      await sendLocation.mutateAsync({
        dialogId,
        type: 'amap',
        lng,
        lat,
        title: t('location.current'),
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        ...(distance != null ? { distance } : {}),
      });
      toast.success(t('location.done'));
    } catch (err) {
      if (err instanceof Error && err.message === 'geolocation unavailable') {
        toast.danger(t('location.unsupported'));
      } else if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as GeolocationPositionError).code != null
      ) {
        toast.danger(t('location.denied'));
      } else {
        toastRequestError(err, t('error'));
      }
    } finally {
      setLocating(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      isIconOnly
      aria-label={t('location.open')}
      isDisabled={disabled || busy}
      onPress={() => void onPress()}
    >
      <MapPinIcon className="size-4" aria-hidden />
    </Button>
  );
}
