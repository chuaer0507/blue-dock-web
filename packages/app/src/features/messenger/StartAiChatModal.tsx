import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toastRequestError } from '../../utils/toast-request-error';
import { Button, Label, ListBox, Modal, Select, toast, useOverlayState } from '@heroui/react';
import { useAiSystemBots, useOpenDialogUser, type UserSearchHit } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';

/** 打开与 AI 系统机器人（`ai-*@bot.system`）的单聊 */
export function StartAiChatModal() {
  const { t } = useTranslation('messenger');
  const navigate = useNavigate();
  const state = useOverlayState();
  const botsQuery = useAiSystemBots(50, state.isOpen);
  const openUser = useOpenDialogUser();
  const bots = botsQuery.data ?? [];
  const [botId, setBotId] = useState<string>('');

  const onOpenChange = (open: boolean) => {
    state.setOpen(open);
    if (!open) setBotId('');
  };

  const onSubmit = () => {
    const id = Number(botId);
    if (!Number.isFinite(id) || id <= 0) {
      toast.danger(t('aiChat.needBot'));
      return;
    }
    openUser.mutate(id, {
      onSuccess: (dialog) => {
        toast.success(t('aiChat.opened'));
        onOpenChange(false);
        navigate(`/manage/messenger/${dialog.id}`);
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  return (
    <>
      <Button size="sm" variant="secondary" onPress={() => state.open()}>
        {t('aiChat.open')}
      </Button>
      <Modal isOpen={state.isOpen} onOpenChange={onOpenChange}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.Header>
                <Modal.Heading>{t('aiChat.title')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                {botsQuery.isLoading ? (
                  <p className="text-muted text-sm">{t('loading')}</p>
                ) : bots.length === 0 ? (
                  <p className="text-muted text-sm">{t('aiChat.empty')}</p>
                ) : (
                  <Select
                    className="w-full"
                    value={botId || undefined}
                    onChange={(key) => setBotId(key == null ? '' : String(key))}
                  >
                    <Label>{t('aiChat.bot')}</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {bots.map((bot: UserSearchHit) => (
                          <ListBox.Item
                            key={bot.userId}
                            id={String(bot.userId)}
                            textValue={bot.nickname || bot.email}
                          >
                            {bot.nickname || bot.email}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => onOpenChange(false)}>
                  {t('aiChat.cancel')}
                </Button>
                <Button
                  isDisabled={!botId || openUser.isPending || bots.length === 0}
                  onPress={onSubmit}
                >
                  {openUser.isPending ? t('aiChat.opening') : t('aiChat.start')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
