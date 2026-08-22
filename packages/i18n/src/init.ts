import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { isAppLanguage, normalizeAppLanguage, resources, type AppLanguage } from './resources';

const STORAGE_KEY = 'i18nextLng';

function detectLanguage(): AppLanguage {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isAppLanguage(saved)) return saved;
  }
  if (typeof navigator !== 'undefined' && isAppLanguage(navigator.language)) {
    return navigator.language;
  }
  return 'zh-CN';
}

let initialized = false;

/** 幂等初始化 i18next；语言写入 localStorage，供 api client Accept-Language 读取 */
export async function initI18n(lng?: AppLanguage): Promise<typeof i18n> {
  const language = lng ?? detectLanguage();

  if (!initialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'zh-CN',
      defaultNS: 'common',
      ns: [
        'common',
        'dashboard',
        'attendance',
        'project',
        'messenger',
        'file',
        'application',
        'calendar',
        'setting',
        'meeting',
        'report',
        'search',
        'favorite',
        'department',
        'assistant',
        'export',
        'admin',
        'bot',
        'task',
      ],
      interpolation: { escapeValue: false },
    });
    initialized = true;
  } else if (lng && i18n.language !== lng) {
    await i18n.changeLanguage(lng);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, normalizeAppLanguage(i18n.language));
  }

  return i18n;
}

export function setLanguage(lng: AppLanguage): Promise<typeof i18n> {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lng);
  }
  return i18n.changeLanguage(lng).then(() => i18n);
}

export { i18n, STORAGE_KEY };
