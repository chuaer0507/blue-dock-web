import zhCommon from '../locales/zh-CN/common.json';
import enCommon from '../locales/en-US/common.json';
import zhDashboard from '../locales/zh-CN/dashboard.json';
import enDashboard from '../locales/en-US/dashboard.json';
import zhAttendance from '../locales/zh-CN/attendance.json';
import enAttendance from '../locales/en-US/attendance.json';
import zhProject from '../locales/zh-CN/project.json';
import enProject from '../locales/en-US/project.json';
import zhMessenger from '../locales/zh-CN/messenger.json';
import enMessenger from '../locales/en-US/messenger.json';
import zhFile from '../locales/zh-CN/file.json';
import enFile from '../locales/en-US/file.json';
import zhApplication from '../locales/zh-CN/application.json';
import enApplication from '../locales/en-US/application.json';
import zhCalendar from '../locales/zh-CN/calendar.json';
import enCalendar from '../locales/en-US/calendar.json';
import zhSetting from '../locales/zh-CN/setting.json';
import enSetting from '../locales/en-US/setting.json';
import zhMeeting from '../locales/zh-CN/meeting.json';
import enMeeting from '../locales/en-US/meeting.json';
import zhReport from '../locales/zh-CN/report.json';
import enReport from '../locales/en-US/report.json';
import zhSearch from '../locales/zh-CN/search.json';
import enSearch from '../locales/en-US/search.json';
import zhFavorite from '../locales/zh-CN/favorite.json';
import enFavorite from '../locales/en-US/favorite.json';
import zhDepartment from '../locales/zh-CN/department.json';
import enDepartment from '../locales/en-US/department.json';
import zhAssistant from '../locales/zh-CN/assistant.json';
import enAssistant from '../locales/en-US/assistant.json';
import zhExport from '../locales/zh-CN/export.json';
import enExport from '../locales/en-US/export.json';
import zhAdmin from '../locales/zh-CN/admin.json';
import enAdmin from '../locales/en-US/admin.json';
import zhBot from '../locales/zh-CN/bot.json';
import enBot from '../locales/en-US/bot.json';
import zhTask from '../locales/zh-CN/task.json';
import enTask from '../locales/en-US/task.json';

export const resources = {
  'zh-CN': {
    common: zhCommon,
    dashboard: zhDashboard,
    attendance: zhAttendance,
    project: zhProject,
    messenger: zhMessenger,
    file: zhFile,
    application: zhApplication,
    calendar: zhCalendar,
    setting: zhSetting,
    meeting: zhMeeting,
    report: zhReport,
    search: zhSearch,
    favorite: zhFavorite,
    department: zhDepartment,
    assistant: zhAssistant,
    export: zhExport,
    admin: zhAdmin,
    bot: zhBot,
    task: zhTask,
  },
  'en-US': {
    common: enCommon,
    dashboard: enDashboard,
    attendance: enAttendance,
    project: enProject,
    messenger: enMessenger,
    file: enFile,
    application: enApplication,
    calendar: enCalendar,
    setting: enSetting,
    meeting: enMeeting,
    report: enReport,
    search: enSearch,
    favorite: enFavorite,
    department: enDepartment,
    assistant: enAssistant,
    export: enExport,
    admin: enAdmin,
    bot: enBot,
    task: enTask,
  },
} as const;

export type AppLanguage = keyof typeof resources;

/** 仅接受 `zh-CN` | `en-US`；其它回落 `zh-CN` */
export function isAppLanguage(raw: string | null | undefined): raw is AppLanguage {
  return raw === 'zh-CN' || raw === 'en-US';
}

export function normalizeAppLanguage(raw: string | null | undefined): AppLanguage {
  return isAppLanguage(raw) ? raw : 'zh-CN';
}
