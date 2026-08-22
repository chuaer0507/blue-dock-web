import { useEffect, useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Input, Label, Modal, TextField, toast, useOverlayState } from '@heroui/react';
import {
  useAddProjectDeputy,
  useCreateProjectInvite,
  useCurrentUser,
  useDeleteProjectDeputy,
  useExitProject,
  useProjectMembers,
  useTransferProject,
  useUpdateProjectMembers,
  useUserSearch,
  type ProjectMemberHit,
  type ProjectView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { useNavigate } from 'react-router';

/** 项目成员管理 */
export function ProjectMembersModal({ project }: { project: ProjectView }) {
  const { t } = useTranslation('project');
  const navigate = useNavigate();
  const state = useOverlayState();
  const me = useCurrentUser();
  const myId = me.data?.userId ?? 0;
  const membersQuery = useProjectMembers(project.id, 1, state.isOpen && !project.isPersonal);
  const updateMembers = useUpdateProjectMembers();
  const addDeputy = useAddProjectDeputy();
  const deleteDeputy = useDeleteProjectDeputy();
  const transfer = useTransferProject();
  const exit = useExitProject();
  const createInvite = useCreateProjectInvite();
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteExpired, setInviteExpired] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!state.isOpen) {
      setInviteUrl('');
      setInviteExpired(null);
    }
  }, [state.isOpen]);

  const searchQuery = useUserSearch(debounced, 20, state.isOpen && debounced.length > 0);
  const hits = searchQuery.data?.list ?? [];
  const members = membersQuery.data?.list ?? [];
  const isOwner = project.myOwner === 1;
  const canManage = project.myOwner >= 1;

  const fail = (err: unknown) => toastRequestError(err, t('error'));

  const onCreateInvite = () => {
    createInvite.mutate(project.id, {
      onSuccess: (view) => {
        const url = `${window.location.origin}/manage/project/invite/${view.code}`;
        setInviteUrl(url);
        setInviteExpired(view.expiredAt);
        toast.success(t('invite.created'));
      },
      onError: fail,
    });
  };

  const onCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(t('invite.copied'));
    } catch {
      toast.danger(t('error'));
    }
  };

  const addUser = (hit: { userId: number }) => {
    updateMembers.mutate(
      { projectId: project.id, userIds: [hit.userId] },
      {
        onSuccess: () => {
          toast.success(t('members.add'));
          setSearch('');
        },
        onError: fail,
      },
    );
  };

  const removeUser = (userId: number) => {
    if (!window.confirm(t('members.confirmRemove'))) return;
    updateMembers.mutate(
      { projectId: project.id, removeUserIds: [userId] },
      { onSuccess: () => toast.success(t('members.remove')), onError: fail },
    );
  };

  const onExit = () => {
    if (!window.confirm(t('members.confirmExit'))) return;
    exit.mutate(project.id, {
      onSuccess: () => {
        state.close();
        navigate('/manage/project');
      },
      onError: fail,
    });
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('members.menu')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('members.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-muted text-sm">{t('members.hint')}</p>

              {project.isPersonal ? (
                <p className="text-muted text-sm">{t('permission.personalOnly')}</p>
              ) : (
                <>
                  {canManage ? (
                    <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
                      <p className="text-sm font-medium">{t('invite.create')}</p>
                      <p className="text-muted text-xs">{t('invite.createHint')}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={createInvite.isPending}
                          onPress={onCreateInvite}
                        >
                          {createInvite.isPending ? t('invite.creating') : t('invite.create')}
                        </Button>
                        {inviteUrl ? (
                          <Button size="sm" variant="secondary" onPress={() => void onCopyInvite()}>
                            {t('invite.copy')}
                          </Button>
                        ) : null}
                      </div>
                      {inviteUrl ? (
                        <p className="text-muted break-all text-xs">
                          {inviteUrl}
                          {inviteExpired
                            ? ` · ${t('invite.expires', {
                                time: new Date(inviteExpired).toLocaleString(),
                              })}`
                            : ''}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {canManage ? (
                    <div className="flex flex-col gap-2">
                      <TextField
                        name="memberSearch"
                        value={search}
                        onChange={setSearch}
                        className="w-full"
                      >
                        <Label>{t('members.search')}</Label>
                        <Input placeholder={t('members.search')} />
                      </TextField>
                      {hits.length > 0 ? (
                        <ul className="border-border max-h-36 overflow-auto rounded-lg border">
                          {hits.map((hit) => {
                            const already = members.some((m) => m.userId === hit.userId);
                            return (
                              <li key={hit.userId}>
                                <Button
                                  variant="ghost"
                                  className="h-auto w-full justify-start rounded-none px-3 py-2 text-left text-sm font-normal"
                                  isDisabled={already || updateMembers.isPending}
                                  onPress={() => addUser(hit)}
                                >
                                  {hit.nickname || hit.email}
                                  <span className="text-muted ms-2 text-xs">#{hit.userId}</span>
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : debounced && !searchQuery.isFetching ? (
                        <p className="text-muted text-xs">{t('members.searchEmpty')}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {membersQuery.isLoading ? (
                    <p className="text-muted text-sm">{t('loading')}</p>
                  ) : members.length === 0 ? (
                    <p className="text-muted text-sm">{t('members.empty')}</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {members.map((m: ProjectMemberHit) => {
                        const isProjOwner = m.userId === project.userId;
                        const isMe = m.userId === Number(myId);
                        return (
                          <li
                            key={m.userId}
                            className="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {m.nickname || m.email}
                                {isMe ? (
                                  <span className="text-muted ms-1 text-xs">
                                    {t('members.you')}
                                  </span>
                                ) : null}
                              </p>
                              <p className="text-muted text-xs">
                                #{m.userId}
                                {isProjOwner ? ` · ${t('detail.ownerLevel.1')}` : ''}
                              </p>
                            </div>
                            {canManage && !isProjOwner ? (
                              <div className="flex flex-wrap gap-1">
                                {isOwner ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      isDisabled={addDeputy.isPending}
                                      onPress={() =>
                                        addDeputy.mutate(
                                          { projectId: project.id, userId: m.userId },
                                          {
                                            onSuccess: () => toast.success(t('members.makeAdmin')),
                                            onError: fail,
                                          },
                                        )
                                      }
                                    >
                                      {t('members.makeAdmin')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      isDisabled={deleteDeputy.isPending}
                                      onPress={() =>
                                        deleteDeputy.mutate(
                                          { projectId: project.id, userId: m.userId },
                                          {
                                            onSuccess: () =>
                                              toast.success(t('members.revokeAdmin')),
                                            onError: fail,
                                          },
                                        )
                                      }
                                    >
                                      {t('members.revokeAdmin')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      isDisabled={transfer.isPending}
                                      onPress={() => {
                                        if (!window.confirm(t('members.confirmTransfer'))) return;
                                        transfer.mutate(
                                          { projectId: project.id, userId: m.userId },
                                          {
                                            onSuccess: () => toast.success(t('members.transfer')),
                                            onError: fail,
                                          },
                                        );
                                      }}
                                    >
                                      {t('members.transfer')}
                                    </Button>
                                  </>
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="danger"
                                  isDisabled={updateMembers.isPending}
                                  onPress={() => removeUser(m.userId)}
                                >
                                  {t('members.remove')}
                                </Button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {!isOwner ? (
                    <Button
                      size="sm"
                      variant="danger"
                      className="self-start"
                      isDisabled={exit.isPending}
                      onPress={onExit}
                    >
                      {t('members.exit')}
                    </Button>
                  ) : null}
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={state.close}>
                {t('members.close')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
