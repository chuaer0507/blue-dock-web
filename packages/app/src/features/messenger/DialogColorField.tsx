import { Button, toast } from '@heroui/react';
import { useSetDialogColor } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import { toastRequestError } from '../../utils/toast-request-error';

const PRESETS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'] as const;

type Props = {
  dialogId: number;
  color: string;
};

/** 会话个人颜色（message/color；空=清除） */
export function DialogColorField({ dialogId, color }: Props) {
  const { t } = useTranslation('messenger');
  const setColor = useSetDialogColor();
  const current = (color || '').trim().toLowerCase();

  const apply = (next: string) => {
    setColor.mutate(
      { dialogId, color: next },
      {
        onSuccess: () => toast.success(next ? t('dialogColor.saved') : t('dialogColor.cleared')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted text-[10px] font-medium">{t('dialogColor.label')}</span>
      {PRESETS.map((hex) => {
        const selected = current === hex.toLowerCase();
        return (
          <Button
            key={hex}
            size="sm"
            isIconOnly
            variant={selected ? 'primary' : 'secondary'}
            className={cn(
              'size-6 min-w-6 rounded-full p-0',
              selected ? 'ring-offset-background ring-2' : '',
            )}
            style={{ backgroundColor: hex }}
            aria-label={t('dialogColor.pick', { color: hex })}
            isDisabled={setColor.isPending}
            onPress={() => apply(selected ? '' : hex)}
          />
        );
      })}
      {current ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-auto min-h-0 px-1 py-0 text-[10px]"
          isDisabled={setColor.isPending}
          onPress={() => apply('')}
        >
          {t('dialogColor.clear')}
        </Button>
      ) : null}
    </div>
  );
}
