import { Button } from '@heroui/react';
import {
  useCurrentUser,
  useToggleDialogMessageEmoji,
  type DialogMessageEmojiView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

const QUICK_EMOJIS = ['👍', '❤️', '😄', '🎉', '👀'] as const;

type Props = {
  dialogId: number;
  messageId: number;
  emojis: DialogMessageEmojiView[];
  mineStyle?: boolean;
};

/** 消息表情：快捷回复 + 聚合计数（再次点击取消） */
export function MessageEmojiBar({ dialogId, messageId, emojis, mineStyle }: Props) {
  const { t } = useTranslation('messenger');
  const { data: me } = useCurrentUser();
  const myId = me?.userId ?? 0;
  const toggle = useToggleDialogMessageEmoji();

  const onToggle = (symbol: string) => {
    const hit = emojis.find((e) => e.symbol === symbol);
    const cancel = Boolean(myId && hit?.userIds.includes(myId));
    toggle.mutate({ messageId, dialogId, symbol, cancel });
  };

  const shown = new Set(emojis.map((e) => e.symbol));
  const quick = QUICK_EMOJIS.filter((s) => !shown.has(s));

  return (
    <div
      className={cn(
        'mt-1 flex flex-wrap items-center gap-1',
        mineStyle ? 'justify-end' : 'justify-start',
      )}
    >
      {emojis.map((e) => {
        const mine = myId > 0 && e.userIds.includes(myId);
        return (
          <Button
            key={e.symbol}
            size="sm"
            variant={mine ? 'primary' : 'secondary'}
            className="h-auto min-h-0 px-1.5 py-0.5 text-[11px]"
            isDisabled={toggle.isPending}
            aria-label={t('emoji.toggle', { symbol: e.symbol, count: e.userIds.length })}
            onPress={() => onToggle(e.symbol)}
          >
            {e.symbol} {e.userIds.length}
          </Button>
        );
      })}
      {quick.map((symbol) => (
        <Button
          key={symbol}
          size="sm"
          variant="ghost"
          className="h-auto min-h-0 px-1 py-0 text-[11px] opacity-60 hover:opacity-100"
          isDisabled={toggle.isPending}
          aria-label={t('emoji.add', { symbol })}
          onPress={() => onToggle(symbol)}
        >
          {symbol}
        </Button>
      ))}
    </div>
  );
}
