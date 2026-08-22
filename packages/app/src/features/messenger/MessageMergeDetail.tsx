import { Button, Modal, useOverlayState } from '@heroui/react';
import {
  previewMessageBody,
  useDialogMessageMergeDetail,
  type DialogMessageView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

type Props = {
  messageId: number;
  /** 气泡内预览条数；详情弹层展示全量 */
  previewCount?: number;
  previewItems?: unknown[];
  mineStyle?: boolean;
};

/** 合并转发：气泡预览 + 详情弹层（契约 `dialog/message/mergeDetail`） */
export function MessageMergeDetail({
  messageId,
  previewCount = 8,
  previewItems = [],
  mineStyle,
}: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const detail = useDialogMessageMergeDetail(messageId, state.isOpen);
  const muted = mineStyle ? 'text-accent-foreground/80' : 'text-muted';

  const previewRows = previewItems.slice(0, previewCount);
  const more = Math.max(0, previewItems.length - previewCount);

  return (
    <div className="flex flex-col gap-1">
      <p className={cn('text-xs font-medium', muted)}>
        {t('msg.merge', { count: previewItems.length })}
      </p>
      <ul className="flex flex-col gap-1">
        {previewRows.map((item, i) => {
          const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
          const raw =
            typeof row.body === 'string'
              ? row.body
              : row.body != null
                ? JSON.stringify(row.body)
                : '';
          const preview = previewMessageBody(raw) || raw || t('reply.fallback');
          return (
            <li
              key={`${Number(row.messageId) || 0}-${i}`}
              className={cn('wrap-break-word truncate text-xs', muted)}
            >
              {preview}
            </li>
          );
        })}
        {more > 0 ? (
          <li className={cn('text-xs', muted)}>{t('msg.mergeMore', { count: more })}</li>
        ) : null}
      </ul>
      <Modal>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            'h-auto min-h-0 self-start px-1 py-0 text-[10px]',
            mineStyle ? 'text-accent-foreground/90' : '',
          )}
          onPress={state.open}
        >
          {t('msg.mergeDetail')}
        </Button>
        <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
          <Modal.Container size="md" scroll="inside">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('msg.mergeDetailTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-2">
                {detail.isLoading ? <p className="text-muted text-xs">{t('loading')}</p> : null}
                {detail.isError ? <p className="text-danger text-xs">{t('error')}</p> : null}
                {!detail.isLoading && (detail.data?.length ?? 0) === 0 ? (
                  <p className="text-muted text-xs">{t('msg.mergeDetailEmpty')}</p>
                ) : null}
                <ul className="border-border divide-border divide-y overflow-hidden rounded-lg border">
                  {(detail.data ?? []).map((msg: DialogMessageView, i: number) => {
                    const preview = previewMessageBody(msg.body) || msg.body || t('reply.fallback');
                    return (
                      <li key={`${msg.id}-${i}`} className="flex flex-col gap-1 px-3 py-2">
                        <p className="text-muted text-[10px]">
                          {t('msg.mergeItemMeta', {
                            type: msg.type || 'text',
                            id: msg.userId || '—',
                          })}
                        </p>
                        <p className="wrap-break-word whitespace-pre-wrap text-sm">{preview}</p>
                      </li>
                    );
                  })}
                </ul>
              </Modal.Body>
              <Modal.Footer className="flex justify-end">
                <Button size="sm" variant="secondary" onPress={state.close}>
                  {t('msg.mergeDetailClose')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
