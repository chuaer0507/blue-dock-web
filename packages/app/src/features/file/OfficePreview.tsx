import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { useOfficeToken, type OfficeTokenView } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

type OfficeMode = 'view' | 'edit';

type DocEditorInstance = { destroyEditor?: () => void };

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (id: string, config: Record<string, unknown>) => DocEditorInstance;
    };
  }
}

function loadDocsApi(serverUrl: string): Promise<void> {
  const base = serverUrl.replace(/\/$/, '');
  const src = `${base}/web-apps/apps/api/documents/api.js`;
  if (window.DocsAPI) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[data-onlyoffice]`);
  if (existing && existing.dataset.onlyoffice === src) {
    return new Promise((resolve, reject) => {
      if (window.DocsAPI) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('script')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.onlyoffice = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('script'));
    document.head.appendChild(script);
  });
}

function buildEditorConfig(view: OfficeTokenView): Record<string, unknown> {
  const mode = view.mode === 'edit' ? 'edit' : 'view';
  return {
    width: '100%',
    height: '480px',
    document: {
      fileType: view.fileType,
      key: view.documentKey,
      title: view.filename,
      url: view.documentUrl,
    },
    documentType: view.documentType || 'word',
    editorConfig: {
      mode,
      ...(mode === 'edit' && view.callbackUrl ? { callbackUrl: view.callbackUrl } : {}),
    },
    token: view.jwt || view.token,
  };
}

/** OnlyOffice 预览 / 编辑：有 Document Server 则嵌入，否则降级外链 */
export function OfficePreview({ fileId }: { fileId: number }) {
  const { t } = useTranslation('file');
  const rawId = useId().replace(/:/g, '');
  const [mode, setMode] = useState<OfficeMode>('view');
  const placeholderId = `office-${rawId}-${mode}`;
  const editorRef = useRef<DocEditorInstance | null>(null);
  const [embedFailed, setEmbedFailed] = useState(false);
  const query = useOfficeToken(fileId, mode);

  useEffect(() => {
    setEmbedFailed(false);
    const view = query.data;
    if (!view?.documentServerUrl || !view.documentUrl) return;

    let cancelled = false;
    void (async () => {
      try {
        await loadDocsApi(view.documentServerUrl);
        if (cancelled || !window.DocsAPI) {
          if (!cancelled) setEmbedFailed(true);
          return;
        }
        editorRef.current?.destroyEditor?.();
        editorRef.current = new window.DocsAPI.DocEditor(placeholderId, buildEditorConfig(view));
      } catch {
        if (!cancelled) setEmbedFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
    };
  }, [query.data, placeholderId]);

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={mode === 'view' ? 'primary' : 'secondary'}
          isDisabled={query.isFetching && mode === 'view'}
          onPress={() => setMode('view')}
        >
          {t('office.view')}
        </Button>
        <Button
          size="sm"
          variant={mode === 'edit' ? 'primary' : 'secondary'}
          isDisabled={query.isFetching && mode === 'edit'}
          onPress={() => setMode('edit')}
        >
          {t('office.edit')}
        </Button>
        {mode === 'edit' ? <p className="text-muted text-xs">{t('office.editHint')}</p> : null}
      </div>

      {query.isLoading ? <p className="text-muted text-xs">{t('loading')}</p> : null}
      {query.isError ? <p className="text-danger text-xs">{t('office.error')}</p> : null}

      {query.data && (!query.data.documentServerUrl || embedFailed) ? (
        <div className="border-border flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-muted text-xs">{t('office.unavailable')}</p>
          {query.data.documentUrl ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={() =>
                window.open(query.data!.documentUrl, '_blank', 'noopener,noreferrer')
              }
            >
              {t('office.openExternal')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {query.data?.documentServerUrl && !embedFailed && !query.isError ? (
        <div
          key={placeholderId}
          id={placeholderId}
          className="border-border min-h-120 w-full overflow-hidden rounded-lg border"
        />
      ) : null}
    </div>
  );
}
