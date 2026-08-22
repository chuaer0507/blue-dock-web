import { Navigate, Outlet, useLocation } from 'react-router';
import { getAccessToken } from '@blue-dock/api';
import { DesktopEffects } from '../features/desktop/DesktopEffects';
import { MobileEffects } from '../features/mobile/MobileEffects';

/** 无 token 时跳转登录，并保留 redirect */
export function RequireAuth() {
  const location = useLocation();
  const token = getAccessToken();

  if (!token) {
    const redirect = `${location.pathname}${location.search}`;
    const search = redirect && redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : '';
    return <Navigate to={`/login${search}`} replace />;
  }

  return (
    <>
      <DesktopEffects />
      <MobileEffects />
      <Outlet />
    </>
  );
}
