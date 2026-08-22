import tailwindcss from '@tailwindcss/vite';
import type { PluginOption } from 'vite';

/** 壳层 Vite 插件：接入 Tailwind CSS v4（样式 SSOT 见 base.css） */
export function blueDockTailwind(): PluginOption {
  return tailwindcss();
}
