import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar, Button, Label, Modal, useOverlayState } from '@heroui/react';
import { useDialogCommonCount, useDialogCommonList } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

const PAGE_SIZE = 20;

type Props = {
  /** 对方 userId；共同普通个人群 */
  targetUserId: number;
  peerName?: string;
};

/** 与对方的共同普通个人群（`dialog/common/list`） */
export function CommonGroupsModal({ targetUserId, peerName }: Props) {
  const { t } = useTranslation('messenger');
  const navigate = useNavigate();
  const state = useOverlayState();
  const [page, setPage] = useState(1);

  const countQuery = useDialogCommonCount(targetUserId, true);
  const listQuery = useDialogCommonList(targetUserId, page, PAGE_SIZE, state.isOpen);

  const total = countQuery.data ?? listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) setPage(1);
  };

  const openDialog = (dialogId: number) => {
    state.close();
    navigate(`/manage/messenger/${dialogId}`);
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('commonGroups.open')}
        {total > 0 ? ` (${total})` : ''}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={onOpenChange}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {peerName
                  ? t('commonGroups.titleWithPeer', { name: peerName })
                  : t('commonGroups.title')}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted text-xs">{t('commonGroups.hint')}</p>
              {listQuery.isLoading ? (
                <p className="text-muted text-xs">{t('commonGroups.loading')}</p>
              ) : null}
              {listQuery.isError ? (
                <div className="flex items-center gap-2">
                  <p className="text-danger text-xs">{t('commonGroups.error')}</p>
                  <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
                    {t('commonGroups.retry')}
                  </Button>
                </div>
              ) : null}
              {!listQuery.isLoading && (listQuery.data?.list.length ?? 0) === 0 ? (
                <p className="text-muted text-xs">{t('commonGroups.empty')}</p>
              ) : (
                <ul className="border-border divide-border max-h-80 divide-y overflow-auto rounded-lg border">
                  {(listQuery.data?.list ?? []).map((d, index) => (
                    <li key={d.id > 0 ? d.id : `row-${index}`}>
                      <button
                        type="button"
                        className="hover:bg-surface flex w-full items-center gap-3 px-3 py-2 text-start"
                        onClick={() => openDialog(d.id)}
                      >
                        <Avatar size="sm">
                          {d.avatar ? <Avatar.Image alt="" src={d.avatar} /> : null}
                          <Avatar.Fallback>{(d.name || '?').slice(0, 1)}</Avatar.Fallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{d.name || `#${d.id}`}</p>
                          {d.lastMessage ? (
                            <p className="text-muted truncate text-xs">{d.lastMessage}</p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {total > PAGE_SIZE ? (
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-muted text-xs">
                    {t('commonGroups.page', { page, totalPages })}
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={page <= 1 || listQuery.isFetching}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      {t('commonGroups.prev')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={page >= totalPages || listQuery.isFetching}
                      onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      {t('commonGroups.next')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Modal.Body>
            <Modal.Footer className="flex justify-end">
              <Button size="sm" variant="secondary" onPress={state.close}>
                {t('commonGroups.close')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
