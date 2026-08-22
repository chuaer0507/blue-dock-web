import { Navigate } from 'react-router';
import { getAccessToken } from '@blue-dock/api';

/** `/`：已登录进工作台，否则登录 */
export function HomeRedirect() {
  const token = getAccessToken();
  if (token) return <Navigate to="/manage/dashboard" replace />;
  return <Navigate to="/login" replace />;
}
