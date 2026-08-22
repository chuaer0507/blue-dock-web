import { useState } from 'react';
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
  useCreateDialogSession,
  useDialogSessionList,
  useOpenDialogSession,
  useRenameDialogSession,
  type DialogSessionView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  dialogId: number;
  peerName?: string;
};

/** 系统 AI 机器人邮箱：`ai-*@bot.system`（对齐 dootask isAiBot） */
export function isAiSystemBotEmail(email: string | undefined | null): boolean {
  return Boolean(email && /^ai-.+@bot\.system$/i.test(email.trim()));
}

function formatSessionTime(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
}

/** AI 机器人单聊：新建 / 历史 / 切换 / 重命名（契约 `dialog/session/*`） */
export function DialogSessionPanel({ dialogId, peerName }: Props) {
  const { t } = useTranslation('messenger');
  const history = useOverlayState();
  const listQuery = useDialogSessionList(dialogId, history.isOpen);
  const createSession = useCreateDialogSession();
  const openSession = useOpenDialogSession();
  const renameSession = useRenameDialogSession();
  const [renaming, setRenaming] = useState<DialogSessionView | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  const busy = createSession.isPending || openSession.isPending || renameSession.isPending;

  const onCreate = () => {
    createSession.mutate(
      { dialogId },
      {
        onSuccess: () => toast.success(t('session.created')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onOpenChange = (open: boolean) => {
    history.setOpen(open);
    if (!open) {
      setRenaming(null);
      setRenameTitle('');
    }
  };

  const onOpenSession = (item: DialogSessionView) => {
    if (item.isCurrent) {
      history.close();
      return;
    }
    openSession.mutate(
      { dialogId, sessionId: item.sessionId },
      {
        onSuccess: () => {
          toast.success(t('session.opened'));
          history.close();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const beginRename = (item: DialogSessionView) => {
    setRenaming(item);
    setRenameTitle(item.title || '');
  };

  const onRename = () => {
    if (!renaming) return;
    const title = renameTitle.trim();
    if (!title) {
      toast.danger(t('session.renameRequired'));
      return;
    }
    if (title === (renaming.title || '').trim()) {
      setRenaming(null);
      return;
    }
    renameSession.mutate(
      { dialogId, sessionId: renaming.sessionId, title },
      {
        onSuccess: () => {
          toast.success(t('session.renamed'));
          setRenaming(null);
          setRenameTitle('');
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <>
      <Button size="sm" variant="secondary" isDisabled={busy} onPress={onCreate}>
        {t('session.create')}
      </Button>
      <Button size="sm" variant="secondary" isDisabled={busy} onPress={history.open}>
        {t('session.history')}
      </Button>
      <Modal>
        <Modal.Backdrop isOpen={history.isOpen} onOpenChange={onOpenChange}>
          <Modal.Container size="md" scroll="inside">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {peerName
                    ? t('session.historyTitleWithPeer', { name: peerName })
                    : t('session.historyTitle')}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <p className="text-muted text-xs">{t('session.hint')}</p>
                {listQuery.isLoading ? (
                  <p className="text-muted text-xs">{t('session.loading')}</p>
                ) : null}
                {listQuery.isError ? (
                  <div className="flex items-center gap-2">
                    <p className="text-danger text-xs">{t('session.error')}</p>
                    <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
                      {t('session.retry')}
                    </Button>
                  </div>
                ) : null}
                {!listQuery.isLoading && (listQuery.data?.length ?? 0) === 0 ? (
                  <p className="text-muted text-xs">{t('session.empty')}</p>
                ) : (
                  <ul className="border-border divide-border divide-y overflow-auto rounded-lg border">
                    {(listQuery.data ?? []).map((item) => (
                      <li
                        key={item.sessionId}
                        className="hover:bg-surface flex items-center gap-2 px-3 py-2"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-start"
                          disabled={busy}
                          onClick={() => onOpenSession(item)}
                        >
                          <p className="truncate text-sm">
                            {item.isCurrent ? (
                              <span className="text-accent mr-1 text-[10px] font-medium">
                                {t('session.current')}
                              </span>
                            ) : null}
                            {item.title?.trim() || t('session.untitled')}
                          </p>
                          <p className="text-muted text-[10px]">
                            {formatSessionTime(item.updatedAt ?? item.createdAt, '—')}
                          </p>
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-auto min-h-0 shrink-0 px-1 py-0 text-[10px]"
                          isDisabled={busy}
                          onPress={() => beginRename(item)}
                        >
                          {t('session.rename')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {renaming ? (
                  <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
                    <TextField>
                      <Label>{t('session.renameLabel')}</Label>
                      <Input
                        value={renameTitle}
                        maxLength={255}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        placeholder={t('session.renamePlaceholder')}
                      />
                    </TextField>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => {
                          setRenaming(null);
                          setRenameTitle('');
                        }}
                      >
                        {t('session.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        isDisabled={renameSession.isPending || !renameTitle.trim()}
                        onPress={onRename}
                      >
                        {t('session.saveRename')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Modal.Body>
              <Modal.Footer className="flex justify-end">
                <Button size="sm" variant="secondary" onPress={() => onOpenChange(false)}>
                  {t('session.close')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
