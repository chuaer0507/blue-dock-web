import { useState } from 'react';
import { Button } from '@heroui/react';
import { useDialogMessageTranslation, useTranslateDialogMessage } from '@blue-dock/api';
import { normalizeAppLanguage, useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

type Props = {
  messageId: number;
  messageType: string;
  mineStyle?: boolean;
};

function canTranslateMessage(type: string): boolean {
  const kind = (type || '').toLowerCase();
  return kind === 'text' || kind === 'record';
}

/** 消息翻译：按当前 UI 语言拉取译文（契约 `dialog/message/translation`） */
export function MessageTranslatePanel({ messageId, messageType, mineStyle }: Props) {
  const { t, i18n } = useTranslation('messenger');
  const language = normalizeAppLanguage(i18n.language);
  const [open, setOpen] = useState(false);
  const translate = useTranslateDialogMessage();
  const cached = useDialogMessageTranslation(messageId, language, open);

  if (!canTranslateMessage(messageType)) return null;

  const content = cached.data?.content ?? null;
  const pending = translate.isPending || (open && cached.isFetching);

  const onToggle = () => {
    setOpen((v) => !v);
  };

  const onRefresh = () => {
    setOpen(true);
    translate.mutate({ messageId, language, force: true });
  };

  return (
    <div className={cn('mt-1 flex flex-col gap-1', mineStyle ? 'items-end' : 'items-start')}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-auto min-h-0 px-1 py-0 text-[10px]"
          isDisabled={pending}
          onPress={onToggle}
        >
          {open ? t('translate.hide') : t('translate.show')}
        </Button>
        {open && content ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-auto min-h-0 px-1 py-0 text-[10px]"
            isDisabled={pending}
            onPress={onRefresh}
          >
            {t('translate.refresh')}
          </Button>
        ) : null}
      </div>
      {open ? (
        <p
          className={cn(
            'border-border bg-default/30 max-w-full whitespace-pre-wrap rounded-md border px-2 py-1 text-[12px]',
            mineStyle ? 'text-end' : 'text-start',
          )}
        >
          {pending && !content ? t('translate.loading') : (content ?? t('translate.empty'))}
        </p>
      ) : null}
    </div>
  );
}
