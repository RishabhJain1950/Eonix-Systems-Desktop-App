import * as eslintJs from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const js = eslintJs.default ?? eslintJs

export default defineConfig([
  globalIgnores(['node_modules', 'dist', 'dist-electron', 'release', '.vite', 'out.txt']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Context/providers often export hooks + non-components; this rule becomes noisy.
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: [
      'electron/**/*.js',
      'device/**/*.js',
      'shared/**/*.js',
      'codegen/**/*.js',
      'tools/**/*.js',
      'vite.config.js',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
    },
  },
])
