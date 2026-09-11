import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // _unused/_shots 는 보관·검수용 폴더라 검사하지 않는다 (권한이 막힌 하위 폴더가 있으면 스캔 자체가 실패한다).
  { ignores: ['dist', 'node_modules', 'public/assets', 'coverage', '_unused', '_shots', 'test-results', 'artifacts/drone-route-test-results', 'playwright-report', 'tmp', '%SystemDrive%'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off'
    },
  },
);
