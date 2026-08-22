import { Description, Label, Radio, RadioGroup } from '@heroui/react';
import { useTranslation } from '@blue-dock/i18n';
import { useTheme } from '../../providers/ThemeProvider';
import type { ThemePreference } from '../../utils/theme';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export function AppearancePage() {
  const { t } = useTranslation(['setting', 'common']);
  const { preference, setPreference } = useTheme();

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('setting:nav.appearance')}</h2>
      <p className="text-muted text-sm">{t('setting:appearance.hint')}</p>

      <RadioGroup
        name="theme"
        value={preference}
        onChange={(value) => setPreference(value as ThemePreference)}
      >
        <Label>{t('common:auth.themeLabel')}</Label>
        {THEMES.map((value) => (
          <Radio key={value} value={value}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t(`common:theme.${value}`)}
            </Radio.Content>
          </Radio>
        ))}
        <Description>{t('setting:appearance.hint')}</Description>
      </RadioGroup>
    </div>
  );
}
