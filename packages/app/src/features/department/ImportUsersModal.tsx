import { useRef, useState } from 'react';
import { Button, Modal, Table, toast, useOverlayState } from '@heroui/react';
import {
  downloadUserImportTemplate,
  parseUserImportCsv,
  useImportUsers,
  useImportUsersPreview,
  type UserImportPreviewRow,
  type UserImportPreviewView,
  type UserImportRowInput,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';

/** 管理员批量导入用户：下载模板 → 预览 → 确认导入 */
export function ImportUsersModal({ onImported }: { onImported?: () => void }) {
  const { t } = useTranslation('department');
  const state = useOverlayState();
  const previewMut = useImportUsersPreview();
  const importMut = useImportUsers();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<UserImportRowInput[]>([]);
  const [preview, setPreview] = useState<UserImportPreviewView | null>(null);

  const reset = () => {
    setFileName('');
    setParsedRows([]);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPickFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);

    try {
      const text = await file.text();
      setParsedRows(parseUserImportCsv(text));
    } catch {
      setParsedRows([]);
    }

    previewMut.mutate(file, {
      onSuccess: (data) => setPreview(data),
      onError: (err) => toastRequestError(err, t('error.generic')),
    });
  };

  const onDownloadTemplate = async () => {
    try {
      const blob = await downloadUserImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user-import-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastRequestError(err, t('error.generic'));
    }
  };

  const onConfirm = () => {
    if (!preview) {
      toast.danger(t('import.needFile'));
      return;
    }
    const okEmails = new Set(
      preview.rows.filter((r: UserImportPreviewRow) => r.ok).map((r) => r.email.toLowerCase()),
    );
    const rows = parsedRows.filter(
      (r) => okEmails.has(r.email.toLowerCase()) && r.email && r.nickname && r.password,
    );
    if (rows.length === 0) {
      toast.danger(t('import.needRows'));
      return;
    }
    importMut.mutate(rows, {
      onSuccess: (result) => {
        toast.success(t('import.result', { created: result.created, failed: result.failed }));
        reset();
        state.close();
        onImported?.();
      },
      onError: (err) => toastRequestError(err, t('error.generic')),
    });
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('actions.import')}
      </Button>
      <Modal.Backdrop
        isOpen={state.isOpen}
        onOpenChange={(open) => {
          state.setOpen(open);
          if (!open) reset();
        }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('import.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onPress={() => void onDownloadTemplate()}>
                  {t('import.template')}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => void onPickFile(e.target.files)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={previewMut.isPending}
                  onPress={() => fileRef.current?.click()}
                >
                  {t('import.pick')}
                </Button>
              </div>

              {fileName ? (
                <p className="text-muted text-xs">
                  {fileName}
                  {preview
                    ? ` · ${t('import.okCount', { count: preview.okCount, total: preview.total })}`
                    : null}
                </p>
              ) : null}

              {previewMut.isPending ? (
                <p className="text-muted text-sm">{t('list.loading')}</p>
              ) : null}

              {preview && preview.rows.length > 0 ? (
                <Table variant="secondary" className="w-full">
                  <Table.ScrollContainer className="max-h-64">
                    <Table.Content aria-label={t('import.title')} className="min-w-120">
                      <Table.Header>
                        <Table.Column isRowHeader id="line">
                          {t('import.line')}
                        </Table.Column>
                        <Table.Column id="email">{t('cols.email')}</Table.Column>
                        <Table.Column id="nickname">{t('cols.nickname')}</Table.Column>
                        <Table.Column id="status">{t('import.status')}</Table.Column>
                        <Table.Column id="error">{t('import.error')}</Table.Column>
                      </Table.Header>
                      <Table.Body items={preview.rows}>
                        {(row: UserImportPreviewRow) => (
                          <Table.Row id={row.line} textValue={`${row.line} ${row.email}`}>
                            <Table.Cell>{row.line}</Table.Cell>
                            <Table.Cell>
                              <span className="max-w-32 truncate">{row.email}</span>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="max-w-24 truncate">{row.nickname}</span>
                            </Table.Cell>
                            <Table.Cell>{row.ok ? t('import.ok') : t('import.fail')}</Table.Cell>
                            <Table.Cell>
                              <span className="text-danger max-w-40 truncate">
                                {row.error || '—'}
                              </span>
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onPress={state.close}>
                  {t('import.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  isDisabled={!preview || preview.okCount < 1 || importMut.isPending}
                  onPress={onConfirm}
                >
                  {t('import.submit')}
                </Button>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
