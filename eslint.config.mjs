import nextPlugin from '@next/eslint-plugin-next';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  ...compat.config({
    extends: ['next/core-web-vitals'],
  }),
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
];
