import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  Button,
  Checkbox,
  Form,
  Label,
  ListBox,
  SearchField,
  Select,
  TextArea,
  TextField,
  Avatar,
  toast,
} from '@heroui/react';
import {
  ArrowTopRightOnSquareIcon,
  BellIcon,
  BellSlashIcon,
  EyeSlashIcon,
  PaperClipIcon,
  StarIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { toastRequestError } from '../../utils/toast-request-error';
import { openAppPath } from '../../utils/open-app-path';
import { ComplaintSubmitModal } from './ComplaintSubmitModal';
import {
  dialogBadgeKind,
  dialogMatchesFilter,
  previewMessageBody,
  useCurrentUser,
  useDialogBeyond,
  useDialogBotIdSet,
  useDialogConfig,
  useDialogGroupDeputies,
  useDialogList,
  useDialogOne,
  useDialogMemberIds,
  useDialogMemberIdsMany,
  useDialogMessageEmojiMap,
  useDialogMessageTodos,
  useDialogMessageTops,
  useDialogMessages,
  useLoadOlderDialogMessages,
  useDialogSessionList,
  useDialogUnreadList,
  useDialogSearch,
  useDialogSearchTag,
  useDoneDialogMessageTodo,
  useFavoriteCheck,
  useHideDialog,
  useReadDialogMessages,
  useMarkDialogUnread,
  useMarkDialogRead,
  useOpenDialogEvent,
  useOpenMeeting,
  useRealtimeStatus,
  useSendDialogFile,
  useSendDialogImage64,
  useSendDialogText,
  useToggleDialogChatMute,
  useToggleDialogMessageTag,
  useToggleDialogMessageTodo,
  useToggleDialogMessageTop,
  useToggleDialogMute,
  useToggleDialogTop,
  useToggleFavorite,
  useUserExtra,
  useUserPresence,
  useUsersPresence,
  useWithdrawDialogMessage,
  useSystemGeneralSetting,
  resolveAvatarSrc,
  type DialogMessageTodoView,
  type DialogMessageView,
  type DialogUnreadItem,
  type DialogView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { useMessengerDraftStore } from '../../stores/messenger';
import { cn } from '../../utils/cn';
import { CreateGroupModal } from './CreateGroupModal';
import { AnonMessageModal } from './AnonMessageModal';
import { BroadcastFilesModal } from './BroadcastFilesModal';
import { CommonGroupsModal } from './CommonGroupsModal';
import { DialogTelephoneButton } from './DialogTelephoneButton';
import { DialogSessionPanel, isAiSystemBotEmail } from './DialogSessionPanel';
import { SendBotMessageModal } from './SendBotMessageModal';
import { StartAiChatModal } from './StartAiChatModal';
import { SendApproveModal } from './SendApproveModal';
import { SendLocationButton } from './SendLocationButton';
import { RecordMessageButton } from './RecordMessageButton';
import { CreateVoteModal } from './CreateVoteModal';
import { CreateWordChainModal } from './CreateWordChainModal';
import { DialogColorField } from './DialogColorField';
import { DialogTagField } from './DialogTagField';
import { GroupManageModal } from './GroupManageModal';
import { SendNoticeModal } from './SendNoticeModal';
import { SendTemplateModal } from './SendTemplateModal';
import { SendAiAssistantModal } from './SendAiAssistantModal';
import { MessageContent } from './MessageContent';
import { MessageEmojiBar } from './MessageEmojiBar';
import { MessageForwardModal } from './MessageForwardModal';
import { MessageMergeForwardModal } from './MessageMergeForwardModal';
import { MessageReadReceipt } from './MessageReadReceipt';
import { MessageTodoRemindModal } from './MessageTodoRemindModal';
import { MessageTranslatePanel } from './MessageTranslatePanel';
import { StickerPickerPanel } from './StickerPickerPanel';
import { ComposerFormatBar } from './ComposerFormatBar';
import { MentionSuggest } from './MentionSuggest';
import { TaskSuggest } from './TaskSuggest';
import { detectMentionTrigger, detectTaskTrigger, formatMentionDisplay } from './mention';
import { findNextUnreadDialog } from './next-unread';

type DialogFilter = 'all' | 'user' | 'group' | 'task' | 'project' | 'okr' | 'bot' | 'mention';
type SearchMode = 'dialog' | 'tag';

const FILTERS: DialogFilter[] = [
  'all',
  'user',
  'group',
  'task',
  'project',
  'okr',
  'bot',
  'mention',
];
const MESSAGE_PAGE_TAKE = 50;

function parseDialogId(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function canTodoMessage(type: string): boolean {
  const kind = (type || '').toLowerCase();
  return kind !== 'notice' && kind !== 'todo' && kind !== 'tag';
}

function canTagMessage(type: string): boolean {
  return canTodoMessage(type);
}

/** 契约 `image64` 上限 5MB */
const IMAGE64_MAX_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

function formatListTime(value: string | null, t: (key: string) => string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return t('time.yesterday');
  }
  return d.toLocaleDateString();
}

function quotePreview(
  msg: DialogMessageView,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const type = (msg.type || 'text').toLowerCase();
  if (type === 'text' || type === 'notice' || type === 'template') {
    const text = formatMentionDisplay(
      previewMessageBody(msg.body) || msg.body || '',
      String(t('mention.all')),
    );
    return text.length > 80 ? `${text.slice(0, 80)}…` : text || t('reply.fallback');
  }
  if (type === 'image') return t('msg.image');
  if (type === 'file') return t('msg.file');
  if (type === 'task') return t('msg.task');
  if (type === 'meeting') return t('msg.meeting');
  if (type === 'vote') return t('msg.vote');
  if (type === 'wordchain' || type === 'word_chain') return t('msg.wordChain');
  if (type === 'record') return t('msg.record');
  if (type === 'location') return t('msg.location');
  return t('msg.unknown', { type });
}

function sortDialogs(items: DialogView[]): DialogView[] {
  return [...items].sort((a, b) => {
    if (a.isTop !== b.isTop) return b.isTop - a.isTop;
    const at = a.lastAt ? new Date(a.lastAt).getTime() : 0;
    const bt = b.lastAt ? new Date(b.lastAt).getTime() : 0;
    return bt - at;
  });
}

/** 即时通讯：会话列表 + 消息线程（文本 / 附件） */
export function MessengerPage() {
  const { t } = useTranslation('messenger');
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dialogId = parseDialogId(params.dialogAction);
  const focusMsgId = Number(searchParams.get('msg')) || 0;
  const { connected } = useRealtimeStatus();
  const [filter, setFilter] = useState<DialogFilter>('all');
  const [searchMode, setSearchMode] = useState<SearchMode>('dialog');
  const [listQueryText, setListQueryText] = useState('');
  const [debouncedListQuery, setDebouncedListQuery] = useState('');
  const [showBeyond, setShowBeyond] = useState(false);
  const [replyTo, setReplyTo] = useState<DialogMessageView | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<number[]>([]);
  const { data: me } = useCurrentUser();
  const listQuery = useDialogList(connected);
  const beyondQuery = useDialogBeyond(showBeyond);
  const messagesQuery = useDialogMessages(dialogId, MESSAGE_PAGE_TAKE, connected);
  const loadOlder = useLoadOlderDialogMessages();
  const unreadListQuery = useDialogUnreadList(connected);
  const sendText = useSendDialogText();
  const sendFile = useSendDialogFile();
  const sendImage64 = useSendDialogImage64();
  const withdraw = useWithdrawDialogMessage();
  const generalSetting = useSystemGeneralSetting(true);
  const anonMessageOpen = (generalSetting.data?.anonMessage || 'open').toLowerCase() === 'open';
  const todoAllowed = (generalSetting.data?.todoPermission || 'allow').toLowerCase() !== 'deny';
  const recallLimitMin = Number(generalSetting.data?.messageRecallLimit) || 0;
  const readMessages = useReadDialogMessages();
  const openDialogEvent = useOpenDialogEvent();
  const toggleTop = useToggleDialogTop();
  const toggleMute = useToggleDialogMute();
  const toggleChatMute = useToggleDialogChatMute();
  const hideDialog = useHideDialog();
  const markUnread = useMarkDialogUnread();
  const markRead = useMarkDialogRead();
  const toggleMessageTodo = useToggleDialogMessageTodo();
  const doneMessageTodo = useDoneDialogMessageTodo();
  const toggleMessageTag = useToggleDialogMessageTag();
  const favoriteCheck = useFavoriteCheck('message', dialogId ?? 0, Boolean(dialogId));
  const toggleFavorite = useToggleFavorite();
  const dialogConfig = useDialogConfig(dialogId, Boolean(dialogId));
  const [todosIncludeDone, setTodosIncludeDone] = useState(false);
  const todosQuery = useDialogMessageTodos(dialogId, todosIncludeDone, Boolean(dialogId));
  const allTodosQuery = useDialogMessageTodos(undefined, todosIncludeDone, !dialogId);

  const topsQuery = useDialogMessageTops(dialogId, Boolean(dialogId));
  const toggleMessageTop = useToggleDialogMessageTop();
  const muted = (dialogConfig.data?.isMuted ?? 0) === 1;
  const chatMuted = (dialogConfig.data?.isChatMuted ?? 0) === 1;
  const draft = useMessengerDraftStore((s) => (dialogId ? s.getDraft(dialogId) : ''));
  const setDraft = useMessengerDraftStore((s) => s.setDraft);
  const clearDraft = useMessengerDraftStore((s) => s.clearDraft);
  const setDialogMuted = useMessengerDraftStore((s) => s.setDialogMuted);

  useEffect(() => {
    if (!dialogId || !dialogConfig.isSuccess) return;
    setDialogMuted(dialogId, muted);
  }, [dialogId, dialogConfig.isSuccess, muted, setDialogMuted]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const skipAutoScrollRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [composerSel, setComposerSel] = useState({ start: 0, end: 0 });
  const [olderExhausted, setOlderExhausted] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<number | null>(null);
  const focusLoadAttemptsRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedListQuery(listQueryText.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [listQueryText]);

  /** `/manage/messenger/createGroup` 等创建动作深链 */
  useEffect(() => {
    const action = (params.dialogAction || '').trim();
    if (!action || parseDialogId(action) != null) return;
    if (action === 'createGroup') {
      window.dispatchEvent(new Event('blue-dock:new-group'));
      navigate('/manage/messenger', { replace: true });
      return;
    }
    if (action === 'addProject') {
      window.dispatchEvent(new Event('blue-dock:new-project'));
      navigate('/manage/messenger', { replace: true });
      return;
    }
    navigate('/manage/messenger', { replace: true });
  }, [params.dialogAction, navigate]);

  const searchQuery = useDialogSearch(
    debouncedListQuery,
    40,
    searchMode === 'dialog' && debouncedListQuery.length > 0,
  );
  const tagSearchQuery = useDialogSearchTag(debouncedListQuery, 50, searchMode === 'tag');

  const { botDialogIds } = useDialogBotIdSet(listQuery.data, me?.userId);

  const dialogNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of listQuery.data ?? []) {
      map.set(d.id, d.name?.trim() || `#${d.id}`);
    }
    return map;
  }, [listQuery.data]);

  const dialogs = useMemo(() => {
    if (searchMode === 'tag') {
      return sortDialogs(tagSearchQuery.data ?? []);
    }
    if (debouncedListQuery) {
      return sortDialogs(searchQuery.data ?? []);
    }
    const sorted = sortDialogs(listQuery.data ?? []);
    return sorted.filter((d) => dialogMatchesFilter(d, filter, botDialogIds));
  }, [
    listQuery.data,
    filter,
    botDialogIds,
    debouncedListQuery,
    searchQuery.data,
    searchMode,
    tagSearchQuery.data,
  ]);

  const beyondDialogs = useMemo(() => sortDialogs(beyondQuery.data ?? []), [beyondQuery.data]);

  /** 列表可见的单聊（非 bot）→ 批量成员 → presence 绿点 */
  const listDmDialogIds = useMemo(
    () =>
      dialogs
        .filter((d) => (d.type || '').toLowerCase() === 'user' && !botDialogIds.has(d.id))
        .map((d) => d.id)
        .slice(0, 40),
    [dialogs, botDialogIds],
  );
  const listMemberQueries = useDialogMemberIdsMany(
    listDmDialogIds,
    connected && Boolean(me?.userId) && listDmDialogIds.length > 0,
  );
  const listMembersKey = listMemberQueries.map((q) => (q.data ?? []).join(',')).join('|');
  const peerByDialogId = useMemo(() => {
    const map = new Map<number, number>();
    const myId = me?.userId;
    if (myId == null) return map;
    const rows = listMembersKey.split('|');
    for (let i = 0; i < listDmDialogIds.length; i++) {
      const dialogId = listDmDialogIds[i]!;
      const ids = (rows[i] || '')
        .split(',')
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0);
      const peer = ids.find((id) => id !== myId);
      if (peer) map.set(dialogId, peer);
    }
    return map;
  }, [listDmDialogIds, me?.userId, listMembersKey]);
  const listPresenceIds = useMemo(() => [...new Set(peerByDialogId.values())], [peerByDialogId]);
  const listPresenceQuery = useUsersPresence(listPresenceIds, listPresenceIds.length > 0);
  const onlineByUserId = useMemo(() => {
    const map = new Map<number, boolean>();
    for (const item of listPresenceQuery.data ?? []) {
      map.set(item.userId, item.online);
    }
    return map;
  }, [listPresenceQuery.data]);

  const activeFromPools = useMemo(() => {
    const pools = [listQuery.data, beyondQuery.data, searchQuery.data, tagSearchQuery.data];
    for (const pool of pools) {
      const hit = (pool ?? []).find((d: DialogView) => d.id === dialogId);
      if (hit) return hit;
    }
    return undefined;
  }, [listQuery.data, beyondQuery.data, searchQuery.data, tagSearchQuery.data, dialogId]);

  const dialogOneQuery = useDialogOne(dialogId, Boolean(dialogId) && !activeFromPools);
  const active = activeFromPools ?? dialogOneQuery.data;

  const isUserDialog = (active?.type || '').toLowerCase() === 'user';
  const membersQuery = useDialogMemberIds(dialogId);
  const peerUserId = useMemo(() => {
    if (!isUserDialog || me?.userId == null) return undefined;
    const ids = membersQuery.data ?? [];
    return ids.find((id: number) => id !== me.userId);
  }, [isUserDialog, me?.userId, membersQuery.data]);
  const peerExtra = useUserExtra(peerUserId, Boolean(peerUserId));
  const botDm = Boolean(
    (dialogId != null && botDialogIds.has(dialogId)) ||
    (isUserDialog && peerExtra.data && peerExtra.data.isBot === 1),
  );
  const peerPresence = useUserPresence(peerUserId, Boolean(peerUserId) && !botDm);
  const aiBotDm = Boolean(botDm && isAiSystemBotEmail(peerExtra.data?.email));
  const sessionsQuery = useDialogSessionList(dialogId, aiBotDm);
  const currentAiSession = useMemo(
    () => (sessionsQuery.data ?? []).find((s) => s.isCurrent === 1),
    [sessionsQuery.data],
  );
  const isNormalGroup =
    Boolean(active) &&
    (active!.type || '').toLowerCase() === 'group' &&
    ((active!.groupType || '').toLowerCase() === 'user' || !(active!.groupType || '').trim());
  const deputiesQuery = useDialogGroupDeputies(dialogId, isNormalGroup);
  const isGroupOwner = Boolean(active && me?.userId && active.ownerId === me.userId);
  const isGroupManager =
    isGroupOwner || Boolean(me?.userId && (deputiesQuery.data ?? []).includes(me.userId));
  const speakBlocked = chatMuted && !isGroupManager;
  const openMeeting = useOpenMeeting();

  const todoByMessageId = useMemo(() => {
    const map = new Map<number, DialogMessageTodoView>();
    for (const item of todosQuery.data ?? []) {
      if (!item.doneAt) map.set(item.messageId, item);
    }
    return map;
  }, [todosQuery.data]);
  const sending = sendText.isPending || sendFile.isPending || sendImage64.isPending;
  const canStartMeeting =
    Boolean(dialogId) && !botDm && (!active || dialogBadgeKind(active, botDialogIds) !== 'bot');

  const messages = useMemo((): DialogMessageView[] => {
    const items = messagesQuery.data ?? [];
    return [...items].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return at - bt;
    });
  }, [messagesQuery.data]);

  const unreadMeta = useMemo(
    () => (unreadListQuery.data ?? []).find((u: DialogUnreadItem) => u.dialogId === dialogId),
    [unreadListQuery.data, dialogId],
  );

  const firstUnreadMessageId = useMemo(() => {
    if (!dialogId || !unreadMeta || unreadMeta.unreadCount <= 0) return undefined;
    const after = unreadMeta.lastReadMessageId;
    return messages.find((m) => m.id > after)?.id;
  }, [dialogId, unreadMeta, messages]);

  const onJumpToUnread = () => {
    if (!firstUnreadMessageId) return;
    const el = document.querySelector(`[data-message-id="${firstUnreadMessageId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const emojiMapQuery = useDialogMessageEmojiMap(dialogId, messageIds, Boolean(dialogId));
  const selectedMessages = useMemo(
    () => messages.filter((m) => selectedMessageIds.includes(m.id)),
    [messages, selectedMessageIds],
  );
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedMessageIds([]);
  };
  const toggleSelectMessage = (id: number) => {
    setSelectedMessageIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 50) {
        toast.danger(t('mergeForward.maxSources', { max: 50 }));
        return prev;
      }
      return [...prev, id];
    });
  };

  const topMessageIds = useMemo(() => {
    const set = new Set<number>();
    for (const m of topsQuery.data ?? []) set.add(m.id);
    return set;
  }, [topsQuery.data]);

  useEffect(() => {
    setReplyTo(null);
    setComposerSel({ start: 0, end: 0 });
    setSelectMode(false);
    setSelectedMessageIds([]);
    setOlderExhausted(false);
    setHighlightMessageId(null);
    focusLoadAttemptsRef.current = 0;
  }, [dialogId]);

  const latestMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : undefined;

  useEffect(() => {
    if (!dialogId) return;
    readMessages.mutate({
      dialogId,
      ...(latestMessageId != null ? { messageId: latestMessageId } : {}),
    });
  }, [dialogId, latestMessageId]); // 跟读最新消息；不依赖 mutate 引用

  useEffect(() => {
    if (!dialogId || !botDm || !activeFromPools) return;
    openDialogEvent.mutate(dialogId);
  }, [dialogId, botDm, activeFromPools]); // 列表内机器人会话触发 dialogOpen

  useEffect(() => {
    if (skipAutoScrollRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, dialogId]);

  const oldestMessageId = messages[0]?.id;

  /** 深链 `?msg=`：滚动定位并短暂高亮；不在当前页则向前翻历史 */
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
      toast.danger(t('jump.notFound'));
      clearFocusParam();
      return;
    }

    if (focusLoadAttemptsRef.current >= 20) {
      toast.danger(t('jump.notFound'));
      clearFocusParam();
      return;
    }

    focusLoadAttemptsRef.current += 1;
    skipAutoScrollRef.current = true;
    loadOlder.mutate(
      { dialogId, beforeId: oldestMessageId, take: MESSAGE_PAGE_TAKE },
      {
        onSuccess: (older) => {
          if (older.length < MESSAGE_PAGE_TAKE) setOlderExhausted(true);
          skipAutoScrollRef.current = false;
        },
        onError: (err) => {
          skipAutoScrollRef.current = false;
          toastRequestError(err, t('error'));
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
    t,
  ]);

  useEffect(() => {
    if (highlightMessageId == null) return;
    const timer = window.setTimeout(() => setHighlightMessageId(null), 2500);
    return () => window.clearTimeout(timer);
  }, [highlightMessageId]);

  const onLoadOlder = () => {
    if (!dialogId || !oldestMessageId || olderExhausted || loadOlder.isPending) return;
    const el = threadRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    skipAutoScrollRef.current = true;
    loadOlder.mutate(
      { dialogId, beforeId: oldestMessageId, take: MESSAGE_PAGE_TAKE },
      {
        onSuccess: (older) => {
          if (older.length < MESSAGE_PAGE_TAKE) setOlderExhausted(true);
          requestAnimationFrame(() => {
            if (el) {
              el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
            }
            skipAutoScrollRef.current = false;
          });
        },
        onError: (err) => {
          skipAutoScrollRef.current = false;
          toastRequestError(err, t('error'));
        },
      },
    );
  };

  const messageById = useMemo(() => {
    const map = new Map<number, DialogMessageView>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  const onSelect = (id: number, messageId?: number) => {
    if (messageId && messageId > 0) {
      navigate(`/manage/messenger/${id}?msg=${messageId}`);
      return;
    }
    navigate(`/manage/messenger/${id}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== 'u') return;
      e.preventDefault();
      const sorted = sortDialogs(listQuery.data ?? []);
      const next = findNextUnreadDialog(sorted, dialogId);
      if (!next) {
        toast.success(t('nextUnread.empty'));
        return;
      }
      if (next.id === dialogId) {
        toast.success(t('nextUnread.onlyCurrent'));
        return;
      }
      onSelect(next.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogId, listQuery.data, navigate, t]);

  const submitDraft = () => {
    if (!dialogId || botDm) return;
    const text = draft.trim();
    if (!text || sending) return;
    const replyId = replyTo?.id;
    sendText.mutate(
      { dialogId, text, ...(replyId ? { replyId } : {}) },
      {
        onSuccess: () => {
          clearDraft(dialogId);
          setReplyTo(null);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    submitDraft();
  };

  const onPickFile = () => {
    if (botDm || sending) return;
    fileInputRef.current?.click();
  };

  const onFileChange = (files: FileList | null) => {
    if (!dialogId || botDm || !files?.length) return;
    const file = files[0];
    if (!file) return;
    const replyId = replyTo?.id;
    sendFile.mutate(
      { dialogId, file, ...(replyId ? { replyId } : {}) },
      {
        onSuccess: () => setReplyTo(null),
        onError: (err) => toastRequestError(err, t('error')),
        onSettled: () => {
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      },
    );
  };

  /** 剪贴板图片 → `image64`（≤5MB data-URL） */
  const onPasteComposer = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!dialogId || botDm || speakBlocked || sending) return;
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
          const replyId = replyTo?.id;
          const ext = file.type.split('/')[1] || 'png';
          sendImage64.mutate(
            {
              dialogId,
              image,
              filename: file.name?.trim() || `paste.${ext}`,
              ...(replyId ? { replyId } : {}),
            },
            {
              onSuccess: () => {
                setReplyTo(null);
                toast.success(t('composer.pasteImageDone'));
              },
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

  const onWithdraw = (msg: DialogMessageView) => {
    if (recallLimitMin > 0 && msg.createdAt) {
      const ageMs = Date.now() - new Date(msg.createdAt).getTime();
      if (Number.isFinite(ageMs) && ageMs > recallLimitMin * 60_000) {
        toast.danger(t('actions.withdrawExpired', { minutes: recallLimitMin }));
        return;
      }
    }
    if (!window.confirm(t('actions.withdrawConfirm'))) return;
    withdraw.mutate(
      { messageId: msg.id, dialogId: msg.dialogId },
      {
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onTogglePin = () => {
    if (!active) return;
    const next: 0 | 1 = active.isTop ? 0 : 1;
    toggleTop.mutate(
      { dialogId: active.id, isTop: next },
      {
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onToggleMute = () => {
    if (!dialogId) return;
    const next: 0 | 1 = muted ? 0 : 1;
    toggleMute.mutate(
      { dialogId, isSilent: next },
      {
        onSuccess: () => {
          setDialogMuted(dialogId, next === 1);
          toast.success(next ? t('actions.muted') : t('actions.unmuted'));
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onToggleChatMute = () => {
    if (!dialogId || !isNormalGroup) return;
    const next: 0 | 1 = chatMuted ? 0 : 1;
    toggleChatMute.mutate(
      { dialogId, isChatMuted: next },
      {
        onSuccess: () => toast.success(next ? t('actions.chatMuted') : t('actions.chatUnmuted')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onToggleMessageTodo = (msg: DialogMessageView) => {
    if (!dialogId) return;
    const existing = todoByMessageId.get(msg.id);
    toggleMessageTodo.mutate(
      { messageId: msg.id, dialogId, cancel: Boolean(existing) },
      {
        onSuccess: () => toast.success(existing ? t('todo.cancelled') : t('todo.added')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDoneMessageTodo = (msg: DialogMessageView) => {
    if (!dialogId) return;
    doneMessageTodo.mutate(
      { messageId: msg.id, dialogId },
      {
        onSuccess: () => toast.success(t('todo.done')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onToggleMessageTop = (msg: DialogMessageView) => {
    if (!dialogId) return;
    const cancel = topMessageIds.has(msg.id);
    toggleMessageTop.mutate(
      { messageId: msg.id, dialogId, cancel },
      {
        onSuccess: () => toast.success(cancel ? t('msgTop.unpinned') : t('msgTop.pinned')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onToggleMessageTag = (msg: DialogMessageView) => {
    if (!dialogId) return;
    const tagged = (msg.tagUserId ?? 0) > 0;
    toggleMessageTag.mutate(
      { messageId: msg.id, dialogId },
      {
        onSuccess: () => toast.success(tagged ? t('tag.removed') : t('tag.added')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onHide = () => {
    if (!dialogId) return;
    if (!window.confirm(t('actions.hideConfirm'))) return;
    hideDialog.mutate(
      { dialogId, isHidden: 1 },
      {
        onSuccess: () => {
          toast.success(t('actions.hidden'));
          navigate('/manage/messenger');
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onRestore = (id: number) => {
    hideDialog.mutate(
      { dialogId: id, isHidden: 0 },
      {
        onSuccess: () => {
          toast.success(t('actions.restored'));
          onSelect(id);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onMarkUnread = () => {
    if (!dialogId) return;
    markUnread.mutate(dialogId, {
      onSuccess: () => {
        toast.success(t('actions.markedUnread'));
        navigate('/manage/messenger');
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onMarkRead = () => {
    if (!dialogId) return;
    markRead.mutate(
      { dialogId },
      {
        onSuccess: () => toast.success(t('actions.markedRead')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onStartMeeting = () => {
    if (!canStartMeeting || !dialogId) return;
    const invitees = (membersQuery.data ?? [])
      .filter((id: number) => id !== me?.userId)
      .slice(0, 20);
    openMeeting.mutate(
      {
        type: 'create',
        ...(active?.name?.trim() ? { name: active.name.trim() } : {}),
        ...(invitees.length > 0 ? { userIds: invitees.join(',') } : {}),
      },
      {
        onSuccess: (view) => {
          toast.success(t('meeting.started'));
          void messagesQuery.refetch();
          void listQuery.refetch();
          openAppPath(`/meeting/${view.meetingId}`, { width: 1100, height: 800 });
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <div className="flex h-full min-h-0">
      <aside className="border-border bg-surface flex w-full max-w-xs shrink-0 flex-col border-e sm:w-80">
        <div className="border-border flex flex-col gap-2 border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              {anonMessageOpen ? <AnonMessageModal /> : null}
              <SendBotMessageModal />
              <StartAiChatModal />
              <SendApproveModal />
              <BroadcastFilesModal />
              <CreateGroupModal listenGlobal={false} />
            </div>
          </div>
          <SearchField
            name="dialog-search"
            value={listQueryText}
            onChange={setListQueryText}
            className="w-full"
            aria-label={searchMode === 'tag' ? t('dialogTag.search') : t('search')}
          >
            <Label className="sr-only">
              {searchMode === 'tag' ? t('dialogTag.search') : t('search')}
            </Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder={
                  searchMode === 'tag' ? t('dialogTag.searchPlaceholder') : t('searchPlaceholder')
                }
                autoComplete="off"
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={searchMode === 'dialog' ? 'primary' : 'secondary'}
              className="flex-1"
              onPress={() => setSearchMode('dialog')}
            >
              {t('searchMode.dialog')}
            </Button>
            <Button
              size="sm"
              variant={searchMode === 'tag' ? 'primary' : 'secondary'}
              className="flex-1"
              onPress={() => setSearchMode('tag')}
            >
              {t('searchMode.tag')}
            </Button>
          </div>
          {searchMode === 'dialog' && !debouncedListQuery ? (
            <Select
              className="w-full"
              value={filter}
              onChange={(key) => setFilter((String(key ?? 'all') as DialogFilter) || 'all')}
            >
              <Label className="sr-only">{t('filter.all')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {FILTERS.map((id) => (
                    <ListBox.Item key={id} id={id} textValue={t(`filter.${id}`)}>
                      {t(`filter.${id}`)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {searchMode === 'tag' && tagSearchQuery.isFetching ? (
            <p className="text-muted p-4 text-sm">{t('loading')}</p>
          ) : null}
          {searchMode === 'dialog' && debouncedListQuery && searchQuery.isFetching ? (
            <p className="text-muted p-4 text-sm">{t('loading')}</p>
          ) : null}
          {searchMode === 'dialog' && listQuery.isLoading && !debouncedListQuery ? (
            <p className="text-muted p-4 text-sm">{t('loading')}</p>
          ) : null}
          {searchMode === 'dialog' && listQuery.isError && !debouncedListQuery ? (
            <div className="flex flex-col gap-2 p-4">
              <p className="text-danger text-sm">{t('error')}</p>
              <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
                {t('retry')}
              </Button>
            </div>
          ) : null}
          {searchMode === 'tag' && tagSearchQuery.isError ? (
            <div className="flex flex-col gap-2 p-4">
              <p className="text-danger text-sm">{t('error')}</p>
              <Button size="sm" variant="secondary" onPress={() => void tagSearchQuery.refetch()}>
                {t('retry')}
              </Button>
            </div>
          ) : null}
          {searchMode === 'dialog' &&
          !listQuery.isLoading &&
          !listQuery.isError &&
          !debouncedListQuery &&
          dialogs.length === 0 ? (
            <p className="text-muted p-4 text-sm">{t('empty')}</p>
          ) : null}
          {searchMode === 'dialog' &&
          debouncedListQuery &&
          !searchQuery.isFetching &&
          dialogs.length === 0 ? (
            <p className="text-muted p-4 text-sm">{t('searchEmpty')}</p>
          ) : null}
          {searchMode === 'tag' &&
          !tagSearchQuery.isFetching &&
          !tagSearchQuery.isError &&
          dialogs.length === 0 ? (
            <p className="text-muted p-4 text-sm">{t('dialogTag.empty')}</p>
          ) : null}
          <ul>
            {dialogs.map((dialog: DialogView) => {
              const selected = dialog.id === dialogId;
              const preview = previewMessageBody(dialog.lastMessage) || dialog.lastMessage || '—';
              const accent = (dialog.color || '').trim();
              return (
                <li key={dialog.id}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'hover:bg-default h-auto w-full items-start justify-start gap-3 rounded-none px-4 py-3 text-left font-normal',
                      selected && 'bg-accent-soft',
                      !accent && dialog.isTop ? 'border-accent/30 border-s-2' : '',
                      accent ? 'border-s-2' : '',
                    )}
                    style={accent ? { borderLeftColor: accent } : undefined}
                    onPress={() => onSelect(dialog.id)}
                  >
                    <span className="relative size-10 shrink-0" aria-hidden>
                      <Avatar className="size-10">
                        <Avatar.Image
                          alt=""
                          src={resolveAvatarSrc(dialog.avatar, dialog.name || `#${dialog.id}`)}
                        />
                        <Avatar.Fallback>{(dialog.name || '?').slice(0, 1)}</Avatar.Fallback>
                      </Avatar>
                      {(() => {
                        const peerId = peerByDialogId.get(dialog.id);
                        const online = peerId != null && onlineByUserId.get(peerId);
                        return online ? (
                          <span className="border-background absolute bottom-0 size-2.5 rounded-full border-2 bg-emerald-500" />
                        ) : null;
                      })()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {dialog.name || `#${dialog.id}`}
                        </span>
                        <span className="text-muted shrink-0 text-[11px]">
                          {formatListTime(dialog.lastAt, t)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="text-muted truncate text-xs">{preview}</span>
                        {dialog.unreadCount > 0 ? (
                          <span className="bg-accent text-accent-foreground ms-auto shrink-0 rounded-full px-1.5 text-[10px] leading-4">
                            {dialog.unreadCount > 99 ? '99+' : dialog.unreadCount}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted mt-0.5 block text-[10px]">
                        {t(`badge.${dialogBadgeKind(dialog, botDialogIds)}`)}
                        {dialog.isTop ? ` · ${t('top')}` : ''}
                        {dialog.mentionCount > 0 ? ` · ${t('mention.badge')}` : ''}
                      </span>
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
          {!debouncedListQuery && searchMode === 'dialog' ? (
            <div className="border-border border-t p-2">
              <Button
                size="sm"
                variant="ghost"
                className="w-full justify-start"
                onPress={() => setShowBeyond((v) => !v)}
              >
                {showBeyond ? t('beyond.hide') : t('beyond.show')}
              </Button>
              {showBeyond ? (
                <div className="mt-1">
                  {beyondQuery.isLoading ? (
                    <p className="text-muted px-2 py-1 text-xs">{t('loading')}</p>
                  ) : null}
                  {beyondQuery.isError ? (
                    <p className="text-danger px-2 py-1 text-xs">{t('error')}</p>
                  ) : null}
                  {!beyondQuery.isLoading && beyondDialogs.length === 0 ? (
                    <p className="text-muted px-2 py-1 text-xs">{t('beyond.empty')}</p>
                  ) : null}
                  <ul>
                    {beyondDialogs.map((dialog) => (
                      <li key={`beyond-${dialog.id}`}>
                        <div className="flex items-center gap-1 px-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto min-w-0 flex-1 justify-start truncate px-2 py-2 text-left text-xs font-normal"
                            onPress={() => onSelect(dialog.id)}
                          >
                            {dialog.name || `#${dialog.id}`}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="shrink-0"
                            isDisabled={hideDialog.isPending}
                            onPress={() => onRestore(dialog.id)}
                          >
                            {t('actions.restore')}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>

      <section className="bg-background flex min-w-0 flex-1 flex-col">
        {!dialogId ? (
          <div className="flex flex-1 flex-col gap-4 p-6">
            <p className="text-muted text-sm">{t('select')}</p>
            {allTodosQuery.isLoading ? <p className="text-muted text-xs">{t('loading')}</p> : null}
            <div className="border-border max-w-md rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{t('todo.allTitle')}</h2>
                <Checkbox
                  isSelected={todosIncludeDone}
                  onChange={setTodosIncludeDone}
                  aria-label={t('todo.includeDone')}
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Label className="text-muted text-xs">{t('todo.includeDone')}</Label>
                  </Checkbox.Content>
                </Checkbox>
              </div>
              <p className="text-muted mt-1 text-xs">
                {todosIncludeDone
                  ? t('todo.totalCount', { count: allTodosQuery.data?.length ?? 0 })
                  : t('todo.openCount', { count: allTodosQuery.data?.length ?? 0 })}
              </p>
              {(allTodosQuery.data?.length ?? 0) > 0 ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {allTodosQuery.data!.map((todo: DialogMessageTodoView) => (
                    <li
                      key={todo.id}
                      className="border-border flex flex-col gap-1.5 rounded-lg border px-2 py-2"
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-auto w-full justify-start px-1 py-1 text-left font-normal"
                        onPress={() => onSelect(todo.dialogId, todo.messageId)}
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span
                            className={cn(
                              'truncate text-sm',
                              todo.doneAt ? 'text-muted line-through' : '',
                            )}
                          >
                            {dialogNameById.get(todo.dialogId) || `#${todo.dialogId}`}
                            {todo.doneAt ? ` · ${t('todo.doneBadge')}` : ''}
                          </span>
                          <span className="text-muted text-[10px]">
                            {todo.remindAt
                              ? t('todo.remindAt', {
                                  time: new Date(todo.remindAt).toLocaleString(),
                                })
                              : t('todo.msgRef', { id: todo.messageId })}
                          </span>
                        </span>
                      </Button>
                      {todoAllowed && !todo.doneAt ? (
                        <div className="flex flex-wrap gap-1 px-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto min-h-0 px-1.5 py-0.5 text-[10px]"
                            isDisabled={doneMessageTodo.isPending}
                            onPress={() =>
                              doneMessageTodo.mutate(
                                { messageId: todo.messageId, dialogId: todo.dialogId },
                                {
                                  onSuccess: () => toast.success(t('todo.done')),
                                  onError: (err) => toastRequestError(err, t('error')),
                                },
                              )
                            }
                          >
                            {t('todo.complete')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto min-h-0 px-1.5 py-0.5 text-[10px]"
                            isDisabled={toggleMessageTodo.isPending}
                            onPress={() =>
                              toggleMessageTodo.mutate(
                                {
                                  messageId: todo.messageId,
                                  dialogId: todo.dialogId,
                                  cancel: true,
                                },
                                {
                                  onSuccess: () => toast.success(t('todo.cancelled')),
                                  onError: (err) => toastRequestError(err, t('error')),
                                },
                              )
                            }
                          >
                            {t('todo.cancel')}
                          </Button>
                          <MessageTodoRemindModal dialogId={todo.dialogId} todo={todo} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mt-3 text-xs">{t('todo.empty')}</p>
              )}
            </div>
          </div>
        ) : (
          <>
            <header className="border-border flex flex-col gap-2 border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">
                    {active?.name || `#${dialogId}`}
                  </h2>
                  {active ? (
                    <p className="text-muted text-xs">
                      {t(`badge.${dialogBadgeKind(active, botDialogIds)}`)}
                      {isUserDialog && !botDm && peerPresence.data
                        ? ` · ${
                            peerPresence.data.online
                              ? peerPresence.data.pcActive
                                ? t('presence.onlineDesktop')
                                : t('presence.online')
                              : t('presence.offline')
                          }`
                        : ''}
                      {aiBotDm && currentAiSession
                        ? ` · ${t('session.currentLabel', {
                            title: currentAiSession.title?.trim() || t('session.untitled'),
                          })}`
                        : ''}
                      {muted ? ` · ${t('actions.mute')}` : ''}
                      {chatMuted ? ` · ${t('actions.chatMute')}` : ''}
                      {dialogConfig.data?.tag
                        ? ` · ${t('dialogTag.badge', { tag: dialogConfig.data.tag })}`
                        : ''}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {dialogId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      isIconOnly
                      aria-label={t('actions.popout')}
                      onPress={() =>
                        openAppPath(`/single/dialog/${dialogId}`, { width: 480, height: 720 })
                      }
                    >
                      <ArrowTopRightOnSquareIcon className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                  {dialogId ? <ComplaintSubmitModal dialogId={dialogId} compact /> : null}
                  {isUserDialog && peerUserId && !botDm ? (
                    <CommonGroupsModal targetUserId={peerUserId} peerName={active?.name} />
                  ) : null}
                  {dialogId && isUserDialog && !botDm ? (
                    <DialogTelephoneButton dialogId={dialogId} />
                  ) : null}
                  {dialogId && aiBotDm ? (
                    <DialogSessionPanel dialogId={dialogId} peerName={active?.name} />
                  ) : null}
                  {canStartMeeting ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={openMeeting.isPending}
                      onPress={onStartMeeting}
                    >
                      <VideoCameraIcon className="size-4" aria-hidden />
                      {openMeeting.isPending ? t('meeting.starting') : t('meeting.start')}
                    </Button>
                  ) : null}
                  {dialogId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      isIconOnly
                      aria-label={
                        favoriteCheck.data?.favorited
                          ? t('actions.unfavorite')
                          : t('actions.favorite')
                      }
                      isDisabled={toggleFavorite.isPending || favoriteCheck.isLoading}
                      onPress={() => {
                        const was = Boolean(favoriteCheck.data?.favorited);
                        toggleFavorite.mutate(
                          { type: 'message', id: dialogId },
                          {
                            onSuccess: () =>
                              toast.success(
                                was ? t('actions.unfavorited') : t('actions.favorited'),
                              ),
                            onError: (err) => toastRequestError(err, t('error')),
                          },
                        );
                      }}
                    >
                      {favoriteCheck.data?.favorited ? (
                        <StarIconSolid className="text-warning size-4" aria-hidden />
                      ) : (
                        <StarIcon className="size-4" aria-hidden />
                      )}
                    </Button>
                  ) : null}
                  {active ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={onTogglePin}
                      isDisabled={toggleTop.isPending}
                    >
                      {active.isTop ? t('actions.unpin') : t('actions.pin')}
                    </Button>
                  ) : null}
                  {isNormalGroup && active ? <GroupManageModal dialog={active} /> : null}
                  {dialogId && !botDm && !speakBlocked ? (
                    <>
                      <SendNoticeModal dialogId={dialogId} />
                      <SendTemplateModal dialogId={dialogId} />
                      <SendAiAssistantModal dialogId={dialogId} />
                    </>
                  ) : null}
                  {isNormalGroup && dialogId && isGroupManager ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={onToggleChatMute}
                      isDisabled={toggleChatMute.isPending || dialogConfig.isLoading}
                    >
                      {chatMuted ? t('actions.chatUnmute') : t('actions.chatMute')}
                    </Button>
                  ) : null}
                  {dialogId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      isIconOnly
                      aria-label={muted ? t('actions.unmute') : t('actions.mute')}
                      isDisabled={toggleMute.isPending || dialogConfig.isLoading}
                      onPress={onToggleMute}
                    >
                      {muted ? (
                        <BellSlashIcon className="size-4" aria-hidden />
                      ) : (
                        <BellIcon className="size-4" aria-hidden />
                      )}
                    </Button>
                  ) : null}
                  {dialogId && (active?.unreadCount ?? 0) > 0 ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={onMarkRead}
                      isDisabled={markRead.isPending}
                    >
                      {t('actions.markRead')}
                    </Button>
                  ) : null}
                  {dialogId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={onMarkUnread}
                      isDisabled={markUnread.isPending}
                    >
                      {t('actions.markUnread')}
                    </Button>
                  ) : null}
                  {dialogId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      isIconOnly
                      aria-label={t('actions.hide')}
                      isDisabled={hideDialog.isPending}
                      onPress={onHide}
                    >
                      <EyeSlashIcon className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                  {dialogId && !botDm ? (
                    <Button
                      size="sm"
                      variant={selectMode ? 'primary' : 'secondary'}
                      onPress={() => {
                        if (selectMode) exitSelectMode();
                        else setSelectMode(true);
                      }}
                    >
                      {selectMode ? t('batch.exit') : t('batch.select')}
                    </Button>
                  ) : null}
                  {active?.groupType === 'task' && active.linkId > 0 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => navigate(`/single/task/${active.linkId}`)}
                    >
                      {t('tabs.openTask')}
                    </Button>
                  ) : null}
                  {active?.groupType === 'project' && active.linkId > 0 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => navigate(`/manage/project/${active.linkId}`)}
                    >
                      {t('tabs.openProject')}
                    </Button>
                  ) : null}
                  {active?.groupType === 'okr' && active.linkId > 0 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => navigate(`/manage/apps/okr?okrId=${active.linkId}`)}
                    >
                      {t('tabs.openOkr')}
                    </Button>
                  ) : null}
                </div>
              </div>
              {dialogId ? (
                <div className="flex flex-col gap-2">
                  <DialogTagField dialogId={dialogId} tag={dialogConfig.data?.tag ?? ''} />
                  <DialogColorField
                    dialogId={dialogId}
                    color={dialogConfig.data?.color ?? active?.color ?? ''}
                  />
                </div>
              ) : null}
            </header>

            <div ref={threadRef} className="min-h-0 flex-1 overflow-auto px-4 py-3">
              {messagesQuery.isLoading ? (
                <p className="text-muted text-sm">{t('loading')}</p>
              ) : null}
              {messagesQuery.isError ? (
                <div className="flex items-center gap-2">
                  <p className="text-danger text-sm">{t('error')}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => void messagesQuery.refetch()}
                  >
                    {t('retry')}
                  </Button>
                </div>
              ) : null}
              {!messagesQuery.isLoading && messages.length === 0 ? (
                <p className="text-muted text-sm">{t('threadEmpty')}</p>
              ) : null}
              {messages.length >= MESSAGE_PAGE_TAKE && !olderExhausted ? (
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
              {olderExhausted && messages.length >= MESSAGE_PAGE_TAKE ? (
                <p className="text-muted mb-3 text-center text-[10px]">{t('history.noMore')}</p>
              ) : null}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                {(todosQuery.data?.length ?? 0) > 0 ? (
                  <p className="text-muted text-xs">
                    {todosIncludeDone
                      ? t('todo.totalCount', { count: todosQuery.data!.length })
                      : t('todo.openCount', { count: todosQuery.data!.length })}
                  </p>
                ) : (
                  <span />
                )}
                <Checkbox
                  isSelected={todosIncludeDone}
                  onChange={setTodosIncludeDone}
                  aria-label={t('todo.includeDone')}
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Label className="text-muted text-xs">{t('todo.includeDone')}</Label>
                  </Checkbox.Content>
                </Checkbox>
              </div>
              {(topsQuery.data?.length ?? 0) > 0 ? (
                <div className="border-border bg-default/40 mb-3 rounded-lg border px-3 py-2">
                  <p className="text-muted mb-1 text-[10px] font-medium">{t('msgTop.banner')}</p>
                  <ul className="flex flex-col gap-1">
                    {(topsQuery.data ?? []).map((top) => (
                      <li key={top.id} className="flex items-center gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate">
                          {previewMessageBody(top.body) || t('reply.fallback')}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-auto min-h-0 shrink-0 px-1 py-0 text-[10px]"
                          isDisabled={toggleMessageTop.isPending}
                          onPress={() => onToggleMessageTop(top)}
                        >
                          {t('msgTop.unpin')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {firstUnreadMessageId ? (
                <div className="mb-3 flex justify-center">
                  <Button size="sm" variant="secondary" onPress={onJumpToUnread}>
                    {t('history.jumpUnread', {
                      count: unreadMeta?.unreadCount ?? 0,
                    })}
                  </Button>
                </div>
              ) : null}
              <ul className="flex flex-col gap-3">
                {messages.map((msg: DialogMessageView) => {
                  const mine = me?.userId != null && msg.userId === me.userId;
                  const parent = msg.replyId > 0 ? messageById.get(msg.replyId) : undefined;
                  const selected = selectedMessageIds.includes(msg.id);
                  return (
                    <li
                      key={msg.id}
                      data-message-id={msg.id}
                      className={cn(
                        'flex gap-2',
                        mine ? 'justify-end' : 'justify-start',
                        selectMode ? 'items-center' : '',
                        highlightMessageId === msg.id && 'ring-accent rounded-xl ring-2',
                      )}
                    >
                      {selectMode ? (
                        <Checkbox
                          isSelected={selected}
                          onChange={(next) => {
                            if (next === selected) return;
                            toggleSelectMessage(msg.id);
                          }}
                          aria-label={t('batch.toggleMessage')}
                          className="shrink-0"
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      ) : null}
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                          mine
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-surface border-border border',
                          (msg.tagUserId ?? 0) > 0 ? 'ring-warning/60 ring-2' : '',
                          selectMode && selected ? 'ring-accent ring-2' : '',
                        )}
                        onClick={selectMode ? () => toggleSelectMessage(msg.id) : undefined}
                      >
                        {(msg.tagUserId ?? 0) > 0 ? (
                          <p
                            className={cn(
                              'mb-1 text-[10px] font-medium',
                              mine ? 'text-accent-foreground/80' : 'text-warning',
                            )}
                          >
                            {t('tag.badge')}
                          </p>
                        ) : null}
                        {msg.replyId > 0 ? (
                          <div
                            className={cn(
                              'mb-1.5 border-s-2 ps-2 text-[11px]',
                              mine
                                ? 'border-accent-foreground/40 text-accent-foreground/80'
                                : 'border-border text-muted',
                            )}
                          >
                            {parent ? quotePreview(parent, t) : t('reply.missing')}
                          </div>
                        ) : null}
                        <MessageContent message={msg} mine={mine} interactive={!botDm} />
                        <MessageTranslatePanel
                          messageId={msg.id}
                          messageType={msg.type}
                          mineStyle={mine}
                        />
                        {!botDm && dialogId ? (
                          <MessageEmojiBar
                            dialogId={dialogId}
                            messageId={msg.id}
                            emojis={emojiMapQuery.data?.get(msg.id) ?? []}
                            mineStyle={mine}
                          />
                        ) : null}
                        <div
                          className={cn(
                            'mt-1 flex flex-wrap items-center gap-2 text-[10px]',
                            mine ? 'text-accent-foreground/70 justify-end' : 'text-muted',
                          )}
                        >
                          <span>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                          </span>
                          {!selectMode && !botDm ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-auto min-h-0 px-1 py-0 text-[10px]"
                              onPress={() => setReplyTo(msg)}
                            >
                              {t('actions.reply')}
                            </Button>
                          ) : null}
                          {!selectMode && !botDm && dialogId ? (
                            <MessageForwardModal messages={[msg]} currentDialogId={dialogId} />
                          ) : null}
                          {!selectMode && !botDm && canTagMessage(msg.type) ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-auto min-h-0 px-1 py-0 text-[10px]"
                              isDisabled={toggleMessageTag.isPending}
                              onPress={() => onToggleMessageTag(msg)}
                            >
                              {(msg.tagUserId ?? 0) > 0 ? t('tag.remove') : t('tag.add')}
                            </Button>
                          ) : null}
                          {!selectMode && !botDm ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-auto min-h-0 px-1 py-0 text-[10px]"
                              isDisabled={toggleMessageTop.isPending}
                              onPress={() => onToggleMessageTop(msg)}
                            >
                              {topMessageIds.has(msg.id) ? t('msgTop.unpin') : t('msgTop.pin')}
                            </Button>
                          ) : null}
                          {!selectMode && !botDm && todoAllowed && canTodoMessage(msg.type) ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-auto min-h-0 px-1 py-0 text-[10px]"
                                isDisabled={
                                  toggleMessageTodo.isPending || doneMessageTodo.isPending
                                }
                                onPress={() => onToggleMessageTodo(msg)}
                              >
                                {todoByMessageId.has(msg.id) ? t('todo.cancel') : t('todo.add')}
                              </Button>
                              {todoByMessageId.has(msg.id) ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-auto min-h-0 px-1 py-0 text-[10px]"
                                    isDisabled={doneMessageTodo.isPending}
                                    onPress={() => onDoneMessageTodo(msg)}
                                  >
                                    {t('todo.complete')}
                                  </Button>
                                  <MessageTodoRemindModal
                                    dialogId={dialogId!}
                                    todo={todoByMessageId.get(msg.id)!}
                                  />
                                </>
                              ) : null}
                            </>
                          ) : null}
                          {!selectMode && mine ? (
                            <>
                              <MessageReadReceipt
                                message={msg}
                                peerUserId={isUserDialog ? peerUserId : undefined}
                              />
                              {recallLimitMin <= 0 ||
                              !msg.createdAt ||
                              Date.now() - new Date(msg.createdAt).getTime() <=
                                recallLimitMin * 60_000 ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-auto min-h-0 px-1 py-0 text-[10px]"
                                  isDisabled={withdraw.isPending}
                                  onPress={() => onWithdraw(msg)}
                                >
                                  {t('actions.withdraw')}
                                </Button>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div ref={bottomRef} />
            </div>

            <Form className="border-border flex flex-col gap-1 border-t p-3" onSubmit={onSend}>
              {selectMode && dialogId ? (
                <div className="border-border bg-default/40 mb-1 flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5">
                  <span className="text-muted text-xs">
                    {t('batch.picked', { count: selectedMessageIds.length })}
                  </span>
                  <MessageForwardModal
                    messages={selectedMessages}
                    currentDialogId={dialogId}
                    onSuccess={exitSelectMode}
                  />
                  <MessageMergeForwardModal
                    messages={selectedMessages}
                    currentDialogId={dialogId}
                    onSuccess={exitSelectMode}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-auto min-h-0 px-1 py-0 text-[10px]"
                    onPress={exitSelectMode}
                  >
                    {t('batch.cancel')}
                  </Button>
                </div>
              ) : null}
              {botDm ? (
                <p className="text-muted text-xs">{t('composer.botReadonly')}</p>
              ) : speakBlocked ? (
                <p className="text-muted text-xs">{t('composer.chatMuted')}</p>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => onFileChange(e.target.files)}
                  />
                  {replyTo ? (
                    <div className="border-border bg-default/40 flex items-start justify-between gap-2 rounded-lg border px-2 py-1.5">
                      <div className="min-w-0">
                        <p className="text-muted text-[10px] font-medium">{t('reply.bar')}</p>
                        <p className="truncate text-xs">{quotePreview(replyTo, t)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-auto min-h-0 shrink-0 px-1 py-0 text-xs"
                        onPress={() => setReplyTo(null)}
                      >
                        {t('reply.cancel')}
                      </Button>
                    </div>
                  ) : null}
                  <div className="relative flex min-w-0 flex-1 flex-col gap-1">
                    <MentionSuggest
                      dialogId={dialogId}
                      draft={draft}
                      myUserId={me?.userId}
                      allowAll={!isUserDialog}
                      onChangeDraft={(next) => {
                        if (dialogId) setDraft(dialogId, next);
                      }}
                    />
                    <TaskSuggest
                      draft={draft}
                      defaultProjectId={
                        active?.groupType === 'project' && active.linkId > 0
                          ? active.linkId
                          : undefined
                      }
                      onChangeDraft={(next) => {
                        if (dialogId) setDraft(dialogId, next);
                      }}
                    />
                    <ComposerFormatBar
                      value={draft}
                      disabled={sending}
                      selection={composerSel}
                      textareaRef={composerRef}
                      onSelectionChange={setComposerSel}
                      onChange={(next) => {
                        if (dialogId) setDraft(dialogId, next);
                      }}
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
                      {dialogId ? (
                        <SendLocationButton
                          dialogId={dialogId}
                          disabled={sending || speakBlocked}
                        />
                      ) : null}
                      {dialogId ? (
                        <RecordMessageButton
                          dialogId={dialogId}
                          replyId={replyTo?.id}
                          disabled={sending || speakBlocked}
                          onSent={() => setReplyTo(null)}
                          onInsertText={(text) => {
                            const next = draft
                              ? `${draft}${/\s$/.test(draft) ? '' : ' '}${text}`
                              : text;
                            setDraft(dialogId, next);
                          }}
                        />
                      ) : null}
                      {dialogId ? (
                        <StickerPickerPanel
                          dialogId={dialogId}
                          replyId={replyTo?.id}
                          disabled={sending || speakBlocked}
                          onSent={() => setReplyTo(null)}
                        />
                      ) : null}
                      <CreateVoteModal dialogId={dialogId} isDisabled={sending} />
                      <CreateWordChainModal dialogId={dialogId} isDisabled={sending} />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        isDisabled={sending}
                        onPress={() => {
                          if (!dialogId) return;
                          const next = detectMentionTrigger(draft)
                            ? draft
                            : `${draft}${draft && !/\s$/.test(draft) ? ' ' : ''}@`;
                          setDraft(dialogId, next);
                        }}
                      >
                        @
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        isDisabled={sending}
                        onPress={() => {
                          if (!dialogId) return;
                          const next = detectTaskTrigger(draft)
                            ? draft
                            : `${draft}${draft && !/\s$/.test(draft) ? ' ' : ''}#`;
                          setDraft(dialogId, next);
                        }}
                      >
                        #
                      </Button>
                      <TextField
                        aria-label={t('composer.placeholder')}
                        value={draft}
                        onChange={(v) => {
                          if (dialogId) setDraft(dialogId, v);
                        }}
                        className="min-w-0 flex-1"
                      >
                        <TextArea
                          ref={composerRef}
                          rows={2}
                          placeholder={t('composer.placeholder')}
                          onSelect={(e) => {
                            const el = e.currentTarget;
                            setComposerSel({
                              start: el.selectionStart,
                              end: el.selectionEnd,
                            });
                          }}
                          onKeyUp={(e) => {
                            const el = e.currentTarget;
                            setComposerSel({
                              start: el.selectionStart,
                              end: el.selectionEnd,
                            });
                          }}
                          onClick={(e) => {
                            const el = e.currentTarget;
                            setComposerSel({
                              start: el.selectionStart,
                              end: el.selectionEnd,
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              submitDraft();
                            }
                          }}
                          onPaste={onPasteComposer}
                        />
                      </TextField>
                      <Button type="submit" variant="primary" isDisabled={!draft.trim() || sending}>
                        {sending ? t('composer.sending') : t('composer.send')}
                      </Button>
                    </div>
                  </div>
                  <p className="text-muted text-[10px]">
                    {sendFile.isPending || sendImage64.isPending
                      ? t('composer.uploading')
                      : t('composer.hint')}
                  </p>
                </>
              )}
            </Form>
          </>
        )}
      </section>
    </div>
  );
}
