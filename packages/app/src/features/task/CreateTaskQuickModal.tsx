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
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import {
  projectMemberHasPoint,
  useCreateTask,
  useProjectList,
  useProjectPermission,
  useTaskTemplateVisible,
  type ProjectView,
  type TaskTemplateView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { useNavigate } from 'react-router';

type OverlayState = ReturnType<typeof useOverlayState>;

/** 应用中心等入口：选项目 + 标题快建任务（可选套用可见模板） */
export function CreateTaskQuickModal({ state }: { state: OverlayState }) {
  const { t } = useTranslation('task');
  const navigate = useNavigate();
  const projects = useProjectList({ archived: 'no', type: 'all' });
  const createTask = useCreateTask();

  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const pid = Number(projectId) || 0;
  const templates = useTaskTemplateVisible(pid > 0 ? pid : undefined, pid > 0);

  const list = projects.data ?? [];
  const selected = list.find((p: ProjectView) => p.id === pid);
  const myOwner = selected?.myOwner ?? 0;
  const editOpen = Boolean(selected && !selected.departmentReadonly && !selected.archivedAt);
  const permissionQuery = useProjectPermission(
    pid > 0 ? pid : undefined,
    Boolean(selected) && !selected?.isPersonal && myOwner === 0,
  );
  const canAdd = editOpen && projectMemberHasPoint(myOwner, permissionQuery.data, 'TASK_ADD');

  useEffect(() => {
    setTemplateId('');
  }, [projectId]);

  const reset = () => {
    setProjectId('');
    setName('');
    setTemplateId('');
  };

  const onPickTemplate = (key: string) => {
    setTemplateId(key === '0' ? '' : key);
    const id = Number(key);
    if (!Number.isFinite(id) || id <= 0) return;
    const tpl = (templates.data ?? []).find((x: TaskTemplateView) => x.id === id);
    if (!tpl) return;
    const title = (tpl.title || tpl.name || '').trim();
    if (title) setName(title);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const project = Number(projectId);
    const title = name.trim();
    if (!Number.isFinite(project) || project <= 0 || !title) {
      toast.danger(t('createQuick.required'));
      return;
    }
    if (!canAdd) {
      toast.danger(t('createQuick.denied'));
      return;
    }
    const tplId = Number(templateId);
    createTask.mutate(
      {
        projectId: project,
        name: title,
        ...(Number.isFinite(tplId) && tplId > 0 ? { templateId: tplId } : {}),
      },
      {
        onSuccess: (task) => {
          toast.success(t('createQuick.ok'));
          state.close();
          reset();
          navigate(`/single/task/${task.id}`);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={state.isOpen}
        onOpenChange={(open) => {
          state.setOpen(open);
          if (!open) reset();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('createQuick.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
                <Select
                  className="w-full"
                  value={projectId || undefined}
                  onChange={(key) => setProjectId(String(key ?? ''))}
                  isDisabled={projects.isLoading || list.length === 0}
                >
                  <Label>{t('createQuick.project')}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {list.map((p: ProjectView) => (
                        <ListBox.Item key={p.id} id={String(p.id)} textValue={p.name}>
                          {p.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                {list.length === 0 && !projects.isLoading ? (
                  <p className="text-muted text-xs">{t('createQuick.emptyProjects')}</p>
                ) : null}
                {pid > 0 && !canAdd && !permissionQuery.isLoading ? (
                  <p className="text-danger text-xs">{t('createQuick.denied')}</p>
                ) : null}
                {pid > 0 ? (
                  <Select
                    className="w-full"
                    value={templateId || undefined}
                    onChange={(key) => onPickTemplate(String(key ?? ''))}
                    isDisabled={templates.isLoading || !canAdd}
                  >
                    <Label>{t('createQuick.template')}</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="0" textValue={t('createQuick.templateNone')}>
                          {t('createQuick.templateNone')}
                        </ListBox.Item>
                        {(templates.data ?? []).map((tpl: TaskTemplateView) => (
                          <ListBox.Item
                            key={tpl.id}
                            id={String(tpl.id)}
                            textValue={tpl.name || tpl.title || String(tpl.id)}
                          >
                            {tpl.name || tpl.title || `#${tpl.id}`}
                            {tpl.projectName ? ` · ${tpl.projectName}` : ''}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                ) : null}
                <TextField
                  name="taskName"
                  value={name}
                  onChange={setName}
                  isRequired
                  className="w-full"
                  isDisabled={!canAdd && pid > 0}
                >
                  <Label>{t('createQuick.name')}</Label>
                  <Input placeholder={t('createQuick.namePlaceholder')} />
                </TextField>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onPress={state.close}>
                    {t('createQuick.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={
                      createTask.isPending ||
                      list.length === 0 ||
                      (pid > 0 && !canAdd) ||
                      permissionQuery.isLoading
                    }
                  >
                    {t('createQuick.submit')}
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
