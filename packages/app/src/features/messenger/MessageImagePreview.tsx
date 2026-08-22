import { useEffect, useState } from 'react';
import { useDialogMessageBlob } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

type Props = {
  messageId: number;
  alt: string;
  mineStyle?: boolean;
};

/** 消息图片：经 `dialog/message/download` 鉴权拉 blob → object URL */
export function MessageImagePreview({ messageId, alt, mineStyle }: Props) {
  const { t } = useTranslation('messenger');
  const query = useDialogMessageBlob(messageId, true);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(query.data);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [query.data]);

  if (query.isLoading) {
    return (
      <p className={cn('text-[11px]', mineStyle ? 'text-accent-foreground/70' : 'text-muted')}>
        {t('msg.imageLoading')}
      </p>
    );
  }
  if (query.isError || !objectUrl) {
    return (
      <p className={cn('text-[11px]', mineStyle ? 'text-accent-foreground/80' : 'text-danger')}>
        {t('msg.imageError')}
      </p>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className="max-h-64 max-w-full rounded-md object-contain"
      loading="lazy"
    />
  );
}
