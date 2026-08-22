import { Button, Modal, useOverlayState } from '@heroui/react';
import { useDialogMessageReadList, useUserBasic, type DialogMessageView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

function UserLabel({ userId }: { userId: number }) {
  const { data } = useUserBasic(userId);
  return <span>{data?.nickname?.trim() || `#${userId}`}</span>;
}

type Props = {
  message: DialogMessageView;
  /** 单聊时对方 userId；用于简写「已读/未读」 */
  peerUserId?: number;
  className?: string;
};

/** 自己发出的消息：已读回执入口（单聊状态 / 群聊明细） */
export function MessageReadReceipt({ message, peerUserId, className }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const readList = useDialogMessageReadList(message.id, state.isOpen || peerUserId != null);

  const reads = readList.data?.reads ?? [];
  const unreads = readList.data?.unreads ?? [];

  let triggerLabel = t('read.open');
  if (peerUserId != null && readList.data) {
    triggerLabel = reads.includes(peerUserId) ? t('read.dmRead') : t('read.dmUnread');
  } else if (state.isOpen && readList.data) {
    triggerLabel = t('read.summary', { read: reads.length, unread: unreads.length });
  }

  return (
    <Modal>
      <Button
        size="sm"
        variant="ghost"
        className={cn('h-auto min-h-0 px-1 py-0 text-[10px]', className)}
        onPress={state.open}
      >
        {triggerLabel}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-sm">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('read.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              {readList.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
              {readList.isError ? (
                <div className="flex items-center gap-2">
                  <p className="text-danger text-sm">{t('error')}</p>
                  <Button size="sm" variant="secondary" onPress={() => void readList.refetch()}>
                    {t('retry')}
                  </Button>
                </div>
              ) : null}
              {!readList.isLoading && !readList.isError ? (
                <>
                  <section>
                    <h3 className="mb-2 text-xs font-medium">
                      {t('read.readSection', { count: reads.length })}
                    </h3>
                    {reads.length === 0 ? (
                      <p className="text-muted text-xs">{t('read.emptyRead')}</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {reads.map((id) => (
                          <li key={id} className="text-sm">
                            <UserLabel userId={id} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section>
                    <h3 className="mb-2 text-xs font-medium">
                      {t('read.unreadSection', { count: unreads.length })}
                    </h3>
                    {unreads.length === 0 ? (
                      <p className="text-muted text-xs">{t('read.emptyUnread')}</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {unreads.map((id) => (
                          <li key={id} className="text-muted text-sm">
                            <UserLabel userId={id} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
