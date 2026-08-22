import { useEffect, useMemo, useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Checkbox,
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
  useDeleteProjectFlow,
  useProjectColumns,
  useProjectFlowList,
  useSaveProjectFlow,
  type ProjectFlowItemView,
  type ProjectFlowView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

const FLOW_STATUSES = ['start', 'progress', 'test', 'end'] as const;
const MAX_ITEMS = 10;
const COLOR_PRESETS = ['#909399', '#409EFF', '#E6A23C', '#67C23A', '#F56C6C', '#9B59B6'];

type DraftItem = {
  key: string;
  id?: number;
  name: string;
  status: string;
  color: string;
  columnId: number;
  turnKeys: string[];
};

function newKey(): string {
  return `k-${Math.random().toString(36).slice(2, 10)}`;
}

function draftsFromFlow(flow: ProjectFlowView | undefined): { name: string; items: DraftItem[] } {
  if (!flow) return { name: '', items: [] };
  const idToKey = new Map<number, string>();
  const items: DraftItem[] = (flow.items ?? []).map((it: ProjectFlowItemView) => {
    const key = newKey();
    idToKey.set(it.id, key);
    return {
      key,
      id: it.id,
      name: it.name,
      status: it.status || 'progress',
      color: it.color || COLOR_PRESETS[0]!,
      columnId: it.columnId > 0 ? it.columnId : 0,
      turnKeys: [],
    };
  });
  for (let i = 0; i < items.length; i++) {
    const src = flow.items[i];
    if (!src) continue;
    items[i]!.turnKeys = (src.turns ?? [])
      .map((tid) => idToKey.get(tid))
      .filter((k): k is string => Boolean(k));
  }
  return { name: flow.name, items };
}

/** 团队项目工作流配置（管理权限）：启用默认节点 / 编辑节点 / 绑定列 / 流转 */
export function ProjectFlowModal({
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
  const flows = useProjectFlowList(projectId, state.isOpen && !isPersonal);
  const columns = useProjectColumns(projectId, undefined);
  const save = useSaveProjectFlow();
  const remove = useDeleteProjectFlow();

  const activeFlow = useMemo(() => {
    const list = flows.data ?? [];
    return list[0];
  }, [flows.data]);

  const [name, setName] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);

  useEffect(() => {
    if (!state.isOpen) return;
    const next = draftsFromFlow(activeFlow);
    setName(next.name || t('flow.defaultName'));
    setItems(next.items);
  }, [state.isOpen, activeFlow, t]);

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const toggleTurn = (fromKey: string, toKey: string, on: boolean) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== fromKey) return it;
        const set = new Set(it.turnKeys);
        if (on) set.add(toKey);
        else set.delete(toKey);
        return { ...it, turnKeys: [...set] };
      }),
    );
  };

  const addItem = () => {
    if (items.length >= MAX_ITEMS) {
      toast.danger(t('flow.itemsLimit', { max: MAX_ITEMS }));
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        key: newKey(),
        name: t('flow.newItem'),
        status: 'progress',
        color: COLOR_PRESETS[prev.length % COLOR_PRESETS.length]!,
        columnId: 0,
        turnKeys: [],
      },
    ]);
  };

  const removeItem = (key: string) => {
    setItems((prev) =>
      prev
        .filter((it) => it.key !== key)
        .map((it) => ({ ...it, turnKeys: it.turnKeys.filter((k) => k !== key) })),
    );
  };

  const moveItem = (key: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.key === key);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [row] = next.splice(idx, 1);
      next.splice(to, 0, row!);
      return next;
    });
  };

  const buildPayloadItems = () =>
    items.map((it, sort) => {
      const turns = it.turnKeys
        .map((k) => {
          const idx = items.findIndex((x) => x.key === k);
          if (idx < 0) return null;
          const target = items[idx]!;
          return target.id != null && target.id > 0 ? target.id : idx;
        })
        .filter((n): n is number => n != null);
      return {
        ...(it.id != null && it.id > 0 ? { id: it.id } : {}),
        name: it.name.trim(),
        status: it.status,
        color: it.color,
        sort,
        columnId: it.columnId > 0 ? it.columnId : 0,
        turns,
      };
    });

  const onEnableDefault = () => {
    save.mutate(
      { projectId, name: t('flow.defaultName'), items: [] },
      {
        onSuccess: () => toast.success(t('flow.enabled')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onSave = () => {
    if (items.some((it) => !it.name.trim())) {
      toast.danger(t('flow.itemNameRequired'));
      return;
    }
    save.mutate(
      {
        projectId,
        ...(activeFlow?.id ? { id: activeFlow.id } : {}),
        name: name.trim() || t('flow.defaultName'),
        items: buildPayloadItems(),
      },
      {
        onSuccess: () => {
          toast.success(t('flow.saved'));
          state.close();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDelete = () => {
    if (!activeFlow?.id) return;
    if (!window.confirm(t('flow.deleteConfirm'))) return;
    remove.mutate(
      { id: activeFlow.id, projectId },
      {
        onSuccess: () => {
          toast.success(t('flow.deleted'));
          setItems([]);
          setName(t('flow.defaultName'));
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  if (!canEdit || isPersonal) return null;

  const columnOptions = columns.data ?? [];
  const hasFlow = Boolean(activeFlow?.id);

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('flow.menu')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog className="sm:max-w-3xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('flow.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-muted text-sm">{t('flow.hint')}</p>
              {flows.isLoading ? (
                <p className="text-muted text-sm">{t('loading')}</p>
              ) : !hasFlow && items.length === 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-muted text-sm">{t('flow.none')}</p>
                  <Button
                    size="sm"
                    variant="primary"
                    isDisabled={save.isPending}
                    onPress={onEnableDefault}
                  >
                    {save.isPending ? t('flow.enabling') : t('flow.enableDefault')}
                  </Button>
                </div>
              ) : (
                <>
                  <TextField name="flow-name" value={name} onChange={setName} className="w-full">
                    <Label>{t('flow.name')}</Label>
                    <Input />
                  </TextField>
                  <div className="flex flex-col gap-3">
                    {items.map((it, index) => (
                      <div
                        key={it.key}
                        className="border-border flex flex-col gap-2 rounded-lg border p-3"
                      >
                        <div className="flex flex-wrap items-end gap-2">
                          <TextField
                            className="min-w-40 flex-1"
                            value={it.name}
                            onChange={(v) => updateItem(it.key, { name: v })}
                          >
                            <Label>{t('flow.itemName')}</Label>
                            <Input />
                          </TextField>
                          <Select
                            className="min-w-28"
                            value={it.status}
                            onChange={(key) =>
                              updateItem(it.key, { status: String(key ?? 'progress') })
                            }
                          >
                            <Label>{t('flow.status')}</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                {FLOW_STATUSES.map((s) => (
                                  <ListBox.Item key={s} id={s} textValue={t(`flow.statuses.${s}`)}>
                                    {t(`flow.statuses.${s}`)}
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          <Select
                            className="min-w-36"
                            value={it.columnId > 0 ? String(it.columnId) : '0'}
                            onChange={(key) =>
                              updateItem(it.key, { columnId: Number(key ?? 0) || 0 })
                            }
                          >
                            <Label>{t('flow.column')}</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="0" textValue={t('flow.columnNone')}>
                                  {t('flow.columnNone')}
                                </ListBox.Item>
                                {columnOptions.map((col) => (
                                  <ListBox.Item
                                    key={col.id}
                                    id={String(col.id)}
                                    textValue={col.name}
                                  >
                                    {col.name}
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted text-xs">{t('flow.color')}</span>
                          {COLOR_PRESETS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="size-6 rounded-full border-2"
                              style={{
                                backgroundColor: c,
                                borderColor: it.color === c ? 'var(--color-accent)' : 'transparent',
                              }}
                              aria-label={c}
                              onClick={() => updateItem(it.key, { color: c })}
                            />
                          ))}
                          <TextField
                            className="w-28"
                            value={it.color}
                            onChange={(v) => updateItem(it.key, { color: v })}
                          >
                            <Label className="sr-only">{t('flow.color')}</Label>
                            <Input />
                          </TextField>
                        </div>
                        <div>
                          <p className="text-muted mb-1 text-xs">{t('flow.turns')}</p>
                          <div className="flex flex-wrap gap-3">
                            {items
                              .filter((other) => other.key !== it.key)
                              .map((other) => (
                                <Checkbox
                                  key={other.key}
                                  isSelected={it.turnKeys.includes(other.key)}
                                  onChange={(on) => toggleTurn(it.key, other.key, on)}
                                >
                                  {other.name || t('flow.newItem')}
                                </Checkbox>
                              ))}
                            {items.length <= 1 ? (
                              <span className="text-muted text-xs">{t('flow.turnsEmpty')}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            isDisabled={index === 0}
                            onPress={() => moveItem(it.key, -1)}
                          >
                            {t('flow.moveUp')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            isDisabled={index === items.length - 1}
                            onPress={() => moveItem(it.key, 1)}
                          >
                            {t('flow.moveDown')}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            isDisabled={items.length <= 1}
                            onPress={() => removeItem(it.key)}
                          >
                            {t('flow.removeItem')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={items.length >= MAX_ITEMS}
                      onPress={addItem}
                    >
                      {t('flow.addItem')}
                    </Button>
                    {hasFlow ? (
                      <Button
                        size="sm"
                        variant="danger"
                        isDisabled={remove.isPending}
                        onPress={onDelete}
                      >
                        {t('flow.delete')}
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={state.close}>
                {t('flow.close')}
              </Button>
              {hasFlow || items.length > 0 ? (
                <Button
                  variant="primary"
                  isDisabled={save.isPending || items.length === 0}
                  onPress={onSave}
                >
                  {save.isPending ? t('flow.saving') : t('flow.save')}
                </Button>
              ) : null}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
