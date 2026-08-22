import { useEffect, useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Input,
  Label,
  Modal,
  Switch,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import {
  useCurrentUser,
  useFileShare,
  useShareOutFile,
  useUpdateFileShare,
  useUserSearch,
  type FileShareMemberView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

function memberLabel(m: FileShareMemberView): string {
  return m.nickname || m.email || `#${m.userId}`;
}

/** 文件共享成员：添加 / 移除 / 退出共享 */
export function FileShareModal({ fileId }: { fileId: number }) {
  const { t } = useTranslation('file');
  const state = useOverlayState();
  const me = useCurrentUser();
  const myId = me.data?.userId ?? 0;
  const shareQuery = useFileShare(fileId, state.isOpen);
  const updateShare = useUpdateFileShare();
  const shareOut = useShareOutFile();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [writable, setWritable] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const searchQuery = useUserSearch(debounced, 20, state.isOpen && debounced.length > 0);
  const hits = searchQuery.data?.list ?? [];
  const members = shareQuery.data?.members ?? [];
  const memberIds = new Set(members.map((m) => m.userId));

  const fail = (err: unknown) => toastRequestError(err, t('error'));

  const addUser = (userId: number) => {
    updateShare.mutate(
      {
        id: fileId,
        userIds: [userId],
        permission: writable ? 1 : 0,
      },
      {
        onSuccess: () => {
          toast.success(t('share.added'));
          setSearch('');
        },
        onError: fail,
      },
    );
  };

  const removeUser = (userId: number) => {
    if (!window.confirm(t('share.confirmRemove'))) return;
    updateShare.mutate(
      { id: fileId, removeUserIds: [userId] },
      { onSuccess: () => toast.success(t('share.removed')), onError: fail },
    );
  };

  const onShareOut = () => {
    if (!window.confirm(t('share.confirmOut'))) return;
    shareOut.mutate(fileId, {
      onSuccess: () => {
        toast.success(t('share.outDone'));
        state.close();
      },
      onError: fail,
    });
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('share.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('share.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <p className="text-muted text-sm">{t('share.hint')}</p>

              <Switch isSelected={writable} onChange={setWritable}>
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Label>{t('share.writable')}</Label>
                </Switch.Content>
              </Switch>

              <TextField name="shareSearch" value={search} onChange={setSearch} className="w-full">
                <Label>{t('share.search')}</Label>
                <Input placeholder={t('share.search')} />
              </TextField>

              {searchQuery.isLoading && debounced ? (
                <p className="text-muted text-xs">{t('loading')}</p>
              ) : null}
              {debounced && !searchQuery.isLoading && hits.length === 0 ? (
                <p className="text-muted text-xs">{t('share.searchEmpty')}</p>
              ) : null}
              {hits.length > 0 ? (
                <ul className="border-border max-h-40 overflow-auto rounded-lg border">
                  {hits.map((hit) => {
                    const already = memberIds.has(hit.userId) || hit.userId === myId;
                    return (
                      <li
                        key={hit.userId}
                        className="border-border flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
                      >
                        <span className="min-w-0 truncate text-sm">
                          {hit.nickname || hit.email}
                          <span className="text-muted ms-2 text-xs">{hit.email}</span>
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={already || updateShare.isPending}
                          onPress={() => addUser(hit.userId)}
                        >
                          {already ? t('share.already') : t('share.add')}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <div>
                <h3 className="text-sm font-medium">{t('share.members')}</h3>
                {shareQuery.isLoading ? (
                  <p className="text-muted mt-2 text-xs">{t('loading')}</p>
                ) : members.length === 0 ? (
                  <p className="text-muted mt-2 text-xs">{t('share.empty')}</p>
                ) : (
                  <ul className="divide-border mt-2 divide-y">
                    {members.map((m) => (
                      <li key={m.userId} className="flex items-center justify-between gap-2 py-2">
                        <span className="min-w-0 truncate text-sm">
                          {memberLabel(m)}
                          <span className="text-muted ms-2 text-xs">
                            {(m.permission ?? 0) > 0 ? t('share.permWrite') : t('share.permRead')}
                          </span>
                        </span>
                        {m.userId !== myId ? (
                          <Button
                            size="sm"
                            variant="danger"
                            isDisabled={updateShare.isPending}
                            onPress={() => removeUser(m.userId)}
                          >
                            {t('share.remove')}
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-between gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  isDisabled={shareOut.isPending}
                  onPress={onShareOut}
                >
                  {t('share.out')}
                </Button>
                <Button size="sm" variant="secondary" onPress={state.close}>
                  {t('actions.close')}
                </Button>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
