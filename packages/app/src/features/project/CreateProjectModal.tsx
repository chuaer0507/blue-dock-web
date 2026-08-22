import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Checkbox,
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import {
  useColumnTemplates,
  useCreateProject,
  useSaveProjectFlow,
  type ProjectView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  onCreated: (project: ProjectView) => void;
  /** 紧凑「+」触发按钮 */
  compact?: boolean;
  /** 仅响应全局事件、不渲染触发按钮（布局层挂载） */
  hideTrigger?: boolean;
  /** 是否监听 `blue-dock:new-project`；默认 true */
  listenGlobal?: boolean;
};

/** 新建项目弹层；团队项目可勾选启用默认工作流；可套用系统列模板 */
export function CreateProjectModal({
  onCreated,
  compact,
  hideTrigger,
  listenGlobal = true,
}: Props) {
  const { t } = useTranslation('project');
  const state = useOverlayState();
  const create = useCreateProject();
  const saveFlow = useSaveProjectFlow();
  const templatesQuery = useColumnTemplates(state.isOpen);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPersonal, setIsPersonal] = useState(false);
  const [enableFlow, setEnableFlow] = useState(false);
  const [columns, setColumns] = useState('');
  const [templateKey, setTemplateKey] = useState('');

  useEffect(() => {
    if (!listenGlobal) return;
    const open = () => state.open();
    window.addEventListener('blue-dock:new-project', open);
    return () => window.removeEventListener('blue-dock:new-project', open);
  }, [listenGlobal, state]);

  const reset = () => {
    setName('');
    setDescription('');
    setIsPersonal(false);
    setEnableFlow(false);
    setColumns('');
    setTemplateKey('');
  };

  const applyTemplate = (key: string) => {
    setTemplateKey(key);
    if (!key || key === '__custom__') return;
    const tpl = (templatesQuery.data ?? []).find((item, idx) => {
      const id = item.name.trim() || `tpl-${idx}`;
      return id === key;
    });
    if (tpl?.columns?.length) {
      setColumns(tpl.columns.join(','));
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const wantFlow = enableFlow && !isPersonal;
    create.mutate(
      {
        name: trimmed,
        ...(description.trim() ? { description: description.trim() } : {}),
        isPersonal: isPersonal ? 1 : 0,
        ...(columns.trim() ? { columns: columns.trim() } : {}),
      },
      {
        onSuccess: (project) => {
          const finish = () => {
            toast.success(t('create.ok'));
            reset();
            state.close();
            onCreated(project);
          };
          if (!wantFlow) {
            finish();
            return;
          }
          saveFlow.mutate(
            { projectId: project.id, name: t('flow.defaultName'), items: [] },
            {
              onSuccess: () => {
                toast.success(t('create.okWithFlow'));
                reset();
                state.close();
                onCreated(project);
              },
              onError: (err) => {
                toastRequestError(err, t('create.flowFailed'));
                reset();
                state.close();
                onCreated(project);
              },
            },
          );
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const pending = create.isPending || saveFlow.isPending;
  const templates = templatesQuery.data ?? [];

  const trigger: ReactNode = hideTrigger ? null : compact ? (
    <Button size="sm" variant="ghost" className="min-w-0 px-2" onPress={state.open}>
      +
    </Button>
  ) : (
    <Button size="sm" variant="primary" onPress={state.open}>
      {t('create.open')}
    </Button>
  );

  return (
    <Modal>
      {trigger}
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('create.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
                <TextField
                  name="name"
                  isRequired
                  value={name}
                  onChange={setName}
                  className="w-full"
                >
                  <Label>{t('create.name')}</Label>
                  <Input placeholder={t('create.namePlaceholder')} autoFocus />
                </TextField>
                <TextField
                  name="description"
                  value={description}
                  onChange={setDescription}
                  className="w-full"
                >
                  <Label>{t('create.description')}</Label>
                  <TextArea rows={3} placeholder={t('create.descriptionPlaceholder')} />
                </TextField>
                <Checkbox
                  isSelected={isPersonal}
                  onChange={(on) => {
                    setIsPersonal(on);
                    if (on) setEnableFlow(false);
                  }}
                  name="isPersonal"
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <div className="flex flex-col gap-0.5">
                      <Label>{t('create.personal')}</Label>
                      <Description>{t('create.personalHint')}</Description>
                    </div>
                  </Checkbox.Content>
                </Checkbox>
                {!isPersonal ? (
                  <Checkbox isSelected={enableFlow} onChange={setEnableFlow} name="enableFlow">
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <div className="flex flex-col gap-0.5">
                        <Label>{t('create.enableFlow')}</Label>
                        <Description>{t('create.enableFlowHint')}</Description>
                      </div>
                    </Checkbox.Content>
                  </Checkbox>
                ) : null}
                {templates.length > 0 ? (
                  <Select
                    className="w-full"
                    value={templateKey || '__custom__'}
                    onChange={(key) => {
                      if (key == null) return;
                      applyTemplate(String(key));
                    }}
                  >
                    <Label>{t('create.columnTemplate')}</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="__custom__" textValue={t('create.columnTemplateCustom')}>
                          {t('create.columnTemplateCustom')}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        {templates.map((tpl, idx) => {
                          const id = tpl.name.trim() || `tpl-${idx}`;
                          const label =
                            tpl.name.trim() ||
                            t('create.columnTemplateUntitled', { index: idx + 1 });
                          return (
                            <ListBox.Item key={id} id={id} textValue={label}>
                              {label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          );
                        })}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                ) : null}
                <TextField name="columns" value={columns} onChange={setColumns} className="w-full">
                  <Label>{t('create.columns')}</Label>
                  <Input placeholder={t('create.columnsPlaceholder')} />
                  <p className="text-muted mt-1 text-xs">{t('create.columnsHint')}</p>
                </TextField>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onPress={state.close}>
                    {t('create.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={!name.trim() || pending}>
                    {pending ? t('create.submitting') : t('create.submit')}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
