import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Checkbox, Description, Label, SearchField, toast } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  fetchDialogMessage,
  identityHas,
  SEARCH_KINDS,
  useCurrentUser,
  useOpenDialogUser,
  useSearchAll,
  useSearchRebuild,
  useSearchRebuildStatus,
  type SearchHitType,
  type SearchHitView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** 全局搜索：防抖聚合五类结果；管理员可重建索引；`?q=` 深链 */
export function SearchPage() {
  const { t } = useTranslation('search');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(() => searchParams.get('q')?.trim() ?? '');
  const [debounced, setDebounced] = useState(() => searchParams.get('q')?.trim() ?? '');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [rebuildTypes, setRebuildTypes] = useState<SearchHitType[]>([]);

  const userQuery = useCurrentUser();
  const isAdmin = identityHas(userQuery.data?.identity, 'admin');
  const openUser = useOpenDialogUser();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(input.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const next = debounced;
    const current = searchParams.get('q')?.trim() ?? '';
    if (next === current) return;
    if (next) {
      setSearchParams({ q: next }, { replace: true });
    } else if (current) {
      setSearchParams({}, { replace: true });
    }
  }, [debounced, searchParams, setSearchParams]);

  const search = useSearchAll(debounced, 12, debounced.length > 0);
  const rebuildStatus = useSearchRebuildStatus(isAdmin);
  const rebuild = useSearchRebuild();

  const sections = useMemo(() => {
    const data = search.data;
    if (!data) return [] as { kind: SearchHitType; hits: SearchHitView[] }[];
    return SEARCH_KINDS.map((kind) => ({
      kind,
      hits: data[kind] ?? [],
    })).filter((s) => s.hits.length > 0);
  }, [search.data]);

  const totalHits = sections.reduce((n, s) => n + s.hits.length, 0);

  const failOpen = (err: unknown) => {
    toastRequestError(err, t('openError'));
  };

  const openHit = async (hit: SearchHitView, kind: SearchHitType) => {
    const key = `${kind}-${hit.id}`;
    setOpeningId(key);
    try {
      switch (kind) {
        case 'project':
          navigate(`/manage/project/${hit.id}`);
          return;
        case 'task':
          navigate(`/single/task/${hit.id}`);
          return;
        case 'file':
          navigate(`/single/file/${hit.id}`);
          return;
        case 'contact': {
          const dialog = await openUser.mutateAsync(hit.id);
          navigate(`/manage/messenger/${dialog.id}`);
          return;
        }
        case 'message': {
          // 搜索命中 id 为 messageId，需取 dialogId
          const msg = await fetchDialogMessage(hit.id);
          if (!(msg.dialogId > 0)) {
            toast.danger(t('openError'));
            return;
          }
          navigate(`/manage/messenger/${msg.dialogId}?msg=${msg.id}`);
          return;
        }
        default:
          break;
      }
    } catch (err) {
      failOpen(err);
    } finally {
      setOpeningId(null);
    }
  };

  const onRebuild = () => {
    const types = rebuildTypes.length > 0 ? rebuildTypes.join(',') : undefined;
    rebuild.mutate(types, {
      onSuccess: () => toast.success(t('rebuild.start')),
      onError: () => toast.danger(t('error')),
    });
  };

  const toggleRebuildType = (kind: SearchHitType, on: boolean) => {
    setRebuildTypes((prev) => {
      if (on) return prev.includes(kind) ? prev : [...prev, kind];
      return prev.filter((k) => k !== kind);
    });
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted text-sm">{t('hint')}</p>
      </header>

      <SearchField
        name="global-search"
        value={input}
        onChange={setInput}
        className="w-full"
        aria-label={t('title')}
      >
        <Label className="sr-only">{t('title')}</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input
            className="w-full"
            placeholder={t('placeholder')}
            autoComplete="off"
            autoFocus
          />
          <SearchField.ClearButton />
        </SearchField.Group>
        <Description>{t('hint')}</Description>
      </SearchField>

      {!debounced ? <p className="text-muted text-sm">{t('emptyQuery')}</p> : null}

      {debounced && search.isFetching ? <p className="text-muted text-sm">{t('loading')}</p> : null}

      {debounced && search.isError ? (
        <div className="flex items-center gap-3">
          <p className="text-danger text-sm">{t('error')}</p>
          <Button size="sm" variant="secondary" onPress={() => void search.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : null}

      {debounced && !search.isFetching && !search.isError && totalHits === 0 ? (
        <p className="text-muted text-sm">{t('empty')}</p>
      ) : null}

      {sections.map((section) => (
        <section key={section.kind} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">{t(`section.${section.kind}`)}</h2>
          <ul className="border-border bg-surface divide-border divide-y overflow-hidden rounded-xl border">
            {section.hits.map((hit: SearchHitView) => {
              const rowKey = `${section.kind}-${hit.id}`;
              const busy = openingId === rowKey;
              return (
                <li key={rowKey}>
                  <Button
                    variant="ghost"
                    className="h-auto w-full items-start justify-start gap-2 rounded-none px-4 py-3 text-left font-normal"
                    isDisabled={Boolean(openingId)}
                    onPress={() => void openHit({ ...hit, type: section.kind }, section.kind)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {hit.title || `#${hit.id}`}
                      </span>
                      {hit.snippet ? (
                        <span className="text-muted mt-0.5 block truncate text-xs">
                          {hit.snippet}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted shrink-0 text-xs">
                      {busy ? t('opening') : t('open')}
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {isAdmin ? (
        <section className="border-border bg-surface mt-auto flex flex-col gap-2 rounded-xl border p-4">
          <h2 className="text-sm font-semibold">{t('rebuild.title')}</h2>
          <p className="text-muted text-xs">{t('rebuild.hint')}</p>
          <p className="text-muted text-xs">{t('rebuild.typesHint')}</p>
          <div className="flex flex-wrap gap-3">
            {SEARCH_KINDS.map((kind) => (
              <Checkbox
                key={kind}
                isSelected={rebuildTypes.includes(kind)}
                onChange={(on) => toggleRebuildType(kind, on)}
              >
                {t(`section.${kind}`)}
              </Checkbox>
            ))}
          </div>
          {rebuildStatus.data?.state ? (
            <p className="text-muted text-xs">
              {t('rebuild.status', { state: String(rebuildStatus.data.state) })}
            </p>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            className="self-start"
            isDisabled={rebuild.isPending}
            onPress={onRebuild}
          >
            {rebuildTypes.length > 0 ? t('rebuild.startSelected') : t('rebuild.start')}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
