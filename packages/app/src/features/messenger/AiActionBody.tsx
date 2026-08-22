import { Button, toast } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  useAddSubtask,
  useTaskAiApply,
  useTaskAiDismiss,
  useUpdateTask,
  type DialogMessageView,
  type TaskAiActionResult,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import { isAiActionClosed, parseAiActionSegments, type AiActionBlock } from './ai-action';
import { MentionedBody } from './MentionedBody';

type Props = {
  message: DialogMessageView;
  text: string;
  interactive: boolean;
  muted: string;
};

async function applySideEffects(
  out: TaskAiActionResult,
  block: AiActionBlock,
  helpers: {
    updateTask: ReturnType<typeof useUpdateTask>;
    addSubtask: ReturnType<typeof useAddSubtask>;
  },
) {
  const type = String(out.type || block.attrs.type);
  const result = out.result ?? {};
  const taskId = Number(out.taskId || block.attrs.taskId);
  if (!(taskId > 0)) return;

  if (type === 'description') {
    const content = String(result.content ?? block.body ?? '').trim();
    if (!content) return;
    await helpers.updateTask.mutateAsync({ taskId, content, description: content.slice(0, 500) });
    return;
  }
  if (type === 'subtasks') {
    const list = Array.isArray(result.content)
      ? result.content.map((x) => String(x).trim()).filter(Boolean)
      : block.body
          .split('\n')
          .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
          .filter(Boolean);
    for (const name of list.slice(0, 20)) {
      await helpers.addSubtask.mutateAsync({ taskId, name });
    }
    return;
  }
  if (type === 'assignee') {
    const userId =
      Number(out.userId) ||
      block.attrs.userId ||
      (Array.isArray(result.content)
        ? Number((result.content[0] as { userId?: number })?.userId)
        : 0);
    if (userId > 0) {
      await helpers.updateTask.mutateAsync({ taskId, owner: String(userId) });
    }
  }
}

function ActionCard({
  message,
  block,
  interactive,
  muted,
}: {
  message: DialogMessageView;
  block: AiActionBlock;
  interactive: boolean;
  muted: string;
}) {
  const { t } = useTranslation('messenger');
  const apply = useTaskAiApply();
  const dismiss = useTaskAiDismiss();
  const updateTask = useUpdateTask();
  const addSubtask = useAddSubtask();
  const closed = isAiActionClosed(block.attrs.status);
  const pending =
    apply.isPending || dismiss.isPending || updateTask.isPending || addSubtask.isPending;
  const typeLabel = (() => {
    switch (block.attrs.type) {
      case 'description':
        return t('ai.type.description');
      case 'subtasks':
        return t('ai.type.subtasks');
      case 'assignee':
        return t('ai.type.assignee');
      case 'similar':
        return t('ai.type.similar');
      default:
        return block.attrs.type;
    }
  })();

  const base = {
    taskId: block.attrs.taskId,
    messageId: block.attrs.messageId || message.id,
    dialogId: message.dialogId,
    type: block.attrs.type,
    ...(block.attrs.userId > 0 ? { userId: block.attrs.userId } : {}),
    ...(block.attrs.related > 0 ? { related: block.attrs.related } : {}),
  };

  const onApply = () => {
    apply.mutate(base, {
      onSuccess: (out) => {
        void applySideEffects(out, block, { updateTask, addSubtask })
          .then(() => toast.success(t('ai.applied')))
          .catch((err) => toastRequestError(err, t('error')));
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onDismiss = () => {
    dismiss.mutate(base, {
      onSuccess: () => toast.success(t('ai.dismissed')),
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  return (
    <div className="border-border bg-default/30 mt-1.5 flex flex-col gap-1.5 rounded-lg border px-2.5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn('text-xs font-medium', muted)}>
          {t('ai.card', { type: typeLabel })}
          {closed
            ? ` · ${
                block.attrs.status === 'applied' ? t('ai.status.applied') : t('ai.status.dismissed')
              }`
            : ''}
        </p>
        {interactive && !closed ? (
          <div className="flex gap-1">
            <Button size="sm" variant="primary" isDisabled={pending} onPress={onApply}>
              {t('ai.apply')}
            </Button>
            <Button size="sm" variant="ghost" isDisabled={pending} onPress={onDismiss}>
              {t('ai.dismiss')}
            </Button>
          </div>
        ) : null}
      </div>
      {block.body.trim() ? (
        <MentionedBody
          text={block.body}
          allLabel={t('mention.all')}
          className="wrap-break-word text-sm"
        />
      ) : null}
    </div>
  );
}

/** 渲染含 `:::ai-action` 的任务 AI 建议卡片 */
export function AiActionBody({ message, text, interactive, muted }: Props) {
  const { t } = useTranslation('messenger');
  const segments = parseAiActionSegments(text);
  if (!segments) {
    return <MentionedBody text={text} allLabel={t('mention.all')} />;
  }
  return (
    <div className="flex flex-col gap-1">
      {segments.map((seg, i) => {
        if (seg.kind === 'text') {
          return (
            <MentionedBody
              key={`t-${i}`}
              text={seg.value}
              allLabel={t('mention.all')}
              className="wrap-break-word text-sm"
            />
          );
        }
        return (
          <ActionCard
            key={`a-${i}-${seg.block.attrs.type}-${seg.block.attrs.userId}-${seg.block.attrs.related}`}
            message={message}
            block={seg.block}
            interactive={interactive}
            muted={muted}
          />
        );
      })}
    </div>
  );
}
