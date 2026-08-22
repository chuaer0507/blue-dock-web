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
  Tabs,
  TextField,
  toast,
} from '@heroui/react';
import {
  useFileSetting,
  useOssCheck,
  useOssSetting,
  useSaveFileSetting,
  useSaveOssSetting,
  type FileSetting,
  type OssCloudKeys,
  type OssSetting,
  type UserSearchHit,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';
import { UserMultiPicker, userIdsCsv } from '../common/UserMultiPicker';

function parsePackUserHits(csv: string): UserSearchHit[] {
  return [
    ...new Set(
      csv
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ].map((userId) => ({
    userId,
    email: '',
    nickname: `#${userId}`,
    profession: '',
    userImage: '',
    nameAz: '',
  }));
}

function FileTab() {
  const { t } = useTranslation('admin');
  const query = useFileSetting();
  const save = useSaveFileSetting();
  const [form, setForm] = useState<FileSetting | null>(null);
  const [packUsers, setPackUsers] = useState<UserSearchHit[]>([]);

  useEffect(() => {
    if (query.data) {
      setForm(query.data);
      setPackUsers(parsePackUserHits(query.data.packUserIds || ''));
    }
  }, [query.data]);

  if (!form) return <p className="text-muted text-sm">…</p>;

  const patch = <K extends keyof FileSetting>(key: K, value: FileSetting[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const onPackUsersChange = (picked: UserSearchHit[]) => {
    setPackUsers(picked);
    patch('packUserIds', userIdsCsv(picked));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      packUserIds: form.packPermission === 'user' ? userIdsCsv(packUsers) : form.packUserIds,
    };
    save.mutate(payload, {
      onSuccess: () => toast.success(t('file.saved')),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <p className="text-muted text-xs">{t('file.hint')}</p>
      <TextField
        name="maxMb"
        value={form.uploadMaxMb}
        onChange={(v) => patch('uploadMaxMb', v)}
        className="w-40"
      >
        <Label>{t('file.uploadMaxMb')}</Label>
        <Input />
      </TextField>
      <Select
        className="w-full max-w-xs"
        value={form.packPermission || 'all'}
        onChange={(key) => {
          if (key != null) patch('packPermission', String(key));
        }}
      >
        <Label>{t('file.packPermission')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {(
              [
                ['all', 'packAll'],
                ['admin', 'packAdmin'],
                ['user', 'packUser'],
              ] as const
            ).map(([id, label]) => (
              <ListBox.Item key={id} id={id} textValue={t(`file.${label}`)}>
                {t(`file.${label}`)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {form.packPermission === 'user' ? (
        <div className="border-border max-w-lg rounded-lg border p-3">
          <p className="mb-2 text-sm font-medium">{t('file.packUserIds')}</p>
          <p className="text-muted mb-2 text-xs">{t('file.packUserHint')}</p>
          <UserMultiPicker picked={packUsers} onChange={onPackUsersChange} max={50} />
        </div>
      ) : null}
      {(
        [
          ['imageOptimize', 'imageOptimize'],
          ['saveInternetImage', 'saveInternetImage'],
          ['videoTranscode', 'videoTranscode'],
        ] as const
      ).map(([key, label]) => (
        <Checkbox
          key={key}
          isSelected={form[key] === 'open'}
          onChange={(on) => patch(key, on ? 'open' : 'close')}
        >
          {t(`file.${label}`)}
        </Checkbox>
      ))}
      <Button type="submit" size="sm" className="self-start" isDisabled={save.isPending}>
        {t('file.save')}
      </Button>
    </Form>
  );
}

function cloudPatch(
  form: OssSetting,
  provider: keyof Pick<OssSetting, 'local' | 'huawei' | 'aliyun' | 'tencent' | 'qiniu'>,
  key: keyof OssCloudKeys,
  value: string,
): OssSetting {
  const prev = form[provider] ?? {};
  return { ...form, [provider]: { ...prev, [key]: value } };
}

function OssTab() {
  const { t } = useTranslation('admin');
  const query = useOssSetting();
  const save = useSaveOssSetting();
  const check = useOssCheck();
  const [form, setForm] = useState<OssSetting | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  if (!form) return <p className="text-muted text-sm">…</p>;

  const provider = (form.provider || 'local') as
    'local' | 'huawei' | 'aliyun' | 'tencent' | 'qiniu';
  const cloud = form[provider] ?? {};

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, {
      onSuccess: () => toast.success(t('oss.saved')),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <p className="text-muted text-xs">{t('oss.hint')}</p>
      <Select
        className="w-full max-w-xs"
        value={provider}
        onChange={(key) => {
          if (key != null) setForm((prev) => (prev ? { ...prev, provider: String(key) } : prev));
        }}
      >
        <Label>{t('oss.provider')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {(['local', 'huawei', 'aliyun', 'tencent', 'qiniu'] as const).map((id) => (
              <ListBox.Item key={id} id={id} textValue={t(`oss.providers.${id}`)}>
                {t(`oss.providers.${id}`)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <TextField
        name="ext"
        value={form.allowExtensions}
        onChange={(v) => setForm((prev) => (prev ? { ...prev, allowExtensions: v } : prev))}
        className="w-full"
      >
        <Label>{t('oss.allowExtensions')}</Label>
        <Input />
      </TextField>
      <TextField
        name="protocol"
        value={form.protocol}
        onChange={(v) => setForm((prev) => (prev ? { ...prev, protocol: v } : prev))}
        className="w-40"
      >
        <Label>{t('oss.protocol')}</Label>
        <Input />
      </TextField>
      <TextField
        name="domain"
        value={form.domain}
        onChange={(v) => setForm((prev) => (prev ? { ...prev, domain: v } : prev))}
        className="w-full"
      >
        <Label>{t('oss.domain')}</Label>
        <Input />
      </TextField>

      {provider === 'local' ? (
        <TextField
          name="path"
          value={cloud.storagePath ?? ''}
          onChange={(v) =>
            setForm((prev) => (prev ? cloudPatch(prev, 'local', 'storagePath', v) : prev))
          }
          className="w-full"
        >
          <Label>{t('oss.storagePath')}</Label>
          <Input />
        </TextField>
      ) : (
        <>
          {(
            [
              ['endpoint', 'endpoint'],
              ['region', 'region'],
              ['bucket', 'bucket'],
            ] as const
          ).map(([key, label]) => (
            <TextField
              key={key}
              name={key}
              value={cloud[key] ?? ''}
              onChange={(v) =>
                setForm((prev) => (prev ? cloudPatch(prev, provider, key, v) : prev))
              }
              className="w-full"
            >
              <Label>{t(`oss.${label}`)}</Label>
              <Input />
            </TextField>
          ))}
          <TextField
            name="ak"
            value={cloud.accessKey ?? cloud.accessKeyId ?? cloud.secretId ?? ''}
            onChange={(v) => {
              const field =
                provider === 'aliyun'
                  ? 'accessKeyId'
                  : provider === 'tencent'
                    ? 'secretId'
                    : 'accessKey';
              setForm((prev) => (prev ? cloudPatch(prev, provider, field, v) : prev));
            }}
            className="w-full"
          >
            <Label>
              {provider === 'aliyun'
                ? t('oss.accessKeyId')
                : provider === 'tencent'
                  ? t('oss.secretId')
                  : t('oss.accessKey')}
            </Label>
            <Input />
          </TextField>
          <TextField
            name="sk"
            value={cloud.secretKey ?? cloud.accessKeySecret ?? ''}
            onChange={(v) => {
              const field = provider === 'aliyun' ? 'accessKeySecret' : 'secretKey';
              setForm((prev) => (prev ? cloudPatch(prev, provider, field, v) : prev));
            }}
            className="w-full"
          >
            <Label>{provider === 'aliyun' ? t('oss.accessKeySecret') : t('oss.secretKey')}</Label>
            <Input type="password" placeholder={t('oss.secretHint')} autoComplete="off" />
          </TextField>
        </>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" isDisabled={save.isPending}>
          {t('oss.save')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={check.isPending}
          onPress={() =>
            check.mutate(undefined, {
              onSuccess: (res) =>
                toast.success(t('oss.checkOk', { provider: res.provider, url: res.url })),
              onError: (err) => toastRequestError(err, t('needAdmin')),
            })
          }
        >
          {t('oss.check')}
        </Button>
      </div>
    </Form>
  );
}

/** 文件与对象存储 */
export function StorageAdminPage() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('file');

  return (
    <AdminPageFrame title={t('storage.title')}>
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('storage.title')}>
            <Tabs.Tab id="file">
              {t('file.title')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="oss">
              {t('oss.title')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="file" className="pt-4">
          <FileTab />
        </Tabs.Panel>
        <Tabs.Panel id="oss" className="pt-4">
          <OssTab />
        </Tabs.Panel>
      </Tabs>
    </AdminPageFrame>
  );
}
