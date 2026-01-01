import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public', 'supabase/functions'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off', // Trop de any existants
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Désactiver les règles trop strictes pour un projet existant
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off', // Pattern courant pour init
      'react-hooks/purity': 'off', // Date.now() dans useRef est OK
      'prefer-const': 'warn',
    },
  }
);
