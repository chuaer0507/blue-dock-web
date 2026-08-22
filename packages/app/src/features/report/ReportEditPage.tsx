import { useNavigate, useParams } from 'react-router';
import { Button } from '@heroui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useReportDetail } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { ReportComposeForm } from './ReportComposeForm';

function parseEditId(raw: string | undefined): number | undefined {
  if (!raw || raw === 'new') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** 工作报告独立编辑窗 */
export function ReportEditPage() {
  const { t } = useTranslation('report');
  const navigate = useNavigate();
  const { reportEditId } = useParams();
  const id = parseEditId(reportEditId);
  const detail = useReportDetail(id, Boolean(id));

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={t('detail.close')}
          onPress={() => navigate('/manage/report')}
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          {id ? t('detail.edit') : t('tabs.compose')}
        </h1>
      </header>

      {id && detail.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {id && detail.isError ? <p className="text-danger text-sm">{t('error.generic')}</p> : null}

      {!id || detail.data ? (
        <ReportComposeForm
          initial={detail.data ?? null}
          onSaved={(report) => navigate(`/single/report/detail/${report.id}`)}
        />
      ) : null}
    </div>
  );
}
