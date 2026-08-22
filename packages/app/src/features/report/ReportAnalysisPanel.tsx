import { useEffect, useState } from 'react';
import { Button, TextArea, TextField, toast } from '@heroui/react';
import {
  useAiGenerateReport,
  useSaveReportAnalysis,
  type ReportType,
  type ReportView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';

type Props = {
  report: ReportView;
};

/** 工作汇报 AI 解读：展示 / 编辑 / 保存（契约 `report/analysisSave`） */
export function ReportAnalysisPanel({ report }: Props) {
  const { t } = useTranslation('report');
  const save = useSaveReportAnalysis();
  const ai = useAiGenerateReport();
  const [text, setText] = useState(() => String(report.aiAnalysis?.text ?? ''));

  useEffect(() => {
    setText(String(report.aiAnalysis?.text ?? ''));
  }, [report.id, report.aiAnalysis?.text]);

  const type = (report.type === 'weekly' ? 'weekly' : 'daily') as ReportType;
  const model = String(report.aiAnalysis?.model ?? '');

  const onGenerate = () => {
    if (!report.content.trim()) {
      toast.danger(t('analysis.contentRequired'));
      return;
    }
    ai.mutate(
      { type, content: report.content },
      {
        onSuccess: (data) => {
          const next = data.content || data.text;
          if (next) setText(next);
          toast.success(t('analysis.generated'));
        },
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  const onSave = () => {
    if (!text.trim()) {
      toast.danger(t('analysis.required'));
      return;
    }
    save.mutate(
      { id: report.id, text: text.trim() },
      {
        onSuccess: () => toast.success(t('analysis.saved')),
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  return (
    <section className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('analysis.title')}</h2>
        {model ? (
          <span className="text-muted text-[10px]">{t('analysis.model', { model })}</span>
        ) : null}
      </div>
      <p className="text-muted text-xs">{t('analysis.hint')}</p>
      <TextField
        name="report-analysis"
        value={text}
        onChange={setText}
        className="w-full"
        aria-label={t('analysis.title')}
      >
        <TextArea rows={8} placeholder={t('analysis.placeholder')} />
      </TextField>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          isDisabled={ai.isPending || !report.content.trim()}
          onPress={onGenerate}
        >
          {t('analysis.generate')}
        </Button>
        <Button
          type="button"
          size="sm"
          isDisabled={save.isPending || !text.trim()}
          onPress={onSave}
        >
          {t('analysis.save')}
        </Button>
      </div>
    </section>
  );
}
