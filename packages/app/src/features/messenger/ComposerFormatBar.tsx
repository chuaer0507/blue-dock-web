import { Button } from '@heroui/react';
import { CheckCircleIcon, CodeBracketIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '@blue-dock/i18n';
import { wrapTextRange } from './markdown';
import { insertChecklistItem } from './checklist';

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** 点工具条前 TextArea 已失焦，用上次选区 */
  selection: { start: number; end: number };
  onSelectionChange?: (next: { start: number; end: number }) => void;
  textareaRef?: { current: HTMLTextAreaElement | null };
  disabled?: boolean;
};

type FormatKind = 'bold' | 'italic' | 'code' | 'link';

function applyFormat(
  value: string,
  kind: FormatKind,
  t: (k: string) => string,
  start: number,
  end: number,
) {
  const map: Record<FormatKind, { before: string; after: string; placeholder: string }> = {
    bold: { before: '**', after: '**', placeholder: t('format.boldPlaceholder') },
    italic: { before: '*', after: '*', placeholder: t('format.italicPlaceholder') },
    code: { before: '`', after: '`', placeholder: t('format.codePlaceholder') },
    link: {
      before: '[',
      after: `](${t('format.linkUrlPlaceholder')})`,
      placeholder: t('format.linkLabelPlaceholder'),
    },
  };
  const spec = map[kind];
  return wrapTextRange(value, start, end, spec.before, spec.after, spec.placeholder);
}

/** Markdown 轻量工具条：加粗 / 斜体 / 代码 / 链接 / 清单项 */
export function ComposerFormatBar({
  value,
  onChange,
  selection,
  onSelectionChange,
  textareaRef,
  disabled,
}: Props) {
  const { t } = useTranslation('messenger');

  const applyResult = (next: {
    value: string;
    selectionStart: number;
    selectionEnd: number;
  }) => {
    onChange(next.value);
    onSelectionChange?.({ start: next.selectionStart, end: next.selectionEnd });
    queueMicrotask(() => {
      const el = textareaRef?.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  const run = (kind: FormatKind) => {
    applyResult(applyFormat(value, kind, t, selection.start, selection.end));
  };

  const runChecklist = () => {
    applyResult(
      insertChecklistItem(value, selection.start, selection.end, t('format.checklistPlaceholder')),
    );
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      role="toolbar"
      aria-label={t('format.title')}
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 min-w-7 px-1.5 text-xs font-bold"
        isDisabled={disabled}
        aria-label={t('format.bold')}
        onPress={() => run('bold')}
      >
        B
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 min-w-7 px-1.5 text-xs italic"
        isDisabled={disabled}
        aria-label={t('format.italic')}
        onPress={() => run('italic')}
      >
        I
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        isIconOnly
        className="size-7"
        isDisabled={disabled}
        aria-label={t('format.code')}
        onPress={() => run('code')}
      >
        <CodeBracketIcon className="size-3.5" aria-hidden />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        isIconOnly
        className="size-7"
        isDisabled={disabled}
        aria-label={t('format.link')}
        onPress={() => run('link')}
      >
        <LinkIcon className="size-3.5" aria-hidden />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        isIconOnly
        className="size-7"
        isDisabled={disabled}
        aria-label={t('format.checklist')}
        onPress={runChecklist}
      >
        <CheckCircleIcon className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}
