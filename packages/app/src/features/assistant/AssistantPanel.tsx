import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Label, ListBox, Select, TextArea, TextField, toast } from '@heroui/react';
import {
  SparklesIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  PlusIcon,
  ClockIcon,
  TrashIcon,
  StopIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import {
  flattenAssistantModels,
  logAssistantSearch,
  matchAssistantElements,
  parseAssistantResponses,
  streamAssistantInvoke,
  useAssistantAuth,
  useAssistantModels,
  useAssistantSessions,
  useDeleteAssistantSession,
  useSaveAssistantFeedback,
  useSaveAssistantSession,
  type AssistantChatMessage,
  type AssistantFeedbackValue,
  type AssistantMatchHit,
  type AssistantSessionView,
  type SaveAssistantSessionInput,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';

const SESSION_KEY = 'default';
const MAX_SESSION_IMAGES = 20;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type PendingImage = {
  id: string;
  preview: string;
  content: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

const NAV_PATHS = [
  { id: 'dashboard', path: '/manage/dashboard', labelKey: 'nav.dashboard' },
  { id: 'project', path: '/manage/project', labelKey: 'nav.project' },
  { id: 'calendar', path: '/manage/calendar', labelKey: 'nav.calendar' },
  { id: 'messenger', path: '/manage/messenger', labelKey: 'nav.messenger' },
  { id: 'file', path: '/manage/file', labelKey: 'nav.file' },
  { id: 'application', path: '/manage/application', labelKey: 'nav.application' },
  { id: 'search', path: '/manage/search', labelKey: 'nav.search' },
] as const;

type UiMessage = AssistantChatMessage & {
  id: string;
  localId?: number;
  feedback?: AssistantFeedbackValue;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toUiMessages(list: AssistantChatMessage[]): UiMessage[] {
  let localId = 0;
  return list.map((m) => ({
    ...m,
    id: newId(),
    ...(m.role === 'assistant'
      ? { localId: ++localId, feedback: '' as AssistantFeedbackValue }
      : {}),
  }));
}

/** Manage 壳内 AI 助手浮层 */
export function AssistantPanel() {
  const { t, i18n } = useTranslation('assistant');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [modelId, setModelId] = useState('');
  const [sessionId, setSessionId] = useState(() => newId());
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [pageMatches, setPageMatches] = useState<AssistantMatchHit[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const localIdRef = useRef(0);

  const modelsQuery = useAssistantModels(true);
  const sessionsQuery = useAssistantSessions(SESSION_KEY, open && showHistory);
  const auth = useAssistantAuth();
  const saveSession = useSaveAssistantSession();
  const deleteSession = useDeleteAssistantSession();
  const saveFeedback = useSaveAssistantFeedback();
  const models = flattenAssistantModels(modelsQuery.data);
  const sessions = sessionsQuery.data ?? [];
  const showFab = open || !modelsQuery.isSuccess || models.length > 0;

  const pageElements = useMemo(
    () =>
      NAV_PATHS.map((item) => ({
        id: item.id,
        name: `${tc(item.labelKey)} ${item.id}`,
        path: item.path,
      })),
    [tc],
  );

  useEffect(() => {
    if (!modelId && models[0]) setModelId(models[0].id);
  }, [models, modelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!open) {
      setPageMatches([]);
      return;
    }
    const q = input.trim();
    if (q.length < 2) {
      setPageMatches([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const started = Date.now();
      void matchAssistantElements({ query: q, elements: pageElements, topK: 3 })
        .then((res) => {
          if (cancelled) return;
          const hits = res.matches.filter((m) => m.similarity >= 0.35).slice(0, 3);
          setPageMatches(hits);
          void logAssistantSearch({
            query: q,
            locale: i18n.language,
            source: 'assistant.pageMatch',
            contextKey: 'nav',
            sourceIds: hits.map((h) => h.element.id).filter((id) => id != null),
            topScore: hits[0]?.similarity,
            resultCount: hits.length,
            durationMs: Date.now() - started,
          }).catch(() => {});
        })
        .catch(() => {
          if (!cancelled) setPageMatches([]);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [input, open, pageElements, i18n.language]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== 'i') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      e.preventDefault();
      setOpen((v) => {
        if (v) {
          abortRef.current?.abort();
          setFullscreen(false);
          setShowHistory(false);
          return false;
        }
        return true;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const persist = (
    sid: string,
    msgs: AssistantChatMessage[],
    images?: Record<string, string>,
  ) => {
    if (!msgs.length) return;
    const title = msgs.find((m) => m.role === 'user')?.content.slice(0, 40) || t('title');
    const payload: SaveAssistantSessionInput = {
      sessionKey: SESSION_KEY,
      sessionId: sid,
      title,
      sceneKey: 'manage',
      data: msgs.map(({ role, content }) => ({ role, content })),
      ...(images && Object.keys(images).length ? { newImages: images } : {}),
    };
    saveSession.mutate(payload, {
      onSuccess: () => {
        if (images && Object.keys(images).length) setPendingImages([]);
      },
    });
  };

  const startNew = () => {
    abortRef.current?.abort();
    localIdRef.current = 0;
    setSessionId(newId());
    setMessages([]);
    setPendingImages([]);
    setShowHistory(false);
    setStreaming(false);
  };

  const loadSession = (id: string, responses: unknown) => {
    abortRef.current?.abort();
    const msgs = toUiMessages(parseAssistantResponses(responses));
    localIdRef.current = msgs.reduce((max, m) => Math.max(max, m.localId ?? 0), 0);
    setSessionId(id);
    setMessages(msgs);
    setPendingImages([]);
    setShowHistory(false);
    setStreaming(false);
  };

  const removeSession = (id: string) => {
    deleteSession.mutate(
      { sessionKey: SESSION_KEY, sessionId: id },
      {
        onSuccess: () => {
          if (sessionId === id) startNew();
          toast.success(t('deleted'));
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const clearAllSessions = () => {
    if (!window.confirm(t('clearAllConfirm'))) return;
    deleteSession.mutate(
      { sessionKey: SESSION_KEY, clearAll: true },
      {
        onSuccess: () => {
          startNew();
          toast.success(t('cleared'));
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const onFeedback = (msg: UiMessage, next: AssistantFeedbackValue) => {
    if (!msg.localId || msg.role !== 'assistant' || !msg.content.trim()) return;
    const feedback = msg.feedback === next ? '' : next;
    const idx = messages.findIndex((m) => m.id === msg.id);
    const prompt =
      idx > 0
        ? [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user')?.content
        : undefined;
    const selected = models.find((m) => m.id === modelId) ?? models[0];
    saveFeedback.mutate(
      {
        sessionKey: SESSION_KEY,
        sessionId,
        localId: msg.localId,
        feedback,
        prompt,
        answer: msg.content,
        model: selected?.id,
      },
      {
        onSuccess: (data) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, feedback: data.feedback } : m)),
          );
          toast.success(
            data.feedback === 'like'
              ? t('feedback.liked')
              : data.feedback === 'dislike'
                ? t('feedback.disliked')
                : t('feedback.cleared'),
          );
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;
    if (!models.length) {
      toast.danger(t('noModels'));
      return;
    }

    const imagesSnapshot = Object.fromEntries(pendingImages.map((p) => [p.id, p.content]));
    const userMsg: UiMessage = { id: newId(), role: 'user', content };
    const assistantId = newId();
    const assistantLocalId = ++localIdRef.current;
    const nextContext: AssistantChatMessage[] = [
      ...messages.map(({ role, content: c }) => ({ role, content: c })),
      { role: 'user', content },
    ];

    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        localId: assistantLocalId,
        feedback: '',
      },
    ]);
    setInput('');
    setStreaming(true);

    const selected = models.find((m) => m.id === modelId) ?? models[0]!;
    const sid = sessionId;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    let assistantText = '';

    try {
      const { streamKey } = await auth.mutateAsync({
        modelName: selected.id,
        modelType: selected.provider,
        context: nextContext,
        sessionId: sid,
        locale: i18n.language,
      });
      await streamAssistantInvoke(streamKey, {
        signal: ac.signal,
        onAppend: (chunk) => {
          assistantText += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          );
        },
        onDone: (error) => {
          if (error) toast.danger(error);
          setStreaming(false);
          persist(
            sid,
            [
              ...nextContext,
              ...(assistantText ? [{ role: 'assistant' as const, content: assistantText }] : []),
            ],
            imagesSnapshot,
          );
        },
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      toastRequestError(err, t('error'));
      setStreaming(false);
    } finally {
      setStreaming(false);
    }
  };

  const prompts = ['projects', 'createTask', 'draftMessage', 'priorities', 'search'] as const;

  const onPickImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_SESSION_IMAGES - pendingImages.length;
    if (room <= 0) {
      toast.danger(t('images.max', { max: MAX_SESSION_IMAGES }));
      return;
    }
    for (const file of Array.from(files).slice(0, room)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_IMAGE_BYTES) {
        toast.danger(t('images.tooLarge'));
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        if (!dataUrl) continue;
        const id = newId();
        setPendingImages((prev) =>
          prev.length >= MAX_SESSION_IMAGES
            ? prev
            : [...prev, { id, preview: dataUrl, content: dataUrl }],
        );
      } catch {
        toast.danger(t('images.failed'));
      }
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  return (
    <>
      {!open && showFab ? (
        <Button
          isIconOnly
          className="inset-e-5 fixed bottom-5 z-40 size-12 rounded-full shadow-lg"
          aria-label={t('openFab')}
          onPress={() => setOpen(true)}
        >
          <SparklesIcon className="size-6" aria-hidden />
        </Button>
      ) : null}

      {open ? (
        <div
          className={cn(
            'border-border bg-surface fixed z-50 flex flex-col shadow-xl',
            fullscreen
              ? 'inset-3 rounded-xl'
              : 'inset-e-5 bottom-5 h-[min(560px,80dvh)] w-[min(400px,calc(100vw-2.5rem))] rounded-2xl border',
          )}
          role="dialog"
          aria-label={t('title')}
        >
          <header className="border-separator flex items-center gap-2 border-b px-3 py-2">
            <p className="flex-1 text-sm font-semibold">{t('title')}</p>
            {models.length > 0 ? (
              <Select
                className="w-32"
                value={modelId}
                onChange={(key) => {
                  if (key != null) setModelId(String(key));
                }}
                aria-label={t('model')}
              >
                <Label className="sr-only">{t('model')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {models.map((m) => (
                      <ListBox.Item key={m.id} id={m.id} textValue={m.name}>
                        {m.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : null}
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={t('newChat')}
              onPress={startNew}
            >
              <PlusIcon className="size-4" aria-hidden />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={t('history')}
              onPress={() => setShowHistory((v) => !v)}
            >
              <ClockIcon className="size-4" aria-hidden />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={fullscreen ? t('exitFullscreen') : t('fullscreen')}
              onPress={() => setFullscreen((v) => !v)}
            >
              {fullscreen ? (
                <ArrowsPointingInIcon className="size-4" aria-hidden />
              ) : (
                <ArrowsPointingOutIcon className="size-4" aria-hidden />
              )}
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={t('close')}
              onPress={() => {
                abortRef.current?.abort();
                setOpen(false);
                setFullscreen(false);
                setShowHistory(false);
              }}
            >
              <XMarkIcon className="size-4" aria-hidden />
            </Button>
          </header>

          {showHistory ? (
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-muted text-xs font-medium">{t('history')}</p>
                {sessions.length > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger h-auto px-2 py-1 text-xs"
                    isDisabled={deleteSession.isPending}
                    onPress={clearAllSessions}
                  >
                    {t('clearAll')}
                  </Button>
                ) : null}
              </div>
              {sessions.length === 0 ? (
                <p className="text-muted text-sm">{t('emptyHistory')}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {sessions.map((s: AssistantSessionView) => (
                    <li key={s.id} className="flex items-stretch gap-1">
                      <Button
                        variant="ghost"
                        className="h-auto min-w-0 flex-1 justify-start rounded-lg px-3 py-2 text-left text-sm font-normal"
                        onPress={() => loadSession(s.id, s.responses)}
                      >
                        <span className="line-clamp-2">{s.title || s.id}</span>
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="text-danger shrink-0"
                        aria-label={t('delete')}
                        isDisabled={deleteSession.isPending}
                        onPress={() => removeSession(s.id)}
                      >
                        <TrashIcon className="size-4" aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-muted text-sm">{t('welcome')}</p>
                    <div className="flex flex-wrap gap-2">
                      {prompts.map((key) => (
                        <Button
                          key={key}
                          size="sm"
                          variant="secondary"
                          onPress={() => void send(t(`prompts.${key}`))}
                        >
                          {t(`prompts.${key}`)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        'flex max-w-[90%] flex-col gap-1',
                        m.role === 'user' ? 'ms-auto items-end' : 'items-start',
                      )}
                    >
                      <div
                        className={cn(
                          'whitespace-pre-wrap rounded-xl px-3 py-2 text-sm',
                          m.role === 'user'
                            ? 'bg-accent-soft text-accent-soft-foreground'
                            : 'bg-default text-foreground',
                        )}
                      >
                        {m.content || (streaming && m.role === 'assistant' ? '…' : '')}
                      </div>
                      {m.role === 'assistant' && m.localId && m.content.trim() ? (
                        <div className="flex gap-1">
                          <Button
                            isIconOnly
                            size="sm"
                            variant={m.feedback === 'like' ? 'primary' : 'ghost'}
                            className="size-7 min-w-7"
                            isDisabled={
                              saveFeedback.isPending ||
                              (streaming && messages[messages.length - 1]?.id === m.id)
                            }
                            aria-label={t('feedback.like')}
                            onPress={() => onFeedback(m, 'like')}
                          >
                            <HandThumbUpIcon className="size-4" aria-hidden />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant={m.feedback === 'dislike' ? 'primary' : 'ghost'}
                            className="size-7 min-w-7"
                            isDisabled={
                              saveFeedback.isPending ||
                              (streaming && messages[messages.length - 1]?.id === m.id)
                            }
                            aria-label={t('feedback.dislike')}
                            onPress={() => onFeedback(m, 'dislike')}
                          >
                            <HandThumbDownIcon className="size-4" aria-hidden />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form
                className="border-separator flex flex-col gap-2 border-t p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                }}
              >
                {pageMatches.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-muted text-[10px] font-medium">{t('pageMatch.title')}</p>
                    <div className="flex flex-wrap gap-1">
                      {pageMatches.map((hit) => {
                        const path = String(hit.element.path ?? '');
                        const label = String(hit.element.name ?? hit.element.id ?? path);
                        return (
                          <Button
                            key={`${hit.element.id}-${path}`}
                            size="sm"
                            variant="secondary"
                            className="h-auto min-h-0 px-2 py-1 text-[11px]"
                            onPress={() => {
                              if (path.startsWith('/') && !path.startsWith('//')) {
                                navigate(path);
                                setOpen(false);
                              }
                            }}
                          >
                            {label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {pendingImages.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {pendingImages.map((img) => (
                      <li key={img.id} className="relative">
                        <img
                          src={img.preview}
                          alt=""
                          className="border-border size-12 rounded-md border object-cover"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          isIconOnly
                          className="absolute -top-1 size-5 min-w-0 rounded-full p-0"
                          aria-label={t('images.remove')}
                          onPress={() =>
                            setPendingImages((prev) => prev.filter((x) => x.id !== img.id))
                          }
                        >
                          <XMarkIcon className="size-3" aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    isIconOnly
                    className="self-end"
                    aria-label={t('images.add')}
                    isDisabled={streaming || pendingImages.length >= MAX_SESSION_IMAGES}
                    onPress={() => imageInputRef.current?.click()}
                  >
                    <PhotoIcon className="size-4" aria-hidden />
                  </Button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void onPickImages(e.target.files)}
                  />
                  <TextField
                    name="assistantInput"
                    value={input}
                    onChange={setInput}
                    className="min-w-0 flex-1"
                    aria-label={t('placeholder')}
                  >
                    <TextArea
                      rows={2}
                      placeholder={t('placeholder')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void send(input);
                        }
                      }}
                    />
                  </TextField>
                  {streaming ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="self-end"
                      onPress={stopStreaming}
                      aria-label={t('stop')}
                    >
                      <StopIcon className="size-4" aria-hidden />
                      {t('stop')}
                    </Button>
                  ) : (
                    <Button type="submit" size="sm" className="self-end" isDisabled={!input.trim()}>
                      {t('send')}
                    </Button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
