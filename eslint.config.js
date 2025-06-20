export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  {
    files: ['**/*.{js,ts,vue}'],
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn',
    },
  },
]
