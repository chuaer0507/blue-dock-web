/** 应用中心内置卡片（系统 / 管理员）；微应用来自 `system/microAppMenu` */

export type AppSection = 'base' | 'admin';

export type BuiltinAppDef = {
  id: string;
  section: AppSection;
  /** i18n key under `application.system.*` or `application.admin.*` */
  labelKey: string;
  /** 路由跳转；缺省则 toast「即将上线」 */
  path?: string;
  /** 仅 tabbar / 竖屏补充（日历、文件、设置） */
  compactOnly?: boolean;
  /** 仅移动壳 */
  mobileOnly?: boolean;
};

/** 常用：系统应用（对齐 java apps overview） */
export const SYSTEM_APPS: BuiltinAppDef[] = [
  { id: 'approve', section: 'base', labelKey: 'system.approve' },
  { id: 'attendance', section: 'base', labelKey: 'system.attendance', path: '/manage/attendance' },
  { id: 'report', section: 'base', labelKey: 'system.report', path: '/manage/report' },
  { id: 'favorite', section: 'base', labelKey: 'system.favorite', path: '/manage/favorite' },
  { id: 'recent', section: 'base', labelKey: 'system.recent', path: '/manage/recent' },
  { id: 'mybot', section: 'base', labelKey: 'system.mybot', path: '/manage/bot' },
  { id: 'createGroup', section: 'base', labelKey: 'system.createGroup' },
  { id: 'meeting', section: 'base', labelKey: 'system.meeting', path: '/meeting' },
  { id: 'addProject', section: 'base', labelKey: 'system.addProject' },
  { id: 'addTask', section: 'base', labelKey: 'system.addTask' },
  { id: 'exportManage', section: 'base', labelKey: 'system.exportManage', path: '/manage/export' },
  {
    id: 'calendar',
    section: 'base',
    labelKey: 'system.calendar',
    path: '/manage/calendar',
    compactOnly: true,
  },
  { id: 'file', section: 'base', labelKey: 'system.file', path: '/manage/file', compactOnly: true },
  {
    id: 'setting',
    section: 'base',
    labelKey: 'system.setting',
    path: '/manage/setting',
    compactOnly: true,
  },
  { id: 'scan', section: 'base', labelKey: 'system.scan', mobileOnly: true },
];

/** 管理员分区 */
export const ADMIN_APPS: BuiltinAppDef[] = [
  { id: 'ldap', section: 'admin', labelKey: 'admin.ldap', path: '/manage/admin/ldap' },
  { id: 'mail', section: 'admin', labelKey: 'admin.emailNotify', path: '/manage/admin/email' },
  { id: 'appPush', section: 'admin', labelKey: 'admin.appPush', path: '/manage/admin/app-push' },
  {
    id: 'complaint',
    section: 'admin',
    labelKey: 'admin.reportManage',
    path: '/manage/admin/complaint',
  },
  {
    id: 'userGroups',
    section: 'admin',
    labelKey: 'admin.userGroups',
    path: '/manage/admin/user-groups',
  },
  { id: 'dataExport', section: 'admin', labelKey: 'admin.dataExport', path: '/manage/export' },
  { id: 'allUser', section: 'admin', labelKey: 'admin.teamManage', path: '/manage/department' },
  { id: 'appstore', section: 'admin', labelKey: 'admin.appstore', path: '/manage/admin/appstore' },
  {
    id: 'systemSetting',
    section: 'admin',
    labelKey: 'admin.systemSetting',
    path: '/manage/admin/system',
  },
];

export const DEFAULT_BASE_SORT = SYSTEM_APPS.filter((a) => !a.compactOnly && !a.mobileOnly).map(
  (a) => a.id,
);

export const DEFAULT_ADMIN_SORT = ADMIN_APPS.map((a) => a.id);
