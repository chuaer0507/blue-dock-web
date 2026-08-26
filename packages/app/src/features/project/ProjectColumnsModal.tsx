import { useEffect, useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Input, Label, Modal, TextField, toast, useOverlayState } from '@heroui/react';
import {
  useAddProjectColumn,
  useProjectColumns,
  useRemoveProjectColumn,
  useSortProjectBoard,
  useUpdateProjectColumn,
  type ProjectColumnView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

const COLOR_PRESETS = ['#909399', '#409EFF', '#E6A23C', '#67C23A', '#F56C6C', '#9B59B6'];
const MAX_NAME = 50;

type ColumnCaps = {
  canAdd: boolean;
  canUpdate: boolean;
  canRemove: boolean;
  canSort: boolean;
};

/** 看板列管理：新建 / 改名改色 / 排序 / 删除（至少保留一列）；按 TASK_LIST_* 细粒度门控 */
export function ProjectColumnsModal({
  projectId,
  canAdd,
  canUpdate,
  canRemove,
  canSort,
}: {
  projectId: number;
} & ColumnCaps) {
  const { t } = useTranslation('project');
  const state = useOverlayState();
  const columns = useProjectColumns(projectId);
  const add = useAddProjectColumn();
  const update = useUpdateProjectColumn();
  const remove = useRemoveProjectColumn();
  const sortBoard = useSortProjectBoard();

  const [order, setOrder] = useState<ProjectColumnView[]>([]);
  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState(COLOR_PRESETS[0]!);
  const [editing, setEditing] = useState<ProjectColumnView | null>(null);

  const canOpen = canAdd || canUpdate || canRemove || canSort;

  useEffect(() => {
    if (!state.isOpen) return;
    setOrder(columns.data ?? []);
    setEditing(null);
    setDraftName('');
    setDraftColor(COLOR_PRESETS[0]!);
  }, [state.isOpen, columns.data]);

  const startEdit = (col: ProjectColumnView) => {
    if (!canUpdate) return;
    setEditing(col);
    setDraftName(col.name);
    setDraftColor(col.color || COLOR_PRESETS[0]!);
  };

  const resetDraft = () => {
    setEditing(null);
    setDraftName('');
    setDraftColor(COLOR_PRESETS[0]!);
  };

  const onSave = () => {
    const name = draftName.trim();
    if (!name) {
      toast.danger(t('columns.nameRequired'));
      return;
    }
    if (name.length > MAX_NAME) {
      toast.danger(t('columns.nameTooLong', { max: MAX_NAME }));
      return;
    }
    if (editing) {
      if (!canUpdate) return;
      update.mutate(
        {
          columnId: editing.id,
          projectId,
          name,
          color: draftColor,
        },
        {
          onSuccess: () => {
            toast.success(t('columns.updated'));
            resetDraft();
          },
          onError: (err) => toastRequestError(err, t('error')),
        },
      );
      return;
    }
    if (!canAdd) return;
    add.mutate(
      { projectId, name, color: draftColor },
      {
        onSuccess: () => {
          toast.success(t('columns.created'));
          resetDraft();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDelete = (col: ProjectColumnView) => {
    if (!canRemove) return;
    if (order.length <= 1) {
      toast.danger(t('columns.keepOne'));
      return;
    }
    if (!window.confirm(t('columns.deleteConfirm', { name: col.name }))) return;
    remove.mutate(
      { columnId: col.id, projectId },
      {
        onSuccess: () => {
          toast.success(t('columns.deleted'));
          if (editing?.id === col.id) resetDraft();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const move = (id: number, dir: -1 | 1) => {
    if (!canSort) return;
    setOrder((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [row] = next.splice(idx, 1);
      next.splice(to, 0, row!);
      return next;
    });
  };

  const onSaveOrder = () => {
    if (!canSort) return;
    sortBoard.mutate(
      {
        projectId,
        onlyColumn: true,
        sort: order.map((col) => ({ id: col.id, task: [] })),
      },
      {
        onSuccess: () => toast.success(t('columns.sorted')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  if (!canOpen) return null;

  const saving = add.isPending || update.isPending;

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('columns.menu')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('columns.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-muted text-sm">{t('columns.hint')}</p>
              {columns.isLoading ? (
                <p className="text-muted text-sm">{t('loading')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {order.length === 0 ? (
                    <li className="text-muted text-sm">{t('columns.empty')}</li>
                  ) : (
                    order.map((col, index) => (
                      <li
                        key={col.id}
                        className="border-border flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                      >
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: col.color || COLOR_PRESETS[0] }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {col.name}
                        </span>
                        {canSort ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              isDisabled={index === 0}
                              onPress={() => move(col.id, -1)}
                            >
                              {t('columns.moveUp')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              isDisabled={index === order.length - 1}
                              onPress={() => move(col.id, 1)}
                            >
                              {t('columns.moveDown')}
                            </Button>
                          </>
                        ) : null}
                        {canUpdate ? (
                          <Button size="sm" variant="secondary" onPress={() => startEdit(col)}>
                            {t('columns.edit')}
                          </Button>
                        ) : null}
                        {canRemove ? (
                          <Button
                            size="sm"
                            variant="danger"
                            isDisabled={remove.isPending || order.length <= 1}
                            onPress={() => onDelete(col)}
                          >
                            {t('columns.delete')}
                          </Button>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              )}
              {canSort && order.length > 1 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="self-start"
                  isDisabled={sortBoard.isPending}
                  onPress={onSaveOrder}
                >
                  {sortBoard.isPending ? t('columns.sorting') : t('columns.saveOrder')}
                </Button>
              ) : null}
              {canAdd || editing ? (
                <div className="border-border flex flex-col gap-3 border-t pt-3">
                  <p className="text-sm font-medium">
                    {editing
                      ? t('columns.editTitle', { name: editing.name })
                      : t('columns.createTitle')}
                  </p>
                  <TextField className="w-full" value={draftName} onChange={setDraftName}>
                    <Label>{t('columns.name')}</Label>
                    <Input placeholder={t('columns.namePlaceholder')} />
                  </TextField>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted text-xs">{t('columns.color')}</span>
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="size-6 rounded-full border-2"
                        style={{
                          backgroundColor: c,
                          borderColor: draftColor === c ? 'var(--color-accent)' : 'transparent',
                        }}
                        aria-label={c}
                        onClick={() => setDraftColor(c)}
                      />
                    ))}
                    <TextField className="w-28" value={draftColor} onChange={setDraftColor}>
                      <Label className="sr-only">{t('columns.color')}</Label>
                      <Input />
                    </TextField>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editing ? (
                      <Button size="sm" variant="ghost" onPress={resetDraft}>
                        {t('columns.cancelEdit')}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="primary"
                      isDisabled={saving || !draftName.trim() || (editing ? !canUpdate : !canAdd)}
                      onPress={onSave}
                    >
                      {saving
                        ? t('columns.saving')
                        : editing
                          ? t('columns.saveEdit')
                          : t('columns.create')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={state.close}>
                {t('columns.close')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
