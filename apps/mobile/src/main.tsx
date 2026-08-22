import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@blue-dock/api';
import { ThemeProvider } from '@blue-dock/app';
import { I18nProvider } from '@blue-dock/i18n';
import { App } from '@blue-dock/app';
import '@blue-dock/config-tailwind/base.css';
import { injectMobileBridge } from './bridge/create-mobile-api';
import { setupMobileDeepLinks } from './bootstrap/deep-link';
import { setupPushNotificationOpen, setupPushNotificationReceived } from './bootstrap/push-open';
import { setupMobileStatusBar } from './bootstrap/status-bar';

/** 移动壳：先注入 bridge，再挂载同一套 app */
injectMobileBridge();
void setupMobileStatusBar();
void setupMobileDeepLinks();
void setupPushNotificationOpen();
void setupPushNotificationReceived();

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
