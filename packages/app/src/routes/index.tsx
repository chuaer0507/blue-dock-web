import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { RequireAuth } from './RequireAuth';
import { ManageLayout } from '../layouts/ManageLayout';
import { SettingLayout } from '../layouts/SettingLayout';

const HomeRedirect = lazy(() =>
  import('../features/common/HomeRedirect').then((m) => ({ default: m.HomeRedirect })),
);
const LoginPage = lazy(() =>
  import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const TokenPage = lazy(() =>
  import('../features/auth/TokenPage').then((m) => ({ default: m.TokenPage })),
);
const RegisterPage = lazy(() =>
  import('../features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('../features/auth/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const ProPage = lazy(() =>
  import('../features/common/ProPage').then((m) => ({ default: m.ProPage })),
);
const PreloadPage = lazy(() =>
  import('../features/common/PreloadPage').then((m) => ({ default: m.PreloadPage })),
);
const PrivacyPage = lazy(() =>
  import('../features/common/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const NotFoundPage = lazy(() =>
  import('../features/common/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const PersonalPage = lazy(() =>
  import('../features/setting/PersonalPage').then((m) => ({ default: m.PersonalPage })),
);
const TagsPage = lazy(() =>
  import('../features/setting/TagsPage').then((m) => ({ default: m.TagsPage })),
);
const AppearancePage = lazy(() =>
  import('../features/setting/AppearancePage').then((m) => ({ default: m.AppearancePage })),
);
const PasswordPage = lazy(() =>
  import('../features/setting/PasswordPage').then((m) => ({ default: m.PasswordPage })),
);
const EmailPage = lazy(() =>
  import('../features/setting/EmailPage').then((m) => ({ default: m.EmailPage })),
);
const DevicesPage = lazy(() =>
  import('../features/setting/DevicesPage').then((m) => ({ default: m.DevicesPage })),
);
const KeyboardPage = lazy(() =>
  import('../features/setting/KeyboardPage').then((m) => ({ default: m.KeyboardPage })),
);
const VersionPage = lazy(() =>
  import('../features/setting/VersionPage').then((m) => ({ default: m.VersionPage })),
);
const NotificationsPage = lazy(() =>
  import('../features/setting/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const AttendanceSettingPage = lazy(() =>
  import('../features/setting/AttendanceSettingPage').then((m) => ({
    default: m.AttendanceSettingPage,
  })),
);
const LicensePage = lazy(() =>
  import('../features/setting/LicensePage').then((m) => ({ default: m.LicensePage })),
);
const DangerPage = lazy(() =>
  import('../features/setting/DangerPage').then((m) => ({ default: m.DangerPage })),
);
const AnnualReportPage = lazy(() =>
  import('../features/setting/AnnualReportPage').then((m) => ({ default: m.AnnualReportPage })),
);
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const CalendarPage = lazy(() =>
  import('../features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
const TaskDetailPage = lazy(() =>
  import('../features/task/TaskDetailPage').then((m) => ({ default: m.TaskDetailPage })),
);
const ProjectIndexPage = lazy(() =>
  import('../features/project/ProjectIndexPage').then((m) => ({
    default: m.ProjectIndexPage,
  })),
);
const ProjectPage = lazy(() =>
  import('../features/project/ProjectPage').then((m) => ({ default: m.ProjectPage })),
);
const ProjectInvitePage = lazy(() =>
  import('../features/project/ProjectInvitePage').then((m) => ({
    default: m.ProjectInvitePage,
  })),
);
const MessengerPage = lazy(() =>
  import('../features/messenger/MessengerPage').then((m) => ({ default: m.MessengerPage })),
);
const SingleDialogPage = lazy(() =>
  import('../features/messenger/SingleDialogPage').then((m) => ({
    default: m.SingleDialogPage,
  })),
);
const FilePage = lazy(() =>
  import('../features/file/FilePage').then((m) => ({ default: m.FilePage })),
);
const SingleFilePage = lazy(() =>
  import('../features/file/SingleFilePage').then((m) => ({ default: m.SingleFilePage })),
);
const ApplicationPage = lazy(() =>
  import('../features/application/ApplicationPage').then((m) => ({
    default: m.ApplicationPage,
  })),
);
const ScanPage = lazy(() =>
  import('../features/mobile/ScanPage').then((m) => ({ default: m.ScanPage })),
);
const MicroAppHostPage = lazy(() =>
  import('../features/application/MicroAppHostPage').then((m) => ({
    default: m.MicroAppHostPage,
  })),
);
const SearchPage = lazy(() =>
  import('../features/search/SearchPage').then((m) => ({ default: m.SearchPage })),
);
const FavoritePage = lazy(() =>
  import('../features/favorite/FavoritePage').then((m) => ({ default: m.FavoritePage })),
);
const RecentPage = lazy(() =>
  import('../features/favorite/RecentPage').then((m) => ({ default: m.RecentPage })),
);
const ReportPage = lazy(() =>
  import('../features/report/ReportPage').then((m) => ({ default: m.ReportPage })),
);
const ReportDetailPage = lazy(() =>
  import('../features/report/ReportDetailPage').then((m) => ({
    default: m.ReportDetailPage,
  })),
);
const ReportEditPage = lazy(() =>
  import('../features/report/ReportEditPage').then((m) => ({
    default: m.ReportEditPage,
  })),
);
const AttendancePage = lazy(() =>
  import('../features/attendance/AttendancePage').then((m) => ({
    default: m.AttendancePage,
  })),
);
const AttendanceInstallPage = lazy(() =>
  import('../features/attendance/AttendanceInstallPage').then((m) => ({
    default: m.AttendanceInstallPage,
  })),
);
const AdminAttendancePage = lazy(() =>
  import('../features/attendance/AdminAttendancePage').then((m) => ({
    default: m.AdminAttendancePage,
  })),
);
const MeetingPage = lazy(() =>
  import('../features/meeting/MeetingPage').then((m) => ({ default: m.MeetingPage })),
);
const DepartmentPage = lazy(() =>
  import('../features/department/DepartmentPage').then((m) => ({
    default: m.DepartmentPage,
  })),
);
const BotPage = lazy(() => import('../features/bot/BotPage').then((m) => ({ default: m.BotPage })));
const ExportPage = lazy(() =>
  import('../features/export/ExportPage').then((m) => ({ default: m.ExportPage })),
);
const ValidEmailPage = lazy(() =>
  import('../features/auth/ValidEmailPage').then((m) => ({ default: m.ValidEmailPage })),
);
const AdminLayout = lazy(() =>
  import('../features/admin/AdminShell').then((m) => ({ default: m.AdminLayout })),
);
const AdminIndexRedirect = lazy(() =>
  import('../features/admin/AdminShell').then((m) => ({ default: m.AdminIndexRedirect })),
);
const SystemAdminPage = lazy(() =>
  import('../features/admin/SystemAdminPage').then((m) => ({ default: m.SystemAdminPage })),
);
const StorageAdminPage = lazy(() =>
  import('../features/admin/StorageAdminPage').then((m) => ({ default: m.StorageAdminPage })),
);
const EmailAdminPage = lazy(() =>
  import('../features/admin/EmailAdminPage').then((m) => ({ default: m.EmailAdminPage })),
);
const MeetingAdminPage = lazy(() =>
  import('../features/admin/MeetingAdminPage').then((m) => ({ default: m.MeetingAdminPage })),
);
const AiBotAdminPage = lazy(() =>
  import('../features/admin/AiBotAdminPage').then((m) => ({ default: m.AiBotAdminPage })),
);
const AppPushAdminPage = lazy(() =>
  import('../features/admin/AppPushAdminPage').then((m) => ({ default: m.AppPushAdminPage })),
);
const LdapAdminPage = lazy(() =>
  import('../features/admin/LdapAdminPage').then((m) => ({ default: m.LdapAdminPage })),
);
const AppstoreAdminPage = lazy(() =>
  import('../features/admin/AppstoreAdminPage').then((m) => ({ default: m.AppstoreAdminPage })),
);
const ComplaintAdminPage = lazy(() =>
  import('../features/admin/ComplaintAdminPage').then((m) => ({ default: m.ComplaintAdminPage })),
);
const UserGroupsAdminPage = lazy(() =>
  import('../features/admin/UserGroupsAdminPage').then((m) => ({ default: m.UserGroupsAdminPage })),
);
const UploadsAdminPage = lazy(() =>
  import('../features/admin/UploadsAdminPage').then((m) => ({ default: m.UploadsAdminPage })),
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomeRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/token',
    element: <TokenPage />,
  },
  {
    path: '/pro',
    element: <ProPage />,
  },
  {
    path: '/preload',
    element: <PreloadPage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    path: '/attendance/install',
    element: <AttendanceInstallPage />,
  },
  {
    path: '/meeting/:meetingId?/:sharekey?',
    element: <MeetingPage />,
  },
  {
    path: '/manage/project/invite/:inviteId?',
    element: <ProjectInvitePage />,
  },
  {
    path: '/manage',
    element: <RequireAuth />,
    children: [
      {
        element: <ManageLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'calendar', element: <CalendarPage /> },
          { path: 'messenger/:dialogAction?', element: <MessengerPage /> },
          { path: 'project', element: <ProjectIndexPage /> },
          { path: 'project/:projectId', element: <ProjectPage /> },
          { path: 'file/:folderId?/:fileId?', element: <FilePage /> },
          { path: 'application', element: <ApplicationPage /> },
          { path: 'scan', element: <ScanPage /> },
          { path: 'apps/:appId', element: <MicroAppHostPage /> },
          { path: 'bot', element: <BotPage /> },
          { path: 'report', element: <ReportPage /> },
          { path: 'attendance', element: <AttendancePage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'favorite', element: <FavoritePage /> },
          { path: 'recent', element: <RecentPage /> },
          { path: 'department', element: <DepartmentPage /> },
          { path: 'export', element: <ExportPage /> },
          {
            path: 'admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminIndexRedirect /> },
              { path: 'system', element: <SystemAdminPage /> },
              { path: 'storage', element: <StorageAdminPage /> },
              { path: 'email', element: <EmailAdminPage /> },
              { path: 'meeting', element: <MeetingAdminPage /> },
              { path: 'ai-bot', element: <AiBotAdminPage /> },
              { path: 'attendance', element: <AdminAttendancePage /> },
              { path: 'app-push', element: <AppPushAdminPage /> },
              { path: 'ldap', element: <LdapAdminPage /> },
              { path: 'appstore', element: <AppstoreAdminPage /> },
              { path: 'complaint', element: <ComplaintAdminPage /> },
              { path: 'user-groups', element: <UserGroupsAdminPage /> },
              { path: 'uploads', element: <UploadsAdminPage /> },
            ],
          },
          {
            path: 'setting',
            element: <SettingLayout />,
            children: [
              { index: true, element: <Navigate to="personal" replace /> },
              { path: 'personal', element: <PersonalPage /> },
              { path: 'tags', element: <TagsPage /> },
              { path: 'password', element: <PasswordPage /> },
              { path: 'devices', element: <DevicesPage /> },
              { path: 'appearance', element: <AppearancePage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              { path: 'keyboard', element: <KeyboardPage /> },
              { path: 'email', element: <EmailPage /> },
              { path: 'version', element: <VersionPage /> },
              { path: 'annual', element: <AnnualReportPage /> },
              { path: 'attendance', element: <AttendanceSettingPage /> },
              { path: 'license', element: <LicensePage /> },
              { path: 'danger', element: <DangerPage /> },
              { path: 'language', element: <Navigate to="../personal" replace /> },
              { path: 'theme', element: <Navigate to="../appearance" replace /> },
              { path: 'device', element: <Navigate to="../devices" replace /> },
              { path: 'delete', element: <Navigate to="../danger" replace /> },
              { path: 'system', element: <Navigate to="/manage/admin/system" replace /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/single/apps/:name',
    element: <RequireAuth />,
    children: [{ index: true, element: <MicroAppHostPage /> }],
  },
  {
    path: '/single/file/msg/:msgId',
    element: <SingleFilePage mode="msg" />,
  },
  {
    path: '/single/file/task/:fileId',
    element: <SingleFilePage mode="task" />,
  },
  {
    path: '/single/file/:codeOrFileId',
    element: <SingleFilePage mode="auto" />,
  },
  {
    path: '/single/task',
    element: <RequireAuth />,
    children: [
      { path: 'content/:taskId', element: <TaskDetailPage /> },
      { path: ':taskId', element: <TaskDetailPage /> },
    ],
  },
  {
    path: '/single/dialog/:dialogId',
    element: <RequireAuth />,
    children: [{ index: true, element: <SingleDialogPage /> }],
  },
  {
    path: '/single/valid/email',
    element: <ValidEmailPage />,
  },
  {
    path: '/single/report/edit/:reportEditId',
    element: <RequireAuth />,
    children: [{ index: true, element: <ReportEditPage /> }],
  },
  {
    path: '/single/report/detail/:reportDetailId',
    element: <RequireAuth />,
    children: [{ index: true, element: <ReportDetailPage /> }],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
