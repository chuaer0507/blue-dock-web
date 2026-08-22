import { useTranslation } from '@blue-dock/i18n';

type Props = {
  /** i18n 标题键，默认 common:placeholder.title */
  titleKey?: string;
  /** 覆盖标题文案（已翻译） */
  title?: string;
};

/** 业务未落地时的占位页 */
export function PlaceholderPage({ titleKey = 'placeholder.title', title }: Props) {
  const { t } = useTranslation('common');
  const heading = title ?? t(titleKey);

  return (
    <div className="flex h-full min-h-0 flex-col items-start gap-2 p-6">
      <h1 className="text-foreground text-2xl font-semibold">{heading}</h1>
      <p className="text-muted max-w-lg text-sm">{t('placeholder.body')}</p>
    </div>
  );
}
