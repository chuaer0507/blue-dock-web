import { useState, type FormEvent } from 'react';
import {
  Button,
  Form,
  Input,
  Label,
  Modal,
  TextField,
  toast,
  useOverlayState,
} from '@heroui/react';
import { useCreateUser } from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';

/** 管理员创建用户 */
export function CreateUserModal({ onCreated }: { onCreated?: () => void }) {
  const { t } = useTranslation('department');
  const state = useOverlayState();
  const create = useCreateUser();
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [profession, setProfession] = useState('');
  const [identity, setIdentity] = useState('');

  const reset = () => {
    setEmail('');
    setNickname('');
    setPassword('');
    setProfession('');
    setIdentity('');
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nickname.trim() || !password.trim()) return;
    create.mutate(
      {
        email: email.trim(),
        nickname: nickname.trim(),
        password,
        ...(profession.trim() ? { profession: profession.trim() } : {}),
        ...(identity.trim() ? { identity: identity.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t('createUser.success'));
          reset();
          state.close();
          onCreated?.();
        },
        onError: (err) => toastRequestError(err, t('error.generic')),
      },
    );
  };

  return (
    <Modal>
      <Button size="sm" variant="primary" onPress={state.open}>
        {t('actions.createUser')}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('createUser.title')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form className="flex flex-col gap-3" onSubmit={onSubmit}>
                <TextField
                  name="email"
                  type="email"
                  isRequired
                  value={email}
                  onChange={setEmail}
                  className="w-full"
                >
                  <Label>{t('createUser.email')}</Label>
                  <Input autoComplete="off" />
                </TextField>
                <TextField
                  name="nickname"
                  isRequired
                  value={nickname}
                  onChange={setNickname}
                  className="w-full"
                >
                  <Label>{t('createUser.nickname')}</Label>
                  <Input />
                </TextField>
                <TextField
                  name="password"
                  type="password"
                  isRequired
                  value={password}
                  onChange={setPassword}
                  className="w-full"
                >
                  <Label>{t('createUser.password')}</Label>
                  <Input autoComplete="new-password" />
                </TextField>
                <TextField
                  name="profession"
                  value={profession}
                  onChange={setProfession}
                  className="w-full"
                >
                  <Label>{t('createUser.profession')}</Label>
                  <Input />
                </TextField>
                <TextField
                  name="identity"
                  value={identity}
                  onChange={setIdentity}
                  className="w-full"
                >
                  <Label>{t('createUser.identity')}</Label>
                  <Input placeholder={t('createUser.identityHint')} />
                </TextField>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onPress={state.close}>
                    {t('createUser.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    isDisabled={
                      !email.trim() || !nickname.trim() || !password.trim() || create.isPending
                    }
                  >
                    {t('createUser.submit')}
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
