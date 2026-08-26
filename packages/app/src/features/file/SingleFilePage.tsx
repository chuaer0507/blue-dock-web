import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, toast } from '@heroui/react';
import {
  fetchDialogMessageBlob,
  formatFileSize,
  getAccessToken,
  isFolderEntry,
  isImageFile,
  isOfficeFile,
  isPdfFile,
  useDialogMessageDetail,
  useFile,
  useFileLinkByCode,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';
import { MessageImagePreview } from '../messenger/MessageImagePreview';
import { ImagePreview } from './ImagePreview';
import { OfficePreview } from './OfficePreview';
import { PdfPreview } from './PdfPreview';

function parseNumericId(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  if (!/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function isImageAttachment(type: string, extension: string): boolean {
  const t = type.toLowerCase();
  if (t === 'image' || t.startsWith('image/')) return true;
  const ext = extension.replace(/^\./, '').toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  a.click();
  URL.revokeObjectURL(url);
}

/** 独立文件页：分享码 / 文件 ID / 任务附件 / 消息附件 */
export function SingleFilePage({ mode = 'auto' }: { mode?: 'auto' | 'task' | 'msg' }) {
  const { t } = useTranslation('file');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const params = useParams();
  const loggedIn = Boolean(getAccessToken());

  const codeOrId = params.codeOrFileId ?? params.fileId ?? params.msgId ?? '';
  const numericId = parseNumericId(codeOrId);
  const isCode = mode === 'auto' && !numericId && Boolean(codeOrId);

  const linkQuery = useFileLinkByCode(isCode ? codeOrId : undefined, isCode);
  const fileId =
    mode === 'msg'
      ? undefined
      : (numericId ??
        (linkQuery.data?.fileId && linkQuery.data.fileId > 0 ? linkQuery.data.fileId : undefined));

  const fileQuery = useFile(fileId);

  if (mode === 'msg') {
    return (
      <MsgAttachmentPanel
        messageId={numericId}
        loggedIn={loggedIn}
        navigate={navigate}
        tFile={t}
        tCommon={tc}
      />
    );
  }

  if (isCode && linkQuery.isLoading) {
    return (
      <Shell title={t('title')}>
        <p className="text-muted text-sm">{t('loading')}</p>
      </Shell>
    );
  }

  if (isCode && linkQuery.isError) {
    return (
      <Shell title={t('title')}>
        <p className="text-danger text-sm">{tc('single.fileShareHint')}</p>
        <Actions loggedIn={loggedIn} navigate={navigate} t={tc} />
      </Shell>
    );
  }

  if (!fileId) {
    return (
      <Shell title={t('title')}>
        <p className="text-muted text-sm">{tc('single.fileShareHint')}</p>
        <Actions loggedIn={loggedIn} navigate={navigate} t={tc} />
      </Shell>
    );
  }

  if (fileQuery.isLoading) {
    return (
      <Shell title={t('title')}>
        <p className="text-muted text-sm">{t('loading')}</p>
      </Shell>
    );
  }

  if (fileQuery.isError || !fileQuery.data) {
    return (
      <Shell title={t('title')}>
        <p className="text-danger text-sm">{t('error')}</p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onPress={() => void fileQuery.refetch()}
        >
          {t('retry')}
        </Button>
      </Shell>
    );
  }

  const file = fileQuery.data;
  const folder = isFolderEntry(file);

  return (
    <Shell title={file.name || t('title')}>
      <dl className="text-muted grid gap-2 text-sm">
        <div>
          <dt className="inline">{t('detail')}：</dt>
          <dd className="text-foreground inline">{folder ? t('folder') : t('file')}</dd>
        </div>
        {!folder ? (
          <div>
            <dt className="inline">{t('size')}：</dt>
            <dd className="text-foreground inline">{formatFileSize(file.size)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="inline">{t('updatedAt')}：</dt>
          <dd className="text-foreground inline">{file.updatedAt || '—'}</dd>
        </div>
        {file.isShared ? (
          <div>
            <dt className="inline">{t('shared')}：</dt>
            <dd className="text-foreground inline">✓</dd>
          </div>
        ) : null}
      </dl>
      {!folder && loggedIn ? (
        isImageFile(file) ? (
          <ImagePreview fileId={file.id} alt={file.name} />
        ) : isPdfFile(file) ? (
          <PdfPreview fileId={file.id} />
        ) : isOfficeFile(file) ? (
          <OfficePreview fileId={file.id} />
        ) : (
          <p className="text-muted mt-4 text-xs">{t('previewSoon')}</p>
        )
      ) : !folder ? (
        <p className="text-muted mt-4 text-xs">{t('previewSoon')}</p>
      ) : null}
      {loggedIn ? (
        <Button
          className="mt-4"
          size="sm"
          onPress={() =>
            navigate(
              folder
                ? `/manage/file/${file.id}`
                : `/manage/file/${file.parentId || ''}/${file.id}`
                    .replace(/\/+/g, '/')
                    .replace(/\/$/, '') || '/manage/file',
            )
          }
        >
          {tc('single.openInApp')}
        </Button>
      ) : (
        <Actions loggedIn={false} navigate={navigate} t={tc} />
      )}
    </Shell>
  );
}

function MsgAttachmentPanel({
  messageId,
  loggedIn,
  navigate,
  tFile,
  tCommon,
}: {
  messageId: number | undefined;
  loggedIn: boolean;
  navigate: ReturnType<typeof useNavigate>;
  tFile: (k: string, opts?: Record<string, unknown>) => string;
  tCommon: (k: string) => string;
}) {
  const detailQuery = useDialogMessageDetail(messageId, Boolean(messageId) && loggedIn);
  const [downloading, setDownloading] = useState(false);

  if (!loggedIn) {
    return (
      <Shell title={tFile('title')}>
        <p className="text-muted text-sm">{tCommon('single.fileMsgHint')}</p>
        <Actions loggedIn={false} navigate={navigate} t={tCommon} />
      </Shell>
    );
  }

  if (!messageId) {
    return (
      <Shell title={tFile('title')}>
        <p className="text-muted text-sm">{tCommon('single.fileMsgHint')}</p>
        <Actions loggedIn navigate={navigate} t={tCommon} />
      </Shell>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <Shell title={tFile('title')}>
        <p className="text-muted text-sm">{tFile('loading')}</p>
      </Shell>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Shell title={tFile('title')}>
        <p className="text-danger text-sm">{tFile('error')}</p>
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          onPress={() => void detailQuery.refetch()}
        >
          {tFile('retry')}
        </Button>
        <Actions loggedIn navigate={navigate} t={tCommon} />
      </Shell>
    );
  }

  const detail = detailQuery.data;
  const file = detail.file;
  const name = (file?.name || '').trim() || tFile('file');
  const size = file?.size ?? 0;
  const extension = (file?.extension || '').replace(/^\./, '');
  const showImage = isImageAttachment(detail.type, extension || file?.type || '');

  const onDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await fetchDialogMessageBlob(messageId);
      triggerBlobDownload(blob, name);
      toast.success(tFile('download.done'));
    } catch (err) {
      toastRequestError(err, tFile('error'));
    } finally {
      setDownloading(false);
    }
  };

  const openDialog = () => {
    if (detail.dialogId > 0) {
      navigate(`/manage/messenger/${detail.dialogId}?msg=${messageId}`);
      return;
    }
    navigate('/manage/messenger');
  };

  return (
    <Shell title={name}>
      <dl className="text-muted grid gap-2 text-sm">
        <div>
          <dt className="inline">{tFile('detail')}：</dt>
          <dd className="text-foreground inline">
            {extension ? extension.toUpperCase() : detail.type || tFile('file')}
          </dd>
        </div>
        {size > 0 ? (
          <div>
            <dt className="inline">{tFile('size')}：</dt>
            <dd className="text-foreground inline">{formatFileSize(size)}</dd>
          </div>
        ) : null}
        {detail.createdAt ? (
          <div>
            <dt className="inline">{tFile('updatedAt')}：</dt>
            <dd className="text-foreground inline">{detail.createdAt}</dd>
          </div>
        ) : null}
      </dl>
      {showImage ? (
        <div className="mt-4">
          <MessageImagePreview messageId={messageId} alt={name} />
        </div>
      ) : (
        <p className="text-muted mt-4 text-xs">{tCommon('single.fileMsgDownloadHint')}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          isDisabled={downloading}
          onPress={() => void onDownload()}
        >
          {downloading ? tFile('download.working') : tFile('download.one')}
        </Button>
        <Button size="sm" variant="secondary" onPress={openDialog}>
          {tCommon('single.openInDialog')}
        </Button>
        {file && file.id > 0 ? (
          <Button size="sm" variant="ghost" onPress={() => navigate(`/single/file/${file.id}`)}>
            {tCommon('single.openInApp')}
          </Button>
        ) : null}
      </div>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground flex min-h-dvh items-center justify-center p-6">
      <div className="border-border bg-surface w-full max-w-md rounded-2xl border p-6">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function Actions({
  loggedIn,
  navigate,
  t,
}: {
  loggedIn: boolean;
  navigate: ReturnType<typeof useNavigate>;
  t: (k: string) => string;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      {loggedIn ? (
        <Button size="sm" onPress={() => navigate('/manage/file')}>
          {t('single.openInApp')}
        </Button>
      ) : (
        <Button size="sm" onPress={() => navigate('/login')}>
          {t('auth.login')}
        </Button>
      )}
      <Link className="text-muted text-center text-xs underline" to="/">
        {t('error.backHome')}
      </Link>
    </div>
  );
}
