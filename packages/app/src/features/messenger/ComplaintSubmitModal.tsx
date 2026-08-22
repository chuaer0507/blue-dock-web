import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Button,
  Form,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import { FlagIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  COMPLAINT_TYPES,
  useSubmitComplaint,
  useSystemImageUpload,
  type ComplaintTypeCode,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';

type Props = {
  dialogId: number;
  /** 紧凑图标按钮（会话头） */
  compact?: boolean;
};

type AttachedImage = {
  path: string;
  previewUrl: string;
};

const MAX_IMAGES = 6;

/** 成员举报当前会话（`complaint/submit`；对象为 dialog，非单条消息） */
export function ComplaintSubmitModal({ dialogId, compact }: Props) {
  const { t } = useTranslation('messenger');
  const state = useOverlayState();
  const submit = useSubmitComplaint();
  const imageUpload = useSystemImageUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<ComplaintTypeCode>(10);
  const [reason, setReason] = useState('');
  const [images, setImages] = useState<AttachedImage[]>([]);

  useEffect(() => {
    if (!state.isOpen) {
      setType(10);
      setReason('');
      setImages([]);
    }
  }, [state.isOpen]);

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.danger(t('complaint.imagesMax', { max: MAX_IMAGES }));
      return;
    }
    const batch = Array.from(files).slice(0, room);
    for (const file of batch) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const uploaded = await imageUpload.mutateAsync(file);
        const path = (uploaded.path || '').trim();
        if (!path) continue;
        setImages((prev) =>
          prev.length >= MAX_IMAGES
            ? prev
            : [...prev, { path, previewUrl: uploaded.url || path }],
        );
      } catch (err) {
        toastRequestError(err, t('complaint.imageFailed'));
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.danger(t('complaint.reasonRequired'));
      return;
    }
    submit.mutate(
      {
        dialogId,
        type,
        reason: trimmed,
        ...(images.length ? { images: images.map((img) => ({ path: img.path })) } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('complaint.ok'));
          state.close();
        },
        onError: (err) => toastRequestError(err, t('complaint.failed')),
      },
    );
  };

  return (
    <Modal>
      {compact ? (
        <Button
          size="sm"
          variant="secondary"
          isIconOnly
          aria-label={t('complaint.open')}
          onPress={state.open}
        >
          <FlagIcon className="size-4" aria-hidden />
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onPress={state.open}>
          <FlagIcon className="size-4" aria-hidden />
          {t('complaint.open')}
        </Button>
      )}
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('complaint.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-muted mb-3 text-sm">{t('complaint.hint')}</p>
              <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
                <Select
                  className="w-full"
                  value={String(type)}
                  onChange={(key) => {
                    if (key == null) return;
                    const n = Number(key);
                    if (COMPLAINT_TYPES.includes(n as ComplaintTypeCode)) {
                      setType(n as ComplaintTypeCode);
                    }
                  }}
                >
                  <Label>{t('complaint.type')}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {COMPLAINT_TYPES.map((code) => (
                        <ListBox.Item
                          key={code}
                          id={String(code)}
                          textValue={t(`complaint.types.${code}`)}
                        >
                          {t(`complaint.types.${code}`)}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <TextField
                  isRequired
                  value={reason}
                  onChange={setReason}
                  className="w-full"
                  name="reason"
                >
                  <Label>{t('complaint.reason')}</Label>
                  <TextArea rows={4} placeholder={t('complaint.reasonPlaceholder')} />
                </TextField>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('complaint.images')}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      isDisabled={imageUpload.isPending || images.length >= MAX_IMAGES}
                      onPress={() => fileRef.current?.click()}
                    >
                      <PhotoIcon className="size-4" aria-hidden />
                      {imageUpload.isPending ? t('complaint.uploading') : t('complaint.addImage')}
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => void onPickFiles(e.target.files)}
                    />
                  </div>
                  <p className="text-muted text-xs">{t('complaint.imagesHint', { max: MAX_IMAGES })}</p>
                  {images.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {images.map((img) => (
                        <li key={img.path} className="relative">
                          <img
                            src={img.previewUrl}
                            alt=""
                            className="border-border size-14 rounded-md border object-cover"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            isIconOnly
                            className="absolute -end-1 -top-1 size-5 min-w-0 rounded-full p-0"
                            aria-label={t('complaint.removeImage')}
                            onPress={() =>
                              setImages((prev) => prev.filter((x) => x.path !== img.path))
                            }
                          >
                            <XMarkIcon className="size-3" aria-hidden />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" onPress={state.close}>
                    {t('complaint.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={submit.isPending}>
                    {submit.isPending ? t('complaint.submitting') : t('complaint.submit')}
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
