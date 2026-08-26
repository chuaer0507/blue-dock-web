import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  ProgressBar,
  Select,
  Table,
  Tabs,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import {
  ArrowUpIcon,
  ArrowUpTrayIcon,
  FolderIcon,
  DocumentIcon,
  StarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import {
  cancelUpload,
  fetchFileRawBlob,
  fetchFileText,
  formatFileSize,
  isFolderEntry,
  isImageFile,
  isOfficeFile,
  isPdfFile,
  isTextLikeFile,
  useCopyFile,
  useCreateFolder,
  useCurrentUser,
  useFavoriteCheck,
  useFile,
  useFileContent,
  useFileContentHistory,
  useFileLink,
  useFileList,
  useFileSearch,
  useFileSetting,
  useFileTrash,
  useMoveFile,
  usePackAndDownloadFiles,
  useRemoveFile,
  useRenameFile,
  useRestoreFile,
  useRestoreFileContent,
  useSaveFileContent,
  useSaveFileContentFromUpload,
  useToggleFavorite,
  uploadCabinetSession,
  useUploadCabinetFile,
  identityHas,
  isId,
  type FileContentHistoryItem,
  type FileView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import { ImagePreview } from './ImagePreview';
import { OfficePreview } from './OfficePreview';
import { PdfPreview } from './PdfPreview';
import { FileShareModal } from './FileShareModal';
import { FileSendToChatModal } from './FileSendToChatModal';

function parseId(raw: string | undefined): number | null {
  return isId(raw) ? (raw as unknown as number) : null;
}

function sortEntries(items: FileView[]): FileView[] {
  return [...items].sort((a, b) => {
    const af = isFolderEntry(a) ? 0 : 1;
    const bf = isFolderEntry(b) ? 0 : 1;
    if (af !== bf) return af - bf;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 文件：目录浏览 / 回收站 / 上传 / 重命名 / 预览 */
export function FilePage() {
  const { t } = useTranslation('file');
  const navigate = useNavigate();
  const params = useParams();
  const folderId = parseId(params.folderId);
  const fileId = parseId(params.fileId);

  const [tab, setTab] = useState('browse');
  const [searchKey, setSearchKey] = useState('');
  const listQuery = useFileList(folderId);
  const searchQuery = useFileSearch(searchKey);
  const trashQuery = useFileTrash(tab === 'trash');
  const detailQuery = useFile(fileId ?? undefined);
  const textPreview = useFileContent(
    fileId ?? undefined,
    Boolean(fileId && detailQuery.data && isTextLikeFile(detailQuery.data)),
  );
  const contentHistory = useFileContentHistory(
    fileId ?? undefined,
    50,
    Boolean(fileId && detailQuery.data && isTextLikeFile(detailQuery.data)),
  );
  const createFolder = useCreateFolder();
  const renameFile = useRenameFile();
  const moveFile = useMoveFile();
  const copyFile = useCopyFile();
  const removeFile = useRemoveFile();
  const restoreFile = useRestoreFile();
  const restoreContent = useRestoreFileContent();
  const saveContent = useSaveFileContent();
  const saveContentFromUpload = useSaveFileContentFromUpload();
  const uploadFile = useUploadCabinetFile();
  const fileLink = useFileLink();
  const packDownload = usePackAndDownloadFiles();
  const fileSetting = useFileSetting(true);
  const { data: me } = useCurrentUser();
  const canPack = useMemo(() => {
    const perm = (fileSetting.data?.packPermission || 'all').toLowerCase();
    if (perm === 'admin') return identityHas(me?.identity, 'admin');
    if (perm === 'user') {
      const allow = new Set(
        (fileSetting.data?.packUserIds || '')
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((id) => Number.isFinite(id) && id > 0),
      );
      return Boolean(me?.userId && allow.has(me.userId));
    }
    return true;
  }, [fileSetting.data?.packPermission, fileSetting.data?.packUserIds, me?.identity, me?.userId]);
  const favoriteCheck = useFavoriteCheck('file', fileId ?? 0, Boolean(fileId));
  const toggleFavorite = useToggleFavorite();
  const createState = useOverlayState();
  const renameState = useOverlayState();
  const xferState = useOverlayState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentReplaceInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const uploadIdRef = useRef<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<FileView | null>(null);
  const [renameName, setRenameName] = useState('');
  const [xferTarget, setXferTarget] = useState<FileView | null>(null);
  const [xferMode, setXferMode] = useState<'move' | 'copy'>('move');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [singleDownloading, setSingleDownloading] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [textDirty, setTextDirty] = useState(false);
  const textBaselineRef = useRef('');
  const [fetchFallback, setFetchFallback] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [contentReplacing, setContentReplacing] = useState(false);
  const [destKey, setDestKey] = useState('root');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadName, setUploadName] = useState('');

  const rootList = useFileList(null);

  const entries = useMemo(() => sortEntries(listQuery.data ?? []), [listQuery.data]);
  const searchEntries = useMemo(() => sortEntries(searchQuery.data ?? []), [searchQuery.data]);
  const trashEntries = useMemo(() => sortEntries(trashQuery.data ?? []), [trashQuery.data]);
  const searching = searchKey.trim().length > 0;
  const browseEntries = searching ? searchEntries : entries;
  const browseLoading = searching ? searchQuery.isLoading : listQuery.isLoading;
  const browseError = searching ? searchQuery.isError : listQuery.isError;
  const browseRefetch = searching
    ? () => void searchQuery.refetch()
    : () => void listQuery.refetch();

  const destFolders = useMemo(() => {
    const map = new Map<number, FileView>();
    for (const item of rootList.data ?? []) {
      if (isFolderEntry(item)) map.set(item.id, item);
    }
    for (const item of entries) {
      if (isFolderEntry(item)) map.set(item.id, item);
    }
    if (xferTarget && isFolderEntry(xferTarget)) map.delete(xferTarget.id);
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [rootList.data, entries, xferTarget]);

  const goFolder = (id: number | null) => {
    if (id == null || id <= 0) navigate('/manage/file');
    else navigate(`/manage/file/${id}`);
  };

  const goUp = () => {
    if (fileId && detailQuery.data) {
      const pid = detailQuery.data.parentId;
      goFolder(pid > 0 ? pid : null);
      return;
    }
    goFolder(null);
  };

  const onOpen = (item: FileView) => {
    if (isFolderEntry(item)) {
      goFolder(item.id);
      return;
    }
    if (folderId == null) navigate(`/manage/file/0/${item.id}`);
    else navigate(`/manage/file/${folderId}/${item.id}`);
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [folderId, searchKey, tab]);

  useEffect(() => {
    setTextDirty(false);
    setTextDraft('');
    textBaselineRef.current = '';
    setFetchFallback('idle');
  }, [fileId]);

  useEffect(() => {
    if (textDirty || !textPreview.data) return;
    const next = textPreview.data.text || textPreview.data.content || '';
    textBaselineRef.current = next;
    setTextDraft(next);
  }, [textPreview.data, textDirty]);

  useEffect(() => {
    if (!fileId || !textPreview.isError || !detailQuery.data || !isTextLikeFile(detailQuery.data)) {
      return;
    }
    let cancelled = false;
    setFetchFallback('loading');
    void fetchFileText({ id: fileId })
      .then((text) => {
        if (cancelled) return;
        textBaselineRef.current = text;
        setTextDraft(text);
        setTextDirty(false);
        setFetchFallback('ok');
      })
      .catch(() => {
        if (!cancelled) setFetchFallback('error');
      });
    return () => {
      cancelled = true;
    };
  }, [fileId, textPreview.isError, detailQuery.data]);

  const onPackDownload = (ids: number[]) => {
    if (!canPack) {
      toast.danger(t('pack.denied'));
      return;
    }
    const unique = [...new Set(ids.filter((id) => id > 0))];
    if (unique.length === 0) {
      toast.danger(t('pack.needSelect'));
      return;
    }
    packDownload.mutate(unique, {
      onSuccess: ({ blob, name }) => {
        saveBlob(blob, name);
        toast.success(t('pack.done'));
        setSelectedIds(new Set());
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onDownloadFile = async (file: FileView) => {
    setSingleDownloading(true);
    try {
      const blob = await fetchFileRawBlob(file.id);
      const name =
        file.name.includes('.') || !file.extension
          ? file.name
          : `${file.name}.${file.extension.replace(/^\./, '')}`;
      saveBlob(blob, name);
      toast.success(t('download.done'));
    } catch (err) {
      toastRequestError(err, t('error'));
    } finally {
      setSingleDownloading(false);
    }
  };

  const onDetailDownload = () => {
    const file = detailQuery.data;
    if (!file) return;
    if (isFolderEntry(file)) {
      onPackDownload([file.id]);
      return;
    }
    void onDownloadFile(file);
  };

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    createFolder.mutate(
      { name, parentId: folderId },
      {
        onSuccess: () => {
          toast.success(t('create'));
          setFolderName('');
          createState.close();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onRemove = (item: FileView) => {
    if (!window.confirm(t('confirmRemove', { name: item.name }))) return;
    removeFile.mutate(
      { id: item.id, parentId: folderId },
      {
        onSuccess: () => {
          toast.success(t('remove'));
          if (fileId === item.id) goFolder(folderId);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onRestore = (item: FileView) => {
    restoreFile.mutate(item.id, {
      onSuccess: () => toast.success(t('trash.restored')),
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onRestoreContent = (contentId: number) => {
    if (!fileId) return;
    if (!window.confirm(t('history.confirmRestore'))) return;
    restoreContent.mutate(
      { id: fileId, contentId },
      {
        onSuccess: (view) => {
          const next = view.text || view.content || '';
          textBaselineRef.current = next;
          setTextDraft(next);
          setTextDirty(false);
          toast.success(t('history.restored'));
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onSaveContent = () => {
    if (!fileId) return;
    saveContent.mutate(
      { id: fileId, content: textDraft },
      {
        onSuccess: (view) => {
          const next = view.text || view.content || textDraft;
          textBaselineRef.current = next;
          setTextDraft(next);
          setTextDirty(false);
          toast.success(t('editor.saved'));
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onPickContentReplace = () => contentReplaceInputRef.current?.click();

  const onContentReplaceChange = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !fileId || !detailQuery.data) return;
    uploadAbortRef.current?.abort();
    const ac = new AbortController();
    uploadAbortRef.current = ac;
    uploadIdRef.current = null;
    setUploadName(file.name);
    setUploadProgress(0);
    setContentReplacing(true);

    const parentId = detailQuery.data.parentId > 0 ? detailQuery.data.parentId : folderId;

    void (async () => {
      try {
        const session = await uploadCabinetSession({
          file,
          parentId,
          signal: ac.signal,
          onProgress: (ratio) => setUploadProgress(Math.round(ratio * 100)),
          onSession: (id) => {
            uploadIdRef.current = id;
          },
        });

        if (session.kind === 'instant') {
          if (session.file?.id === fileId) {
            toast.success(t('editor.replaced'));
            resetUploadUi();
            setContentReplacing(false);
            return;
          }
          const text = await file.text();
          await new Promise<void>((resolve, reject) => {
            saveContent.mutate(
              { id: fileId, content: text },
              {
                onSuccess: (view) => {
                  const next = view.text || view.content || text;
                  textBaselineRef.current = next;
                  setTextDraft(next);
                  setTextDirty(false);
                  toast.success(t('editor.replaced'));
                  resolve();
                },
                onError: reject,
              },
            );
          });
          resetUploadUi();
          setContentReplacing(false);
          return;
        }

        await new Promise<void>((resolve, reject) => {
          saveContentFromUpload.mutate(
            { id: fileId, uploadId: session.uploadId },
            {
              onSuccess: () => {
                void fetchFileText({ id: fileId })
                  .then((text) => {
                    textBaselineRef.current = text;
                    setTextDraft(text);
                    setTextDirty(false);
                    toast.success(t('editor.replaced'));
                    resolve();
                  })
                  .catch((err) => reject(err));
              },
              onError: reject,
            },
          );
        });
        uploadIdRef.current = null;
        resetUploadUi();
        setContentReplacing(false);
      } catch (err) {
        const aborted =
          (err instanceof DOMException && err.name === 'AbortError') ||
          (err instanceof Error && err.name === 'AbortError');
        resetUploadUi();
        setContentReplacing(false);
        if (aborted) return;
        toastRequestError(err, t('error'));
      } finally {
        if (contentReplaceInputRef.current) contentReplaceInputRef.current.value = '';
      }
    })();
  };

  const openRename = (item: FileView) => {
    setRenameTarget(item);
    setRenameName(item.name);
    renameState.open();
  };

  const openXfer = (item: FileView, mode: 'move' | 'copy') => {
    setXferTarget(item);
    setXferMode(mode);
    setDestKey('root');
    xferState.open();
  };

  const onXfer = (e: FormEvent) => {
    e.preventDefault();
    if (!xferTarget) return;
    const parentId = destKey === 'root' ? null : Number(destKey);
    if (destKey !== 'root' && (!Number.isFinite(parentId) || (parentId as number) <= 0)) return;
    if (xferMode === 'move') {
      moveFile.mutate(
        { id: xferTarget.id, parentId, fromParentId: folderId },
        {
          onSuccess: () => {
            toast.success(t('xfer.moved'));
            xferState.close();
            setXferTarget(null);
            if (fileId === xferTarget.id) goFolder(parentId);
          },
          onError: (err) => toastRequestError(err, t('error')),
        },
      );
      return;
    }
    copyFile.mutate(
      { id: xferTarget.id, parentId, fromParentId: folderId },
      {
        onSuccess: () => {
          toast.success(t('xfer.copied'));
          xferState.close();
          setXferTarget(null);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onRename = (e: FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const name = renameName.trim();
    if (!name || name === renameTarget.name) {
      renameState.close();
      return;
    }
    renameFile.mutate(
      { id: renameTarget.id, name, parentId: folderId },
      {
        onSuccess: () => {
          toast.success(t('rename.done'));
          renameState.close();
          setRenameTarget(null);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onPickUpload = () => fileInputRef.current?.click();

  const resetUploadUi = () => {
    setUploadProgress(null);
    setUploadName('');
    uploadAbortRef.current = null;
    uploadIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCancelUpload = () => {
    const id = uploadIdRef.current;
    uploadAbortRef.current?.abort();
    if (id) {
      void cancelUpload(id).catch(() => {
        /* 会话可能已过期 */
      });
    }
    resetUploadUi();
    toast.success(t('uploadCancelled'));
  };

  const onUploadChange = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    uploadAbortRef.current?.abort();
    const ac = new AbortController();
    uploadAbortRef.current = ac;
    uploadIdRef.current = null;
    setUploadName(file.name);
    setUploadProgress(0);
    uploadFile.mutate(
      {
        file,
        parentId: folderId,
        signal: ac.signal,
        onProgress: (ratio) => setUploadProgress(Math.round(ratio * 100)),
        onSession: (id) => {
          uploadIdRef.current = id;
        },
      },
      {
        onSuccess: () => {
          toast.success(t('uploadDone'));
          resetUploadUi();
        },
        onError: (err) => {
          const aborted =
            (err instanceof DOMException && err.name === 'AbortError') ||
            (err instanceof Error && err.name === 'AbortError');
          resetUploadUi();
          if (aborted) return;
          toastRequestError(err, t('error'));
        },
      },
    );
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted mt-1 text-sm">
            {folderId ? `#${folderId}` : t('root')}
            {fileId ? ` / #${fileId}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {folderId != null || fileId != null ? (
            <Button size="sm" variant="secondary" onPress={goUp}>
              <ArrowUpIcon className="size-4" aria-hidden />
              {t('up')}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              if (tab === 'trash') void trashQuery.refetch();
              else void listQuery.refetch();
            }}
          >
            {t('refresh')}
          </Button>
          {tab === 'browse' ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => onUploadChange(e.target.files)}
              />
              <Button
                size="sm"
                variant="secondary"
                isDisabled={uploadFile.isPending}
                onPress={onPickUpload}
              >
                <ArrowUpTrayIcon className="size-4" aria-hidden />
                {uploadFile.isPending ? t('uploading') : t('upload')}
              </Button>
              <Modal>
                <Button size="sm" variant="primary" onPress={createState.open}>
                  {t('newFolder')}
                </Button>
                <Modal.Backdrop isOpen={createState.isOpen} onOpenChange={createState.setOpen}>
                  <Modal.Container>
                    <Modal.Dialog className="sm:max-w-sm">
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Heading>{t('newFolder')}</Modal.Heading>
                      </Modal.Header>
                      <Modal.Body>
                        <Form className="flex flex-col gap-4" onSubmit={onCreate}>
                          <TextField
                            name="folderName"
                            isRequired
                            value={folderName}
                            onChange={setFolderName}
                            className="w-full"
                          >
                            <Label>{t('folderName')}</Label>
                            <Input autoFocus />
                          </TextField>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onPress={createState.close}>
                              {t('actions.close')}
                            </Button>
                            <Button
                              type="submit"
                              variant="primary"
                              isDisabled={!folderName.trim() || createFolder.isPending}
                            >
                              {createFolder.isPending ? t('creating') : t('create')}
                            </Button>
                          </div>
                        </Form>
                      </Modal.Body>
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              </Modal>
              <Modal>
                <Modal.Backdrop
                  isOpen={renameState.isOpen}
                  onOpenChange={(open) => {
                    renameState.setOpen(open);
                    if (!open) setRenameTarget(null);
                  }}
                >
                  <Modal.Container>
                    <Modal.Dialog className="sm:max-w-sm">
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Heading>{t('rename.title')}</Modal.Heading>
                      </Modal.Header>
                      <Modal.Body>
                        <Form className="flex flex-col gap-4" onSubmit={onRename}>
                          <TextField
                            name="renameName"
                            isRequired
                            value={renameName}
                            onChange={setRenameName}
                            className="w-full"
                          >
                            <Label>{t('rename.name')}</Label>
                            <Input autoFocus />
                          </TextField>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onPress={renameState.close}>
                              {t('actions.close')}
                            </Button>
                            <Button
                              type="submit"
                              variant="primary"
                              isDisabled={!renameName.trim() || renameFile.isPending}
                            >
                              {renameFile.isPending ? t('rename.saving') : t('rename.save')}
                            </Button>
                          </div>
                        </Form>
                      </Modal.Body>
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              </Modal>
              <Modal>
                <Modal.Backdrop
                  isOpen={xferState.isOpen}
                  onOpenChange={(open) => {
                    xferState.setOpen(open);
                    if (!open) setXferTarget(null);
                  }}
                >
                  <Modal.Container>
                    <Modal.Dialog className="sm:max-w-sm">
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Heading>
                          {xferMode === 'move' ? t('xfer.move') : t('xfer.copy')}
                        </Modal.Heading>
                      </Modal.Header>
                      <Modal.Body>
                        <Form className="flex flex-col gap-4" onSubmit={onXfer}>
                          <p className="text-muted truncate text-sm">{xferTarget?.name}</p>
                          <Select
                            className="w-full"
                            value={destKey}
                            onChange={(key) => setDestKey(String(key ?? 'root'))}
                          >
                            <Label>{t('xfer.dest')}</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="root" textValue={t('xfer.root')}>
                                  {t('xfer.root')}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                                {destFolders.map((folder) => (
                                  <ListBox.Item
                                    key={folder.id}
                                    id={String(folder.id)}
                                    textValue={folder.name}
                                  >
                                    {folder.name}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onPress={xferState.close}>
                              {t('actions.close')}
                            </Button>
                            <Button
                              type="submit"
                              variant="primary"
                              isDisabled={moveFile.isPending || copyFile.isPending}
                            >
                              {xferMode === 'move'
                                ? moveFile.isPending
                                  ? t('xfer.moving')
                                  : t('xfer.move')
                                : copyFile.isPending
                                  ? t('xfer.copying')
                                  : t('xfer.copy')}
                            </Button>
                          </div>
                        </Form>
                      </Modal.Body>
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              </Modal>
            </>
          ) : null}
        </div>
      </header>

      {uploadProgress != null ? (
        <div className="border-border bg-surface flex flex-col gap-2 rounded-xl border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted truncate text-xs">
              {t('uploadProgress', { name: uploadName, percent: uploadProgress })}
            </p>
            <Button size="sm" variant="ghost" onPress={onCancelUpload}>
              {t('uploadCancel')}
            </Button>
          </div>
          <ProgressBar
            aria-label={t('uploading')}
            value={uploadProgress}
            className="w-full"
            size="sm"
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </div>
      ) : null}

      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} className="w-full">
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('title')}>
            <Tabs.Tab id="browse">
              {t('tabs.browse')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="trash">
              {t('tabs.trash')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="browse" className="flex flex-col gap-4 pt-4">
          <TextField
            aria-label={t('searchName')}
            value={searchKey}
            onChange={setSearchKey}
            className="max-w-md"
          >
            <Label>{t('searchName')}</Label>
            <Input placeholder={t('searchName')} />
          </TextField>

          {browseLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
          {browseError ? (
            <div className="flex items-center gap-2">
              <p className="text-danger text-sm">{t('error')}</p>
              <Button size="sm" variant="secondary" onPress={browseRefetch}>
                {t('retry')}
              </Button>
            </div>
          ) : null}

          {fileId && detailQuery.data ? (
            <section className="border-border bg-surface rounded-xl border p-4">
              <h2 className="text-sm font-semibold">{t('detail')}</h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted text-xs">{t('file')}</dt>
                  <dd className="font-medium">{detailQuery.data.name}</dd>
                </div>
                <div>
                  <dt className="text-muted text-xs">{t('size')}</dt>
                  <dd>{formatFileSize(detailQuery.data.size)}</dd>
                </div>
                <div>
                  <dt className="text-muted text-xs">{t('updatedAt')}</dt>
                  <dd>
                    {detailQuery.data.updatedAt
                      ? new Date(detailQuery.data.updatedAt).toLocaleString()
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-xs">{t('shared')}</dt>
                  <dd>{detailQuery.data.isShared ? t('shared') : '—'}</dd>
                </div>
              </dl>

              {isTextLikeFile(detailQuery.data) ? (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-muted text-xs">{t('editor.hint')}</p>
                  {textPreview.isLoading || fetchFallback === 'loading' ? (
                    <p className="text-muted text-xs">{t('loading')}</p>
                  ) : textPreview.isError && fetchFallback !== 'ok' ? (
                    <p className="text-danger text-xs">{t('error')}</p>
                  ) : (
                    <>
                      {fetchFallback === 'ok' ? (
                        <p className="text-muted text-xs">{t('editor.fetchFallback')}</p>
                      ) : null}
                      <TextField
                        name="fileContent"
                        value={textDraft}
                        onChange={(v) => {
                          setTextDraft(v);
                          setTextDirty(true);
                        }}
                        className="w-full"
                        aria-label={t('editor.label')}
                      >
                        <Label className="sr-only">{t('editor.label')}</Label>
                        <TextArea
                          rows={14}
                          className="font-mono text-xs"
                          placeholder={t('previewEmpty')}
                        />
                      </TextField>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          isDisabled={!textDirty || saveContent.isPending || contentReplacing}
                          onPress={onSaveContent}
                        >
                          {saveContent.isPending ? t('editor.saving') : t('editor.save')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={
                            contentReplacing ||
                            saveContent.isPending ||
                            saveContentFromUpload.isPending
                          }
                          onPress={onPickContentReplace}
                        >
                          {contentReplacing ? t('editor.replacing') : t('editor.replace')}
                        </Button>
                        <input
                          ref={contentReplaceInputRef}
                          type="file"
                          className="hidden"
                          onChange={(e) => onContentReplaceChange(e.target.files)}
                        />
                        {textDirty ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            isDisabled={saveContent.isPending || contentReplacing}
                            onPress={() => {
                              setTextDraft(textBaselineRef.current);
                              setTextDirty(false);
                            }}
                          >
                            {t('editor.discard')}
                          </Button>
                        ) : (
                          <span className="text-muted text-xs">{t('editor.clean')}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : isImageFile(detailQuery.data) ? (
                <ImagePreview fileId={detailQuery.data.id} alt={detailQuery.data.name} />
              ) : isPdfFile(detailQuery.data) ? (
                <PdfPreview fileId={detailQuery.data.id} />
              ) : isOfficeFile(detailQuery.data) ? (
                <OfficePreview fileId={detailQuery.data.id} />
              ) : (
                <p className="text-muted mt-3 text-xs">{t('previewSoon')}</p>
              )}

              {isTextLikeFile(detailQuery.data) ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold">{t('history.title')}</h3>
                  <p className="text-muted mt-1 text-xs">{t('history.hint')}</p>
                  {contentHistory.isLoading ? (
                    <p className="text-muted mt-2 text-xs">{t('loading')}</p>
                  ) : contentHistory.isError ? (
                    <p className="text-danger mt-2 text-xs">{t('error')}</p>
                  ) : (contentHistory.data?.length ?? 0) === 0 ? (
                    <p className="text-muted mt-2 text-xs">{t('history.empty')}</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-1">
                      {(contentHistory.data ?? []).map((row: FileContentHistoryItem, i) => (
                        <li
                          key={row.id}
                          className="border-border flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm">
                              {i === 0
                                ? t('history.latest')
                                : t('history.version', {
                                    n: (contentHistory.data?.length ?? 0) - i,
                                  })}
                            </p>
                            <p className="text-muted text-xs">
                              {[
                                row.createdAt ? new Date(row.createdAt).toLocaleString() : null,
                                formatFileSize(row.size),
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                          {i > 0 ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              isDisabled={restoreContent.isPending}
                              onPress={() => onRestoreContent(row.id)}
                            >
                              {restoreContent.isPending
                                ? t('history.restoring')
                                : t('history.restore')}
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  isIconOnly
                  aria-label={favoriteCheck.data?.favorited ? t('unfavorite') : t('favorite')}
                  isDisabled={toggleFavorite.isPending || favoriteCheck.isLoading}
                  onPress={() => {
                    if (!fileId) return;
                    const was = Boolean(favoriteCheck.data?.favorited);
                    toggleFavorite.mutate(
                      { type: 'file', id: fileId },
                      {
                        onSuccess: () => toast.success(was ? t('unfavorited') : t('favorited')),
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
                <Button size="sm" variant="secondary" onPress={() => openRename(detailQuery.data!)}>
                  {t('rename.title')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={
                    packDownload.isPending ||
                    singleDownloading ||
                    (isFolderEntry(detailQuery.data) && !canPack)
                  }
                  onPress={() => void onDetailDownload()}
                >
                  <ArrowDownTrayIcon className="size-4" aria-hidden />
                  {packDownload.isPending || singleDownloading
                    ? t('download.working')
                    : isFolderEntry(detailQuery.data)
                      ? t('pack.one')
                      : t('download.one')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => openXfer(detailQuery.data!, 'move')}
                >
                  {t('xfer.move')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => openXfer(detailQuery.data!, 'copy')}
                >
                  {t('xfer.copy')}
                </Button>
                <FileShareModal fileId={detailQuery.data.id} />
                {!isFolderEntry(detailQuery.data) ? (
                  <FileSendToChatModal
                    fileId={detailQuery.data.id}
                    fileName={detailQuery.data.name}
                  />
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={fileLink.isPending}
                  onPress={() => {
                    fileLink.mutate(
                      { id: detailQuery.data!.id, allowGuest: 1 },
                      {
                        onSuccess: async (link) => {
                          const url = `${window.location.origin}/single/file/${link.code}`;
                          try {
                            await navigator.clipboard.writeText(url);
                            toast.success(t('linkCopied'));
                          } catch {
                            toast.danger(t('error'));
                          }
                        },
                        onError: (err) => toastRequestError(err, t('error')),
                      },
                    );
                  }}
                >
                  {t('copyLink')}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  isDisabled={removeFile.isPending}
                  onPress={() => onRemove(detailQuery.data!)}
                >
                  {t('remove')}
                </Button>
              </div>
            </section>
          ) : null}

          {!browseLoading && !browseError && browseEntries.length === 0 ? (
            <p className="text-muted text-sm">{searching ? t('searchEmpty') : t('empty')}</p>
          ) : null}

          {browseEntries.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {canPack ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={selectedIds.size === 0 || packDownload.isPending}
                    onPress={() =>
                      onPackDownload([...selectedIds].map(Number).filter((id) => id > 0))
                    }
                  >
                    <ArrowDownTrayIcon className="size-4" aria-hidden />
                    {packDownload.isPending
                      ? t('download.working')
                      : t('pack.selected', { count: selectedIds.size })}
                  </Button>
                ) : (
                  <p className="text-muted text-xs">{t('pack.denied')}</p>
                )}
                {selectedIds.size > 0 ? (
                  <Button size="sm" variant="ghost" onPress={() => setSelectedIds(new Set())}>
                    {t('pack.clearSelection')}
                  </Button>
                ) : canPack ? (
                  <p className="text-muted text-xs">{t('pack.hint')}</p>
                ) : null}
              </div>
              <Table variant="secondary" className="w-full">
                <Table.ScrollContainer>
                  <Table.Content
                    aria-label={t('title')}
                    className="min-w-140"
                    selectionMode="multiple"
                    selectedKeys={selectedIds}
                    onSelectionChange={(keys) => {
                      if (keys === 'all') {
                        setSelectedIds(new Set(browseEntries.map((e) => String(e.id))));
                        return;
                      }
                      setSelectedIds(new Set([...keys].map(String)));
                    }}
                  >
                    <Table.Header>
                      <Table.Column isRowHeader id="name">
                        {t('file')}
                      </Table.Column>
                      <Table.Column id="size">{t('size')}</Table.Column>
                      <Table.Column id="updated">{t('updatedAt')}</Table.Column>
                      <Table.Column id="actions">{t('actions.more')}</Table.Column>
                    </Table.Header>
                    <Table.Body items={browseEntries}>
                      {(item: FileView) => {
                        const folder = isFolderEntry(item);
                        return (
                          <Table.Row id={item.id} textValue={item.name}>
                            <Table.Cell>
                              <button
                                type="button"
                                className="flex max-w-full items-center gap-2 text-left"
                                onClick={() => onOpen(item)}
                              >
                                {folder ? (
                                  <FolderIcon className="text-accent size-4 shrink-0" aria-hidden />
                                ) : (
                                  <DocumentIcon
                                    className="text-muted size-4 shrink-0"
                                    aria-hidden
                                  />
                                )}
                                <span className={cn('truncate', folder && 'font-medium')}>
                                  {item.name}
                                </span>
                                {item.isShared ? (
                                  <span className="text-muted text-[10px]">{t('shared')}</span>
                                ) : null}
                              </button>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-muted">
                                {folder ? t('folder') : formatFileSize(item.size)}
                              </span>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-muted">
                                {item.updatedAt
                                  ? new Date(item.updatedAt).toLocaleDateString()
                                  : '—'}
                              </span>
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  isDisabled={
                                    packDownload.isPending ||
                                    singleDownloading ||
                                    (folder && !canPack)
                                  }
                                  onPress={() => {
                                    if (folder) onPackDownload([item.id]);
                                    else void onDownloadFile(item);
                                  }}
                                >
                                  {folder ? t('pack.one') : t('download.one')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onPress={() => openRename(item)}
                                >
                                  {t('rename.title')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onPress={() => openXfer(item, 'move')}
                                >
                                  {t('xfer.move')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onPress={() => openXfer(item, 'copy')}
                                >
                                  {t('xfer.copy')}
                                </Button>
                                {!folder ? (
                                  <FileSendToChatModal fileId={item.id} fileName={item.name} />
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="danger"
                                  isDisabled={removeFile.isPending}
                                  onPress={() => onRemove(item)}
                                >
                                  {t('remove')}
                                </Button>
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        );
                      }}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </>
          ) : null}
        </Tabs.Panel>

        <Tabs.Panel id="trash" className="flex flex-col gap-4 pt-4">
          {trashQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
          {trashQuery.isError ? (
            <div className="flex items-center gap-2">
              <p className="text-danger text-sm">{t('error')}</p>
              <Button size="sm" variant="secondary" onPress={() => void trashQuery.refetch()}>
                {t('retry')}
              </Button>
            </div>
          ) : null}
          {!trashQuery.isLoading && !trashQuery.isError && trashEntries.length === 0 ? (
            <p className="text-muted text-sm">{t('trash.empty')}</p>
          ) : null}
          {trashEntries.length > 0 ? (
            <Table variant="secondary" className="w-full">
              <Table.ScrollContainer>
                <Table.Content aria-label={t('tabs.trash')} className="min-w-140">
                  <Table.Header>
                    <Table.Column isRowHeader id="name">
                      {t('file')}
                    </Table.Column>
                    <Table.Column id="size">{t('size')}</Table.Column>
                    <Table.Column id="updated">{t('updatedAt')}</Table.Column>
                    <Table.Column id="actions">{t('trash.restore')}</Table.Column>
                  </Table.Header>
                  <Table.Body items={trashEntries}>
                    {(item: FileView) => {
                      const folder = isFolderEntry(item);
                      return (
                        <Table.Row id={item.id} textValue={item.name}>
                          <Table.Cell>
                            <span className="flex items-center gap-2">
                              {folder ? (
                                <FolderIcon className="text-accent size-4 shrink-0" aria-hidden />
                              ) : (
                                <DocumentIcon className="text-muted size-4 shrink-0" aria-hidden />
                              )}
                              <span className={cn('truncate', folder && 'font-medium')}>
                                {item.name}
                              </span>
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-muted">
                              {folder ? t('folder') : formatFileSize(item.size)}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-muted">
                              {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <Button
                              size="sm"
                              variant="secondary"
                              isDisabled={restoreFile.isPending}
                              onPress={() => onRestore(item)}
                            >
                              {restoreFile.isPending ? t('trash.restoring') : t('trash.restore')}
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      );
                    }}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          ) : null}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
