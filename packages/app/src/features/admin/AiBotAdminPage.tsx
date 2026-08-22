import { useEffect, useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Checkbox,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import {
  useAiBotDefaultModels,
  useAiBotModelsList,
  useAiBotSetting,
  useSaveAiBotSetting,
  type AiBotModelRef,
  type AiBotSetting,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';

const PROVIDERS = ['openai', 'claude', 'deepseek', 'custom'] as const;

function joinModels(ids: string[]): string {
  return ids.join(', ');
}

function parseModels(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[,，\n]+/)) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function buildModelsList(form: AiBotSetting): AiBotModelRef[] {
  const out: AiBotModelRef[] = [];
  for (const id of form.openaiModels) out.push({ id, name: id, provider: 'openai' });
  for (const id of form.claudeModels) out.push({ id, name: id, provider: 'claude' });
  for (const id of form.deepseekModels) out.push({ id, name: id, provider: 'deepseek' });
  return out;
}

function applyModelRefs(
  list: AiBotModelRef[],
  prev: AiBotSetting,
): Pick<AiBotSetting, 'openaiModels' | 'claudeModels' | 'deepseekModels' | 'model' | 'models'> {
  const openaiModels = list
    .filter((m) => (m.provider || '').toLowerCase() === 'openai')
    .map((m) => m.id);
  const claudeModels = list
    .filter((m) => (m.provider || '').toLowerCase() === 'claude')
    .map((m) => m.id);
  const deepseekModels = list
    .filter((m) => (m.provider || '').toLowerCase() === 'deepseek')
    .map((m) => m.id);
  return {
    openaiModels: openaiModels.length ? openaiModels : prev.openaiModels,
    claudeModels: claudeModels.length ? claudeModels : prev.claudeModels,
    deepseekModels: deepseekModels.length ? deepseekModels : prev.deepseekModels,
    model: prev.model || list[0]?.id || '',
    models: list.map((m) => ({
      id: m.id,
      name: m.name || m.id,
      provider: m.provider,
    })),
  };
}

/** AI Bot 管理配置 */
export function AiBotAdminPage() {
  const { t } = useTranslation('admin');
  const query = useAiBotSetting();
  const defaultsQuery = useAiBotDefaultModels();
  const configuredQuery = useAiBotModelsList();
  const save = useSaveAiBotSetting();
  const [form, setForm] = useState<AiBotSetting | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  if (query.isError) {
    return (
      <AdminPageFrame title={t('aiBot.title')}>
        <p className="text-danger text-sm">{t('needAdmin')}</p>
      </AdminPageFrame>
    );
  }

  if (!form) {
    return (
      <AdminPageFrame title={t('aiBot.title')}>
        <p className="text-muted text-sm">{t('aiBot.loading')}</p>
      </AdminPageFrame>
    );
  }

  const patch = <K extends keyof AiBotSetting>(key: K, value: AiBotSetting[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const applyDefaults = () => {
    const list = defaultsQuery.data ?? [];
    if (!list.length) {
      toast.danger(t('aiBot.defaultsEmpty'));
      return;
    }
    setForm((prev) => (prev ? { ...prev, ...applyModelRefs(list, prev) } : prev));
    toast.success(t('aiBot.defaultsApplied'));
  };

  const applyConfigured = () => {
    const list = configuredQuery.data ?? [];
    if (!list.length) {
      toast.danger(t('aiBot.configuredEmpty'));
      return;
    }
    setForm((prev) => (prev ? { ...prev, ...applyModelRefs(list, prev) } : prev));
    toast.success(t('aiBot.configuredApplied'));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload: AiBotSetting = {
      ...form,
      models: form.models.length ? form.models : buildModelsList(form),
    };
    save.mutate(payload, {
      onSuccess: () => toast.success(t('aiBot.saved')),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <AdminPageFrame title={t('aiBot.title')} hint={t('aiBot.hint')}>
      <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <Checkbox
          isSelected={form.open === 'open'}
          onChange={(on) => patch('open', on ? 'open' : 'close')}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label>{t('aiBot.open')}</Label>
          </Checkbox.Content>
        </Checkbox>

        <Select
          className="w-full max-w-xs"
          value={form.provider || 'openai'}
          onChange={(key) => {
            if (key != null) patch('provider', String(key));
          }}
        >
          <Label>{t('aiBot.provider')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {PROVIDERS.map((id) => (
                <ListBox.Item key={id} id={id} textValue={t(`aiBot.providers.${id}`)}>
                  {t(`aiBot.providers.${id}`)}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        {(
          [
            ['apiKey', true],
            ['baseUrl', false],
            ['model', false],
            ['embeddingModel', false],
            ['openaiKey', true],
            ['claudeKey', true],
            ['deepseekKey', true],
            ['aiGatewayKey', true],
          ] as const
        ).map(([key, secret]) => (
          <TextField
            key={key}
            name={key}
            value={form[key]}
            onChange={(v) => patch(key, v)}
            className="w-full"
          >
            <Label>{t(`aiBot.${key}`)}</Label>
            <Input
              type={secret ? 'password' : 'text'}
              placeholder={secret ? t('aiBot.secretHint') : undefined}
              autoComplete="off"
            />
          </TextField>
        ))}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{t('aiBot.visibleModels')}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                type="button"
                isDisabled={configuredQuery.isLoading}
                onPress={applyConfigured}
              >
                {t('aiBot.applyConfigured')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                type="button"
                isDisabled={defaultsQuery.isLoading}
                onPress={applyDefaults}
              >
                {t('aiBot.applyDefaults')}
              </Button>
            </div>
          </div>
          <p className="text-muted text-xs">{t('aiBot.visibleModelsHint')}</p>
          {configuredQuery.isLoading ? (
            <p className="text-muted text-xs">{t('aiBot.loading')}</p>
          ) : (configuredQuery.data?.length ?? 0) > 0 ? (
            <p className="text-muted text-xs">
              {t('aiBot.configuredCount', { count: configuredQuery.data!.length })}
              {': '}
              {configuredQuery.data!.map((m) => m.id).join(', ')}
            </p>
          ) : (
            <p className="text-muted text-xs">{t('aiBot.configuredEmpty')}</p>
          )}
          {(
            [
              ['openaiModels', 'openaiModels'],
              ['claudeModels', 'claudeModels'],
              ['deepseekModels', 'deepseekModels'],
            ] as const
          ).map(([key, labelKey]) => (
            <TextField
              key={key}
              name={key}
              value={joinModels(form[key])}
              onChange={(v) => patch(key, parseModels(v))}
              className="w-full"
            >
              <Label>{t(`aiBot.${labelKey}`)}</Label>
              <Input placeholder={t('aiBot.modelsPlaceholder')} autoComplete="off" />
            </TextField>
          ))}
        </div>

        <TextField
          name="systemPrompt"
          value={form.systemPrompt}
          onChange={(v) => patch('systemPrompt', v)}
          className="w-full"
        >
          <Label>{t('aiBot.systemPrompt')}</Label>
          <TextArea rows={4} />
        </TextField>

        <Button type="submit" size="sm" className="self-start" isDisabled={save.isPending}>
          {t('aiBot.save')}
        </Button>
      </Form>
    </AdminPageFrame>
  );
}
