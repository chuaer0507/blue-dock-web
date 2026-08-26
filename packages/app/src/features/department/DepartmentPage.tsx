import { useMemo, useState, type FormEvent } from 'react';
import {
  Button,
  Dropdown,
  Form,
  Input,
  Label,
  Modal,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import {
  buildDepartmentTree,
  identityHas,
  parseIdentityTags,
  useCurrentUser,
  useDeleteDepartment,
  useDepartmentList,
  useAddDeputy,
  useDeleteDeputy,
  useSaveDepartment,
  useSyncDepartment,
  useUserAdminList,
  useUserOperation,
  type DepartmentView,
  type UserAdminView,
  type UserOperationType,
  type UserSearchHit,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { CreateUserModal } from './CreateUserModal';
import { ImportUsersModal } from './ImportUsersModal';
import { UserMultiPicker } from '../common/UserMultiPicker';
import { cn } from '../../utils/cn';
import { toastRequestError } from '../../utils/toast-request-error';

type DeptNode = DepartmentView & { children: DepartmentView[] };

function flattenTree(nodes: DeptNode[], depth = 0): Array<{ dept: DepartmentView; depth: number }> {
  const out: Array<{ dept: DepartmentView; depth: number }> = [];
  for (const n of nodes) {
    out.push({ dept: n, depth });
    if (n.children?.length) {
      out.push(...flattenTree(n.children as DeptNode[], depth + 1));
    }
  }
  return out;
}

function DeptEditorModal({
  initial,
  parentId,
  onDone,
}: {
  initial?: DepartmentView | null;
  parentId?: number;
  onDone?: () => void;
}) {
  const { t } = useTranslation('department');
  const state = useOverlayState();
  const save = useSaveDepartment();
  const addDeputy = useAddDeputy();
  const deleteDeputy = useDeleteDeputy();
  const [name, setName] = useState(initial?.name ?? '');
  const [owner, setOwner] = useState(initial?.ownerUserId ? String(initial.ownerUserId) : '');
  const [deputyId, setDeputyId] = useState('');

  const openCreate = () => {
    setName('');
    setOwner('');
    setDeputyId('');
    state.open();
  };

  const openEdit = () => {
    setName(initial?.name ?? '');
    setOwner(initial?.ownerUserId ? String(initial.ownerUserId) : '');
    setDeputyId('');
    state.open();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      toast.danger(t('dept.nameHint'));
      return;
    }
    const ownerUserId = Number(owner) || undefined;
    save.mutate(
      {
        ...(initial?.id ? { id: initial.id } : {}),
        name: trimmed,
        ...(initial?.id ? {} : { parentId: parentId ?? 0 }),
        ...(ownerUserId ? { ownerUserId } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('dept.save'));
          state.close();
          onDone?.();
        },
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  return (
    <Modal>
      {initial ? (
        <Button size="sm" variant="ghost" onPress={openEdit}>
          {t('dept.edit')}
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onPress={openCreate}>
          {parentId ? t('dept.createChild') : t('dept.create')}
        </Button>
      )}
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{initial ? t('dept.edit') : t('dept.create')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
                <TextField
                  name="name"
                  isRequired
                  value={name}
                  onChange={setName}
                  className="w-full"
                >
                  <Label>{t('dept.name')}</Label>
                  <Input />
                  <p className="text-muted mt-1 text-xs">{t('dept.nameHint')}</p>
                </TextField>
                <TextField name="owner" value={owner} onChange={setOwner} className="w-full">
                  <Label>{t('dept.owner')}</Label>
                  <Input type="number" />
                </TextField>
                {initial?.id ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">{t('dept.deputy')}</p>
                    {(initial.deputyUserIds?.length ?? 0) === 0 ? (
                      <p className="text-muted text-xs">{t('dept.deputyEmpty')}</p>
                    ) : (
                      <ul className="divide-border border-border divide-y rounded-lg border">
                        {(initial.deputyUserIds ?? []).map((uid: number) => (
                          <li
                            key={uid}
                            className="flex items-center justify-between gap-2 px-3 py-2"
                          >
                            <span className="text-sm">#{uid}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              isDisabled={deleteDeputy.isPending}
                              onPress={() =>
                                deleteDeputy.mutate(
                                  { id: initial.id, userId: uid },
                                  {
                                    onSuccess: () => toast.success(t('dept.deputyRemoved')),
                                    onError: (err) => toastRequestError(err, t('error.generic')),
                                  },
                                )
                              }
                            >
                              {t('dept.deputyRemove')}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <TextField
                        name="deputy"
                        value={deputyId}
                        onChange={setDeputyId}
                        className="min-w-0 flex-1"
                        aria-label={t('dept.deputyUserId')}
                      >
                        <Input type="number" placeholder={t('dept.deputyUserId')} />
                      </TextField>
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={addDeputy.isPending || !deputyId.trim()}
                        onPress={() => {
                          const userId = Number(deputyId);
                          if (!Number.isFinite(userId) || userId <= 0) return;
                          addDeputy.mutate(
                            { id: initial.id, userId },
                            {
                              onSuccess: () => {
                                toast.success(t('dept.deputyAdded'));
                                setDeputyId('');
                              },
                              onError: (err) => toastRequestError(err, t('error.generic')),
                            },
                          );
                        }}
                      >
                        {t('dept.deputyAdd')}
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onPress={state.close}>
                    {t('dept.cancel')}
                  </Button>
                  <Button type="submit" isDisabled={save.isPending || !name.trim()}>
                    {t('dept.save')}
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

/** 团队管理：部门树 + 用户列表（管理员） */
export function DepartmentPage() {
  const { t } = useTranslation('department');
  const userQuery = useCurrentUser();
  const isAdmin = identityHas(userQuery.data?.identity, 'admin');

  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [key, setKey] = useState('');
  const [queryKey, setQueryKey] = useState('');
  const [page, setPage] = useState(1);

  const deptQuery = useDepartmentList(isAdmin);
  const usersQuery = useUserAdminList({ key: queryKey, page, pageSize: 20 }, isAdmin);
  const removeDept = useDeleteDepartment();
  const syncDept = useSyncDepartment();
  const userOp = useUserOperation();
  const handoverState = useOverlayState();
  const [disableTargetId, setDisableTargetId] = useState<number | null>(null);
  const [handoverPicked, setHandoverPicked] = useState<UserSearchHit[]>([]);

  const tree = useMemo(() => buildDepartmentTree(deptQuery.data ?? []), [deptQuery.data]);
  const flat = useMemo(() => flattenTree(tree), [tree]);
  const users = usersQuery.data?.list ?? [];
  const total = usersQuery.data?.total ?? 0;
  const pageSize = usersQuery.data?.pageSize ?? 20;
  const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted text-sm">{t('needAdmin')}</p>
      </div>
    );
  }

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setQueryKey(key.trim());
    setPage(1);
  };

  const onDeleteDept = (id: number) => {
    if (!window.confirm(t('dept.deleteConfirm'))) return;
    removeDept.mutate(id, {
      onError: (err) => toastRequestError(err, t('error.generic')),
    });
  };

  const onSync = (id: number) => {
    syncDept.mutate(id, {
      onSuccess: (res) => toast.success(t('dept.syncOk', { count: res.syncedCount ?? 0 })),
      onError: (err) => toastRequestError(err, t('error.generic')),
    });
  };

  const openDisableHandover = (userId: number) => {
    if (!window.confirm(t('row.disableConfirm'))) return;
    setDisableTargetId(userId);
    setHandoverPicked([]);
    handoverState.open();
  };

  const confirmDisableHandover = () => {
    const handoverUserId = handoverPicked[0]?.userId;
    if (!disableTargetId || !handoverUserId) {
      toast.danger(t('row.handoverRequired'));
      return;
    }
    userOp.mutate(
      { type: 'disable', userId: disableTargetId, handoverUserId },
      {
        onSuccess: () => {
          toast.success(t('row.disableOk'));
          handoverState.close();
          setDisableTargetId(null);
          setHandoverPicked([]);
        },
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  const runUserOp = (type: UserOperationType, userId: number) => {
    if (type === 'disable') {
      openDisableHandover(userId);
      return;
    }
    userOp.mutate(
      { type, userId },
      {
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              void deptQuery.refetch();
              void usersQuery.refetch();
            }}
          >
            {t('actions.refresh')}
          </Button>
          <CreateUserModal onCreated={() => void usersQuery.refetch()} />
          <ImportUsersModal onImported={() => void usersQuery.refetch()} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t('dept.default')}</h2>
            <DeptEditorModal />
          </div>
          {deptQuery.isLoading ? <p className="text-muted text-sm">{t('list.loading')}</p> : null}
          {deptQuery.isError ? <p className="text-danger text-sm">{t('error.generic')}</p> : null}
          {!deptQuery.isLoading && flat.length === 0 ? (
            <p className="text-muted text-sm">{t('dept.empty')}</p>
          ) : null}
          <ul className="flex flex-col gap-1 overflow-auto">
            {flat.map(({ dept, depth }) => (
              <li key={dept.id}>
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-2 py-1.5',
                    selectedDeptId === dept.id && 'bg-accent-soft',
                  )}
                  style={{ paddingInlineStart: 8 + depth * 12 }}
                >
                  <Button
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 justify-start px-1 py-0.5 text-left text-sm font-normal"
                    onPress={() => setSelectedDeptId(dept.id)}
                  >
                    {dept.name}
                  </Button>
                  <DeptEditorModal initial={dept} />
                  <DeptEditorModal parentId={dept.id} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-w-0 px-1 text-xs"
                    onPress={() => onSync(dept.id)}
                  >
                    {t('dept.sync')}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    className="min-w-0 px-1 text-xs"
                    onPress={() => onDeleteDept(dept.id)}
                  >
                    {t('dept.delete')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="border-border bg-surface flex min-w-0 flex-col gap-3 rounded-xl border p-4">
          <Form className="flex flex-wrap gap-2" onSubmit={onSearch}>
            <TextField
              name="key"
              value={key}
              onChange={setKey}
              className="min-w-0 flex-1"
              aria-label={t('filter.search')}
            >
              <Input placeholder={t('filter.keyPlaceholder')} />
            </TextField>
            <Button type="submit" size="sm" variant="secondary">
              {t('filter.search')}
            </Button>
          </Form>

          {usersQuery.isLoading ? <p className="text-muted text-sm">{t('list.loading')}</p> : null}
          {usersQuery.isError ? <p className="text-danger text-sm">{t('error.generic')}</p> : null}
          {!usersQuery.isLoading && users.length === 0 ? (
            <p className="text-muted text-sm">{t('list.empty')}</p>
          ) : null}

          {users.length > 0 ? (
            <ul className="divide-border divide-y overflow-auto">
              {users.map((u: UserAdminView) => {
                const tags = parseIdentityTags(u.identity);
                const isUserAdmin = tags.includes('admin');
                const isTemp = tags.includes('temporary');
                const disabled = Boolean(u.disableAt);
                return (
                  <li
                    key={u.userId}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {u.nickname || u.email}
                        <span className="text-muted ms-2 text-xs">#{u.userId}</span>
                      </p>
                      <p className="text-muted truncate text-xs">
                        {u.email}
                        {u.profession ? ` · ${u.profession}` : ''}
                        {' · '}
                        {disabled ? t('status.disabled') : t('status.active')}
                        {isUserAdmin ? ` · ${t('identity.admin')}` : ''}
                        {isTemp ? ` · ${t('identity.temporary')}` : ''}
                      </p>
                    </div>
                    <Dropdown>
                      <Button size="sm" variant="secondary">
                        {t('row.action')}
                      </Button>
                      <Dropdown.Popover>
                        <Dropdown.Menu
                          onAction={(key) => runUserOp(String(key) as UserOperationType, u.userId)}
                        >
                          {!isUserAdmin ? (
                            <Dropdown.Item id="setAdmin" textValue={t('row.setAdmin')}>
                              <Label>{t('row.setAdmin')}</Label>
                            </Dropdown.Item>
                          ) : (
                            <Dropdown.Item id="clearAdmin" textValue={t('row.clearAdmin')}>
                              <Label>{t('row.clearAdmin')}</Label>
                            </Dropdown.Item>
                          )}
                          {!isTemp ? (
                            <Dropdown.Item id="setTemporary" textValue={t('row.setTemporary')}>
                              <Label>{t('row.setTemporary')}</Label>
                            </Dropdown.Item>
                          ) : (
                            <Dropdown.Item id="clearTemporary" textValue={t('row.clearTemporary')}>
                              <Label>{t('row.clearTemporary')}</Label>
                            </Dropdown.Item>
                          )}
                          {!disabled ? (
                            <Dropdown.Item id="disable" textValue={t('row.disable')}>
                              <Label>{t('row.disable')}</Label>
                            </Dropdown.Item>
                          ) : (
                            <Dropdown.Item id="enable" textValue={t('row.enable')}>
                              <Label>{t('row.enable')}</Label>
                            </Dropdown.Item>
                          )}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {total > pageSize ? (
            <div className="mt-auto flex items-center justify-between gap-3 pt-2">
              <p className="text-muted text-xs">{t('pager.total', { count: total })}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('pager.prev')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={page >= maxPage}
                  onPress={() => setPage((p) => Math.min(maxPage, p + 1))}
                >
                  {t('pager.next')}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <Modal>
        <Modal.Backdrop
          isOpen={handoverState.isOpen}
          onOpenChange={(open) => {
            handoverState.setOpen(open);
            if (!open) {
              setDisableTargetId(null);
              setHandoverPicked([]);
            }
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('row.handoverTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <p className="text-muted text-sm">{t('row.handoverHint')}</p>
                <UserMultiPicker
                  picked={handoverPicked}
                  onChange={setHandoverPicked}
                  max={1}
                  excludeUserIds={disableTargetId ? [disableTargetId] : []}
                  enabled={handoverState.isOpen}
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" onPress={handoverState.close}>
                    {t('row.handoverCancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    isDisabled={handoverPicked.length === 0 || userOp.isPending}
                    onPress={confirmDisableHandover}
                  >
                    {userOp.isPending ? t('row.handoverSubmitting') : t('row.handoverSubmit')}
                  </Button>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
