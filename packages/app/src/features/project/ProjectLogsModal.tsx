import { useState } from 'react';
import { Button, Modal, useOverlayState } from '@heroui/react';
import { useProjectLogs, type ProjectLogView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** 项目动态（log/lists） */
export function ProjectLogsModal({ projectId }: { projectId: number }) {
  const { t } = useTranslation('project');
  const state = useOverlayState();
  const [page, setPage] = useState(1);
  const logs = useProjectLogs({
    projectId,
    page,
    pageSize: 30,
    enabled: state.isOpen,
  });

  const items = logs.data?.items ?? [];
  const meta = logs.data?.meta;
  const totalPage = meta?.totalPage ?? 1;

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('logs.menu')}
      </Button>
      <Modal.Backdrop
        isOpen={state.isOpen}
        onOpenChange={(open) => {
          state.setOpen(open);
          if (!open) setPage(1);
        }}
      >
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('logs.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              {logs.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
              {logs.isError ? (
                <div className="flex items-center gap-2">
                  <p className="text-danger text-sm">{t('error')}</p>
                  <Button size="sm" variant="secondary" onPress={() => void logs.refetch()}>
                    {t('retry')}
                  </Button>
                </div>
              ) : null}
              {!logs.isLoading && !logs.isError && items.length === 0 ? (
                <p className="text-muted text-sm">{t('logs.empty')}</p>
              ) : null}
              <ul className="flex flex-col gap-2">
                {items.map((log: ProjectLogView) => (
                  <li
                    key={log.id}
                    className="border-border flex flex-col gap-0.5 rounded-lg border px-3 py-2"
                  >
                    <p className="text-sm">{log.detail || '—'}</p>
                    <p className="text-muted text-xs">
                      {[
                        log.projectTask?.name
                          ? `#${log.projectTask.id} ${log.projectTask.name}`
                          : null,
                        [log.time?.ymd, log.time?.hi].filter(Boolean).join(' ') ||
                          (log.createdAt ? new Date(log.createdAt).toLocaleString() : ''),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
              {totalPage > 1 ? (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={page <= 1 || logs.isFetching}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t('logs.prev')}
                  </Button>
                  <span className="text-muted text-xs">
                    {t('logs.page', { page, total: totalPage })}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={page >= totalPage || logs.isFetching}
                    onPress={() => setPage((p) => p + 1)}
                  >
                    {t('logs.next')}
                  </Button>
                </div>
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
