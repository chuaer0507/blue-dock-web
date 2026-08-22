import { useEffect, useState } from 'react';
import { Button, SearchField, toast } from '@heroui/react';
import { FaceSmileIcon } from '@heroicons/react/24/outline';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  useDialogStickerSearch,
  useSendDialogSticker,
  type DialogStickerView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

type Props = {
  dialogId: number;
  replyId?: number;
  disabled?: boolean;
  onSent?: () => void;
};

/** 在线表情：搜索 + 点击发送（契约 `sticker/search` · `sendSticker`） */
export function StickerPickerPanel({ dialogId, replyId, disabled, onSent }: Props) {
  const { t } = useTranslation('messenger');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const search = useDialogStickerSearch(debounced, open);
  const send = useSendDialogSticker();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebounced('');
    }
  }, [open]);

  const onPick = (item: DialogStickerView) => {
    send.mutate(
      {
        dialogId,
        src: item.src,
        ...(item.name ? { name: item.name } : {}),
        ...(replyId ? { replyId } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('sticker.sent'));
          setOpen(false);
          onSent?.();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant={open ? 'primary' : 'secondary'}
        isIconOnly
        isDisabled={disabled}
        aria-label={t('sticker.open')}
        aria-expanded={open}
        onPress={() => setOpen((v) => !v)}
      >
        <FaceSmileIcon className="size-4" aria-hidden />
      </Button>
      {open ? (
        <div
          className={cn(
            'border-border bg-surface absolute bottom-full z-20 mb-2 w-72 rounded-lg border p-2 shadow-md',
            'inset-s-0',
          )}
        >
          <SearchField
            aria-label={t('sticker.search')}
            value={query}
            onChange={setQuery}
            className="w-full"
            autoFocus
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('sticker.search')} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <div className="mt-2 max-h-48 overflow-auto">
            {!debounced ? (
              <p className="text-muted px-1 py-2 text-xs">{t('sticker.hint')}</p>
            ) : null}
            {debounced && search.isFetching ? (
              <p className="text-muted px-1 py-2 text-xs">{t('loading')}</p>
            ) : null}
            {debounced && !search.isFetching && (search.data?.length ?? 0) === 0 ? (
              <p className="text-muted px-1 py-2 text-xs">{t('sticker.empty')}</p>
            ) : null}
            {(search.data?.length ?? 0) > 0 ? (
              <ul className="grid grid-cols-4 gap-1">
                {(search.data ?? []).map((item: DialogStickerView) => (
                  <li key={item.src}>
                    <button
                      type="button"
                      className="hover:bg-default/60 flex aspect-square w-full items-center justify-center overflow-hidden rounded-md p-0.5 disabled:opacity-50"
                      disabled={send.isPending || disabled}
                      aria-label={item.name || t('sticker.send')}
                      onClick={() => onPick(item)}
                    >
                      <img
                        src={item.src}
                        alt={item.name || ''}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
