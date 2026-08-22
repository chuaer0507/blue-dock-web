import { useState, type FormEvent } from 'react';
import { Button, Form, Input, Label, TextField, toast } from '@heroui/react';
import {
  useAddUserTag,
  useCurrentUser,
  useDeleteUserTag,
  useRecognizeUserTag,
  useUpdateUserTag,
  useUserTagList,
  type UserTagView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';

const NAME_MAX = 20;

/** 设置 · 个性标签：列表 / 新增 / 改名 / 删除 / 认可 */
export function TagsPage() {
  const { t } = useTranslation('setting');
  const { data: me } = useCurrentUser();
  const listQuery = useUserTagList();
  const addTag = useAddUserTag();
  const updateTag = useUpdateUserTag();
  const deleteTag = useDeleteUserTag();
  const recognizeTag = useRecognizeUserTag();

  const [name, setName] = useState('');
  const [editing, setEditing] = useState<UserTagView | null>(null);
  const [editName, setEditName] = useState('');

  const list = listQuery.data?.list ?? [];
  const myId = me?.userId ?? 0;
  const busy =
    addTag.isPending || updateTag.isPending || deleteTag.isPending || recognizeTag.isPending;

  const onAdd = (event: FormEvent) => {
    event.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (n.length > NAME_MAX) {
      toast.danger(t('tags.nameTooLong', { max: NAME_MAX }));
      return;
    }
    addTag.mutate(
      { name: n },
      {
        onSuccess: () => {
          toast.success(t('tags.added'));
          setName('');
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const beginEdit = (tag: UserTagView) => {
    setEditing(tag);
    setEditName(tag.name);
  };

  const onSaveEdit = () => {
    if (!editing) return;
    const n = editName.trim();
    if (!n) {
      toast.danger(t('tags.nameRequired'));
      return;
    }
    if (n.length > NAME_MAX) {
      toast.danger(t('tags.nameTooLong', { max: NAME_MAX }));
      return;
    }
    if (n === editing.name) {
      setEditing(null);
      return;
    }
    updateTag.mutate(
      { id: editing.id, name: n },
      {
        onSuccess: () => {
          toast.success(t('tags.updated'));
          setEditing(null);
          setEditName('');
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDelete = (tag: UserTagView) => {
    if (!window.confirm(t('tags.deleteConfirm', { name: tag.name }))) return;
    deleteTag.mutate(
      { id: tag.id },
      {
        onSuccess: () => toast.success(t('tags.deleted')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onRecognize = (tag: UserTagView) => {
    recognizeTag.mutate(
      { id: tag.id },
      {
        onSuccess: (data) =>
          toast.success(data.recognized ? t('tags.recognized') : t('tags.unrecognized')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">{t('nav.tags')}</h2>
        <p className="text-muted mt-2 text-sm">{t('tags.hint', { max: 100, nameMax: NAME_MAX })}</p>
      </div>

      <Form className="flex flex-col gap-3" onSubmit={onAdd}>
        <TextField name="tagName" className="w-full" value={name} onChange={setName}>
          <Label>{t('tags.newLabel')}</Label>
          <Input maxLength={NAME_MAX} placeholder={t('tags.newPlaceholder')} />
        </TextField>
        <Button
          type="submit"
          variant="secondary"
          className="self-start"
          isDisabled={!name.trim() || addTag.isPending}
        >
          {addTag.isPending ? t('saving') : t('tags.add')}
        </Button>
      </Form>

      {listQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {listQuery.isError ? (
        <div className="flex items-center gap-2">
          <p className="text-danger text-sm">{t('error')}</p>
          <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
            {t('tags.retry')}
          </Button>
        </div>
      ) : null}

      {!listQuery.isLoading && list.length === 0 ? (
        <p className="text-muted text-sm">{t('tags.empty')}</p>
      ) : null}

      {list.length > 0 ? (
        <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
          {list.map((tag) => {
            const isCreator = myId > 0 && tag.creatorUserId === myId;
            const isEditing = editing?.id === tag.id;
            return (
              <li key={tag.id} className="bg-surface flex flex-col gap-2 px-4 py-3">
                {isEditing ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <TextField
                      name={`edit-${tag.id}`}
                      className="min-w-48 flex-1"
                      value={editName}
                      onChange={setEditName}
                    >
                      <Label>{t('tags.editLabel')}</Label>
                      <Input maxLength={NAME_MAX} />
                    </TextField>
                    <Button
                      size="sm"
                      isDisabled={busy || !editName.trim()}
                      onPress={onSaveEdit}
                    >
                      {t('save')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={busy}
                      onPress={() => {
                        setEditing(null);
                        setEditName('');
                      }}
                    >
                      {t('tags.cancel')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{tag.name}</p>
                    <span className="text-muted text-xs">
                      {t('tags.recognizeCount', { count: tag.recognizeCount })}
                    </span>
                    <Button
                      size="sm"
                      variant={tag.recognized ? 'primary' : 'secondary'}
                      isDisabled={busy}
                      onPress={() => onRecognize(tag)}
                    >
                      {tag.recognized ? t('tags.unrecognize') : t('tags.recognize')}
                    </Button>
                    {isCreator ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          isDisabled={busy}
                          onPress={() => beginEdit(tag)}
                        >
                          {t('tags.rename')}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isDisabled={busy}
                          onPress={() => onDelete(tag)}
                        >
                          {t('tags.delete')}
                        </Button>
                      </>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
