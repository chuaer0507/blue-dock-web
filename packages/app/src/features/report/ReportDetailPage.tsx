import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Modal, toast, useOverlayState } from '@heroui/react';
import { ArrowLeftIcon, ShareIcon } from '@heroicons/react/24/outline';
import { useMarkReportRead, useReportDetail, useShareReport } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { ReportAnalysisPanel } from './ReportAnalysisPanel';
import { ShareTargetPicker } from '../common/ShareTargetPicker';
import { toastRequestError } from '../../utils/toast-request-error';

/** 工作报告详情（独立窗 / 深链；`reportDetailId` 可为数字 id 或分享短码） */
export function ReportDetailPage() {
  const { t } = useTranslation('report');
  const navigate = useNavigate();
  const { reportDetailId } = useParams();
  const key = reportDetailId?.trim() || undefined;
  const detail = useReportDetail(key);
  const markRead = useMarkReportRead();
  const share = useShareReport();
  const shareState = useOverlayState();
  const [picked, setPicked] = useState<number[]>([]);
  const autoMarked = useRef(false);

  useEffect(() => {
    autoMarked.current = false;
  }, [key]);

  useEffect(() => {
    if (!shareState.isOpen) setPicked([]);
  }, [shareState.isOpen]);

  useEffect(() => {
    const report = detail.data;
    if (!report?.id || autoMarked.current) return;
    if (Number(report.read) === 0) {
      autoMarked.current = true;
      markRead.mutate({ id: report.id });
    }
  }, [detail.data, markRead]);

  const onShare = (dialogId: number) => {
    const reportId = detail.data?.id;
    if (!reportId) return;
    share.mutate(
      { id: reportId, dialogId },
      {
        onSuccess: () => {
          toast.success(t('detail.shareOk'));
          shareState.close();
          navigate(`/manage/messenger/${dialogId}`);
        },
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  if (!key) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-muted text-sm">{t('detail.empty')}</p>
        <Button size="sm" variant="secondary" onPress={() => navigate('/manage/report')}>
          {t('detail.close')}
        </Button>
      </div>
    );
  }

  if (detail.isLoading) {
    return (
      <div className="text-muted flex h-full items-center justify-center p-6 text-sm">
        {t('loading')}
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-danger text-sm">{t('error.generic')}</p>
        <Button size="sm" variant="secondary" onPress={() => void detail.refetch()}>
          {t('list.refresh')}
        </Button>
      </div>
    );
  }

  const report = detail.data;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={t('detail.close')}
          onPress={() => navigate('/manage/report')}
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">
          {report.title || t('detail.title')}
        </h1>
        <Button
          size="sm"
          variant="secondary"
          onPress={() => navigate(`/single/report/edit/${report.id}`)}
        >
          {t('detail.edit')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onPress={shareState.open}
          isDisabled={share.isPending}
        >
          <ShareIcon className="size-4" aria-hidden />
          {t('detail.share')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          isDisabled={markRead.isPending}
          onPress={() =>
            markRead.mutate(
              { id: report.id },
              {
                onSuccess: () => toast.success(t('detail.markRead')),
                onError: (err) => toastRequestError(err, t('error.generic')),
              },
            )
          }
        >
          {t('detail.markRead')}
        </Button>
      </header>

      <dl className="text-muted grid gap-1 text-xs">
        <div>
          <dt className="inline">{t('compose.type')}：</dt>
          <dd className="text-foreground inline">
            {report.type === 'weekly' ? t('filter.weekly') : t('filter.daily')}
          </dd>
        </div>
        {report.sign ? (
          <div>
            <dt className="inline">{t('detail.sign')}：</dt>
            <dd className="text-foreground inline">{report.sign}</dd>
          </div>
        ) : null}
        {report.createdAt ? (
          <div>
            <dt className="inline">{t('detail.time')}：</dt>
            <dd className="text-foreground inline">
              {new Date(report.createdAt).toLocaleString()}
            </dd>
          </div>
        ) : null}
      </dl>

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">{t('detail.content')}</h2>
        <pre className="wrap-break-word mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">
          {report.content || '—'}
        </pre>
      </section>

      <ReportAnalysisPanel report={report} />

      <Modal>
        <Modal.Backdrop isOpen={shareState.isOpen} onOpenChange={shareState.setOpen}>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('detail.shareTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <ShareTargetPicker
                  mode="single"
                  selectedIds={picked}
                  onChange={setPicked}
                  enabled={shareState.isOpen}
                  onPickOne={onShare}
                />
                <div className="flex justify-end">
                  <Button size="sm" variant="secondary" onPress={shareState.close}>
                    {t('detail.shareCancel')}
                  </Button>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
