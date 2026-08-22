import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Avatar,
  Button,
  Description,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import {
  resolveAvatarSrc,
  useCurrentUser,
  useEditUserData,
  useMyDepartments,
  useSystemImageUpload,
} from '@blue-dock/api';
import {
  normalizeAppLanguage,
  setLanguage,
  useTranslation,
  type AppLanguage,
} from '@blue-dock/i18n';
import { toastRequestError } from '../../utils/toast-request-error';
import { ImageSpacePicker } from '../common/ImageSpacePicker';

export function PersonalPage() {
  const { t, i18n } = useTranslation(['setting', 'common']);
  const { data: user } = useCurrentUser();
  const editUser = useEditUserData();
  const imageUpload = useSystemImageUpload();
  const departments = useMyDepartments(Boolean(user?.userId));
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState('');
  const [profession, setProfession] = useState('');
  const [telephone, setTelephone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [userImage, setUserImage] = useState('');

  useEffect(() => {
    if (!user) return;
    setNickname(user.nickname ?? '');
    setProfession(user.profession ?? '');
    setTelephone(user.telephone ?? '');
    setBirthday(user.birthday ?? '');
    setAddress(user.address ?? '');
    setIntroduction(user.introduction ?? '');
    setUserImage(user.userImage ?? '');
  }, [user]);

  const currentLang = normalizeAppLanguage(i18n.language);
  const displayName = nickname.trim() || user?.email || t('common:app.name');
  const busy = editUser.isPending || imageUpload.isPending;

  const onLangChange = (value: string) => {
    const lang = normalizeAppLanguage(value) as AppLanguage;
    void setLanguage(lang);
    editUser.mutate(
      { lang },
      {
        onSuccess: () => toast.success(t('setting:saved')),
        onError: (err) => toastRequestError(err, t('setting:error')),
      },
    );
  };

  const onSaveProfile = (event: FormEvent) => {
    event.preventDefault();
    editUser.mutate(
      {
        nickname: nickname.trim(),
        profession: profession.trim(),
        telephone: telephone.trim(),
        birthday: birthday.trim(),
        address: address.trim(),
        introduction: introduction.trim(),
        userImage: userImage.trim(),
      },
      {
        onSuccess: () => toast.success(t('setting:saved')),
        onError: (err) => toastRequestError(err, t('setting:error')),
      },
    );
  };

  const onAvatarChange = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    imageUpload.mutate(file, {
      onSuccess: (res) => {
        const url = res.url?.trim();
        if (!url) {
          toast.danger(t('setting:error'));
          return;
        }
        setUserImage(url);
        editUser.mutate(
          { userImage: url },
          {
            onSuccess: () => toast.success(t('setting:personal.avatarUpdated')),
            onError: (err) => toastRequestError(err, t('setting:error')),
          },
        );
      },
      onError: (err) => toastRequestError(err, t('setting:error')),
      onSettled: () => {
        if (avatarInputRef.current) avatarInputRef.current.value = '';
      },
    });
  };

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold">{t('setting:nav.personal')}</h2>
        {user ? (
          <p className="text-muted mt-2 text-sm">
            {user.nickname || user.email}
            {user.email ? ` · ${user.email}` : null}
          </p>
        ) : null}
        <div className="mt-3">
          <p className="text-sm font-medium">{t('setting:personal.departments')}</p>
          {departments.isLoading ? (
            <p className="text-muted mt-1 text-xs">{t('setting:loading')}</p>
          ) : (departments.data?.length ?? 0) === 0 ? (
            <p className="text-muted mt-1 text-xs">{t('setting:personal.departmentsEmpty')}</p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {(departments.data ?? []).map((d) => (
                <li
                  key={d.id}
                  className="border-border bg-default/40 rounded-full border px-2.5 py-0.5 text-xs"
                >
                  {d.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar size="lg" className="shrink-0">
          <Avatar.Image alt={displayName} src={resolveAvatarSrc(userImage, displayName)} />
          <Avatar.Fallback>{displayName.slice(0, 2).toUpperCase()}</Avatar.Fallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              isDisabled={busy}
              onPress={() => avatarInputRef.current?.click()}
            >
              {imageUpload.isPending
                ? t('setting:personal.avatarUploading')
                : t('setting:personal.changeAvatar')}
            </Button>
            <ImageSpacePicker
              onPick={(file) => {
                const url = file.url.trim();
                if (!url) return;
                setUserImage(url);
                editUser.mutate(
                  { userImage: url },
                  {
                    onSuccess: () => toast.success(t('setting:personal.avatarUpdated')),
                    onError: (err) => toastRequestError(err, t('setting:error')),
                  },
                );
              }}
            />
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onAvatarChange(e.target.files)}
          />
          <p className="text-muted text-xs">{t('setting:personal.avatarHint')}</p>
        </div>
      </div>

      <Form className="flex flex-col gap-4" onSubmit={onSaveProfile}>
        <TextField name="nickname" value={nickname} onChange={setNickname} className="w-full">
          <Label>{t('setting:fields.nickname')}</Label>
          <Input />
        </TextField>
        <TextField name="profession" value={profession} onChange={setProfession} className="w-full">
          <Label>{t('setting:fields.profession')}</Label>
          <Input />
        </TextField>
        <TextField name="telephone" value={telephone} onChange={setTelephone} className="w-full">
          <Label>{t('setting:fields.telephone')}</Label>
          <Input />
        </TextField>
        <TextField name="birthday" value={birthday} onChange={setBirthday} className="w-full">
          <Label>{t('setting:fields.birthday')}</Label>
          <Input placeholder={t('setting:personal.birthdayPlaceholder')} />
        </TextField>
        <TextField name="address" value={address} onChange={setAddress} className="w-full">
          <Label>{t('setting:fields.address')}</Label>
          <Input />
        </TextField>
        <TextField
          name="introduction"
          value={introduction}
          onChange={setIntroduction}
          className="w-full"
        >
          <Label>{t('setting:fields.introduction')}</Label>
          <TextArea rows={4} />
        </TextField>
        <Button type="submit" isDisabled={busy}>
          {editUser.isPending ? t('setting:saving') : t('setting:save')}
        </Button>
      </Form>

      <RadioGroup name="lang" value={currentLang} onChange={onLangChange}>
        <Label>{t('setting:fields.lang')}</Label>
        <Radio value="zh-CN">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            {t('setting:lang.zh')}
          </Radio.Content>
        </Radio>
        <Radio value="en-US">
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            {t('setting:lang.en')}
          </Radio.Content>
        </Radio>
        <Description>{t('common:auth.languageLabel')}</Description>
      </RadioGroup>
    </div>
  );
}
