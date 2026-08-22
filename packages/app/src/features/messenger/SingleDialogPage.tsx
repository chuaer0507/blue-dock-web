import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { PaperClipIcon } from '@heroicons/react/24/outline';
import { Button, Form, TextArea, TextField, toast } from '@heroui/react';
import {
  useDialogMessages,
  useDialogOne,
  useLoadOlderDialogMessages,
  useReadDialogMessages,
  useRealtimeStatus,
  useSendDialogFile,
  useSendDialogImage64,
  useSendDialogText,
  type DialogMessageView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';
import { cn } from '../../utils/cn';
import { MessageContent } from './MessageContent';

function parseId(raw: string | undefined): number | undefined {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const PAGE_TAKE = 50;
const IMAGE64_MAX_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/** 独立窗对话：标题 + 消息列表 + 文本/附件/粘贴图；完整能力走 Manage 消息页 */
export function SingleDialogPage() {
  const { t } = useTranslation('messenger');
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dialogId = parseId(params.dialogId);
  const focusMsgId = Number(searchParams.get('msg')) || 0;
  const { connected } = useRealtimeStatus();
  const dialogQuery = useDialogOne(dialogId, Boolean(dialogId));
  const messagesQuery = useDialogMessages(dialogId, PAGE_TAKE, connected);
  const loadOlder = useLoadOlderDialogMessages();
  const readMessages = useReadDialogMessages();
  const sendText = useSendDialogText();
  const sendFile = useSendDialogFile();
  const sendImage64 = useSendDialogImage64();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipAutoScrollRef = useRef(false);
  const focusAttemptsRef = useRef(0);
  const [draft, setDraft] = useState('');
  const [olderExhausted, setOlderExhausted] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<number | null>(null);

  const sending = sendText.isPending || sendFile.isPending || sendImage64.isPending;

  const messages = useMemo((): DialogMessageView[] => {
    const items = messagesQuery.data ?? [];
    return [...items].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return at - bt;
    });
  }, [messagesQuery.data]);

  const oldestMessageId = messages[0]?.id;
  const latestMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : undefined;

  useEffect(() => {
    setOlderExhausted(false);
    setHighlightMessageId(null);
    focusAttemptsRef.current = 0;
  }, [dialogId]);

  useEffect(() => {
    if (!dialogId) return;
    readMessages.mutate({
      dialogId,
      ...(latestMessageId != null ? { messageId: latestMessageId } : {}),
    });
  }, [dialogId, latestMessageId]);

  useEffect(() => {
    if (skipAutoScrollRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length]);

  useEffect(() => {
    if (!dialogId || focusMsgId <= 0 || messagesQuery.isLoading) return;

    const clearFocusParam = () => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('msg');
          return next;
        },
        { replace: true },
      );
    };

    if (messages.some((m) => m.id === focusMsgId)) {
      skipAutoScrollRef.current = true;
      const frame = requestAnimationFrame(() => {
        const el = document.querySelector(`[data-message-id="${focusMsgId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightMessageId(focusMsgId);
        skipAutoScrollRef.current = false;
      });
      clearFocusParam();
      return () => cancelAnimationFrame(frame);
    }

    if (loadOlder.isPending) return;
    if (!oldestMessageId || olderExhausted || focusMsgId >= oldestMessageId) {
      clearFocusParam();
      return;
    }
    if (focusAttemptsRef.current >= 20) {
      clearFocusParam();
      return;
    }

    focusAttemptsRef.current += 1;
    skipAutoScrollRef.current = true;
    loadOlder.mutate(
      { dialogId, beforeId: oldestMessageId, take: PAGE_TAKE },
      {
        onSuccess: (older) => {
          if (older.length < PAGE_TAKE) setOlderExhausted(true);
          skipAutoScrollRef.current = false;
        },
        onError: () => {
          skipAutoScrollRef.current = false;
          clearFocusParam();
        },
      },
    );
  }, [
    dialogId,
    focusMsgId,
    messages,
    messagesQuery.isLoading,
    oldestMessageId,
    olderExhausted,
    loadOlder.isPending,
    loadOlder.mutate,
    setSearchParams,
  ]);

  useEffect(() => {
    if (highlightMessageId == null) return;
    const timer = window.setTimeout(() => setHighlightMessageId(null), 2500);
    return () => window.clearTimeout(timer);
  }, [highlightMessageId]);

  const onLoadOlder = () => {
    if (!dialogId || !oldestMessageId || olderExhausted || loadOlder.isPending) return;
    skipAutoScrollRef.current = true;
    loadOlder.mutate(
      { dialogId, beforeId: oldestMessageId, take: PAGE_TAKE },
      {
        onSuccess: (older) => {
          if (older.length < PAGE_TAKE) setOlderExhausted(true);
          skipAutoScrollRef.current = false;
        },
        onError: (err) => {
          skipAutoScrollRef.current = false;
          toastRequestError(err, t('error'));
        },
      },
    );
  };

  const title =
    dialogQuery.data?.name?.trim() || (dialogId ? `#${dialogId}` : t('title'));

  const onSend = (e?: FormEvent) => {
    e?.preventDefault();
    if (!dialogId) return;
    const text = draft.trim();
    if (!text || sending) return;
    sendText.mutate(
      { dialogId, text },
      {
        onSuccess: () => setDraft(''),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onSend();
  };

  const onPickFile = () => {
    if (sending) return;
    fileInputRef.current?.click();
  };

  const onFileChange = (files: FileList | null) => {
    if (!dialogId || !files?.length || sending) return;
    const file = files[0];
    if (!file) return;
    sendFile.mutate(
      { dialogId, file },
      {
        onError: (err) => toastRequestError(err, t('error')),
        onSettled: () => {
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      },
    );
  };

  const onPasteComposer = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!dialogId || sending) return;
    const items = e.clipboardData?.items;
    if (!items?.length) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item?.type.startsWith('image/')) continue;
      const file = item.getAsFile();
      if (!file) continue;
      e.preventDefault();
      if (file.size > IMAGE64_MAX_BYTES) {
        toast.danger(t('composer.pasteImageTooLarge', { maxMb: 5 }));
        return;
      }
      void (async () => {
        try {
          const image = await readFileAsDataUrl(file);
          const ext = file.type.split('/')[1] || 'png';
          sendImage64.mutate(
            {
              dialogId,
              image,
              filename: file.name?.trim() || `paste.${ext}`,
            },
            {
              onSuccess: () => toast.success(t('composer.pasteImageDone')),
              onError: (err) => toastRequestError(err, t('error')),
            },
          );
        } catch {
          toast.danger(t('composer.pasteImageFailed'));
        }
      })();
      return;
    }
  };

  if (!dialogId) {
    return (
      <div className="p-6">
        <p className="text-danger text-sm">{t('error')}</p>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
        <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          onPress={() => navigate(`/manage/messenger/${dialogId}`)}
        >
          {t('popout.openFull')}
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {messagesQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
        {messages.length === 0 && !messagesQuery.isLoading ? (
          <p className="text-muted text-sm">{t('threadEmpty')}</p>
        ) : null}
        {messages.length >= PAGE_TAKE && !olderExhausted ? (
          <div className="mb-3 flex justify-center">
            <Button
              size="sm"
              variant="secondary"
              isDisabled={loadOlder.isPending}
              onPress={onLoadOlder}
            >
              {loadOlder.isPending ? t('history.loading') : t('history.loadOlder')}
            </Button>
          </div>
        ) : null}
        {olderExhausted && messages.length >= PAGE_TAKE ? (
          <p className="text-muted mb-3 text-center text-[10px]">{t('history.noMore')}</p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {messages.map((msg: DialogMessageView) => (
            <li
              key={msg.id}
              data-message-id={msg.id}
              className={cn(
                'border-border bg-surface rounded-xl border px-3 py-2 text-sm',
                highlightMessageId === msg.id && 'ring-accent ring-2',
              )}
            >
              <MessageContent message={msg} />
              <p className="text-muted mt-1 text-[10px]">
                {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
              </p>
            </li>
          ))}
        </ul>
        <div ref={bottomRef} />
      </div>
      <Form className="border-border flex flex-col gap-2 border-t p-3" onSubmit={onSend}>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files)}
        />
        <div className="flex items-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            isIconOnly
            aria-label={t('composer.attach')}
            isDisabled={sending}
            onPress={onPickFile}
          >
            <PaperClipIcon className="size-4" aria-hidden />
          </Button>
          <TextField
            name="draft"
            value={draft}
            onChange={setDraft}
            className="min-w-0 flex-1"
            aria-label={t('composer.placeholder')}
          >
            <TextArea
              rows={2}
              placeholder={t('composer.placeholder')}
              onKeyDown={onComposerKeyDown}
              onPaste={onPasteComposer}
            />
          </TextField>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            isDisabled={!draft.trim() || sending}
          >
            {sending ? t('composer.sending') : t('composer.send')}
          </Button>
        </div>
        <p className="text-muted text-xs">
          {sendFile.isPending || sendImage64.isPending
            ? t('composer.uploading')
            : t('popout.composerHint')}
        </p>
      </Form>
    </div>
  );
}
