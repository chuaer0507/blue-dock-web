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
  useColumnTemplates,
  useSaveColumnTemplates,
  useSaveSystemGeneralSetting,
  useSaveTaskPriorities,
  useSystemGeneralSetting,
  useTaskPriorities,
  type ColumnTemplateItem,
  type SystemGeneralSetting,
  type TaskPriorityItem,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { AdminPageFrame } from './AdminShell';

function OpenClose({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Checkbox isSelected={value === 'open'} onChange={(on) => onChange(on ? 'open' : 'close')}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Label>{label}</Label>
      </Checkbox.Content>
    </Checkbox>
  );
}

function GeneralTab() {
  const { t } = useTranslation('admin');
  const query = useSystemGeneralSetting();
  const save = useSaveSystemGeneralSetting();
  const [form, setForm] = useState<SystemGeneralSetting | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  if (!form) {
    return <p className="text-muted text-sm">{query.isError ? t('needAdmin') : '…'}</p>;
  }

  const writable = form.writable !== false;
  const patch = <K extends keyof SystemGeneralSetting>(key: K, value: SystemGeneralSetting[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!writable) return;
    save.mutate(form, {
      onSuccess: () => toast.success(t('system.saved')),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
      {!writable ? <p className="text-danger text-sm">{t('system.readOnly')}</p> : null}

      <Select
        className="w-full max-w-xs"
        value={form.passwordType || 'simple'}
        onChange={(key) => {
          if (key != null) patch('passwordType', String(key));
        }}
        isDisabled={!writable}
      >
        <Label>{t('system.passwordType')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="simple" textValue={t('system.passwordSimple')}>
              {t('system.passwordSimple')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="complex" textValue={t('system.passwordComplex')}>
              {t('system.passwordComplex')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>

      <Select
        className="w-full max-w-xs"
        value={form.reg || 'open'}
        onChange={(key) => {
          if (key != null) patch('reg', String(key));
        }}
        isDisabled={!writable}
      >
        <Label>{t('system.reg')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {(
              [
                ['open', 'regOpen'],
                ['invite', 'regInvite'],
                ['close', 'regClose'],
              ] as const
            ).map(([id, label]) => (
              <ListBox.Item key={id} id={id} textValue={t(`system.${label}`)}>
                {t(`system.${label}`)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {form.reg === 'invite' ? (
        <TextField
          name="inviteCode"
          value={form.inviteCode}
          onChange={(v) => patch('inviteCode', v)}
          isDisabled={!writable}
          className="w-full max-w-md"
        >
          <Label>{t('system.inviteCode')}</Label>
          <Input />
        </TextField>
      ) : null}

      <TextField
        name="recall"
        value={String(form.messageRecallLimit)}
        onChange={(v) => patch('messageRecallLimit', Number(v) || 0)}
        isDisabled={!writable}
        className="w-full max-w-xs"
      >
        <Label>{t('system.messageRecallLimit')}</Label>
        <Input type="number" min={0} />
      </TextField>
      <TextField
        name="edit"
        value={String(form.messageEditLimit)}
        onChange={(v) => patch('messageEditLimit', Number(v) || 0)}
        isDisabled={!writable}
        className="w-full max-w-xs"
      >
        <Label>{t('system.messageEditLimit')}</Label>
        <Input type="number" min={0} />
      </TextField>

      <OpenClose
        label={t('system.userPrivateChatMute')}
        value={form.userPrivateChatMute}
        onChange={(v) => patch('userPrivateChatMute', v)}
      />
      <OpenClose
        label={t('system.userGroupChatMute')}
        value={form.userGroupChatMute}
        onChange={(v) => patch('userGroupChatMute', v)}
      />
      <OpenClose
        label={t('system.allGroupMute')}
        value={form.allGroupMute}
        onChange={(v) => patch('allGroupMute', v)}
      />
      <OpenClose
        label={t('system.autoArchive')}
        value={form.autoArchive}
        onChange={(v) => patch('autoArchive', v)}
      />
      {form.autoArchive === 'open' ? (
        <TextField
          name="archiveDay"
          value={String(form.autoArchiveDay)}
          onChange={(v) => patch('autoArchiveDay', Math.min(100, Math.max(1, Number(v) || 1)))}
          isDisabled={!writable}
          className="w-full max-w-xs"
        >
          <Label>{t('system.autoArchiveDay')}</Label>
          <Input type="number" min={1} max={100} />
        </TextField>
      ) : null}

      <Select
        className="w-full max-w-xs"
        value={form.todoPermission || 'allow'}
        onChange={(key) => {
          if (key != null) patch('todoPermission', String(key));
        }}
        isDisabled={!writable}
      >
        <Label>{t('system.todoPermission')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="allow" textValue={t('system.todoAllow')}>
              {t('system.todoAllow')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
            <ListBox.Item id="deny" textValue={t('system.todoDeny')}>
              {t('system.todoDeny')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>

      <OpenClose label={t('system.e2e')} value={form.e2e} onChange={(v) => patch('e2e', v)} />
      <OpenClose
        label={t('system.taskAiAutoAnalyze')}
        value={form.taskAiAutoAnalyze}
        onChange={(v) => patch('taskAiAutoAnalyze', v)}
      />
      <OpenClose
        label={t('system.unclaimedTaskReminder')}
        value={form.unclaimedTaskReminder}
        onChange={(v) => patch('unclaimedTaskReminder', v)}
      />
      {form.unclaimedTaskReminder === 'open' ? (
        <TextField
          name="remindTime"
          value={form.unclaimedTaskReminderTime}
          onChange={(v) => patch('unclaimedTaskReminderTime', v)}
          isDisabled={!writable}
          className="w-full max-w-xs"
        >
          <Label>{t('system.unclaimedTaskReminderTime')}</Label>
          <Input placeholder="09:00" />
        </TextField>
      ) : null}
      <OpenClose
        label={t('system.departmentOwnerProjectView')}
        value={form.departmentOwnerProjectView}
        onChange={(v) => patch('departmentOwnerProjectView', v)}
      />
      <OpenClose
        label={t('system.anonMessage')}
        value={form.anonMessage}
        onChange={(v) => patch('anonMessage', v)}
      />

      <Button
        type="submit"
        size="sm"
        className="self-start"
        isDisabled={!writable || save.isPending}
      >
        {t('system.save')}
      </Button>
    </Form>
  );
}

function PriorityTab() {
  const { t } = useTranslation('admin');
  const query = useTaskPriorities();
  const save = useSaveTaskPriorities();
  const [list, setList] = useState<TaskPriorityItem[]>([]);

  useEffect(() => {
    if (query.data) setList(query.data.map((item) => ({ ...item })));
  }, [query.data]);

  const onSave = () => {
    save.mutate(list, {
      onSuccess: () => toast.success(t('priority.saved')),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted text-xs">{t('priority.hint')}</p>
      {list.map((item, idx) => (
        <div
          key={idx}
          className="border-border flex flex-wrap items-end gap-2 rounded-lg border p-3"
        >
          <TextField
            name={`p-name-${idx}`}
            value={item.name}
            onChange={(v) =>
              setList((prev) => prev.map((row, i) => (i === idx ? { ...row, name: v } : row)))
            }
            className="min-w-32 flex-1"
          >
            <Label>{t('priority.name')}</Label>
            <Input />
          </TextField>
          <TextField
            name={`p-color-${idx}`}
            value={item.color}
            onChange={(v) =>
              setList((prev) => prev.map((row, i) => (i === idx ? { ...row, color: v } : row)))
            }
            className="w-28"
          >
            <Label>{t('priority.color')}</Label>
            <Input />
          </TextField>
          <TextField
            name={`p-days-${idx}`}
            value={String(item.days)}
            onChange={(v) =>
              setList((prev) =>
                prev.map((row, i) => (i === idx ? { ...row, days: Number(v) || 0 } : row)),
              )
            }
            className="w-24"
          >
            <Label>{t('priority.days')}</Label>
            <Input type="number" />
          </TextField>
          <TextField
            name={`p-level-${idx}`}
            value={String(item.priority)}
            onChange={(v) =>
              setList((prev) =>
                prev.map((row, i) => (i === idx ? { ...row, priority: Number(v) || 0 } : row)),
              )
            }
            className="w-24"
          >
            <Label>{t('priority.level')}</Label>
            <Input type="number" />
          </TextField>
          <Checkbox
            isSelected={item.isDefault === 1}
            onChange={(on) =>
              setList((prev) =>
                prev.map((row, i) => ({
                  ...row,
                  isDefault: i === idx ? (on ? 1 : 0) : on ? 0 : row.isDefault,
                })),
              )
            }
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label>{t('priority.isDefault')}</Label>
            </Checkbox.Content>
          </Checkbox>
          <Button
            size="sm"
            variant="danger"
            onPress={() => setList((prev) => prev.filter((_, i) => i !== idx))}
          >
            {t('priority.remove')}
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onPress={() =>
            setList((prev) => [
              ...prev,
              { name: '', color: '#64748b', days: 7, priority: prev.length + 1, isDefault: 0 },
            ])
          }
        >
          {t('priority.add')}
        </Button>
        <Button size="sm" onPress={onSave} isDisabled={save.isPending}>
          {t('priority.save')}
        </Button>
      </div>
    </div>
  );
}

function ColumnTemplateTab() {
  const { t } = useTranslation('admin');
  const query = useColumnTemplates();
  const save = useSaveColumnTemplates();
  const [list, setList] = useState<ColumnTemplateItem[]>([]);

  useEffect(() => {
    if (query.data) setList(query.data.map((item) => ({ ...item, columns: [...item.columns] })));
  }, [query.data]);

  const onSave = () => {
    save.mutate(list, {
      onSuccess: () => toast.success(t('columnTemplate.saved')),
      onError: (err) => toastRequestError(err, t('needAdmin')),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted text-xs">{t('columnTemplate.hint')}</p>
      {list.map((item, idx) => (
        <div key={idx} className="border-border flex flex-col gap-2 rounded-lg border p-3">
          <TextField
            name={`c-name-${idx}`}
            value={item.name}
            onChange={(v) =>
              setList((prev) => prev.map((row, i) => (i === idx ? { ...row, name: v } : row)))
            }
            className="w-full"
          >
            <Label>{t('columnTemplate.name')}</Label>
            <Input />
          </TextField>
          <TextField
            name={`c-cols-${idx}`}
            value={item.columns.join(', ')}
            onChange={(v) =>
              setList((prev) =>
                prev.map((row, i) =>
                  i === idx
                    ? {
                        ...row,
                        columns: v
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }
                    : row,
                ),
              )
            }
            className="w-full"
          >
            <Label>{t('columnTemplate.columns')}</Label>
            <Input placeholder={t('columnTemplate.columnsHint')} />
          </TextField>
          <Button
            size="sm"
            variant="danger"
            className="self-start"
            onPress={() => setList((prev) => prev.filter((_, i) => i !== idx))}
          >
            {t('columnTemplate.remove')}
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onPress={() =>
            setList((prev) => [...prev, { name: '', columns: ['待办', '进行中', '完成'] }])
          }
        >
          {t('columnTemplate.add')}
        </Button>
        <Button size="sm" onPress={onSave} isDisabled={save.isPending}>
          {t('columnTemplate.save')}
        </Button>
      </div>
    </div>
  );
}

/** 系统通用 / 优先级 / 列模板 */
export function SystemAdminPage() {
  const { t } = useTranslation('admin');
  const [tab, setTab] = useState('general');

  return (
    <AdminPageFrame title={t('system.title')} hint={t('system.hint')}>
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('system.title')}>
            <Tabs.Tab id="general">
              {t('system.tabGeneral')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="priority">
              {t('system.tabPriority')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="column">
              {t('system.tabColumnTemplate')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="general" className="pt-4">
          <GeneralTab />
        </Tabs.Panel>
        <Tabs.Panel id="priority" className="pt-4">
          <PriorityTab />
        </Tabs.Panel>
        <Tabs.Panel id="column" className="pt-4">
          <ColumnTemplateTab />
        </Tabs.Panel>
      </Tabs>
    </AdminPageFrame>
  );
}
