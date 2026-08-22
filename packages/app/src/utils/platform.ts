import { useEffect, useState } from 'react';
import { getDesktop, isDesktopRuntime } from '@blue-dock/desktop-bridge';
import { getMobile, isMobileRuntime } from '@blue-dock/mobile-bridge';

export type AppPlatform = 'web' | 'desktop' | 'mobile';

export type NavMode = 'sidebar' | 'tabbar';

export type ScreenInfo = {
  width: number;
  height: number;
  isPortrait: boolean;
  /** 竖屏或宽度 ≤576 时用 Tabbar */
  navMode: NavMode;
};

const TABBAR_MAX_WIDTH = 576;

function detectPlatform(): AppPlatform {
  if (isDesktopRuntime()) return 'desktop';
  if (isMobileRuntime()) return 'mobile';
  return 'web';
}

function readScreen(): ScreenInfo {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 800, isPortrait: false, navMode: 'sidebar' };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height >= width;
  const navMode: NavMode = isPortrait || width <= TABBAR_MAX_WIDTH ? 'tabbar' : 'sidebar';
  return { width, height, isPortrait, navMode };
}

/** 运行时平台：desktop-bridge / mobile-bridge / web */
export function usePlatform(): AppPlatform {
  const [platform] = useState<AppPlatform>(() => detectPlatform());
  return platform;
}

/** 视口驱动布局：sidebar | tabbar */
export function useScreen(): ScreenInfo {
  const [screen, setScreen] = useState<ScreenInfo>(() => readScreen());

  useEffect(() => {
    const onResize = () => setScreen(readScreen());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return screen;
}

/** 可选：读取桥能力（框架期仅导出探测） */
export function useBridgePresence() {
  return {
    desktop: isDesktopRuntime() ? getDesktop() : null,
    mobile: isMobileRuntime() ? getMobile() : null,
  };
}
