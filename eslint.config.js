// Flat config cho ESLint — chuẩn của Vite + React 19.
// Chỉ bật 2 rule core của react-hooks (rules-of-hooks, exhaustive-deps),
// không bật nhóm rule "compiler" mới của plugin (set-state-in-effect,
// immutability, static-components...) — chúng phủ nhận pattern đang hoạt
// động và không thuộc chuẩn template Vite chính thức.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist', 'node_modules', 'supabase', 'dev-dist'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Giảm noise: biến/param không dùng chỉ cảnh báo, bỏ qua tiền tố `_`.
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
];