export { App } from './App';
export { ThemeProvider, useTheme } from './providers/ThemeProvider';
export { ErrorBoundary } from './providers/ErrorBoundary';
export {
  usePlatform,
  useScreen,
  useBridgePresence,
  type AppPlatform,
  type NavMode,
  type ScreenInfo,
} from './utils/platform';
export {
  THEME_STORAGE_KEY,
  readThemePreference,
  writeThemePreference,
  resolveTheme,
  applyResolvedTheme,
  type ThemePreference,
  type ResolvedTheme,
} from './utils/theme';
