import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  getAccessToken,
  hasId,
  isId,
  useAddDialogOkr,
  useCurrentUser,
  useNotifyDialogMessageStream,
  usePushDialogOkr,
  type DialogView,
  type Id,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { useTheme } from '../../providers/ThemeProvider';
import { cn } from '../../utils/cn';

type MicroRequest = {
  source?: string;
  type?: string;
  requestId?: string;
  url?: string;
  /** 打开会话：`/manage/messenger/:dialogId` */
  dialogId?: Id;
  /** OKR 评论群 */
  okrId?: Id;
  name?: string;
  userIds?: Id[];
  text?: string;
  /** okrAdd 成功后是否跳转会话 */
  open?: boolean;
  /** notifyMessageStream */
  userId?: Id;
  streamUrl?: string;
  streamSource?: string;
};

function isMicroRequest(data: unknown): data is MicroRequest {
  return Boolean(data && typeof data === 'object');
}

function replyHost(win: Window, payload: Record<string, unknown>) {
  win.postMessage({ source: 'blue-dock-host', ...payload }, '*');
}

/** 保留 JSON 字符串化的 Long ID，兼容旧微应用传入的安全数字。 */
function microId(value: unknown): Id | null {
  if (isId(value)) return value;
  return hasId(value) && typeof value === 'number' ? value : null;
}

type MicroAppIframeProps = {
  src: string;
  title: string;
  transparent?: boolean;
  autoDarkTheme?: boolean;
  className?: string;
};

/** 微应用 iframe + postMessage 桥（getUserInfo / openWindow / openDialog / okrAdd / okrPush / notifyMessageStream） */
export function MicroAppIframe({
  src,
  title,
  transparent = false,
  autoDarkTheme = false,
  className,
}: MicroAppIframeProps) {
  const { i18n } = useTranslation('application');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { preference, resolved } = useTheme();
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const { mutate: addOkrMutate } = useAddDialogOkr();
  const { mutate: pushOkrMutate } = usePushDialogOkr();
  const { mutate: notifyStreamMutate } = useNotifyDialogMessageStream();

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isMicroRequest(event.data)) return;
      const msg = event.data;
      if (msg.source !== 'blue-dock-micro') return;
      const win = iframeRef.current?.contentWindow;
      if (!win || event.source !== win) return;

      if (msg.type === 'getUserInfo') {
        replyHost(win, {
          type: 'getUserInfo',
          requestId: msg.requestId,
          data: {
            userId: me?.userId ?? 0,
            nickname: me?.nickname ?? '',
            email: me?.email ?? '',
            token: getAccessToken() ?? '',
            lang: i18n.language || 'zh-CN',
            theme: preference === 'system' ? resolved : preference,
          },
        });
        return;
      }

      if (msg.type === 'openWindow' && typeof msg.url === 'string' && msg.url) {
        window.open(msg.url, '_blank', 'noopener,noreferrer');
        return;
      }

      if (msg.type === 'openDialog') {
        const dialogId = microId(msg.dialogId);
        if (dialogId) {
          navigate(`/manage/messenger/${dialogId}`);
          replyHost(win, {
            type: 'openDialog',
            requestId: msg.requestId,
            data: { dialogId },
          });
        } else {
          replyHost(win, {
            type: 'openDialog',
            requestId: msg.requestId,
            error: 'invalid dialogId',
          });
        }
        return;
      }

      if (msg.type === 'okrAdd') {
        const okrId = microId(msg.okrId);
        if (!okrId) {
          replyHost(win, {
            type: 'okrAdd',
            requestId: msg.requestId,
            error: 'invalid okrId',
          });
          return;
        }
        const userIds = Array.isArray(msg.userIds)
          ? msg.userIds.map(microId).filter((id): id is Id => id !== null)
          : undefined;
        addOkrMutate(
          {
            okrId: okrId as number,
            ...(typeof msg.name === 'string' ? { name: msg.name } : {}),
            ...(userIds?.length ? { userIds: userIds as number[] } : {}),
          },
          {
            onSuccess: (dialog: DialogView) => {
              replyHost(win, {
                type: 'okrAdd',
                requestId: msg.requestId,
                data: dialog,
              });
              if (msg.open) {
                navigate(`/manage/messenger/${dialog.id}`);
              }
            },
            onError: (err) => {
              replyHost(win, {
                type: 'okrAdd',
                requestId: msg.requestId,
                error: err instanceof Error ? err.message : 'okrAdd failed',
              });
            },
          },
        );
        return;
      }

      if (msg.type === 'okrPush') {
        const text = typeof msg.text === 'string' ? msg.text.trim() : '';
        const dialogId = microId(msg.dialogId);
        const okrId = microId(msg.okrId);
        if (!text || (!dialogId && !okrId)) {
          replyHost(win, {
            type: 'okrPush',
            requestId: msg.requestId,
            error: 'invalid okrPush payload',
          });
          return;
        }
        pushOkrMutate(
          {
            text,
            ...(dialogId ? { dialogId: dialogId as number } : {}),
            ...(okrId ? { okrId: okrId as number } : {}),
          },
          {
            onSuccess: (message) => {
              replyHost(win, {
                type: 'okrPush',
                requestId: msg.requestId,
                data: message,
              });
            },
            onError: (err) => {
              replyHost(win, {
                type: 'okrPush',
                requestId: msg.requestId,
                error: err instanceof Error ? err.message : 'okrPush failed',
              });
            },
          },
        );
        return;
      }

      if (msg.type === 'notifyMessageStream') {
        const userId = microId(msg.userId);
        const streamUrl = typeof msg.streamUrl === 'string' ? msg.streamUrl.trim() : '';
        if (!userId || !streamUrl) {
          replyHost(win, {
            type: 'notifyMessageStream',
            requestId: msg.requestId,
            error: 'invalid notifyMessageStream payload',
          });
          return;
        }
        notifyStreamMutate(
          {
            userId: userId as number,
            streamUrl,
            ...(typeof msg.streamSource === 'string' && msg.streamSource.trim()
              ? { source: msg.streamSource.trim() }
              : {}),
          },
          {
            onSuccess: () => {
              replyHost(win, {
                type: 'notifyMessageStream',
                requestId: msg.requestId,
                data: { ok: true },
              });
            },
            onError: (err) => {
              replyHost(win, {
                type: 'notifyMessageStream',
                requestId: msg.requestId,
                error: err instanceof Error ? err.message : 'notifyMessageStream failed',
              });
            },
          },
        );
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [
    addOkrMutate,
    i18n.language,
    me,
    navigate,
    notifyStreamMutate,
    preference,
    pushOkrMutate,
    resolved,
  ]);

  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        source: 'blue-dock-host',
        type: 'hostContext',
        data: {
          lang: i18n.language || 'zh-CN',
          theme: preference === 'system' ? resolved : preference,
          autoDarkTheme,
        },
      },
      '*',
    );
  }, [autoDarkTheme, i18n.language, preference, resolved]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      src={src}
      className={cn(
        'h-full w-full flex-1 border-0',
        transparent ? 'bg-transparent' : 'bg-background',
        autoDarkTheme && resolved === 'dark' && 'scheme-dark',
        className,
      )}
      allow="clipboard-read; clipboard-write; fullscreen"
    />
  );
}
