import { useEffect, useState } from 'react';
import { useFileRawBlob } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** PDF 预览：经 `file/raw` 鉴权拉 blob → object URL + iframe */
export function PdfPreview({ fileId }: { fileId: number }) {
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
    return <p className="text-danger mt-3 text-xs">{t('pdf.error')}</p>;
  }

  return (
    <div className="border-border mt-3 overflow-hidden rounded-lg border bg-black/5">
      <iframe title={t('pdf.title')} src={objectUrl} className="h-[28rem] w-full" />
    </div>
  );
}
