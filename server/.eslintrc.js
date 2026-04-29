module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off',
    // The hoisted layout in this monorepo has the root resolving
    // @typescript-eslint/eslint-plugin@8 against eslint@9, while server
    // pins eslint@8.57. The plugin's `no-unused-expressions` shim then
    // calls into eslint@9's base rule, whose options-destructure crashes
    // ('Cannot read properties of undefined (reading allowShortCircuit)').
    // The base ESLint rule is still active via eslint:recommended.
    '@typescript-eslint/no-unused-expressions': 'off',
  },
  env: {
    node: true,
    es2020: true,
  },
  // `declare global { var X: T }` is the canonical way to augment globalThis
  // in TS (let/const create block-scoped, non-globalThis bindings) — turn off
  // no-var inside the test setup. Inline disable comments here get stripped
  // by the lint-staged formatter pipeline, so a config-level override is the
  // only stable form.
  overrides: [
    {
      files: ['src/test/setup.ts'],
      rules: { 'no-var': 'off' },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/'],
};
