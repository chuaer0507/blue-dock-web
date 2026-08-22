import { Kbd } from '@heroui/react';
import { useTranslation } from '@blue-dock/i18n';
import { usePlatform } from '../../utils/platform';

type ShortcutAction =
  | 'search'
  | 'newProject'
  | 'newMeeting'
  | 'sendMessage'
  | 'nextUnread'
  | 'completeTask'
  | 'closeDetail';

const ACTIONS: ShortcutAction[] = [
  'search',
  'newProject',
  'newMeeting',
  'sendMessage',
  'nextUnread',
  'completeTask',
  'closeDetail',
];

function ShortcutKeys({ action, isDesktop }: { action: ShortcutAction; isDesktop: boolean }) {
  if (action === 'closeDetail') {
    return (
      <Kbd>
        <Kbd.Abbr keyValue="escape" />
      </Kbd>
    );
  }

  const mod = isDesktop ? 'command' : 'ctrl';
  if (action === 'search') {
    return (
      <Kbd>
        <Kbd.Abbr keyValue={mod} />
        <Kbd.Content>K</Kbd.Content>
      </Kbd>
    );
  }
  if (action === 'sendMessage') {
    return (
      <Kbd>
        <Kbd.Abbr keyValue={mod} />
        <Kbd.Abbr keyValue="enter" />
      </Kbd>
    );
  }
  if (action === 'nextUnread') {
    return (
      <Kbd>
        <Kbd.Abbr keyValue={mod} />
        <Kbd.Abbr keyValue="shift" />
        <Kbd.Content>U</Kbd.Content>
      </Kbd>
    );
  }
  if (action === 'completeTask') {
    return (
      <Kbd>
        <Kbd.Abbr keyValue={mod} />
        <Kbd.Content>E</Kbd.Content>
      </Kbd>
    );
  }
  const key = action === 'newProject' ? 'P' : 'M';
  return (
    <Kbd>
      <Kbd.Abbr keyValue={mod} />
      <Kbd.Abbr keyValue="shift" />
      <Kbd.Content>{key}</Kbd.Content>
    </Kbd>
  );
}

/** 设置 · 快捷键一览（展示用；完整手势见 shortcut 文档） */
export function KeyboardPage() {
  const { t } = useTranslation('setting');
  const platform = usePlatform();
  const isDesktop = platform === 'desktop';

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">{t('nav.keyboard')}</h2>
        <p className="text-muted mt-2 text-sm">{t('keyboard.hint')}</p>
      </div>

      <ul className="divide-border border-border divide-y rounded-lg border">
        {ACTIONS.map((action) => (
          <li key={action} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span>{t(`keyboard.actions.${action}`)}</span>
            <ShortcutKeys action={action} isDesktop={isDesktop} />
          </li>
        ))}
      </ul>
    </div>
  );
}
