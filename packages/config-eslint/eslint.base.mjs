import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import eslintConfigPrettier from 'eslint-config-prettier';

/**
 * Blue Dock 共享 ESLint flat config。
 * 依赖方向铁律见 `.agents/rules/architecture.md`。
 */
export const blueDockEslintConfig = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/out/**',
      '**/release/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/storybook-static/**',
      '**/.vite/**',
      'bun.lock',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['tsconfig.base.json', 'packages/*/tsconfig.json', 'apps/*/tsconfig.json'],
        },
        node: true,
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'debug', 'info'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './packages/api', from: './apps' },
            { target: './packages/i18n', from: './apps' },
            { target: './packages/desktop-bridge', from: './apps' },
            { target: './packages', from: './apps' },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);

export default blueDockEslintConfig;
