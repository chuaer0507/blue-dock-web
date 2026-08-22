import { useEffect, useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Checkbox, Modal, toast, useOverlayState } from '@heroui/react';
import {
  PROJECT_PERMISSION_ROLES,
  useProjectPermission,
  useUpdateProjectPermission,
  type ProjectPermissionMatrix,
  type ProjectPermissionRole,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

const FALLBACK_POINTS = [
  'TASK_LIST_ADD',
  'TASK_LIST_UPDATE',
  'TASK_LIST_REMOVE',
  'TASK_LIST_SORT',
  'TASK_ADD',
  'TASK_UPDATE',
  'TASK_TIME',
  'TASK_STATUS',
  'TASK_REMOVE',
  'TASK_ARCHIVED',
  'TASK_MOVE',
] as const;

/** 项目权限矩阵（管理员 / 拥有者可改） */
export function ProjectPermissionModal({
  projectId,
  isPersonal,
  canEdit,
}: {
  projectId: number;
  isPersonal: boolean;
  canEdit: boolean;
}) {
  const { t } = useTranslation('project');
  const state = useOverlayState();
  const query = useProjectPermission(projectId, state.isOpen && !isPersonal);
  const save = useUpdateProjectPermission();
  const [matrix, setMatrix] = useState<ProjectPermissionMatrix>({});

  useEffect(() => {
    if (!query.data) return;
    const next: ProjectPermissionMatrix = {};
    for (const role of PROJECT_PERMISSION_ROLES) {
      next[role] = [...(query.data.permissions[role] ?? [])];
    }
    setMatrix(next);
  }, [query.data]);

  const points = (query.data?.points?.length ? query.data.points : FALLBACK_POINTS) as string[];

  const toggle = (role: ProjectPermissionRole, point: string, on: boolean) => {
    setMatrix((prev) => {
      const cur = new Set(prev[role] ?? []);
      if (on) cur.add(point);
      else cur.delete(point);
      return { ...prev, [role]: [...cur] };
    });
  };

  const onSave = () => {
    save.mutate(
      { projectId, permissions: matrix },
      {
        onSuccess: () => {
          toast.success(t('permission.saved'));
          state.close();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('permission.menu')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-3xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('permission.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-muted text-sm">{t('permission.hint')}</p>
              {isPersonal ? (
                <p className="text-muted text-sm">{t('permission.personalOnly')}</p>
              ) : query.isLoading ? (
                <p className="text-muted text-sm">{t('loading')}</p>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-lg w-full text-left text-sm">
                    <thead className="text-muted text-xs">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">{t('permission.point')}</th>
                        {PROJECT_PERMISSION_ROLES.map((role) => (
                          <th key={role} className="px-2 py-1.5 font-medium">
                            {t(`permission.roles.${role}`)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {points.map((point) => (
                        <tr key={point} className="border-border border-t">
                          <td className="px-2 py-1.5">
                            {t(`permission.points.${point}`, { defaultValue: point })}
                          </td>
                          {PROJECT_PERMISSION_ROLES.map((role) => (
                            <td key={role} className="px-2 py-1.5">
                              <Checkbox
                                isSelected={(matrix[role] ?? []).includes(point)}
                                isDisabled={!canEdit}
                                onChange={(on) => toggle(role, point, on)}
                                aria-label={`${role} ${point}`}
                              >
                                <Checkbox.Content>
                                  <Checkbox.Control>
                                    <Checkbox.Indicator />
                                  </Checkbox.Control>
                                </Checkbox.Content>
                              </Checkbox>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={state.close}>
                {t('permission.close')}
              </Button>
              {!isPersonal && canEdit ? (
                <Button onPress={onSave} isDisabled={save.isPending}>
                  {t('permission.save')}
                </Button>
              ) : null}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
