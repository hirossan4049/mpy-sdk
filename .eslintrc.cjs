module.exports = module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],       // 型情報を利用する設定
    tsconfigRootDir: __dirname,
    ecmaVersion: 2020,
    sourceType: 'module',
    warnOnUnsupportedTypeScriptVersion: false,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',              // TypeScript 推奨ルール
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking', // 型チェック必須ルール
  ],
  ignorePatterns: [
    '**/*.test.ts',
    '**/*.test.js',
    'test-implementations.ts',
    'dist/',
    'node_modules/',
  ],
  rules: {
    // 型安全性を向上させる追加ルール例
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': ['error', { fixToUnknown: true }],
    // 命名規則
    '@typescript-eslint/naming-convention': [
      'error',
      // デフォルトは camelCase
      { selector: 'default', format: ['camelCase'] },
      // 変数は camelCase か UPPER_CASE
      { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
      // クラス・インターフェース等は PascalCase
      { selector: 'typeLike', format: ['PascalCase'] },
      // enum メンバーは UPPER_CASE
      { selector: 'enumMember', format: ['UPPER_CASE'] },
      // オブジェクトリテラルのプロパティ名は自由
      { selector: 'objectLiteralProperty', format: null },
    ],
  },
  settings: {
    // import 解析（必要に応じて）
    'import/resolver': {
      typescript: {},
    },
  },
};
