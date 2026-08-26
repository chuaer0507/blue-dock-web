import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Avatar,
  Button,
  Checkbox,
  Form,
  Input,
  Label,
  Modal,
  TextArea,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import {
  BOT_WEBHOOK_EVENTS,
  useDeleteUserBot,
  useEditUserBot,
  useOpenDialogEvent,
  useOpenDialogUser,
  useSystemImageUpload,
  useUserBotList,
  type Id,
  type UserBotView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { ImageSpacePicker } from '../common/ImageSpacePicker';

function BotEditorModal({ bot, onSaved }: { bot?: UserBotView | null; onSaved?: () => void }) {
  const { t } = useTranslation('bot');
  const state = useOverlayState();
  const edit = useEditUserBot();
  const imageUpload = useSystemImageUpload();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(bot?.name ?? '');
  const [avatar, setAvatar] = useState(bot?.avatar ?? '');
  const [clearDay, setClearDay] = useState(String(bot?.clearDay ?? 90));
  const [webhookUrl, setWebhookUrl] = useState(bot?.webhookUrl ?? '');
  const [events, setEvents] = useState<string[]>(bot?.webhookEvents ?? ['message']);

  useEffect(() => {
    if (!state.isOpen) return;
    setName(bot?.name ?? '');
    setAvatar(bot?.avatar ?? '');
    setClearDay(String(bot?.clearDay ?? 90));
    setWebhookUrl(bot?.webhookUrl ?? '');
    setEvents(bot?.webhookEvents?.length ? bot.webhookEvents : ['message']);
  }, [bot, state.isOpen]);

  const toggleEvent = (ev: string, on: boolean) => {
    setEvents((prev) => {
      if (on) return prev.includes(ev) ? prev : [...prev, ev];
      return prev.filter((e) => e !== ev);
    });
  };

  const onAvatarFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    imageUpload.mutate(file, {
      onSuccess: (res) => {
        const url = res.url?.trim();
        if (!url) {
          toast.danger(t('error'));
          return;
        }
        setAvatar(url);
        toast.success(t('avatarUploaded'));
      },
      onError: (err) => toastRequestError(err, t('error')),
      onSettled: () => {
        if (avatarInputRef.current) avatarInputRef.current.value = '';
      },
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      toast.danger(t('nameHint'));
      return;
    }
    const days = Number(clearDay) || 90;
    edit.mutate(
      {
        ...(bot?.id ? { id: bot.id } : {}),
        name: trimmed,
        avatar: avatar.trim(),
        clearDay: Math.min(999, Math.max(1, days)),
        webhookUrl: webhookUrl.trim(),
        webhookEvents: events.length ? events : ['message'],
      },
      {
        onSuccess: () => {
          toast.success(t('saved'));
          state.close();
          onSaved?.();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant={bot ? 'ghost' : 'primary'} onPress={state.open}>
        {bot ? t('edit') : t('create')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{bot ? t('editTitle') : t('createTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {!bot ? <p className="text-muted mb-3 text-xs">{t('createHint')}</p> : null}
              <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
                <TextField
                  name="name"
                  isRequired
                  value={name}
                  onChange={setName}
                  className="w-full"
                >
                  <Label>{t('name')}</Label>
                  <Input />
                  <p className="text-muted mt-1 text-xs">{t('nameHint')}</p>
                </TextField>
                <div className="flex flex-col gap-2">
                  <TextField name="avatar" value={avatar} onChange={setAvatar} className="w-full">
                    <Label>{t('avatar')}</Label>
                    <Input placeholder="https://" />
                  </TextField>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      isDisabled={imageUpload.isPending}
                      onPress={() => avatarInputRef.current?.click()}
                    >
                      {imageUpload.isPending ? t('avatarUploading') : t('avatarUpload')}
                    </Button>
                    <ImageSpacePicker onPick={(file) => setAvatar(file.url.trim())} />
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onAvatarFile(e.target.files)}
                    />
                  </div>
                  {avatar.trim() ? (
                    <Avatar size="sm" className="mt-1">
                      <Avatar.Image alt="" src={avatar.trim()} />
                      <Avatar.Fallback>?</Avatar.Fallback>
                    </Avatar>
                  ) : null}
                </div>
                <TextField
                  name="clearDay"
                  value={clearDay}
                  onChange={setClearDay}
                  className="w-full"
                >
                  <Label>{t('clearDay')}</Label>
                  <Input type="number" min={1} max={999} />
                </TextField>
                <TextField
                  name="webhookUrl"
                  value={webhookUrl}
                  onChange={setWebhookUrl}
                  className="w-full"
                >
                  <Label>{t('webhookUrl')}</Label>
                  <Input placeholder="https://" />
                </TextField>
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium">{t('webhookEvents')}</legend>
                  {BOT_WEBHOOK_EVENTS.map((ev) => (
                    <Checkbox
                      key={ev}
                      isSelected={events.includes(ev)}
                      onChange={(on) => toggleEvent(ev, on)}
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        <Label>{t(`events.${ev}`)}</Label>
                      </Checkbox.Content>
                    </Checkbox>
                  ))}
                </fieldset>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onPress={state.close}>
                    {t('cancel')}
                  </Button>
                  <Button
                    type="submit"
                    isDisabled={edit.isPending || imageUpload.isPending || !name.trim()}
                  >
                    {t('save')}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function BotDeleteModal({ bot, onDeleted }: { bot: UserBotView; onDeleted?: () => void }) {
  const { t } = useTranslation('bot');
  const state = useOverlayState();
  const remove = useDeleteUserBot();
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (state.isOpen) setRemark('');
  }, [state.isOpen]);

  const onConfirm = () => {
    if (!remark.trim()) {
      toast.danger(t('deleteRemarkHint'));
      return;
    }
    remove.mutate(
      { id: bot.id, remark: remark.trim() },
      {
        onSuccess: () => {
          toast.success(t('deleted'));
          state.close();
          onDeleted?.();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="danger" onPress={state.open}>
        {t('delete')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('deleteTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-sm">{t('deleteConfirm', { name: bot.name })}</p>
              <TextField
                name="delete-remark"
                value={remark}
                onChange={setRemark}
                className="w-full"
                isRequired
              >
                <Label>{t('deleteRemark')}</Label>
                <TextArea rows={2} placeholder={t('deleteRemarkHint')} />
              </TextField>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onPress={state.close}>
                  {t('cancel')}
                </Button>
                <Button
                  variant="danger"
                  isDisabled={remove.isPending || !remark.trim()}
                  onPress={onConfirm}
                >
                  {t('delete')}
                </Button>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/** 我的机器人：列表 / 新建编辑 / 删除 / 开始聊天 */
export function BotPage() {
  const { t } = useTranslation('bot');
  const navigate = useNavigate();
  const listQuery = useUserBotList();
  const openUser = useOpenDialogUser();
  const openEvent = useOpenDialogEvent();
  const bots = listQuery.data ?? [];
  const chatting = openUser.isPending || openEvent.isPending;

  const onCopyId = async (id: Id) => {
    try {
      await navigator.clipboard.writeText(String(id));
      toast.success(t('copied'));
    } catch {
      toast.danger(t('error'));
    }
  };

  const onStartChat = (bot: UserBotView) => {
    if (!bot.id) return;
    openUser.mutate(bot.id as number, {
      onSuccess: (dialog) => {
        openEvent.mutate(dialog.id);
        navigate(`/manage/messenger/${dialog.id}`);
      },
      onError: (err) => toastRequestError(err, t('chatError')),
    });
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted mt-1 text-sm">{t('hint')}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
            {t('retry')}
          </Button>
          <BotEditorModal onSaved={() => void listQuery.refetch()} />
        </div>
      </header>

      {listQuery.isLoading ? <p className="text-muted text-sm">{t('loading')}</p> : null}
      {listQuery.isError ? (
        <div className="flex items-center gap-3">
          <p className="text-danger text-sm">{t('error')}</p>
          <Button size="sm" variant="secondary" onPress={() => void listQuery.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : null}
      {!listQuery.isLoading && bots.length === 0 ? (
        <p className="text-muted text-sm">{t('empty')}</p>
      ) : null}

      {bots.length > 0 ? (
        <ul className="border-border bg-surface divide-border divide-y overflow-hidden rounded-xl border">
          {bots.map((bot: UserBotView) => (
            <li
              key={bot.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar size="sm" className="shrink-0">
                  {bot.avatar ? <Avatar.Image alt={bot.name} src={bot.avatar} /> : null}
                  <Avatar.Fallback>{(bot.name || '?').slice(0, 2)}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{bot.name}</p>
                  <p className="text-muted truncate text-xs">
                    {t('botId', { id: bot.id })}
                    {' · '}
                    {t('clearDayShort', { days: bot.clearDay })}
                    {bot.webhookUrl ? ` · ${bot.webhookUrl}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onPress={() => void onCopyId(bot.id)}>
                  {t('copyId')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={chatting}
                  onPress={() => onStartChat(bot)}
                >
                  {t('startChat')}
                </Button>
                <BotEditorModal bot={bot} onSaved={() => void listQuery.refetch()} />
                <BotDeleteModal bot={bot} onDeleted={() => void listQuery.refetch()} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
