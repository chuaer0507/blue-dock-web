import { useEffect, useState, type FormEvent } from 'react';
import {
  Button,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import {
  fetchReportTemplate,
  useAiGenerateReport,
  useReportLastSubmitter,
  useStoreReport,
  useUserSearch,
  type ReportType,
  type ReportView,
  type UserSearchHit,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';

type Props = {
  initial?: ReportView | null;
  onSaved?: (report: ReportView) => void;
};

function idsToReceivers(ids: number[] | undefined): UserSearchHit[] {
  return (ids ?? [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)
    .map((userId) => ({
      userId,
      email: '',
      nickname: `#${userId}`,
      profession: '',
      userImage: '',
      nameAz: '',
    }));
}

/** 撰写 / 编辑工作报告表单 */
export function ReportComposeForm({ initial, onSaved }: Props) {
  const { t } = useTranslation('report');
  const store = useStoreReport();
  const ai = useAiGenerateReport();
  const last = useReportLastSubmitter();

  const [type, setType] = useState<ReportType>(
    (initial?.type === 'weekly' ? 'weekly' : 'daily') as ReportType,
  );
  /** 0=本周期，-1=上一周期（契约 offset≤0） */
  const [offset, setOffset] = useState(0);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [receivers, setReceivers] = useState<UserSearchHit[]>(() =>
    idsToReceivers(initial?.receiveUserIds),
  );
  const [memberQ, setMemberQ] = useState('');
  const [debouncedMemberQ, setDebouncedMemberQ] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedMemberQ(memberQ.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [memberQ]);

  const memberSearch = useUserSearch(debouncedMemberQ, 20, debouncedMemberQ.length > 0);
  const hits = memberSearch.data?.list ?? [];

  useEffect(() => {
    if (!initial) return;
    setType(initial.type === 'weekly' ? 'weekly' : 'daily');
    setTitle(initial.title ?? '');
    setContent(initial.content ?? '');
    setReceivers(idsToReceivers(initial.receiveUserIds));
  }, [initial]);

  const onLoadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      const tpl = await fetchReportTemplate(type, offset);
      if (tpl.title) setTitle(tpl.title);
      if (tpl.content) setContent(tpl.content);
      toast.success(t('compose.loadTemplate'));
    } catch (err) {
      toastRequestError(err, t('error.generic'));
    } finally {
      setLoadingTemplate(false);
    }
  };

  const onUseLast = () => {
    const id = last.data?.userId;
    if (!id) {
      toast.danger(t('compose.noLastReceiver'));
      return;
    }
    setReceivers((prev) => {
      if (prev.some((p) => p.userId === id)) return prev;
      return [
        ...prev,
        {
          userId: id,
          email: '',
          nickname: `#${id}`,
          profession: '',
          userImage: '',
          nameAz: '',
        },
      ];
    });
  };

  const onAi = () => {
    if (!content.trim()) {
      toast.danger(t('compose.contentRequired'));
      return;
    }
    ai.mutate(
      { type, content },
      {
        onSuccess: (data) => {
          const next = data.content || data.text;
          if (next) setContent(next);
          toast.success(t('compose.aiOk'));
        },
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const receive = receivers.map((r) => r.userId).join(',');
    if (!title.trim() || !content.trim() || !receive) {
      toast.danger(t('compose.required'));
      return;
    }
    store.mutate(
      {
        ...(initial?.id ? { id: initial.id } : {}),
        title: title.trim(),
        type,
        content,
        receive,
        ...(initial?.id ? {} : { offset }),
      },
      {
        onSuccess: (report) => {
          toast.success(t('compose.ok'));
          onSaved?.(report);
          if (!initial?.id) {
            setTitle('');
            setContent('');
            setReceivers([]);
            setOffset(0);
          }
        },
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  return (
    <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <RadioGroup
        name="report-type"
        orientation="horizontal"
        value={type}
        onChange={(v) => setType(v as ReportType)}
      >
        <Label>{t('compose.type')}</Label>
        <Radio value="daily">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            {t('filter.daily')}
          </Radio.Content>
        </Radio>
        <Radio value="weekly">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            {t('filter.weekly')}
          </Radio.Content>
        </Radio>
      </RadioGroup>

      {!initial?.id ? (
        <RadioGroup
          name="report-offset"
          orientation="horizontal"
          value={String(offset)}
          onChange={(v) => setOffset(Number(v) || 0)}
        >
          <Label>{t('compose.period')}</Label>
          <Radio value="0">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t('compose.periodCurrent')}
            </Radio.Content>
          </Radio>
          <Radio value="-1">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t('compose.periodPrevious')}
            </Radio.Content>
          </Radio>
        </RadioGroup>
      ) : null}

      <TextField name="title" isRequired value={title} onChange={setTitle} className="w-full">
        <Label>{t('compose.title')}</Label>
        <Input />
      </TextField>

      <TextField name="content" isRequired value={content} onChange={setContent} className="w-full">
        <Label>{t('compose.content')}</Label>
        <TextArea rows={12} />
      </TextField>

      <div className="flex flex-col gap-2">
        <Label>{t('compose.receive')}</Label>
        <TextField
          name="receiverSearch"
          value={memberQ}
          onChange={setMemberQ}
          className="w-full"
          aria-label={t('compose.receiveSearch')}
        >
          <Input placeholder={t('compose.receiveSearch')} />
        </TextField>
        {hits.length > 0 ? (
          <ul className="border-border max-h-40 overflow-auto rounded-lg border">
            {hits.map((hit: UserSearchHit) => {
              const picked = receivers.some((s) => s.userId === hit.userId);
              return (
                <li key={hit.userId}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-none px-3 py-2 text-left text-sm font-normal"
                    isDisabled={picked}
                    onPress={() => setReceivers((prev) => [...prev, hit])}
                  >
                    {hit.nickname || hit.email}
                    <span className="text-muted ms-2 text-xs">#{hit.userId}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {receivers.length === 0 ? (
          <p className="text-muted text-xs">{t('compose.receiveEmpty')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {receivers.map((m) => (
              <li key={m.userId}>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onPress={() => setReceivers((prev) => prev.filter((s) => s.userId !== m.userId))}
                >
                  {m.nickname || m.email || `#${m.userId}`} ×
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-muted text-xs">{t('compose.hint')}</p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          isDisabled={loadingTemplate}
          onPress={() => void onLoadTemplate()}
        >
          {t('compose.loadTemplate')}
        </Button>
        <Button type="button" size="sm" variant="secondary" onPress={onUseLast}>
          {t('compose.useLastReceiver')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          isDisabled={ai.isPending || !content.trim()}
          onPress={onAi}
        >
          {t('compose.aiPolish')}
        </Button>
        <Button type="submit" size="sm" isDisabled={store.isPending}>
          {t('compose.submit')}
        </Button>
      </div>
    </Form>
  );
}
