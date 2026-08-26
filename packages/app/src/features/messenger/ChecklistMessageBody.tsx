import { Checkbox, Label } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import { useToggleDialogMessageChecked, type DialogMessageView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import { MentionedBody } from './MentionedBody';
import { parseChecklistSegments } from './checklist';

type Props = {
  message: DialogMessageView;
  text: string;
  mine: boolean;
  interactive: boolean;
  muted: string;
};

/** 文本中的 `<li data-list>` 清单；本人可勾选（`dialog/message/checked`） */
export function ChecklistMessageBody({ message, text, mine, interactive, muted }: Props) {
  const { t } = useTranslation('messenger');
  const toggle = useToggleDialogMessageChecked();
  const segments = parseChecklistSegments(text);
  const canToggle = mine && interactive;

  return (
    <div className="flex flex-col gap-1.5">
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return <MentionedBody key={`t-${i}`} text={seg.value} allLabel={t('mention.all')} />;
        }
        return (
          <Checkbox
            key={`i-${seg.index}`}
            isSelected={seg.checked}
            isDisabled={!canToggle || toggle.isPending}
            onChange={(on) => {
              if (!canToggle) return;
              if (on === seg.checked) return;
              toggle.mutate(
                {
                  dialogId: message.dialogId,
                  messageId: message.id,
                  index: seg.index,
                  checked: on ? 1 : 0,
                },
                {
                  onError: (err) => toastRequestError(err, t('error')),
                },
              );
            }}
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label className={cn('wrap-break-word text-sm font-normal', muted)}>
                {seg.label}
              </Label>
            </Checkbox.Content>
          </Checkbox>
        );
      })}
    </div>
  );
}
