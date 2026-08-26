import { useEffect, useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Switch,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import { useRemoveProject, useUpdateProject, type ProjectView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  project: ProjectView;
  canEdit: boolean;
  isOwner: boolean;
  onRemoved?: () => void;
};

function asOpenClose(v: string | null | undefined): 'open' | 'close' {
  return v === 'close' ? 'close' : 'open';
}

/** 项目设置：名称 / 描述 / 归档策略 / 开关项；拥有者可软删 */
export function ProjectSettingsModal({ project, canEdit, isOwner, onRemoved }: Props) {
  const { t } = useTranslation('project');
  const state = useOverlayState();
  const update = useUpdateProject();
  const remove = useRemoveProject();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [archiveMethod, setArchiveMethod] = useState(
    project.archiveMethod === 'custom' ? 'custom' : 'system',
  );
  const [archiveDays, setArchiveDays] = useState(String(project.archiveDays || 30));
  const [aiAutoAnalyze, setAiAutoAnalyze] = useState(asOpenClose(project.aiAutoAnalyze) === 'open');
  const [taskTemplateShare, setTaskTemplateShare] = useState(
    asOpenClose(project.taskTemplateShare) === 'open',
  );
  const [departmentOwnerView, setDepartmentOwnerView] = useState(
    asOpenClose(project.departmentOwnerView) === 'open',
  );

  useEffect(() => {
    if (!state.isOpen) return;
    setName(project.name);
    setDescription(project.description ?? '');
    setArchiveMethod(project.archiveMethod === 'custom' ? 'custom' : 'system');
    setArchiveDays(String(project.archiveDays > 0 ? project.archiveDays : 30));
    setAiAutoAnalyze(asOpenClose(project.aiAutoAnalyze) === 'open');
    setTaskTemplateShare(asOpenClose(project.taskTemplateShare) === 'open');
    setDepartmentOwnerView(asOpenClose(project.departmentOwnerView) === 'open');
  }, [state.isOpen, project]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.danger(t('settings.nameRequired'));
      return;
    }
    const days = Number(archiveDays);
    if (archiveMethod === 'custom' && (!Number.isFinite(days) || days < 1 || days > 365)) {
      toast.danger(t('settings.archiveDaysInvalid'));
      return;
    }
    update.mutate(
      {
        projectId: project.id,
        name: trimmed,
        description,
        archiveMethod: archiveMethod === 'custom' ? 'custom' : 'system',
        ...(archiveMethod === 'custom' ? { archiveDays: days } : {}),
        aiAutoAnalyze: aiAutoAnalyze ? 'open' : 'close',
        taskTemplateShare: taskTemplateShare ? 'open' : 'close',
        ...(project.isPersonal
          ? {}
          : { departmentOwnerView: departmentOwnerView ? 'open' : 'close' }),
      },
      {
        onSuccess: () => {
          toast.success(t('settings.saved'));
          state.close();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDelete = () => {
    if (!isOwner) return;
    if (!window.confirm(t('settings.deleteConfirm', { name: project.name }))) return;
    remove.mutate(project.id, {
      onSuccess: () => {
        toast.success(t('settings.deleted'));
        state.close();
        onRemoved?.();
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  if (!canEdit) return null;

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('settings.menu')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('settings.title')}</Modal.Heading>
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
                  <Label>{t('settings.name')}</Label>
                  <Input />
                </TextField>
                <TextField
                  name="description"
                  value={description}
                  onChange={setDescription}
                  className="w-full"
                >
                  <Label>{t('settings.description')}</Label>
                  <TextArea rows={3} />
                </TextField>
                <Select
                  className="w-full"
                  value={archiveMethod}
                  onChange={(key) => setArchiveMethod(String(key ?? 'system'))}
                >
                  <Label>{t('settings.archiveMethod')}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="system" textValue={t('settings.archiveSystem')}>
                        {t('settings.archiveSystem')}
                      </ListBox.Item>
                      <ListBox.Item id="custom" textValue={t('settings.archiveCustom')}>
                        {t('settings.archiveCustom')}
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
                {archiveMethod === 'custom' ? (
                  <TextField
                    name="archiveDays"
                    value={archiveDays}
                    onChange={setArchiveDays}
                    className="w-full sm:max-w-xs"
                  >
                    <Label>{t('settings.archiveDays')}</Label>
                    <Input type="number" min={1} max={365} />
                    <p className="text-muted mt-1 text-xs">{t('settings.archiveDaysHint')}</p>
                  </TextField>
                ) : null}
                <Switch isSelected={aiAutoAnalyze} onChange={setAiAutoAnalyze}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <div className="flex flex-col gap-0.5">
                      <Label>{t('settings.aiAutoAnalyze')}</Label>
                      <p className="text-muted text-xs">{t('settings.aiAutoAnalyzeHint')}</p>
                    </div>
                  </Switch.Content>
                </Switch>
                <Switch isSelected={taskTemplateShare} onChange={setTaskTemplateShare}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <div className="flex flex-col gap-0.5">
                      <Label>{t('settings.taskTemplateShare')}</Label>
                      <p className="text-muted text-xs">{t('settings.taskTemplateShareHint')}</p>
                    </div>
                  </Switch.Content>
                </Switch>
                {!project.isPersonal ? (
                  <Switch isSelected={departmentOwnerView} onChange={setDepartmentOwnerView}>
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      <div className="flex flex-col gap-0.5">
                        <Label>{t('settings.departmentOwnerView')}</Label>
                        <p className="text-muted text-xs">
                          {t('settings.departmentOwnerViewHint')}
                        </p>
                      </div>
                    </Switch.Content>
                  </Switch>
                ) : null}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" onPress={state.close}>
                    {t('settings.close')}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={update.isPending}>
                    {update.isPending ? t('settings.saving') : t('settings.save')}
                  </Button>
                </div>
              </Form>
              {isOwner ? (
                <div className="border-border mt-4 border-t pt-4">
                  <p className="text-muted mb-2 text-sm">{t('settings.dangerZone')}</p>
                  <Button
                    size="sm"
                    variant="danger"
                    isDisabled={remove.isPending}
                    onPress={onDelete}
                  >
                    {remove.isPending ? t('settings.deleting') : t('settings.delete')}
                  </Button>
                </div>
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
