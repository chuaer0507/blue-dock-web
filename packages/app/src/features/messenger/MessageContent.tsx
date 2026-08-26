import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button, Form, Input, TextField, toast } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  formatFileSize,
  previewMessageBody,
  useClearDialogMessageDot,
  useCurrentUser,
  useDialogMessageBlob,
  useDialogMessageDetail,
  useDialogVoiceToText,
  useDialogVote,
  useDialogWordChain,
  type DialogMessageView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import { MentionedBody } from './MentionedBody';
import { AiActionBody } from './AiActionBody';
import { ChecklistMessageBody } from './ChecklistMessageBody';
import { hasChecklistItems } from './checklist';
import { MessageImagePreview } from './MessageImagePreview';
import { MessageMergeDetail } from './MessageMergeDetail';
import { parseAiActionSegments } from './ai-action';

type BodyMap = Record<string, unknown>;

function parseBody(body: string): BodyMap | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as BodyMap;
    }
  } catch {
    // plain text
  }
  return null;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 位置消息外链（契约 type=baidu|amap|tencent） */
function locationMapUrl(type: string, lng: number, lat: number, title: string): string | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || (lng === 0 && lat === 0)) return null;
  const name = encodeURIComponent(title || 'location');
  switch (type) {
    case 'baidu':
      return `https://api.map.baidu.com/marker?location=${lat},${lng}&title=${name}&content=${name}&output=html`;
    case 'tencent':
      return `https://apis.map.qq.com/uri/v1/marker?marker=coord:${lat},${lng};title:${name}`;
    case 'amap':
    default:
      return `https://uri.amap.com/marker?position=${lng},${lat}&name=${name}`;
  }
}

type Props = {
  message: DialogMessageView;
  mine?: boolean;
  /** 允许投票 / 接龙（机器人单聊应为 false） */
  interactive?: boolean;
};

function VoteBlock({
  message,
  data,
  muted,
  interactive,
}: {
  message: DialogMessageView;
  data: BodyMap | null;
  muted: string;
  interactive: boolean;
}) {
  const { t } = useTranslation('messenger');
  const { data: me } = useCurrentUser();
  const vote = useDialogVote();
  const title = str(data?.title) || t('msg.vote');
  const ended = Boolean(data?.ended);
  const options = Array.isArray(data?.options) ? data.options : [];
  const myId = me?.userId;
  const alreadyVoted =
    myId != null &&
    options.some((opt) => {
      const row = opt && typeof opt === 'object' ? (opt as BodyMap) : {};
      const votes = Array.isArray(row.votes) ? row.votes : [];
      return votes.some((v) => Number(v) === myId);
    });
  const canEnd = interactive && !ended && myId != null && message.userId === myId;
  const canCast = interactive && !ended && !alreadyVoted;

  const onCast = (index: number) => {
    vote.mutate(
      { action: 'cast', messageId: message.id, dialogId: message.dialogId, optionIndex: index },
      {
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onEnd = () => {
    vote.mutate(
      { action: 'end', messageId: message.id, dialogId: message.dialogId },
      {
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p className={cn('text-xs font-medium', muted)}>
        {t('msg.vote')}
        {ended ? ` · ${t('msg.voteEnded')}` : ''}
        {alreadyVoted && !ended ? ` · ${t('vote.voted')}` : ''}
      </p>
      <p className="wrap-break-word text-sm font-medium">{title}</p>
      <ul className="flex flex-col gap-1">
        {options.map((opt, i) => {
          const row = opt && typeof opt === 'object' ? (opt as BodyMap) : {};
          const text = str(row.text) || t('msg.optionFallback', { n: i + 1 });
          const votes = Array.isArray(row.votes) ? row.votes : [];
          const mineOpt = myId != null && votes.some((v) => Number(v) === myId);
          const label = `${text}${votes.length > 0 ? ` · ${t('msg.voteCount', { count: votes.length })}` : ''}`;
          if (canCast) {
            return (
              <li key={i}>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-auto w-full justify-start whitespace-normal px-2 py-1.5 text-left text-xs"
                  isDisabled={vote.isPending}
                  onPress={() => onCast(i)}
                >
                  {label}
                </Button>
              </li>
            );
          }
          return (
            <li key={i} className={cn('text-xs', muted, mineOpt && 'font-medium text-inherit')}>
              {label}
            </li>
          );
        })}
      </ul>
      {canEnd ? (
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          isDisabled={vote.isPending}
          onPress={onEnd}
        >
          {t('vote.end')}
        </Button>
      ) : null}
    </div>
  );
}

function WordChainBlock({
  message,
  data,
  muted,
  interactive,
}: {
  message: DialogMessageView;
  data: BodyMap | null;
  muted: string;
  interactive: boolean;
}) {
  const { t } = useTranslation('messenger');
  const { data: me } = useCurrentUser();
  const wordChain = useDialogWordChain();
  const [line, setLine] = useState('');
  const title = str(data?.title) || t('msg.wordChain');
  const items = Array.isArray(data?.items) ? data.items : [];
  const stopped = Boolean(data?.stopped);
  const canStop = interactive && !stopped && me?.userId != null && message.userId === me.userId;
  const canJoin = interactive && !stopped;

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    const text = line.trim();
    if (!text || wordChain.isPending) return;
    wordChain.mutate(
      { action: 'join', messageId: message.id, dialogId: message.dialogId, text },
      {
        onSuccess: () => setLine(''),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onStop = () => {
    wordChain.mutate(
      { action: 'stop', messageId: message.id, dialogId: message.dialogId },
      {
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p className={cn('text-xs font-medium', muted)}>
        {t('msg.wordChain')}
        {stopped ? ` · ${t('msg.wordChainStopped')}` : ''}
      </p>
      <p className="wrap-break-word text-sm font-medium">{title}</p>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {items.map((item, i) => {
            const row = item && typeof item === 'object' ? (item as BodyMap) : {};
            return (
              <li key={i} className={cn('wrap-break-word text-xs', muted)}>
                {str(row.text) || '—'}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={cn('text-xs', muted)}>{t('msg.wordChainCount', { count: 0 })}</p>
      )}
      {canJoin ? (
        <Form className="mt-1 flex gap-2" onSubmit={onJoin}>
          <TextField
            aria-label={t('wordChain.replyPlaceholder')}
            value={line}
            onChange={setLine}
            className="min-w-0 flex-1"
          >
            <Input placeholder={t('wordChain.replyPlaceholder')} />
          </TextField>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            isDisabled={!line.trim() || wordChain.isPending}
          >
            {t('wordChain.reply')}
          </Button>
        </Form>
      ) : null}
      {canStop ? (
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          isDisabled={wordChain.isPending}
          onPress={onStop}
        >
          {t('wordChain.stop')}
        </Button>
      ) : null}
    </div>
  );
}

function useAttachmentMeta(messageId: number, data: BodyMap | null) {
  const bodyName = str(data?.name);
  const bodySize = num(data?.size);
  const bodyExt = str(data?.ext) || str(data?.extension);
  const bodyFileId = num(data?.fileId);
  const needDetail = bodySize <= 0 || !bodyName;
  const detailQuery = useDialogMessageDetail(messageId, needDetail);
  const file = detailQuery.data?.file;
  const name = (file?.name || bodyName).trim();
  const size = file?.size && file.size > 0 ? file.size : bodySize;
  const extension = (file?.extension || bodyExt).replace(/^\./, '');
  const fileId = (file?.id && file.id > 0 ? file.id : bodyFileId) || 0;
  return {
    name,
    size,
    extension,
    fileId,
    loading: needDetail && detailQuery.isLoading,
  };
}

function ImageMessageBlock({
  message,
  data,
  muted,
  mine,
}: {
  message: DialogMessageView;
  data: BodyMap | null;
  muted: string;
  mine: boolean;
}) {
  const { t } = useTranslation('messenger');
  const meta = useAttachmentMeta(message.id, data);
  const alt = meta.name || t('msg.image');
  return (
    <div className="flex flex-col gap-1">
      <MessageImagePreview messageId={message.id} alt={alt} mineStyle={mine} />
      {meta.loading ? <p className={cn('text-[11px]', muted)}>{t('msg.detailLoading')}</p> : null}
      {meta.size > 0 ? (
        <p className={cn('text-[11px]', muted)}>
          {meta.extension
            ? t('msg.fileMeta', {
                ext: meta.extension.toUpperCase(),
                size: formatFileSize(meta.size),
              })
            : formatFileSize(meta.size)}
        </p>
      ) : null}
      {meta.fileId > 0 ? (
        <Link
          to={`/single/file/${meta.fileId}`}
          className={cn('text-xs underline underline-offset-2', muted)}
        >
          {t('msg.openFile')}
        </Link>
      ) : null}
    </div>
  );
}

function FileMessageBlock({
  message,
  data,
  muted,
}: {
  message: DialogMessageView;
  data: BodyMap | null;
  muted: string;
}) {
  const { t } = useTranslation('messenger');
  const meta = useAttachmentMeta(message.id, data);
  const name = meta.name || t('msg.file');
  return (
    <div className="flex flex-col gap-1">
      <p className={cn('text-xs font-medium', muted)}>{t('msg.file')}</p>
      <p className="wrap-break-word text-sm font-medium">{name}</p>
      {meta.loading ? <p className={cn('text-[11px]', muted)}>{t('msg.detailLoading')}</p> : null}
      {meta.size > 0 ? (
        <p className={cn('text-xs', muted)}>
          {meta.extension
            ? t('msg.fileMeta', {
                ext: meta.extension.toUpperCase(),
                size: formatFileSize(meta.size),
              })
            : formatFileSize(meta.size)}
        </p>
      ) : null}
      {meta.fileId > 0 ? (
        <Link
          to={`/single/file/${meta.fileId}`}
          className={cn('text-xs underline underline-offset-2', muted)}
        >
          {t('msg.openFile')}
        </Link>
      ) : null}
    </div>
  );
}

function RecordBlock({
  message,
  data,
  muted,
  mineStyle,
}: {
  message: DialogMessageView;
  data: BodyMap | null;
  muted: string;
  mineStyle: boolean;
}) {
  const { t } = useTranslation('messenger');
  const duration = num(data?.duration);
  const text = str(data?.text);
  const blobQuery = useDialogMessageBlob(message.id, true);
  const voiceToText = useDialogVoiceToText();
  const clearDot = useClearDialogMessageDot();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [dotCleared, setDotCleared] = useState(mineStyle);

  useEffect(() => {
    if (!blobQuery.data) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(blobQuery.data);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blobQuery.data]);

  const onTranscribe = () => {
    voiceToText.mutate(message.id, {
      onSuccess: () => toast.success(t('record.transcribed')),
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onPlay = () => {
    if (mineStyle || dotCleared || clearDot.isPending) return;
    clearDot.mutate(message.id, {
      onSuccess: () => setDotCleared(true),
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        {t('msg.record')}
        {!mineStyle && !dotCleared ? (
          <span
            className="bg-danger inline-block size-1.5 shrink-0 rounded-full"
            aria-label={t('record.dot')}
          />
        ) : null}
      </p>
      {duration > 0 ? (
        <p className={cn('text-xs', muted)}>
          {t('msg.recordDuration', { sec: Math.round(duration / 1000) })}
        </p>
      ) : null}
      {blobQuery.isLoading ? (
        <p className={cn('text-[11px]', muted)}>{t('record.loading')}</p>
      ) : null}
      {blobQuery.isError ? (
        <p className={cn('text-[11px]', mineStyle ? 'text-accent-foreground/80' : 'text-danger')}>
          {t('record.playError')}
        </p>
      ) : null}
      {objectUrl ? (
        <audio controls preload="none" src={objectUrl} className="max-w-full" onPlay={onPlay}>
          <track kind="captions" />
        </audio>
      ) : null}
      {text ? <p className={cn('wrap-break-word text-xs', muted)}>{text}</p> : null}
      {!text ? (
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          isDisabled={voiceToText.isPending}
          onPress={onTranscribe}
        >
          {voiceToText.isPending ? t('record.transcribing') : t('record.transcribe')}
        </Button>
      ) : null}
    </div>
  );
}

/** 按消息 `type` 分发渲染；投票 / 接龙可交互 */
export function MessageContent({ message, mine = false, interactive = false }: Props) {
  const { t } = useTranslation('messenger');
  const type = (message.type || 'text').toLowerCase();
  const data = parseBody(message.body);
  const muted = mine ? 'text-accent-foreground/80' : 'text-muted';

  if (type === 'notice') {
    const raw = previewMessageBody(message.body) || str(data?.notice) || message.body || '';
    return (
      <div className="flex flex-col gap-1">
        <p className={cn('text-xs font-medium', muted)}>{t('msg.notice')}</p>
        <MentionedBody text={raw} allLabel={t('mention.all')} />
      </div>
    );
  }

  if (type === 'template') {
    const heading = str(data?.title) || t('msg.template');
    const items = Array.isArray(data?.content) ? data.content : [];
    const approveType = str(data?.type);
    const isApprove = approveType.startsWith('approve_');
    if (isApprove) {
      const action = str(data?.action);
      const finished = Number(data?.isFinished) === 1;
      return (
        <div className="flex flex-col gap-1.5">
          <p className={cn('text-xs font-medium', muted)}>{t('msg.approve')}</p>
          <p className="wrap-break-word text-sm font-medium">{heading}</p>
          <p className={cn('text-xs', muted)}>
            {t(`msg.approveTypes.${approveType}`, { defaultValue: approveType })}
            {action ? ` · ${action}` : ''}
            {finished ? ` · ${t('msg.approveFinished')}` : ''}
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1.5">
        <p className={cn('text-xs font-medium', muted)}>{t('msg.template')}</p>
        <p className="wrap-break-word text-sm font-medium">{heading}</p>
        {items.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {items.map((item, i) => {
              const row = item && typeof item === 'object' ? (item as BodyMap) : {};
              const text = str(row.content);
              if (!text) return null;
              return (
                <li key={i} className={cn('wrap-break-word text-sm', muted)}>
                  {text}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  }

  if (type === 'text') {
    const raw = previewMessageBody(message.body) || message.body || '';
    if (parseAiActionSegments(raw)) {
      return <AiActionBody message={message} text={raw} interactive={interactive} muted={muted} />;
    }
    if (hasChecklistItems(raw)) {
      return (
        <ChecklistMessageBody
          message={message}
          text={raw}
          mine={mine}
          interactive={interactive}
          muted={muted}
        />
      );
    }
    const nick = str(data?.nickname);
    if (nick) {
      return (
        <div className="flex flex-col gap-1">
          <p className={cn('text-xs font-medium', muted)}>{nick}</p>
          <MentionedBody text={raw} allLabel={t('mention.all')} />
        </div>
      );
    }
    return <MentionedBody text={raw} allLabel={t('mention.all')} />;
  }

  if (type === 'tag') {
    const action = str(data?.action);
    const payload = data?.data && typeof data.data === 'object' ? (data.data as BodyMap) : null;
    const targetId = num(payload?.messageId);
    return (
      <p className={cn('text-xs', muted)}>
        {action === 'remove'
          ? t('msg.tagRemoved', { id: targetId || '—' })
          : t('msg.tagAdded', { id: targetId || '—' })}
      </p>
    );
  }

  if (type === 'image') {
    return <ImageMessageBlock message={message} data={data} muted={muted} mine={mine} />;
  }

  if (type === 'file') {
    return <FileMessageBlock message={message} data={data} muted={muted} />;
  }

  if (type === 'task') {
    const name = str(data?.name) || t('msg.task');
    const taskId = num(data?.taskId) || num(data?.id);
    const note = str(data?.note);
    return (
      <div className="flex flex-col gap-1">
        <p className={cn('text-xs font-medium', muted)}>{t('msg.task')}</p>
        <p className="wrap-break-word text-sm font-medium">{name}</p>
        {note ? <p className={cn('wrap-break-word text-xs', muted)}>{note}</p> : null}
        {taskId > 0 ? (
          <Link
            to={`/single/task/${taskId}`}
            className={cn('text-xs underline underline-offset-2', muted)}
          >
            {t('msg.openTask')}
          </Link>
        ) : null}
      </div>
    );
  }

  if (type === 'meeting') {
    const meetingId = str(data?.meetingId);
    const title = str(data?.title) || str(data?.name) || t('msg.meeting');
    const endAt = str(data?.endAt);
    const ended = Boolean(endAt);
    let endedLabel = t('msg.meetingEnded');
    if (endAt) {
      const ms = Date.parse(endAt);
      if (!Number.isNaN(ms)) {
        endedLabel = t('msg.meetingEndedAt', { time: new Date(ms).toLocaleString() });
      }
    }
    return (
      <div className="flex flex-col gap-1">
        <p className={cn('text-xs font-medium', muted)}>{t('msg.meeting')}</p>
        <p className="wrap-break-word text-sm font-medium">{title}</p>
        {ended ? (
          <p className={cn('text-xs', muted)}>{endedLabel}</p>
        ) : meetingId ? (
          <Link
            to={`/meeting/${meetingId}`}
            className={cn('text-xs underline underline-offset-2', muted)}
          >
            {t('msg.openMeeting')}
          </Link>
        ) : null}
      </div>
    );
  }

  if (type === 'vote') {
    return <VoteBlock message={message} data={data} muted={muted} interactive={interactive} />;
  }

  if (type === 'wordchain' || type === 'word_chain') {
    return <WordChainBlock message={message} data={data} muted={muted} interactive={interactive} />;
  }

  if (type === 'record') {
    return <RecordBlock message={message} data={data} muted={muted} mineStyle={mine} />;
  }

  if (type === 'location') {
    const title = str(data?.title) || t('msg.location');
    const address = str(data?.address);
    const mapType = str(data?.type) || 'amap';
    const lng = num(data?.lng);
    const lat = num(data?.lat);
    const mapUrl = locationMapUrl(mapType, lng, lat, title);
    return (
      <div className="flex flex-col gap-1">
        <p className={cn('text-xs font-medium', muted)}>{t('msg.location')}</p>
        <p className="wrap-break-word text-sm font-medium">{title}</p>
        {address ? <p className={cn('wrap-break-word text-xs', muted)}>{address}</p> : null}
        {mapUrl ? (
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent text-xs underline"
          >
            {t('msg.openMap')}
          </a>
        ) : null}
      </div>
    );
  }

  if (type === 'forward') {
    const innerType = str(data?.type) || 'text';
    const innerBody =
      typeof data?.body === 'string'
        ? data.body
        : data?.body != null
          ? JSON.stringify(data.body)
          : '';
    const preview = previewMessageBody(innerBody) || innerBody;
    return (
      <div className="flex flex-col gap-1">
        <p className={cn('text-xs font-medium', muted)}>{t('msg.forward')}</p>
        <p className={cn('text-[10px]', muted)}>{t('msg.forwardFrom', { type: innerType })}</p>
        {preview ? (
          <p className="wrap-break-word whitespace-pre-wrap text-sm opacity-90">{preview}</p>
        ) : null}
      </div>
    );
  }

  if (type === 'merge' || type === 'merge-forward') {
    const items = Array.isArray(data?.items) ? data.items : [];
    return <MessageMergeDetail messageId={message.id} previewItems={items} mineStyle={mine} />;
  }

  const fallback = previewMessageBody(message.body) || '';
  return (
    <div className="flex flex-col gap-1">
      <p className={cn('text-xs font-medium', muted)}>{t('msg.unknown', { type })}</p>
      {fallback ? <p className="wrap-break-word whitespace-pre-wrap text-sm">{fallback}</p> : null}
    </div>
  );
}
