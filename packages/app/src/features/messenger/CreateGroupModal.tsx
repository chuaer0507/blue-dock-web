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
  useCreateDialogGroup,
  useCurrentUser,
  useSystemImageUpload,
  useUserSearch,
  type UserSearchHit,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { useNavigate } from 'react-router';
import { ImageSpacePicker } from '../common/ImageSpacePicker';

/** 新建普通群聊 */
export function CreateGroupModal({
  hideTrigger,
  listenGlobal = true,
}: {
  /** 仅响应全局事件、不渲染触发按钮（布局层挂载） */
  hideTrigger?: boolean;
  /** 是否监听 `blue-dock:new-group`；默认 true */
  listenGlobal?: boolean;
} = {}) {
  const { t } = useTranslation('messenger');
  const navigate = useNavigate();
  const state = useOverlayState();
  const me = useCurrentUser();
  const myId = me.data?.userId ?? 0;
  const createGroup = useCreateDialogGroup();
  const imageUpload = useSystemImageUpload();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<UserSearchHit[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!listenGlobal) return;
    const open = () => state.open();
    window.addEventListener('blue-dock:new-group', open);
    return () => window.removeEventListener('blue-dock:new-group', open);
  }, [listenGlobal, state]);

  const searchQuery = useUserSearch(debounced, 20, state.isOpen && debounced.length > 0);
  const hits = (searchQuery.data?.list ?? []).filter(
    (h) => h.userId !== myId && !picked.some((p) => p.userId === h.userId),
  );

  const reset = () => {
    setName('');
    setAvatar('');
    setSearch('');
    setDebounced('');
    setPicked([]);
  };

  const onAvatarFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const uploaded = await imageUpload.mutateAsync(file);
      const url = (uploaded.url || '').trim();
      if (url) setAvatar(url);
    } catch (err) {
      toastRequestError(err, t('error'));
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (picked.length < 1) {
      toast.danger(t('createGroup.needMembers'));
      return;
    }
    const userIds = [...new Set([myId, ...picked.map((p) => p.userId)])].filter((id) => id > 0);
    createGroup.mutate(
      {
        chatName: name.trim() || undefined,
        userIds,
        ...(avatar.trim() ? { avatar: avatar.trim() } : {}),
      },
      {
        onSuccess: (dialog) => {
          toast.success(t('createGroup.submit'));
          state.close();
          reset();
          navigate(`/manage/messenger/${dialog.id}`);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      {hideTrigger ? null : (
        <Button size="sm" variant="primary" onPress={state.open}>
          {t('createGroup.open')}
        </Button>
      )}
      <Modal.Backdrop
        isOpen={state.isOpen}
        onOpenChange={(open) => {
          state.setOpen(open);
          if (!open) reset();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('createGroup.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar size="lg" className="shrink-0">
                    <Avatar.Image
                      alt=""
                      src={resolveAvatarSrc(avatar, name || t('createGroup.title'))}
                    />
                    <Avatar.Fallback>{(name || '?').slice(0, 1)}</Avatar.Fallback>
                  </Avatar>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      isDisabled={imageUpload.isPending}
                      onPress={() => avatarInputRef.current?.click()}
                    >
                      {imageUpload.isPending
                        ? t('createGroup.avatarUploading')
                        : t('createGroup.changeAvatar')}
                    </Button>
                    <ImageSpacePicker
                      onPick={(file) => {
                        const url = file.url.trim();
                        if (url) setAvatar(url);
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
                </div>

                <TextField name="groupName" value={name} onChange={setName} className="w-full">
                  <Label>{t('createGroup.name')}</Label>
                  <Input placeholder={t('createGroup.namePlaceholder')} />
                </TextField>

                <TextField
                  name="memberSearch"
                  value={search}
                  onChange={setSearch}
                  className="w-full"
                >
                  <Label>{t('createGroup.search')}</Label>
                  <Input placeholder={t('createGroup.search')} />
                </TextField>
                <p className="text-muted text-xs">{t('createGroup.hint')}</p>

                {searchQuery.isLoading && debounced ? (
                  <p className="text-muted text-xs">{t('loading')}</p>
                ) : null}
                {debounced && !searchQuery.isLoading && hits.length === 0 ? (
                  <p className="text-muted text-xs">{t('createGroup.searchEmpty')}</p>
                ) : null}
                {hits.length > 0 ? (
                  <ul className="border-border max-h-36 overflow-auto rounded-lg border">
                    {hits.map((hit) => (
                      <li
                        key={hit.userId}
                        className="border-border flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
                      >
                        <span className="min-w-0 truncate text-sm">
                          {hit.nickname || hit.email}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => setPicked((prev) => [...prev, hit])}
                        >
                          {t('createGroup.add')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div>
                  <h3 className="text-sm font-medium">{t('createGroup.members')}</h3>
                  {picked.length === 0 ? (
                    <p className="text-muted mt-2 text-xs">{t('createGroup.empty')}</p>
                  ) : (
                    <ul className="divide-border mt-2 divide-y">
                      {picked.map((p) => (
                        <li key={p.userId} className="flex items-center justify-between gap-2 py-2">
                          <span className="truncate text-sm">{p.nickname || p.email}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={() =>
                              setPicked((prev) => prev.filter((x) => x.userId !== p.userId))
                            }
                          >
                            {t('createGroup.remove')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onPress={state.close}>
                    {t('createGroup.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={picked.length < 1 || createGroup.isPending}
                  >
                    {t('createGroup.submit')}
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
