import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Avatar,
  Button,
  Form,
  Input,
  Label,
  Modal,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import {
  resolveAvatarSrc,
  useAddDialogGroupDeputy,
  useAddDialogGroupUsers,
  useCurrentUser,
  useDeleteDialogGroupDeputy,
  useDialogGroupDeputies,
  useDialogMemberIds,
  useDisbandDialogGroup,
  useEditDialogGroup,
  useRemoveDialogGroupUsers,
  useSystemImageUpload,
  useTransferDialogGroup,
  useUserSearch,
  type DialogView,
  type UserSearchHit,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { useNavigate } from 'react-router';
import { ImageSpacePicker } from '../common/ImageSpacePicker';

type Props = {
  dialog: DialogView;
};

/** 普通群：改名 / 头像 / 加人 / 踢人 / 管理员 / 转让 / 退出 / 解散 */
export function GroupManageModal({ dialog }: Props) {
  const { t } = useTranslation('messenger');
  const navigate = useNavigate();
  const state = useOverlayState();
  const { data: me } = useCurrentUser();
  const myId = me?.userId ?? 0;
  const isOwner = dialog.ownerId > 0 && dialog.ownerId === myId;
  const imageUpload = useSystemImageUpload();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const membersQuery = useDialogMemberIds(dialog.id);
  const deputiesQuery = useDialogGroupDeputies(dialog.id, state.isOpen);
  const editGroup = useEditDialogGroup();
  const addUsers = useAddDialogGroupUsers();
  const removeUsers = useRemoveDialogGroupUsers();
  const transfer = useTransferDialogGroup();
  const disband = useDisbandDialogGroup();
  const addDeputy = useAddDialogGroupDeputy();
  const deleteDeputy = useDeleteDialogGroupDeputy();

  const [name, setName] = useState(dialog.name || '');
  const [avatar, setAvatar] = useState(dialog.avatar || '');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    if (state.isOpen) {
      setName(dialog.name || '');
      setAvatar(dialog.avatar || '');
    }
  }, [state.isOpen, dialog.name, dialog.avatar]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const memberIds = membersQuery.data ?? [];
  const deputyIds = deputiesQuery.data ?? [];
  const isDeputy = myId > 0 && deputyIds.includes(myId);
  const canManage = isOwner || isDeputy;
  const searchQuery = useUserSearch(debounced, 20, state.isOpen && debounced.length > 0);
  const hits = (searchQuery.data?.list ?? []).filter(
    (h: UserSearchHit) => h.userId !== myId && !memberIds.includes(h.userId),
  );

  const saveAvatar = (url: string) => {
    const next = url.trim();
    setAvatar(next);
    editGroup.mutate(
      { dialogId: dialog.id, avatar: next },
      {
        onSuccess: () => toast.success(t('groupManage.avatarSaved')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onAvatarFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const uploaded = await imageUpload.mutateAsync(file);
      const url = (uploaded.url || '').trim();
      if (url) saveAvatar(url);
    } catch (err) {
      toastRequestError(err, t('error'));
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const onSaveName = (e: FormEvent) => {
    e.preventDefault();
    const chatName = name.trim();
    if (!chatName) {
      toast.danger(t('groupManage.nameRequired'));
      return;
    }
    editGroup.mutate(
      { dialogId: dialog.id, chatName },
      {
        onSuccess: () => toast.success(t('groupManage.saved')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onAdd = (hit: UserSearchHit) => {
    addUsers.mutate(
      { dialogId: dialog.id, userIds: [hit.userId] },
      {
        onSuccess: () => {
          toast.success(t('groupManage.added'));
          setSearch('');
          setDebounced('');
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onKick = (userId: number) => {
    if (!window.confirm(t('groupManage.kickConfirm', { id: userId }))) return;
    removeUsers.mutate(
      { dialogId: dialog.id, userIds: [userId] },
      {
        onSuccess: () => toast.success(t('groupManage.kicked')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onLeave = () => {
    if (!myId) return;
    if (!window.confirm(t('groupManage.leaveConfirm'))) return;
    removeUsers.mutate(
      { dialogId: dialog.id, userIds: [myId] },
      {
        onSuccess: () => {
          toast.success(t('groupManage.left'));
          state.close();
          navigate('/manage/messenger');
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onTransfer = (userId: number) => {
    if (!window.confirm(t('groupManage.transferConfirm', { id: userId }))) return;
    transfer.mutate(
      { dialogId: dialog.id, userId },
      {
        onSuccess: () => toast.success(t('groupManage.transferred')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onMakeDeputy = (userId: number) => {
    addDeputy.mutate(
      { dialogId: dialog.id, userId },
      {
        onSuccess: () => toast.success(t('groupManage.deputyAdded')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onRevokeDeputy = (userId: number) => {
    deleteDeputy.mutate(
      { dialogId: dialog.id, userId },
      {
        onSuccess: () => toast.success(t('groupManage.deputyRemoved')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDisband = () => {
    if (!window.confirm(t('groupManage.disbandConfirm'))) return;
    disband.mutate(dialog.id, {
      onSuccess: () => {
        toast.success(t('groupManage.disbanded'));
        state.close();
        navigate('/manage/messenger');
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('groupManage.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('groupManage.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar size="lg" className="shrink-0">
                  <Avatar.Image
                    alt=""
                    src={resolveAvatarSrc(avatar, name || dialog.name || `#${dialog.id}`)}
                  />
                  <Avatar.Fallback>{(name || dialog.name || '?').slice(0, 1)}</Avatar.Fallback>
                </Avatar>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={imageUpload.isPending || editGroup.isPending}
                      onPress={() => avatarInputRef.current?.click()}
                    >
                      {imageUpload.isPending
                        ? t('groupManage.avatarUploading')
                        : t('groupManage.changeAvatar')}
                    </Button>
                    <ImageSpacePicker
                      onPick={(file) => {
                        const url = file.url.trim();
                        if (url) saveAvatar(url);
                      }}
                    />
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void onAvatarFile(e.target.files)}
                    />
                  </div>
                ) : null}
              </div>

              <Form className="flex flex-col gap-2" onSubmit={onSaveName}>
                <TextField name="group-name" value={name} onChange={setName} className="w-full">
                  <Label>{t('groupManage.name')}</Label>
                  <Input />
                </TextField>
                <Button
                  type="submit"
                  size="sm"
                  className="self-start"
                  isDisabled={editGroup.isPending || !canManage}
                >
                  {t('groupManage.saveName')}
                </Button>
                {!canManage ? (
                  <p className="text-muted text-xs">{t('groupManage.manageOnly')}</p>
                ) : null}
              </Form>

              <div className="flex flex-col gap-2">
                <Label>{t('groupManage.members')}</Label>
                {membersQuery.isLoading || deputiesQuery.isLoading ? (
                  <p className="text-muted text-xs">{t('loading')}</p>
                ) : null}
                <ul className="border-border divide-border max-h-48 divide-y overflow-auto rounded-lg border">
                  {memberIds.map((id) => {
                    const memberIsOwner = id === dialog.ownerId;
                    const memberIsDeputy = deputyIds.includes(id);
                    const canKick =
                      canManage && !memberIsOwner && id !== myId && !(isDeputy && memberIsDeputy);
                    return (
                      <li key={id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">
                          #{id}
                          {memberIsOwner ? ` · ${t('groupManage.owner')}` : ''}
                          {memberIsDeputy ? ` · ${t('groupManage.deputy')}` : ''}
                          {id === myId ? ` · ${t('groupManage.you')}` : ''}
                        </span>
                        {isOwner && !memberIsOwner ? (
                          <>
                            {memberIsDeputy ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                isDisabled={deleteDeputy.isPending}
                                onPress={() => onRevokeDeputy(id)}
                              >
                                {t('groupManage.revokeDeputy')}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                isDisabled={addDeputy.isPending}
                                onPress={() => onMakeDeputy(id)}
                              >
                                {t('groupManage.makeDeputy')}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              isDisabled={transfer.isPending}
                              onPress={() => onTransfer(id)}
                            >
                              {t('groupManage.transfer')}
                            </Button>
                          </>
                        ) : null}
                        {canKick ? (
                          <Button
                            size="sm"
                            variant="danger"
                            isDisabled={removeUsers.isPending}
                            onPress={() => onKick(id)}
                          >
                            {t('groupManage.kick')}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {canManage ? (
                <div className="flex flex-col gap-2">
                  <Label>{t('groupManage.add')}</Label>
                  <TextField
                    name="group-add-search"
                    value={search}
                    onChange={setSearch}
                    className="w-full"
                  >
                    <Input placeholder={t('groupManage.searchPlaceholder')} />
                  </TextField>
                  {hits.length > 0 ? (
                    <ul className="border-border max-h-32 overflow-auto rounded-lg border">
                      {hits.map((hit: UserSearchHit) => (
                        <li key={hit.userId}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto w-full justify-start rounded-none px-3 py-2 text-left font-normal"
                            isDisabled={addUsers.isPending}
                            onPress={() => onAdd(hit)}
                          >
                            {hit.nickname || hit.email}
                            <span className="text-muted ms-2 text-xs">#{hit.userId}</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t pt-3">
                {!isOwner ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={removeUsers.isPending}
                    onPress={onLeave}
                  >
                    {t('groupManage.leave')}
                  </Button>
                ) : null}
                {isOwner ? (
                  <Button
                    size="sm"
                    variant="danger"
                    isDisabled={disband.isPending}
                    onPress={onDisband}
                  >
                    {t('groupManage.disband')}
                  </Button>
                ) : null}
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
