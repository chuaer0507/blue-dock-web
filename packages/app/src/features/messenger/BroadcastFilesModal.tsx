import { useEffect, useRef, useState } from 'react';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Label, Modal, toast, useOverlayState } from '@heroui/react';
import { useSendDialogFiles } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { ShareTargetPicker } from '../common/ShareTargetPicker';

const MAX_FILES = 20;
const MAX_TARGETS = 20;

/** 群发本地文件到多会话（`dialog/message/sendFiles`） */
export function BroadcastFilesModal() {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const sendFiles = useSendDialogFiles();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    if (!state.isOpen) {
      setFiles([]);
      setPicked([]);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [state.isOpen]);

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...files];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i);
      if (!f || f.size <= 0) continue;
      if (next.length >= MAX_FILES) {
        toast.danger(t('broadcastFiles.maxFiles', { max: MAX_FILES }));
        break;
      }
      next.push(f);
    }
    setFiles(next);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onSubmit = () => {
    if (files.length === 0) {
      toast.danger(t('broadcastFiles.needFiles'));
      return;
    }
    if (picked.length === 0) {
      toast.danger(t('broadcastFiles.needTargets'));
      return;
    }
    sendFiles.mutate(
      { dialogIds: picked, files },
      {
        onSuccess: () => {
          toast.success(
            t('broadcastFiles.done', { files: files.length, dialogs: picked.length }),
          );
          state.close();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="secondary" onPress={state.open}>
        {t('broadcastFiles.open')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('broadcastFiles.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-muted text-xs">{t('broadcastFiles.hint')}</p>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onPickFiles(e.target.files)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => inputRef.current?.click()}
                  isDisabled={sendFiles.isPending || files.length >= MAX_FILES}
                >
                  {t('broadcastFiles.pick')}
                </Button>
                <Label className="text-muted text-xs">
                  {t('broadcastFiles.fileCount', { count: files.length, max: MAX_FILES })}
                </Label>
              </div>
              {files.length > 0 ? (
                <ul className="border-border divide-border max-h-32 divide-y overflow-auto rounded-lg border text-xs">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-auto min-h-0 px-1 py-0 text-[10px]"
                        isDisabled={sendFiles.isPending}
                        onPress={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        {t('broadcastFiles.remove')}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <ShareTargetPicker
                mode="multiple"
                selectedIds={picked}
                onChange={setPicked}
                maxTargets={MAX_TARGETS}
                enabled={state.isOpen}
              />
              <Label className="text-muted text-xs">
                {t('broadcastFiles.picked', { count: picked.length, max: MAX_TARGETS })}
              </Label>
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onPress={state.close}>
                {t('broadcastFiles.cancel')}
              </Button>
              <Button
                size="sm"
                isDisabled={sendFiles.isPending || files.length === 0 || picked.length === 0}
                onPress={onSubmit}
              >
                {sendFiles.isPending ? t('broadcastFiles.sending') : t('broadcastFiles.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
