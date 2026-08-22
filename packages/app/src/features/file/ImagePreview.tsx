import { useEffect, useState } from 'react';
import { useFileRawBlob } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** 图片预览：经 `file/raw` 鉴权拉 blob → object URL */
export function ImagePreview({ fileId, alt }: { fileId: number; alt: string }) {
  const { t } = useTranslation('file');
  const query = useFileRawBlob(fileId, true);
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
    return <p className="text-muted mt-3 text-xs">{t('loading')}</p>;
  }
  if (query.isError || !objectUrl) {
    return <p className="text-danger mt-3 text-xs">{t('image.error')}</p>;
  }

  return (
    <div className="border-border mt-3 overflow-hidden rounded-lg border bg-black/5 p-2">
      <img src={objectUrl} alt={alt} className="mx-auto max-h-96 max-w-full object-contain" />
    </div>
  );
}
