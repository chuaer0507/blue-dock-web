import { useEffect, useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Input,
  Label,
  Modal,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import {
  useDeleteProjectTag,
  useProjectTagList,
  useSaveProjectTag,
  useSortProjectTags,
  type ProjectTagView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

const COLOR_PRESETS = ['#909399', '#409EFF', '#E6A23C', '#67C23A', '#F56C6C', '#9B59B6'];
const MAX_TAGS = 50;
const MAX_NAME = 20;

/** 项目标签 CRUD（管理权限） */
export function ProjectTagsModal({
  projectId,
  canEdit,
}: {
  projectId: number;
  canEdit: boolean;
}) {
  const { t } = useTranslation('project');
  const state = useOverlayState();
  const tags = useProjectTagList(projectId, state.isOpen);
  const save = useSaveProjectTag();
  const remove = useDeleteProjectTag();
  const sort = useSortProjectTags();

  const [draftName, setDraftName] = useState('');
  const [draftColor, setDraftColor] = useState(COLOR_PRESETS[0]!);
  const [editing, setEditing] = useState<ProjectTagView | null>(null);
  const [order, setOrder] = useState<ProjectTagView[]>([]);

  useEffect(() => {
    if (!state.isOpen) return;
    setOrder(tags.data ?? []);
    setEditing(null);
    setDraftName('');
    setDraftColor(COLOR_PRESETS[0]!);
  }, [state.isOpen, tags.data]);

  const startEdit = (tag: ProjectTagView) => {
    setEditing(tag);
    setDraftName(tag.name);
    setDraftColor(tag.color || COLOR_PRESETS[0]!);
  };

  const resetDraft = () => {
    setEditing(null);
    setDraftName('');
    setDraftColor(COLOR_PRESETS[0]!);
  };

  const onSave = () => {
    const name = draftName.trim();
    if (!name) {
      toast.danger(t('tags.nameRequired'));
      return;
    }
    if (name.length > MAX_NAME) {
      toast.danger(t('tags.nameTooLong', { max: MAX_NAME }));
      return;
    }
    if (!editing && order.length >= MAX_TAGS) {
      toast.danger(t('tags.limit', { max: MAX_TAGS }));
      return;
    }
    save.mutate(
      {
        projectId,
        ...(editing ? { id: editing.id } : {}),
        name,
        color: draftColor,
      },
      {
        onSuccess: () => {
          toast.success(editing ? t('tags.updated') : t('tags.created'));
          resetDraft();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDelete = (tag: ProjectTagView) => {
    if (!window.confirm(t('tags.deleteConfirm', { name: tag.name }))) return;
    remove.mutate(
      { id: tag.id, projectId },
      {
        onSuccess: () => {
          toast.success(t('tags.deleted'));
          if (editing?.id === tag.id) resetDraft();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const move = (id: number, dir: -1 | 1) => {
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
    sort.mutate(
      { projectId, list: order.map((x) => x.id) },
      {
        onSuccess: () => toast.success(t('tags.sorted')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  if (!canEdit) return null;

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('tags.menu')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('tags.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-muted text-sm">{t('tags.hint')}</p>
              {tags.isLoading ? (
                <p className="text-muted text-sm">{t('loading')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {order.length === 0 ? (
                    <li className="text-muted text-sm">{t('tags.empty')}</li>
                  ) : (
                    order.map((tag, index) => (
                      <li
                        key={tag.id}
                        className="border-border flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                      >
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: tag.color || COLOR_PRESETS[0] }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {tag.name}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          isDisabled={index === 0}
                          onPress={() => move(tag.id, -1)}
                        >
                          {t('tags.moveUp')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          isDisabled={index === order.length - 1}
                          onPress={() => move(tag.id, 1)}
                        >
                          {t('tags.moveDown')}
                        </Button>
                        <Button size="sm" variant="secondary" onPress={() => startEdit(tag)}>
                          {t('tags.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isDisabled={remove.isPending}
                          onPress={() => onDelete(tag)}
                        >
                          {t('tags.delete')}
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {order.length > 1 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="self-start"
                  isDisabled={sort.isPending}
                  onPress={onSaveOrder}
                >
                  {sort.isPending ? t('tags.sorting') : t('tags.saveOrder')}
                </Button>
              ) : null}
              <div className="border-border flex flex-col gap-3 border-t pt-3">
                <p className="text-sm font-medium">
                  {editing ? t('tags.editTitle', { name: editing.name }) : t('tags.createTitle')}
                </p>
                <TextField
                  className="w-full"
                  value={draftName}
                  onChange={setDraftName}
                  maxLength={MAX_NAME}
                >
                  <Label>{t('tags.name')}</Label>
                  <Input placeholder={t('tags.namePlaceholder')} />
                </TextField>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted text-xs">{t('tags.color')}</span>
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
                  <TextField
                    className="w-28"
                    value={draftColor}
                    onChange={setDraftColor}
                  >
                    <Label className="sr-only">{t('tags.color')}</Label>
                    <Input />
                  </TextField>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editing ? (
                    <Button size="sm" variant="ghost" onPress={resetDraft}>
                      {t('tags.cancelEdit')}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="primary"
                    isDisabled={save.isPending || !draftName.trim()}
                    onPress={onSave}
                  >
                    {save.isPending
                      ? t('tags.saving')
                      : editing
                        ? t('tags.saveEdit')
                        : t('tags.create')}
                  </Button>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={state.close}>
                {t('tags.close')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
