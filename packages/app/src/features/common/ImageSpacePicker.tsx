import type { ReactNode } from 'react';
import { Button, Label, Modal, useOverlayState } from '@heroui/react';
import { useSystemImageView, type ImageViewFile } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type Props = {
  /** 选中后回填图片 URL */
  onPick: (file: ImageViewFile) => void;
  /** 自定义触发按钮；默认「从图片空间选择」 */
  trigger?: (open: () => void) => ReactNode;
};

/** 本人 `system/imageView` 图片空间选图 */
export function ImageSpacePicker({ onPick, trigger }: Props) {
  const { t } = useTranslation('common');
  const state = useOverlayState();
  const query = useSystemImageView(undefined, state.isOpen);
  const files = query.data?.files ?? [];

  const onSelect = (file: ImageViewFile) => {
    if (!file.url?.trim()) return;
    onPick(file);
    state.close();
  };

  return (
    <>
      {trigger ? (
        trigger(() => state.open())
      ) : (
        <Button size="sm" variant="secondary" onPress={() => state.open()}>
          {t('imageSpace.open')}
        </Button>
      )}
      <Modal isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('imageSpace.title')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <p className="text-muted text-xs">{t('imageSpace.hint')}</p>
                {query.isLoading ? (
                  <p className="text-muted text-sm">{t('imageSpace.loading')}</p>
                ) : query.isError ? (
                  <p className="text-danger text-sm">{t('imageSpace.error')}</p>
                ) : files.length === 0 ? (
                  <p className="text-muted text-sm">{t('imageSpace.empty')}</p>
                ) : (
                  <ul className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                    {files.map((file) => (
                      <li key={file.id || file.path || file.url}>
                        <button
                          type="button"
                          className="border-border hover:border-primary focus-visible:ring-focus flex w-full flex-col gap-1 rounded-lg border p-1.5 text-left outline-none focus-visible:ring-2"
                          onClick={() => onSelect(file)}
                        >
                          <img
                            src={file.thumbnail || file.url}
                            alt={file.title}
                            className="bg-default aspect-square w-full rounded object-cover"
                          />
                          <Label className="truncate text-[10px] font-normal">{file.title}</Label>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => state.close()}>
                  {t('imageSpace.close')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
