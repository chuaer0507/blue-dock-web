import { toastRequestError } from '../../utils/toast-request-error';
import { toast } from '@heroui/react';
import {
  parseExportDownloadRef,
  useDownloadExportFile,
  type ExportDownloadKind,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

const FILENAME: Record<ExportDownloadKind, string> = {
  task: 'export-tasks.csv',
  attendance: 'export-attendance.csv',
  approve: 'export-approve.csv',
};

type Props = {
  href: string;
  label?: string;
  className?: string;
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 导出通知链接：带 Bearer 拉 CSV（勿直接打开 /api/…） */
export function ExportDownloadLink({ href, label, className }: Props) {
  const { t } = useTranslation('export');
  const download = useDownloadExportFile();
  const ref = parseExportDownloadRef(href);

  if (!ref) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
        {label || href}
      </a>
    );
  }

  const onPress = () => {
    download.mutate(
      { kind: ref.kind, key: ref.key },
      {
        onSuccess: ({ blob, kind }) => {
          saveBlob(blob, FILENAME[kind]);
          toast.success(t('download.done'));
        },
        onError: (err) => toastRequestError(err, t('download.failed')),
      },
    );
  };

  return (
    <button
      type="button"
      className={
        className ??
        'cursor-pointer bg-transparent p-0 text-inherit underline underline-offset-2 disabled:opacity-60'
      }
      disabled={download.isPending}
      onClick={onPress}
    >
      {download.isPending ? t('download.loading') : label || t('download.action')}
    </button>
  );
}
